/**
 * Documents and their attachments.
 *
 * Exact stores files as a Document with one or more DocumentAttachments; the
 * file itself is a base64 string on the attachment. This is where a scanned
 * supplier invoice or a signed contract lives, linked to a relation or an
 * accounting entry.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExactClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { isReadOnly, registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "documents",
    resource: "documents/Documents",
    label: "documents: contracts, scans and other files filed in Exact",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Subject,Type,TypeDescription,Category,CategoryDescription,Account,AccountName,Contact," +
      "DocumentDate,DocumentFolder,Body,HasEmptyBody,FinancialTransactionEntryID,Created,Modified",
    commonFields:
      "Subject (required), Type (document type ID, required), Category, Account (relation GUID), " +
      "DocumentDate, DocumentFolder, Body (free text)",
    filterHint:
      "The file bytes are not here: list exact_document_attachments_list for the same document, " +
      "or use exact_document_attachment_add to upload one.",
  },
  {
    name: "document_attachments",
    resource: "documents/DocumentAttachments",
    label: "the files attached to a document",
    ops: ["list", "create"],
    deletable: true,
    defaultSelect: "ID,Document,FileName,FileSize,Url",
    commonFields: "Document (GUID, required), Attachment (base64 file contents), FileName",
    filterHint:
      "Filter to one document with \"Document eq guid'...'\". Leave Attachment out of $select unless " +
      "you really want the base64 payload back.",
  },
  {
    name: "document_categories",
    resource: "documents/DocumentCategories",
    label: "document categories",
    ops: ["list"],
    defaultSelect: "ID,Description,Created,Modified",
  },
  {
    name: "document_types",
    resource: "documents/DocumentTypes",
    label: "document types and the category each belongs to",
    ops: ["list"],
    key: "ID",
    keyType: "number",
    defaultSelect: "ID,Description,DocumentIsCreatable,DocumentIsViewable,TypeCategory,TypeCategoryDescription",
    filterHint: "You need a Type ID when creating a document; DocumentIsCreatable eq true narrows to usable ones.",
  },
  {
    name: "document_folders",
    resource: "documents/DocumentFolders",
    label: "the folder tree documents are filed in",
    ops: ["list"],
    defaultSelect: "ID,Description,ParentID,FullPath",
  },
];

export function registerDocumentTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
  if (isReadOnly()) return;

  server.tool(
    "exact_document_attachment_add",
    "Attach a file to an existing document. The file must be supplied as base64; Exact stores the " +
      "bytes, not a link. Create the document first with exact_documents_create.",
    {
      document_id: z.string().describe("Document GUID to attach the file to"),
      file_name: z.string().describe("File name including its extension, e.g. \"invoice-2026-001.pdf\""),
      content_base64: z.string().describe("The file contents, base64 encoded, without a data: prefix"),
      division: z.number().int().optional().describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        const created = await client.create<Record<string, unknown>>(
          "documents/DocumentAttachments",
          {
            Document: p.document_id,
            FileName: p.file_name,
            Attachment: p.content_base64.replace(/^data:[^;]+;base64,/, ""),
          },
          p.division
        );
        // Echo everything except the base64 blob, which would flood the transcript.
        const { Attachment, ...rest } = created;
        return respond(rest);
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
