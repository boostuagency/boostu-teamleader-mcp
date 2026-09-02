/**
 * OData v3 query helpers for the Exact Online REST API.
 *
 * Exact speaks a subset of OData: $select, $filter, $top, $orderby, $expand,
 * $inlinecount and $skiptoken. Literals are typed — GUIDs and dates need their
 * own prefix — so filters are easy to get wrong by hand. The helpers here exist
 * so tools can build filters without re-deriving the quoting rules.
 */

/** Quote a string literal for a $filter, escaping embedded quotes. */
export function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Quote a GUID literal, e.g. guid'01234567-89ab-cdef-0123-456789abcdef'. */
export function odataGuid(value: string): string {
  const id = value.replace(/[{}]/g, "").trim();
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
    throw new Error(`Not a valid GUID: ${value}`);
  }
  return `guid'${id}'`;
}

/**
 * Quote a date literal. Accepts "2026-01-31" or a full ISO timestamp and
 * normalises to the datetime'...' form Exact expects.
 */
export function odataDate(value: string): string {
  const trimmed = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed.replace(/Z$/, "");
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error(`Not a valid date: ${value}`);
  }
  return `datetime'${iso}'`;
}

/** Build the entity-key segment, e.g. "crm/Accounts(guid'...')". */
export function keySegment(resource: string, key: string, type: "guid" | "string" | "number"): string {
  const literal =
    type === "guid" ? odataGuid(key) : type === "number" ? String(Number(key)) : odataString(key);
  if (type === "number" && !Number.isFinite(Number(key))) {
    throw new Error(`Not a valid numeric key: ${key}`);
  }
  return `${resource}(${literal})`;
}

export interface ODataQuery {
  select?: string;
  filter?: string;
  top?: number;
  orderby?: string;
  expand?: string;
  skiptoken?: string;
  /** Ask Exact to include the total match count in the response. */
  count?: boolean;
}

/** Turn a query description into the $-prefixed parameters Exact expects. */
export function buildQuery(q: ODataQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (q.select) params.$select = q.select;
  if (q.filter) params.$filter = q.filter;
  if (q.top !== undefined) params.$top = String(Math.max(1, Math.min(q.top, 1000)));
  if (q.orderby) params.$orderby = q.orderby;
  if (q.expand) params.$expand = q.expand;
  if (q.skiptoken) params.$skiptoken = q.skiptoken;
  if (q.count) params.$inlinecount = "allpages";
  return params;
}

/**
 * Pull the $skiptoken out of the absolute `__next` URL Exact returns.
 * Returns undefined when there is no further page.
 */
export function skiptokenFrom(next: string | undefined): string | undefined {
  if (!next) return undefined;
  const match = next.match(/[?&]\$skiptoken=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Join filter fragments with `and`, dropping the empty ones. */
export function andFilters(...parts: Array<string | undefined>): string | undefined {
  const kept = parts.filter((p): p is string => Boolean(p && p.trim()));
  return kept.length > 0 ? kept.join(" and ") : undefined;
}
