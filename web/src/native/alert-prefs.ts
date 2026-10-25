// The morning and evening adhkar reminders' choice (add-on 0072-add18 §2), on the device only: off by default, a
// quarter of an hour after sunrise and after Asr. The bells and the portion reminder keep their own key
// (web/src/v2/daily/push.ts); the plan joins them (web/src/native/bells.ts).
import { ADHKAR_DEFAULTS, adhkarMinutes, type AdhkarReminders } from './bells'
import { readExtra, type ExtraReminders } from './reminders'

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

// The optional reminders of add-on 0072-add30 §5 (reminders.ts), on the device only, all off by default.
const EXTRA_KEY = 'muslim.extraReminders.v1'

export function loadExtraReminders(): ExtraReminders {
  try {
    return readExtra(JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '{}') as Partial<ExtraReminders>)
  } catch {
    return readExtra(null)
  }
}

export function saveExtraReminders(p: ExtraReminders) {
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(p))
  } catch {}
}
