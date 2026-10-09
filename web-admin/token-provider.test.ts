import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenProvider } from './token-provider';

const apiTarget = 'http://localhost:3000';
let clock = 0;
const now = () => clock;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

describe('TokenProvider', () => {
  beforeEach(() => {
    clock = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs in with the configured credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ idToken: 'tok-1', refreshToken: 'ref-1', expiresIn: 3600 }));
    const provider = new TokenProvider({ apiTarget, email: 'admin@example.com', password: 'password123', now, fetchImpl });

    await expect(provider.getToken()).resolves.toBe('tok-1');
    expect(fetchImpl).toHaveBeenCalledWith(
      `${apiTarget}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
      }),
    );

    provider.dispose();
  });

  it('reuses a cached token without signing in again', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ idToken: 'tok-1', refreshToken: 'ref-1', expiresIn: 3600 }));
    const provider = new TokenProvider({ apiTarget, email: 'admin@example.com', password: 'password123', now, fetchImpl });

    await provider.getToken();
    await provider.getToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    provider.dispose();
  });

  it('refreshes before the token expires', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ idToken: 'tok-1', refreshToken: 'ref-1', expiresIn: 3600 }))
      .mockResolvedValueOnce(json({ idToken: 'tok-2', refreshToken: 'ref-2', expiresIn: 3600 }));
    const provider = new TokenProvider({ apiTarget, email: 'admin@example.com', password: 'password123', now, fetchImpl });

    await provider.getToken();
    clock = 3400 * 1000;

    await expect(provider.getToken()).resolves.toBe('tok-2');
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `${apiTarget}/auth/refresh`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'ref-1' }),
      }),
    );

    provider.dispose();
  });

  it('falls back to signing in when the refresh token is rejected', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ idToken: 'tok-1', refreshToken: 'ref-1', expiresIn: 3600 }))
      .mockResolvedValueOnce(json({ error: 'Your session has expired. Please log in again.' }, 401))
      .mockResolvedValueOnce(json({ idToken: 'tok-3', refreshToken: 'ref-3', expiresIn: 3600 }));
    const provider = new TokenProvider({ apiTarget, email: 'admin@example.com', password: 'password123', now, fetchImpl });

    await provider.getToken();
    clock = 3400 * 1000;

    await expect(provider.getToken()).resolves.toBe('tok-3');
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    provider.dispose();
  });

  it('uses a static token when no credentials are configured', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = new TokenProvider({ apiTarget, staticToken: 'static-token', now, fetchImpl });

    await expect(provider.getToken()).resolves.toBe('static-token');
    expect(fetchImpl).not.toHaveBeenCalled();

    provider.dispose();
  });

  it('rejects when there are neither credentials nor a static token', async () => {
    const provider = new TokenProvider({ apiTarget, now, fetchImpl: vi.fn<typeof fetch>() });

    await expect(provider.getToken()).rejects.toThrow('No admin credentials configured.');
    provider.dispose();
  });
});
