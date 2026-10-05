import { normalizeArabic, stripPrefixes, tokenize } from './normalize.ts'

export type Lexicon = { entries: { topic: string; when: string[]; add: string[] }[] }

const norm = (s: string) => tokenize(s).join(' ')

/** The most specific phrase wins: a topic whose matched trigger lies inside a longer trigger of another fired topic
 *  («الصلاه» inside «شروط الصلاه», "namaz" inside "namazın şartları") adds nothing, so a precise phrase is not
 *  outweighed by the general terms of the broader topic. */
function mostSpecific(fired: { topic: string; trigger: string; add: string[] }[]): { add: string[]; topics: string[] } {
  const kept = fired.filter(
    (a) => !fired.some((b) => b !== a && b.trigger.length > a.trigger.length && ` ${b.trigger} `.includes(` ${a.trigger} `)),
  )
  const add: string[] = []
  for (const e of kept) for (const a of e.add) if (!add.includes(a)) add.push(a)
  return { add, topics: fired.map((e) => e.topic) }
}

/** Lexicon terms to add to a question's keyword query, and which topics fired (for the report). */
export function expand(q: string, lex: Lexicon): { add: string[]; topics: string[] } {
  const words = tokenize(q)
  const qNorm = ` ${words.join(' ')} `
  const bag = new Map<string, string>() // a form found in the question → the question's word
  for (const w of words) {
    bag.set(w, w)
    const st = stripPrefixes(w)
    if (st.length >= 2 && !bag.has(st)) bag.set(st, w)
  }
  const fired: { topic: string; trigger: string; add: string[] }[] = []
  for (const e of lex.entries) {
    let trigger: string | null = null
    for (const raw of e.when) {
      const w = norm(raw)
      if (!w) continue
      if (w.includes(' ')) {
        if (qNorm.includes(` ${w} `)) trigger = w
      } else if (bag.has(w)) trigger = bag.get(w)!
      else {
        const st = stripPrefixes(w)
        if (st.length >= 2 && bag.has(st)) trigger = bag.get(st)!
      }
      if (trigger) break
    }
    if (trigger) fired.push({ topic: e.topic, trigger, add: e.add })
  }
  return mostSpecific(fired)
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
  const fired: { topic: string; trigger: string; add: string[] }[] = []
  for (const e of lex.entries) {
    const hit = e.when.map(multiNorm).find((nw) => nw.length > 1 && nq.includes(` ${nw} `))
    if (hit) fired.push({ topic: e.topic, trigger: hit, add: e.add })
  }
  return mostSpecific(fired)
}
