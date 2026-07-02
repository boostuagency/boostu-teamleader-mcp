import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerProductTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_products_list",
    "List products, optionally filtered by search term.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      term: z.string().optional().describe("Filter by search term"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.term) filter.term = p.term;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "products.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_products_info",
    "Get a single product by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "products.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_product_categories_list",
    "List product categories.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "productCategories.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_price_lists_list",
    "List price lists.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "priceLists.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_units_of_measure_list",
    "List units of measure.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "unitsOfMeasure.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
