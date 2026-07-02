/**
 * Teamleader Activities Tools — Calls & Meetings
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerActivityTools(server: McpServer, client: TeamleaderClient): void {
  // ── List Calls ───────────────────────────────────────────────────────────
  server.tool(
    "teamleader_calls_list",
    "List calls, optionally filtered by customer.",
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
        return respond(await client.request({ endpoint: "calls.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Create Call ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_calls_create",
    "Create a call activity. SIDE EFFECT: creates a call record.",
    {
      due_at: z.string().describe("Call datetime (ISO 8601)"),
      description: z.string().optional().describe("Call description"),
      customer_type: z.enum(["contact", "company"]).optional().describe("Customer type"),
      customer_id: z.string().optional().describe("Customer ID (requires customer_type)"),
      assignee_id: z.string().optional().describe("User ID to assign the call to"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { due_at: p.due_at };
        if (p.description) body.description = p.description;
        if (p.customer_type && p.customer_id) {
          body.customer = { type: p.customer_type, id: p.customer_id };
        }
        if (p.assignee_id) {
          body.assignee = { type: "user", id: p.assignee_id };
        }
        return respond(await client.request({ endpoint: "calls.add", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Complete Call ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_calls_complete",
    "Mark a call as completed. SIDE EFFECT: updates the call status.",
    { id: z.string().describe("Call ID to complete") },
    async (p) => {
      try {
        await client.request({ endpoint: "calls.complete", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "completed" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── List Meetings ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_meetings_list",
    "List meetings.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "meetings.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Create Meeting ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_meetings_create",
    "Schedule a meeting. SIDE EFFECT: creates a meeting record.",
    {
      title: z.string().describe("Meeting title"),
      starts_at: z.string().describe("Start datetime (ISO 8601)"),
      ends_at: z.string().describe("End datetime (ISO 8601)"),
      location: z.string().optional().describe("Meeting location"),
      attendee_user_ids: z.array(z.string()).optional().describe("User IDs to invite as attendees"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          title: p.title,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
        };
        if (p.location) body.location = p.location;
        if (p.attendee_user_ids && p.attendee_user_ids.length > 0) {
          body.attendees = p.attendee_user_ids.map((id) => ({ type: "user", id }));
        }
        return respond(await client.request({ endpoint: "meetings.schedule", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Complete Meeting ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_meetings_complete",
    "Mark a meeting as completed. SIDE EFFECT: updates the meeting status.",
    { id: z.string().describe("Meeting ID to complete") },
    async (p) => {
      try {
        await client.request({ endpoint: "meetings.complete", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "completed" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
