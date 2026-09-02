#!/usr/bin/env bash
#
# Turn this directory into its own git repository and push it to GitHub.
#
# The project was developed inside the boostu-teamleader-mcp repository because
# the session that built it could not create a new repository on GitHub. This
# script does the split: it initialises a fresh history from these files only,
# and pushes to the repository you name.
#
# Usage:
#   1. Create an empty repo on GitHub (no README, no .gitignore, no licence):
#        https://github.com/organizations/boostuagency/repositories/new
#      Name it: boostu-exactonline-mcp
#   2. From inside this directory:
#        ./scripts/init-standalone-repo.sh git@github.com:boostuagency/boostu-exactonline-mcp.git
#
set -euo pipefail

REMOTE="${1:-git@github.com:boostuagency/boostu-exactonline-mcp.git}"
BRANCH="${2:-main}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

if [ ! -f package.json ] || ! grep -q '"boostu-exactonline-mcp"' package.json; then
  echo "Refusing to run: $here does not look like the boostu-exactonline-mcp project." >&2
  exit 1
fi

if [ -d .git ]; then
  echo "Refusing to run: $here already contains a .git directory." >&2
  echo "Remove it first if you really want a fresh history." >&2
  exit 1
fi

echo "==> Verifying the project builds and its tests pass"
npm ci
npm run typecheck
npm test
npm run build

echo "==> Initialising a fresh repository on branch $BRANCH"
git init -b "$BRANCH"
git add .
git commit -m "feat: BoostU Exact Online MCP v1.0.0 — initial release

An MCP server for the core of an Exact Online administration, aimed at small
and medium businesses: relations, sales, purchasing, the general ledger,
banking, VAT, items, documents and the pre-aggregated financial reports.
"

git remote add origin "$REMOTE"
echo "==> Pushing to $REMOTE"
git push -u origin "$BRANCH"

cat <<'NEXT'

Done. Follow-up steps that are not automated:

  1. Repository settings: add the description and the topics
     (mcp, exact-online, accounting, model-context-protocol, claude).
  2. Add the NPM_TOKEN secret so the release workflow can publish:
     an Automation token from npmjs.com, set under Settings > Secrets > Actions.
  3. Cut the first release, which triggers the npm publish:
     gh release create v1.0.0 --title "v1.0.0" --target main --notes-file CHANGELOG.md
  4. Publish to the MCP Registry (manual, so a re-run never fails on a
     duplicate version):
     gh workflow run publish-mcp.yml
  5. Delete the copy that lives inside boostu-teamleader-mcp.

NEXT
