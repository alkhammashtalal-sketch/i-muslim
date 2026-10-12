// Adhkar from HadeethEnc (reply 0032 D-5): eight of its categories, sahih and hasan only (rule 10: no deed is built on a
// weak hadith; the weak stay visible with their badge in search and on the hadith page).
//   GET /api/adhkar/:category?lang=xx → { category, items: [{ id, title, text, grade, attribution, tier, version,
//        highlights, count, translation? }] }
// Reads by key only: hadith_categories (category prefix of its primary key), then hadiths by (id, lang). The text is
// D1's as received; highlights and counters come from data/adhkar-*.json and are kept only when they are verbatim in it.
import counts from '../../data/adhkar-counts.json'
import highlights from '../../data/adhkar-highlights.json'
import type { Env } from './index'
import { json } from './reader'

/** The categories, in the reply's order, with their HadeethEnc titles in Arabic (categories/list, 13 October). */
export const ADHKAR_CATEGORIES = [
  { id: '301', ar: 'أذكار الصباح والمساء' },
  { id: '465', ar: 'أذكار الصلاة' },
  { id: '313', ar: 'الأدعية المأثورة' },
  { id: '302', ar: 'الأذكار المطلقة' },
  { id: '303', ar: 'أذكار الدخول والخروج من المنزل' },
  { id: '306', ar: 'أذكار الدخول والخروج من المسجد' },
  { id: '307', ar: 'الأذكار التي تقال في أوقات الشدة' },
  { id: '308', ar: 'الأذكار للأمور العارضة' },
] as const

const LANGS = new Set(['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])
const MAX = 60
const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()

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
      const hl = highlights.highlights.filter((h) => h.id === ar.id && plain.includes(strip(h.phrase))).map((h) => h.phrase)
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
