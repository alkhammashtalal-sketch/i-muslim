// The welcome page shows on the first run until the reader has made a choice on it (0048-add2 §4); «صفحة الترحيب» in
// «عن التطبيق» shows it again (an event the app listens to). Talal's direct order of 1 November 10:00: «إذا اختار
// المستخدم اللغة أو ضغط «ابدأ» يُحفظ ذلك في طبقة التخزين وiCloud، ولا تظهر له الترحيب مرة ثانية». So both «ابدأ» and a
// language picked from the page record it (App.tsx), in the app's storage layer (src/storage/device.ts: Preferences in
// the apps, which survives the web view's storage being reclaimed and an update, with a copy in localStorage; Android's
// Auto Backup keeps Preferences across a reinstall) and, in the iPhone app, in the person's iCloud (src/storage/cloud.ts,
// CLOUD_KEYS: brought back on a reinstall or a new phone before the first view, or, when iCloud's copy comes down later,
// with the one reopening of the app cloud.ts does then). Nothing at launch waits for the network.
// The brief welcome of later launches (0049 ب) is off (BRIEF_WELCOME below).
import { isNative } from '../../native/platform'
import { deviceStorage } from '../../storage/device'

export const WELCOME_KEY = 'muslim.welcome.v1'
export const WELCOME_EVENT = 'muslim:welcome'

export function welcomeSeen(storage: Pick<Storage, 'getItem'> | undefined = deviceStorage): boolean {
  try {
    return storage?.getItem(WELCOME_KEY) === '1'
  } catch {
    return true // no storage (a private window): never in the way
  }
}
/** The reader pressed «ابدأ» or picked a language: never the welcome again on this device, nor after a reinstall. */
export function markWelcomeSeen(storage: Pick<Storage, 'setItem'> = deviceStorage) {
  try {
    storage.setItem(WELCOME_KEY, '1')
  } catch {
    // no storage: it shows again on the next run
  }
}
export const showWelcome = () => window.dispatchEvent(new Event(WELCOME_EVENT))

/** Opened as an app: the iOS/Android shell, or the web app installed on the home screen. */
export const asApp = () =>
  isNative() || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as { standalone?: boolean }).standalone === true

/** The brief welcome of a later launch (0049 ب), off since add-on 0072-add29 §4 (25 October): a reader who chose a
 *  language before goes straight to «يومك»; the painting with no buttons for a second and a half read as the app
 *  stuck on its launch (Talal, build 18). One line turns it back on. */
export const BRIEF_WELCOME = false

/** The welcome this launch shows: the whole page on the first run, until «ابدأ» or a language picked; on a later launch none (or the brief
 *  one on the app's home, if BRIEF_WELCOME). */
export function launchWelcome(brief: boolean = BRIEF_WELCOME, storage: Pick<Storage, 'getItem'> = deviceStorage): 'first' | 'brief' | null {
  if (!welcomeSeen(storage)) return 'first'
  return brief && asApp() && location.pathname === '/' && !location.hash ? 'brief' : null
}
