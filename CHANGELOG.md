# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.0.0] - 2026-06-08

### Added

- Rebranded to **BoostU Teamleader MCP** (`boostu-teamleader-mcp`); package name, bin, and npm scope updated accordingly.
- Transport-agnostic `createServer` core in `src/server.ts` — the server can be wired to any MCP transport (stdio, HTTP, etc.) independently of business logic.
- `TEAMLEADER_TOOLS` environment variable for selective tool-group loading; unset loads all 21 groups.
- `TEAMLEADER_TOKEN_STORE` environment variable to persist the rotating OAuth2 refresh token to a file, surviving process restarts.
- Expanded tool set from **19 to 89 tools** across new domains:
  - **Quotations** — list, info, create, update, send, accept
  - **Products & catalog** — products list/info, product categories, price lists, units of measure
  - **Subscriptions** — list, info, create, update, deactivate
  - **Credit notes** — list, info
  - **Invoice actions** — book into accounting, send by email, register payment, download
  - **Projects** — list, info, create, milestones list/create
  - **Time tracking** — list entries, add, update, start timer, stop timer
  - **Activities (calls & meetings)** — list, create, complete for both calls and meetings
  - **Support tickets** — list, info, create, update, add message, list statuses
  - **Organisation** — users list/info/me, teams list, departments list
  - **Custom fields** — definitions list/info
  - **Reference data** — deal phases, pipelines, sources, lost reasons, tax rates, payment terms, withholding tax rates
  - **Tags** — add/remove tags on contacts and companies
  - **Notes** — list and create notes on any subject
  - **Files** — list, download URL, upload (two-step flow)
  - **Webhooks** — list, register, unregister
- Vitest test suite covering tool registration, server creation, and tool filter logic.
- GitHub Actions CI workflow.
- Issue templates for bug reports and feature requests.
- `docs/AUTHENTICATION.md` — full OAuth2 walkthrough.
- `docs/teamleader-endpoints.md` — live-verified endpoint manifest.
- `CONTRIBUTING.md` — development guide and instructions for adding new tool groups.

### Changed

- Minimum Node.js version raised to **20**.
- `@modelcontextprotocol/sdk` updated to `^1.5.0`.
- All tool modules refactored to use shared `respond` / `respondError` / `buildListBody` helpers.

### Upstream

- Forked from an upstream MIT project. Original copyright retained in `LICENSE`; upstream attribution in `NOTICE`.
