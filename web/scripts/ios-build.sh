#!/usr/bin/env bash
# Builds the iOS app with no keychain and no window (reply 0033-add3):
#   bash web/scripts/ios-build.sh [sim|device] [xcodebuild options…]   sim (default): Debug for the simulator; device: Release, unsigned
#   e.g. a build that downloads every package again, as on a new Mac: … sim -packageCachePath /tmp/x -disablePackageRepositoryCache
# The web side must be built and copied first: npm run build:native && npm run cap:sync (in web/).
#
# Why: by default xcodebuild fetches the Swift packages with Xcode's built-in Git. That Git looks up the github.com
# password git saved in the login keychain, and macOS asks the user, once per fetch, to let xcodebuild read it. The
# packages (capacitor-swift-pm, ion-ios-geolocation, ion-ios-filesystem) are public and need no sign-in.
# How, with documented options only:
#  - Apple, "Building Swift packages or apps that use them in continuous integration workflows"
#    (developer.apple.com/documentation/xcode/building-swift-packages-or-apps-that-use-them-in-continuous-integration-workflows):
#    -scmProvider system, so the Mac's git runs the fetches instead of Xcode's built-in Git; Package.resolved is committed
#    and -disableAutomaticPackageResolution keeps the build on exactly its versions.
#  - xcodebuild -help: -packageAuthorizationProvider netrc, "the credential store to be used when resolving packages",
#    instead of the keychain. There is no ~/.netrc, so nothing is sent; the downloads are public.
#  - git(1) and gitcredentials(7): the credential helpers are emptied for these commands (GIT_CONFIG_COUNT,
#    credential.helper = "" resets the list), so git never calls git-credential-osxkeychain, and GIT_TERMINAL_PROMPT=0
#    makes git fail instead of asking.
# The build targets the generic simulator, so no simulator boots and no window opens (running it: ios-sim.sh).
set -euo pipefail

MODE="${1:-sim}"
WEB="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$WEB/ios/App"
OUT="$APP_DIR/build" # git-ignored (web/ios/.gitignore)
[ -d "$APP_DIR/App/public" ] || { echo "ios-build: web/ios/App/App/public is missing; run npm run build:native && npm run cap:sync first" >&2; exit 1; }

export GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0=

COMMON=(
  -project "$APP_DIR/App.xcodeproj" -scheme App
  -scmProvider system
  -packageAuthorizationProvider netrc
  -disableAutomaticPackageResolution
  -clonedSourcePackagesDirPath "$OUT/SourcePackages"
)
case "$MODE" in
  sim)
    xcodebuild "${COMMON[@]}" -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
      -derivedDataPath "$OUT/DerivedData-sim" "${@:2}" build
    echo "ios-build: $OUT/DerivedData-sim/Build/Products/Debug-iphonesimulator/App.app" ;;
  device)
    xcodebuild "${COMMON[@]}" -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
      -derivedDataPath "$OUT/DerivedData-device" CODE_SIGNING_ALLOWED=NO "${@:2}" build
    echo "ios-build: $OUT/DerivedData-device/Build/Products/Release-iphoneos/App.app (unsigned)" ;;
  *) echo "ios-build: sim or device, not '$MODE'" >&2; exit 2 ;;
esac
