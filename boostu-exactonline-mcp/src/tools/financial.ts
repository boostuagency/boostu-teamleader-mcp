/**
 * The general ledger: chart of accounts, journals, periods and transactions.
 *
 * TransactionLines is the single most useful collection here — every booking in
 * the administration ends up as a line on it, whatever document created it.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "gl_accounts",
    resource: "financial/GLAccounts",
    label: "the chart of accounts (general ledger accounts)",
    ops: ["list", "create", "update"],
    defaultSelect:
      "ID,Code,Description,BalanceSide,BalanceType,Type,TypeDescription,Costcenter,Compress," +
      "IsBlocked,VATCode,VATDescription,Created,Modified",
    commonFields: "Code (required), Description (required), BalanceSide ('D'/'C'), BalanceType ('B' balance sheet, 'W' profit and loss), Type, VATCode",
    filterHint:
      "BalanceType 'B' is a balance-sheet account, 'W' a profit-and-loss account. " +
      "BalanceSide 'D' debit, 'C' credit.",
  },
  {
    name: "gl_classifications",
    resource: "financial/GLClassifications",
    label: "statutory classifications ledger accounts map onto",
    ops: ["list"],
    defaultSelect: "ID,Code,Description,Parent,Scheme,TaxonomyNamespace,Type",
  },
  {
    name: "gl_classification_mappings",
    resource: "financial/GLAccountClassificationMappings",
    label: "the mapping between ledger accounts and statutory classifications",
    ops: ["list"],
    defaultSelect: "ID,GLAccount,GLAccountCode,Classification,ClassificationCode,ClassificationDescription",
  },
  {
    name: "journals",
    resource: "financial/Journals",
    label: "journals (day books): sales, purchase, bank, cash and general",
    ops: ["list", "create", "update"],
    defaultSelect:
      "ID,Code,Description,Type,TypeDescription,GLAccount,GLAccountCode,GLAccountDescription," +
      "Currency,Bank,PaymentServiceAccountDescription,AllowVAT,IsBlocked",
    commonFields: "Code (required), Description (required), Type (10 general, 12 cash, 20 sales, 21 purchase, 22 bank), GLAccount",
    filterHint:
      "Type 10 general journal, 12 cash, 20 sales, 21 purchase, 22 bank. You need the journal Code " +
      "when creating sales or purchase entries.",
  },
  {
    name: "financial_periods",
    resource: "financial/FinancialPeriods",
    label: "bookkeeping periods and whether they are open or closed",
    ops: ["list"],
    defaultSelect:
      "ID,FinYear,FinPeriod,StartDate,EndDate,Code,Description,IsClosed,PeriodClosedForGL," +
      "PeriodClosedForAP,PeriodClosedForAR",
    filterHint:
      "Check IsClosed before booking into a period. Filter a year with \"FinYear eq 2026\".",
  },
  {
    name: "transaction_lines",
    resource: "financialtransaction/TransactionLines",
    label: "every booking line in the ledger, whatever document created it",
    ops: ["list"],
    defaultSelect:
      "ID,EntryID,EntryNumber,Date,FinancialYear,FinancialPeriod,JournalCode,JournalDescription," +
      "GLAccount,GLAccountCode,GLAccountDescription,Description,AmountDC,AmountVATDC,Account," +
      "AccountName,Type,Status,InvoiceNumber,YourRef,DueDate,CostCenter,CostUnit,Project,Document",
    filterHint:
      "The workhorse for financial questions. Amounts follow Exact's sign convention: debit positive, " +
      "so costs are positive and revenue negative. Filter a period with " +
      "\"FinancialYear eq 2026 and FinancialPeriod eq 3\", or an account with \"GLAccountCode eq '7000'\". " +
      "Status 20 is open, 50 processed.",
  },
  {
    name: "reporting_balance",
    resource: "financial/ReportingBalance",
    keyed: false,
    label: "the trial balance per ledger account, year and period",
    ops: ["list"],
    defaultSelect:
      "ID,ReportingYear,ReportingPeriod,GLAccount,GLAccountCode,GLAccountDescription,BalanceType," +
      "Amount,AmountCredit,AmountDebit,Count,Type,Status,CostCenterCode,CostUnitCode",
    filterHint:
      "The fastest way to a balance sheet or profit-and-loss total: no need to sum transaction lines. " +
      "Filter with \"ReportingYear eq 2026 and ReportingPeriod le 6\". BalanceType 'B' balance sheet, " +
      "'W' profit and loss. Type 20 is provisional, 50 processed.",
  },
  {
    name: "general_journal_entries",
    resource: "generaljournalentry/GeneralJournalEntries",
    label: "manual journal entries (memorial bookings)",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "EntryID,EntryNumber,JournalCode,JournalDescription,Description,EntryDate,ReportingPeriod," +
      "ReportingYear,Currency,Status,StatusDescription,Created,Modified",
    key: "EntryID",
    commonFields:
      "JournalCode (general journal, required), EntryDate, Description, Currency, " +
      "GeneralJournalEntryLines (array of { GLAccount, AmountDC, Description, Date })",
  },
  {
    name: "general_journal_entry_lines",
    resource: "generaljournalentry/GeneralJournalEntryLines",
    label: "lines of manual journal entries",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,EntryID,LineNumber,Date,GLAccount,GLAccountCode,GLAccountDescription,Description," +
      "AmountDC,AmountFC,VATCode,CostCenter,CostUnit,Project",
    commonFields: "EntryID (GUID, required), GLAccount (GUID), AmountDC, Description, Date",
  },
  {
    name: "exchange_rates",
    resource: "financial/ExchangeRates",
    label: "currency exchange rates",
    ops: ["list"],
    defaultSelect: "ID,SourceCurrency,TargetCurrency,Rate,StartDate,EndDate",
  },
  {
    name: "currencies",
    resource: "general/Currencies",
    label: "currencies configured in the administration",
    ops: ["list"],
    key: "Code",
    keyType: "string",
    defaultSelect: "Code,Description,Main,IsBlocked",
  },
];

export function registerFinancialTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
