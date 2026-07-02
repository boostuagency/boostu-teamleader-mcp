import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamleaderAuth } from "../src/api/auth.js";

describe("TeamleaderAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.TEAMLEADER_TOKEN_STORE;
  });

  it("refreshes and exposes the rotated refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: "Bearer",
        expires_in: 3600,
        access_token: "access-1",
        refresh_token: "refresh-2",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const auth = new TeamleaderAuth({
      clientId: "cid", clientSecret: "sec", refreshToken: "refresh-1",
    });
    const token = await auth.getAccessToken();

    expect(token).toBe("access-1");
    expect(auth.getRefreshToken()).toBe("refresh-2"); // rotated
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reuses a still-valid access token without re-fetching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: "Bearer", expires_in: 3600,
        access_token: "access-1", refresh_token: "refresh-2",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const auth = new TeamleaderAuth({ clientId: "c", clientSecret: "s", refreshToken: "r" });
    await auth.getAccessToken();
    await auth.getAccessToken();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses injected load/save persistence when provided", async () => {
    const saved: string[] = [];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token_type: "Bearer", expires_in: 3600, access_token: "a1", refresh_token: "r2" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const auth = new TeamleaderAuth({
      clientId: "c", clientSecret: "s", refreshToken: "seed",
      loadRefreshToken: () => "r-from-store",
      saveRefreshToken: (t: string) => { saved.push(t); },
    });
    await auth.getAccessToken();
    expect(saved).toEqual(["r2"]);          // rotation persisted via callback
    expect(auth.getRefreshToken()).toBe("r2");
  });
});
