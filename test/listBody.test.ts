import { describe, it, expect } from "vitest";
import { buildListBody } from "../src/lib/listBody.js";

describe("buildListBody", () => {
  it("returns empty object when nothing provided", () => {
    expect(buildListBody({})).toEqual({});
  });
  it("builds page with defaults when page given", () => {
    expect(buildListBody({ page: 2 })).toEqual({ page: { number: 2, size: 20 } });
  });
  it("clamps page_size to 100", () => {
    expect(buildListBody({ page_size: 500 })).toEqual({ page: { number: 1, size: 100 } });
  });
  it("includes non-empty filter and sort", () => {
    expect(
      buildListBody({ filter: { term: "x" }, sort: [{ field: "name", order: "asc" }] })
    ).toEqual({ filter: { term: "x" }, sort: [{ field: "name", order: "asc" }] });
  });
  it("omits empty filter", () => {
    expect(buildListBody({ filter: {} })).toEqual({});
  });
});
