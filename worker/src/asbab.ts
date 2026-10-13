// «سبب النزول» under an ayah (reply 0036 §أ; board AsbabAyah):
//   GET /api/asbab/:sura/:aya?lang=xx  → { ayah: 'quran:S:A', items: { ar: Hadith, tr?: Hadith }[] }
// The ids come from shared/asbab.ts (data/asbab-map.json and its two conditions); the hadiths are read from D1 by
// their primary key (id, lang), one batch for the ayah (CLAUDE.md §12), and returned as stored: the text, the grade in
// its own words and the takhrij, never edited, never written by a model. An ayah without an accepted link reads
// nothing and answers no items, so the panel shows no section. A row that is missing, or whose stored grade is not
// accepted (tier 1–3, not weak, fabricated or mixed), is left out whatever the map says.
import { asbabIds } from '../../shared/asbab'
import { langOf, shownRow, toHadith, type Hadith } from './hadith'
import type { Env } from './index'
import { json, notFound } from './reader'

type Row = Parameters<typeof toHadith>[0]
export type AsbabItem = { ar: Hadith; tr?: Hadith }
export type AsbabResponse = { ayah: string; items: AsbabItem[] }

export async function getAsbab(env: Env, sura: number, aya: number, lang: string): Promise<AsbabResponse> {
  const ayah = `quran:${sura}:${aya}`
  const ids = asbabIds(sura, aya)
  if (!ids.length) return { ayah, items: [] }
  const l = langOf(lang)
  const stmts = ids.flatMap((id) => [
    env.DB.prepare(`SELECT * FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(id),
    ...(l !== 'ar' ? [env.DB.prepare(`SELECT * FROM hadiths WHERE id = ? AND lang = ?`).bind(id, l)] : []),
  ])
  const res = await env.DB.batch(stmts)
  const per = l !== 'ar' ? 2 : 1
  const items: AsbabItem[] = []
  ids.forEach((_, i) => {
    const ar = (res[i * per].results as Row[])[0]
    if (!ar || !shownRow(ar)) return
    const tr = per === 2 ? (res[i * per + 1].results as Row[])[0] : undefined
    items.push({ ar: toHadith(ar), ...(tr ? { tr: toHadith(tr) } : {}) })
  })
  return { ayah, items }
}

export async function handleAsbab(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') return null
  const m = url.pathname.match(/^\/api\/asbab\/(\d{1,3})\/(\d{1,3})$/)
  if (!m) return null
  const sura = Number(m[1])
  const aya = Number(m[2])
  if (sura < 1 || sura > 114 || aya < 1 || aya > 286) return notFound()
  return json(await getAsbab(env, sura, aya, url.searchParams.get('lang') ?? 'ar'))
}
