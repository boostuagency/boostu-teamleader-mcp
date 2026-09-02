# Authentication — Exact Online OAuth2

This guide walks through obtaining the credentials required to run `boostu-exactonline-mcp`.

---

## Overview

Exact Online uses OAuth2 with **rotating** refresh tokens. You need:

| Variable | Where it comes from |
|----------|---------------------|
| `EXACT_CLIENT_ID` | Your app in the Exact App Center |
| `EXACT_CLIENT_SECRET` | Your app in the Exact App Center |
| `EXACT_REFRESH_TOKEN` | One-time OAuth2 authorization flow |
| `EXACT_REGION` | The country your Exact Online environment runs in |

Three properties of Exact's OAuth make it stricter than most APIs. Plan for all three:

1. **The access token lives 10 minutes.** The server refreshes it automatically.
2. **The refresh token rotates on every refresh** and the previous one is invalidated
   immediately. Set `EXACT_TOKEN_STORE` so each rotation is written to disk, otherwise a
   restart leaves you with a dead token and a manual re-authorization.
3. **A refresh token expires after 30 days of disuse.** A server that sits idle for a month
   needs re-authorizing.

---

## Step 0 — Pick your region

Exact Online is deployed per country and a token issued on one region is not valid on another.

| Region | `EXACT_REGION` | Base URL |
|--------|----------------|----------|
| Belgium | `be` (default) | `https://start.exactonline.be` |
| Netherlands | `nl` | `https://start.exactonline.nl` |
| Germany | `de` | `https://start.exactonline.de` |
| France | `fr` | `https://start.exactonline.fr` |
| United Kingdom | `uk` | `https://start.exactonline.co.uk` |
| Spain | `es` | `https://start.exactonline.es` |
| International / US | `com` | `https://start.exactonline.com` |

Use the hostname you log in to Exact Online with.

---

## Step 1 — Register an app

1. Sign in to Exact Online and open the **App Center** → **Manage my apps**
   (`https://apps.exactonline.com/<region>/<language>/V2/Manage`).
2. Choose **Register an app**, give it a name, and pick a **development** app while you are
   testing. Production apps go through Exact's review.
3. Under **Redirect URI**, add exactly `http://localhost:8000/oauth/callback` (used by the
   helper scripts; pick another port if 8000 is taken). Exact compares this string literally,
   so a trailing slash or a different port will fail the token exchange.
4. Save. You receive a **Client ID** and **Client Secret** — keep these safe.

---

## Step 2 — Authorize and get the refresh token

### Option A — automated helper (recommended)

`get-refresh-token.mjs` starts a local callback server, prints the authorize URL, intercepts
the code, and writes the refresh token to `.env`.

```bash
cp .env.example .env
# Fill in EXACT_CLIENT_ID, EXACT_CLIENT_SECRET and EXACT_REGION first
node get-refresh-token.mjs
```

Open the URL it prints, sign in, approve the app, and the script captures the callback.

### Option B — manual flow

**Build the authorize URL** (Belgium shown; swap the hostname for your region):

```
https://start.exactonline.be/api/oauth2/auth
  ?client_id=<your-client-id>
  &redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Foauth%2Fcallback
  &response_type=code
  &force_login=0
```

Open it in your browser. After approving, Exact redirects to your redirect URI with a `code`
query parameter.

> **Gotcha:** Exact returns the code URL-encoded. If you copy it out of the browser address
> bar, decode it (`%21` back to `!`, and so on) before exchanging it. `exchange-code.mjs`
> does this for you.

**Exchange the code for tokens:**

```bash
curl -s -X POST https://start.exactonline.be/api/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<your-client-id>" \
  -d "client_secret=<your-client-secret>" \
  -d "code=<code-from-redirect>" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:8000/oauth/callback"
```

Or use the helper:

```bash
AUTH_CODE='<code-from-redirect>' node exchange-code.mjs
```

The response looks like:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": "600",
  "refresh_token": "the-value-you-need"
}
```

Put the `refresh_token` in `EXACT_REFRESH_TOKEN`.

---

## Step 3 — Persist the rotation

```bash
EXACT_TOKEN_STORE=.exact-token
```

With this set, every rotated refresh token is written to that file with `0600` permissions and
read back on boot. The file becomes the source of truth: `EXACT_REFRESH_TOKEN` is only the
seed for the very first run.

In Docker, mount a volume over that path. In a hosted deployment, use the
`loadRefreshToken` / `saveRefreshToken` callbacks on `ExactAuth` to store it in your database
instead.

---

## Step 4 — Verify

```bash
node validate.mjs
```

This refreshes once, reports whether rotation happened, calls `current/Me`, lists the
divisions the login can open, prints the remaining rate limit, and writes the rotated token
back to `.env`.

Then check the MCP surface end to end:

```bash
npm run build
node test-mcp.mjs
```

---

## Divisions

Almost every Exact resource lives under a **division**: one company's bookkeeping. An
accountant's login typically sees many.

- Leave `EXACT_DIVISION` unset and the server uses the current division of the authorized
  user, resolved once from `current/Me`.
- Set `EXACT_DIVISION=123456` to pin every call to one administration.
- Every tool also accepts a `division` argument, so one connection can serve several
  companies without restarting.

Use `exact_divisions_list` to see which codes are available.

---

## Rate limits

Exact enforces two windows per app-and-company combination: one per minute and one per day.
Exceeding either returns HTTP 429. The server reads the `X-RateLimit-*` headers on every
response; `exact_rate_limit_status` reports the latest counters, and a 429 error message
names what is left and when it resets.

Keep well inside the limits by passing `select` (fewer columns) and `filter` (fewer rows)
rather than fetching whole collections and filtering afterwards.

---

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `invalid_grant` on refresh | The refresh token was already exchanged, or it is older than 30 days. Re-run the authorization and set `EXACT_TOKEN_STORE`. |
| Token exchange returns 400 | The `redirect_uri` does not match the App Center registration character for character, or the code was not URL-decoded. |
| Every call returns 401 | Wrong region: the token was issued on a different Exact hostname than the one being called. |
| A call returns 403 | The login is valid but the division is not licensed for that module, or the app was not granted that scope. |
| `Could not determine the current division` | The login has no current division. Set `EXACT_DIVISION` explicitly. |
