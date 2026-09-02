/**
 * The purchase side: orders to suppliers, incoming invoices, and how those
 * invoices land in the ledger.
 *
 * As with sales, Exact splits the document (PurchaseOrder, PurchaseInvoice)
 * from the accounting record (PurchaseEntry). For a small business the entry is
 * usually the interesting one: it is what the bookkeeper sees.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "purchase_entries",
    resource: "purchaseentry/PurchaseEntries",
    label: "incoming supplier invoices as booked in the ledger",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "EntryID,EntryNumber,Supplier,SupplierName,Description,EntryDate,DueDate,InvoiceNumber," +
      "YourRef,AmountDC,VATAmountDC,Currency,Journal,JournalDescription,Status,PaymentReference," +
      "ReportingPeriod,ReportingYear,Created,Modified",
    key: "EntryID",
    commonFields:
      "Supplier (relation GUID, required), Journal (purchase journal code, required), EntryDate, " +
      "DueDate, InvoiceNumber, YourRef, Currency, PurchaseEntryLines (array of { GLAccount, AmountDC, " +
      "VATCode, Description })",
    filterHint:
      "Status 5 is a draft entry, 20 processed. Filter a period with " +
      "\"EntryDate ge datetime'2026-01-01' and EntryDate lt datetime'2026-02-01'\".",
  },
  {
    name: "purchase_entry_lines",
    resource: "purchaseentry/PurchaseEntryLines",
    label: "ledger lines of incoming supplier invoices",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,EntryID,LineNumber,Description,AmountDC,AmountFC,VATCode,VATPercentage,VATAmountDC," +
      "GLAccount,GLAccountCode,GLAccountDescription,CostCenter,CostUnit,Project,Quantity",
    commonFields: "EntryID (GUID, required), GLAccount (GUID), AmountDC, VATCode, Description, Project",
    filterHint: "Filter to one entry with \"EntryID eq guid'...'\".",
  },
  {
    name: "purchase_invoices",
    resource: "purchase/PurchaseInvoices",
    label: "purchase invoices in the approval workflow",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,InvoiceNumber,Supplier,SupplierName,Description,InvoiceDate,DueDate,Status," +
      "StatusDescription,AmountDC,VATAmountDC,Currency,YourRef,Journal,Created,Modified",
    commonFields:
      "Supplier (relation GUID, required), Journal, InvoiceDate, DueDate, InvoiceNumber, YourRef, " +
      "Currency, PurchaseInvoiceLines",
    filterHint:
      "This is the newer purchase-invoice module with approval steps; not every licence has it. " +
      "If it returns 403, use exact_purchase_entries_list instead.",
  },
  {
    name: "purchase_invoice_lines",
    resource: "purchase/PurchaseInvoiceLines",
    label: "lines on purchase invoices",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,InvoiceID,LineNumber,Description,Quantity,UnitPrice,AmountDC,VATCode,GLAccount,Project,CostCenter",
    commonFields: "InvoiceID (GUID, required), GLAccount, Quantity, UnitPrice, VATCode, Description",
  },
  {
    name: "purchase_orders",
    resource: "purchaseorder/PurchaseOrders",
    label: "purchase orders to suppliers",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "PurchaseOrderID,OrderNumber,Supplier,SupplierName,Description,OrderDate,ReceiptDate," +
      "OrderStatus,ReceiptStatus,AmountDC,Currency,YourRef,Created,Modified",
    key: "PurchaseOrderID",
    commonFields:
      "Supplier (relation GUID, required), OrderDate, ReceiptDate, Description, YourRef, Currency, " +
      "PurchaseOrderLines (array of { Item, Quantity, NetPrice, Description })",
    filterHint: "OrderStatus 10 open, 20 partial, 30 complete, 40 cancelled.",
  },
  {
    name: "purchase_order_lines",
    resource: "purchaseorder/PurchaseOrderLines",
    label: "lines on purchase orders",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,PurchaseOrderID,LineNumber,Item,ItemDescription,Description,Quantity,ReceivedQuantity," +
      "UnitCode,NetPrice,AmountDC,VATCode,Project",
    commonFields: "PurchaseOrderID (GUID, required), Item (GUID), Quantity, NetPrice, VATCode, Description",
  },
  {
    name: "goods_receipts",
    resource: "purchaseorder/GoodsReceipts",
    label: "goods received against purchase orders",
    ops: ["list"],
    defaultSelect:
      "ID,EntryNumber,ReceiptDate,Supplier,SupplierName,Description,Remarks,Warehouse,WarehouseDescription",
  },
];

export function registerPurchaseTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
