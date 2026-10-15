// The Android app's status and navigation bars (reply 0066), set by the welcome page as it opens and closes. The app
// draws edge to edge on every Android version (MainActivity.java, as Android 15+ does anyway):
//   - a web view of 140 or newer (what phones that update it from Google Play have) gets the bars' heights as
//     env(safe-area-inset-*) from Capacitor's SystemBars, and the page goes under the transparent bars as on the iPhone;
//   - an older web view gets the page between the bars instead (Capacitor pads around it), so the bars show the window's
//     background, which AndroidBarsPlugin.java sets: the welcome page's sky on that page, elsewhere the sky's first
//     colour at the top (tokens.css --sky) and the paper at the bottom (--bg), as the pages themselves are.
// The bars' icons follow: light over the welcome page's painting, dark elsewhere (the status bar's by Welcome.tsx, as on
// the iPhone; the navigation bar's here). The iPhone app and the browser never call this.
import { registerPlugin, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'
import { isAndroid } from '../platform'

/** web/android …/values/colors.xml launch_welcome_sky, the first stop of --sky, and --bg (tokens.css). */
export const WELCOME_SKY = '#13306B'
export const SKY_TOP = '#9FC0E8'
export const PAPER = '#F6F4EF'

const AndroidBars = registerPlugin<{ setBehind(o: { top: string; bottom: string }): Promise<void> }>('AndroidBars')

/** The bars for the welcome page (`welcome`) or the rest of the app (`app`); nothing outside the Android app. */
export async function androidBars(page: 'welcome' | 'app'): Promise<void> {
  if (!isAndroid()) return
  const welcome = page === 'welcome'
  // The style first: Capacitor's SystemBars.setStyle puts the theme's window background back (SystemBars.java).
  await SystemBars.setStyle({ style: welcome ? SystemBarsStyle.Dark : SystemBarsStyle.Light, bar: SystemBarType.NavigationBar }).catch(() => undefined)
  await AndroidBars.setBehind(welcome ? { top: WELCOME_SKY, bottom: WELCOME_SKY } : { top: SKY_TOP, bottom: PAPER }).catch(() => undefined)
}
