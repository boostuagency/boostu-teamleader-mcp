/**
 * OAuth2 authentication for the Exact Online REST API.
 *
 * Two Exact-specific facts drive this implementation:
 *  - the access token lives 10 minutes, so refreshes happen constantly;
 *  - the refresh token rotates on every refresh and the previous one is
 *    invalidated immediately. Losing a rotation means re-running the whole
 *    browser authorization, so rotations are persisted and concurrent refreshes
 *    are collapsed into a single in-flight request.
 */

import type { ExactAuthConfig, TokenResponse } from "../types/index.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Refresh this long before the token actually expires. */
const TOKEN_BUFFER_MS = 30_000;

export class ExactAuth {
  private config: ExactAuthConfig;
  /**
   * Optional persistent store for the rotating refresh token. Without it the
   * rotation only lives in memory and every restart needs a fresh browser
   * authorization, so this is strongly recommended in production.
   */
  private tokenStore?: string;
  /** In-flight refresh, shared by every caller that arrives while it runs. */
  private refreshing?: Promise<void>;

  constructor(config: ExactAuthConfig) {
    this.config = { ...config };
    this.tokenStore = process.env.EXACT_TOKEN_STORE || undefined;
    if (this.tokenStore && existsSync(this.tokenStore)) {
      try {
        const stored = readFileSync(this.tokenStore, "utf8").trim();
        if (stored) this.config.refreshToken = stored;
      } catch (e) {
        console.error(
          `[exactonline-auth] Could not read token store ${this.tokenStore}:`,
          (e as Error).message
        );
      }
    }
    if (this.config.loadRefreshToken) {
      const stored = this.config.loadRefreshToken();
      if (stored) this.config.refreshToken = stored;
    }
  }

  private persistRefreshToken(token: string): void {
    if (this.config.saveRefreshToken) {
      try {
        this.config.saveRefreshToken(token);
      } catch (e) {
        console.error("[exactonline-auth] saveRefreshToken failed:", (e as Error).message);
      }
    }
    if (!this.tokenStore) return;
    try {
      writeFileSync(this.tokenStore, token + "\n", { mode: 0o600 });
    } catch (e) {
      console.error(
        `[exactonline-auth] Could not write token store ${this.tokenStore}:`,
        (e as Error).message
      );
    }
  }

  /** Get a valid access token, refreshing if necessary. */
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) return this.config.accessToken!;
    // Exact invalidates the old refresh token the moment a new one is issued,
    // so two parallel refreshes would burn each other's token. Share one.
    if (!this.refreshing) {
      this.refreshing = this.refreshAccessToken().finally(() => {
        this.refreshing = undefined;
      });
    }
    await this.refreshing;
    return this.config.accessToken!;
  }

  /** The current refresh token, which may have been rotated since boot. */
  getRefreshToken(): string {
    return this.config.refreshToken;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  private isTokenValid(): boolean {
    if (!this.config.accessToken || !this.config.tokenExpiresAt) return false;
    return Date.now() < this.config.tokenExpiresAt - TOKEN_BUFFER_MS;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      throw new Error(
        "Exact Online credentials are incomplete. Set EXACT_CLIENT_ID, EXACT_CLIENT_SECRET " +
          "and EXACT_REFRESH_TOKEN (see docs/AUTHENTICATION.md)."
      );
    }

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(`${this.config.baseUrl}/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to refresh Exact Online token: ${response.status} ${response.statusText} - ${errorText}. ` +
          "A refresh token expires after 30 days of disuse and is invalidated once it has been " +
          "exchanged; re-run the authorization if this keeps failing."
      );
    }

    const data = (await response.json()) as TokenResponse;
    const expiresIn = Number(data.expires_in);

    this.config.accessToken = data.access_token;
    this.config.tokenExpiresAt =
      Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 600) * 1000;

    if (data.refresh_token) {
      this.config.refreshToken = data.refresh_token;
      this.persistRefreshToken(data.refresh_token);
    }
  }
}
