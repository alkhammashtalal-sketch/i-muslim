#!/usr/bin/env bash
# The sky widgets' review pictures on macOS (add-on 0072-add53): sky-render-mac.swift compiled with the widget
# extension's own views and run on the Mac, no simulator (a plain swiftc build of five files; no lock needed).
#   (cd worker && WIDGET_SAMPLES=<samples> npx vitest run test/widget-names-0072.test.ts -t samples)
#   bash web/scripts/sky-render-mac.sh <samples> <out> [<widgets dir>]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="${3:-$HERE/../ios/App/MuslimWidgets}"
SAMPLES="${1:?sky-render-mac.sh <samples dir> <out dir> [<widgets dir>]}"
OUT="${2:?sky-render-mac.sh <samples dir> <out dir> [<widgets dir>]}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$HERE/sky-render-mac.swift" "$TMP/main.swift"
xcrun swiftc -O -target "$(uname -m)-apple-macos14.0" -o "$TMP/sky-render" \
  "$W/Theme.swift" "$W/Views.swift" "$W/WidgetData.swift" "$W/NameViews.swift" "$TMP/main.swift"
"$TMP/sky-render" "$W" "$SAMPLES" "$OUT"
