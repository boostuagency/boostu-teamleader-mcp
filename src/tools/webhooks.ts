import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerWebhookTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_webhooks_list",
    "List registered webhooks.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "webhooks.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_webhooks_register",
    "Register a webhook URL for the given event types (e.g. deal.created, invoice.booked).",
    {
      url: z.string().describe("The HTTPS URL to receive webhook POST requests"),
      types: z.array(z.string()).min(1).describe("List of event types to subscribe to, e.g. ['deal.created', 'invoice.booked']"),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "webhooks.register", body: { url: p.url, types: p.types } });
        return respond({ success: true, url: p.url, types: p.types });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_webhooks_unregister",
    "Unregister a webhook URL for the given event types.",
    {
      url: z.string().describe("The webhook URL to unregister"),
      types: z.array(z.string()).min(1).describe("List of event types to unsubscribe from"),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "webhooks.unregister", body: { url: p.url, types: p.types } });
        return respond({ success: true, url: p.url, types: p.types });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
