// The welcome page shows on the first run until «ابدأ» (0048-add2 §4), which records it; «صفحة الترحيب» in «عن التطبيق»
// shows it again (an event the app listens to). On this device only. And on every later launch of the app (0049 ب,
// Talal 14 October: «كل ما يفتح التطبيق») it shows briefly, without its buttons: the iOS app or the installed web app,
// opened on its home (not a browser tab, and not a widget's, an alert's or a link's page, which open at once).
import { isNative } from '../../native/platform'

export const WELCOME_KEY = 'muslim.welcome.v1'
export const WELCOME_EVENT = 'muslim:welcome'

export function welcomeSeen(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): boolean {
  try {
    return storage?.getItem(WELCOME_KEY) === '1'
  } catch {
    return true // no storage (a private window): never in the way
  }
}
export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_KEY, '1')
  } catch {
    // no storage: it shows again on the next run
  }
}
export const showWelcome = () => window.dispatchEvent(new Event(WELCOME_EVENT))

/** Opened as an app: the iOS/Android shell, or the web app installed on the home screen. */
export const asApp = () =>
  isNative() || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as { standalone?: boolean }).standalone === true

/** The welcome this launch shows: the whole page on the first run, the brief one on a later launch of the app on its
 *  home, else none. */
export function launchWelcome(): 'first' | 'brief' | null {
  if (!welcomeSeen()) return 'first'
  return asApp() && location.pathname === '/' && !location.hash ? 'brief' : null
}
