#!/usr/bin/env bash
# The approval pictures of the Lock Screen's widgets, the iOS 18 controls and the tasbih session (add-ons 0072-add18 §3,
# 0072-add19), drawn by the widget extension's own views inside the iOS simulator (alerts-render.swift says how):
#   (cd worker && ALERT_SAMPLES=<samples> npx vitest run test/alerts-0072.test.ts -t samples)
#   bash web/scripts/alerts-render.sh <samples> <out>
# One simulator of its own, «AL iPhone 16 Pro Max», on iOS 26 (created once, in its own device set under
# web/ios/App/build, git-ignored), booted headless and shut down after: Simulator.app never opens and no other
# simulator is touched. The renderer is a command-line program run in the booted device with `simctl spawn`.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$(cd "$HERE/.." && pwd)"
W="$WEB/ios/App/MuslimWidgets"
SAMPLES="${1:?alerts-render.sh <samples dir> <out dir>}"
OUT="${2:?alerts-render.sh <samples dir> <out dir>}"
SET="$WEB/ios/App/build/simset-alerts"
BIN="$WEB/ios/App/build/alerts-render"
RUNTIME="${IOS_SIM_RUNTIME:-com.apple.CoreSimulator.SimRuntime.iOS-26-3}"
sim() { xcrun simctl --set "$SET" "$@"; }
mkdir -p "$SET" "$OUT" "$(dirname "$BIN")"

SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
# The renderer's top-level code must be the program's main.swift.
SRC="$WEB/ios/App/build/alerts-render-src"
mkdir -p "$SRC"
cp "$HERE/alerts-render.swift" "$SRC/main.swift"
xcrun --sdk iphonesimulator swiftc -O -target "$(uname -m)-apple-ios17.0-simulator" -sdk "$SDK" -o "$BIN" \
  "$W/Theme.swift" "$W/Views.swift" "$W/WidgetData.swift" "$W/NameViews.swift" "$W/LockViews.swift" "$SRC/main.swift"
[ -x "$BIN" ] || { echo "alerts-render: the build failed" >&2; exit 1; }

u="$(sim list devices | grep -F "AL iPhone 16 Pro Max (" | grep -oE '[0-9A-F-]{36}' | head -1 || true)"
[ -n "$u" ] || u="$(sim create "AL iPhone 16 Pro Max" com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max "$RUNTIME")"
sim boot "$u" 2>/dev/null || true
sim bootstatus "$u" -b >/dev/null
sim spawn "$u" "$BIN" "$W" "$SAMPLES" "$OUT" || { sim shutdown "$u" 2>/dev/null || true; exit 1; }
sim shutdown "$u" 2>/dev/null || true
