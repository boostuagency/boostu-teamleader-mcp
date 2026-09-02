/**
 * Bank and cash: statements, payment terms, and what is queued for payment.
 *
 * A small business mostly reads here — matching a statement line to an invoice
 * is what the bookkeeping software is for — but bank entries can be created so
 * an assistant can enter a statement that arrived as a PDF.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "bank_entries",
    resource: "financialtransaction/BankEntries",
    label: "bank statements booked into a bank journal",
    ops: ["list", "create"],
    defaultSelect:
      "EntryID,EntryNumber,JournalCode,JournalDescription,FinancialYear,FinancialPeriod," +
      "Status,StatusDescription,Currency,Created,Modified",
    key: "EntryID",
    commonFields:
      "JournalCode (bank journal, required), FinancialYear, FinancialPeriod, Currency, " +
      "BankEntryLines (array of { Date, GLAccount or Account, AmountDC, Description })",
    filterHint: "One record per statement. Status 20 is open, 50 processed.",
  },
  {
    name: "bank_entry_lines",
    resource: "financialtransaction/BankEntryLines",
    label: "individual lines on a bank statement",
    ops: ["list", "create"],
    defaultSelect:
      "ID,EntryID,LineNumber,Date,Description,AmountDC,AmountFC,Account,AccountName,GLAccount," +
      "GLAccountCode,GLAccountDescription,OffsetID,DocumentNumber,PaymentReference,OurRef,YourRef,Project",
    commonFields: "EntryID (GUID, required), Date, AmountDC, GLAccount or Account, Description, PaymentReference",
    filterHint: "Filter to one statement with \"EntryID eq guid'...'\". This is where money in and out shows up.",
  },
  {
    name: "cash_entries",
    resource: "financialtransaction/CashEntries",
    label: "cash book entries",
    ops: ["list", "create"],
    defaultSelect:
      "EntryID,EntryNumber,JournalCode,JournalDescription,FinancialYear,FinancialPeriod,Status,Currency",
    key: "EntryID",
    commonFields: "JournalCode (cash journal, required), FinancialYear, FinancialPeriod, CashEntryLines",
  },
  {
    name: "cash_entry_lines",
    resource: "financialtransaction/CashEntryLines",
    label: "individual cash book lines",
    ops: ["list", "create"],
    defaultSelect:
      "ID,EntryID,LineNumber,Date,Description,AmountDC,Account,AccountName,GLAccount,GLAccountCode,Project",
    commonFields: "EntryID (GUID, required), Date, AmountDC, GLAccount or Account, Description",
  },
  {
    name: "banks",
    resource: "cashflow/Banks",
    label: "the banks known to the administration",
    ops: ["list"],
    defaultSelect: "ID,Code,Name,BICCode,Country",
  },
  {
    name: "payment_conditions",
    resource: "cashflow/PaymentConditions",
    label: "payment terms (due days, discounts, direct debit)",
    ops: ["list"],
    defaultSelect:
      "ID,Code,Description,DaysBetweenInvoiceAndPayment,PaymentDiscountPercentage," +
      "PaymentDaysDiscount,PaymentMethod,DirectDebit",
    filterHint: "Use the Code when setting PaymentCondition on a relation or invoice.",
  },
  {
    name: "payments",
    resource: "cashflow/Payments",
    label: "outgoing payments and their status",
    ops: ["list", "update"],
    defaultSelect:
      "ID,AccountCode,AccountName,InvoiceNumber,Description,AmountDC,Currency,DueDate,PaymentDate," +
      "Status,StatusDescription,PaymentMethod,PaymentCondition,YourRef,EntryNumber",
    commonFields: "PaymentMethod, PaymentDate, Status, PaymentCondition",
    filterHint: "Status 10 open, 20 partly paid, 30 processed, 50 paid.",
  },
  {
    name: "cashflow_receivables",
    resource: "cashflow/Receivables",
    label: "incoming payments expected from customers",
    ops: ["list"],
    defaultSelect:
      "ID,AccountCode,AccountName,InvoiceNumber,Description,AmountDC,Currency,DueDate," +
      "Status,StatusDescription,PaymentMethod,PaymentCondition,YourRef,EntryNumber",
    filterHint: "The cash-flow view of open sales invoices, alongside exact_receivables_list.",
  },
  {
    name: "direct_debit_mandates",
    resource: "cashflow/DirectDebitMandates",
    label: "SEPA direct debit mandates given by customers",
    ops: ["list", "create", "update"],
    defaultSelect:
      "ID,Reference,Account,AccountName,BankAccount,SignatureDate,Type,Status,FirstOrRecurring,Description",
    commonFields: "Account (relation GUID), BankAccount (IBAN), Reference, SignatureDate, Type",
  },
];

export function registerBankingTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
