#!/usr/bin/env bash
# The Android widgets' review pictures and the widget list's previews (stars-fix, Opus review of stars-0072 #3):
# WidgetRenderTest (web/android/app/src/androidTest) draws every widget with WidgetPainter on a running emulator or
# device and writes PNGs; this copies the samples in and the pictures out. Heavy work: take ~/.lock-sim first
# (.claude/skills/heavy-locks), and start the emulator read-only (`emulator -avd <avd> -no-window -read-only`).
#   (cd worker && WIDGET_SAMPLES=<samples> npx vitest run test/widget-names-0072.test.ts -t samples)
#   bash web/scripts/android-widget-render.sh <samples dir> <out dir>
# <samples dir> holds sample-<lang>-2.json, and sample-<lang>-2-blank.json (every nameDays[].of = "") for the contrast
# pictures. The debug app and its test APK must be built: ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
# (the app module only: the plugins module's own androidTest has duplicate Kotlin classes).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SAMPLES="${1:?android-widget-render.sh <samples dir> <out dir>}"
OUT="${2:?android-widget-render.sh <samples dir> <out dir>}"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PKG=com.alkhammashtalal.imuslim
APKS="$HERE/../android/app/build/outputs/apk"
"$ADB" install -r -t "$APKS/debug/app-debug.apk" >/dev/null
"$ADB" install -r -t "$APKS/androidTest/debug/app-debug-androidTest.apk" >/dev/null
"$ADB" shell run-as "$PKG" rm -rf files/render
"$ADB" shell run-as "$PKG" mkdir -p files/render/in
for f in "$SAMPLES"/sample-ar-2.json "$SAMPLES"/sample-en-2.json "$SAMPLES"/sample-ar-2-blank.json "$SAMPLES"/sample-en-2-blank.json; do
  [ -f "$f" ] || continue
  "$ADB" push "$f" /data/local/tmp/ >/dev/null
  "$ADB" shell run-as "$PKG" cp "/data/local/tmp/$(basename "$f")" files/render/in/
  "$ADB" shell rm "/data/local/tmp/$(basename "$f")"
done
"$ADB" shell am instrument -w -e class "$PKG.widget.WidgetRenderTest" "$PKG.test/androidx.test.runner.AndroidJUnitRunner"
mkdir -p "$OUT"
for f in $("$ADB" shell run-as "$PKG" ls files/render/out | tr -d '\r'); do
  "$ADB" exec-out run-as "$PKG" cat "files/render/out/$f" > "$OUT/$f"
done
ls "$OUT" | wc -l
