# Contributing to BoostU Teamleader MCP

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Development setup

```bash
git clone https://github.com/boostuagency/boostu-teamleader-mcp.git
cd boostu-teamleader-mcp
npm install
```

Run the server in development mode (TypeScript is executed directly via `tsx`, no build required):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Before submitting a pull request

Run both of these and fix any failures before opening a PR:

```bash
npm test          # vitest unit tests
npm run typecheck # TypeScript type checking (tsc --noEmit)
```

All tests must pass and there must be no type errors.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhooks tool group
fix: handle 403 from projects.list gracefully
docs: update authentication guide
chore: bump @modelcontextprotocol/sdk to 1.6.0
```

Scope is optional but encouraged when the change is domain-specific:

```
feat(quotations): add quotations_send tool
fix(auth): persist rotated refresh token to TEAMLEADER_TOKEN_STORE
```

---

## Adding a new tool group

Follow these steps to add a new domain (e.g. `fooBar`):

### 1. Create `src/tools/fooBar.ts`

Follow the existing pattern — use `try / respond / catch / respondError`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";

export function registerFooBarTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  server.tool(
    "teamleader_foobar_list",
    "List foo bars.",
    { page: z.number().optional() },
    async ({ page }) => {
      try {
        const data = await client.post("fooBars.list", { page: { size: 20, number: page ?? 1 } });
        return respond(data);
      } catch (e) {
        return respondError(e);
      }
    }
  );
}
```

### 2. Add the group to `src/server.ts`

Import the registrar and add an entry to the `GROUPS` map:

```typescript
import { registerFooBarTools } from "./tools/fooBar.js";

const GROUPS: Record<string, Register> = {
  // ... existing groups ...
  fooBar: registerFooBarTools,
};
```

### 3. Add a registration test in `test/registration.test.ts`

The registration test suite verifies that every group registers at least one tool. Add an assertion:

```typescript
it("registers fooBar tools", () => {
  expect(toolNames.some((n) => n.startsWith("teamleader_foobar_"))).toBe(true);
});
```

### 4. Verify endpoint names against the manifest

Check `docs/teamleader-endpoints.md` to confirm the endpoint names you are using are verified. If they are not listed, note them as unverified in a comment in your tool file.

---

## Code style

- TypeScript strict mode is enabled — no `any` unless truly unavoidable.
- Keep tool descriptions concise and accurate; they are exposed directly to the AI.
- Mark destructive or irreversible operations with `SIDE EFFECT:` in the description (see existing tools for examples).
- Do not add dependencies without discussion — the dependency footprint should stay minimal.

---

## Reporting issues

Use the GitHub issue templates:

- **Bug report** — for unexpected behavior, API errors, or type errors.
- **Feature request** — for new tool groups, new tools within an existing group, or other enhancements.

For security vulnerabilities, email **nick@boostu.be** directly — do not open a public issue.
