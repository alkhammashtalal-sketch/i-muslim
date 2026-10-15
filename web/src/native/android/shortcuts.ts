// «أذكار المواقف» opened by itself in the Android app (reply 0067, in place of the iPhone's Siri and Shortcuts):
//   - the app icon's shortcuts (touch and hold): the morning and evening adhkar, travel and sleep, in the app's language,
//     set again at each launch and language change;
//   - a dhikr pinned to the home screen from its own page (Android asks the user first);
//   - an NFC tag: the dhikr's link imuslim://mawaqif/<situation>, which the user writes on a tag with any NFC app.
// Each opens the app's own link, as the iPhone's widgets do (NativeDevice.tsx widgetPath); the icons are the
// situations' own (web/android …/drawable/mq_*.xml, from v2/daily/mawaqif/icons.tsx). The app's plugin
// AndroidShortcuts (web/android …/ShortcutsPlugin.java) is Android's ShortcutManagerCompat (androidx.core).
import { registerPlugin } from '@capacitor/core'
import type { Lang } from '../../../../shared/api'
import { ADHKAR_SPLIT } from '../../v2/daily/adhkar/adhkar-model'
import { situation, type Situation } from '../../v2/daily/mawaqif/mawaqif-model'
import { WIDGET_STRINGS } from '../widget-strings'
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

/** The icon's four shortcuts, in order. */
export function iconShortcuts(lang: Lang): ShortcutItem[] {
  const w = WIDGET_STRINGS[lang]
  const part = (p: 'morning' | 'evening') => (ADHKAR_SPLIT ? `imuslim://today/adhkar?part=${p}` : 'imuslim://today/adhkar')
  const sit = (id: string, icon: string): ShortcutItem[] => {
    const s = situation(id)
    return s ? [{ id: `mawaqif-${id}`, label: s.name[lang], url: mawaqifLink(id), icon: s.icon || icon }] : []
  }
  return [
    { id: 'adhkar-morning', label: w.morning, url: part('morning'), icon: 'sunrise' },
    { id: 'adhkar-evening', label: w.evening, url: part('evening'), icon: 'crescent' },
    ...sit('travel', 'car'),
    ...sit('sleep', 'moon'),
  ]
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
