/**
 * Teamleader Subscriptions Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";
import { lineItem, toGroupedLines } from "../lib/lineItems.js";

export function registerSubscriptionTools(server: McpServer, client: TeamleaderClient): void {
  // ── List Subscriptions ───────────────────────────────────────────────────
  server.tool(
    "teamleader_subscriptions_list",
    "List subscriptions, optionally filtered by customer.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      customer_type: z.enum(["contact", "company"]).optional().describe("Customer type for filtering"),
      customer_id: z.string().optional().describe("Customer ID for filtering (requires customer_type)"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.customer_type && p.customer_id) {
          filter.customer = { type: p.customer_type, id: p.customer_id };
        }
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "subscriptions.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Get Subscription ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_subscriptions_info",
    "Get a single subscription by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "subscriptions.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Create Subscription ──────────────────────────────────────────────────
  server.tool(
    "teamleader_subscriptions_create",
    "Create a new subscription. SIDE EFFECT: creates recurring invoicing for the customer.",
    {
      title: z.string().describe("Subscription title"),
      customer_type: z.enum(["contact", "company"]).describe("Customer type"),
      customer_id: z.string().describe("Customer ID"),
      department_id: z.string().describe("Department ID"),
      starts_on: z.string().describe("Start date (YYYY-MM-DD)"),
      billing_periods: z.number().describe("Number of billing periods"),
      billing_unit: z.enum(["weekly", "monthly", "quarterly", "yearly"]).describe("Billing cycle unit"),
      line_items: z.array(lineItem).min(1).describe("One or more line items for the subscription"),
    },
    async (p) => {
      try {
        const body = {
          title: p.title,
          invoicee: { customer: { type: p.customer_type, id: p.customer_id } },
          department_id: p.department_id,
          starts_on: p.starts_on,
          billing_cycle: { periods: p.billing_periods, unit: p.billing_unit },
          grouped_lines: toGroupedLines(p.line_items),
        };
        return respond(await client.request({ endpoint: "subscriptions.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Update Subscription ──────────────────────────────────────────────────
  server.tool(
    "teamleader_subscriptions_update",
    "Update a subscription's title.",
    {
      id: z.string().describe("The subscription ID"),
      title: z.string().optional().describe("New title for the subscription"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.title) body.title = p.title;
        return respond(await client.request({ endpoint: "subscriptions.update", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Deactivate Subscription ──────────────────────────────────────────────
  server.tool(
    "teamleader_subscriptions_deactivate",
    "Deactivate a subscription. SIDE EFFECT: stops future invoicing for this subscription.",
    { id: z.string().describe("The subscription ID to deactivate") },
    async (p) => {
      try {
        await client.request({ endpoint: "subscriptions.deactivate", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "deactivated" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
