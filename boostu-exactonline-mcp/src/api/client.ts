/**
 * HTTP client for the Exact Online REST API.
 *
 * Unlike a plain REST API this one is OData v3: reads are GET with $-prefixed
 * query parameters, writes are POST/PUT/DELETE on the same collection URL, and
 * every payload is wrapped in a `d` envelope. Nearly every resource is also
 * scoped to a division, which the client resolves once and then reuses.
 */

import type { ExactAuth } from "./auth.js";
import type {
  ListResult,
  Me,
  ODataCollection,
  ODataEntity,
  RateLimitSnapshot,
} from "../types/index.js";
import { buildQuery, keySegment, skiptokenFrom, type ODataQuery } from "../lib/odata.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ExactRequestOptions {
  method?: HttpMethod;
  /** Resource path below the division, e.g. "crm/Accounts". */
  resource: string;
  /** Query parameters, already $-prefixed. */
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  /** Division override; defaults to the resolved current division. */
  division?: number;
  /** Set for the handful of paths that sit outside a division, e.g. "current/Me". */
  divisionless?: boolean;
}

export interface ExactClientOptions {
  /** Pin every call to this division instead of resolving the current one. */
  division?: number;
}

export class ExactClient {
  private auth: ExactAuth;
  private pinnedDivision?: number;
  private divisionPromise?: Promise<number>;
  private lastRateLimit: RateLimitSnapshot = {};

  constructor(auth: ExactAuth, options: ExactClientOptions = {}) {
    this.auth = auth;
    this.pinnedDivision = options.division;
  }

  /** The rate-limit counters Exact reported on the most recent response. */
  get rateLimit(): RateLimitSnapshot {
    return { ...this.lastRateLimit };
  }

  /**
   * The division every call defaults to: EXACT_DIVISION when pinned, otherwise
   * the current division of the authorized user, resolved once and cached.
   */
  async currentDivision(): Promise<number> {
    if (this.pinnedDivision) return this.pinnedDivision;
    if (!this.divisionPromise) {
      this.divisionPromise = this.request<ODataCollection<Me>>({
        resource: "current/Me",
        divisionless: true,
        params: { $select: "CurrentDivision,UserID,FullName,Email" },
      })
        .then((res) => {
          const division = res.d?.results?.[0]?.CurrentDivision;
          if (!division) {
            throw new Error(
              "Could not determine the current division from current/Me. " +
                "Set EXACT_DIVISION to the administration you want to use."
            );
          }
          return division;
        })
        .catch((e) => {
          // Do not cache a failure: a transient auth problem should not make
          // every later call fail for the lifetime of the process.
          this.divisionPromise = undefined;
          throw e;
        });
    }
    return this.divisionPromise;
  }

  /** Make an authenticated request and return the raw OData envelope. */
  async request<T = unknown>(options: ExactRequestOptions): Promise<T> {
    const accessToken = await this.auth.getAccessToken();
    const method = options.method ?? "GET";

    const prefix = options.divisionless
      ? "api/v1"
      : `api/v1/${options.division ?? (await this.currentDivision())}`;
    const url = new URL(`${this.auth.baseUrl}/${prefix}/${options.resource}`);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        // Without this Exact answers in Atom/XML.
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    this.lastRateLimit = readRateLimit(response.headers);

    if (!response.ok) {
      throw new Error(await describeError(response, method, options.resource, this.lastRateLimit));
    }

    // PUT and DELETE answer 204 with an empty body.
    if (response.status === 204) return {} as T;
    const text = await response.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  }

  /** GET a collection and normalise it into data plus paging information. */
  async list<T = Record<string, unknown>>(
    resource: string,
    query: ODataQuery = {},
    division?: number
  ): Promise<ListResult<T>> {
    const res = await this.request<ODataCollection<T>>({
      resource,
      params: buildQuery(query),
      division,
    });
    const out: ListResult<T> = { data: res.d?.results ?? [] };
    const count = Number(res.d?.__count);
    if (Number.isFinite(count)) out.count = count;
    const skiptoken = skiptokenFrom(res.d?.__next);
    if (skiptoken) out.next_skiptoken = skiptoken;
    return out;
  }

  /** GET a single entity by primary key. */
  async get<T = Record<string, unknown>>(
    resource: string,
    key: string,
    keyType: "guid" | "string" | "number",
    select?: string,
    division?: number
  ): Promise<T> {
    const res = await this.request<ODataEntity<T>>({
      resource: keySegment(resource, key, keyType),
      params: select ? { $select: select } : undefined,
      division,
    });
    return res.d;
  }

  /** POST a new entity; Exact echoes the created record back. */
  async create<T = Record<string, unknown>>(
    resource: string,
    fields: Record<string, unknown>,
    division?: number
  ): Promise<T> {
    const res = await this.request<ODataEntity<T>>({
      method: "POST",
      resource,
      body: fields,
      division,
    });
    return res.d;
  }

  /** PUT changed fields onto an existing entity. Answers 204, so returns void. */
  async update(
    resource: string,
    key: string,
    keyType: "guid" | "string" | "number",
    fields: Record<string, unknown>,
    division?: number
  ): Promise<void> {
    await this.request({
      method: "PUT",
      resource: keySegment(resource, key, keyType),
      body: fields,
      division,
    });
  }

  /** DELETE an entity. Answers 204, so returns void. */
  async remove(
    resource: string,
    key: string,
    keyType: "guid" | "string" | "number",
    division?: number
  ): Promise<void> {
    await this.request({
      method: "DELETE",
      resource: keySegment(resource, key, keyType),
      division,
    });
  }
}

function toNumber(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Exact reports two windows: a daily budget per app/company and a per-minute
 * one. When the minute budget is exhausted only the minutely headers are sent,
 * so both variants are read independently.
 */
export function readRateLimit(headers: Headers): RateLimitSnapshot {
  return {
    limit: toNumber(headers.get("X-RateLimit-Limit")),
    remaining: toNumber(headers.get("X-RateLimit-Remaining")),
    reset: toNumber(headers.get("X-RateLimit-Reset")),
    minutelyLimit: toNumber(headers.get("X-RateLimit-Minutely-Limit")),
    minutelyRemaining: toNumber(headers.get("X-RateLimit-Minutely-Remaining")),
    minutelyReset: toNumber(headers.get("X-RateLimit-Minutely-Reset")),
  };
}

/**
 * Turn a failed response into a message an assistant can act on. Exact returns
 * its errors as {"error":{"message":{"value":"..."}}}, which is otherwise
 * unreadable once it has been JSON-stringified into a tool result.
 */
async function describeError(
  response: Response,
  method: string,
  resource: string,
  rateLimit: RateLimitSnapshot
): Promise<string> {
  const raw = await response.text();
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: { value?: string } | string } };
    const message = parsed?.error?.message;
    if (typeof message === "string") detail = message;
    else if (message?.value) detail = message.value;
  } catch {
    // Not JSON; keep the raw body.
  }

  let hint = "";
  if (response.status === 401) {
    hint =
      " The access token was rejected. Check EXACT_CLIENT_ID/EXACT_CLIENT_SECRET and re-run the " +
      "authorization if the refresh token has expired.";
  } else if (response.status === 403) {
    hint =
      " The account is authenticated but lacks access to this resource: the division may not be " +
      "licensed for it, or the API scope was not granted.";
  } else if (response.status === 429) {
    const reset = rateLimit.minutelyReset ?? rateLimit.reset;
    hint =
      ` Rate limit reached (${rateLimit.minutelyRemaining ?? 0} of ` +
      `${rateLimit.minutelyLimit ?? "?"} calls left this minute, ` +
      `${rateLimit.remaining ?? "?"} of ${rateLimit.limit ?? "?"} today)` +
      (reset ? `, resets at ${new Date(reset).toISOString()}` : "") +
      ". Wait and retry, or narrow the query with $select and $filter.";
  }

  return `Exact Online API error [${method} ${resource}]: ${response.status} ${response.statusText} - ${detail}.${hint}`;
}
