import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExactAuth } from "../src/api/auth.js";

const BASE = "https://start.exactonline.be";

function tokenResponse(access: string, refresh: string, expiresIn: number | string = 600) {
  return {
    ok: true,
    json: async () => ({
      token_type: "Bearer",
      expires_in: expiresIn,
      access_token: access,
      refresh_token: refresh,
    }),
  };
}

describe("ExactAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.EXACT_TOKEN_STORE;
  });

  it("refreshes and exposes the rotated refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse("access-1", "refresh-2"));
    vi.stubGlobal("fetch", fetchMock);

    const auth = new ExactAuth({
      clientId: "cid", clientSecret: "sec", refreshToken: "refresh-1", baseUrl: BASE,
    });
    expect(await auth.getAccessToken()).toBe("access-1");
    expect(auth.getRefreshToken()).toBe("refresh-2"); // rotated
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/oauth2/token`);
  });

  it("reuses a still-valid access token without re-fetching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse("access-1", "refresh-2"));
    vi.stubGlobal("fetch", fetchMock);
    const auth = new ExactAuth({ clientId: "c", clientSecret: "s", refreshToken: "r", baseUrl: BASE });
    await auth.getAccessToken();
    await auth.getAccessToken();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("coerces a string expires_in, as some regions return", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse("a", "r2", "600"));
    vi.stubGlobal("fetch", fetchMock);
    const auth = new ExactAuth({ clientId: "c", clientSecret: "s", refreshToken: "r", baseUrl: BASE });
    await auth.getAccessToken();
    await auth.getAccessToken(); // still valid, so no second refresh
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("collapses concurrent refreshes into one request", async () => {
    // Exact invalidates the previous refresh token immediately, so two parallel
    // refreshes would burn each other's token.
    let resolveToken: (v: unknown) => void = () => {};
    const pending = new Promise((r) => { resolveToken = r; });
    const fetchMock = vi.fn().mockImplementation(async () => {
      await pending;
      return tokenResponse("access-1", "refresh-2");
    });
    vi.stubGlobal("fetch", fetchMock);

    const auth = new ExactAuth({ clientId: "c", clientSecret: "s", refreshToken: "r", baseUrl: BASE });
    const both = Promise.all([auth.getAccessToken(), auth.getAccessToken()]);
    resolveToken(undefined);
    expect(await both).toEqual(["access-1", "access-1"]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses injected load/save persistence when provided", async () => {
    const saved: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(tokenResponse("a1", "r2")));
    const auth = new ExactAuth({
      clientId: "c", clientSecret: "s", refreshToken: "seed", baseUrl: BASE,
      loadRefreshToken: () => "r-from-store",
      saveRefreshToken: (t: string) => { saved.push(t); },
    });
    await auth.getAccessToken();
    expect(saved).toEqual(["r2"]); // rotation persisted via callback
    expect(auth.getRefreshToken()).toBe("r2");
  });

  it("fails with a readable message when credentials are missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const auth = new ExactAuth({ clientId: "", clientSecret: "", refreshToken: "", baseUrl: BASE });
    await expect(auth.getAccessToken()).rejects.toThrow(/EXACT_CLIENT_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains an expired refresh token instead of surfacing a bare 400", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 400, statusText: "Bad Request",
      text: async () => "invalid_grant",
    }));
    const auth = new ExactAuth({ clientId: "c", clientSecret: "s", refreshToken: "stale", baseUrl: BASE });
    await expect(auth.getAccessToken()).rejects.toThrow(/30 days/);
  });
});
