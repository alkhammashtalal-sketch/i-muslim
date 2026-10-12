// The opening words of the 240 hizb quarters for the reader's index (reply 0032 C-1), cut from each ayah's text in
// D1 (never typed). The positions are QuranData's (web/src/v2/reading/quran-meta.json, numbers only).
//   GET /api/quarters → [{ q, sura, aya, page, first, more }] (240), edge-cached like the other reader routes
// Reads by primary key only: the passages' ids, in batches of 90 bound values (D1 allows 100).
import meta from '../../web/src/v2/reading/quran-meta.json'
import { firstWords } from '../../web/src/v2/reading/meta'
import type { Env } from './index'

export type Quarter = { q: number; sura: number; aya: number; page: number; first: string; more: boolean }

export async function getQuarters(env: Env): Promise<Quarter[]> {
  const pos = meta.quarters as [number, number][]
  const ids = pos.map(([s, a]) => `quran:${s}:${a}`)
  const stmts = []
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90)
    stmts.push(env.DB.prepare(`SELECT id, text, page FROM passages WHERE id IN (${chunk.map(() => '?').join(', ')})`).bind(...chunk))
  }
  const rows = new Map<string, { text: string; page: number }>()
  for (const r of await env.DB.batch(stmts)) for (const x of r.results as { id: string; text: string; page: number }[]) rows.set(x.id, x)
  return pos.flatMap(([sura, aya], q) => {
    const r = rows.get(`quran:${sura}:${aya}`)
    if (!r) return []
    const w = firstWords(r.text)
    return [{ q, sura, aya, page: r.page, first: w.cut, more: w.more }]
  })
}
