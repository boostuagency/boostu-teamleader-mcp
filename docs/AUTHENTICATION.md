# Authentication — Teamleader Focus OAuth2

This guide walks through obtaining the credentials required to run `boostu-teamleader-mcp`.

---

## Overview

Teamleader Focus uses OAuth2 with rotating refresh tokens. You need:

| Variable | Where it comes from |
|----------|---------------------|
| `TEAMLEADER_CLIENT_ID` | Your integration in the Teamleader Marketplace |
| `TEAMLEADER_CLIENT_SECRET` | Your integration in the Teamleader Marketplace |
| `TEAMLEADER_REFRESH_TOKEN` | One-time OAuth2 authorization flow |

---

## Step 1 — Register an integration

1. Go to [marketplace.focus.teamleader.eu](https://marketplace.focus.teamleader.eu) and sign in with your Teamleader account.
2. Navigate to **Developer** → **My integrations** → **Create integration**.
3. Fill in a name and description.
4. Under **Redirect URIs**, add `http://localhost:8000/oauth/callback` (used by the helper scripts; use another port if 8000 is taken).
5. Save. You will receive a **Client ID** and **Client Secret** — keep these safe.

---

## Step 2 — Authorize and get the refresh token

### Option A — automated helper (recommended)

The repo includes `get-refresh-token.mjs`, which starts a local callback server, opens the authorize URL in your browser, intercepts the code, and writes the refresh token to `.env` automatically.

```bash
# Put your creds in .env first
echo "TEAMLEADER_CLIENT_ID=<your-client-id>" >> .env
echo "TEAMLEADER_CLIENT_SECRET=<your-client-secret>" >> .env
echo "REDIRECT_URI=http://localhost:8000/oauth/callback" >> .env

node get-refresh-token.mjs
```

The script prints a URL. Open it, authorize the integration, and the script will capture the callback and print the refresh token (and append it to `.env`).

### Option B — manual flow

**Build the authorize URL:**

```
https://focus.teamleader.eu/oauth2/authorize
  ?client_id=<your-client-id>
  &response_type=code
  &redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Foauth%2Fcallback
  &state=random-csrf-token
```

Open that URL in your browser. After authorizing, Teamleader redirects to your redirect URI with a `code` parameter in the query string.

**Exchange the code for tokens:**

```bash
curl -s -X POST https://focus.teamleader.eu/oauth2/access_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<your-client-id>" \
  -d "client_secret=<your-client-secret>" \
  -d "code=<code-from-redirect>" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:8000/oauth/callback"
```

The response looks like:

```json
{
  "token_type": "Bearer",
  "access_token": "...",
  "expires_in": 3600,
  "refresh_token": "the-value-you-need"
}
```

Use `refresh_token` as `TEAMLEADER_REFRESH_TOKEN`.

Alternatively, use the `exchange-code.mjs` helper for the code-exchange step alone:

```bash
AUTH_CODE=<code-from-redirect> node exchange-code.mjs
```

---

## Step 3 — Set the environment variables

```bash
export TEAMLEADER_CLIENT_ID=your-client-id
export TEAMLEADER_CLIENT_SECRET=your-client-secret
export TEAMLEADER_REFRESH_TOKEN=your-refresh-token
```

Or place them in `.env` (which is git-ignored) and ensure your MCP host or process manager loads it.

---

## Token rotation and `TEAMLEADER_TOKEN_STORE`

Teamleader **rotates the refresh token on every token refresh**. The server exchanges the access token every hour (60 seconds before it expires). After each exchange, the new refresh token replaces the old one in memory — but if the process restarts, the in-memory token is gone.

To survive restarts, set `TEAMLEADER_TOKEN_STORE` to a writable file:

```bash
export TEAMLEADER_TOKEN_STORE=/var/run/teamleader-token
```

On startup, the server reads the latest token from this file. After every rotation, it writes the new token back (mode `0600`). This file is the source of truth — not `.env`. Update your MCP host config to include this variable:

```json
{
  "mcpServers": {
    "teamleader": {
      "command": "npx",
      "args": ["-y", "boostu-teamleader-mcp"],
      "env": {
        "TEAMLEADER_CLIENT_ID": "...",
        "TEAMLEADER_CLIENT_SECRET": "...",
        "TEAMLEADER_REFRESH_TOKEN": "initial-token-from-step-2",
        "TEAMLEADER_TOKEN_STORE": "/var/run/teamleader-token"
      }
    }
  }
}
```

Without `TEAMLEADER_TOKEN_STORE`, the server will work as long as it keeps running. The first restart after the initial access token expires will require setting a fresh `TEAMLEADER_REFRESH_TOKEN`.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to refresh Teamleader token: 400` | Refresh token is invalid or expired | Re-run `get-refresh-token.mjs` to get a fresh token |
| `Missing required environment variable: TEAMLEADER_CLIENT_ID` | Env var not set in MCP config | Add the variable to the `env` block of your MCP server config |
| Token works once then fails | No `TEAMLEADER_TOKEN_STORE` set | Add `TEAMLEADER_TOKEN_STORE` pointing to a writable path |
