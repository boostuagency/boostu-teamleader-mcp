# Exact Online — Resource Manifest

**Source of truth** for the Exact Online resource paths used in this project.

All paths are relative to `https://start.exactonline.<region>/api/v1/{division}/`, except
`current/Me`, which sits outside a division.

Verified against the official resource index at
<https://start.exactonline.nl/docs/HlpRestAPIResources.aspx> (checked 2026-09-02).

---

## Conventions

| Aspect | Behaviour |
|--------|-----------|
| Protocol | OData v3. `GET` lists and reads, `POST` creates, `PUT` updates, `DELETE` removes. |
| Envelope | Collections return `{"d":{"results":[...],"__next":"..."}}`, single entities `{"d":{...}}`. |
| JSON | Only when `Accept: application/json` is sent; otherwise Exact answers Atom/XML. |
| Paging | Server-driven, 60 records per page for normal endpoints and 1000 for `bulk/` and `sync/`. Follow `__next`, or pass its `$skiptoken` back. |
| Key access | `crm/Accounts(guid'...')`, `general/Currencies('EUR')`, `system/Divisions(123456)`. |
| Filters | `$filter` with typed literals: `'text'`, `guid'...'`, `datetime'2026-01-31T00:00:00'`. |
| Updates | `PUT` and `DELETE` answer `204 No Content` with an empty body. |
| Errors | `{"error":{"message":{"value":"..."}}}`. |

---

## Groups exposed by this server

The `EXACT_TOOLS` environment variable takes the group keys in the first column.

| Group | Resources | Tools |
|-------|-----------|-------|
| `system` | `current/Me`, `system/Divisions`, `system/AllDivisions`, `system/AvailableFeatures`, `system/AccountantInfo`, `users/UserRoles` | 9 |
| `relations` | `crm/Accounts`, `crm/Contacts`, `crm/Addresses`, `crm/BankAccounts`, `crm/AccountClassifications` | 13 |
| `sales` | `crm/Quotations`, `crm/QuotationLines`, `crm/AcceptQuotation`, `crm/RejectQuotation`, `salesorder/SalesOrders`, `salesorder/SalesOrderLines`, `salesorder/GoodsDeliveries`, `salesinvoice/SalesInvoices`, `salesinvoice/SalesInvoiceLines`, `salesinvoice/PrintedSalesInvoices`, `salesentry/SalesEntries`, `salesentry/SalesEntryLines` | 28 |
| `purchase` | `purchaseentry/PurchaseEntries`, `purchaseentry/PurchaseEntryLines`, `purchase/PurchaseInvoices`, `purchase/PurchaseInvoiceLines`, `purchaseorder/PurchaseOrders`, `purchaseorder/PurchaseOrderLines`, `purchaseorder/GoodsReceipts` | 19 |
| `financial` | `financial/GLAccounts`, `financial/GLClassifications`, `financial/GLAccountClassificationMappings`, `financial/Journals`, `financial/FinancialPeriods`, `financial/ReportingBalance`, `financial/ExchangeRates`, `financialtransaction/TransactionLines`, `generaljournalentry/GeneralJournalEntries`, `generaljournalentry/GeneralJournalEntryLines`, `general/Currencies` | 19 |
| `reports` | `read/financial/ReceivablesList`, `read/financial/PayablesList`, `read/financial/AgingReceivablesList`, `read/financial/AgingPayablesList`, `read/financial/AgingOverview`, `read/financial/OutstandingInvoicesOverview`, `read/financial/ProfitLossOverview`, `read/financial/RevenueList`, `read/financial/JournalStatusList`, `read/financial/Returns` | 11 |
| `banking` | `financialtransaction/BankEntries`, `financialtransaction/BankEntryLines`, `financialtransaction/CashEntries`, `financialtransaction/CashEntryLines`, `cashflow/Banks`, `cashflow/PaymentConditions`, `cashflow/Payments`, `cashflow/Receivables`, `cashflow/DirectDebitMandates` | 16 |
| `items` | `logistics/Items`, `logistics/ItemGroups`, `logistics/SalesItemPrices`, `logistics/Units`, `logistics/CustomerItems`, `sales/SalesPriceLists` | 18 |
| `vat` | `vat/VATCodes`, `vat/VatPercentages`, `financial/DeductibilityPercentages` | 5 |
| `documents` | `documents/Documents`, `documents/DocumentAttachments`, `documents/DocumentCategories`, `documents/DocumentTypes`, `documents/DocumentFolders` | 9 |

**147 tools in total.**

---

## Field conventions worth knowing

These trip people up more than the endpoint names do.

| Field | Meaning |
|-------|---------|
| `Account.Status` | `'C'` customer, `'P'` prospect, `'S'` suspect. Suppliers are marked with `IsSupplier`. |
| `GLAccount.BalanceType` | `'B'` balance sheet, `'W'` profit and loss. |
| `GLAccount.BalanceSide` | `'D'` debit, `'C'` credit. |
| `Journal.Type` | 10 general, 12 cash, 20 sales, 21 purchase, 22 bank. |
| `SalesInvoice.Status` | 5 draft, 20 open, 50 processed. A processed invoice can no longer be edited. |
| `Quotation.Status` | 5 draft, 10 open, 20 sent, 25 accepted, 30 rejected, 35 processed, 40 cancelled. |
| `SalesOrder.Status` | 12 open, 20 partial, 21 complete, 45 cancelled. |
| `Address.Type` | 1 visit, 2 postal, 3 invoice, 4 delivery. |
| `VATCode.Percentage` | A fraction, so 21% is `0.21`. |
| Amounts on `TransactionLines` | Debit positive: costs are positive, revenue negative. |
| `AmountDC` vs `AmountFC` | DC is the administration's default currency, FC the foreign currency of the document. |

---

## Resources deliberately not exposed as tools

The KMO-focused scope leaves out payroll, manufacturing, inventory, projects, subscriptions,
assets and the `sync/` and `bulk/` families. They are all reachable through
`exact_request`, which takes any resource path below the division. Candidates for a future
group:

| Area | Resources |
|------|-----------|
| Projects | `project/Projects`, `project/TimeTransactions`, `project/CostTransactions`, `project/ProjectHourBudgets`, `project/InvoiceTerms` |
| Subscriptions | `subscription/Subscriptions`, `subscription/SubscriptionLines`, `subscription/SubscriptionTypes` |
| Inventory | `inventory/Warehouses`, `inventory/ItemWarehouses`, `inventory/StockCounts`, `sync/Inventory/StockPositions` |
| HRM and payroll | `hrm/Divisions`, `hrm/LeaveRegistrations`, `payroll/Employees`, `payroll/Employments` |
| Assets | `assets/Assets`, `assets/AssetGroups`, `assets/DepreciationMethods` |
| Budgets | `budget/Budgets` |
| Webhooks | `webhooks/WebhookSubscriptions` |
| Bulk and sync | `bulk/Financial/TransactionLines`, `sync/CRM/Accounts`, `sync/Deleted`, and the rest of those families (1000 records per page, meant for replication) |
