#!/usr/bin/env bash
# Deploy the Worker from a clean git worktree of HEAD (CLAUDE.md §12), after type-check, tests and build.
# While the file FREEZE exists at the root of the branch (command 0031), only `--env next` is allowed.
#
#   scripts/deploy.sh --env next
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -f "$ROOT/FREEZE" ] && [ "$ENV_NAME" != "next" ]; then
  echo "❌ FREEZE exists: production is frozen. Only 'scripts/deploy.sh --env next' is allowed." >&2
  exit 1
fi
[ -n "$ENV_NAME" ] || { echo "❌ give --env" >&2; exit 2; }

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
WT="$(mktemp -d)/deploy-$SHA"
git -C "$ROOT" worktree add --detach "$WT" HEAD >/dev/null
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

(cd "$WT/web" && npm ci --silent && npm run build)
(cd "$WT/worker" && npm ci --silent && npm run typecheck && npm test)
# Through the guard (reply 0033-add1 §4): it refuses anything but env next.
(cd "$WT/worker" && "$ROOT/scripts/wr.sh" deploy --env "$ENV_NAME" --tag "$SHA" --message "commit $SHA")
