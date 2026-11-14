#!/usr/bin/env bash
# The approval pictures of the widgets «اسم الله لليوم» and «من أقوال السلف» (add-on 0072-add10), drawn by the widget
# extension's own views inside the iOS simulator (widget-render.swift says how):
#   (cd worker && WIDGET_SAMPLES=<samples> npx vitest run test/widget-names-0072.test.ts -t samples)
#   bash web/scripts/widget-render.sh <samples> <out>
# Two simulators of their own, «NW iPhone 16 Pro Max» and «NW iPhone SE», on iOS 26 (created once, in their own
# device set under web/ios/App/build, git-ignored), booted headless: Simulator.app never opens and no other simulator is
# touched. The renderer is a command-line program run in the booted device with `simctl spawn`.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$(cd "$HERE/.." && pwd)"
W="$WEB/ios/App/MuslimWidgets"
SAMPLES="${1:?run.sh <samples dir> <out dir>}"
OUT="${2:?run.sh <samples dir> <out dir>}"
SET="$WEB/ios/App/build/simset-names-widget"
BIN="$WEB/ios/App/build/widget-render"
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-26-3}"
sim() { xcrun simctl --set "$SET" "$@"; }
mkdir -p "$SET" "$OUT" "$(dirname "$BIN")"

SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
# The renderer's top-level code compiles only as the program's main.swift among several files.
MAIN="$(dirname "$BIN")/widget-render-main/main.swift"
mkdir -p "$(dirname "$MAIN")" && cp "$HERE/widget-render.swift" "$MAIN" && rm -f "$BIN"
ARCH="$(uname -m)"; [ "$ARCH" = arm64 ] || ARCH=x86_64
xcrun --sdk iphonesimulator swiftc -O -target "$ARCH-apple-ios17.0-simulator" -sdk "$SDK" -o "$BIN" \
  "$W/Theme.swift" "$W/Views.swift" "$W/WidgetData.swift" "$W/NameViews.swift" "$MAIN" 2>&1 | grep -v "^$" || true
[ -x "$BIN" ] || { echo "widget-render: the build failed" >&2; exit 1; }

device() { # <name> <type> → udid
  local u
  u="$(sim list devices | grep -F "$1 (" | grep -oE '[0-9A-F-]{36}' | head -1 || true)"
  [ -n "$u" ] || u="$(sim create "$1" "$2" "$RUNTIME")"
  echo "$u"
}
for d in "promax:NW iPhone 16 Pro Max:com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max" \
         "se:NW iPhone SE:com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation"; do
  key="${d%%:*}"; rest="${d#*:}"; name="${rest%%:*}"; type="${rest#*:}"
  udid="$(device "$name" "$type")"
  sim boot "$udid" 2>/dev/null || true
  sim bootstatus "$udid" -b >/dev/null
  sim spawn "$udid" "$BIN" "$W" "$SAMPLES" "$OUT" "$key"
  sim shutdown "$udid" 2>/dev/null || true
done
