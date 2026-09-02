#!/usr/bin/env node
// Valideert de credentials: refresht 1x, controleert of rotatie optreedt, haalt
// current/Me en de divisies op, en schrijft de geroteerde refresh token terug
// naar .env. Draai dit voor je de MCP-server in een client hangt.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const REGIONS = {
  be: "https://start.exactonline.be",
  nl: "https://start.exactonline.nl",
  de: "https://start.exactonline.de",
  fr: "https://start.exactonline.fr",
  uk: "https://start.exactonline.co.uk",
  es: "https://start.exactonline.es",
  com: "https://start.exactonline.com",
};

function loadEnv() {
  const map = {};
  if (existsSync(".env")) for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}
const env = loadEnv();
const regionRaw = (env.EXACT_REGION || "be").trim().toLowerCase();
const BASE = REGIONS[regionRaw] || REGIONS.be;
const oldRefresh = env.EXACT_REFRESH_TOKEN;

if (!env.EXACT_CLIENT_ID || !env.EXACT_CLIENT_SECRET || !oldRefresh) {
  console.error("FOUT: EXACT_CLIENT_ID / EXACT_CLIENT_SECRET / EXACT_REFRESH_TOKEN ontbreken in .env");
  process.exit(1);
}

const body = new URLSearchParams({
  client_id: env.EXACT_CLIENT_ID,
  client_secret: env.EXACT_CLIENT_SECRET,
  refresh_token: oldRefresh,
  grant_type: "refresh_token",
});
const r = await fetch(`${BASE}/api/oauth2/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
  body: body.toString(),
});
const t = await r.text();
if (!r.ok) { console.error("REFRESH MISLUKT", r.status, t); process.exit(1); }
const data = JSON.parse(t);
const rotated = data.refresh_token && data.refresh_token !== oldRefresh;
console.log("regio:", BASE);
console.log("refresh OK | geroteerd:", rotated ? "JA" : "nee", "| access_token geldig (s):", data.expires_in);

const authed = (path) =>
  fetch(`${BASE}/api/v1/${path}`, {
    headers: { Authorization: "Bearer " + data.access_token, Accept: "application/json" },
  });

// current/Me
const me = await authed("current/Me?$select=UserID,FullName,Email,CurrentDivision");
const meText = await me.text();
let division;
if (!me.ok) {
  console.error("current/Me MISLUKT", me.status, meText);
} else {
  const u = JSON.parse(meText).d.results[0];
  division = u.CurrentDivision;
  console.log("current/Me OK | gebruiker:", u.FullName, "| e-mail:", u.Email, "| divisie:", division);
  console.log("rate limit (dag):", me.headers.get("X-RateLimit-Remaining"), "/", me.headers.get("X-RateLimit-Limit"));
}

// Divisies waar deze login bij kan
if (division) {
  const div = await authed(`${division}/system/Divisions?$select=Code,Description,Country&$top=25`);
  const divText = await div.text();
  if (!div.ok) {
    console.error("system/Divisions MISLUKT", div.status, divText);
  } else {
    const rows = JSON.parse(divText).d.results;
    console.log(`divisies (${rows.length}):`);
    for (const d of rows) console.log("  -", d.Code, d.Description, `(${d.Country})`);
  }
}

// rotatie wegschrijven
if (rotated) {
  const lines = readFileSync(".env", "utf8").split("\n")
    .filter(l => !l.startsWith("EXACT_REFRESH_TOKEN="));
  lines.push(`EXACT_REFRESH_TOKEN=${data.refresh_token}`);
  writeFileSync(".env", lines.filter(Boolean).join("\n") + "\n");
  console.log(".env bijgewerkt met geroteerde refresh token");
}
