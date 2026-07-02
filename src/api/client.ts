/**
 * HTTP Client for Teamleader Focus API
 *
 * All Teamleader API endpoints use POST with JSON body.
 * Base URL: https://api.focus.teamleader.eu
 */

import { TeamleaderAuth } from "./auth.js";

const BASE_URL = "https://api.focus.teamleader.eu";

export interface ApiRequestOptions {
  /** Endpoint path, e.g. "contacts.list" */
  endpoint: string;
  /** JSON body to send */
  body?: Record<string, unknown>;
}

export class TeamleaderClient {
  private auth: TeamleaderAuth;

  constructor(auth: TeamleaderAuth) {
    this.auth = auth;
  }

  /**
   * Make an authenticated POST request to the Teamleader Focus API.
   */
  async request<T = unknown>(options: ApiRequestOptions): Promise<T> {
    const accessToken = await this.auth.getAccessToken();
    const url = `${BASE_URL}/${options.endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Teamleader API error [${options.endpoint}]: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }
}
