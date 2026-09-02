import { describe, it, expect, vi } from "vitest";
import { resolveBaseUrl, REGIONS } from "../src/lib/region.js";

describe("resolveBaseUrl", () => {
  it("defaults to Belgium when nothing is configured", () => {
    expect(resolveBaseUrl(undefined)).toBe(REGIONS.be);
    expect(resolveBaseUrl("  ")).toBe(REGIONS.be);
  });
  it("maps a region key to its hostname", () => {
    expect(resolveBaseUrl("nl")).toBe("https://start.exactonline.nl");
    expect(resolveBaseUrl("UK")).toBe("https://start.exactonline.co.uk");
  });
  it("accepts a full base url and trims trailing slashes", () => {
    expect(resolveBaseUrl("https://start.exactonline.de/")).toBe("https://start.exactonline.de");
  });
  it("warns and falls back on an unknown region", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(resolveBaseUrl("mars")).toBe(REGIONS.be);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
