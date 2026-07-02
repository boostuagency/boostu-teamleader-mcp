import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerCreditNoteTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_credit_notes_list",
    "List credit notes, optionally filtered by invoice or department.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      invoice_id: z.string().optional().describe("Filter by invoice ID"),
      department_id: z.string().optional().describe("Filter by department ID"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.invoice_id) filter.invoice_id = p.invoice_id;
        if (p.department_id) filter.department_id = p.department_id;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "creditNotes.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_credit_notes_info",
    "Get a single credit note by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "creditNotes.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
