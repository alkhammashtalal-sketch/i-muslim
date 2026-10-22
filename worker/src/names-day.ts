// «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4, 0071-add2 §2, 0071-add5 §2): one entry
// of the reviewed names file a day (data/names-daily.json, scripts/names/daily-build.mjs), the same for everyone on
// the same Riyadh date. No D1 read: the entry is ids only (the evidence ayah or HadeethEnc hadith, the ayah for the
// meaning, the duas), and the app reads their texts by those ids from /api/passage and /api/adhkar/hadith.
//   GET /api/names/day[?day=YYYY-MM-DD][&lang=xx] → { day, index, count, entry, readings? }  (the same for every lang)
// `readings` («المعنى»، «قراءة ميسرة»، «قراءة أعمق»: an educational explanation prepared for the app, not quoted from
// the scholars) travel only while NAMES_READINGS is "on" (env v11 alone, worker/wrangler.jsonc), to every interface
// language (add-on 0071-add5 §2, reply 0068 question (a)): they are Arabic and stay Arabic, never machine-translated,
// and the card shows them under «الشرح متاح بالعربية» in the reader's language. An ayah or a hadith they cite by
// number is a link written into them, {{its words|quran:s:a}} or {{…|hadith:id}}, to the text in our data
// (scripts/names/daily-build.mjs).
// The app passes its own Riyadh date as `day`, so the card turns with the ayah of the day on the same device.
import data from '../../data/names-daily.json'
import type { Env } from './index'
import { json } from './reader'
import { riyadhDay } from './lib/keys'

/** `praise`: a dua the names file lists as a praise («ثناء قرآني», al-Fatiha 2). */
export type NameDua = { kind: 'ayah' | 'hadith'; id: string; praise?: boolean }
/** Arabic text; a citation by number in it is {{its words|quran:s:a}} or {{its words|hadith:id}} (add-on 0071-add5 §2). */
export type NameReadings = { meaning: string; easy: string; deep: string[] }
export type NameEntry = {
  n: number
  name: string
  ayah: string | null
  hadith: string | null
  meaningAyah: string | null
  duas: NameDua[]
  /** No HadeethEnc hadith as evidence (add-on 0071-add2 §2): the Quranic evidence alone. */
  quranOnly: boolean
  /** The one ayah whose tafsir the card shows. */
  tafsirOf: string | null
}
type Stored = NameEntry & { readings: NameReadings }

export const NAMES_EPOCH: string = data.epoch
export const NAME_ENTRIES = data.entries as Stored[]

const DAY = 86_400_000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
/** Cached ten minutes, like the hadith of the day: a switch turned off stops the readings within that time. */
const CACHE = 'public, max-age=600'

/** The rotation (data/names-daily.json `rule`): days from the epoch to `day`, mod the entries, never negative. */
export function nameDayIndex(day: string, n = NAME_ENTRIES.length): number {
  const d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${NAMES_EPOCH}T00:00:00Z`)) / DAY)
  return ((d % n) + n) % n
}

/** A date the app may ask for: YYYY-MM-DD that is a real day (2026-02-30 is not). */
export function validDay(s: string | null): s is string {
  if (!s || !DAY_RE.test(s)) return false
  const t = Date.parse(`${s}T00:00:00Z`)
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s
}

export const namesReadingsOn = (env: Pick<Env, 'NAMES_READINGS'>) => env.NAMES_READINGS === 'on'

/** The day's entry; the readings while the switch is on, whatever the interface language (`lang` is the client's, and
 *  changes nothing here since add-on 0071-add5: the readings are Arabic for everyone). */
export function nameOfDay(env: Pick<Env, 'NAMES_READINGS'>, day: string) {
  const index = nameDayIndex(day)
  const { readings, ...entry } = NAME_ENTRIES[index]
  return { day, index, count: NAME_ENTRIES.length, entry, ...(namesReadingsOn(env) ? { readings } : {}) }
}

export async function handleNamesDay(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== '/api/names/day' || request.method !== 'GET') return null
  const asked = url.searchParams.get('day')
  if (asked !== null && !validDay(asked)) return json({ ok: false, error: 'bad_day' }, 400)
  const day = asked ?? riyadhDay()
  return json(nameOfDay(env, day), 200, CACHE)
}
