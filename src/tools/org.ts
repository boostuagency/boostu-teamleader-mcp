import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerOrgTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_users_list",
    "List users, optionally filtered by search term.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      term: z.string().optional().describe("Filter by search term"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.term) filter.term = p.term;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "users.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_users_info",
    "Get a single user by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "users.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_users_me",
    "Get the currently authenticated user.",
    {},
    async (_p) => {
      try {
        return respond(await client.request({ endpoint: "users.me", body: {} }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_teams_list",
    "List teams.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "teams.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_departments_list",
    "List departments.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({ page: p.page, page_size: p.page_size });
        return respond(await client.request({ endpoint: "departments.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
