import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, AuthServiceError } from './auth.service';

describe('AuthService', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('FIREBASE_WEB_API_KEY', 'test-api-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('trims the email and returns the Firebase sign-in session', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1800',
    }), { status: 200 }));

    const result = await new AuthService().signIn(' staff@example.com ', 'secret');

    expect(result).toEqual({
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: 1800,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'staff@example.com',
          password: 'secret',
          returnSecureToken: true,
        }),
      }),
    );
  });

  it('maps invalid credentials to a safe client error', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { message: 'INVALID_LOGIN_CREDENTIALS' },
    }), { status: 400 }));

    await expect(new AuthService().signIn('staff@example.com', 'wrong'))
      .rejects.toMatchObject({
        status: 401,
        code: 'INVALID_LOGIN_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
  });

  it('preserves the supplied refresh token if Firebase omits the echoed value', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      id_token: 'renewed-token',
      expires_in: '3600',
    }), { status: 200 }));

    await expect(new AuthService().refresh('refresh-token')).resolves.toEqual({
      idToken: 'renewed-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    });
  });

  it('rejects malformed successful responses explicitly', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      refreshToken: 'refresh-token',
    }), { status: 200 }));

    const result = new AuthService().signIn('staff@example.com', 'secret');
    await expect(result).rejects.toBeInstanceOf(AuthServiceError);
    await expect(result).rejects.toMatchObject({
      status: 502,
      code: 'MALFORMED_RESPONSE',
    });
  });
});
