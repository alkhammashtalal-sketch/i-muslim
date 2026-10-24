#!/usr/bin/env bash
# The calendar's shots and «أضف إلى تقويم الجهاز» in the iOS simulator (reply 0062 §4; reply 0072 item 14), in the
# app's own WKWebView and the simulator's own calendar, never Talal's:
#   VITE_CAL_TEST=1 npm run build:native && npx cap copy ios && bash scripts/ios-build.sh sim     (in web/; a TEST build)
#   bash web/scripts/cal-sim-shots.sh up                                  create once, boot, Arabic, install the app
#   bash web/scripts/cal-sim-shots.sh shot <file.png> '<json>'|@f [size] [s] open the calendar page with /cal-test.json
#                                                                         (cal-test.ts: lang, offset, steps) and save the screen
#   bash web/scripts/cal-sim-shots.sh privacy grant|revoke|reset          the simulator's calendar permission for the app
#   bash web/scripts/cal-sim-shots.sh events                              the events in the simulator's calendar, with alarms
#   bash web/scripts/cal-sim-shots.sh calshow <YYYY-MM-DD> <file.png>     the simulator's Calendar app on a day, and its screen
#   bash web/scripts/cal-sim-shots.sh down
# An iPhone 16e (390 × 844 pt) on iOS 18.5, in a device set of its own under web/ios/App/build (git-ignored), booted
# headless: Simulator.app is never opened and the user's own simulators are not touched. The 135% text size is the
# phone's Dynamic Type at XXXL (extra-extra-extra-large; web/src/text-size.ts).
set -euo pipefail

WEB="$(cd "$(dirname "$0")/.." && pwd)"
SET="$WEB/ios/App/build/simset-cal"
ID=com.alkhammashtalal.imuslim
TYPE=com.apple.CoreSimulator.SimDeviceType.iPhone-16e
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-18-5}"
APP="$WEB/ios/App/build/DerivedData-sim/Build/Products/Debug-iphonesimulator/App.app"
ROUTE=today/calendar
sim() { xcrun simctl --set "$SET" "$@"; }
mkdir -p "$SET"
UDID="$(cat "$SET/udid" 2>/dev/null || true)"
DB() { echo "$SET/$UDID/data/Library/Calendar/Calendar.sqlitedb"; }

case "${1:-}" in
  up)
    [ -d "$APP" ] || { echo "cal-sim-shots: no simulator build; run ios-build.sh sim" >&2; exit 1; }
    grep -rq "cal-test.json" "$APP/public/assets" || { echo "cal-sim-shots: the app is not a TEST build (VITE_CAL_TEST=1)" >&2; exit 1; }
    fresh=0
    if [ -z "$UDID" ]; then
      UDID="$(sim create "iPhone 16e calendar" "$TYPE" "$RUNTIME")"
      echo "$UDID" > "$SET/udid"
      fresh=1
    fi
    sim boot "$UDID" 2>/dev/null || true
    sim bootstatus "$UDID" -b >/dev/null
    if [ $fresh = 1 ]; then
      sim spawn "$UDID" defaults write -g AppleLanguages -array ar en
      sim spawn "$UDID" defaults write -g AppleLocale ar_SA
      sim shutdown "$UDID"
      sim boot "$UDID"
      sim bootstatus "$UDID" -b >/dev/null
    fi
    sim ui "$UDID" appearance light
    sim status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100
    sim install "$UDID" "$APP"
    C="$(sim get_app_container "$UDID" "$ID" app)"
    node -e '
      const fs = require("fs"); const [f, route] = process.argv.slice(1)
      const c = JSON.parse(fs.readFileSync(f, "utf8")); c.server = c.server || {}; c.server.appStartPath = route
      fs.writeFileSync(f, JSON.stringify(c, null, "\t") + "\n")' "$C/capacitor.config.json" "$ROUTE"
    mkdir -p "$C/public/$ROUTE"
    echo "cal-sim-shots: $UDID up, app installed" ;;
  shot)
    OUTFILE="${2:?shot <file.png> <json> [size] [seconds]}"; JSON="${3:-{\}}"; SIZE="${4:-large}"; WAIT="${5:-9}"
    C="$(sim get_app_container "$UDID" "$ID" app)"
    # '@file' reads the shot's JSON from a file.
    case "$JSON" in @*) cp "${JSON#@}" "$C/public/cal-test.json" ;; *) printf '%s' "$JSON" > "$C/public/cal-test.json" ;; esac
    sim ui "$UDID" content_size "$SIZE"
    sim terminate "$UDID" "$ID" >/dev/null 2>&1 || true
    sim launch "$UDID" "$ID" >/dev/null
    sleep "$WAIT"
    mkdir -p "$(dirname "$OUTFILE")"
    sim io "$UDID" screenshot "$OUTFILE" >/dev/null 2>&1
    echo "$OUTFILE" ;;
  privacy)
    sim privacy "$UDID" "${2:?grant|revoke|reset}" calendar "$ID" ;;
  events)
    # Apple's store of the simulator's calendar (read here, on the Mac, as a check; the app never reads it), the default
    # calendar for new events only (not the simulator's holidays and birthdays). Dates are seconds from 2001-01-01; an
    # all-day event's are in UTC. An alarm marked «*» is the calendar's own default alert (Settings → Calendar →
    # Default Alert Times), which iOS adds by itself.
    sqlite3 -header -column "$(DB)" "
      SELECT ci.summary AS title,
        CASE ci.all_day WHEN 1 THEN date(ci.start_date + 978307200, 'unixepoch') ELSE datetime(ci.start_date + 978307200, 'unixepoch', 'localtime') END AS start,
        CASE ci.all_day WHEN 1 THEN date(ci.end_date + 978307200, 'unixepoch') ELSE datetime(ci.end_date + 978307200, 'unixepoch', 'localtime') END AS 'end',
        ci.all_day, replace(ci.description, char(10), ' | ') AS notes,
        (SELECT group_concat(a.trigger_interval || CASE a.default_alarm WHEN 1 THEN '*' ELSE '' END) FROM Alarm a WHERE a.calendaritem_owner_id = ci.ROWID) AS alarms_s
      FROM CalendarItem ci JOIN Calendar c ON c.ROWID = ci.calendar_id
      WHERE c.title = 'DEFAULT_CALENDAR_NAME' ORDER BY ci.start_date;" ;;
  calshow)
    DAY="${2:?calshow <YYYY-MM-DD> <file.png>}"; OUTFILE="${3:?}"
    S=$(( $(TZ=UTC date -j -f "%Y-%m-%d %H:%M" "$DAY 09:00" +%s) - 978307200 ))
    # The simulator's Calendar shows its «What's New» page first: marked as seen (the simulator's preferences only).
    sim spawn "$UDID" defaults write com.apple.mobilecal LastConfirmedSplashScreenVersion -int 100
    sim spawn "$UDID" defaults write com.apple.mobilecal UITestingLastConfirmedSplashScreenVersionViewed -int 100
    # And it asks for the location on first launch: refused for it, so nothing covers the day.
    sim privacy "$UDID" revoke location com.apple.mobilecal >/dev/null 2>&1 || true
    sim terminate "$UDID" com.apple.mobilecal >/dev/null 2>&1 || true
    sim openurl "$UDID" "calshow:$S"
    sleep 5
    sim io "$UDID" screenshot "$OUTFILE" >/dev/null 2>&1
    echo "$OUTFILE" ;;
  down)
    [ -z "$UDID" ] || sim shutdown "$UDID" 2>/dev/null || true
    echo "cal-sim-shots: down" ;;
  *) echo "cal-sim-shots: up | shot <file.png> <json> [size] [s] | privacy grant|revoke|reset | events | calshow <day> <file.png> | down" >&2; exit 2 ;;
esac
