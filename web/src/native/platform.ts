// The one switch between the browser and the iOS/Android app (Capacitor; reply 0033 §ب). In the app:
//   - no service worker is registered (vite.config.ts leaves vite-plugin-pwa out of the native build, and main.tsx
//     removes any registration a web view might hold);
//   - no «add to home screen» invitation (web/src/install.ts, its link on the home page and its settings button);
//   - no Web Push bells or reminder (web/src/v2/daily/push.ts: pushSupported() is false): the device-features part
//     replaces them with local notifications (@capacitor/local-notifications), behind this same switch.
import { Capacitor } from '@capacitor/core'

/** True inside the iOS or Android app, false in any browser (also for the native build opened in a browser). */
export const isNative = (): boolean => Capacitor.isNativePlatform()

/** 'ios', 'android' or 'web'. */
export const platform = (): 'ios' | 'android' | 'web' => {
  const p = Capacitor.getPlatform()
  return p === 'ios' || p === 'android' ? p : 'web'
}
