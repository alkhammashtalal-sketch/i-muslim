// The iOS and Android app (Capacitor; reply 0033 §ب1). The interface is the native build in dist/ (`npm run
// build:native`), carried inside the app: there is no server.url, so nothing of the interface is loaded from a website.
// /api/* goes to VITE_API_BASE (web/src/api/base.ts). The app's identifier is the same on both platforms and becomes
// fixed at the first upload to Apple or Google (until then, Talal may ask for another). The name under the icon is the
// web app's short_name. Version 1.0.0, build 1: ios/App/App.xcodeproj (MARKETING_VERSION, CURRENT_PROJECT_VERSION) and
// android/app/build.gradle (versionName, versionCode); worker/test/native-shell.test.ts checks all of this.
import type { CapacitorConfig } from '@capacitor/cli'
import manifest from './pwa-manifest.json' with { type: 'json' }

/** The iPhone app's plugins, exactly those of ios/App/CapApp-SPM/Package.swift (build 16). A plugin added for Android
 *  alone (reply 0067: @capacitor-community/text-to-speech) is then never added to the iPhone app by a `cap sync ios`:
 *  the iPhone stays as it is until the iPhone's own work adds a plugin here (worker/test/native-shell.test.ts). */
export const IOS_PLUGINS = [
  '@capacitor-community/keep-awake',
  '@capacitor/app',
  '@capacitor/app-launcher',
  '@capacitor/filesystem',
  '@capacitor/geolocation',
  '@capacitor/haptics',
  '@capacitor/local-notifications',
  '@capacitor/network',
  '@capacitor/share',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
]

const config: CapacitorConfig = {
  appId: 'com.alkhammashtalal.imuslim',
  appName: manifest.short_name,
  webDir: 'dist',
  ios: { includePlugins: IOS_PLUGINS },
  plugins: {
    // The bells and the portion reminder (reply 0033 §ب3): shown as a banner and kept in the list, with the system's
    // sound, also while the app is open; never a number on the icon (no counters, CLAUDE.md §11).
    LocalNotifications: { presentationOptions: ['banner', 'list', 'sound'] },
    // The launch screen (the welcome painting, 0049 ب) stays until the first view is drawn (src/native/launch.ts),
    // and goes by itself after four seconds if that never comes.
    SplashScreen: { launchShowDuration: 4000, launchAutoHide: true, showSpinner: false },
  },
}

export default config
