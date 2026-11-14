// The app icon's menu, touch and hold (add-on 0072-add30 §3): «سبّح»، «اسأل»، «القبلة»، «أذكار الوقت», in the app's
// ten languages and in this order, on both phones:
//   - iOS: Home Screen quick actions, set by the app itself (web/ios/App/App/QuickActions.swift), whose titles are
//     these words in Localizable.strings («quick.*»; worker/test/shortcuts-siri-0072.test.ts keeps them equal);
//   - Android: the icon's shortcuts (android/shortcuts.ts, ShortcutManagerCompat).
// Each opens the app's own link (NativeDevice.tsx): the tasbih, the question box on the home page (imuslim://ask, no
// page of its own: the home page, its box brought into view and focused), the qibla, and the adhkar page, which shows
// the list of the time by itself (Adhkar.tsx: the morning's from Fajr, the evening's from Asr).
// The words are the app's own: the tasbih control's «سبّح» where it is a word (a «+1» counter's name is not), the home
// page's «اسأل», and the controls' «القبلة» and «أذكار الوقت» (widget-strings.ts, strings-shortcuts.ts).
import type { Lang } from '../../../shared/api'
import { SHORTCUTS } from '../v2/daily/shortcuts/strings-shortcuts'
import { WIDGET_STRINGS } from './widget-strings'

export const QUICK_IDS = ['tasbih', 'ask', 'qibla', 'adhkar'] as const
export type QuickId = (typeof QUICK_IDS)[number]

/** «اسأل»'s link: the home page with its question box focused. */
export const ASK_LINK = 'imuslim://ask'
export const ASK_PATH = '/ask'

export const QUICK_LINKS: Record<QuickId, string> = {
  tasbih: 'imuslim://today/tasbih',
  ask: ASK_LINK,
  qibla: 'imuslim://today/qibla',
  adhkar: 'imuslim://today/adhkar',
}

export function quickLabel(id: QuickId, lang: Lang): string {
  const n = WIDGET_STRINGS[lang].names
  switch (id) {
    case 'tasbih':
      return n.ctlCount.name.includes('+') ? n.ctlTasbih.name : n.ctlCount.name
    case 'ask':
      return SHORTCUTS[lang].ask
    case 'qibla':
      return n.ctlQibla.name
    case 'adhkar':
      return n.ctlAdhkar.name
  }
}
