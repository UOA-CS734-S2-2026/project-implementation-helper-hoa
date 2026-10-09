export type TokenProviderOptions = {
  /** Base URL of the Express API, e.g. http://localhost:3000. */
  apiTarget: string;
  /** Admin credentials used to obtain a fresh Firebase ID token. */
  email?: string;
  password?: string;
  /** Pre-minted ID token used when no credentials are configured. */
  staticToken?: string;
  /** How long before expiry to refresh, in milliseconds. */
  refreshMarginMs?: number;
  /** Overridable clock, for tests. */
  now?: () => number;
  /** Overridable fetch implementation, for tests. */
  fetchImpl?: typeof fetch;
};

type AuthResponse = {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
};

const DEFAULT_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

/**
 * Owns the admin ID token for the Vite dev gateway.
 *
 * A Firebase ID token only lives for about an hour, so holding one is not a
 * static value: with `ADMIN_EMAIL`/`ADMIN_PASSWORD` configured the provider
 * signs in once and then refreshes itself before expiry. Without credentials it
 * falls back to a caller-supplied static token.
 */
export class TokenProvider {
  private readonly apiTarget: string;
  private readonly email?: string;
  private readonly password?: string;
  private readonly staticToken?: string;
  private readonly refreshMarginMs: number;
  private readonly now: () => number;
  private readonly fetchImpl: typeof fetch;

  private idToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: TokenProviderOptions) {
    this.apiTarget = options.apiTarget.replace(/\/$/, '');
    this.email = options.email;
    this.password = options.password;
    this.staticToken = options.staticToken;
    this.refreshMarginMs = options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS;
    this.now = options.now ?? Date.now;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** The cached token, without triggering a sign-in or refresh. */
  peek(): string | null {
    return this.idToken ?? this.staticToken ?? null;
  }

  /**
   * Returns a usable admin ID token, signing in or refreshing as needed. A
   * failed refresh falls back to a full sign-in so a revoked refresh token does
   * not strand the gateway.
   */
  async getToken(): Promise<string> {
    if (!this.email || !this.password) {
      if (this.staticToken) return this.staticToken;
      throw new Error('No admin credentials configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in root/.env.');
    }

    if (this.idToken && this.now() < this.expiresAt - this.refreshMarginMs) {
      return this.idToken;
    }

    if (this.refreshToken) {
      try {
        await this.refresh();
        return this.idToken as string;
      } catch {
        // The refresh token was rejected; sign in from scratch below.
      }
    }

    await this.signIn();
    return this.idToken as string;
  }

  private async signIn(): Promise<void> {
    this.applySession(await this.post('/auth/login', { email: this.email, password: this.password }));
  }

  private async refresh(): Promise<void> {
    this.applySession(await this.post('/auth/refresh', { refreshToken: this.refreshToken }));
  }

  private applySession(data: AuthResponse): void {
    if (!data.idToken) {
      throw new Error('Authentication did not return an ID token.');
    }

    this.idToken = data.idToken;
    if (data.refreshToken) this.refreshToken = data.refreshToken;

    const expiresIn = Number(data.expiresIn) || DEFAULT_EXPIRES_IN_SECONDS;
    this.expiresAt = this.now() + expiresIn * 1000;
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = Math.max(this.expiresAt - this.now() - this.refreshMarginMs, 0);
    this.refreshTimer = setTimeout(() => {
      void this.getToken().catch(() => {});
    }, delay);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
    let response: Response;

    try {
      response = await this.fetchImpl(`${this.apiTarget}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(`Could not reach the API at ${this.apiTarget}. Start the server and try again.`);
    }

    const data = (await response.json().catch(() => ({}))) as AuthResponse;

    if (!response.ok) {
      throw new Error(data.error || `Authentication failed (${response.status}).`);
    }

    return data;
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }
}
