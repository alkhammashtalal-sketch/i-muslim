// The app's device side (reply 0033 §ب3), loaded only inside the iOS/Android app (dynamic imports from the shared
// code, so the web bundle never runs it): local notifications for the bells, the portion reminder and the morning and
// evening adhkar reminders (add-on 0072-add18 §2), their sound (§1), the optional reminders (add-on 0072-add30 §5:
// Friday, the fasting days, the Name of the day), and where a tapped notification leads.
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Lang } from '../../../shared/api'
import { savedPlace, type Place } from '../daily/location'
import type { AsrSchool, Method } from '../daily/prayer'
import { pushMessage } from '../daily/notify-text'
import { isLang } from '../i18n'
import { loadPushPrefs, savePushPrefs, type PushPrefs } from '../v2/daily/push'
import { loadGlobalOffset, loadHijriOffset, loadPrayerPrefs } from '../v2/daily/store'
import { totalOffset } from '../daily/hijri'
import { ADHKAR_SPLIT } from '../v2/daily/adhkar/adhkar-model'
import { loadAdhkarReminders, loadExtraReminders, saveAdhkarReminders, saveExtraReminders } from './alert-prefs'
import { loadSoundPrefs, loadTimeSensitive, saveSoundPrefs, saveTimeSensitive, type SoundChoice } from './alert-sounds'
import { prepareSounds, timeSensitiveSetting } from './alert-sounds-device'
import type { AdhkarReminders, AdhkarTexts } from './bells'
import { alertQueue, applyLocal, reschedule, type AlertPrefs, type ApplyResult } from './notify'
import type { ExtraReminders } from './reminders'
import { platform } from './platform'
import { WIDGET_STRINGS } from './widget-strings'

/** «أذكار الصباح» / «أذكار المساء» (the widgets' own words), each opening its page. */
export const adhkarTexts = (lang: string): AdhkarTexts => {
  const w = WIDGET_STRINGS[(isLang(lang) ? lang : 'ar') as Lang]
  const page = (part: string) => (ADHKAR_SPLIT ? `/today/adhkar?part=${part}` : '/today/adhkar')
  return { title: pushMessage(lang, 'fajr').title, morning: w.morning, evening: w.evening, morningUrl: page('morning'), eveningUrl: page('evening') }
}

const ctxOf = async (place: Place | null, lang: string, choice = loadSoundPrefs().prayer) => {
  const p = loadPrayerPrefs(place)
  const ready = await prepareSounds(choice, lang).catch(() => ({}))
  // The calendar's and the date card's Hijri offset (as the widgets take it, widget-data.ts), for al-ayyam al-bid.
  const hijriOffset = totalOffset(loadHijriOffset(), await loadGlobalOffset().catch(() => 0))
  const timeSensitive = { on: loadTimeSensitive(), setting: await timeSensitiveSetting().catch(() => null) }
  return { place, method: p.method as Method, asr: p.asr as AsrSchool, adjust: p.adjust, lang, platform: platform(), adhkarTexts: adhkarTexts(lang), hijriOffset, sound: { choice, ready }, timeSensitive }
}
const prefsOf = (push: PushPrefs, adhkar: AdhkarReminders, extra: ExtraReminders = loadExtraReminders()): AlertPrefs => ({ bells: push.bells, ward: push.ward, adhkar, extra })

// Taps and reschedules go through one queue (notify.ts alertQueue), so they never interleave.
const queue = alertQueue()

/** A tap on a bell or on the reminder switch. */
export function applyNativeAlerts(next: PushPrefs, place: Place | null, lang: string): Promise<ApplyResult> {
  return queue.tap(async () => applyLocal(LocalNotifications, prefsOf(next, loadAdhkarReminders()), await ctxOf(place, lang), (p) => savePushPrefs({ bells: p.bells as PushPrefs['bells'], ward: p.ward })))
}

/** A tap on an adhkar reminder's switch or its minutes (add-on 0072-add18 §2): asks for the permission only when one
 *  is being turned on, as the bells do. */
export function applyAdhkarReminders(next: AdhkarReminders, lang: string): Promise<ApplyResult> {
  return queue.tap(async () => applyLocal(LocalNotifications, prefsOf(loadPushPrefs(), next), await ctxOf(savedPlace(), lang), (p) => saveAdhkarReminders(p.adhkar ?? next)))
}

/** A tap on one of the optional reminders' switches or its minutes (add-on 0072-add30 §5): the permission is asked only
 *  when one is being turned on, as the bells do. */
export function applyExtraReminders(next: ExtraReminders, lang: string): Promise<ApplyResult> {
  return queue.tap(async () => applyLocal(LocalNotifications, prefsOf(loadPushPrefs(), loadAdhkarReminders(), next), await ctxOf(savedPlace(), lang), (p) => saveExtraReminders(p.extra ?? next)))
}

/** A new prayer alert sound: saved, its file made ready (the adhan from our server), and the alerts planned again. The
 *  answer says whether the adhan is ready, or the phone's sound stands in for it. */
export async function applySoundChoice(choice: SoundChoice, lang: string): Promise<'ok' | 'fallback'> {
  saveSoundPrefs({ prayer: choice })
  const ready = await prepareSounds(choice, lang).catch(() => ({}) as Record<string, string>)
  await rescheduleAlerts(lang)
  return choice === 'adhan' && !ready['adhan-short'] ? 'fallback' : 'ok'
}

/** The «حساس للوقت» switch (add-on 0072-add34 §ب5): saved, then the alerts planned again with or without the level. */
export async function applyTimeSensitive(on: boolean, lang: string) {
  saveTimeSensitive(on)
  await rescheduleAlerts(lang)
}

/** Plan the alerts again from the saved choice, place and settings (launch, return to the foreground, a change),
 *  read when its turn in the queue comes. Calls that arrive while one is waiting are folded into it. */
export function rescheduleAlerts(lang: string): Promise<number> {
  return queue.reschedule(async () => reschedule(LocalNotifications, prefsOf(loadPushPrefs(), loadAdhkarReminders()), await ctxOf(savedPlace(), lang)).catch(() => 0))
}

/** Where a tapped alert leads (the url pushMessage gave it: the prayer times, or the reader for the portion). */
export function onAlertTap(go: (path: string) => void) {
  const h = LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const url = (a.notification.extra as { url?: unknown } | undefined)?.url
    if (typeof url === 'string' && url.startsWith('/')) go(url)
  })
  return () => void h.then((x) => x.remove())
}
