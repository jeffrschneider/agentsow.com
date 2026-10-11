#!/usr/bin/env bash
# Publish this site to Google Cloud object storage and refresh the CDN.
# It serves from gs://agentsow-site behind the agentcatalog-lb load balancer;
# GitHub is source only.
#
# What ships is the last commit, nothing else: the committed files are copied
# into a staging folder, the contrast gate runs there, and the folder is
# synced to the bucket. Uncommitted edits do not ship.
#
# THE CONTRAST GATE. The site is light by default with a Dark switch; its
# palette is theme.css. tools/contrast-gate.mjs opens every page in light and
# dark at 1440 and 390 px wide, with every menu section, the phone menu and
# the analytics consent bar open, and measures every piece of text against
# what is behind it. One element below 4.5:1 and nothing is published; the
# failures are listed by page, element and ratio. Run it yourself first:
#   (cd tools && npm ci) && node tools/contrast-gate.mjs
set -euo pipefail
BUCKET=gs://agentsow-site
HOSTS=(agentsow.com www.agentsow.com)
PROJECT=langbench-1528148150979
CACHE_CONTROL="public, max-age=3600"              # what this site's objects already carry
GCLOUD="${GCLOUD:-/c/Users/jeffr/google-cloud-sdk-extract/google-cloud-sdk/bin/gcloud.cmd}"

cd "$(dirname "$0")"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "note: uncommitted changes are not deployed; only $(git rev-parse --short HEAD) ships." >&2
fi
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD | tar -x -C "$STAGE"
rm -rf "$STAGE/deploy.sh" "$STAGE/tools" "$STAGE/.gitignore" "$STAGE/CLAUDE.md"
WSTAGE=$(cygpath -w "$STAGE" 2>/dev/null || echo "$STAGE")

[ -d tools/node_modules/playwright ] || (cd tools && npm ci --no-audit --no-fund)
if ! node tools/contrast-gate.mjs --root "$WSTAGE"; then
  echo "deploy refused: text below 4.5:1 contrast (listed above). Fix it, then deploy again." >&2
  exit 1
fi

# rsync uploads what changed. Never --delete-unmatched-destination-objects:
# the bucket holds files that are not in this repository (sitemap.xml,
# robots.txt and others). ga.js keeps its own five-minute cache.
"$GCLOUD" storage rsync -r "$WSTAGE" "$BUCKET" --cache-control="$CACHE_CONTROL" --exclude='ga\.js$' --project "$PROJECT"
if [ -f "$STAGE/ga.js" ]; then
  "$GCLOUD" storage cp "$WSTAGE\\ga.js" "$BUCKET/ga.js" --cache-control="public, max-age=300" --content-type="text/javascript; charset=utf-8" --project "$PROJECT"
fi
for h in "${HOSTS[@]}"; do
  "$GCLOUD" compute url-maps invalidate-cdn-cache agentcatalog-lb --path "/*" --host "$h" --project "$PROJECT"
done
echo "deployed $(git rev-parse --short HEAD): https://${HOSTS[0]}"
