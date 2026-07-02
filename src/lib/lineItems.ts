import { z } from "zod";

export const lineItem = z.object({
  quantity: z.number(),
  description: z.string(),
  extended_description: z.string().optional(),
  unit_price_amount: z.number(),
  unit_price_currency: z.string().default("EUR"),
  tax_rate_id: z.string(),
  product_id: z.string().optional(),
});

export function toGroupedLines(items: z.infer<typeof lineItem>[]) {
  return [
    {
      line_items: items.map((i) => ({
        quantity: i.quantity,
        description: i.description,
        extended_description: i.extended_description,
        unit_price: { amount: i.unit_price_amount, currency: i.unit_price_currency, tax: "excluding" },
        tax_rate_id: i.tax_rate_id,
        product_id: i.product_id,
      })),
    },
  ];
}
