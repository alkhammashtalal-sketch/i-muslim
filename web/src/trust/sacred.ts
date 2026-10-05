// Ayat and quoted speech inside a passage, and a guard against repeating ayah text. One extractor for the Worker
// (explain.ts: what the model must never reproduce) and the browser (speakable.ts: what is never read aloud).
// Pure and import-free, so both bundles can use it.

export type PassagePart = { kind: 'plain' | 'ayah' | 'speech'; text: string }

const CLOSE: Record<string, { kind: 'ayah' | 'speech'; close: string }> = {
  '{': { kind: 'ayah', close: '}' }, // ayat in our editions
  '﴿': { kind: 'ayah', close: '﴾' },
  '"': { kind: 'speech', close: '"' }, // hadith, athar and other quotations
  '«': { kind: 'speech', close: '»' },
  '“': { kind: 'speech', close: '”' },
}
const STRAY = /[{}﴿﴾"«»“”]/

/**
 * Splits a passage into plain text, ayat ({…} or ﴿…﴾) and quoted speech ("…", «…», “…”), pairing marks in order
 * (a quotation that contains an ayah stays one quotation). `paired` is false when a mark has no partner: the
 * split cannot be trusted then, and callers must treat the whole passage as protected.
 */
export function splitPassage(text: string): { parts: PassagePart[]; paired: boolean } {
  const parts: PassagePart[] = []
  let plain = ''
  let i = 0
  while (i < text.length) {
    const open = CLOSE[text[i]]
    if (!open) {
      if (STRAY.test(text[i])) return { parts, paired: false } // a closing mark with no opening one
      plain += text[i++]
      continue
    }
    const end = text.indexOf(open.close, i + 1)
    if (end < 0) return { parts, paired: false }
    if (plain) parts.push({ kind: 'plain', text: plain })
    plain = ''
    parts.push({ kind: open.kind, text: text.slice(i + 1, end) })
    i = end + 1
  }
  if (plain) parts.push({ kind: 'plain', text: plain })
  return { parts, paired: true }
}

/**
 * The ayat and the quotations inside a passage. When the marks do not pair up, every span any reading could take
 * as an ayah or a quotation is returned (regex pairing, as before the split existed): protection may over-include,
 * never under-include.
 */
export function passageQuotes(passage: string): { ayat: string[]; speech: string[] } {
  const { parts, paired } = splitPassage(passage)
  if (paired) {
    const speech = parts.filter((p) => p.kind === 'speech').map((p) => p.text)
    // An ayah recited inside a hadith ("… يقرأ هذه الآية: {…}") is still an ayah.
    const nested = speech.flatMap((t) => [...t.matchAll(/\{([^{}]+)\}|﴿([^﴾]+)﴾/g)].map((m) => m[1] ?? m[2]))
    return { ayat: [...parts.filter((p) => p.kind === 'ayah').map((p) => p.text), ...nested], speech }
  }
  return {
    ayat: [...passage.matchAll(/\{([^{}]+)\}|﴿([^﴾]+)﴾/g)].map((m) => m[1] ?? m[2]),
    speech: [...passage.matchAll(/"([^"]+)"|«([^»]+)»|“([^”]+)”/g)].map((m) => m[1] ?? m[2] ?? m[3]),
  }
}

/** Ayat and quotations (12+ characters) inside a book passage: never to be reproduced, translated or read aloud. */
export function quotedSacredTexts(passage: string): string[] {
  const { ayat, speech } = passageQuotes(passage)
  return [...ayat, ...speech.filter((t) => t.length >= 12)]
}

/** The basmala is an ayah (al-Fatiha 1:1); the creed books open with it outside any brackets. */
export const BASMALA = 'بسم الله الرحمن الرحيم'

/** Arabic folded for matching only: no harakat or Quranic marks, one alef, ya and ta marbuta, hamza seats folded, no punctuation. */
export function matchWords(s: string): string[] {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** Folded word runs that must not be read: every `n` consecutive words of each text; a shorter text whole. */
export type Runs = { grams: Set<string>; lengths: number[] }

export function protectedRuns(texts: string[], n = 4): Runs {
  const grams = new Set<string>()
  const lengths = new Set<number>()
  for (const t of texts) {
    const w = matchWords(t)
    if (w.length === 0) continue
    if (w.length < n) {
      grams.add(w.join(' ')) // an ayah of one to three words («الم», «والعصر», «رب موسى وهارون») is protected whole
      lengths.add(w.length)
      continue
    }
    for (let i = 0; i + n <= w.length; i++) grams.add(w.slice(i, i + n).join(' '))
    lengths.add(n)
  }
  return { grams, lengths: [...lengths].sort((a, b) => b - a) }
}

/** Where protected runs occur in a list of folded words, as [start, end) word ranges. */
export function findRuns(words: string[], runs: Runs): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < words.length; i++) {
    for (const len of runs.lengths) {
      if (i + len <= words.length && runs.grams.has(words.slice(i, i + len).join(' '))) out.push([i, i + len])
    }
  }
  return out
}

/** True when `text` repeats a protected run. */
export function sharesRun(text: string, runs: Runs): boolean {
  return findRuns(matchWords(text), runs).length > 0
}
