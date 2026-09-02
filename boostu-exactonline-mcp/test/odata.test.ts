import { describe, it, expect } from "vitest";
import {
  andFilters,
  buildQuery,
  keySegment,
  odataDate,
  odataGuid,
  odataString,
  skiptokenFrom,
} from "../src/lib/odata.js";

const GUID = "01234567-89ab-cdef-0123-456789abcdef";

describe("odata literals", () => {
  it("escapes single quotes in string literals", () => {
    expect(odataString("Acme")).toBe("'Acme'");
    expect(odataString("O'Brien")).toBe("'O''Brien'");
  });

  it("accepts a guid with or without braces and rejects nonsense", () => {
    expect(odataGuid(GUID)).toBe(`guid'${GUID}'`);
    expect(odataGuid(`{${GUID}}`)).toBe(`guid'${GUID}'`);
    expect(() => odataGuid("not-a-guid")).toThrow(/valid GUID/);
  });

  it("normalises dates to the datetime literal Exact expects", () => {
    expect(odataDate("2026-01-31")).toBe("datetime'2026-01-31T00:00:00'");
    expect(odataDate("2026-01-31T12:30:00Z")).toBe("datetime'2026-01-31T12:30:00'");
    expect(() => odataDate("31/01/2026")).toThrow(/valid date/);
  });
});

describe("keySegment", () => {
  it("builds a guid key segment", () => {
    expect(keySegment("crm/Accounts", GUID, "guid")).toBe(`crm/Accounts(guid'${GUID}')`);
  });
  it("builds string and numeric key segments", () => {
    expect(keySegment("general/Currencies", "EUR", "string")).toBe("general/Currencies('EUR')");
    expect(keySegment("system/Divisions", "123456", "number")).toBe("system/Divisions(123456)");
  });
  it("rejects a non-numeric key for a numeric resource", () => {
    expect(() => keySegment("system/Divisions", "abc", "number")).toThrow(/numeric key/);
  });
});

describe("buildQuery", () => {
  it("prefixes parameters and omits the empty ones", () => {
    expect(buildQuery({ select: "ID,Name", top: 10 })).toEqual({ $select: "ID,Name", $top: "10" });
  });
  it("clamps top into the range Exact accepts", () => {
    expect(buildQuery({ top: 0 }).$top).toBe("1");
    expect(buildQuery({ top: 99999 }).$top).toBe("1000");
  });
  it("maps count onto $inlinecount", () => {
    expect(buildQuery({ count: true }).$inlinecount).toBe("allpages");
    expect(buildQuery({ count: false }).$inlinecount).toBeUndefined();
  });
});

describe("skiptokenFrom", () => {
  it("extracts and decodes the token from a __next url", () => {
    const next =
      "https://start.exactonline.be/api/v1/123/crm/Accounts?$select=ID&$skiptoken=guid%2701234567-89ab-cdef-0123-456789abcdef%27";
    expect(skiptokenFrom(next)).toBe("guid'01234567-89ab-cdef-0123-456789abcdef'");
  });
  it("returns undefined on the last page", () => {
    expect(skiptokenFrom(undefined)).toBeUndefined();
    expect(skiptokenFrom("https://example.com/x?$top=5")).toBeUndefined();
  });
});

describe("andFilters", () => {
  it("joins the non-empty fragments", () => {
    expect(andFilters("A eq 1", undefined, "B eq 2")).toBe("A eq 1 and B eq 2");
  });
  it("returns undefined when nothing is left", () => {
    expect(andFilters(undefined, "  ")).toBeUndefined();
  });
});
