import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";
import { lineItem, toGroupedLines } from "../lib/lineItems.js";

export function registerQuotationTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_quotations_list",
    "List quotations, optionally filtered by deal id.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      deal_id: z.string().optional().describe("Filter by deal ID"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.deal_id) filter.deal_id = p.deal_id;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "quotations.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_info",
    "Get a single quotation by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "quotations.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_create",
    "Create a quotation on a deal. Provide one or more line items.",
    {
      deal_id: z.string(),
      line_items: z.array(lineItem).min(1),
    },
    async (p) => {
      try {
        const body = { deal_id: p.deal_id, grouped_lines: toGroupedLines(p.line_items) };
        return respond(await client.request({ endpoint: "quotations.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_update",
    "Update a quotation's line items.",
    { id: z.string(), line_items: z.array(lineItem).min(1) },
    async (p) => {
      try {
        const body = { id: p.id, grouped_lines: toGroupedLines(p.line_items) };
        return respond(await client.request({ endpoint: "quotations.update", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_accept",
    "Accept a quotation. SIDE EFFECT: marks the quotation accepted (hard to undo).",
    { id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "quotations.accept", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "accepted" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_send",
    "Send a quotation by email. SIDE EFFECT: emails the customer.",
    {
      id: z.string(),
      recipients_to: z.array(z.string()).describe("Email addresses in the To field"),
      subject: z.string().optional(),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          id: p.id,
          recipients: { to: p.recipients_to.map((email) => ({ email })) },
        };
        if (p.subject) body.subject = p.subject;
        await client.request({ endpoint: "quotations.send", body });
        return respond({ success: true, id: p.id, status: "sent" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
