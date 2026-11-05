import { describe, it, expect, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "../src/api/client.js";
import { registerCompanyTools } from "../src/tools/companies.js";
import { registerContactTools } from "../src/tools/contacts.js";
import { registerDealTools } from "../src/tools/deals.js";
import { registerQuotationTools } from "../src/tools/quotations.js";

type Handler = (params: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;

const handlers = new Map<string, Handler>();
const requests: { endpoint: string; body?: Record<string, unknown> }[] = [];
let responses: Record<string, unknown> = {};

const server = {
  tool(name: string, _description: string, _schema: unknown, handler: Handler) {
    handlers.set(name, handler);
  },
} as unknown as McpServer;

const client = {
  async request(options: { endpoint: string; body?: Record<string, unknown> }) {
    requests.push(options);
    return responses[options.endpoint] ?? {};
  },
} as unknown as TeamleaderClient;

registerCompanyTools(server, client);
registerContactTools(server, client);
registerDealTools(server, client);
registerQuotationTools(server, client);

beforeEach(() => {
  requests.length = 0;
  responses = {};
});

const call = (tool: string, params: Record<string, unknown>) => handlers.get(tool)!(params);

describe("teamleader_update_company", () => {
  it("sends only the fields passed, with addresses in the companies.update shape", async () => {
    const res = await call("teamleader_update_company", {
      id: "c1",
      vat_number: "BE0123456789",
      language: "nl",
      price_list_id: "pl1",
      marketing_mails_consent: true,
      addresses: [{ type: "invoicing", line_1: "Dorpsstraat 1", postal_code: "8670", city: "Koksijde", country: "BE" }],
    });
    expect(res.isError).toBeUndefined();
    expect(requests).toEqual([{
      endpoint: "companies.update",
      body: {
        id: "c1",
        vat_number: "BE0123456789",
        language: "nl",
        price_list_id: "pl1",
        marketing_mails_consent: true,
        addresses: [{ type: "invoicing", address: { line_1: "Dorpsstraat 1", postal_code: "8670", city: "Koksijde", country: "BE" } }],
      },
    }]);
  });

  it("refuses an update without fields", async () => {
    const res = await call("teamleader_update_company", { id: "c1" });
    expect(res.isError).toBe(true);
    expect(requests).toEqual([]);
  });
});

describe("teamleader_update_contact", () => {
  it("sets marketing consent and the price list", async () => {
    await call("teamleader_update_contact", { id: "p1", marketing_mails_consent: false, price_list_id: null });
    expect(requests[0]).toEqual({ endpoint: "contacts.update", body: { id: "p1", marketing_mails_consent: false, price_list_id: null } });
  });
});

describe("teamleader_update_deal", () => {
  it("links a contact person and keeps the current customer", async () => {
    responses["deals.info"] = { data: { lead: { customer: { type: "company", id: "co1" } } } };
    await call("teamleader_update_deal", { id: "d1", contact_person_id: "p1" });
    expect(requests.map((r) => r.endpoint)).toEqual(["deals.info", "deals.update"]);
    expect(requests[1].body).toEqual({ id: "d1", lead: { customer: { type: "company", id: "co1" }, contact_person_id: "p1" } });
  });

  it("changes the customer without a lookup when it is given", async () => {
    await call("teamleader_update_deal", { id: "d1", customer_type: "company", customer_id: "co2", contact_person_id: "p2" });
    expect(requests.map((r) => r.endpoint)).toEqual(["deals.update"]);
    expect(requests[0].body).toEqual({ id: "d1", lead: { customer: { type: "company", id: "co2" }, contact_person_id: "p2" } });
  });
});

describe("teamleader_quotations_list", () => {
  it("filters on the deal's quotation ids, because quotations.list has no deal filter", async () => {
    responses["deals.info"] = { data: { quotations: [{ id: "q1", type: "quotation" }, { id: "q2", type: "quotation" }] } };
    await call("teamleader_quotations_list", { deal_id: "d1" });
    expect(requests.map((r) => r.endpoint)).toEqual(["deals.info", "quotations.list"]);
    expect((requests[1].body as { filter: unknown }).filter).toEqual({ ids: ["q1", "q2"] });
  });

  it("returns an empty list for a deal without quotations", async () => {
    responses["deals.info"] = { data: { quotations: [] } };
    const res = await call("teamleader_quotations_list", { deal_id: "d1" });
    expect(JSON.parse(res.content[0].text)).toEqual({ data: [] });
    expect(requests.map((r) => r.endpoint)).toEqual(["deals.info"]);
  });
});
