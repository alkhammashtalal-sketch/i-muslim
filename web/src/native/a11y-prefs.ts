// iOS's «Reduce Transparency» in the app (add-on 0071-add16 §5): the web view has no CSS query for it, so the local
// plugin AccessibilityPrefs (web/ios/App/App/AccessibilityPrefsPlugin.swift) reads it, and this marks <html> with
// data-reduce-transparency while it is on; the date card's sky then draws no layer (web/src/v2/home/sky.css). The web
// and Android keep the CSS query prefers-reduced-transparency.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

type Prefs = { reduceTransparency: boolean }
type Plugin = {
  get(): Promise<Prefs>
  addListener(event: 'change', f: (r: Prefs) => void): Promise<PluginListenerHandle>
}
const AccessibilityPrefs = registerPlugin<Plugin>('AccessibilityPrefs')

const apply = ({ reduceTransparency }: Prefs) => {
  const root = document.documentElement
  if (reduceTransparency) root.dataset.reduceTransparency = ''
  else delete root.dataset.reduceTransparency
}

/** Reads the setting and follows its changes, in the iOS app only. */
export async function watchAccessibilityPrefs() {
  if (Capacitor.getPlatform() !== 'ios') return
  try {
    apply(await AccessibilityPrefs.get())
    await AccessibilityPrefs.addListener('change', apply)
  } catch {
    // An older build without the plugin: the sky keeps its layer, as on the web.
  }
}
