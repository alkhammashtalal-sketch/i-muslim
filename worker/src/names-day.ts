// «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4, 0071-add2 §2, 0071-add5 §2): one entry
// of the reviewed names file a day (data/names-daily.json, scripts/names/daily-build.mjs), the same for everyone on
// the same Riyadh date. No D1 read: the entry is ids only (the evidence ayah or HadeethEnc hadith, the ayah for the
// meaning, the duas), and the app reads their texts by those ids from /api/passage and /api/adhkar/hadith.
//   GET /api/names/day[?day=YYYY-MM-DD][&lang=xx] → { day, index, count, entry, readings? }  (the same for every lang)
// `readings` («المعنى»، «قراءة ميسرة»، «قراءة أعمق»: an educational explanation prepared for the app, not quoted from
// the scholars) travel only while NAMES_READINGS is "on" (envs next and v11, add-on 0072-add12; worker/wrangler.jsonc), to every interface
// language (add-on 0071-add5 §2, reply 0068 question (a)): they are Arabic and stay Arabic, never machine-translated,
// and the card shows them under «الشرح متاح بالعربية» in the reader's language. An ayah or a hadith they cite by
// number is a link written into them, {{its words|quran:s:a}} or {{…|hadith:id}}, to the text in our data
// (scripts/names/daily-build.mjs).
// The app passes its own Riyadh date as `day`, so the card turns with the ayah of the day on the same device.
// Add-on 0072-add1, the name's own page and «كل الأسماء»:
//   GET /api/names/entry/<n> (1–96) → { index, count, entry, readings?, prev, next }  (prev/next: { n, name }, round)
//   GET /api/names/list → { count, entries: [{ n, name }], appendix: [{ n, name, note? }] }  (`note`, the file's
//     «تنبيه الملحق», travels with the readings, only while NAMES_READINGS is on)
// Add-on 0072-add11 §2–4, the enriched card: while NAMES_ENRICHED is "on" (env v11 alone), the day and the entry also
// carry, for an entry that has them in data/names-enriched.json (reviewed batch by batch in relay/w1/0072-names-content/),
// `meaning` («معنى الاسم عند العلماء»), with `meaningHadith` beside it for the three names a hadith explains (add-on
// 0072-add16 §4), `salaf` («من أقوال السلف في الاسم») and `heart` («أثره في قلبك»). Present
// only: a section with no text is absent, never an empty list, and an entry not yet in a batch carries none of them.
// They are Arabic for every interface language, like the readings; `heart` is what replaces an entry's reading, batch
// by batch (add-on 0072-add12). The readings themselves still follow NAMES_READINGS alone.
import data from '../../data/names-daily.json'
import enriched from '../../data/names-enriched.json'
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
/** An entry of the file's appendix (add-on 0072-add1): not in the rotation; its note as the readings, by the same rules. */
export type NameAppendix = { n: number; name: string; note: string }

/** A quote of the enriched card: verbatim from a classical book on shamela.ws, shown without the edition's diacritics,
 *  or from a fatwa page of binbaz.org.sa (add-on 0072-add23 §1: its link with its title, `ref` empty).
 *  `by` said it («قال» for "qala", «يُروى عن» for "yurwa"); `via` when the book's author quotes him; `ref` is the
 *  printed volume and page (or pages, «ص219–220»); `context` names the ayah the scholar is explaining, `ayah` its id,
 *  when he is, or the worship he speaks of; `contextRequired`: the card shows that line with the quote, always
 *  (add-on 0072-add16 §8). The app's logged marks only: a printed-page marker removed, punctuation, and the Quran's
 *  braces ﴿﴾ around words matched on their ayah (§6, §7, §10). `origin`: a second ascription with its link (§7). */
export type NameQuote = {
  text: string
  by: string
  attribution: 'qala' | 'yurwa'
  via?: string
  author: string
  book: string
  ref: string
  url: string
  context?: string
  ayah?: string
  contextRequired?: true
  origin?: { text: string; url: string }
}
/** A HadeethEnc hadith that explains the name (add-on 0072-add16 §4): its id, and its grade and takhrij as HadeethEnc
 *  gives them; the app reads the text by id from /api/adhkar/hadith, like the entry's own hadith. */
export type NameHadith = { id: string; grade: string; attribution: string; url: string }
/** What an entry adds to the card while NAMES_ENRICHED is on; only the sections it has. */
export type NameEnriched = { meaning?: NameQuote[]; meaningHadith?: NameHadith; salaf?: NameQuote[]; heart?: string }
type StoredEnriched = NameEnriched & { name: string; batch: number }

export const NAMES_EPOCH: string = data.epoch
export const NAME_ENTRIES = data.entries as Stored[]
export const NAME_APPENDIX = data.appendix as NameAppendix[]
export const NAME_ENRICHED = enriched.entries as unknown as Record<string, StoredEnriched>

/** The enriched texts of entry `n`, present sections only; {} for an entry no batch has reached. */
export function enrichedOf(n: number): NameEnriched {
  const e = NAME_ENRICHED[String(n)]
  if (!e) return {}
  return {
    ...(e.meaning?.length ? { meaning: e.meaning } : {}),
    ...(e.meaningHadith ? { meaningHadith: e.meaningHadith } : {}),
    ...(e.salaf?.length ? { salaf: e.salaf } : {}),
    ...(e.heart ? { heart: e.heart } : {}),
  }
}

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
export const namesEnrichedOn = (env: Pick<Env, 'NAMES_ENRICHED'>) => env.NAMES_ENRICHED === 'on'
type NamesEnv = Pick<Env, 'NAMES_READINGS' | 'NAMES_ENRICHED'>

/** The day's entry; the readings while their switch is on, and the enriched texts while theirs is, whatever the
 *  interface language (`lang` is the client's, and changes nothing here since add-on 0071-add5: they are Arabic for
 *  everyone). */
export function nameOfDay(env: NamesEnv, day: string) {
  const index = nameDayIndex(day)
  const { readings, ...entry } = NAME_ENTRIES[index]
  return {
    day,
    index,
    count: NAME_ENTRIES.length,
    entry,
    ...(namesReadingsOn(env) ? { readings } : {}),
    ...(namesEnrichedOn(env) ? enrichedOf(entry.n) : {}),
  }
}

/** Entry `n` (1–96) with its neighbours in the order, round from the last to the first; null when there is none. */
export function nameEntry(env: NamesEnv, n: number) {
  const count = NAME_ENTRIES.length
  if (!Number.isInteger(n) || n < 1 || n > count) return null
  const index = n - 1
  const { readings, ...entry } = NAME_ENTRIES[index]
  const near = (k: number) => {
    const e = NAME_ENTRIES[(k + count) % count]
    return { n: e.n, name: e.name }
  }
  return {
    index,
    count,
    entry,
    ...(namesReadingsOn(env) ? { readings } : {}),
    ...(namesEnrichedOn(env) ? enrichedOf(entry.n) : {}),
    prev: near(index - 1),
    next: near(index + 1),
  }
}

/** «كل الأسماء»: the 96 in their order and the six of the appendix, names only but for the appendix notes. */
export function namesList(env: Pick<Env, 'NAMES_READINGS'>) {
  const on = namesReadingsOn(env)
  return {
    count: NAME_ENTRIES.length,
    entries: NAME_ENTRIES.map((e) => ({ n: e.n, name: e.name })),
    appendix: NAME_APPENDIX.map((a) => (on ? { n: a.n, name: a.name, note: a.note } : { n: a.n, name: a.name })),
  }
}

export async function handleNamesDay(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET' || !url.pathname.startsWith('/api/names/')) return null
  if (url.pathname === '/api/names/list') return json(namesList(env), 200, CACHE)
  const m = url.pathname.match(/^\/api\/names\/entry\/(\d{1,3})$/)
  if (m) {
    const r = nameEntry(env, Number(m[1]))
    return r ? json(r, 200, CACHE) : json({ ok: false, error: 'not_found' }, 404)
  }
  if (url.pathname !== '/api/names/day') return null
  const asked = url.searchParams.get('day')
  if (asked !== null && !validDay(asked)) return json({ ok: false, error: 'bad_day' }, 400)
  const day = asked ?? riyadhDay()
  return json(nameOfDay(env, day), 200, CACHE)
}
