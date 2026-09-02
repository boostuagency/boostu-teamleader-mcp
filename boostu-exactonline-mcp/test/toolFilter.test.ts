import { describe, it, expect } from "vitest";
import { enabledGroups, isGroupEnabled } from "../src/lib/toolFilter.js";

describe("toolFilter", () => {
  it("returns null (all enabled) when env unset/empty", () => {
    expect(enabledGroups(undefined)).toBeNull();
    expect(enabledGroups("")).toBeNull();
    expect(enabledGroups("   ")).toBeNull();
  });
  it("parses a comma list into a trimmed set", () => {
    const set = enabledGroups("sales, reports ,financial");
    expect([...set!].sort()).toEqual(["financial", "reports", "sales"]);
  });
  it("isGroupEnabled true for everything when null", () => {
    expect(isGroupEnabled("anything", null)).toBe(true);
  });
  it("isGroupEnabled respects the set", () => {
    const set = enabledGroups("sales");
    expect(isGroupEnabled("sales", set)).toBe(true);
    expect(isGroupEnabled("purchase", set)).toBe(false);
  });
});
