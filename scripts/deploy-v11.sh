#!/usr/bin/env bash
# Deploy a commit to env v11, release 1.1's own server (reply 0070 step 1, reply 0071), from a clean git worktree of it
# (CLAUDE.md §12), after its web build, its type-check and its tests:
#
#   scripts/deploy-v11.sh            # HEAD
#   scripts/deploy-v11.sh f0e4378    # the commit next serves, to measure it on v11 (reply 0070 step 2)
#
# A commit older than env v11 has no v11 section in its worker/wrangler.jsonc: its tests run with its own config, then
# the current file (HEAD's) replaces it for the deploy alone, so the Worker binds v11's resources and nothing of next.
# v11 reaches no user: nothing here touches next (FREEZE_NEXT), and every wrangler call goes through scripts/wr.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REV="${1:-HEAD}"
SHA="$(git -C "$ROOT" rev-parse --short "$REV")"
WT="$(mktemp -d)/v11-$SHA"
git -C "$ROOT" worktree add --detach "$WT" "$SHA" >/dev/null
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

(cd "$WT/web" && npm ci --silent && npm run build)
(cd "$WT/worker" && npm ci --silent && npm run typecheck && npm test)
git -C "$ROOT" show HEAD:worker/wrangler.jsonc > "$WT/worker/wrangler.jsonc"
cd "$WT/worker"
bash "$ROOT/scripts/wr.sh" deploy --env v11 --tag "$SHA" --message "commit $SHA"
echo "deploy-v11: commit $SHA is on https://i-muslim-v11.alkhammashtalal.workers.dev"
