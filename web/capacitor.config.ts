// The iOS and Android app (Capacitor; reply 0033 §ب1). The interface is the native build in dist/ (`npm run
// build:native`), carried inside the app: there is no server.url, so nothing of the interface is loaded from a website.
// /api/* goes to VITE_API_BASE (web/src/api/base.ts). The app's identifier is the same on both platforms and becomes
// fixed at the first upload to Apple or Google (until then, Talal may ask for another). The name under the icon is the
// web app's short_name. Version 1.0.0, build 1: ios/App/App.xcodeproj (MARKETING_VERSION, CURRENT_PROJECT_VERSION) and
// android/app/build.gradle (versionName, versionCode); worker/test/native-shell.test.ts checks all of this.
import type { CapacitorConfig } from '@capacitor/cli'
import manifest from './pwa-manifest.json' with { type: 'json' }

const config: CapacitorConfig = {
  appId: 'com.alkhammashtalal.imuslim',
  appName: manifest.short_name,
  webDir: 'dist',
  plugins: {
    // The bells and the portion reminder (reply 0033 §ب3): shown as a banner and kept in the list, with the system's
    // sound, also while the app is open; never a number on the icon (no counters, CLAUDE.md §11).
    LocalNotifications: { presentationOptions: ['banner', 'list', 'sound'] },
  },
}

export default config
