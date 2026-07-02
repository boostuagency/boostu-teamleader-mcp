#!/usr/bin/env node
// Minimale MCP stdio-client: start de server, doet initialize, lijst tools,
// en roept teamleader_list_companies (page size 1) aan.
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const env = { ...process.env };
if (existsSync(".env")) for (const l of readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
env.TEAMLEADER_TOKEN_STORE = process.cwd() + "/.teamleader-token";

const srv = spawn("node", ["dist/index.js"], { env, stdio: ["pipe", "pipe", "inherit"] });
let buf = "";
const pending = new Map();
srv.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});
let id = 0;
const send = (method, params) => new Promise((res) => {
  const myId = ++id;
  pending.set(myId, res);
  srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
});
const notify = (method, params) =>
  srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");

const init = await send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "edp-test", version: "1.0.0" },
});
console.log("initialize OK | server:", init.result?.serverInfo?.name);
notify("notifications/initialized", {});

const tools = await send("tools/list", {});
console.log("tools:", tools.result.tools.length, "->",
  tools.result.tools.map((t) => t.name).join(", "));

const call = await send("tools/call", {
  name: "teamleader_list_companies",
  arguments: { page_size: 1 },
});
const content = call.result?.content?.[0]?.text || JSON.stringify(call.error);
console.log("\nlist_companies resultaat (eerste 400 tekens):\n", content.slice(0, 400));

srv.kill();
process.exit(0);
