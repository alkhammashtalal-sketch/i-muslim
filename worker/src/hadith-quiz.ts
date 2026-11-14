// «تأكد من فهمك» (reply 0033 §أ2): the questions stored with a hadith row (migration 0013, column `quiz`), computed
// at load time by scripts/index/hadith-quiz.mjs (the rules are written there). This module only reads them back:
//   GET /api/hadith/:id/quiz?lang=xx → { id, lang, questions: QuizQuestion[] }
// One read by primary key (id, lang) of the row in the reader's language (CLAUDE.md §12). The answer to question n is
// that row's own benefit n, taken from its `hints` at read time and checked against the stored key `k`, so a quiz
// that no longer matches its row is dropped rather than shown. Every option is a HadeethEnc benefit as stored; the
// wrong ones carry the id and title of the hadith they come from, so the page can say where without another request
// (nothing about the reader's answer ever reaches the server).

export const QUIZ_MAX = 5

export type QuizOption = {
  /** The benefit, verbatim. */
  text: string
  /** The hadith it comes from: this hadith for the answer, another for a wrong option. */
  id: string
  /** That hadith's HadeethEnc title in the same language (null for the answer). */
  title: string | null
}
export type QuizQuestion = { n: number; answer: number; options: QuizOption[] }
export type HadithQuiz = { id: string; lang: string; questions: QuizQuestion[] }

type Stored = { v?: number; q?: { n?: unknown; k?: unknown; a?: unknown; w?: { id?: unknown; i?: unknown; t?: unknown; ti?: unknown }[] }[] }

const ID = /^\d{1,7}$/

/** FNV-1a 32 bits over UTF-8, as hex: the same key as answerKey() in scripts/index/hadith-quiz.mjs. */
export function answerKey(s: string): string {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(s)) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** The questions of a stored quiz against the row's own benefits; anything malformed or stale is left out. */
export function readQuiz(selfId: string, hints: string[], raw: string | null | undefined): QuizQuestion[] {
  if (!raw || !hints.length) return []
  let stored: Stored
  try {
    stored = JSON.parse(raw) as Stored
  } catch {
    return []
  }
  if (stored?.v !== 1 || !Array.isArray(stored.q)) return []
  const out: QuizQuestion[] = []
  const seen = new Set<number>()
  for (const q of stored.q) {
    const n = q?.n
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n >= Math.min(hints.length, QUIZ_MAX) || seen.has(n)) continue
    if (q.k !== answerKey(hints[n])) continue
    const a = q.a
    if (typeof a !== 'number' || !Number.isInteger(a) || a < 0 || a > 3) continue
    const w = Array.isArray(q.w) ? q.w : []
    const wrong = w.filter(
      (x): x is { id: string; i: number; t: string; ti: string | null } =>
        !!x && typeof x.id === 'string' && ID.test(x.id) && x.id !== selfId && typeof x.t === 'string' && x.t.trim() !== '' && (x.ti == null || typeof x.ti === 'string'),
    )
    if (wrong.length !== 3 || w.length !== 3) continue
    const options: QuizOption[] = wrong.map((x) => ({ text: x.t, id: x.id, title: x.ti ?? null }))
    options.splice(a, 0, { text: hints[n], id: selfId, title: null })
    seen.add(n)
    out.push({ n, answer: a, options })
  }
  return out.sort((x, y) => x.n - y.n)
}
