import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

/** Re-import server.ts with a clean module cache so env changes take effect. */
async function register(): Promise<string[]> {
  vi.resetModules();
  registered.length = 0;
  const { createServer } = await import("../src/server.js");
  createServer({} as never);
  return [...registered];
}

describe("createServer", () => {
  beforeEach(() => {
    delete process.env.EXACT_TOOLS;
    delete process.env.EXACT_READ_ONLY;
  });
  afterEach(() => {
    delete process.env.EXACT_TOOLS;
    delete process.env.EXACT_READ_ONLY;
  });

  it("registers a tool from every group by default", async () => {
    const tools = await register();
    for (const name of [
      "exact_me",
      "exact_divisions_list",
      "exact_request",
      "exact_record_delete",
      "exact_accounts_list",
      "exact_contacts_create",
      "exact_sales_invoices_list",
      "exact_sales_invoice_print",
      "exact_quotation_accept",
      "exact_purchase_entries_list",
      "exact_gl_accounts_list",
      "exact_transaction_lines_list",
      "exact_reporting_balance_list",
      "exact_receivables_list",
      "exact_overdue_receivables",
      "exact_bank_entry_lines_list",
      "exact_items_list",
      "exact_vat_codes_list",
      "exact_documents_list",
      "exact_document_attachment_add",
    ]) {
      expect(tools).toContain(name);
    }
  });

  it("generates list, create and update for a writable resource", async () => {
    const tools = await register();
    expect(tools).toContain("exact_accounts_list");
    expect(tools).toContain("exact_accounts_create");
    expect(tools).toContain("exact_accounts_update");
  });

  it("folds reading one record into the list tool instead of a separate get", async () => {
    const tools = await register();
    expect(tools.filter((t) => t.endsWith("_get"))).toEqual([]);
  });

  it("offers a single generic delete rather than one per collection", async () => {
    const tools = await register();
    expect(tools).toContain("exact_record_delete");
    expect(tools.filter((t) => t.endsWith("_delete"))).toEqual(["exact_record_delete"]);
  });

  it("exposes read-only report resources without write tools", async () => {
    const tools = await register();
    expect(tools).toContain("exact_receivables_list");
    expect(tools).not.toContain("exact_receivables_create");
    expect(tools).not.toContain("exact_transaction_lines_create");
  });

  it("honours EXACT_TOOLS to restrict groups", async () => {
    process.env.EXACT_TOOLS = "reports";
    const tools = await register();
    expect(tools).toContain("exact_receivables_list");
    expect(tools).not.toContain("exact_accounts_list");
    expect(tools).not.toContain("exact_me");
  });

  it("drops every write tool when EXACT_READ_ONLY is set", async () => {
    process.env.EXACT_READ_ONLY = "true";
    const tools = await register();
    expect(tools).toContain("exact_accounts_list");
    expect(tools).not.toContain("exact_accounts_create");
    expect(tools).not.toContain("exact_accounts_update");
    expect(tools).not.toContain("exact_record_delete");
    expect(tools).not.toContain("exact_sales_invoice_print");
    expect(tools).not.toContain("exact_document_attachment_add");
  });

  it("registers no duplicate tool names", async () => {
    const tools = await register();
    expect(new Set(tools).size).toBe(tools.length);
  });
});
