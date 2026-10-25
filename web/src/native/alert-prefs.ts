// The morning and evening adhkar reminders' choice (add-on 0072-add18 §2), on the device only: off by default, a
// quarter of an hour after sunrise and after Asr. The bells and the portion reminder keep their own key
// (web/src/v2/daily/push.ts); the plan joins them (web/src/native/bells.ts).
import { ADHKAR_DEFAULTS, adhkarMinutes, type AdhkarReminders } from './bells'

const KEY = 'muslim.adhkarReminders.v1'

export function loadAdhkarReminders(): AdhkarReminders {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AdhkarReminders>
    return { morning: v.morning === true, evening: v.evening === true, morningMin: adhkarMinutes(v.morningMin), eveningMin: adhkarMinutes(v.eveningMin) }
  } catch {
    return { ...ADHKAR_DEFAULTS }
  }
}

export function saveAdhkarReminders(p: AdhkarReminders) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}
