import { describe, it, expect, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "../src/api/client.js";
import { registerQuotationTools } from "../src/tools/quotations.js";

type Handler = (params: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;

const handlers = new Map<string, Handler>();
const requests: { endpoint: string; body?: Record<string, unknown> }[] = [];
let infoResponse: unknown = {};

const server = {
  tool(name: string, _description: string, _schema: unknown, handler: Handler) {
    handlers.set(name, handler);
  },
} as unknown as McpServer;

const client = {
  async request(options: { endpoint: string; body?: Record<string, unknown> }) {
    requests.push(options);
    return options.endpoint === "quotations.info" ? infoResponse : {};
  },
} as unknown as TeamleaderClient;

registerQuotationTools(server, client);

beforeEach(() => {
  requests.length = 0;
  infoResponse = {};
});

async function call(tool: string, params: Record<string, unknown>) {
  const handler = handlers.get(tool);
  if (!handler) throw new Error(`tool ${tool} is not registered`);
  return handler(params);
}

const line = { quantity: 1, description: "Consulting", unit_price_amount: 100, unit_price_currency: "EUR", tax_rate_id: "t1" };

describe("teamleader_quotations_update", () => {
  it("moves the expiry date and keeps the quotation's current action", async () => {
    infoResponse = { data: { expiry: { expires_after: "2026-09-01", action_after_expiry: "lock" } } };

    const res = await call("teamleader_quotations_update", { id: "q1", expiry_date: "2026-10-15" });

    expect(res.isError).toBeUndefined();
    expect(requests.map((r) => r.endpoint)).toEqual(["quotations.info", "quotations.update"]);
    expect(requests[0].body).toEqual({ id: "q1", includes: "expiry" });
    expect(requests[1].body).toEqual({
      id: "q1",
      expiry: { expires_after: "2026-10-15", action_after_expiry: "lock" },
    });
    expect(JSON.parse(res.content[0].text)).toEqual({ success: true, id: "q1", updated: ["expiry"] });
  });

  it("falls back to 'none' when the quotation has no expiry yet", async () => {
    infoResponse = { data: {} };

    await call("teamleader_quotations_update", { id: "q1", expiry_date: "2026-10-15" });

    expect(requests[1].body).toEqual({
      id: "q1",
      expiry: { expires_after: "2026-10-15", action_after_expiry: "none" },
    });
  });

  it("keeps the current date when only the action changes", async () => {
    infoResponse = { data: { expiry: { expires_after: "2026-09-01", action_after_expiry: "none" } } };

    await call("teamleader_quotations_update", { id: "q1", action_after_expiry: "lock" });

    expect(requests[1].body).toEqual({
      id: "q1",
      expiry: { expires_after: "2026-09-01", action_after_expiry: "lock" },
    });
  });

  it("does not read the quotation back when both expiry halves are given", async () => {
    await call("teamleader_quotations_update", {
      id: "q1",
      expiry_date: "2026-10-15",
      action_after_expiry: "none",
      line_items: [line],
      text: "Geldig tot 15 oktober",
      name: "Webdevelopment",
    });

    expect(requests.map((r) => r.endpoint)).toEqual(["quotations.update"]);
    expect(requests[0].body).toMatchObject({
      id: "q1",
      expiry: { expires_after: "2026-10-15", action_after_expiry: "none" },
      text: "Geldig tot 15 oktober",
      name: "Webdevelopment",
    });
    expect((requests[0].body as { grouped_lines: unknown[] }).grouped_lines).toHaveLength(1);
  });

  it("still updates line items on their own, without touching expiry", async () => {
    await call("teamleader_quotations_update", { id: "q1", line_items: [line] });

    expect(requests).toHaveLength(1);
    expect(requests[0].body).not.toHaveProperty("expiry");
    expect(requests[0].body).toHaveProperty("grouped_lines");
  });

  it("refuses an update that changes nothing", async () => {
    const res = await call("teamleader_quotations_update", { id: "q1" });

    expect(res.isError).toBe(true);
    expect(requests).toHaveLength(0);
  });
});

describe("teamleader_quotations_send", () => {
  const base = {
    id: "q1",
    recipients_to: ["klant@example.com"],
    subject: "Herinnering: offerte 2026-042",
    content: "Beste, uw offerte vervalt binnenkort. Bekijk ze hier: #LINK",
    language: "nl",
  };

  it("sends the payload shape quotations.send expects", async () => {
    const res = await call("teamleader_quotations_send", base);

    expect(res.isError).toBeUndefined();
    expect(requests[0].endpoint).toBe("quotations.send");
    expect(requests[0].body).toEqual({
      quotations: ["q1"],
      recipients: { to: [{ email_address: "klant@example.com" }] },
      subject: base.subject,
      content: base.content,
      language: "nl",
    });
    expect(JSON.parse(res.content[0].text)).toEqual({ success: true, id: "q1", status: "sent" });
  });

  it("forwards cc, bcc, sender and attachments when given", async () => {
    await call("teamleader_quotations_send", {
      ...base,
      recipients_cc: ["cc@example.com"],
      recipients_bcc: ["bcc@example.com"],
      from_sender_type: "user",
      from_sender_id: "u1",
      from_email_address: "offers@example.com",
      attachment_file_ids: ["f1", "f2"],
    });

    expect(requests[0].body).toMatchObject({
      recipients: {
        to: [{ email_address: "klant@example.com" }],
        cc: [{ email_address: "cc@example.com" }],
        bcc: [{ email_address: "bcc@example.com" }],
      },
      from: { sender: { type: "user", id: "u1" }, email_address: "offers@example.com" },
      attachments: ["f1", "f2"],
    });
  });

  it("refuses a half-specified sender before calling the API", async () => {
    const res = await call("teamleader_quotations_send", { ...base, from_sender_id: "u1" });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("from_sender_type");
    expect(requests).toHaveLength(0);
  });

  it("warns when the message carries no #LINK", async () => {
    const res = await call("teamleader_quotations_send", { ...base, content: "Zonder link" });

    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text).warning).toMatch(/#LINK/);
  });
});

describe("teamleader_quotations_create", () => {
  it("forwards expiry with a default action and free text", async () => {
    await call("teamleader_quotations_create", {
      deal_id: "d1",
      line_items: [line],
      text: "Bedankt voor uw vertrouwen",
      expiry_date: "2026-12-31",
    });

    expect(requests[0].endpoint).toBe("quotations.create");
    expect(requests[0].body).toMatchObject({
      deal_id: "d1",
      text: "Bedankt voor uw vertrouwen",
      expiry: { expires_after: "2026-12-31", action_after_expiry: "none" },
    });
  });

  it("accepts a text-only quotation but not an empty one", async () => {
    const ok = await call("teamleader_quotations_create", { deal_id: "d1", text: "Alleen tekst" });
    expect(ok.isError).toBeUndefined();
    expect(requests[0].body).toEqual({ deal_id: "d1", text: "Alleen tekst" });

    const empty = await call("teamleader_quotations_create", { deal_id: "d1" });
    expect(empty.isError).toBe(true);
    expect(requests).toHaveLength(1);
  });
});

describe("teamleader_quotations_info", () => {
  it("asks for the expiry only when requested", async () => {
    await call("teamleader_quotations_info", { id: "q1" });
    await call("teamleader_quotations_info", { id: "q1", include_expiry: true });

    expect(requests[0].body).toEqual({ id: "q1" });
    expect(requests[1].body).toEqual({ id: "q1", includes: "expiry" });
  });
});
