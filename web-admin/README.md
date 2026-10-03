# Helper Hoa Admin Web Client

The local React development server reads the Firebase **ID token** from the repository-root `.env` as `DEV_TEST_ID_TOKEN`. It verifies the token against the admin API when signing in, stores only a short-lived HttpOnly session cookie in the browser, and attaches the ID token to proxied API requests. The token is not embedded in the React bundle or returned to browser JavaScript.

## Configure and run

1. Ensure `server/.env` has the Firebase web API key required by `get-token.ts`; the backend also needs the root `service-account.json`.
2. From `server/`, generate a development ID token:

   ```sh
   npx tsx src/scripts/get-token.ts
   ```

3. Put the printed ID token in the **repository-root** `.env` as `DEV_TEST_ID_TOKEN=...`. Do not commit or share this file. Firebase ID tokens expire; generate a new token and restart Vite when the login reports it has expired. If a token has been shared or exposed, replace it rather than reusing it.
4. Run the API in one terminal:

   ```sh
   cd server
   npm run dev
   ```

5. Run the web client in another terminal:

   ```sh
   cd web-admin
   npm install
   npm run dev
   ```

6. Open the local URL printed by Vite, usually `http://localhost:5173`, then select **Sign in with admin token**.

## Checks

```sh
npm run lint
npm run build
```

The static-token flow is for local development only. Keep Vite bound to localhost; do not expose its token proxy to a network or deploy it as production authentication. A deployed client needs a real sign-in flow with a server-side session/token exchange.