/**
 * Teamleader Time Tracking & Timer Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerTimeTrackingTools(server: McpServer, client: TeamleaderClient): void {
  // ── List Time Tracking ───────────────────────────────────────────────────
  server.tool(
    "teamleader_time_tracking_list",
    "List time tracking entries, optionally filtered by user.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      user_id: z.string().optional().describe("Filter by user ID"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.user_id) filter.user_id = p.user_id;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "timeTracking.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Add Time Tracking Entry ──────────────────────────────────────────────
  server.tool(
    "teamleader_time_tracking_add",
    "Add a time tracking entry. SIDE EFFECT: creates a time log record.",
    {
      started_at: z.string().describe("Start datetime (ISO 8601)"),
      duration: z.number().describe("Duration in seconds"),
      work_type_id: z.string().optional().describe("Work type ID"),
      subject_type: z.string().optional().describe("Subject type (e.g. project, task, deal)"),
      subject_id: z.string().optional().describe("Subject ID (requires subject_type)"),
      description: z.string().optional().describe("Description of the work done"),
      invoiceable: z.boolean().optional().describe("Whether this time is invoiceable"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          started_at: p.started_at,
          duration: p.duration,
        };
        if (p.work_type_id) body.work_type_id = p.work_type_id;
        if (p.subject_type && p.subject_id) {
          body.subject = { type: p.subject_type, id: p.subject_id };
        }
        if (p.description) body.description = p.description;
        if (p.invoiceable !== undefined) body.invoiceable = p.invoiceable;
        return respond(await client.request({ endpoint: "timeTracking.add", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Update Time Tracking Entry ───────────────────────────────────────────
  server.tool(
    "teamleader_time_tracking_update",
    "Update a time tracking entry's duration or description.",
    {
      id: z.string().describe("Time tracking entry ID"),
      duration: z.number().optional().describe("New duration in seconds"),
      description: z.string().optional().describe("New description"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.duration !== undefined) body.duration = p.duration;
        if (p.description) body.description = p.description;
        return respond(await client.request({ endpoint: "timeTracking.update", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Start Timer ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_timer_start",
    "Start a running timer. SIDE EFFECT: starts a live timer that must be stopped.",
    {
      work_type_id: z.string().optional().describe("Work type ID"),
      subject_type: z.string().optional().describe("Subject type (e.g. project, task, deal)"),
      subject_id: z.string().optional().describe("Subject ID (requires subject_type)"),
      description: z.string().optional().describe("Description of the work"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {};
        if (p.work_type_id) body.work_type_id = p.work_type_id;
        if (p.subject_type && p.subject_id) {
          body.subject = { type: p.subject_type, id: p.subject_id };
        }
        if (p.description) body.description = p.description;
        return respond(await client.request({ endpoint: "timers.start", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Stop Timer ───────────────────────────────────────────────────────────
  server.tool(
    "teamleader_timer_stop",
    "Stop a running timer. SIDE EFFECT: stops the timer and creates a time tracking entry.",
    {
      id: z.string().describe("Timer ID to stop"),
      ended_at: z.string().optional().describe("End datetime (ISO 8601); defaults to now"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.ended_at) body.ended_at = p.ended_at;
        return respond(await client.request({ endpoint: "timers.stop", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
