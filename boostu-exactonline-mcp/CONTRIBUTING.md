# Contributing to BoostU Exact Online MCP

Thank you for your interest in contributing! This document covers everything you need to get
started.

---

## Development setup

```bash
git clone https://github.com/boostuagency/boostu-exactonline-mcp.git
cd boostu-exactonline-mcp
npm install
```

Run the server in development mode (TypeScript is executed directly via `tsx`, no build
required):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

To exercise it against a real environment, copy `.env.example` to `.env`, follow
[docs/AUTHENTICATION.md](docs/AUTHENTICATION.md), then run `node validate.mjs` and
`node test-mcp.mjs`.

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
feat: add projects tool group
fix: decode the skiptoken before paging
docs: update authentication guide
chore: bump @modelcontextprotocol/sdk to 1.30.0
```

Scope is optional but encouraged when the change is domain-specific:

```
feat(reports): add a cash-position summary tool
fix(auth): collapse concurrent refreshes into one request
```

---

## Adding a resource

Most contributions are a few lines of data. Exact's collections are uniform enough that
`registerResource` generates the list, create and update tools from a declaration.

Add an entry to the `RESOURCES` array in the matching `src/tools/*.ts` file:

```typescript
{
  name: "subscriptions",                       // exact_subscriptions_list, _create, _update
  resource: "subscription/Subscriptions",      // the OData path below the division
  label: "recurring subscriptions",            // used in the tool descriptions
  key: "EntryID",                              // primary key property (default "ID")
  keyType: "guid",                             // guid | string | number (default guid)
  ops: ["list", "create", "update"],
  deletable: true,                             // reachable via exact_record_delete
  defaultSelect: "EntryID,Description,OrderedBy,StartDate,EndDate,Status",
  commonFields: "OrderedBy (GUID, required), StartDate, SubscriptionType",
  filterHint: "Status 10 is active, 20 cancelled.",
},
```

Set `keyed: false` for aggregated report endpoints that cannot be addressed by key, so the
list tool does not offer an `id` argument.

Two things are worth the effort:

- **`defaultSelect`.** Without it Exact returns every property, which is slow and floods the
  assistant's context. Pick the columns someone would actually want.
- **`filterHint`.** Status codes and sign conventions are where Exact surprises people. A
  sentence here saves the assistant a wrong answer.

---

## Adding a tool group

### 1. Create `src/tools/fooBar.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  // ... declarations as above
];

export function registerFooBarTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
```

For anything the factory cannot express — an action endpoint, a report that needs
post-processing — write the tool by hand with `try / respond / catch / respondError`, and
guard it with `if (isReadOnly()) return;` when it writes.

### 2. Add the group to `src/server.ts`

```typescript
import { registerFooBarTools } from "./tools/fooBar.js";

const GROUPS: Record<string, Register> = {
  // ... existing groups ...
  fooBar: registerFooBarTools,
};
```

### 3. Cover it in `test/registration.test.ts`

Add one tool name from the group to the default-registration assertion list.

### 4. Verify the resource path

Check [docs/exact-endpoints.md](docs/exact-endpoints.md) and the
[official resource index](https://start.exactonline.nl/docs/HlpRestAPIResources.aspx). Update
the manifest table in that file with the group's tool count.

---

## Code style

- TypeScript strict mode is enabled — no `any` unless truly unavoidable.
- Keep tool descriptions concise and accurate; they are exposed directly to the AI.
- Say plainly in the description when an operation is irreversible. Booking an invoice and
  deleting a record both are.
- Comments explain why, not what. The existing files show the density expected.
- Do not add dependencies without discussion — the dependency footprint should stay minimal.

---

## Reporting issues

Use the GitHub issue templates:

- **Bug report** — for unexpected behavior, API errors, or type errors.
- **Feature request** — for new tool groups, new resources within an existing group, or other
  enhancements.

For security vulnerabilities, email **nick@boostu.be** directly — do not open a public issue.
