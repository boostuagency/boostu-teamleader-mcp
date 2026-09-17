import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";
import { lineItem, toGroupedLines } from "../lib/lineItems.js";

/** Languages Teamleader accepts on quotations.send (QuotationLanguage in the API reference). */
export const QUOTATION_LANGUAGES = [
  "en", "nl", "fr", "de", "es", "pt", "it", "da", "sv", "no", "fi", "pl", "cs", "sk", "hu", "ro",
  "bg", "ru", "uk", "tr", "gr", "ch", "jp", "ko", "ar", "ca", "so", "ir", "iq", "gh", "bs", "br",
  "ag", "al", "af",
] as const;

const expiryDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expiry_date must be formatted YYYY-MM-DD")
  .describe("Valid-until date of the quotation (YYYY-MM-DD). Needs the quotation expiry feature in Teamleader.");

const actionAfterExpiry = z
  .enum(["lock", "none"])
  .describe("What Teamleader does once the expiry date passes: 'lock' blocks acceptance, 'none' leaves the quotation open.");

/** Shape of quotations.info when includes=expiry is requested. */
interface QuotationInfo {
  data?: { expiry?: { expires_after?: string | null; action_after_expiry?: "lock" | "none" } };
}

/** What the API needs in `from`: the sender and the address, always together. */
function senderFrom(p: { from_sender_type?: "user" | "department"; from_sender_id?: string; from_email_address?: string }) {
  const given = [p.from_sender_type, p.from_sender_id, p.from_email_address].filter((v) => v !== undefined).length;
  if (given === 0) return undefined;
  if (given < 3) {
    throw new Error("from_sender_type, from_sender_id and from_email_address must be given together.");
  }
  return {
    sender: { type: p.from_sender_type, id: p.from_sender_id },
    email_address: p.from_email_address,
  };
}

export function registerQuotationTools(server: McpServer, client: TeamleaderClient): void {
  server.tool(
    "teamleader_quotations_list",
    "List quotations, optionally filtered by deal id.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      deal_id: z.string().optional().describe("Filter by deal ID"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.deal_id) filter.deal_id = p.deal_id;
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "quotations.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_info",
    "Get a single quotation by id. Set include_expiry to also see its valid-until date and what happens after it.",
    {
      id: z.string(),
      include_expiry: z.boolean().optional().describe("Also return the expiry (valid-until) settings"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.include_expiry) body.includes = "expiry";
        return respond(await client.request({ endpoint: "quotations.info", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_create",
    "Create a quotation on a deal. Provide line items and/or free text, optionally with a valid-until date.",
    {
      deal_id: z.string(),
      line_items: z.array(lineItem).min(1).optional(),
      text: z.string().optional().describe("Free text on the quotation (Markdown). Required when there are no line items."),
      name: z.string().optional().describe("Name of the quotation, 1 to 80 characters. Generated from the number when omitted."),
      expiry_date: expiryDate.optional(),
      action_after_expiry: actionAfterExpiry.optional().describe(
        "What happens once expiry_date passes: 'lock' or 'none'. Defaults to 'none' when only expiry_date is given."
      ),
    },
    async (p) => {
      try {
        if (!p.line_items && p.text === undefined) {
          return respondError("A quotation needs line_items and/or text.");
        }
        const body: Record<string, unknown> = { deal_id: p.deal_id };
        if (p.line_items) body.grouped_lines = toGroupedLines(p.line_items);
        if (p.text !== undefined) body.text = p.text;
        if (p.name !== undefined) body.name = p.name;
        if (p.expiry_date !== undefined || p.action_after_expiry !== undefined) {
          body.expiry = {
            expires_after: p.expiry_date ?? null,
            action_after_expiry: p.action_after_expiry ?? "none",
          };
        }
        return respond(await client.request({ endpoint: "quotations.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_update",
    "Update a quotation: replace its line items, move its valid-until date (expiry_date), change the text or the name. " +
      "Only the fields you pass change; moving the date keeps the quotation's current action_after_expiry.",
    {
      id: z.string(),
      line_items: z.array(lineItem).min(1).optional().describe("Replaces all existing line items"),
      text: z.string().optional().describe("Free text on the quotation (Markdown)"),
      name: z.string().optional().describe("Name of the quotation, 1 to 80 characters"),
      expiry_date: expiryDate.optional(),
      action_after_expiry: actionAfterExpiry.optional(),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.line_items) body.grouped_lines = toGroupedLines(p.line_items);
        if (p.text !== undefined) body.text = p.text;
        if (p.name !== undefined) body.name = p.name;
        if (p.expiry_date !== undefined || p.action_after_expiry !== undefined) {
          // The API takes expiry as one object with action_after_expiry mandatory, so a
          // partial change has to carry the half the caller did not mention. Read it
          // back rather than guessing, or moving the date would silently reset the action.
          let date: string | null | undefined = p.expiry_date;
          let action = p.action_after_expiry;
          if (date === undefined || action === undefined) {
            const current = await client.request<QuotationInfo>({
              endpoint: "quotations.info",
              body: { id: p.id, includes: "expiry" },
            });
            date ??= current?.data?.expiry?.expires_after ?? null;
            action ??= current?.data?.expiry?.action_after_expiry ?? "none";
          }
          body.expiry = { expires_after: date, action_after_expiry: action };
        }
        const changed = Object.keys(body).filter((k) => k !== "id");
        if (changed.length === 0) {
          return respondError("Nothing to update: pass line_items, text, name, expiry_date or action_after_expiry.");
        }
        await client.request({ endpoint: "quotations.update", body });
        return respond({ success: true, id: p.id, updated: changed });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_accept",
    "Accept a quotation. SIDE EFFECT: marks the quotation accepted (hard to undo).",
    { id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "quotations.accept", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "accepted" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_quotations_send",
    "Send a quotation by email with your own subject and message, for example a reminder before it expires. " +
      "SIDE EFFECT: emails the customer. Put #LINK in content where Teamleader must insert the link to view and sign the quotation.",
    {
      id: z.string().describe("Quotation id"),
      recipients_to: z.array(z.string()).min(1).describe("Email addresses in the To field"),
      recipients_cc: z.array(z.string()).optional().describe("Email addresses in the Cc field"),
      recipients_bcc: z.array(z.string()).optional().describe("Email addresses in the Bcc field"),
      subject: z.string().describe("Email subject"),
      content: z
        .string()
        .describe("Email body. Include #LINK where the link to the quotation goes; without it the customer gets no link."),
      language: z
        .enum(QUOTATION_LANGUAGES)
        .describe("Language of the email and the quotation document, e.g. nl, fr, en, de. Use the customer's language."),
      from_sender_type: z.enum(["user", "department"]).optional().describe("Send on behalf of a user or a department"),
      from_sender_id: z.string().optional().describe("Id of that user or department"),
      from_email_address: z.string().optional().describe("Sender address shown to the customer"),
      attachment_file_ids: z.array(z.string()).optional().describe("Ids of files to attach (see teamleader_files_list)"),
    },
    async (p) => {
      try {
        const from = senderFrom(p);
        const address = (email: string) => ({ email_address: email });
        const recipients: Record<string, unknown> = { to: p.recipients_to.map(address) };
        if (p.recipients_cc?.length) recipients.cc = p.recipients_cc.map(address);
        if (p.recipients_bcc?.length) recipients.bcc = p.recipients_bcc.map(address);
        const body: Record<string, unknown> = {
          quotations: [p.id],
          recipients,
          subject: p.subject,
          content: p.content,
          language: p.language,
        };
        if (from) body.from = from;
        if (p.attachment_file_ids?.length) body.attachments = p.attachment_file_ids;
        await client.request({ endpoint: "quotations.send", body });
        const result: Record<string, unknown> = { success: true, id: p.id, status: "sent" };
        if (!p.content.includes("#LINK")) {
          result.warning = "content did not contain #LINK, so the email carried no link to the quotation.";
        }
        return respond(result);
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
