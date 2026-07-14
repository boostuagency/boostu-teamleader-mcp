# Releasing

How to cut a new release of `boostu-teamleader-mcp` to npm and the official MCP Registry.

## One-time setup

- **`NPM_TOKEN` secret**: a classic **Automation** token from npmjs.com (Access Tokens, Generate New Token, Classic Token, type Automation). Automation tokens publish in CI without a one-time password. Set it with:
  ```
  gh secret set NPM_TOKEN -R boostuagency/boostu-teamleader-mcp
  ```
- **MCP Registry**: no token needed. `.github/workflows/publish-mcp.yml` authenticates with GitHub OIDC, which proves ownership of the `io.github.boostuagency` namespace from within this repo.

## Release steps

1. **Bump the version in both files (they must match):**
   - `package.json` -> `"version"`
   - `server.json` -> the top-level `"version"` and `packages[0].version`

   Keep `"mcpName": "io.github.boostuagency/boostu-teamleader-mcp"` in `package.json`; the registry requires it to prove npm ownership.

2. **Validate and commit:**
   ```
   npm run build && npx vitest run
   mcp-publisher validate
   git add package.json server.json package-lock.json
   git commit -m "chore: release vX.Y.Z"
   git push
   ```

3. **Publish to npm via a GitHub Release** (this triggers `release.yml`, which publishes automatically using `NPM_TOKEN`):
   ```
   gh release create vX.Y.Z -R boostuagency/boostu-teamleader-mcp --title "vX.Y.Z" --target main --notes "..."
   ```

4. **Publish to the MCP Registry** (manual, so a re-run never fails on an already-published version):
   ```
   gh workflow run publish-mcp.yml -R boostuagency/boostu-teamleader-mcp
   ```

5. **Verify:**
   ```
   npm view boostu-teamleader-mcp version           # -> X.Y.Z
   curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.boostuagency/boostu-teamleader-mcp"
   ```

## Notes

- npm versions are immutable. If a version is already published, bump to the next patch rather than trying to republish.
- The registry keeps every version; the newest is flagged `isLatest`.
- `files` in `package.json` ships only `dist` and `NOTICE`, so docs and config (including this file, `server.json`, and the `Dockerfile`) are not included in the npm tarball.
