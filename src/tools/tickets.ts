/**
 * Teamleader Customer-Service Ticket Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerTicketTools(server: McpServer, client: TeamleaderClient): void {
  // ── List Tickets ─────────────────────────────────────────────────────────
  server.tool(
    "teamleader_tickets_list",
    "List support tickets, optionally filtered by customer or status.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      customer_type: z.enum(["contact", "company"]).optional().describe("Customer type for filtering"),
      customer_id: z.string().optional().describe("Customer ID for filtering (requires customer_type)"),
      ticket_status_id: z.string().optional().describe("Filter by ticket status ID"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.customer_type && p.customer_id) {
          filter.customer = { type: p.customer_type, id: p.customer_id };
        }
        if (p.ticket_status_id) filter.ticket_status_id = p.ticket_status_id;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "tickets.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Get Ticket ───────────────────────────────────────────────────────────
  server.tool(
    "teamleader_tickets_info",
    "Get a single support ticket by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "tickets.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Create Ticket ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_tickets_create",
    "Create a new support ticket for a customer. SIDE EFFECT: creates a ticket record.",
    {
      subject: z.string().describe("Ticket subject"),
      customer_type: z.enum(["contact", "company"]).describe("Customer type"),
      customer_id: z.string().describe("Customer ID"),
      description: z.string().optional().describe("Ticket description / initial message"),
      ticket_status_id: z.string().optional().describe("Initial ticket status ID"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          subject: p.subject,
          customer: { type: p.customer_type, id: p.customer_id },
        };
        if (p.description) body.description = p.description;
        if (p.ticket_status_id) body.ticket_status_id = p.ticket_status_id;
        return respond(await client.request({ endpoint: "tickets.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Update Ticket ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_tickets_update",
    "Update a ticket's subject or status.",
    {
      id: z.string().describe("Ticket ID"),
      subject: z.string().optional().describe("New subject"),
      ticket_status_id: z.string().optional().describe("New ticket status ID"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.subject) body.subject = p.subject;
        if (p.ticket_status_id) body.ticket_status_id = p.ticket_status_id;
        return respond(await client.request({ endpoint: "tickets.update", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Add Reply to Ticket ──────────────────────────────────────────────────
  server.tool(
    "teamleader_tickets_add_message",
    "Add a reply/message to a ticket. SIDE EFFECT: posts a message on the ticket thread.",
    {
      ticket_id: z.string().describe("Ticket ID"),
      body: z.string().describe("Message body / reply text"),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "tickets.addReply", body: { ticket_id: p.ticket_id, body: p.body } });
        return respond({ success: true, ticket_id: p.ticket_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── List Ticket Statuses ─────────────────────────────────────────────────
  server.tool(
    "teamleader_ticket_status_list",
    "List all available ticket statuses.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "ticketStatus.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
