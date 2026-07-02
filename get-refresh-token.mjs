#!/usr/bin/env node
/**
 * Eenmalig OAuth2-hulpscript om een Teamleader Focus refresh token te verkrijgen.
 *
 * Gebruik:
 *   node get-refresh-token.mjs
 *
 * Leest TEAMLEADER_CLIENT_ID / TEAMLEADER_CLIENT_SECRET / REDIRECT_URI uit .env
 * (of uit de omgeving). Start een lokale callback-server, print de autorisatie-URL,
 * wisselt de teruggekregen `code` om voor tokens en schrijft de refresh token naar .env.
 */
import http from "node:http";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { URL } from "node:url";

// --- .env inladen (simpele parser, geen dependency) ---
function loadEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const CLIENT_ID = process.env.TEAMLEADER_CLIENT_ID;
const CLIENT_SECRET = process.env.TEAMLEADER_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.REDIRECT_URI || "http://localhost:8000/oauth/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("FOUT: TEAMLEADER_CLIENT_ID/SECRET ontbreken (.env).");
  process.exit(1);
}

const AUTHORIZE_URL = "https://focus.teamleader.eu/oauth2/authorize";
const TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";

const redirect = new URL(REDIRECT_URI);
const PORT = redirect.port || 80;
const CALLBACK_PATH = redirect.pathname;
const state = "edp-" + CLIENT_ID.slice(0, 8);

const authUrl =
  `${AUTHORIZE_URL}?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${encodeURIComponent(state)}`;

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  if (reqUrl.pathname !== CALLBACK_PATH) {
    res.writeHead(404).end("Niet gevonden");
    return;
  }
  const code = reqUrl.searchParams.get("code");
  const err = reqUrl.searchParams.get("error");
  if (err) {
    res.writeHead(400).end("OAuth-fout: " + err);
    console.error("\n❌ Teamleader gaf een fout terug:", err);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end("Geen code ontvangen");
    return;
  }
  console.log("\n✅ Autorisatiecode ontvangen, wissel om voor tokens...");
  try {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    });
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await r.text();
    if (!r.ok) {
      res.writeHead(500).end("Token-uitwisseling mislukt: " + text);
      console.error("\n❌ Token-uitwisseling mislukt:", r.status, text);
      server.close();
      process.exit(1);
    }
    const data = JSON.parse(text);
    appendFileSync(".env", `TEAMLEADER_REFRESH_TOKEN=${data.refresh_token}\n`);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h1>Gelukt ✅</h1><p>Refresh token verkregen en opgeslagen in .env. " +
        "Je kunt dit tabblad sluiten en terugkeren naar Claude Code.</p>"
    );
    console.log("\n✅ Refresh token verkregen en toegevoegd aan .env");
    console.log("   refresh_token (begin):", data.refresh_token.slice(0, 12) + "…");
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500).end("Fout: " + e.message);
    console.error(e);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\n=== Teamleader OAuth ===");
  console.log("Callback-server luistert op:", REDIRECT_URI);
  console.log("\n👉 Open deze URL in je browser en log in / geef toestemming:\n");
  console.log(authUrl + "\n");
  console.log("(Wachten op de redirect met de autorisatiecode...)");
});
