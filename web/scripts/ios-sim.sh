#!/usr/bin/env bash
# Runs the simulator build (ios-build.sh sim) with no window and nothing to tap (reply 0033-add3):
#   bash web/scripts/ios-sim.sh up                          create once and boot an iPhone 16 Pro Max, Arabic, 9:41, install the app
#   bash web/scripts/ios-sim.sh shot <file.png> [route] [s]  open the app at a route (e.g. quran/2) and save a screenshot
#   bash web/scripts/ios-sim.sh down                        shut the device down
# The device lives in a device set of its own under web/ios/App/build (xcrun simctl --set), booted headless: Simulator.app
# is never opened (no `open -a Simulator`, no osascript), and the user's own simulators are not touched.
# The 6.9-inch iPhone 16 Pro Max gives the App Store's 1320 × 2868 screenshots.
set -euo pipefail

WEB="$(cd "$(dirname "$0")/.." && pwd)"
SET="$WEB/ios/App/build/simset"
ID=com.alkhammashtalal.imuslim
TYPE=com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-18-5}"
APP="$WEB/ios/App/build/DerivedData-sim/Build/Products/Debug-iphonesimulator/App.app"
sim() { xcrun simctl --set "$SET" "$@"; }
mkdir -p "$SET"
UDID="$(cat "$SET/udid" 2>/dev/null || true)"

case "${1:-}" in
  up)
    [ -d "$APP" ] || { echo "ios-sim: no simulator build; run ios-build.sh sim" >&2; exit 1; }
    fresh=0
    if [ -z "$UDID" ]; then
      UDID="$(sim create "iPhone 16 Pro Max" "$TYPE" "$RUNTIME")"
      echo "$UDID" > "$SET/udid"
      fresh=1
    fi
    sim boot "$UDID" 2>/dev/null || true
    sim bootstatus "$UDID" -b >/dev/null
    if [ $fresh = 1 ]; then
      # Arabic and Saudi Arabia, read at boot: written once, then one restart.
      sim spawn "$UDID" defaults write -g AppleLanguages -array ar en
      sim spawn "$UDID" defaults write -g AppleLocale ar_SA
      sim shutdown "$UDID"
      sim boot "$UDID"
      sim bootstatus "$UDID" -b >/dev/null
    fi
    sim ui "$UDID" appearance light
    sim status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100
    sim install "$UDID" "$APP"
    echo "ios-sim: $UDID up, app installed" ;;
  shot)
    OUTFILE="${2:?ios-sim shot <file.png> [route] [seconds]}"; ROUTE="${3:-}"; WAIT="${4:-8}"
    C="$(sim get_app_container "$UDID" "$ID" app)"
    # Open at a route: Capacitor's server.appStartPath, in the installed copy only (the start path must exist in public/).
    node -e '
      const fs = require("fs"); const [f, route] = process.argv.slice(1)
      const c = JSON.parse(fs.readFileSync(f, "utf8")); c.server = c.server || {}
      if (route) c.server.appStartPath = route; else delete c.server.appStartPath
      fs.writeFileSync(f, JSON.stringify(c, null, "\t") + "\n")' "$C/capacitor.config.json" "$ROUTE"
    [ -z "$ROUTE" ] || mkdir -p "$C/public/$ROUTE"
    sim terminate "$UDID" "$ID" >/dev/null 2>&1 || true
    sim launch "$UDID" "$ID" >/dev/null
    sleep "$WAIT"
    mkdir -p "$(dirname "$OUTFILE")"
    sim io "$UDID" screenshot "$OUTFILE" >/dev/null 2>&1
    echo "$OUTFILE" ;;
  down)
    [ -z "$UDID" ] || sim shutdown "$UDID" 2>/dev/null || true
    echo "ios-sim: down" ;;
  *) echo "ios-sim: up | shot <file.png> [route] [seconds] | down" >&2; exit 2 ;;
esac
