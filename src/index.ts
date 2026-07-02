#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TeamleaderAuth } from "./api/auth.js";
import { TeamleaderClient } from "./api/client.js";
import { createServer } from "./server.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in your MCP configuration.`
    );
  }
  return value;
}

async function main(): Promise<void> {
  const auth = new TeamleaderAuth({
    clientId: getRequiredEnv("TEAMLEADER_CLIENT_ID"),
    clientSecret: getRequiredEnv("TEAMLEADER_CLIENT_SECRET"),
    refreshToken: getRequiredEnv("TEAMLEADER_REFRESH_TOKEN"),
  });
  const client = new TeamleaderClient(auth);
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
