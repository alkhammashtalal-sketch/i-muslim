#!/usr/bin/env bash
# «حساس للوقت» (add-on 0072-add34 §ب5): the Time Sensitive Notifications entitlement in web/ios/App/App/App.entitlements
# (Debug and Release both sign with it). `off` is the fix for a signed export refused because the app ID has no
# «Time Sensitive Notifications» capability yet: without the entitlement the system answers `notSupported`, the settings
# hide the switch and the five prayers' entry alerts arrive as before (alert-sounds.ts timeSensitiveFor), so nothing
# else changes. worker/test/timesensitive-0072.test.ts reads the state from this file.
#   bash web/scripts/timesensitive-switch.sh off|on
set -euo pipefail
WEB="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$WEB/ios/App/App/App.entitlements"
KEY='	<key>com.apple.developer.usernotifications.time-sensitive</key>'
VAL='	<true/>'
case "${1:-}" in
  off)
    python3 -I - "$ENT" "$KEY" "$VAL" <<'PY'
import sys
p, k, v = sys.argv[1:4]
s = open(p).read()
s = s.replace(k + "\n" + v + "\n", "")
open(p, "w").write(s)
PY
    ;;
  on)
    grep -q 'usernotifications.time-sensitive' "$ENT" || python3 -I - "$ENT" "$KEY" "$VAL" <<'PY'
import sys
p, k, v = sys.argv[1:4]
s = open(p).read()
s = s.replace("\t<key>com.apple.security.application-groups</key>\n", k + "\n" + v + "\n\t<key>com.apple.security.application-groups</key>\n", 1)
open(p, "w").write(s)
PY
    ;;
  *) echo "timesensitive-switch.sh off|on" >&2; exit 2 ;;
esac
plutil -lint "$ENT" >/dev/null && grep -c 'usernotifications.time-sensitive' "$ENT" || true
