// Checks the model's JSON before anything is shown (CLAUDE.md §3 rule 6). Pure function: no I/O.
import type { Sentence } from '../../shared/api'
import { tokenize } from './lib/normalize.ts'

export type Verdict =
  | { kind: 'abstain'; reason: string }
  | { kind: 'referral'; level: 'C' | 'D'; disputed: boolean }
  | { kind: 'answer'; level: 'A' | 'B'; ids: string[]; direct: Sentence; explanation: Sentence[]; dropped: number }

const MAX_SENTENCE = 600
const COPY_RUN = 6 // this many consecutive words of a verse/hadith in a generated sentence = copied sacred text
const MAX_QUOTES = 5

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function grams(text: string, n: number): string[] {
  const w = tokenize(text)
  const out: string[] = []
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '))
  return out
}

/** sacred: id → verbatim text of each Quran/hadith passage that was sent (creed passages are not included). */
export function verify(
  raw: unknown,
  sentIds: string[],
  sacred: Record<string, string>,
  explainMode: 'generated' | 'tafsir_only',
): Verdict {
  if (!isObj(raw)) return { kind: 'abstain', reason: 'not_json_object' }
  const level = raw.level
  if (level !== 'A' && level !== 'B' && level !== 'C' && level !== 'D') return { kind: 'abstain', reason: 'bad_level' }
  if (raw.disputed === true) return { kind: 'referral', level: 'C', disputed: true }
  if (level === 'C' || level === 'D') return { kind: 'referral', level, disputed: false }
  if (raw.answerable !== true) return { kind: 'abstain', reason: 'not_answerable' }

  const sent = new Set(sentIds)
  const copied = new Set(Object.values(sacred).flatMap((t) => grams(t, COPY_RUN)))
  const validCites = (x: unknown) =>
    Array.isArray(x) ? [...new Set(x.filter((c): c is string => typeof c === 'string' && sent.has(c)))] : []

  let dropped = 0
  const clean = (x: unknown): Sentence | null => {
    if (!isObj(x) || typeof x.text !== 'string') return null
    const text = x.text.trim()
    const cites = validCites(x.cites)
    if (!text || text.length > MAX_SENTENCE || cites.length === 0) return null
    if (grams(text, COPY_RUN).some((g) => copied.has(g))) return null
    return { text, cites }
  }

  const used = validCites(raw.used_passages)
  let direct: Sentence
  let explanation: Sentence[] = []

  if (explainMode === 'tafsir_only') {
    const cites = isObj(raw.direct) ? validCites(raw.direct.cites) : []
    direct = { text: '', cites: cites.length ? cites : used }
    if (direct.cites.length === 0) return { kind: 'abstain', reason: 'no_valid_passage' }
  } else {
    const d = clean(raw.direct)
    if (!d) return { kind: 'abstain', reason: 'direct_without_valid_cite' }
    direct = d
    const list = Array.isArray(raw.explanation) ? raw.explanation : []
    for (const s of list) {
      const c = clean(s)
      if (c) explanation.push(c)
      else dropped++
    }
    explanation = explanation.slice(0, 4)
  }

  // Cited passages first, so every kept sentence points at a quote that is actually shown.
  const ids = [...new Set([...direct.cites, ...explanation.flatMap((s) => s.cites), ...used])].slice(0, MAX_QUOTES)
  const shown = new Set(ids)
  direct = { ...direct, cites: direct.cites.filter((c) => shown.has(c)) }
  const kept = explanation.map((s) => ({ ...s, cites: s.cites.filter((c) => shown.has(c)) })).filter((s) => s.cites.length > 0)
  dropped += explanation.length - kept.length
  return { kind: 'answer', level, ids, direct, explanation: kept, dropped }
}
