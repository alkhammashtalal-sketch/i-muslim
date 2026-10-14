// The screen stays on while a situation is open (reply 0050 ج §3): in the app @capacitor-community/keep-awake (MIT); on
// the web the Screen Wake Lock API, asked again on the way back to the page. Returns the cleanup that lets it sleep.
import { isNative } from '../../../native/platform'

export function keepScreenOn(): () => void {
  if (isNative()) {
    let done = false
    void import('@capacitor-community/keep-awake').then(({ KeepAwake }) => (done ? undefined : KeepAwake.keepAwake())).catch(() => undefined)
    return () => {
      done = true
      void import('@capacitor-community/keep-awake').then(({ KeepAwake }) => KeepAwake.allowSleep()).catch(() => undefined)
    }
  }
  let lock: { release(): Promise<void> } | null = null
  let done = false
  const wl = (navigator as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
  const ask = () => {
    if (done || document.visibilityState !== 'visible' || !wl) return
    void wl.request('screen').then(
      (l) => (done ? void l.release() : (lock = l)),
      () => undefined,
    )
  }
  ask()
  document.addEventListener('visibilitychange', ask)
  return () => {
    done = true
    document.removeEventListener('visibilitychange', ask)
    void lock?.release().catch(() => undefined)
  }
}
