import { stripPrefixes, tokenize } from './normalize.ts'

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
