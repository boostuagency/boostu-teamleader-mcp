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
const CLIENT_ID = process.env.TEAMLEADER_CLIENT_ID;
const CLIENT_SECRET = process.env.TEAMLEADER_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:8000/oauth/callback";
const code = process.env.AUTH_CODE;
if (!code) { console.error("Geen AUTH_CODE"); process.exit(1); }

const body = new URLSearchParams({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code,
  grant_type: "authorization_code",
  redirect_uri: REDIRECT_URI,
});
const r = await fetch("https://focus.teamleader.eu/oauth2/access_token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
});
const text = await r.text();
if (!r.ok) { console.error("MISLUKT", r.status, text); process.exit(1); }
const data = JSON.parse(text);
appendFileSync(".env", `TEAMLEADER_REFRESH_TOKEN=${data.refresh_token}\n`);
console.log("OK refresh_token opgeslagen. begin:", data.refresh_token.slice(0, 10) + "…",
  "| access_token geldig (s):", data.expires_in);
