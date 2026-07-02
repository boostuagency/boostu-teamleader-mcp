# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in `boostu-teamleader-mcp`, please report it
privately. **Do not open a public GitHub issue.**

Email **nick@boostu.be** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- the affected version or commit.

We aim to acknowledge reports within a few business days and will keep you updated on
remediation. Responsible disclosure is appreciated; please give us reasonable time to
release a fix before any public disclosure.

## Handling credentials

This server talks to the Teamleader Focus API on your behalf using OAuth2.

- Never commit `.env` files or `.teamleader-token` to version control. Both are listed in
  `.gitignore`.
- Treat your Teamleader **client ID**, **client secret**, and **refresh token** as
  secrets. Anyone with these can access your Teamleader account.
- If a credential is exposed, rotate it immediately in the
  [Teamleader Developers portal](https://developer.focus.teamleader.eu/integrations).

## Supported versions

Only the latest published version receives security updates.
