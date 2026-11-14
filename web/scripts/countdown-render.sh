#!/usr/bin/env bash
# The approval pictures of add-on 0072-add34 §ب6 (the Fajr alarm's alert, imitated) and §ب7 (the next prayer's
# countdown on the Lock Screen, in the Dynamic Island, and its control), drawn by the widget extension's own views inside
# the iOS simulator (countdown-render.swift says how):
#   bash web/scripts/countdown-render.sh <out>
# One simulator of its own, «CD iPhone 16 Pro Max», on iOS 26 (created once, in its own device set under
# web/ios/App/build, git-ignored), booted headless and shut down after: Simulator.app never opens and no other
# simulator is touched. The renderer is a command-line program run in the booted device with `simctl spawn`.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$(cd "$HERE/.." && pwd)"
W="$WEB/ios/App/MuslimWidgets"
OUT="${1:?countdown-render.sh <out dir>}"
SET="$WEB/ios/App/build/simset-countdown"
BIN="$WEB/ios/App/build/countdown-render"
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-26-3}"
sim() { xcrun simctl --set "$SET" "$@"; }
mkdir -p "$SET" "$OUT" "$(dirname "$BIN")"

SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
SRC="$WEB/ios/App/build/countdown-render-src"
mkdir -p "$SRC"
cp "$HERE/countdown-render.swift" "$SRC/main.swift"
xcrun --sdk iphonesimulator swiftc -O -target "$(uname -m)-apple-ios17.0-simulator" -sdk "$SDK" -o "$BIN" \
  "$W/Theme.swift" "$W/Views.swift" "$W/WidgetData.swift" "$W/CountdownViews.swift" "$SRC/main.swift"
[ -x "$BIN" ] || { echo "countdown-render: the build failed" >&2; exit 1; }

u="$(sim list devices | grep -F "CD iPhone 16 Pro Max (" | grep -oE '[0-9A-F-]{36}' | head -1 || true)"
[ -n "$u" ] || u="$(sim create "CD iPhone 16 Pro Max" com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max "$RUNTIME")"
sim boot "$u" 2>/dev/null || true
sim bootstatus "$u" -b >/dev/null
sim spawn "$u" "$BIN" "$W" "$OUT" || { sim shutdown "$u" 2>/dev/null || true; exit 1; }
sim shutdown "$u" 2>/dev/null || true
