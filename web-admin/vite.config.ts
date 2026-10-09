import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';
import { TokenProvider } from './token-provider.ts';

const webRoot = dirname(fileURLToPath(import.meta.url));

function tokenLogin(tokens: TokenProvider, apiTarget: string): Plugin {
  const sessions = new Map<string, number>();
  const sessionCookie = 'helperhoa_admin';

  return {
    name: 'helper-hoa-admin-token-login',
    configureServer(server) {
      // Warm the session up front so the first proxied request already has a
      // token. Failures are surfaced on login rather than at boot.
      void tokens.getToken().catch(() => {});
      server.httpServer?.on('close', () => tokens.dispose());

      server.middlewares.use('/__admin/login', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end();
          return;
        }

        void (async () => {
          let token: string;
          try {
            token = await tokens.getToken();
          } catch (error) {
            response.statusCode = 503;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Could not obtain an admin token.',
            }));
            return;
          }

          try {
            const result = await fetch(`${apiTarget}/admin/dashboard`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            response.statusCode = result.ok ? 200 : result.status === 404 ? 403 : 401;
            response.setHeader('Content-Type', 'application/json');

            if (result.ok) {
              const sessionId = randomBytes(32).toString('hex');
              const expiresAt = Date.now() + 30 * 60 * 1000;
              sessions.set(sessionId, expiresAt);
              response.setHeader('Set-Cookie', `${sessionCookie}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);
            }

            response.end(JSON.stringify(result.ok
              ? { ok: true }
              : { error: 'Admin token was rejected. Check ADMIN_EMAIL and ADMIN_PASSWORD in root/.env.' }));
          } catch {
            response.statusCode = 503;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: `Could not reach the API at ${apiTarget}. Start the server and try again.` }));
          }
        })();
      });

      server.middlewares.use('/__admin/logout', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end();
          return;
        }
        const cookieHeader = request.headers.cookie ?? '';
        const sessionId = cookieHeader.split(';').map((part) => part.trim())
          .find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
        if (sessionId) sessions.delete(sessionId);
        response.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
        response.statusCode = 204;
        response.end();
      });

      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0] ?? '';
        if (!/^\/(admin|products|inventory-alerts)(\/|$)/.test(pathname)) {
          next();
          return;
        }
        const cookieHeader = request.headers.cookie ?? '';
        const sessionId = cookieHeader.split(';').map((part) => part.trim())
          .find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
        const expiresAt = sessionId ? sessions.get(sessionId) : undefined;
        if (!expiresAt || expiresAt <= Date.now()) {
          if (sessionId) sessions.delete(sessionId);
          response.statusCode = 401;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Sign in with the configured admin token.' }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, resolve(webRoot, '..'), '');
  const serverEnv = loadEnv(mode, resolve(webRoot, '../server'), '');
  const staticToken = rootEnv.DEV_TEST_ID_TOKEN || rootEnv.TOKEN || rootEnv.ADMIN_TOKEN
    || serverEnv.ADMIN_TOKEN || serverEnv.TOKEN || process.env.DEV_TEST_ID_TOKEN
    || process.env.ADMIN_TOKEN || process.env.TOKEN || '';
  const email = rootEnv.ADMIN_EMAIL || serverEnv.SEED_ADMIN_EMAIL
    || process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = rootEnv.ADMIN_PASSWORD || serverEnv.SEED_USER_PASSWORD
    || process.env.ADMIN_PASSWORD || process.env.SEED_USER_PASSWORD || 'password123';
  const apiTarget = (rootEnv.ADMIN_API_URL || serverEnv.ADMIN_API_URL
    || `http://localhost:${serverEnv.PORT || rootEnv.PORT || '3000'}`).replace(/\/$/, '');

  const tokens = new TokenProvider({ apiTarget, email, password, staticToken });
  const tokenProxy = (): ProxyOptions => ({
    target: apiTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest) => {
        const token = tokens.peek();
        if (token) proxyRequest.setHeader('Authorization', `Bearer ${token}`);
      });
    },
  });

  return {
    plugins: [react(), tokenLogin(tokens, apiTarget)],
    server: {
      proxy: {
        '/admin': tokenProxy(),
        '/products': tokenProxy(),
        '/inventory-alerts': tokenProxy(),
      },
    },
  };
});
