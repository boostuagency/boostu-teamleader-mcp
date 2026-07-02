import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";

export function registerTagTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_contacts_add_tags",
    "Add one or more tags to a contact.",
    {
      id: z.string(),
      tags: z.array(z.string()).min(1),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "contacts.tag", body: { id: p.id, tags: p.tags } });
        return respond({ success: true, id: p.id, tags: p.tags });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_contacts_remove_tags",
    "Remove one or more tags from a contact.",
    {
      id: z.string(),
      tags: z.array(z.string()).min(1),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "contacts.untag", body: { id: p.id, tags: p.tags } });
        return respond({ success: true, id: p.id, tags: p.tags });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_companies_add_tags",
    "Add one or more tags to a company.",
    {
      id: z.string(),
      tags: z.array(z.string()).min(1),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "companies.tag", body: { id: p.id, tags: p.tags } });
        return respond({ success: true, id: p.id, tags: p.tags });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_companies_remove_tags",
    "Remove one or more tags from a company.",
    {
      id: z.string(),
      tags: z.array(z.string()).min(1),
    },
    async (p) => {
      try {
        await client.request({ endpoint: "companies.untag", body: { id: p.id, tags: p.tags } });
        return respond({ success: true, id: p.id, tags: p.tags });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
