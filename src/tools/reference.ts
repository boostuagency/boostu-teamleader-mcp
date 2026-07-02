import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerReferenceTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_deal_phases_list",
    "List deal phases.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "dealPhases.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_deal_pipelines_list",
    "List deal pipelines.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "dealPipelines.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_deal_sources_list",
    "List deal sources.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "dealSources.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_lost_reasons_list",
    "List lost reasons for deals.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "lostReasons.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_tax_rates_list",
    "List tax rates.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "taxRates.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_payment_terms_list",
    "List payment terms.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "paymentTerms.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_withholding_tax_rates_list",
    "List withholding tax rates.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "withholdingTaxRates.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_work_types_list",
    "List work types. Use this to find a work_type_id for creating tasks or time tracking.",
    {
      term: z.string().optional().describe("Search term in the work type name"),
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const filter = p.term ? { term: p.term } : undefined;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "workTypes.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
