/**
 * VAT codes and percentages.
 *
 * Every invoice line needs a VAT code, and the right code depends on the
 * country and whether the counterparty is a business, so these lookups are
 * needed before almost any write to a sales or purchase document.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "vat_codes",
    resource: "vat/VATCodes",
    label: "VAT codes and the rate, type and ledger accounts behind them",
    ops: ["list", "create", "update"],
    key: "ID",
    defaultSelect:
      "ID,Code,Description,Percentage,Type,TypeDescription,VATTransactionType,GLDiscountPurchase," +
      "GLToPay,GLToClaim,IsBlocked,Charged,TaxReturnType,Country",
    commonFields: "Code (required), Description (required), Percentage, Type, Charged, GLToPay, GLToClaim",
    filterHint:
      "Resolve a code here before booking a line: Percentage is a fraction (0.21 means 21%). " +
      "Type 'I' is inclusive, 'E' exclusive.",
  },
  {
    name: "vat_percentages",
    resource: "vat/VatPercentages",
    label: "the rate history of each VAT code",
    ops: ["list"],
    defaultSelect: "ID,VATCodeID,VATCode,Percentage,StartDate,EndDate,LineNumber",
    filterHint: "Use this when booking into a past period where the rate differed.",
  },
  {
    name: "deductibility_percentages",
    resource: "financial/DeductibilityPercentages",
    label: "deductibility percentages for partly deductible costs, such as cars and catering",
    ops: ["list"],
    defaultSelect: "ID,GLAccount,GLAccountCode,GLAccountDescription,Percentage,StartDate,EndDate",
  },
];

export function registerVatTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
