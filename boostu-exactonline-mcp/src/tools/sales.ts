/**
 * The sales chain: quotation, order, invoice, and the booked sales entry.
 *
 * Exact keeps these as four separate collections rather than one document with
 * a status. A SalesInvoice is the outgoing invoice a customer receives; the
 * SalesEntry is how that invoice lands in the ledger once it is processed.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExactClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { isReadOnly, registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "quotations",
    resource: "crm/Quotations",
    label: "sales quotations",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "QuotationID,QuotationNumber,VersionNumber,OrderAccount,OrderAccountName,Description," +
      "QuotationDate,DueDate,Status,StatusDescription,AmountDC,Currency,Created,Modified",
    key: "QuotationID",
    commonFields:
      "OrderAccount (relation GUID, required), Description, QuotationDate, DueDate, Currency, " +
      "SalesPerson, DeliveryAddress, QuotationLines (array of { Item, Quantity, UnitPrice, Description })",
    filterHint:
      "Status 5 draft, 10 open, 20 sent, 25 accepted (by customer), 30 rejected, 35 processed, 40 cancelled. " +
      "Use exact_quotation_accept / exact_quotation_reject to move a quotation along.",
  },
  {
    name: "quotation_lines",
    resource: "crm/QuotationLines",
    label: "lines on sales quotations",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,QuotationID,LineNumber,Item,ItemDescription,Description,Quantity,UnitCode,NetPrice," +
      "AmountDC,VATCode,VATAmountDC",
    commonFields: "QuotationID (GUID, required), Item (GUID), Quantity, NetPrice, Description, VATCode",
    filterHint: "Filter to one quotation with \"QuotationID eq guid'...'\".",
  },
  {
    name: "sales_orders",
    resource: "salesorder/SalesOrders",
    label: "sales orders",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "OrderID,OrderNumber,OrderedBy,OrderedByName,Description,OrderDate,DeliveryDate,Status," +
      "StatusDescription,AmountDC,Currency,YourRef,Created,Modified",
    key: "OrderID",
    commonFields:
      "OrderedBy (relation GUID, required), OrderDate, DeliveryDate, Description, YourRef, Currency, " +
      "SalesOrderLines (array of { Item, Quantity, NetPrice, Description })",
    filterHint: "Status 12 open, 20 partial, 21 complete, 45 cancelled.",
  },
  {
    name: "sales_order_lines",
    resource: "salesorder/SalesOrderLines",
    label: "lines on sales orders",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,OrderID,LineNumber,Item,ItemDescription,Description,Quantity,QuantityDelivered," +
      "UnitCode,NetPrice,AmountDC,VATCode",
    commonFields: "OrderID (GUID, required), Item (GUID), Quantity, NetPrice, Description, VATCode",
    filterHint: "Filter to one order with \"OrderID eq guid'...'\".",
  },
  {
    name: "goods_deliveries",
    resource: "salesorder/GoodsDeliveries",
    label: "goods deliveries against sales orders",
    ops: ["list"],
    defaultSelect:
      "EntryID,EntryNumber,DeliveryDate,DeliveryAccount,DeliveryAccountName,Description,Remarks,ShippingMethodDescription",
    key: "EntryID",
  },
  {
    name: "sales_invoices",
    resource: "salesinvoice/SalesInvoices",
    label: "outgoing sales invoices",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "InvoiceID,InvoiceNumber,OrderNumber,InvoiceTo,InvoiceToName,Description,InvoiceDate,DueDate," +
      "Status,StatusDescription,AmountDC,AmountFC,VATAmountDC,Currency,YourRef,Journal,Created,Modified",
    key: "InvoiceID",
    commonFields:
      "InvoiceTo (relation GUID, required), OrderedBy, InvoiceDate, DueDate, Description, YourRef, " +
      "Currency, Journal, PaymentCondition, SalesInvoiceLines (array of { Item, Quantity, NetPrice, " +
      "Description, VATCode, GLAccount })",
    filterHint:
      "Status 5 draft (rejected), 20 open, 50 processed (booked into the ledger). A draft invoice can " +
      "still be edited; a processed one cannot. Use exact_sales_invoice_print to book and print it.",
  },
  {
    name: "sales_invoice_lines",
    resource: "salesinvoice/SalesInvoiceLines",
    label: "lines on sales invoices",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,InvoiceID,LineNumber,Item,ItemDescription,Description,Quantity,UnitCode,NetPrice," +
      "AmountDC,VATCode,VATPercentage,VATAmountDC,GLAccount,GLAccountCode,CostCenter,Project",
    commonFields:
      "InvoiceID (GUID, required), Item (GUID), Quantity, NetPrice, Description, VATCode, GLAccount, Project",
    filterHint: "Filter to one invoice with \"InvoiceID eq guid'...'\".",
  },
  {
    name: "sales_entries",
    resource: "salesentry/SalesEntries",
    label: "sales invoices as booked in the ledger",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "EntryID,EntryNumber,Customer,CustomerName,Description,EntryDate,DueDate,InvoiceNumber," +
      "YourRef,AmountDC,VATAmountDC,Currency,Journal,JournalDescription,Status,PaymentReference," +
      "ReportingPeriod,ReportingYear,Created,Modified",
    key: "EntryID",
    commonFields:
      "Customer (relation GUID, required), Journal (sales journal code, required), EntryDate, DueDate, " +
      "Description, YourRef, Currency, SalesEntryLines (array of { GLAccount, AmountDC, VATCode, Description })",
    filterHint:
      "This is the accounting view: one record per booked sales invoice. Status 5 is a draft entry, 20 processed. " +
      "Use it for revenue analysis and for invoices entered straight into the books.",
  },
  {
    name: "sales_entry_lines",
    resource: "salesentry/SalesEntryLines",
    label: "ledger lines of booked sales invoices",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,EntryID,LineNumber,Description,AmountDC,AmountFC,VATCode,VATPercentage,VATAmountDC," +
      "GLAccount,GLAccountCode,GLAccountDescription,CostCenter,CostUnit,Project,Quantity",
    commonFields: "EntryID (GUID, required), GLAccount (GUID), AmountDC, VATCode, Description, Project",
    filterHint: "Filter to one entry with \"EntryID eq guid'...'\".",
  },
];

export function registerSalesTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
  if (isReadOnly()) return;

  server.tool(
    "exact_sales_invoice_print",
    "Book and print a draft sales invoice: this posts it to the ledger and generates the PDF. " +
      "The invoice becomes uneditable afterwards. Set email_to_customer to also send it by email.",
    {
      invoice_id: z.string().describe("InvoiceID (GUID) of the draft sales invoice"),
      document_layout: z
        .string()
        .optional()
        .describe("DocumentLayout GUID to print with. Omit to use the division default."),
      email_to_customer: z
        .boolean()
        .optional()
        .describe("Email the invoice to the customer after booking (default false)"),
      division: z.number().int().optional().describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        const fields: Record<string, unknown> = {
          InvoiceID: p.invoice_id,
          SendInvoiceToCustomer: p.email_to_customer ?? false,
        };
        if (p.document_layout) fields.DocumentLayout = p.document_layout;
        return respond(
          await client.create("salesinvoice/PrintedSalesInvoices", fields, p.division)
        );
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "exact_quotation_accept",
    "Accept a quotation on the customer's behalf, which moves it to the accepted status so it can " +
      "be turned into an order or invoice.",
    {
      quotation_id: z.string().describe("QuotationID (GUID) of the quotation"),
      division: z.number().int().optional().describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        return respond(
          await client.create("crm/AcceptQuotation", { QuotationID: p.quotation_id }, p.division)
        );
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "exact_quotation_reject",
    "Reject a quotation, optionally recording why with a reason code.",
    {
      quotation_id: z.string().describe("QuotationID (GUID) of the quotation"),
      reason_code: z
        .string()
        .optional()
        .describe("ReasonCode GUID from exact_reason_codes_list explaining the rejection"),
      division: z.number().int().optional().describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        const fields: Record<string, unknown> = { QuotationID: p.quotation_id };
        if (p.reason_code) fields.ReasonCode = p.reason_code;
        return respond(await client.create("crm/RejectQuotation", fields, p.division));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
