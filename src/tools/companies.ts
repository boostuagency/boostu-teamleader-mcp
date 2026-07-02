/**
 * Teamleader Companies Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Company,
  TeamleaderListResponse,
  TeamleaderInfoResponse,
} from "../types/index.js";

export function registerCompanyTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Companies ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_companies",
    "List companies from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      term: z.string().optional().describe("Search term to filter companies"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      vat_number: z.string().optional().describe("Filter by VAT number"),
      updated_since: z
        .string()
        .optional()
        .describe("ISO 8601 date - only companies updated after this date"),
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
      if (params.vat_number) filter.vat_number = params.vat_number;
      if (params.updated_since) filter.updated_since = params.updated_since;
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Company>>({
        endpoint: "companies.list",
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

  // ── Get Company ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_company",
    "Get detailed information about a specific company",
    {
      id: z.string().describe("The company ID"),
    },
    async (params) => {
      const result = await client.request<TeamleaderInfoResponse<Company>>({
        endpoint: "companies.info",
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

  // ── Create Company ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_company",
    "Create a new company in Teamleader Focus",
    {
      name: z.string().describe("Company name"),
      email: z.string().optional().describe("Primary email address"),
      phone: z.string().optional().describe("Phone number"),
      vat_number: z.string().optional().describe("VAT number"),
      website: z.string().optional().describe("Website URL"),
      language: z.string().optional().describe("Language code (e.g. 'en', 'fr', 'nl')"),
      tags: z.array(z.string()).optional().describe("Tags to assign"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        name: params.name,
      };

      if (params.email) {
        body.emails = [{ type: "primary", email: params.email }];
      }

      if (params.phone) {
        body.telephones = [{ type: "phone", number: params.phone }];
      }

      if (params.vat_number) body.vat_number = params.vat_number;
      if (params.website) body.website = params.website;
      if (params.language) body.language = params.language;
      if (params.tags) body.tags = params.tags;

      const result = await client.request<TeamleaderInfoResponse<{ id: string; type: string }>>({
        endpoint: "companies.add",
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
