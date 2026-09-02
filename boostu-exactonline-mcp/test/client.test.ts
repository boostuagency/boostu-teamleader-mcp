import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExactClient, readRateLimit } from "../src/api/client.js";
import type { ExactAuth } from "../src/api/auth.js";

const BASE = "https://start.exactonline.be";
const GUID = "01234567-89ab-cdef-0123-456789abcdef";

function fakeAuth(): ExactAuth {
  return { getAccessToken: async () => "tok", baseUrl: BASE } as unknown as ExactAuth;
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: "OK",
    headers: new Headers(init.headers ?? {}),
    text: async () => JSON.stringify(body),
  };
}

describe("ExactClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("builds a division-scoped url with the OData parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ d: { results: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ExactClient(fakeAuth(), { division: 123456 });
    await client.list("crm/Accounts", { select: "ID,Name", top: 5 });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/123456/crm/Accounts");
    expect(url.searchParams.get("$select")).toBe("ID,Name");
    expect(url.searchParams.get("$top")).toBe("5");
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe("application/json");
  });

  it("resolves the current division from current/Me and caches it", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ d: { results: [{ CurrentDivision: 999 }] } }))
      .mockResolvedValue(jsonResponse({ d: { results: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ExactClient(fakeAuth());
    await client.list("crm/Accounts");
    await client.list("crm/Contacts");

    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/v1/current/Me");
    expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe("/api/v1/999/crm/Accounts");
    expect(new URL(fetchMock.mock.calls[2][0]).pathname).toBe("/api/v1/999/crm/Contacts");
    expect(fetchMock).toHaveBeenCalledTimes(3); // Me resolved once, not per call
  });

  it("does not cache a failed division lookup", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: { value: "nope" } } }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ d: { results: [{ CurrentDivision: 7 }] } }))
      .mockResolvedValue(jsonResponse({ d: { results: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ExactClient(fakeAuth());
    await expect(client.list("crm/Accounts")).rejects.toThrow(/401/);
    await expect(client.list("crm/Accounts")).resolves.toBeTruthy();
  });

  it("normalises a collection into data, count and the next page token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      d: {
        results: [{ ID: GUID }],
        __count: "42",
        __next: `${BASE}/api/v1/1/crm/Accounts?$skiptoken=guid%27${GUID}%27`,
      },
    })));

    const client = new ExactClient(fakeAuth(), { division: 1 });
    const result = await client.list("crm/Accounts");
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(42);
    expect(result.next_skiptoken).toBe(`guid'${GUID}'`);
  });

  it("unwraps a single entity from the d envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ d: { ID: GUID, Name: "Acme" } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ExactClient(fakeAuth(), { division: 1 });
    expect(await client.get("crm/Accounts", GUID, "guid")).toEqual({ ID: GUID, Name: "Acme" });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(
      `/api/v1/1/crm/Accounts(guid'${GUID}')`
    );
  });

  it("treats 204 on update and delete as success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 204, statusText: "No Content", headers: new Headers(), text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ExactClient(fakeAuth(), { division: 1 });
    await expect(client.update("crm/Accounts", GUID, "guid", { Name: "New" })).resolves.toBeUndefined();
    await expect(client.remove("crm/Accounts", GUID, "guid")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("surfaces the Exact error message rather than the raw envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(
      { error: { message: { value: "Invalid VAT code" } } },
      { status: 400 }
    )));
    const client = new ExactClient(fakeAuth(), { division: 1 });
    await expect(client.list("crm/Accounts")).rejects.toThrow(/Invalid VAT code/);
  });

  it("explains a 429 with the rate-limit counters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, {
      status: 429,
      headers: { "X-RateLimit-Minutely-Limit": "60", "X-RateLimit-Minutely-Remaining": "0" },
    })));
    const client = new ExactClient(fakeAuth(), { division: 1 });
    await expect(client.list("crm/Accounts")).rejects.toThrow(/0 of 60 calls left this minute/);
    expect(client.rateLimit.minutelyLimit).toBe(60);
  });
});

describe("readRateLimit", () => {
  it("reads both the daily and the minutely window", () => {
    const snapshot = readRateLimit(new Headers({
      "X-RateLimit-Limit": "5000",
      "X-RateLimit-Remaining": "4980",
      "X-RateLimit-Minutely-Limit": "60",
      "X-RateLimit-Minutely-Remaining": "59",
    }));
    expect(snapshot).toMatchObject({
      limit: 5000, remaining: 4980, minutelyLimit: 60, minutelyRemaining: 59,
    });
  });
  it("leaves absent headers undefined", () => {
    expect(readRateLimit(new Headers())).toEqual({
      limit: undefined, remaining: undefined, reset: undefined,
      minutelyLimit: undefined, minutelyRemaining: undefined, minutelyReset: undefined,
    });
  });
});
