import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "./api/client.js";
import { enabledGroups, isGroupEnabled } from "./lib/toolFilter.js";

import { registerContactTools } from "./tools/contacts.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDealTools } from "./tools/deals.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerEventTools } from "./tools/events.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerQuotationTools } from "./tools/quotations.js";
import { registerProductTools } from "./tools/products.js";
import { registerReferenceTools } from "./tools/reference.js";
import { registerOrgTools } from "./tools/org.js";
import { registerCustomFieldTools } from "./tools/customFields.js";
import { registerCreditNoteTools } from "./tools/creditNotes.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerTimeTrackingTools } from "./tools/timeTracking.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerTicketTools } from "./tools/tickets.js";
import { registerTagTools } from "./tools/tags.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerFileTools } from "./tools/files.js";
import { registerWebhookTools } from "./tools/webhooks.js";

type Register = (server: McpServer, client: TeamleaderClient) => void;

// Group name → registrar. New groups are appended here as later tasks land.
const GROUPS: Record<string, Register> = {
  contacts: registerContactTools,
  companies: registerCompanyTools,
  deals: registerDealTools,
  tasks: registerTaskTools,
  events: registerEventTools,
  invoices: registerInvoiceTools,
  quotations: registerQuotationTools,
  products: registerProductTools,
  reference: registerReferenceTools,
  org: registerOrgTools,
  customFields: registerCustomFieldTools,
  creditNotes: registerCreditNoteTools,
  subscriptions: registerSubscriptionTools,
  projects: registerProjectTools,
  timeTracking: registerTimeTrackingTools,
  activities: registerActivityTools,
  tickets: registerTicketTools,
  tags: registerTagTools,
  notes: registerNoteTools,
  files: registerFileTools,
  webhooks: registerWebhookTools,
};

export function createServer(client: TeamleaderClient): McpServer {
  const server = new McpServer({
    name: "teamleader", // client-facing id; kept stable for existing configs
    version: "2.0.0",
    description:
      "BoostU MCP server for Teamleader Focus CRM — contacts, companies, deals, quotations, invoices, products, projects, and more.",
  });

  const enabled = enabledGroups();
  for (const [group, register] of Object.entries(GROUPS)) {
    if (isGroupEnabled(group, enabled)) register(server, client);
  }
  return server;
}
