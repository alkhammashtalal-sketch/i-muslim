// Level gate without a model (CLAUDE.md §5 step 3) and the disputed-topics list (rule 11).
import { tokenize } from './lib/normalize.ts'

export type GateRule = { level: 'C' | 'D'; why: string; ar: string[]; en: string[] }
export type GateHit = { level: 'C' | 'D'; why: string }

const norm = (s: string) => ` ${tokenize(s).join(' ')} `

/** First rule (in file order) with a phrase that occurs as whole words in the question. */
export function gate(q: string, rules: GateRule[]): GateHit | null {
  const nq = norm(q)
  for (const r of rules) {
    for (const p of [...r.ar, ...r.en]) {
      const np = tokenize(p).join(' ')
      if (np && nq.includes(` ${np} `)) return { level: r.level, why: r.why }
    }
  }
  return null
}

/** True when the question names a topic the Sharia reviewer listed as disputed. */
export function isDisputedTopic(q: string, topics: string[]): boolean {
  const nq = norm(q)
  return topics.some((t) => {
    const nt = tokenize(t).join(' ')
    return nt.length > 0 && nq.includes(` ${nt} `)
  })
}
