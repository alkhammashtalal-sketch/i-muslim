// The iPhone's status bar (add-ons 0072-add3, 0072-add7 §3.5). The app launches with it hidden (Info.plist
// UIStatusBarHidden, so the launch screen's painting is not moved when the welcome page hides it, as it was on the
// iPhone SE), and App.tsx shows it again on every page but the welcome page, which hides it itself (Welcome.tsx). The
// Android app and the browser never call the plugin here.
import { platform } from './platform'

/** Show (or hide) the status bar in the iPhone app; nothing elsewhere. */
export function iosStatusBar(visible: boolean): void {
  if (platform() !== 'ios') return
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Animation }) => (visible ? StatusBar.show() : StatusBar.hide({ animation: Animation.None })))
    .catch(() => undefined)
}
