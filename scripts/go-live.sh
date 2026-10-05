#!/usr/bin/env bash
# Switch the answer engine from mock to the live model. Run only after Talal has stored the key himself:
#   cd worker && npx wrangler secret put LLM_API_KEY
# Stops at the first failure. Steps:
#   1. LLM_API_KEY exists among the Worker's secrets (names only are listed).
#   2. The model in worker/src/config/llm.json is offered by the provider. Asked through the Worker
#      (GET /api/admin/models on a `wrangler dev --remote` preview with the admin routes open), because the
#      key exists only inside the Worker. If the model is missing: stop and ask Talal; never pick another.
#   3. Clears the answer cache (every row in it was made in mock mode, since live mode starts here) and the
#      mock rows of explain_cache ("<lang>~mock").
#   4. Sets LLM_MODE=live in worker/wrangler.jsonc, commits, pushes, then type-checks, tests, builds and
#      deploys that commit from a clean git worktree (CLAUDE.md §12).
#   5. Smoke test on the live link: an answer (verified quotes; in on_demand no generated sentence), a referral
#      and an apology.
#
# Environment:
#   ADMIN_TOKEN     the Worker's admin token. If unset, a new one is generated and stored as a Worker secret.
#   STOP_AFTER=2    stop after step 2 (dry run).
#   SKIP_KEY_CHECK=1  skip step 1; only for testing the script before the key exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER="$ROOT/worker"
LIVE_URL="https://i-muslim.alkhammashtalal.workers.dev"
PORT=8789
say() { printf '\n== %s\n' "$*"; }
fail() { printf '\n❌ %s\n' "$*" >&2; exit 1; }
cd "$WORKER"

# --- 1 ---------------------------------------------------------------------------------------------------
say "1/5 LLM_API_KEY among the Worker secrets"
if [ "${SKIP_KEY_CHECK:-}" = "1" ]; then
  echo "skipped (SKIP_KEY_CHECK=1, test run)"
elif npx wrangler secret list 2>/dev/null | grep -q '"name": "LLM_API_KEY"'; then
  echo "ok"
else
  fail "step 1: LLM_API_KEY is not set. Talal sets it himself: cd worker && npx wrangler secret put LLM_API_KEY"
fi

TOKEN="${ADMIN_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  TOKEN="$(openssl rand -hex 32)"
  printf '%s' "$TOKEN" | npx wrangler secret put ADMIN_TOKEN > /dev/null
  echo "(a new ADMIN_TOKEN was generated and stored as a Worker secret; it is not printed)"
fi

# --- 2 ---------------------------------------------------------------------------------------------------
say "2/5 the configured model is offered by the provider (asked through a preview of the Worker)"
MODEL="$(node -e "console.log(require('./src/config/llm.json').model)")"
LOG="$(mktemp)"
npx wrangler dev --remote --port "$PORT" --var ADMIN_ENABLED:true > "$LOG" 2>&1 &
DEV_PID=$!
stop_preview() { kill "$DEV_PID" 2>/dev/null || true; pkill -f "wrangler dev --remote --port $PORT" 2>/dev/null || true; }
trap stop_preview EXIT
for _ in $(seq 1 60); do
  curl -s "http://localhost:$PORT/api/health" 2>/dev/null | grep -q '"ok":true' && break
  sleep 2
done
curl -s "http://localhost:$PORT/api/health" | grep -q '"ok":true' || fail "step 2: the preview did not start (log: $LOG)"
MODELS_JSON="$(curl -s -H "authorization: Bearer $TOKEN" "http://localhost:$PORT/api/admin/models")"
stop_preview
trap - EXIT
MODEL="$MODEL" MODELS_JSON="$MODELS_JSON" node -e '
  let r; try { r = JSON.parse(process.env.MODELS_JSON) } catch { console.error("step 2: unreadable reply: " + process.env.MODELS_JSON.slice(0, 200)); process.exit(1) }
  if (!r.ok) { console.error("step 2: the provider could not be asked: " + (r.error || "unknown")); process.exit(1) }
  if (!r.models.includes(process.env.MODEL)) {
    console.error("step 2: model \"" + process.env.MODEL + "\" is not offered. Offered: " + r.models.join(", ") + ". Ask Talal; do not pick another.")
    process.exit(1)
  }
  console.log("ok: " + process.env.MODEL + " is offered")
' || fail "step 2 failed (see above). Nothing was changed."

if [ "${STOP_AFTER:-}" = "2" ]; then
  say "stopped after step 2 (STOP_AFTER=2). Nothing was changed."
  exit 0
fi

# --- 3 ---------------------------------------------------------------------------------------------------
say "3/5 clear mock answers from the caches"
npx wrangler d1 execute imuslim --remote --json \
  --command "DELETE FROM cache; DELETE FROM explain_cache WHERE lang LIKE '%~mock'" 2>/dev/null |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);console.log("deleted: cache " + r[0].meta.changes + ", explain_cache " + r[1].meta.changes)})'

# --- 4 ---------------------------------------------------------------------------------------------------
say "4/5 LLM_MODE=live, commit, deploy from a clean worktree"
if grep -q '"LLM_MODE": "live"' wrangler.jsonc; then
  echo "already live in wrangler.jsonc"
else
  sed -i.bak 's/"LLM_MODE": "mock"/"LLM_MODE": "live"/' wrangler.jsonc && rm -f wrangler.jsonc.bak
  grep -q '"LLM_MODE": "live"' wrangler.jsonc || fail "step 4: could not set LLM_MODE=live"
  git -C "$ROOT" add worker/wrangler.jsonc
  git -C "$ROOT" commit -q -m "Switch the answer engine to the live model"
  git -C "$ROOT" push -q
fi
WT="$(mktemp -d)"; rmdir "$WT"
cleanup_wt() { rm -f "$WT/web/node_modules" "$WT/worker/node_modules"; git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || true; }
trap cleanup_wt EXIT
git -C "$ROOT" worktree add -q --detach "$WT" HEAD
ln -s "$ROOT/web/node_modules" "$WT/web/node_modules"
ln -s "$ROOT/worker/node_modules" "$WT/worker/node_modules"
echo "commit $(git -C "$WT" rev-parse --short HEAD)"
(cd "$WT/web" && npx tsc -b && npm run lint > /dev/null && npm run build > /dev/null 2>&1) || fail "step 4: web checks or build failed"
(cd "$WT/worker" && npx tsc --noEmit && npx vitest run > /dev/null 2>&1) || fail "step 4: worker checks or tests failed"
(cd "$WT/worker" && npx wrangler deploy 2>&1 | grep -E "LLM_MODE|Current Version") || fail "step 4: deploy failed"
cleanup_wt
trap - EXIT

# --- 5 ---------------------------------------------------------------------------------------------------
say "5/5 smoke test on $LIVE_URL"
for _ in $(seq 1 20); do curl -s "$LIVE_URL/api/health" | grep -q '"ok":true' && break; sleep 3; done
ask() { curl -s -X POST "$LIVE_URL/api/ask" -H 'content-type: application/json' -d "{\"q\":\"$1\",\"lang\":\"ar\"}"; }
ANSWER="$(ask 'كيف أتوضأ؟')" REFERRAL="$(ask 'هل يجوز لي أن أطلق زوجتي؟')" ABSTAIN="$(ask 'من فاز بكأس العالم لكرة القدم؟')" node -e '
  const a = JSON.parse(process.env.ANSWER), r = JSON.parse(process.env.REFERRAL), x = JSON.parse(process.env.ABSTAIN)
  const problems = []
  if (a.type !== "answer") problems.push("«كيف أتوضأ» gave " + a.type + (a.code ? " (" + a.code + ")" : ""))
  else {
    const generated = [a.direct, ...a.explanation].filter(Boolean).map((s) => s.text).join(" ").trim()
    if (generated.includes("وضع المحاكاة")) problems.push("the answer still carries the mock label")
    // Rule 12: in on_demand (the default) the card carries no generated sentence at all.
    if (a.explain_mode === "on_demand" && generated) problems.push("on_demand answer carries generated text")
    if (!a.quotes.length || !a.quotes.every((q) => q.verified)) problems.push("quotes missing or not verified")
  }
  if (r.type !== "referral") problems.push("the personal-case question gave " + r.type)
  if (x.type !== "abstain") problems.push("the unrelated question gave " + x.type)
  if (problems.length) { console.error("step 5: " + problems.join("; ")); process.exit(1) }
  console.log("ok: answer (" + a.quotes.map((q) => q.ref).join(", ") + "), referral, apology")
' || fail "step 5: smoke test failed (the live model is deployed; check before announcing)"
say "done: the answer engine is live"
