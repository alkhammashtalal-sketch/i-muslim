// Android's back button (reply 0066: one step inside the app, never a sudden close), mounted by NativeDevice.tsx in the
// Android app only. Capacitor's own handling goes back in the web view's history, and an ayah or a sheet does not add a
// step there (Quran.tsx replaces the path), so it left the sura with its ayah open. Here, in order:
//   - an open sheet (a <dialog>) closes, as Esc closes it: its own close handler updates the app (Sheet.tsx, V2Sheet);
//   - on any page but the home page, the page before, or the home page when the app was opened on this one;
//   - on the home page and the welcome page, the app goes to the background as Android apps do, kept as it is.
import { App } from '@capacitor/app'
import { navigate } from '../quran/route'

export function installAndroidBack(): () => void {
  const h = App.addListener('backButton', ({ canGoBack }) => {
    const sheet = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].pop()
    if (sheet) {
      const ev = new Event('cancel', { cancelable: true })
      sheet.dispatchEvent(ev)
      if (!ev.defaultPrevented) sheet.close()
      return
    }
    const home = location.pathname === '/' || !!document.querySelector('.wl')
    if (home) return void App.minimizeApp()
    if (canGoBack) return history.back()
    navigate('/', { replace: true })
  })
  return () => void h.then((x) => x.remove())
}
