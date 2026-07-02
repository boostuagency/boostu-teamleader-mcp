/**
 * Teamleader Invoices Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Invoice,
  TeamleaderListResponse,
  TeamleaderInfoResponse,
} from "../types/index.js";
import { respond, respondError } from "../lib/respond.js";

export function registerInvoiceTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Invoices ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_invoices",
    "List invoices from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      department_id: z.string().optional().describe("Filter by department ID"),
      status: z
        .array(z.string())
        .optional()
        .describe("Filter by status (e.g. ['draft', 'outstanding', 'paid'])"),
      updated_since: z
        .string()
        .optional()
        .describe("ISO 8601 date - only invoices updated after this date"),
      invoice_date_after: z
        .string()
        .optional()
        .describe("Filter invoices dated after (YYYY-MM-DD)"),
      invoice_date_before: z
        .string()
        .optional()
        .describe("Filter invoices dated before (YYYY-MM-DD)"),
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
      if (params.department_id) filter.department_id = params.department_id;
      if (params.status) filter.status = params.status;
      if (params.updated_since) filter.updated_since = params.updated_since;
      if (params.invoice_date_after)
        filter.invoice_date_after = params.invoice_date_after;
      if (params.invoice_date_before)
        filter.invoice_date_before = params.invoice_date_before;
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Invoice>>({
        endpoint: "invoices.list",
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

  // ── Get Invoice ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_invoice",
    "Get detailed information about a specific invoice",
    {
      id: z.string().describe("The invoice ID"),
    },
    async (params) => {
      const result = await client.request<TeamleaderInfoResponse<Invoice>>({
        endpoint: "invoices.info",
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

  // ── Create Invoice (Draft) ───────────────────────────────────────────────
  server.tool(
    "teamleader_create_invoice",
    "Create a new draft invoice in Teamleader Focus",
    {
      customer_type: z.enum(["contact", "company"]).describe("Customer type"),
      customer_id: z.string().describe("Customer ID"),
      department_id: z.string().describe("Department ID"),
      payment_term_type: z
        .string()
        .describe("Payment term type (e.g. 'cash', 'end_of_month', 'after_invoice_date')"),
      payment_term_days: z
        .number()
        .optional()
        .describe("Number of days for payment term"),
      invoice_date: z
        .string()
        .optional()
        .describe("Invoice date (YYYY-MM-DD, defaults to today)"),
      note: z.string().optional().describe("Note to include on the invoice"),
      line_items: z
        .array(
          z.object({
            quantity: z.number().describe("Quantity"),
            description: z.string().describe("Line item description"),
            unit_price_amount: z.number().describe("Unit price amount"),
            unit_price_currency: z
              .string()
              .describe("Currency code (e.g. 'EUR')"),
            tax_rate_id: z.string().describe("Tax rate ID"),
            product_id: z
              .string()
              .optional()
              .describe("Product ID (optional)"),
          })
        )
        .describe("Line items for the invoice"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        invoicee: {
          customer: {
            type: params.customer_type,
            id: params.customer_id,
          },
        },
        department_id: params.department_id,
        payment_term: {
          type: params.payment_term_type,
          ...(params.payment_term_days !== undefined && {
            days: params.payment_term_days,
          }),
        },
        grouped_lines: [
          {
            line_items: params.line_items.map((item) => ({
              quantity: item.quantity,
              description: item.description,
              unit_price: {
                amount: item.unit_price_amount,
                currency: item.unit_price_currency,
                tax: "excluding",
              },
              tax_rate_id: item.tax_rate_id,
              ...(item.product_id && { product_id: item.product_id }),
            })),
          },
        ],
      };

      if (params.invoice_date) body.invoice_date = params.invoice_date;
      if (params.note) body.note = params.note;

      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "invoices.draft",
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

  // ── Book Invoice ─────────────────────────────────────────────────────────
  server.tool(
    "teamleader_invoices_book",
    "Book a draft invoice into accounting and assign it a number. SIDE EFFECT: books the draft into accounting and assigns a number; not freely reversible.",
    {
      id: z.string().describe("The invoice ID to book"),
      on: z.string().optional().describe("Book date (YYYY-MM-DD). Defaults to today if omitted."),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.on) body.on = p.on;
        await client.request({ endpoint: "invoices.book", body });
        return respond({ success: true, id: p.id, action: "book" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Send Invoice ─────────────────────────────────────────────────────────
  server.tool(
    "teamleader_invoices_send",
    "Send an invoice by email to the specified recipients. SIDE EFFECT: emails the customer.",
    {
      id: z.string().describe("The invoice ID to send"),
      recipients_to: z.array(z.string()).describe("Email addresses in the To field"),
      subject: z.string().optional().describe("Custom email subject line"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          id: p.id,
          recipients: { to: p.recipients_to.map((email) => ({ email })) },
        };
        if (p.subject) body.subject = p.subject;
        await client.request({ endpoint: "invoices.send", body });
        return respond({ success: true, id: p.id, action: "sent" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Register Payment ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_invoices_register_payment",
    "Register a payment against an invoice.",
    {
      id: z.string().describe("The invoice ID"),
      amount: z.number().describe("Payment amount"),
      currency: z.string().describe("Currency code (e.g. 'EUR')"),
      paid_at: z.string().describe("Payment date-time (ISO 8601)"),
      payment_method_id: z.string().optional().describe("Optional payment method ID"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = {
          id: p.id,
          payment: { amount: p.amount, currency: p.currency },
          paid_at: p.paid_at,
        };
        if (p.payment_method_id) body.payment_method_id = p.payment_method_id;
        await client.request({ endpoint: "invoices.registerPayment", body });
        return respond({ success: true, id: p.id, action: "payment_registered" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Download Invoice ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_invoices_download",
    "Get a temporary download URL for an invoice in the specified format.",
    {
      id: z.string().describe("The invoice ID"),
      format: z.enum(["pdf", "ubl/e-fff"]).describe("Download format: 'pdf' or 'ubl/e-fff'"),
    },
    async (p) => {
      try {
        const body = { id: p.id, format: p.format };
        return respond(await client.request({ endpoint: "invoices.download", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
