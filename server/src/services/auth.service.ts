import { requireEnv } from '../config/env';

const SIGN_IN_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

export type AuthSession = {
  idToken: string;
  refreshToken: string;
  /** Seconds until `idToken` stops being accepted by verifyIdToken(). */
  expiresIn: number;
};

export class AuthServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
    this.code = code;
  }
}

type FirebaseErrorBody = {
  error?: {
    message?: string;
  };
};

type Failure = {
  status: number;
  message: string;
};

const SIGN_IN_FAILURES: Record<string, Failure> = {
  // Firebase reports every credential problem as 400 with one of these codes,
  // so the status has to be mapped here rather than passed through.
  INVALID_LOGIN_CREDENTIALS: { status: 401, message: 'Email or password is incorrect.' },
  INVALID_PASSWORD: { status: 401, message: 'Email or password is incorrect.' },
  EMAIL_NOT_FOUND: { status: 401, message: 'Email or password is incorrect.' },
  USER_DISABLED: { status: 403, message: 'This account has been disabled.' },
  INVALID_EMAIL: { status: 400, message: 'That email address is not valid.' },
  MISSING_PASSWORD: { status: 400, message: 'Password is required.' },
  OPERATION_NOT_ALLOWED: {
    status: 503,
    message: 'Email and password sign-in is disabled for this Firebase project.',
  },
  TOO_MANY_ATTEMPTS_TRY_LATER: {
    status: 429,
    message: 'Too many failed attempts. Try again in a few minutes.',
  },
};

const REFRESH_FAILURES: Record<string, Failure> = {
  TOKEN_EXPIRED: { status: 401, message: 'Your session has expired. Please log in again.' },
  INVALID_REFRESH_TOKEN: { status: 401, message: 'Your session has expired. Please log in again.' },
  INVALID_GRANT: { status: 401, message: 'Your session has expired. Please log in again.' },
  UNABLE_TO_PARSE_REFRESH_TOKEN: {
    status: 401,
    message: 'Your session has expired. Please log in again.',
  },
  USER_DISABLED: { status: 403, message: 'This account has been disabled.' },
};

function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveFailure(
  rawCode: string | undefined,
  table: Record<string, Failure>,
): AuthServiceError | undefined {
  if (!rawCode) {
    return undefined;
  }

  // Firebase sometimes suffixes the code with itself, e.g.
  // "TOO_MANY_ATTEMPTS_TRY_LATER :TOO_MANY_ATTEMPTS_TRY_LATER".
  const code = rawCode.split(' ')[0];
  const known = table[code];

  if (!known) {
    return undefined;
  }

  return new AuthServiceError(known.status, code, known.message);
}

/**
 * Exchanges credentials for Firebase ID tokens by calling the Identity Toolkit
 * REST endpoints directly. firebase-admin dropped signInWithEmailAndPassword in
 * v13, so the REST call is the only server-side way to do this with the
 * dependencies this project already has.
 */
export class AuthService {
  private readonly apiKey: string;

  constructor() {
    // Resolved once at construction so a missing key fails at boot rather than
    // on the first login attempt.
    this.apiKey = requireEnv('FIREBASE_WEB_API_KEY');
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const data = await this.post(
      SIGN_IN_URL,
      { email: email.trim(), password, returnSecureToken: true },
      SIGN_IN_FAILURES,
    );

    const idToken = data.idToken;
    const refreshToken = data.refreshToken;

    if (typeof idToken !== 'string' || typeof refreshToken !== 'string') {
      throw new AuthServiceError(
        502,
        'MALFORMED_RESPONSE',
        'Firebase Authentication did not return a token.',
      );
    }

    return {
      idToken,
      refreshToken,
      expiresIn: Number(data.expiresIn) || DEFAULT_EXPIRES_IN_SECONDS,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    // This endpoint answers in snake_case, unlike the sign-in endpoint above.
    const data = await this.post(
      REFRESH_URL,
      { grant_type: 'refresh_token', refresh_token: refreshToken },
      REFRESH_FAILURES,
    );

    const idToken = data.id_token;
    const echoedRefreshToken = data.refresh_token;

    if (typeof idToken !== 'string') {
      throw new AuthServiceError(
        401,
        'NO_SESSION',
        'Your session has expired. Please log in again.',
      );
    }

    return {
      idToken,
      // Firebase echoes the same refresh token back; fall back to the one we
      // sent so a client never ends up storing an empty one.
      refreshToken:
        typeof echoedRefreshToken === 'string' ? echoedRefreshToken : refreshToken,
      expiresIn: Number(data.expires_in) || DEFAULT_EXPIRES_IN_SECONDS,
    };
  }

  private async post(
    url: string,
    body: Record<string, unknown>,
    failures: Record<string, Failure>,
  ): Promise<Record<string, unknown>> {
    let response: Response;

    try {
      response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new AuthServiceError(
        502,
        'IDENTITY_TOOLKIT_UNREACHABLE',
        'Could not reach Firebase Authentication. Check your network connection.',
      );
    }

    const data = parseJson(await response.text());

    if (!response.ok) {
      const firebaseMessage = (data as FirebaseErrorBody).error?.message;
      const mapped = resolveFailure(firebaseMessage, failures);

      if (mapped) {
        throw mapped;
      }

      console.error(
        `[Auth] Unmapped Firebase error from ${url}:`,
        response.status,
        firebaseMessage ?? data,
      );

      throw new AuthServiceError(
        502,
        'UNKNOWN_AUTH_FAILURE',
        'Firebase Authentication returned an unexpected error.',
      );
    }

    return data;
  }
}
