#!/usr/bin/env bash
# A quick check of next's main routes (reply 0033-add4 §1): run on a version's preview URL before it is deployed, and on
# next itself after. Reads only. Never the frozen live link.
#   scripts/smoke-next.sh https://<version>-i-muslim-next.alkhammashtalal.workers.dev
#   scripts/smoke-next.sh https://i-muslim-next.alkhammashtalal.workers.dev
set -euo pipefail

BASE="${1:?scripts/smoke-next.sh <base URL>}"
BASE="${BASE%/}"
case "$BASE" in
  https://i-muslim.alkhammashtalal.workers.dev | https://i-muslim.alkhammashtalal.workers.dev/*)
    echo "❌ smoke-next: that is the frozen live link (CLAUDE.md §13)" >&2; exit 2 ;;
  https://*i-muslim-next.alkhammashtalal.workers.dev | http://localhost:* | http://127.0.0.1:*) ;;
  *) echo "❌ smoke-next: only next (or its preview URL, or a local preview): $BASE" >&2; exit 2 ;;
esac

fail=0
# check <name> <path> <grep pattern on the body> [extra curl args…]
check() {
  local name="$1" path="$2" pat="$3"; shift 3
  local out code body
  out="$(curl -s -m 20 -w '\n%{http_code}' "$@" "$BASE$path" || true)"
  code="${out##*$'\n'}"
  body="${out%$'\n'*}"
  if [ "$code" = "200" ] && printf '%s' "$body" | grep -q -- "$pat"; then
    echo "ok   $name ($path)"
  else
    echo "FAIL $name ($path): HTTP $code" >&2
    fail=1
  fi
}

check health /api/health '"ok":true'
check ayah /api/sura/1 '"name":"الفاتحة"'
check passage /api/passage/quran:2:255 '"id":"quran:2:255"'
check hadith /api/hadith/5503 '"id":"5503"'
check "day card" '/api/today?lang=ar' '"day"'
check "prayer times page" /today/times '<div id="root">'
check "city list (prayer times)" /geo/cities.json '\['
check "app origin (CORS)" /api/health '"ok":true' -H 'Origin: capacitor://localhost'
# The CORS header itself for the iOS app.
if curl -s -m 20 -D - -o /dev/null -H 'Origin: capacitor://localhost' "$BASE/api/health" | grep -qi '^access-control-allow-origin: capacitor://localhost'; then
  echo "ok   CORS for capacitor://localhost"
else
  echo "FAIL CORS for capacitor://localhost" >&2
  fail=1
fi

[ $fail = 0 ] && echo "smoke-next: all passed on $BASE" || { echo "smoke-next: FAILED on $BASE" >&2; exit 1; }
