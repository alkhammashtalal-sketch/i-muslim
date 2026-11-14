// The iftar and suhoor countdown on the iPhone's Lock Screen and Dynamic Island (add-ons 0072-add26 §4.2 and
// 0072-add34 §ب8): a Live Activity like «جلسة تسبيح بعد الصلاة» (tasbih-session.ts), started from the Ramadan page.
// The system counts by itself (SwiftUI's Text(timerInterval:)), so nothing updates it and nothing is sent anywhere;
// at the time its stale date shows the prayer and its time, and it ends by itself: when the app next comes to the front
// (endStaleFasting, from NativeDevice.tsx), or at Apple's limit of eight hours.
// Native side: web/ios/App/App/FastingCountdownPlugin.swift and web/ios/App/Shared/FastingCountdown.swift.
import { registerPlugin } from '@capacitor/core'
import type { Lang } from '../../../shared/api'
import { isNative, platform } from './platform'

export type CountdownStart = {
  kind: 'iftar' | 'suhoor'
  /** «يبقى على الإفطار» / «يبقى على أذان الفجر». */
  title: string
  /** The time it counts to, in ms since the epoch. */
  target: number
  /** «المغرب ٥:٤٣ م · الرياض»: shown under the count, and alone once the time has come. */
  at: string
  /** The locale the system writes the count in (its digits). */
  locale: string
  /** «أوقف العدّاد»: the stop button's spoken name. */
  stop: string
  rtl: boolean
}
type Plugin = {
  available(): Promise<{ supported: boolean; enabled: boolean }>
  start(o: CountdownStart): Promise<{ ok: boolean; error?: string }>
  end(): Promise<void>
  active(): Promise<{ active: boolean; kind?: string; target?: number }>
  endStale(): Promise<void>
}
export const FastingCountdown = registerPlugin<Plugin>('FastingCountdown')

/** The locale for the system's count: Arabic with its own digits, the others as they are. */
export const countLocale = (lang: Lang) => (lang === 'ar' ? 'ar@numbers=arab' : lang)

/** On the iPhone only; elsewhere the page shows its own countdown and no button. */
export async function countdownAvailable(): Promise<{ supported: boolean; enabled: boolean }> {
  if (!isNative() || platform() !== 'ios') return { supported: false, enabled: false }
  return FastingCountdown.available().catch(() => ({ supported: false, enabled: false }))
}

/** A countdown whose time has passed leaves the Lock Screen when the app comes back. */
export function endStaleFasting() {
  if (!isNative() || platform() !== 'ios') return
  void FastingCountdown.endStale().catch(() => undefined)
}
