// The app icon's shortcuts and «أذكار المواقف» opened by itself in the Android app (reply 0067):
//   - the app icon's shortcuts (touch and hold): «سبّح»، «اسأل»، «القبلة»، «أذكار الوقت» (add-on 0072-add30 §3, the
//     iPhone's quick actions; ../quick-actions.ts), in the app's language, set again at each launch and language
//     change. Dynamic, not res/xml/shortcuts.xml: a static shortcut's label follows the phone's language, and the app
//     speaks the one chosen inside it. They replace reply 0067's four (the morning and evening adhkar, travel and
//     sleep): a launcher shows four or five, and «أذكار الوقت» is the morning's or the evening's by the time;
//   - a dhikr pinned to the home screen from its own page (Android asks the user first);
//   - an NFC tag: the dhikr's link imuslim://mawaqif/<situation>, which the user writes on a tag with any NFC app.
// Each opens the app's own link, as the iPhone's widgets do (NativeDevice.tsx widgetPath); the icons are the
// situations' own (web/android …/drawable/mq_*.xml, from v2/daily/mawaqif/icons.tsx). The app's plugin
// AndroidShortcuts (web/android …/ShortcutsPlugin.java) is Android's ShortcutManagerCompat (androidx.core).
import { registerPlugin } from '@capacitor/core'
import type { Lang } from '../../../../shared/api'
import type { Situation } from '../../v2/daily/mawaqif/mawaqif-model'
import { QUICK_IDS, QUICK_LINKS, quickLabel, type QuickId } from '../quick-actions'
import { isAndroid } from '../platform'

export type ShortcutItem = { id: string; label: string; url: string; icon: string }
type Plugin = {
  set(o: { items: ShortcutItem[] }): Promise<void>
  pin(o: ShortcutItem): Promise<{ asked: boolean }>
  canPin(): Promise<{ value: boolean }>
  copyLink(o: { text: string }): Promise<void>
}
const AndroidShortcuts = registerPlugin<Plugin>('AndroidShortcuts')

/** A situation's link (and a stage's, for «المنزل»'s two). */
export const mawaqifLink = (id: string, step?: string | null) => `imuslim://mawaqif/${id}${step ? `?step=${step}` : ''}`

/** The icon's four shortcuts, in order: the icons are the tasbih's beads (mq_tasbih.xml, the «سبّح» tile's), a speech
 *  bubble (mq_ask.xml), the compass and the raised hands of «أذكار المواقف». */
export function iconShortcuts(lang: Lang): ShortcutItem[] {
  const icon: Record<QuickId, string> = { tasbih: 'tasbih', ask: 'ask', qibla: 'compass', adhkar: 'hands' }
  return QUICK_IDS.map((id) => ({ id: `quick-${id}`, label: quickLabel(id, lang), url: QUICK_LINKS[id], icon: icon[id] }))
}

export function setIconShortcuts(lang: Lang) {
  if (!isAndroid()) return
  void AndroidShortcuts.set({ items: iconShortcuts(lang) }).catch(() => undefined)
}

export const canPin = (): Promise<boolean> =>
  isAndroid()
    ? AndroidShortcuts.canPin().then(
        (r) => r.value,
        () => false,
      )
    : Promise.resolve(false)

export function pinSituation(sit: Situation, lang: Lang, step: string | null) {
  const stage = step ? sit.stages.find((x) => x.id === step) : null
  const label = stage?.name ? `${sit.name[lang]} · ${stage.name[lang]}` : sit.name[lang]
  return AndroidShortcuts.pin({ id: `pin-${sit.id}${step ? `-${step}` : ''}`, label, url: mawaqifLink(sit.id, step), icon: sit.icon })
}

/** A dhikr's link onto the clipboard: the page's own clipboard, else Android's (an older web view refuses the first). */
export const copyLink = (text: string): Promise<void> => navigator.clipboard.writeText(text).catch(() => AndroidShortcuts.copyLink({ text }))
