#!/usr/bin/env bash
# What the published iOS app 1.0.0 (16, commit 4a2b510) asks next, with its own parameters and origin, and the fields it
# reads in each answer (add-on 0072-add61 §1). Reads only (GET and one OPTIONS); with --ask, also one POST /api/ask whose
# question is referred by the level gate with no model call (it counts one question in that day's limit for this
# device). The full check, every request and every field's type, is worker/test/compat-ios-1.0.0.test.ts, which runs in
# scripts/deploy.sh's `npm test` before anything is uploaded; this is the same on the real server.
# next has no preview URLs (its Durable Object, scripts/deploy.sh), so: on next just before the deploy and again just
# after; both runs must print the same «ok» lines.
#   scripts/smoke-ios-1.0.sh https://i-muslim-next.alkhammashtalal.workers.dev [--ask]
set -uo pipefail

URL="${1:?scripts/smoke-ios-1.0.sh <base URL> [--ask]}"
URL="${URL%/}"
# Exact hosts only (a glob «*» would also match «?», «/» or «@» and could reach another host).
if [[ "$URL" =~ ^https://i-muslim\.alkhammashtalal\.workers\.dev ]]; then
  echo "❌ smoke-ios-1.0: that is the frozen live link (CLAUDE.md §13)" >&2; exit 2
fi
if ! [[ "$URL" =~ ^https://([a-z0-9]+-)?i-muslim-next\.alkhammashtalal\.workers\.dev$|^https://i-muslim-v11\.alkhammashtalal\.workers\.dev$|^http://(localhost|127\.0\.0\.1):[0-9]+$ ]]; then
  echo "❌ smoke-ios-1.0: only next, v11, or a local server: $URL" >&2; exit 2
fi
command -v jq >/dev/null || { echo "❌ smoke-ios-1.0: jq is needed" >&2; exit 2; }

H='Origin: capacitor://localhost'
fail=0
j() {
  if curl -sS -m 20 -H "$H" "$URL$1" | jq -e "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1" >&2; fail=1; fi
}
j /api/suras 'length==114 and (.[0]|has("n") and has("name") and has("ayat") and has("page"))'
j /api/sura/1 '.n==1 and (.ayat|length==7) and (.ayat[0]|has("aya") and has("id") and has("text") and has("page")) and has("basmala")'
j '/api/sura/1?en=1&ml=ur' '(.ayat[0]|has("text")) and has("meaning_translator") and .meaning_lang=="ur"'
j /api/passage/quran:2:255 '.id=="quran:2:255" and .kind=="ayah" and (.tafsir|type=="array") and (.ayah|has("sura") and has("aya") and has("suraName"))'
j '/api/passage/quran:2:255?ml=ur' '.meaning.text and .meaning.translator'
j /api/passage/aqeedah:usul:001 '.id=="aqeedah:usul:001" and .text and .ref and .url'
j /api/books 'length>=3 and (.[0]|has("key") and has("name") and has("segments") and has("chapters"))'
j /api/book/usul '.key=="usul" and (.chapters|type=="array")'
j /api/quarters 'length==240 and (.[0]|has("q") and has("sura") and has("aya") and has("page") and has("first"))'
j /api/meanings/ur/1 '.lang=="ur" and .sura==1 and (.meanings["1"]|has("text") and has("translator"))'
j /api/explain 'has("enabled")'
j /api/config/hijri 'has("offset")'
j /api/reviewed/en/112/1 'type=="object"'
j '/api/hadith/5503?lang=ar' '.ar.id=="5503" and .ar.text and .ar.grade and .ar.url'
j '/api/hadith/5503?lang=en' '.ar.id=="5503" and (.tr==null or .tr.text)'
j /api/hadith/5503/same-topic '.items|type=="array"'
j '/api/hadith/5503/quiz?lang=ar' '.questions|type=="array"'
j '/api/today?lang=ar' '.day and (.hadith==null or .hadith.ar.text)'
j '/api/today/days?n=60' '(.days|length==60) and (.days[0]|has("day") and has("hadith"))'
j '/api/asbab/2/255?lang=ar' 'has("ayah") and (.items|type=="array")'
j '/api/adhkar/301?lang=ar' '.category and (.items|length>0)'
j '/api/starter/islam/stories?lang=ar' '.step=="islam" and (.stories|type=="array") and (.chapters|type=="array")'
j '/api/sources/status?lang=ar' 'has("pending")'
j '/api/mukhtasar/1/1?lang=en' 'has("found") or has("text")'
if curl -sS -m 20 -D - -o /dev/null -H "$H" "$URL/api/suras" | grep -qi '^access-control-allow-origin: capacitor://localhost'; then echo "ok   CORS GET"; else echo "FAIL CORS GET" >&2; fail=1; fi
pre="$(curl -sS -m 20 -D - -o /dev/null -X OPTIONS -H "$H" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' "$URL/api/ask")"
if printf '%s' "$pre" | grep -qi '^access-control-allow-origin: capacitor://localhost' && printf '%s' "$pre" | grep -qi '^access-control-allow-methods:.*POST'; then echo "ok   CORS preflight POST /api/ask"; else echo "FAIL CORS preflight POST /api/ask" >&2; fail=1; fi
if [ "${2:-}" = "--ask" ]; then
  if curl -sS -m 30 -H "$H" -H 'content-type: application/json' -d '{"q":"طلقت زوجتي ثلاثا فما الحكم","lang":"ar","simple":false}' "$URL/api/ask" | jq -e '.type=="referral" and .level=="D" and .message and .link' >/dev/null 2>&1; then
    echo "ok   POST /api/ask without canWait: an answer in the reply (referral), never pending"
  else echo "FAIL POST /api/ask without canWait" >&2; fail=1; fi
fi

[ $fail = 0 ] && echo "smoke-ios-1.0: all passed on $URL" || { echo "smoke-ios-1.0: FAILED on $URL" >&2; exit 1; }
