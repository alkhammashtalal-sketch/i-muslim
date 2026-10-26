#!/usr/bin/env bash
# The iCloud copy's switch (add-on 0072-add34 §ب2), in one step: the constant in web/src/storage/cloud.ts and the
# key-value store entitlement in web/ios/App/App/App.entitlements go together (worker/test/icloud-0072.test.ts holds
# them together). `off` is the fix for an archive refused because the app ID has no iCloud yet.
#   bash web/scripts/icloud-switch.sh off|on
set -euo pipefail
WEB="$(cd "$(dirname "$0")/.." && pwd)"
TS="$WEB/src/storage/cloud.ts"
ENT="$WEB/ios/App/App/App.entitlements"
KEY='	<key>com.apple.developer.ubiquity-kvstore-identifier</key>'
VAL='	<string>$(TeamIdentifierPrefix)$(CFBundleIdentifier)</string>'
case "${1:-}" in
  off)
    sed -i '' 's/^export const ICLOUD_SYNC = true$/export const ICLOUD_SYNC = false/' "$TS"
    python3 -I - "$ENT" "$KEY" "$VAL" <<'PY'
import sys
p, k, v = sys.argv[1:4]
s = open(p).read()
s = s.replace(k + "\n" + v + "\n", "")
open(p, "w").write(s)
PY
    ;;
  on)
    sed -i '' 's/^export const ICLOUD_SYNC = false$/export const ICLOUD_SYNC = true/' "$TS"
    grep -q 'ubiquity-kvstore-identifier' "$ENT" || python3 -I - "$ENT" "$KEY" "$VAL" <<'PY'
import sys
p, k, v = sys.argv[1:4]
s = open(p).read()
s = s.replace("<dict>\n", "<dict>\n" + k + "\n" + v + "\n", 1)
open(p, "w").write(s)
PY
    ;;
  *) echo "icloud-switch.sh off|on" >&2; exit 2 ;;
esac
grep -n '^export const ICLOUD_SYNC' "$TS"
plutil -lint "$ENT" >/dev/null && grep -c 'ubiquity-kvstore-identifier' "$ENT" || true
