#!/usr/bin/env bash
# The approval shots of the date card's sky in the iOS simulator, in the app's own WKWebView (add-on 0071-add16, "the
# test before approval" 2; not Chromium):
#   VITE_SKY_TEST=1 npm run build:native && npx cap copy ios && bash scripts/ios-build.sh sim     (in web/; a TEST build)
#   bash web/scripts/sky-sim-shots.sh <out dir> [all|six|t13]
# An iPhone 16e (390 × 844 pt, 3x) in a device set of its own under web/ios/App/build (git-ignored), booted headless;
# Simulator.app is never opened and the user's simulators are not touched. Each shot writes /sky-test.json into the
# installed app's own folder (web/src/sky-test.ts reads it before the first paint: the place, the language, the clock
# moved to the shot's moment, or «before»: no sky), relaunches the app and saves the screen.
# Riyadh, 22 October 2026, at the shots' times: night 21:30, Fajr 05:05, morning 08:00, Dhuhr 12:15, Asr 15:45,
# Maghrib 17:40. The 135% text size is the phone's Dynamic Type at XXXL (body 23 pt; web/src/text-size.ts).
set -euo pipefail

WEB="$(cd "$(dirname "$0")/.." && pwd)"
SET="$WEB/ios/App/build/simset-sky"
ID=com.alkhammashtalal.imuslim
TYPE=com.apple.CoreSimulator.SimDeviceType.iPhone-16e
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-18-5}"
APP="$WEB/ios/App/build/DerivedData-sim/Build/Products/Debug-iphonesimulator/App.app"
OUT="${1:?sky-sim-shots <out dir> [all|six|t13]}"
WHAT="${2:-all}"
sim() { xcrun simctl --set "$SET" "$@"; }
[ -d "$APP" ] || { echo "sky-sim-shots: no simulator build; run ios-build.sh sim on a VITE_SKY_TEST=1 build" >&2; exit 1; }
grep -rq "sky-test.json" "$APP/public/assets" || { echo "sky-sim-shots: the app is not a TEST build (VITE_SKY_TEST=1)" >&2; exit 1; }
mkdir -p "$SET" "$OUT"

UDID="$(cat "$SET/udid" 2>/dev/null || true)"
if [ -z "$UDID" ]; then
  UDID="$(sim create "iPhone 16e sky" "$TYPE" "$RUNTIME")"
  echo "$UDID" > "$SET/udid"
fi
sim boot "$UDID" 2>/dev/null || true
sim bootstatus "$UDID" -b >/dev/null
sim ui "$UDID" appearance light
sim status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100
sim install "$UDID" "$APP"
C="$(sim get_app_container "$UDID" "$ID" app)"

PLACE='{"lat":24.6877,"lng":46.7219,"timeZone":"Asia/Riyadh","name":"الرياض","source":"city"}'
shot() { # <name> <json> [content size]
  printf '%s' "$2" > "$C/public/sky-test.json"
  sim ui "$UDID" content_size "${3:-large}"
  sim terminate "$UDID" "$ID" >/dev/null 2>&1 || true
  sim launch "$UDID" "$ID" >/dev/null
  sleep "${WAIT:-8}"
  sim io "$UDID" screenshot "$OUT/$1.png" >/dev/null 2>&1
  echo "$OUT/$1.png"
}
at() { echo "2026-10-22T$1:00+03:00"; }

if [ "$WHAT" = all ] || [ "$WHAT" = six ]; then
  for lang in ar en; do
    shot "sim-before-$lang-390" "{\"at\":\"$(at 21:30)\",\"lang\":\"$lang\",\"place\":$PLACE,\"before\":true}"
    for t in night=21:30 fajr=05:05 morning=08:00 dhuhr=12:15 asr=15:45 maghrib=17:40; do
      shot "sim-${t%%=*}-$lang-390" "{\"at\":\"$(at "${t#*=}")\",\"lang\":\"$lang\",\"place\":$PLACE}"
    done
  done
fi
if [ "$WHAT" = all ] || [ "$WHAT" = t13 ]; then
  # T13: Bengali and Hindi in the phone's own fonts, at 100% and 135%.
  for lang in bn hi; do
    shot "sim-t13-asr-$lang-100" "{\"at\":\"$(at 15:45)\",\"lang\":\"$lang\",\"place\":$PLACE}" large
    shot "sim-t13-asr-$lang-135" "{\"at\":\"$(at 15:45)\",\"lang\":\"$lang\",\"place\":$PLACE}" extra-extra-extra-large
  done
  sim ui "$UDID" content_size large
fi
rm -f "$C/public/sky-test.json"
echo "sky-sim-shots: $UDID"
