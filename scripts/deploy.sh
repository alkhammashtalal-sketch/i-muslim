#!/usr/bin/env bash
# Deploy the Worker from a clean git worktree of HEAD (CLAUDE.md §12), after type-check, tests and build.
# While the file FREEZE exists at the root of the branch (command 0031), only `--env next` is allowed.
#
#   scripts/deploy.sh --env next
#
# next is the app's server in the stores (reply 0033-add4 §1), so a deploy reaches real users. In order:
#   1. upload the version without traffic (`wrangler versions upload`);
#   2. check its preview URL with scripts/smoke-next.sh; stop there if it fails, or if preview URLs are off
#      (they are not turned on here: Talal decides);
#   3. deploy it at 100%;
#   4. check next itself; if that fails, go back to the version that was deployed before.
# Every wrangler call goes through scripts/wr.sh.
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
WR="$ROOT/scripts/wr.sh"
NEXT_URL="https://i-muslim-next.alkhammashtalal.workers.dev"
cd "$WT/worker"
PREV="$("$WR" deployments status --env "$ENV_NAME" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).versions;console.log(v.length===1&&v[0].percentage===100?v[0].version_id:"")})')"
echo "deploy: deployed now: ${PREV:-(more than one version)}"

LOG="$(mktemp)"
"$WR" versions upload --env "$ENV_NAME" --tag "$SHA" --message "commit $SHA" | tee "$LOG"
VID="$(grep -oE 'Worker Version ID: [0-9a-f-]{36}' "$LOG" | awk '{print $4}')"
PURL="$(grep -oE 'Version Preview URL: https://[^ ]+' "$LOG" | awk '{print $4}')"
[ -n "$VID" ] || { echo "❌ deploy: no version id in the upload's output" >&2; exit 1; }
if [ -z "$PURL" ]; then
  echo "❌ deploy: version $VID is uploaded but has no preview URL (preview URLs are off for this Worker)." >&2
  echo "   Not deployed. Turning preview URLs on is Talal's decision (reply 0033-add4 §1)." >&2
  exit 1
fi
echo "deploy: checking the preview $PURL"
for i in 1 2 3 4 5 6; do bash "$ROOT/scripts/smoke-next.sh" "$PURL" && break || { [ $i = 6 ] && { echo "❌ deploy: the preview fails; $VID is not deployed" >&2; exit 1; }; sleep 5; }; done

"$WR" versions deploy "$VID@100%" --env "$ENV_NAME" --message "commit $SHA" -y
echo "deploy: checking $NEXT_URL"
ok=0
for i in 1 2 3 4 5 6; do bash "$ROOT/scripts/smoke-next.sh" "$NEXT_URL" && { ok=1; break; }; sleep 5; done
if [ $ok = 0 ]; then
  if [ -n "$PREV" ]; then
    echo "❌ deploy: next fails after the deploy; going back to $PREV" >&2
    "$WR" versions deploy "$PREV@100%" --env "$ENV_NAME" --message "back to $PREV after commit $SHA failed its check" -y
  fi
  exit 1
fi
echo "deploy: $VID (commit $SHA) is on next, checked"

