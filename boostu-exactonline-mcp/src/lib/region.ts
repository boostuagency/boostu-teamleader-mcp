/**
 * Exact Online is deployed per country, and every region has its own hostname
 * for both OAuth and the REST API. A token issued on one region is not valid on
 * another, so the base URL is part of the credentials rather than a preference.
 */

export const REGIONS: Record<string, string> = {
  be: "https://start.exactonline.be",
  nl: "https://start.exactonline.nl",
  de: "https://start.exactonline.de",
  fr: "https://start.exactonline.fr",
  uk: "https://start.exactonline.co.uk",
  es: "https://start.exactonline.es",
  com: "https://start.exactonline.com",
  us: "https://start.exactonline.com",
};

export const DEFAULT_REGION = "be";

/**
 * Resolve the region base URL. `value` may be a region key ("nl") or a full
 * base URL ("https://start.exactonline.nl"); anything else falls back to the
 * default so the server still boots and can report the problem per tool call.
 */
export function resolveBaseUrl(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return REGIONS[DEFAULT_REGION];
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  const key = raw.toLowerCase();
  if (REGIONS[key]) return REGIONS[key];
  console.error(
    `[exactonline-mcp] Unknown region "${raw}". Use one of: ${Object.keys(REGIONS).join(", ")} ` +
      `or a full base URL. Falling back to ${REGIONS[DEFAULT_REGION]}.`
  );
  return REGIONS[DEFAULT_REGION];
}
