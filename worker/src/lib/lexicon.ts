import { normalizeArabic, stripPrefixes, tokenize } from './normalize.ts'

export type Lexicon = { entries: { topic: string; when: string[]; add: string[] }[] }

const norm = (s: string) => tokenize(s).join(' ')

/** Lexicon terms to add to a question's keyword query, and which topics fired (for the report). */
export function expand(q: string, lex: Lexicon): { add: string[]; topics: string[] } {
  const words = tokenize(q)
  const qNorm = ` ${words.join(' ')} `
  const bag = new Set<string>()
  for (const w of words) {
    bag.add(w)
    const st = stripPrefixes(w)
    if (st.length >= 2) bag.add(st)
  }
  const add: string[] = []
  const topics: string[] = []
  for (const e of lex.entries) {
    const hit = e.when.some((raw) => {
      const w = norm(raw)
      if (!w) return false
      if (w.includes(' ')) return qNorm.includes(` ${w} `)
      if (bag.has(w)) return true
      const st = stripPrefixes(w)
      return st.length >= 2 && bag.has(st)
    })
    if (!hit) continue
    topics.push(e.topic)
    for (const a of e.add) if (!add.includes(a)) add.push(a)
  }
  return { add, topics }
}

/** Normalization for the multilingual lexicon only: keeps combining vowel signs (Devanagari, Bengali), drops
 *  Latin accents (jeûne → jeune) and the dot of Turkish İ, and applies the Arabic-script rules (Urdu). */
export function multiNorm(s: string): string {
  return normalizeArabic(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Multilingual lexicon: whole-word or phrase match of common Islamic terms in other languages → Arabic terms. */
export function expandMulti(q: string, lex: Lexicon): { add: string[]; topics: string[] } {
  const nq = ` ${multiNorm(q)} `
  const add: string[] = []
  const topics: string[] = []
  for (const e of lex.entries) {
    if (!e.when.some((w) => {
      const nw = multiNorm(w)
      return nw.length > 1 && nq.includes(` ${nw} `)
    }))
      continue
    topics.push(e.topic)
    for (const a of e.add) if (!add.includes(a)) add.push(a)
  }
  return { add, topics }
}
