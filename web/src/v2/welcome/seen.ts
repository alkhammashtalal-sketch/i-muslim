// The welcome page shows on the first run only (0048-add2 §4): «ابدأ» records it; «صفحة الترحيب» in «عن التطبيق»
// shows it again (an event the app listens to). On this device only.
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
