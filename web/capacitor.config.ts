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
}

export default config
