/**
 * Account, division and connection tools.
 *
 * These answer "who am I connected as, which administration am I in, and what
 * is this licence allowed to do" — the questions every other group depends on,
 * because almost every Exact resource is scoped to a division.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExactClient } from "../api/client.js";
import type { ODataCollection, Me } from "../types/index.js";
import { respond, respondError } from "../lib/respond.js";
import { isReadOnly, registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "divisions",
    resource: "system/Divisions",
    label: "the divisions (administrations) this login can open",
    key: "Code",
    keyType: "number",
    ops: ["list"],
    defaultSelect: "Code,Description,Country,Currency,HID,Main,BlockingStatus",
    filterHint: "Each division is one company's bookkeeping. Use the Code as the 'division' argument on other tools.",
  },
  {
    name: "all_divisions",
    resource: "system/AllDivisions",
    label: "every division in the customer account, including ones without access",
    key: "Code",
    keyType: "number",
    ops: ["list"],
    defaultSelect: "Code,Description,Country,Currency,HID,Main",
  },
  {
    name: "available_features",
    keyed: false,
    resource: "system/AvailableFeatures",
    label: "the features the current licence includes",
    ops: ["list"],
    filterHint: "Use this to check whether a module (projects, manufacturing, payroll) is licensed before calling it.",
  },
  {
    name: "user_roles",
    resource: "users/UserRoles",
    label: "user roles and their permissions",
    ops: ["list"],
  },
  {
    name: "accountant_info",
    keyed: false,
    resource: "system/AccountantInfo",
    label: "the accountancy firm linked to this administration",
    ops: ["list"],
  },
];

export function registerSystemTools(server: McpServer, client: ExactClient): void {
  server.tool(
    "exact_me",
    "Show the authenticated Exact Online user and the division (administration) the connection " +
      "defaults to. Call this first when you do not know which company's books you are looking at.",
    {},
    async () => {
      try {
        const res = await client.request<ODataCollection<Me>>({
          resource: "current/Me",
          divisionless: true,
          params: {
            $select: "UserID,FullName,Email,Language,CurrentDivision,ServerTime,ThreadId",
          },
        });
        const me = res.d?.results?.[0];
        if (!me) return respondError("Exact Online returned no user for current/Me.");
        return respond({
          ...me,
          default_division: await client.currentDivision(),
        });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "exact_rate_limit_status",
    "Report the Exact Online rate-limit counters from the most recent API call. Exact allows a " +
      "limited number of calls per minute and per day for each app and company combination; check " +
      "this before starting a long series of calls.",
    {},
    async () => {
      const snapshot = client.rateLimit;
      if (Object.values(snapshot).every((v) => v === undefined)) {
        return respond({
          note: "No Exact Online call has been made yet in this session, so no counters are known.",
        });
      }
      return respond({
        daily: {
          limit: snapshot.limit,
          remaining: snapshot.remaining,
          resets_at: snapshot.reset ? new Date(snapshot.reset).toISOString() : undefined,
        },
        minutely: {
          limit: snapshot.minutelyLimit,
          remaining: snapshot.minutelyRemaining,
          resets_at: snapshot.minutelyReset
            ? new Date(snapshot.minutelyReset).toISOString()
            : undefined,
        },
      });
    }
  );

  server.tool(
    "exact_request",
    "Escape hatch: call any Exact Online REST endpoint that has no dedicated tool. Give the " +
      "resource path below the division, e.g. 'manufacturing/ShopOrders' or 'hrm/Employees'. " +
      "Prefer the dedicated tools when one exists — they set sensible defaults and page for you.",
    {
      resource: z
        .string()
        .describe("Resource path below the division, e.g. \"logistics/ItemGroups\". No leading slash."),
      method: z
        .enum(["GET", "POST", "PUT", "DELETE"])
        .optional()
        .describe("HTTP method (default GET)"),
      params: z
        .record(z.string())
        .optional()
        .describe("Query parameters including the $ prefix, e.g. { \"$select\": \"ID,Name\", \"$top\": \"10\" }"),
      body: z.record(z.unknown()).optional().describe("JSON body for POST and PUT"),
      divisionless: z
        .boolean()
        .optional()
        .describe("Set true for the few paths outside a division, such as \"current/Me\""),
      division: z
        .number()
        .int()
        .optional()
        .describe("Division code. Defaults to the current division."),
    },
    async (p) => {
      try {
        const method = p.method ?? "GET";
        if (method !== "GET" && isReadOnly()) {
          return respondError(
            `EXACT_READ_ONLY is enabled, so ${method} requests are refused. ` +
              "Unset it to allow writes."
          );
        }
        return respond(
          await client.request({
            resource: p.resource.replace(/^\/+/, ""),
            method,
            params: p.params,
            body: p.body,
            divisionless: p.divisionless,
            division: p.division,
          })
        );
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  if (!isReadOnly()) {
    server.tool(
      "exact_record_delete",
      "Permanently delete one record from Exact Online. This cannot be undone and, for accounting " +
        "records, may be refused by Exact once an entry has been processed. Give the same resource " +
        "path the record's list tool names, for example \"crm/Contacts\" or \"logistics/Items\". " +
        "Confirm with the user before calling this.",
      {
        resource: z
          .string()
          .describe("Resource path below the division, e.g. \"crm/Contacts\". No leading slash."),
        id: z.string().describe("Primary key of the record to delete"),
        key_type: z
          .enum(["guid", "string", "number"])
          .optional()
          .describe(
            "Type of the primary key. Detected from the id when omitted: a GUID-shaped id is a guid, " +
              "a digits-only id a number, anything else a string."
          ),
        division: z
          .number()
          .int()
          .optional()
          .describe("Division code. Defaults to the current division."),
      },
      async (p) => {
        try {
          const keyType = p.key_type ?? detectKeyType(p.id);
          const resource = p.resource.replace(/^\/+/, "");
          await client.remove(resource, p.id, keyType, p.division);
          return respond({ deleted: true, resource, id: p.id, key_type: keyType });
        } catch (e) {
          return respondError((e as Error).message);
        }
      }
    );
  }

  registerResources(server, client, RESOURCES);
}

/** Infer the OData literal type of a primary key from its shape. */
function detectKeyType(id: string): "guid" | "string" | "number" {
  const trimmed = id.replace(/[{}]/g, "").trim();
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
    return "guid";
  }
  if (/^\d+$/.test(trimmed)) return "number";
  return "string";
}
