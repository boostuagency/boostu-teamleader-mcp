# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in `boostu-exactonline-mcp`, please report it
privately. **Do not open a public GitHub issue.**

Email **nick@boostu.be** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- the affected version or commit.

We aim to acknowledge reports within a few business days and will keep you updated on
remediation. Responsible disclosure is appreciated; please give us reasonable time to
release a fix before any public disclosure.

## Handling credentials

This server talks to the Exact Online API on your behalf using OAuth2. Exact Online holds a
company's complete bookkeeping, so treat these credentials accordingly.

- Never commit `.env` files or `.exact-token` to version control. Both are listed in
  `.gitignore`.
- Treat your Exact **client ID**, **client secret**, and **refresh token** as secrets. Anyone
  holding them can read and write the administration.
- The token store is written with `0600` permissions. Keep it that way, and keep it off shared
  volumes.
- If a credential is exposed, revoke the app in the Exact App Center immediately and register
  a new one. Rotating the refresh token alone is not enough: the client secret is what grants
  new tokens.

## Limiting exposure

Three settings reduce what a compromised connection could reach:

| Setting | Effect |
|---------|--------|
| `EXACT_READ_ONLY=true` | No create, update or delete tool is registered at all |
| `EXACT_DIVISION=<code>` | Every call is pinned to one administration |
| `EXACT_TOOLS=<groups>` | Only the named tool groups are loaded |

## Supported versions

Only the latest published version receives security updates.
