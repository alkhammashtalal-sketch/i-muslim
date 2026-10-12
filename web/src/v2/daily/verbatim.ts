// Finding a phrase inside a sacred text without retyping it (reply 0032 D-5, D-6): the phrase is matched with the
// diacritics, tatweel and joiners removed on both sides, and the result is the text's own span, with its own
// diacritics, so what is shown is always cut from the source.
const MARK = /[ً-ْٰـ‌‍]/

/** The text without marks, and for each of its characters the index in the original. */
function plain(text: string): { s: string; at: number[] } {
  let s = ''
  const at: number[] = []
  let lastSpace = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (MARK.test(ch)) continue
    const space = /\s/.test(ch)
    if (space && lastSpace) continue
    s += space ? ' ' : ch
    at.push(i)
    lastSpace = space
  }
  return { s, at }
}

/** [start, end) of the phrase in the original text, the end extended over the marks of its last letter; or null. */
export function findSpan(text: string, phrase: string, from = 0): [number, number] | null {
  const t = plain(text)
  const p = plain(phrase).s.trim()
  if (!p) return null
  const startPlain = t.at.findIndex((i) => i >= from)
  const k = t.s.indexOf(p, Math.max(0, startPlain))
  if (k < 0) return null
  const start = t.at[k]
  let end = t.at[k + p.length - 1] + 1
  while (end < text.length && MARK.test(text[end])) end++
  return [start, end]
}

/** The phrase as written in the text (with the text's diacritics), or null. */
export function cutVerbatim(text: string, phrase: string): string | null {
  const s = findSpan(text, phrase)
  return s ? text.slice(s[0], s[1]) : null
}

/** The text split into plain and highlighted parts, for every phrase found (overlaps keep the first). */
export function highlightParts(text: string, phrases: string[]): { text: string; mark: boolean }[] {
  const spans = phrases
    .map((p) => findSpan(text, p))
    .filter((x): x is [number, number] => x !== null)
    .sort((a, b) => a[0] - b[0])
  const out: { text: string; mark: boolean }[] = []
  let at = 0
  for (const [s, e] of spans) {
    if (s < at) continue
    if (s > at) out.push({ text: text.slice(at, s), mark: false })
    out.push({ text: text.slice(s, e), mark: true })
    at = e
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false })
  return out
}
