import { describe, it, expect, vi } from "vitest";

const registered: string[] = [];
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: class {
      constructor(_opts: unknown) {}
      tool(name: string) {
        registered.push(name);
      }
    },
  };
});

describe("createServer", () => {
  it("registers the core CRM tools by default", async () => {
    const { createServer } = await import("../src/server.js");
    registered.length = 0;
    createServer({} as never);
    expect(registered).toContain("teamleader_list_deals");
    expect(registered).toContain("teamleader_list_contacts");
    expect(registered).toContain("teamleader_create_invoice");
    expect(registered).toContain("teamleader_quotations_create");
    expect(registered).toContain("teamleader_products_list");
    expect(registered).toContain("teamleader_deal_phases_list");
    expect(registered).toContain("teamleader_users_me");
    expect(registered).toContain("teamleader_custom_field_definitions_list");
    expect(registered).toContain("teamleader_credit_notes_list");
    expect(registered).toContain("teamleader_invoices_book");
    expect(registered).toContain("teamleader_subscriptions_list");
    expect(registered).toContain("teamleader_projects_list");
    expect(registered).toContain("teamleader_time_tracking_list");
    expect(registered).toContain("teamleader_calls_list");
    expect(registered).toContain("teamleader_tickets_list");
    expect(registered).toContain("teamleader_contacts_add_tags");
    expect(registered).toContain("teamleader_notes_list");
    expect(registered).toContain("teamleader_files_list");
    expect(registered).toContain("teamleader_webhooks_list");
  });

  it("honours TEAMLEADER_TOOLS to restrict groups", async () => {
    const { createServer } = await import("../src/server.js");
    registered.length = 0;
    process.env.TEAMLEADER_TOOLS = "deals";
    createServer({} as never);
    delete process.env.TEAMLEADER_TOOLS;
    expect(registered).toContain("teamleader_list_deals");
    expect(registered).not.toContain("teamleader_list_contacts");
  });
});
