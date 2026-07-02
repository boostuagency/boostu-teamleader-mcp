import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerCustomFieldTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_custom_field_definitions_list",
    "List custom field definitions.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "customFieldDefinitions.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_custom_field_definitions_info",
    "Get a single custom field definition by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "customFieldDefinitions.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
