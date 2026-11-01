// The welcome page (0048-add2), in build 17's approved design with its two buttons: «ابدأ» enters the app, the language
// button opens the list of the ten languages. Talal, 1 November 12:31 (add-on 0072-add62 §1, which cancels «لا تظهر
// الترحيب مرة ثانية» of his 10:00 order): «لازم في كل مرة الواحد يفتحها يشوف الصفحة، ويقدر يضغط ابدأ أو يختار اللغة
// حقته… بالتصميم اللي احنا معتمدينه من قبل». So the app (the iOS/Android shell, or the web app installed on the home
// screen) shows the whole page on every launch on its home; a widget's, an alert's or a link's page opens at once
// (App.tsx). The language chosen is the settings' (imuslim.settings.v1: the storage layer, src/storage/device.ts, and
// the iPhone's iCloud copy, src/storage/cloud.ts), and the page comes in it the next time. In a browser tab the page
// shows on the first visit until «ابدأ» or a language picked, recorded under WELCOME_KEY (the same storage layer and
// iCloud). «صفحة الترحيب» in «عن التطبيق» shows it again. Nothing at launch waits for the network.
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
/** The reader pressed «ابدأ» or picked a language: the first run is over (a browser tab then opens without the page;
 *  the app shows it on every launch all the same). */
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

/** The brief welcome of a later launch (0049 ب: the painting without its buttons for a second and a half), off since
 *  add-on 0072-add29 §4: it read as the app stuck on its launch (Talal, build 18). The app now shows the whole page. */
export const BRIEF_WELCOME = false

/** What this launch shows: 'first' the whole page on a first run (until «ابدأ» or a language picked); 'launch' the whole
 *  page again, on every later launch of the app on its home (add-on 0072-add62 §1); 'brief' only if BRIEF_WELCOME; in a
 *  browser tab after the first run, or on another page, none. */
export type Launch = 'first' | 'launch' | 'brief' | null
export function launchWelcome(brief: boolean = BRIEF_WELCOME, storage: Pick<Storage, 'getItem'> = deviceStorage, app: () => boolean = asApp): Launch {
  if (!welcomeSeen(storage)) return 'first'
  if (!app() || location.pathname !== '/' || location.hash) return null
  return brief ? 'brief' : 'launch'
}
