#!/usr/bin/env node
// Wisselt een handmatig geplakte authorization code om voor tokens.
// Code via env AUTH_CODE. Leest creds uit .env.
import { readFileSync, appendFileSync, existsSync } from "node:fs";
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const REGIONS = {
  be: "https://start.exactonline.be",
  nl: "https://start.exactonline.nl",
  de: "https://start.exactonline.de",
  fr: "https://start.exactonline.fr",
  uk: "https://start.exactonline.co.uk",
  es: "https://start.exactonline.es",
  com: "https://start.exactonline.com",
};
const regionRaw = (process.env.EXACT_REGION || "be").trim().toLowerCase();
const BASE = REGIONS[regionRaw] || REGIONS.be;
const CLIENT_ID = process.env.EXACT_CLIENT_ID;
const CLIENT_SECRET = process.env.EXACT_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:8000/oauth/callback";
const code = process.env.AUTH_CODE;
if (!code) { console.error("Geen AUTH_CODE"); process.exit(1); }

// Exact levert de code URL-gecodeerd terug; plak hem gedecodeerd, of laat dit hem decoderen.
const decoded = /%[0-9A-Fa-f]{2}/.test(code) ? decodeURIComponent(code) : code;

const body = new URLSearchParams({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: decoded,
  grant_type: "authorization_code",
  redirect_uri: REDIRECT_URI,
});
const r = await fetch(`${BASE}/api/oauth2/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
  body: body.toString(),
});
const text = await r.text();
if (!r.ok) { console.error("MISLUKT", r.status, text); process.exit(1); }
const data = JSON.parse(text);
appendFileSync(".env", `EXACT_REFRESH_TOKEN=${data.refresh_token}\n`);
console.log("OK refresh_token opgeslagen. begin:", String(data.refresh_token).slice(0, 10) + "…",
  "| access_token geldig (s):", data.expires_in);
