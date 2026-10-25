#!/usr/bin/env bash
# Deploy one commit of the Worker to env next or env v11 from a clean git worktree (CLAUDE.md §12; add-on 0072-add22 §3):
#
#   scripts/deploy.sh --env v11  [--rev <commit>]     # HEAD when --rev is not given
#   scripts/deploy.sh --env next [--rev <commit>]
#
# In order:
#   1. the checks: the Worker's type-check and its tests;
#   2. the build of the interface;
#   3. the deploy from the clean worktree (`wrangler deploy`, which also applies Durable Object migrations);
#   4. the smoke check (scripts/smoke-next.sh) on the env's own URL;
#   5. if the smoke check fails: back to the version that was deployed before, recorded before step 3;
#   6. the commit, the new version and the version to go back to, written to relay/w1/STATUS.md.
# No preview URL is used: next has a Durable Object (AskQueue), so its versions have none (the night of 25 October).
# Cloudflare refuses to go back across a Durable Object migration; then the script says so, and the way back is a commit.
# Every wrangler call goes through scripts/wr.sh, which refuses next while FREEZE_NEXT exists, and the live Worker always.
#
#   DEPLOY_TEST_FAIL_SMOKE=1   makes the smoke check fail, to test the way back (env v11 only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME=""
REV="HEAD"
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --rev) REV="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  next) URL="https://i-muslim-next.alkhammashtalal.workers.dev" ;;
  v11) URL="https://i-muslim-v11.alkhammashtalal.workers.dev" ;;
  *) echo "❌ deploy: give --env next or --env v11 (the live Worker is frozen, CLAUDE.md §13)" >&2; exit 2 ;;
esac
if [ "$ENV_NAME" = "next" ] && [ -f "$ROOT/FREEZE_NEXT" ]; then
  echo "❌ deploy: FREEZE_NEXT exists: next is frozen (lift it only for a promotion Talal ordered)" >&2
  exit 1
fi
if [ "${DEPLOY_TEST_FAIL_SMOKE:-}" = "1" ] && [ "$ENV_NAME" != "v11" ]; then
  echo "❌ deploy: DEPLOY_TEST_FAIL_SMOKE is for env v11 only" >&2
  exit 2
fi

WR="$ROOT/scripts/wr.sh"
# The long log is in the main working folder, also when this runs from a worktree.
MAIN="$(cd "$(git -C "$ROOT" rev-parse --git-common-dir)/.." && pwd)"
STATUS_LOG="$MAIN/relay/w1/STATUS.md"
log_status() {
  if [ -f "$STATUS_LOG" ]; then echo "$(TZ=Asia/Riyadh date +%H:%M) | w1 (deploy.sh) | $1" >> "$STATUS_LOG"; fi
  echo "deploy: $1"
}

SHA="$(git -C "$ROOT" rev-parse --short "$REV")"
WT="$(mktemp -d)/deploy-$ENV_NAME-$SHA"
git -C "$ROOT" worktree add --detach "$WT" "$SHA" >/dev/null
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

# The version to go back to, before anything is built: one version at 100%, or no deploy.
PREV="$(cd "$WT/worker" && "$WR" deployments status --env "$ENV_NAME" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).versions;console.log(v.length===1&&v[0].percentage===100?v[0].version_id:"")})')"
[ -n "$PREV" ] || { echo "❌ deploy: $ENV_NAME has no single version at 100%, so there is no way back to record; not deployed" >&2; exit 1; }
echo "deploy: $ENV_NAME serves $PREV now; commit $SHA from a clean worktree"

# The packages of both first: the Worker's type-check reads web/src, which imports web's packages.
(cd "$WT/web" && npm ci --silent)
(cd "$WT/worker" && npm ci --silent)
# 1. The checks, then 2. the build.
(cd "$WT/worker" && npm run typecheck && npm test)
(cd "$WT/web" && npm run build)

# A commit older than env v11 has no v11 section: it takes HEAD's file for the deploy alone (as scripts/deploy-v11.sh).
if [ "$ENV_NAME" = "v11" ] && ! grep -q '"v11"' "$WT/worker/wrangler.jsonc"; then
  git -C "$ROOT" show HEAD:worker/wrangler.jsonc > "$WT/worker/wrangler.jsonc"
fi

# 3. The deploy.
OUT="$(mktemp)"
(cd "$WT/worker" && "$WR" deploy --env "$ENV_NAME" --tag "$SHA" --message "commit $SHA") 2>&1 | tee "$OUT" || true
VID="$(grep -oE 'Current Version ID: [0-9a-f-]{36}' "$OUT" | awk '{print $4}' || true)"
[ -n "${VID}" ] || { log_status "❌ ${ENV_NAME}: نشر ${SHA} لم يُخرج رقم نسخة؛ المنشور ما زال ${PREV} إن لم يتغير (افحص deployments status)"; exit 1; }

# 4. The smoke check on the env itself.
ok=0
if [ "${DEPLOY_TEST_FAIL_SMOKE:-}" != "1" ]; then
  for i in 1 2 3 4 5 6; do bash "$ROOT/scripts/smoke-next.sh" "$URL" && { ok=1; break; }; sleep 5; done
else
  echo "deploy: DEPLOY_TEST_FAIL_SMOKE=1: the smoke check is made to fail, to test the way back"
fi

# 5. Back to the recorded version when it fails, then 6. the record.
if [ $ok = 0 ]; then
  if (cd "$WT/worker" && "$WR" versions deploy "$PREV@100%" --env "$ENV_NAME" --message "back to $PREV after commit $SHA failed its smoke check" -y); then
    log_status "❌ ${ENV_NAME}: ${SHA} (النسخة ${VID}) فشل فحص الدخان، فرجع تلقائيًا إلى ${PREV}"
  else
    log_status "❌ ${ENV_NAME}: ${SHA} (النسخة ${VID}) فشل فحص الدخان، والرجوع إلى ${PREV} رفضه Cloudflare (ترحيل Durable Object بينهما؟): الرجوع بالتزام"
  fi
  exit 1
fi
log_status "نُشر ${SHA} على ${ENV_NAME}: النسخة ${VID}، والدخان ناجح، ونسخة الرجوع ${PREV}"
