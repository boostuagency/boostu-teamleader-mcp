/**
 * Teamleader Contacts Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Contact,
  TeamleaderListResponse,
  TeamleaderInfoResponse,
} from "../types/index.js";

export function registerContactTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Contacts ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_contacts",
    "List contacts from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      term: z.string().optional().describe("Search term to filter contacts"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      updated_since: z
        .string()
        .optional()
        .describe("ISO 8601 date - only contacts updated after this date"),
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
      if (params.term) filter.term = params.term;
      if (params.tags) filter.tags = params.tags;
      if (params.updated_since) filter.updated_since = params.updated_since;
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Contact>>({
        endpoint: "contacts.list",
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

  // ── Get Contact ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_contact",
    "Get detailed information about a specific contact",
    {
      id: z.string().describe("The contact ID"),
    },
    async (params) => {
      const result = await client.request<TeamleaderInfoResponse<Contact>>({
        endpoint: "contacts.info",
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

  // ── Create Contact ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_contact",
    "Create a new contact in Teamleader Focus",
    {
      first_name: z.string().describe("First name"),
      last_name: z.string().describe("Last name"),
      email: z.string().optional().describe("Primary email address"),
      phone: z.string().optional().describe("Phone number"),
      mobile: z.string().optional().describe("Mobile number"),
      language: z.string().optional().describe("Language code (e.g. 'en', 'fr', 'nl')"),
      gender: z.enum(["male", "female"]).optional().describe("Gender"),
      tags: z.array(z.string()).optional().describe("Tags to assign"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        first_name: params.first_name,
        last_name: params.last_name,
      };

      if (params.email) {
        body.emails = [{ type: "primary", email: params.email }];
      }

      const telephones: { type: string; number: string }[] = [];
      if (params.phone) telephones.push({ type: "phone", number: params.phone });
      if (params.mobile) telephones.push({ type: "mobile", number: params.mobile });
      if (telephones.length > 0) body.telephones = telephones;

      if (params.language) body.language = params.language;
      if (params.gender) body.gender = params.gender;
      if (params.tags) body.tags = params.tags;

      const result = await client.request<TeamleaderInfoResponse<{ id: string; type: string }>>({
        endpoint: "contacts.add",
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

  // ── Update Contact ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_update_contact",
    "Update an existing contact in Teamleader Focus",
    {
      id: z.string().describe("The contact ID to update"),
      first_name: z.string().optional().describe("First name"),
      last_name: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Primary email address"),
      phone: z.string().optional().describe("Phone number"),
      mobile: z.string().optional().describe("Mobile number"),
      language: z.string().optional().describe("Language code"),
      gender: z.enum(["male", "female"]).optional().describe("Gender"),
      tags: z.array(z.string()).optional().describe("Tags to assign"),
    },
    async (params) => {
      const body: Record<string, unknown> = { id: params.id };

      if (params.first_name) body.first_name = params.first_name;
      if (params.last_name) body.last_name = params.last_name;
      if (params.email) {
        body.emails = [{ type: "primary", email: params.email }];
      }

      const telephones: { type: string; number: string }[] = [];
      if (params.phone) telephones.push({ type: "phone", number: params.phone });
      if (params.mobile) telephones.push({ type: "mobile", number: params.mobile });
      if (telephones.length > 0) body.telephones = telephones;

      if (params.language) body.language = params.language;
      if (params.gender) body.gender = params.gender;
      if (params.tags) body.tags = params.tags;

      await client.request({
        endpoint: "contacts.update",
        body,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Contact ${params.id} updated` }),
          },
        ],
      };
    }
  );
}
