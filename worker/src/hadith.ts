// HadeethEnc hadiths (source ب; reply 0032 B; migration 0008). Every read is by key or index (CLAUDE.md §12):
//   GET /api/hadith/:id?lang=xx        → { ar: Hadith, tr?: Hadith }  (primary key (id, lang), one batch)
//   GET /api/hadith/:id/same-topic     → { items: HadithBrief[] }     (hadith_categories by key, sahih only, ≤ 5)
//   GET /api/today?lang=xx             → { day, hadith: { ar, tr? } | null }  (tier 1 by (lang, tier, seq))
// Texts are returned as stored, never edited. Weak, mawdu and mixed rows come back with their class, so the page shows
// their badge (rule 10, V2 §11); they are never the hadith of the day (tier 1 only).
import dayConfig from './config/hadith-day.json'
import type { Env } from './index'
import { riyadhDay } from './lib/keys'
import { json, notFound } from './reader'

export const HADITH_LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const LANG_SET = new Set<string>(HADITH_LANGS)
const ID = /^\d{1,7}$/
const SAME_TOPIC_MAX = 5
const DAY_CACHE = 'public, max-age=600, s-maxage=3600'

type Row = {
  id: string
  lang: string
  title: string | null
  text: string
  intro: string | null
  attribution: string | null
  grade: string | null
  explanation: string | null
  hints: string | null
  words_meanings: string | null
  reference: string | null
  grade_ar: string | null
  attribution_ar: string | null
  categories: string | null
  class: string
  tier: string
  version: string | null
  // Migration 0009 (window 1): a report stopping at a Companion. Absent before it, read as false.
  mawquf?: number | boolean | null
}

export type Hadith = {
  id: string
  lang: string
  title: string | null
  text: string
  intro: string | null
  attribution: string | null
  grade: string | null
  explanation: string | null
  hints: string[]
  words: { word: string; meaning: string }[]
  reference: string | null
  categories: string[]
  class: string
  tier: string
  version: string | null
  /** A mawquf report (from a Companion, not the Prophet ﷺ): never introduced as the Prophet's saying anywhere. */
  mawquf: boolean
  url: string
}

// Every column, so a column added later (mawquf, migration 0009) is read when present and absent otherwise.
const COLS = '*'

const list = <T>(s: string | null): T[] => {
  try {
    const v = JSON.parse(s ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** The page of the hadith on HadeethEnc, in the row's language. */
export const hadithUrl = (id: string, lang: string) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`

export function toHadith(r: Row): Hadith {
  return {
    id: r.id,
    lang: r.lang,
    title: r.title,
    text: r.text,
    intro: r.intro,
    attribution: r.attribution,
    grade: r.grade,
    explanation: r.explanation,
    hints: list<string>(r.hints).filter((h) => typeof h === 'string' && h.trim()),
    words: list<{ word: string; meaning: string }>(r.words_meanings).filter((w) => w && typeof w.word === 'string'),
    reference: r.reference,
    categories: list<string | number>(r.categories).map(String),
    class: r.class,
    tier: r.tier,
    version: r.version,
    mawquf: isMawquf(r),
    url: hadithUrl(r.id, r.lang),
  }
}

const isMawquf = (r: Pick<Row, 'mawquf'>) => r.mawquf === true || r.mawquf === 1

/** The card of the day: tier 1, the grade exactly «صحيح» as written, not mawquf. */
export const dayEligible = (r: Pick<Row, 'tier' | 'grade' | 'mawquf'>) => r.tier === '1' && (r.grade ?? '').trim() === 'صحيح' && !isMawquf(r)

const langOf = (v: string | null) => (v && LANG_SET.has(v) ? v : 'ar')

/** The Arabic row and, outside Arabic, the language's row (when HadeethEnc has that translation). */
export async function getHadith(env: Env, id: string, lang: string): Promise<{ ar: Hadith; tr?: Hadith } | null> {
  const stmts = [env.DB.prepare(`SELECT ${COLS} FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(id)]
  if (lang !== 'ar') stmts.push(env.DB.prepare(`SELECT ${COLS} FROM hadiths WHERE id = ? AND lang = ?`).bind(id, lang))
  const res = await env.DB.batch(stmts)
  const ar = (res[0].results as Row[])[0]
  if (!ar) return null
  const tr = lang !== 'ar' ? (res[1].results as Row[])[0] : undefined
  return { ar: toHadith(ar), ...(tr ? { tr: toHadith(tr) } : {}) }
}

/** The day's index from the Riyadh date (days since 1970-01-01), so everyone sees the same hadith on the same day. */
export const dayIndex = (now = Date.now()) => Math.floor(Date.parse(`${riyadhDay(now)}T00:00:00Z`) / 86_400_000)

/** The hadith of the day: tier 1 (agreed upon, or narrated by al-Bukhari or Muslim, and sahih), by seq. */
export async function hadithOfDay(env: Env, lang: string, now = Date.now()): Promise<{ ar: Hadith; tr?: Hadith } | null> {
  const n = Number((dayConfig as { tier1_ar?: number }).tier1_ar ?? 0)
  if (!n) return null
  const seq = dayIndex(now) % n
  const row = await env.DB.prepare(`SELECT * FROM hadiths WHERE lang = 'ar' AND tier = '1' AND seq = ?`).bind(seq).first<Row>()
  // The card takes a grade of exactly «صحيح» (no partial or multiple grade) and never a mawquf report (reply
  // 0031-add14 §2). The loader numbers only such rows; this check holds even before it does.
  if (!row || !dayEligible(row)) return null
  return getHadith(env, row.id, lang)
}

export type HadithBrief = { id: string; text: string; grade: string | null; attribution: string | null }

/** Sahih hadiths sharing a category with this one (HadeethEnc's own chapters), labelled «أحاديث صحيحة في الموضوع
 *  نفسه» by the page; never chosen by a model. Reads: one row, then the categories by key, then the rows by key. */
export async function sameTopic(env: Env, id: string): Promise<HadithBrief[]> {
  const self = await env.DB.prepare(`SELECT categories FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(id).first<{ categories: string | null }>()
  const cats = list<string | number>(self?.categories ?? null).map(String).slice(0, 4)
  if (!cats.length) return []
  const res = await env.DB.batch(
    cats.map((c) => env.DB.prepare(`SELECT id FROM hadith_categories WHERE category = ? AND tier IN ('1', '2') AND id <> ? LIMIT ${SAME_TOPIC_MAX}`).bind(c, id)),
  )
  const ids = [...new Set(res.flatMap((r) => (r.results as { id: string }[]).map((x) => x.id)))].slice(0, SAME_TOPIC_MAX)
  if (!ids.length) return []
  const rows = await env.DB.batch(ids.map((x) => env.DB.prepare(`SELECT * FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(x)))
  return rows
    .map((r) => (r.results as (Row & HadithBrief)[])[0])
    .filter((r) => r && r.class === 'sahih' && !isMawquf(r))
    .map(({ id: i, text, grade, attribution }) => ({ id: i, text, grade, attribution }))
}

export async function handleHadith(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') return null
  const p = url.pathname
  const lang = langOf(url.searchParams.get('lang'))
  if (p === '/api/today') {
    const hadith = await hadithOfDay(env, lang).catch(() => null)
    return json({ day: riyadhDay(), hadith }, 200, DAY_CACHE)
  }
  const same = p.match(/^\/api\/hadith\/([^/]+)\/same-topic$/)
  if (same) {
    if (!ID.test(same[1])) return notFound()
    return json({ items: await sameTopic(env, same[1]) })
  }
  const one = p.match(/^\/api\/hadith\/([^/]+)$/)
  if (one) {
    if (!ID.test(one[1])) return notFound()
    const h = await getHadith(env, one[1], lang)
    return h ? json(h) : notFound()
  }
  return null
}
