import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerFileTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_files_list",
    "List files linked to a subject (e.g. contact, company, deal). subject_type and subject_id are required.",
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
        return respond(await client.request({ endpoint: "files.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_files_download",
    "Get a temporary download URL for a file by its ID.",
    {
      id: z.string().describe("ID of the file to download"),
    },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "files.download", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_files_upload",
    "Step 1 of a two-step file upload flow — returns an upload URL/location; the actual bytes are then PUT to that URL out of band. Provide the subject to link the file to and the intended file name.",
    {
      subject_type: z.string().describe("Type of the linked subject, e.g. 'contact', 'company', 'deal'"),
      subject_id: z.string().describe("ID of the linked subject"),
      file_name: z.string().describe("Name of the file to upload"),
    },
    async (p) => {
      try {
        const body = {
          subject: { type: p.subject_type, id: p.subject_id },
          name: p.file_name,
        };
        return respond(await client.request({ endpoint: "files.upload", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
