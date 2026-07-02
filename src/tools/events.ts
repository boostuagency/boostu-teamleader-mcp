/**
 * Teamleader Events Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Event,
  TeamleaderListResponse,
  TeamleaderInfoResponse,
} from "../types/index.js";

export function registerEventTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Events ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_events",
    "List calendar events from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      starts_after: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - events starting after this date"),
      starts_before: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - events starting before this date"),
      ends_after: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - events ending after this date"),
      ends_before: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - events ending before this date"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};

      if (params.page || params.page_size) {
        body.page = {
          number: params.page ?? 1,
          size: params.page_size ?? 20,
        };
      }

      const filter: Record<string, unknown> = {};
      if (params.starts_after) filter.starts_after = params.starts_after;
      if (params.starts_before) filter.starts_before = params.starts_before;
      if (params.ends_after) filter.ends_after = params.ends_after;
      if (params.ends_before) filter.ends_before = params.ends_before;
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Event>>({
        endpoint: "events.list",
        body,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // ── Get Event ────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_event",
    "Get detailed information about a specific event",
    {
      id: z.string().describe("The event ID"),
    },
    async (params) => {
      const result = await client.request<TeamleaderInfoResponse<Event>>({
        endpoint: "events.info",
        body: { id: params.id },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // ── Create Event ─────────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_event",
    "Create a new calendar event in Teamleader Focus",
    {
      title: z.string().describe("Event title"),
      description: z.string().optional().describe("Event description"),
      activity_type_id: z.string().describe("Activity type ID"),
      starts_at: z.string().describe("Start datetime (ISO 8601)"),
      ends_at: z.string().describe("End datetime (ISO 8601)"),
      location: z.string().optional().describe("Event location"),
      attendee_ids: z
        .array(
          z.object({
            type: z.string().describe("Attendee type (e.g. 'user', 'contact')"),
            id: z.string().describe("Attendee ID"),
          })
        )
        .optional()
        .describe("List of attendees"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        title: params.title,
        activity_type_id: params.activity_type_id,
        starts_at: params.starts_at,
        ends_at: params.ends_at,
      };

      if (params.description) body.description = params.description;
      if (params.location) body.location = params.location;
      if (params.attendee_ids) body.attendees = params.attendee_ids;

      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "events.create",
        body,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
