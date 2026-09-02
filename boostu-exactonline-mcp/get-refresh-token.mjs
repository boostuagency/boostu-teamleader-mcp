#!/usr/bin/env node
/**
 * Eenmalig OAuth2-hulpscript om een Exact Online refresh token te verkrijgen.
 *
 * Gebruik:
 *   node get-refresh-token.mjs
 *
 * Leest EXACT_CLIENT_ID / EXACT_CLIENT_SECRET / EXACT_REGION / REDIRECT_URI uit
 * .env (of uit de omgeving). Start een lokale callback-server, print de
 * autorisatie-URL, wisselt de teruggekregen `code` om voor tokens en schrijft de
 * refresh token naar .env.
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

const REGIONS = {
  be: "https://start.exactonline.be",
  nl: "https://start.exactonline.nl",
  de: "https://start.exactonline.de",
  fr: "https://start.exactonline.fr",
  uk: "https://start.exactonline.co.uk",
  es: "https://start.exactonline.es",
  com: "https://start.exactonline.com",
  us: "https://start.exactonline.com",
};

const CLIENT_ID = process.env.EXACT_CLIENT_ID;
const CLIENT_SECRET = process.env.EXACT_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:8000/oauth/callback";
const regionRaw = (process.env.EXACT_REGION || process.env.EXACT_BASE_URL || "be").trim();
const BASE = /^https?:\/\//i.test(regionRaw)
  ? regionRaw.replace(/\/+$/, "")
  : REGIONS[regionRaw.toLowerCase()] || REGIONS.be;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("FOUT: EXACT_CLIENT_ID/EXACT_CLIENT_SECRET ontbreken (.env).");
  process.exit(1);
}

const AUTHORIZE_URL = `${BASE}/api/oauth2/auth`;
const TOKEN_URL = `${BASE}/api/oauth2/token`;

const redirect = new URL(REDIRECT_URI);
const PORT = redirect.port || 80;
const CALLBACK_PATH = redirect.pathname;

const authUrl =
  `${AUTHORIZE_URL}?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&force_login=0`;

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
    console.error("\n❌ Exact Online gaf een fout terug:", err);
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    const text = await r.text();
    if (!r.ok) {
      res.writeHead(500).end("Token-uitwisseling mislukt: " + text);
      console.error("\n❌ Token-uitwisseling mislukt:", r.status, text);
      console.error(
        "   Controleer of de Redirect URI in het Exact App Center exact gelijk is aan:",
        REDIRECT_URI
      );
      server.close();
      process.exit(1);
    }
    const data = JSON.parse(text);
    appendFileSync(".env", `EXACT_REFRESH_TOKEN=${data.refresh_token}\n`);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h1>Gelukt ✅</h1><p>Refresh token verkregen en opgeslagen in .env. " +
        "Je kunt dit tabblad sluiten.</p>"
    );
    console.log("\n✅ Refresh token verkregen en toegevoegd aan .env");
    console.log("   refresh_token (begin):", String(data.refresh_token).slice(0, 12) + "…");
    console.log("   access_token geldig (s):", data.expires_in);
    console.log(
      "\n⚠️  Exact roteert de refresh token bij elke vernieuwing. Zet EXACT_TOKEN_STORE=.exact-token " +
        "zodat de rotatie bewaard blijft."
    );
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
  console.log("\n=== Exact Online OAuth ===");
  console.log("Regio:", BASE);
  console.log("Callback-server luistert op:", REDIRECT_URI);
  console.log("\n👉 Open deze URL in je browser en log in / geef toestemming:\n");
  console.log(authUrl + "\n");
  console.log("(Wachten op de redirect met de autorisatiecode...)");
});
