// The launch screen held until the first view is drawn (0049 ب): on iOS the launch screen is the welcome page's painting
// without its words (LaunchScreen.storyboard), and @capacitor/splash-screen keeps it over the web view until the app
// says it is ready, so the painting does not give way to a bare sky before the welcome page comes over it. Hidden at
// once, no fade: the page under it is the same painting with the words. capacitor.config.ts hides it by itself after a
// few seconds should this never be called.
import { isNative } from './platform'

let done = false
export function launchReady() {
  if (done || !isNative()) return
  done = true
  void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 0 })).catch(() => undefined)
}
