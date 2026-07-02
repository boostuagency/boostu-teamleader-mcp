#!/usr/bin/env node
// Valideert de credentials: refresht 1x, test of rotatie optreedt, doet users.me,
// en schrijft (indien geroteerd) de nieuwe refresh token terug naar .env.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
function loadEnv() {
  const map = {};
  if (existsSync(".env")) for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}
const env = loadEnv();
const oldRefresh = env.TEAMLEADER_REFRESH_TOKEN;
const body = new URLSearchParams({
  client_id: env.TEAMLEADER_CLIENT_ID,
  client_secret: env.TEAMLEADER_CLIENT_SECRET,
  refresh_token: oldRefresh,
  grant_type: "refresh_token",
});
const r = await fetch("https://focus.teamleader.eu/oauth2/access_token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
});
const t = await r.text();
if (!r.ok) { console.error("REFRESH MISLUKT", r.status, t); process.exit(1); }
const data = JSON.parse(t);
const rotated = data.refresh_token && data.refresh_token !== oldRefresh;
console.log("refresh OK | geroteerd:", rotated ? "JA" : "nee");

// users.me
const me = await fetch("https://api.focus.teamleader.eu/users.me", {
  method: "POST",
  headers: { Authorization: "Bearer " + data.access_token, "Content-Type": "application/json" },
  body: "{}",
});
const meText = await me.text();
if (!me.ok) { console.error("users.me MISLUKT", me.status, meText); }
else {
  const u = JSON.parse(meText).data;
  console.log("users.me OK | account:", u.first_name, u.last_name, "| email:", u.email);
}

// rotatie wegschrijven
if (rotated) {
  const lines = readFileSync(".env", "utf8").split("\n")
    .filter(l => !l.startsWith("TEAMLEADER_REFRESH_TOKEN="));
  lines.push(`TEAMLEADER_REFRESH_TOKEN=${data.refresh_token}`);
  writeFileSync(".env", lines.filter(Boolean).join("\n") + "\n");
  console.log(".env bijgewerkt met geroteerde refresh token");
}
