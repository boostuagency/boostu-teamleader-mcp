/**
 * Tool factory for Exact Online OData resources.
 *
 * Exact exposes a few hundred near-identical collections: every one of them
 * lists with the same $-parameters, reads by primary key, and writes a flat
 * property bag. Hand-writing tools per collection would bury the handful of
 * endpoints that genuinely need custom shaping, so resources are declared as
 * data and their tools are generated from it.
 *
 * Two deliberate reductions keep the tool surface small enough for an assistant
 * to hold in context:
 *  - reading one record is the list tool with an `id`, not a separate tool;
 *  - deleting is a single generic tool (see exact_record_delete), not one per
 *    collection. Both would otherwise double the tool count for little gain.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExactClient } from "../api/client.js";
import { respond, respondError } from "./respond.js";

export type KeyType = "guid" | "string" | "number";
export type ResourceOp = "list" | "create" | "update";

export interface ResourceDef {
  /** Tool-name segment: `exact_<name>_list`, `exact_<name>_create`, ... */
  name: string;
  /** OData resource path below the division, e.g. "crm/Accounts". */
  resource: string;
  /** Plain-language description of what the collection holds. */
  label: string;
  /** Primary key property (default "ID"). */
  key?: string;
  /** Literal type of the primary key (default "guid"). */
  keyType?: KeyType;
  /**
   * False for aggregated report endpoints that have no addressable key, so the
   * list tool does not offer to fetch one record by id.
   */
  keyed?: boolean;
  /** Operations to expose. */
  ops: ResourceOp[];
  /** Records here can be removed with exact_record_delete. */
  deletable?: boolean;
  /**
   * Columns returned when the caller passes no `select`. Exact returns every
   * property otherwise, which is both slow and enough to flood an assistant's
   * context, so every resource declares a useful subset.
   */
  defaultSelect?: string;
  /** Named in the create/update descriptions so the model knows what to send. */
  commonFields?: string;
  /** Appended to the list description: useful filter properties and gotchas. */
  filterHint?: string;
}

/** Default page size. Exact caps normal endpoints at 60 records per page. */
const DEFAULT_TOP = 60;

const divisionParam = z
  .number()
  .int()
  .optional()
  .describe("Division (administration) code. Defaults to the current division.");

/** True when write tools must not be registered at all. */
export function isReadOnly(env: string | undefined = process.env.EXACT_READ_ONLY): boolean {
  return /^(1|true|yes|on)$/i.test((env ?? "").trim());
}

export function registerResource(server: McpServer, client: ExactClient, def: ResourceDef): void {
  const key = def.key ?? "ID";
  const keyType = def.keyType ?? "guid";
  const keyed = def.keyed !== false;
  const readOnly = isReadOnly();
  const ops = readOnly ? def.ops.filter((op) => op === "list") : def.ops;

  if (ops.includes("list")) {
    server.tool(
      `exact_${def.name}_list`,
      `List ${def.label} from Exact Online (${def.resource}). ` +
        (keyed
          ? `Pass 'id' to fetch one record by its ${key} with all properties instead. `
          : "") +
        "Results are paged; when the response carries next_skiptoken, pass it back as 'skiptoken' " +
        "for the next page." +
        (def.filterHint ? ` ${def.filterHint}` : ""),
      {
        ...(keyed
          ? {
              id: z
                .string()
                .optional()
                .describe(`Fetch this single record by its ${key} instead of listing`),
            }
          : {}),
        filter: z
          .string()
          .optional()
          .describe(
            "OData $filter expression. String literals use single quotes ('Acme'), GUIDs use " +
              "guid'...', dates use datetime'2026-01-31'. Example: \"Status eq 'C' and " +
              "InvoiceDate gt datetime'2026-01-01'\""
          ),
        select: z
          .string()
          .optional()
          .describe(
            `Comma-separated properties to return. Defaults to: ${def.defaultSelect ?? "all properties"}`
          ),
        top: z
          .number()
          .int()
          .optional()
          .describe(`Maximum records to return (default ${DEFAULT_TOP}; Exact pages at 60 for most endpoints)`),
        orderby: z.string().optional().describe("OData $orderby, e.g. \"InvoiceDate desc\""),
        expand: z
          .string()
          .optional()
          .describe("Related collections to inline, e.g. \"SalesInvoiceLines\". Use sparingly, responses grow fast."),
        skiptoken: z.string().optional().describe("Paging token from a previous response's next_skiptoken"),
        count: z.boolean().optional().describe("Include the total number of matches in the response"),
        division: divisionParam,
      },
      async (p) => {
        try {
          const id = (p as { id?: string }).id;
          if (id) {
            return respond(await client.get(def.resource, id, keyType, p.select, p.division));
          }
          return respond(
            await client.list(
              def.resource,
              {
                filter: p.filter,
                select: p.select ?? def.defaultSelect,
                top: p.top ?? DEFAULT_TOP,
                orderby: p.orderby,
                expand: p.expand,
                skiptoken: p.skiptoken,
                count: p.count,
              },
              p.division
            )
          );
        } catch (e) {
          return respondError((e as Error).message);
        }
      }
    );
  }

  if (ops.includes("create")) {
    server.tool(
      `exact_${def.name}_create`,
      `Create a record in ${def.label} (${def.resource}). ` +
        (def.commonFields ? `Common fields: ${def.commonFields}.` : "") +
        " Pass the Exact property names exactly as documented.",
      {
        fields: z
          .record(z.unknown())
          .describe("Object of Exact property names and values, e.g. { \"Name\": \"Acme BV\", \"Status\": \"C\" }"),
        division: divisionParam,
      },
      async (p) => {
        try {
          return respond(await client.create(def.resource, p.fields, p.division));
        } catch (e) {
          return respondError((e as Error).message);
        }
      }
    );
  }

  if (ops.includes("update")) {
    server.tool(
      `exact_${def.name}_update`,
      `Update a record in ${def.label} (${def.resource}). Send only the properties that change. ` +
        (def.commonFields ? `Common fields: ${def.commonFields}.` : ""),
      {
        id: z.string().describe(`The ${key} of the record to update`),
        fields: z.record(z.unknown()).describe("Object of Exact property names and their new values"),
        division: divisionParam,
      },
      async (p) => {
        try {
          await client.update(def.resource, p.id, keyType, p.fields, p.division);
          return respond({ updated: true, resource: def.resource, [key]: p.id });
        } catch (e) {
          return respondError((e as Error).message);
        }
      }
    );
  }
}

export function registerResources(
  server: McpServer,
  client: ExactClient,
  defs: ResourceDef[]
): void {
  for (const def of defs) registerResource(server, client, def);
}
