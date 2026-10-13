#!/usr/bin/env bash
# Builds the iOS app with no keychain and no window (reply 0033-add3):
#   bash web/scripts/ios-build.sh [sim|device|archive|archive-signed|upload] [xcodebuild options…]
#     sim (default)   Debug for the simulator          device   Release for iPhone, unsigned (a size check)
#     archive         the App Store archive, unsigned  archive-signed   the same, signed automatically (team Z5XP77C6S7)
#     upload          export the archive to App Store Connect for TestFlight internal testing (web/ios/ExportOptions.plist)
#   The first upload (13 October, build 1) exported the UNSIGNED archive: with the API key and -allowProvisioningUpdates
#   xcodebuild signs for distribution in Apple's cloud, so no signing key on this Mac and no keychain is touched.
#   e.g. a build that downloads every package again, as on a new Mac: … sim -packageCachePath /tmp/x -disablePackageRepositoryCache
# Signing and upload use an App Store Connect API key, never the Xcode account in the keychain (reply 0033-add5):
#   ASC_KEY_ID=… ASC_ISSUER_ID=… [ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_<id>.p8]
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
  archive | archive-signed | upload)
    ARCHIVE="$OUT/App.xcarchive"
    TEAM=Z5XP77C6S7
    AUTH=()
    if [ "$MODE" != archive ]; then
      : "${ASC_KEY_ID:?ios-build: ASC_KEY_ID (an App Store Connect API key) is needed to sign and upload}"
      : "${ASC_ISSUER_ID:?ios-build: ASC_ISSUER_ID is needed with the key}"
      KEY="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
      [ -f "$KEY" ] || { echo "ios-build: no key file at $KEY" >&2; exit 1; }
      AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
    fi
    case "$MODE" in
      archive)
        xcodebuild "${COMMON[@]}" -configuration Release -destination 'generic/platform=iOS' \
          -derivedDataPath "$OUT/DerivedData-archive" -archivePath "$ARCHIVE" CODE_SIGNING_ALLOWED=NO "${@:2}" archive ;;
      archive-signed)
        xcodebuild "${COMMON[@]}" -configuration Release -destination 'generic/platform=iOS' \
          -derivedDataPath "$OUT/DerivedData-archive" -archivePath "$ARCHIVE" "${AUTH[@]}" \
          DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic "${@:2}" archive ;;
      upload)
        [ -d "$ARCHIVE" ] || { echo "ios-build: no archive at $ARCHIVE; run archive or archive-signed first" >&2; exit 1; }
        xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$WEB/ios/ExportOptions.plist" \
          -exportPath "$OUT/export" "${AUTH[@]}" "${@:2}" ;;
    esac
    echo "ios-build: $MODE done ($ARCHIVE)" ;;
  *) echo "ios-build: sim, device, archive, archive-signed or upload, not '$MODE'" >&2; exit 2 ;;
esac
