#!/usr/bin/env bash
# Builds the Android app with no window and no prompt (reply 0066):
#   bash web/scripts/android-build.sh [debug|release]
#     debug (default)  app-debug.apk, debuggable: the emulator checks (its web view can be inspected)
#     release          app-release.aab for Google Play and app-release.apk to try, both signed with the upload key
# The web side must be built and copied first: npm run build:native && npm run cap:sync:android (in web/).
# Tools: JDK 21 (Capacitor 8; Gradle 8.14 does not run on Android Studio's own JDK 25) and the Android SDK in
# ~/Library/Android/sdk, or JAVA_HOME and ANDROID_HOME when set.
# The upload key: ~/keys/i-muslim-upload.jks (IMUSLIM_UPLOAD_STORE to use another), its password read from the login
# Keychain item «i-muslim-upload-keystore» for this build only, never written to a file or printed. Nothing is uploaded.
set -euo pipefail
MODE="${1:-debug}"
WEB="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$WEB/android"
[ -f "$ANDROID/app/src/main/assets/public/index.html" ] || { echo "android-build: the web app is not in the project; run npm run build:native && npm run cap:sync:android first" >&2; exit 1; }

export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21)}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
# Java in English whatever the Mac's language, so no tool writes Arabic-Indic digits into a build file.
export JAVA_TOOL_OPTIONS="-Duser.language=en -Duser.country=US"
GRADLE=("$ANDROID/gradlew" -p "$ANDROID" --console=plain)

case "$MODE" in
  debug)
    "${GRADLE[@]}" assembleDebug
    ls -l "$ANDROID/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  release)
    export IMUSLIM_UPLOAD_STORE="${IMUSLIM_UPLOAD_STORE:-$HOME/keys/i-muslim-upload.jks}"
    [ -f "$IMUSLIM_UPLOAD_STORE" ] || { echo "android-build: no upload key at $IMUSLIM_UPLOAD_STORE" >&2; exit 1; }
    IMUSLIM_UPLOAD_PASSWORD="$(security find-generic-password -s i-muslim-upload-keystore -a upload -w)"
    export IMUSLIM_UPLOAD_PASSWORD
    "${GRADLE[@]}" bundleRelease assembleRelease
    unset IMUSLIM_UPLOAD_PASSWORD
    AAB="$ANDROID/app/build/outputs/bundle/release/app-release.aab"
    APK="$ANDROID/app/build/outputs/apk/release/app-release.apk"
    ls -l "$AAB" "$APK"
    # Signed with the upload key: the APK by apksigner, the bundle by jarsigner (both print the certificate's subject).
    "$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --print-certs "$APK" | grep -E "Signer #1 certificate (DN|SHA-256)"
    "$JAVA_HOME/bin/jarsigner" -verify "$AAB" | tail -1
    shasum -a 256 "$AAB" "$APK"
    ;;
  *)
    echo "android-build: debug or release" >&2
    exit 2
    ;;
esac
