import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerNoteTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_notes_list",
    "List notes linked to a subject (e.g. contact, company, deal). subject_type and subject_id are required.",
    {
      subject_type: z.string().describe("Type of the linked subject, e.g. 'contact', 'company', 'deal'"),
      subject_id: z.string().describe("ID of the linked subject"),
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
    },
    async (p) => {
      try {
        const body = buildListBody({
          page: p.page,
          page_size: p.page_size,
          filter: { subject: { type: p.subject_type, id: p.subject_id } },
        });
        return respond(await client.request({ endpoint: "notes.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_notes_create",
    "Create a note linked to a subject (e.g. contact, company, deal).",
    {
      subject_type: z.string().describe("Type of the linked subject, e.g. 'contact', 'company', 'deal'"),
      subject_id: z.string().describe("ID of the linked subject"),
      content: z.string().describe("Text content of the note"),
    },
    async (p) => {
      try {
        const body = {
          subject: { type: p.subject_type, id: p.subject_id },
          content: p.content,
        };
        return respond(await client.request({ endpoint: "notes.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
