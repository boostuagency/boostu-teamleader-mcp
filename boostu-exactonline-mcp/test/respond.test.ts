import { describe, it, expect } from "vitest";
import { respond, respondError } from "../src/lib/respond.js";

describe("respond", () => {
  it("wraps data as pretty JSON text content", () => {
    const out = respond({ a: 1 });
    expect(out).toEqual({
      content: [{ type: "text", text: JSON.stringify({ a: 1 }, null, 2) }],
    });
  });
  it("marks errors with isError", () => {
    const out = respondError("boom");
    expect(out).toEqual({ content: [{ type: "text", text: "boom" }], isError: true });
  });
});
