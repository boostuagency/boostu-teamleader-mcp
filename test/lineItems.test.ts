import { describe, it, expect } from "vitest";
import { toGroupedLines } from "../src/lib/lineItems.js";

describe("toGroupedLines", () => {
  it("maps flat line items into Teamleader grouped_lines", () => {
    const out = toGroupedLines([
      { quantity: 2, description: "X", unit_price_amount: 100, unit_price_currency: "EUR", tax_rate_id: "t1" } as never,
    ]);
    expect(out).toEqual([
      {
        line_items: [
          {
            quantity: 2,
            description: "X",
            extended_description: undefined,
            unit_price: { amount: 100, currency: "EUR", tax: "excluding" },
            tax_rate_id: "t1",
            product_id: undefined,
          },
        ],
      },
    ]);
  });
});
