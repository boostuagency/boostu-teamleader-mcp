#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ExactAuth } from "./api/auth.js";
import { ExactClient } from "./api/client.js";
import { resolveBaseUrl } from "./lib/region.js";
import { createServer } from "./server.js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Do not throw: the server must still start and answer introspection
    // (initialize / tools/list) without credentials, so MCP clients and
    // directories can discover the tools. Tool calls fail with a clear auth
    // error until the variable is set.
    console.error(`[exactonline-mcp] ${name} is not set. Configure it before calling tools.`);
  }
  return value ?? "";
}

/** EXACT_DIVISION pins every call to one administration; unset resolves the user's current one. */
function parseDivision(): number | undefined {
  const raw = process.env.EXACT_DIVISION?.trim();
  if (!raw) return undefined;
  const division = Number(raw);
  if (!Number.isInteger(division) || division <= 0) {
    console.error(
      `[exactonline-mcp] EXACT_DIVISION="${raw}" is not a valid division code; ` +
        "falling back to the current division of the authorized user."
    );
    return undefined;
  }
  return division;
}

async function main(): Promise<void> {
  const auth = new ExactAuth({
    clientId: getEnv("EXACT_CLIENT_ID"),
    clientSecret: getEnv("EXACT_CLIENT_SECRET"),
    refreshToken: getEnv("EXACT_REFRESH_TOKEN"),
    baseUrl: resolveBaseUrl(process.env.EXACT_REGION ?? process.env.EXACT_BASE_URL),
  });
  const client = new ExactClient(auth, { division: parseDivision() });
  const server = createServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => { await server.close(); process.exit(0); });
  process.on("SIGTERM", async () => { await server.close(); process.exit(0); });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
