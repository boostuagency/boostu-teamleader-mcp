import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "./api/client.js";
import { enabledGroups, isGroupEnabled } from "./lib/toolFilter.js";
import { isReadOnly } from "./lib/registerResource.js";

import { registerSystemTools } from "./tools/system.js";
import { registerRelationTools } from "./tools/relations.js";
import { registerSalesTools } from "./tools/sales.js";
import { registerPurchaseTools } from "./tools/purchase.js";
import { registerFinancialTools } from "./tools/financial.js";
import { registerReportTools } from "./tools/reports.js";
import { registerBankingTools } from "./tools/banking.js";
import { registerItemTools } from "./tools/items.js";
import { registerVatTools } from "./tools/vat.js";
import { registerDocumentTools } from "./tools/documents.js";

type Register = (server: McpServer, client: ExactClient) => void;

/** Group name to registrar. The keys are what EXACT_TOOLS accepts. */
const GROUPS: Record<string, Register> = {
  system: registerSystemTools,
  relations: registerRelationTools,
  sales: registerSalesTools,
  purchase: registerPurchaseTools,
  financial: registerFinancialTools,
  reports: registerReportTools,
  banking: registerBankingTools,
  items: registerItemTools,
  vat: registerVatTools,
  documents: registerDocumentTools,
};

export const GROUP_NAMES = Object.keys(GROUPS);

export function createServer(client: ExactClient): McpServer {
  const server = new McpServer({
    name: "exactonline", // client-facing id; kept stable for existing configs
    version: "1.0.0",
    description:
      "BoostU MCP server for Exact Online — relations, quotations, sales and purchase invoices, " +
      "the general ledger, banking, VAT, items and financial reports." +
      (isReadOnly() ? " Running in read-only mode: no writes are exposed." : ""),
  });

  const enabled = enabledGroups();
  for (const [group, register] of Object.entries(GROUPS)) {
    if (isGroupEnabled(group, enabled)) register(server, client);
  }
  return server;
}
