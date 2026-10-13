// The language search (reply 0033 §أ1): on the device, no AI, no library. Each served language is found by its own
// name, its name in the interface language, its Arabic and English names, its code, and the names people type
// (data/lang-aliases.json), all compared after the same normalisation (shared/lang-norm.ts). The order («أقرب نتيجة»
// first): 0 a whole name, word or code; 1 a word that begins with what was typed; 2 a part of a word (three letters
// or more); 3 only when none of these matched, a spelling slip (an edit distance of 1 from four letters, 2 from eight),
// the fewest slips first. Words are also compared with their «ال» kept, so «ال…» finds the names while it is typed.
// Why not Fuse.js: its Bitap scoring with `ignoreLocation` matches parts of words with a slip, so «Hmong» found
// «Zhongwen» and «Nihongo» (zh, ja) even at a threshold of 0.3, and a word-level check was needed anyway; with 31
// languages a direct comparison is exact and small, and adds no dependency (Fuse.js is Apache-2.0, not MIT).
import type { Lang } from '../../../../shared/api'
import { foldText, normalizeName, searchWord } from '../../../../shared/lang-norm'
import aliasData from '../../../../data/lang-aliases.json'
import { servedRows, uiName, type LangRow } from './served'

const ALIASES = aliasData.aliases as Record<string, string[]>

export type Field = 'native' | 'ui' | 'ar' | 'en' | 'code' | 'alias'
type Words = { words: string[]; raw: string[] }
type Rec = { row: LangRow; fields: ({ f: Field } & Words)[] }

// Each word normalised (its «ال» dropped), and folded only (its «ال» kept), without the punctuation around it.
const rawWord = (w: string) => foldText(w).replace(/[^\p{L}\p{M}\p{N}]/gu, '')
const wordsOf = (s: string): Words => {
  const ws = s.split(/\s+/)
  return { words: ws.map(searchWord).filter(Boolean), raw: ws.map(rawWord).filter(Boolean) }
}

/** One searchable record per language: every field (each alias on its own) as normalised words. */
function records(uiLang: Lang): Rec[] {
  return servedRows(uiLang).map((row) => ({
    row,
    fields: [
      { f: 'native' as Field, ...wordsOf(row.native) },
      { f: 'ui' as Field, ...wordsOf(row.ui) },
      { f: 'ar' as Field, ...wordsOf(uiName(row.code, 'ar')) },
      { f: 'en' as Field, ...wordsOf(row.en) },
      { f: 'code' as Field, words: [row.code], raw: [row.code] },
      ...(row.namesAs ? [{ f: 'code' as Field, words: [row.namesAs], raw: [row.namesAs] }] : []),
      ...(ALIASES[row.code] ?? []).map((a) => ({ f: 'alias' as Field, ...wordsOf(a) })),
    ].filter((x) => x.words.length),
  }))
}
const cache = new Map<Lang, Rec[]>()
const index = (uiLang: Lang) => cache.get(uiLang) ?? cache.set(uiLang, records(uiLang)).get(uiLang)!

/** Edit distance with adjacent transpositions (optimal string alignment), by code points. */
export function editDistance(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  if (Math.abs(x.length - y.length) > 2) return 3
  const d = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[x.length][y.length]
}

/** The slips allowed in a query: none under four letters, one from four, two from eight. */
const slipsFor = (q: string) => {
  const n = [...q.replace(/\s/g, '')].length
  return n >= 8 ? 2 : n >= 4 ? 1 : 0
}

export type Hit = { row: LangRow; tier: 0 | 1 | 2 | 3; slips: number; matched: Field[] }

/** How one field matches: [tier, slips] or null. A code matches only whole («ar», not the «a» of «as»). */
function matchField(f: Field, words: string[], q: string, slips: number): [0 | 1 | 2 | 3, number] | null {
  const all = words.join(' ')
  if (all === q || words.includes(q)) return [0, 0]
  if (f === 'code') return null
  if (all.startsWith(q) || words.some((w) => w.startsWith(q))) return [1, 0]
  if ([...q].length >= 3 && all.includes(q)) return [2, 0]
  if (!slips) return null
  const single = !q.includes(' ')
  const d = Math.min(editDistance(all, q), ...(single ? words.map((w) => editDistance(w, q)) : [Infinity]))
  return d <= slips ? [3, d] : null
}

/** The served languages that match what was typed, the closest first («أقرب نتيجة»). Empty when nothing matches. */
export function searchLangs(query: string, uiLang: Lang): Hit[] {
  const q = normalizeName(query)
  if (!q) return []
  const qRaw = foldText(query).split(' ').map(rawWord).filter(Boolean).join(' ')
  const slips = slipsFor(q)
  const hits: (Hit & { order: number })[] = []
  index(uiLang).forEach((r, order) => {
    let best: [0 | 1 | 2 | 3, number] | null = null
    const matched = new Set<Field>()
    for (const { f, words, raw } of r.fields) {
      for (const m of [matchField(f, words, q, slips), qRaw ? matchField(f, raw, qRaw, 0) : null]) {
        if (!m) continue
        matched.add(f)
        if (!best || m[0] < best[0] || (m[0] === best[0] && m[1] < best[1])) best = m
      }
    }
    if (best) hits.push({ row: r.row, tier: best[0], slips: best[1], matched: [...matched], order })
  })
  // Slips are forgiven only when nothing matched as written («عربي» is not also «صربي»).
  const exact = hits.some((h) => h.tier < 3)
  return hits
    .filter((h) => !exact || h.tier < 3)
    .sort((a, b) => a.tier - b.tier || a.slips - b.slips || a.order - b.order)
    .map(({ order: _o, ...h }) => h)
}

/** The parts of a shown name to highlight: whole words that hold what was typed, as on the board (LangSearch). */
export function highlightWords(text: string, query: string): { text: string; mark: boolean }[] {
  const q = normalizeName(query)
  const qRaw = foldText(query).split(' ').map(rawWord).filter(Boolean).join(' ')
  const qs = q.split(' ')
  const slips = slipsFor(q)
  return text.split(/(\s+)/).map((p) => {
    const w = searchWord(p)
    const r = rawWord(p)
    const mark =
      (!!w && !!q && (w === q || w.startsWith(q) || ([...q].length >= 3 && w.includes(q)) || ([...w].length >= 2 && qs.includes(w)) || (slips > 0 && !q.includes(' ') && editDistance(w, q) <= slips))) ||
      (!!r && !!qRaw && r.startsWith(qRaw))
    return { text: p, mark }
  })
}

/** A name with nothing to highlight in it, highlighted whole (the language was found by a name people type). */
export function highlightOrWhole(text: string, query: string, whole: boolean) {
  const parts = highlightWords(text, query)
  return whole && !parts.some((p) => p.mark) ? [{ text, mark: true }] : parts
}
