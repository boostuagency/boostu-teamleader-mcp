/**
 * Exact Online REST API types.
 *
 * Reference: https://start.exactonline.nl/docs/HlpRestAPIResources.aspx
 *
 * Two things shape every type below:
 *  - the API is OData v3, so collections come back as { d: { results: [...] } }
 *    and single entities as { d: {...} };
 *  - almost every resource lives under a division (the administration of one
 *    company), so the division is part of the request path rather than the body.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ExactAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Region base, e.g. https://start.exactonline.be */
  baseUrl: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  /** Optional: read the latest refresh token from external storage on boot. */
  loadRefreshToken?: () => string | undefined;
  /** Optional: persist each rotated refresh token to external storage. */
  saveRefreshToken?: (token: string) => void;
}

export interface TokenResponse {
  token_type: string;
  /** Exact returns this as a string in some regions. */
  expires_in: number | string;
  access_token: string;
  refresh_token: string;
}

// ─── OData envelopes ─────────────────────────────────────────────────────────

export interface ODataCollection<T> {
  d: {
    results: T[];
    /** Absolute URL of the next page; carries the $skiptoken. */
    __next?: string;
    __count?: string;
  };
}

export interface ODataEntity<T> {
  d: T;
}

/** Normalised list result handed back to tools. */
export interface ListResult<T> {
  data: T[];
  /** Total number of matches, present when count was requested. */
  count?: number;
  /** Pass back as `skiptoken` to fetch the next page; absent on the last page. */
  next_skiptoken?: string;
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

/** Values Exact reports in the X-RateLimit-* response headers. */
export interface RateLimitSnapshot {
  limit?: number;
  remaining?: number;
  /** Unix time in milliseconds when the daily window resets. */
  reset?: number;
  minutelyLimit?: number;
  minutelyRemaining?: number;
  minutelyReset?: number;
}

// ─── Divisions ───────────────────────────────────────────────────────────────

export interface Me {
  UserID: string;
  CurrentDivision: number;
  FullName?: string;
  Email?: string;
  Language?: string;
  ThreadId?: number;
  ServerTime?: string;
}

export interface Division {
  Code: number;
  Description?: string;
  Country?: string;
  Currency?: string;
  HID?: number;
  Main?: boolean;
  BlockingStatus?: number;
}
