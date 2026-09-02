/**
 * Read-only financial reports.
 *
 * These live under /read/financial/ and are pre-aggregated by Exact, so they
 * answer the questions a small business actually asks — who still owes me, what
 * did I earn, what do I owe — without summing transaction lines by hand.
 * They are read-only by design: nothing here can be created or changed.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExactClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "receivables",
    resource: "read/financial/ReceivablesList",
    label: "outstanding customer invoices (accounts receivable)",
    ops: ["list"],
    keyed: false,
    defaultSelect:
      "HID,AccountCode,AccountName,InvoiceNumber,YourRef,Description,InvoiceDate,DueDate," +
      "Amount,AmountInTransit,Currency,JournalCode,EntryNumber,Status",
    filterHint:
      "Everything a customer still owes. Overdue only: \"DueDate lt datetime'2026-09-02'\". " +
      "Amount is what is still open, not the invoice total.",
  },
  {
    name: "payables",
    resource: "read/financial/PayablesList",
    label: "outstanding supplier invoices (accounts payable)",
    ops: ["list"],
    keyed: false,
    defaultSelect:
      "HID,AccountCode,AccountName,InvoiceNumber,YourRef,Description,InvoiceDate,DueDate," +
      "Amount,AmountInTransit,Currency,JournalCode,EntryNumber,Status",
    filterHint: "Everything still owed to suppliers. Use it to plan payment runs.",
  },
  {
    name: "aging_receivables",
    resource: "read/financial/AgingReceivablesList",
    label: "receivables bucketed by how overdue they are, per customer",
    ops: ["list"],
    keyed: false,
    defaultSelect:
      "AccountId,AccountCode,AccountName,CurrencyCode,AgeGroup1Amount,AgeGroup2Amount," +
      "AgeGroup3Amount,AgeGroup4Amount,TotalAmount,AgeGroup1Description,AgeGroup2Description," +
      "AgeGroup3Description,AgeGroup4Description",
    filterHint: "The classic aging report: which customers are late and by how much.",
  },
  {
    name: "aging_payables",
    resource: "read/financial/AgingPayablesList",
    label: "payables bucketed by how overdue they are, per supplier",
    ops: ["list"],
    keyed: false,
    defaultSelect:
      "AccountId,AccountCode,AccountName,CurrencyCode,AgeGroup1Amount,AgeGroup2Amount," +
      "AgeGroup3Amount,AgeGroup4Amount,TotalAmount",
  },
  {
    name: "aging_overview",
    resource: "read/financial/AgingOverview",
    label: "the totals of the receivables and payables aging buckets",
    ops: ["list"],
    keyed: false,
    filterHint: "One row with the bucket totals: a quick cash-position summary.",
  },
  {
    name: "outstanding_invoices_overview",
    resource: "read/financial/OutstandingInvoicesOverview",
    label: "totals of outstanding sales and purchase invoices",
    ops: ["list"],
    keyed: false,
    filterHint: "Headline numbers: total still to receive and total still to pay.",
  },
  {
    name: "profit_loss_overview",
    resource: "read/financial/ProfitLossOverview",
    label: "revenue, costs and result for the current and previous year",
    ops: ["list"],
    keyed: false,
    defaultSelect:
      "CurrentYear,PreviousYear,CurrentYearAmount,PreviousYearAmount,CurrentYearCosts," +
      "PreviousYearCosts,CurrentYearRevenue,PreviousYearRevenue,ResultCurrentYear,ResultPreviousYear",
    filterHint: "A year-to-date profit and loss summary with the prior year alongside it.",
  },
  {
    name: "revenue_list",
    resource: "read/financial/RevenueList",
    label: "revenue per period",
    ops: ["list"],
    keyed: false,
    filterHint: "Revenue over time. Combine with exact_reporting_balance_list for a detailed breakdown.",
  },
  {
    name: "journal_status",
    resource: "read/financial/JournalStatusList",
    label: "per journal and period: what is entered and what is still open",
    ops: ["list"],
    keyed: false,
    filterHint: "Use it to see whether a month is fully processed before quoting figures as final.",
  },
  {
    name: "vat_returns",
    resource: "read/financial/Returns",
    label: "submitted VAT returns and their status",
    ops: ["list"],
    keyed: false,
    filterHint: "The VAT declarations filed from this administration.",
  },
];

export function registerReportTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);

  server.tool(
    "exact_overdue_receivables",
    "Convenience report: the customer invoices that are past their due date, oldest first, with a " +
      "total. Use this for the everyday question 'who still owes me money and for how long'.",
    {
      as_of: z
        .string()
        .optional()
        .describe("Date to measure overdue against, YYYY-MM-DD. Defaults to today."),
      min_amount: z.number().optional().describe("Only include invoices at or above this open amount"),
      top: z.number().int().optional().describe("Maximum invoices to return (default 60)"),
      division: z.number().int().optional().describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        const asOf = (p.as_of ?? new Date().toISOString().slice(0, 10)).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
          return respondError(`as_of must be a YYYY-MM-DD date, got "${asOf}".`);
        }
        const result = await client.list<Record<string, unknown>>(
          "read/financial/ReceivablesList",
          {
            filter: `DueDate lt datetime'${asOf}T00:00:00'`,
            select:
              "HID,AccountCode,AccountName,InvoiceNumber,YourRef,Description,InvoiceDate,DueDate,Amount,Currency",
            orderby: "DueDate asc",
            top: p.top ?? 60,
          },
          p.division
        );

        const rows = result.data.filter((row) => {
          const amount = Number(row.Amount);
          return p.min_amount === undefined || (Number.isFinite(amount) && amount >= p.min_amount);
        });
        const total = rows.reduce((sum, row) => {
          const amount = Number(row.Amount);
          return Number.isFinite(amount) ? sum + amount : sum;
        }, 0);

        return respond({
          as_of: asOf,
          invoice_count: rows.length,
          total_open_amount: Math.round(total * 100) / 100,
          note: "Amounts are the open balance per invoice, in the administration's currency.",
          invoices: rows,
          next_skiptoken: result.next_skiptoken,
        });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
