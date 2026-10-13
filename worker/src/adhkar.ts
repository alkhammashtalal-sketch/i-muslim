// Adhkar from HadeethEnc (reply 0032 D-5): eight of its categories, sahih and hasan only (rule 10: no deed is built on a
// weak hadith; the weak stay visible with their badge in search and on the hadith page).
//   GET /api/adhkar/:category?lang=xx → { category, items: [{ id, title, text, grade, attribution, tier, version,
//        highlights, count, translation? }] }
// Reads by key only: hadith_categories (category prefix of its primary key), then hadiths by (id, lang). The text is
// D1's as received; highlights and counters come from data/adhkar-*.json and are kept only when they are verbatim in it.
// Highlights follow reply 0031-add16 §2 (worker/src/adhkar-rules.ts): all of a hadith's segments or none, and none
// in a hadith with more than one «…» pair, or in an entry on hold, until the coordinator has reviewed its entry.
// `title` is HadeethEnc's own title of the Arabic row, and `translation.title` that of the language row, both as
// received (the card's title).
import counts from '../../data/adhkar-counts.json'
import highlights from '../../data/adhkar-highlights.json'
import { ADHKAR_CATEGORIES, highlightFor, MAX, strip, type HighlightEntry } from './adhkar-rules'
import type { Env } from './index'
import { json } from './reader'

export { ADHKAR_CATEGORIES, MAX }

const LANGS = new Set(['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])
const ENTRIES = new Map((highlights.highlights as HighlightEntry[]).map((h) => [h.id, h]))

type Row = { id: string; lang: string; title: string | null; text: string; attribution: string | null; grade: string | null; tier: string; version: string | null }

export async function handleAdhkar(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/adhkar\/(\d{1,4})$/)
  if (!m || request.method !== 'GET') return null
  const cat = ADHKAR_CATEGORIES.find((c) => c.id === m[1])
  if (!cat) return json({ ok: false, error: 'not_found' }, 404)
  const lang = url.searchParams.get('lang') ?? 'ar'
  const tl = LANGS.has(lang) ? lang : null
  const { results: ids } = await env.DB.prepare("SELECT id FROM hadith_categories WHERE category = ? AND tier IN ('1', '2', '3') LIMIT ?")
    .bind(cat.id, MAX)
    .all<{ id: string }>()
  if (!ids.length) return json({ category: cat.id, items: [] }, 200, 'public, max-age=3600')
  const cols = 'id, lang, title, text, attribution, grade, tier, version'
  const stmts = ids.flatMap(({ id }) => [
    env.DB.prepare(`SELECT ${cols} FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(id),
    ...(tl ? [env.DB.prepare(`SELECT ${cols} FROM hadiths WHERE id = ? AND lang = ?`).bind(id, tl)] : []),
  ])
  const res = await env.DB.batch(stmts)
  const step = tl ? 2 : 1
  const items = ids
    .map((_, i) => {
      const ar = (res[i * step].results as Row[])[0]
      if (!ar || !['1', '2', '3'].includes(ar.tier)) return null
      const tr = tl ? (res[i * step + 1].results as Row[])[0] : undefined
      const plain = strip(ar.text)
      const hl = highlightFor(ar.text, ENTRIES.get(ar.id)).segments
      const c = counts.counts.find((x) => x.id === ar.id && plain.includes(strip(x.evidence)))
      return {
        id: ar.id,
        title: ar.title,
        text: ar.text,
        grade: ar.grade,
        attribution: ar.attribution,
        tier: ar.tier,
        version: ar.version,
        highlights: hl,
        count: c ? { n: c.count, evidence: c.evidence } : null,
        ...(tr ? { translation: { lang: tr.lang, title: tr.title, text: tr.text, grade: tr.grade, attribution: tr.attribution, version: tr.version } } : {}),
      }
    })
    .filter((x) => x !== null)
    // Sahih before hasan (rule 10), then by id.
    .sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id))
  return json({ category: cat.id, items }, 200, 'public, max-age=3600')
}

/** One sahih or hasan hadith and its translation, for the names' Sunnah evidence (reply 0032 D-8):
 *  GET /api/adhkar/hadith/:id?lang=xx → { id, title, text, grade, attribution, tier, version, translation? } */
export async function handleToolHadith(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/adhkar\/hadith\/(\d{1,7})$/)
  if (!m || request.method !== 'GET') return null
  const lang = url.searchParams.get('lang') ?? 'ar'
  const tl = LANGS.has(lang) ? lang : null
  const cols = 'id, lang, title, text, attribution, grade, tier, version'
  const res = await env.DB.batch([
    env.DB.prepare(`SELECT ${cols} FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(m[1]),
    ...(tl ? [env.DB.prepare(`SELECT ${cols} FROM hadiths WHERE id = ? AND lang = ?`).bind(m[1], tl)] : []),
  ])
  const ar = (res[0].results as Row[])[0]
  if (!ar || !['1', '2', '3'].includes(ar.tier)) return json({ ok: false, error: 'not_found' }, 404)
  const tr = tl ? (res[1].results as Row[])[0] : undefined
  return json(
    {
      id: ar.id,
      title: ar.title,
      text: ar.text,
      grade: ar.grade,
      attribution: ar.attribution,
      tier: ar.tier,
      version: ar.version,
      ...(tr ? { translation: { lang: tr.lang, title: tr.title, text: tr.text, grade: tr.grade, attribution: tr.attribution, version: tr.version } } : {}),
    },
    200,
    'public, max-age=3600',
  )
}
