// The hadiths' block (0048-add8): beside the passages, never among them. Retrieval offers the best few hadiths of their
// own lists (retrieve.ts, `hadiths`); a small model call of its own, made beside the answer's call and blind to it,
// keeps 0, 1 or 2 that answer the question directly. The answer's call does not see them and its instructions are
// unchanged. The model writes no text here: it returns ids from those offered, and the card shows their D1 rows.
import type { Lang } from '../../shared/api'
import type { ChatMessage } from './llm'

export const BLOCK_MAX = 2
/** Each candidate's text is cut for the prompt only (the card shows the row whole). */
const PROMPT_CHARS = 700

export type BlockCandidate = { id: string; text: string; textEn?: string | null; grade?: string }

export function blockMessages(q: string, candidates: BlockCandidate[]): ChatMessage[] {
  const system = [
    'You choose hadiths that answer a question directly. You are given the question and a numbered list of hadiths.',
    `Return JSON only: {"ids": [...]} with at most ${BLOCK_MAX} ids copied exactly from the list, the hadiths whose own words answer the question itself.`,
    'Return {"ids": []} when none answers it directly: a hadith on a nearby topic, or one that only mentions a word of the question, does not.',
    'Questions about the Quran, its stories, or a definition from the creed are answered by the Quran and the creed books; choose a hadith for them only when its words state the answer.',
    'Write nothing else: no explanation, no text of a hadith.',
  ].join('\n')
  const list = candidates
    .map((c) => {
      const t = c.text.length > PROMPT_CHARS ? `${c.text.slice(0, PROMPT_CHARS)}…` : c.text
      const en = c.textEn ? `\nEnglish: ${c.textEn.length > PROMPT_CHARS ? `${c.textEn.slice(0, PROMPT_CHARS)}…` : c.textEn}` : ''
      return `[${c.id}]${c.grade ? ` (${c.grade})` : ''}\n${t}${en}`
    })
    .join('\n\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Question: ${q}\n\nHadiths:\n${list}` },
  ]
}

/** The ids the model kept: only those offered, each once, at most two, in its order. Anything else: none. */
export function blockIds(raw: unknown, offered: string[]): string[] {
  const ids = (raw as { ids?: unknown } | null)?.ids
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  for (const x of ids) if (typeof x === 'string' && offered.includes(x) && !out.includes(x)) out.push(x)
  return out.slice(0, BLOCK_MAX)
}

/** The block's title in the card, our interface words (0048-add8 §4). */
export const FROM_SUNNAH: Record<Lang, string> = {
  ar: 'من السنة',
  en: 'From the Sunnah',
  ur: 'سنت سے',
  id: 'Dari Sunnah',
  ms: 'Daripada Sunnah',
  tr: 'Sünnetten',
  fr: 'De la Sunna',
  es: 'De la Sunna',
  bn: 'সুন্নাহ থেকে',
  hi: 'सुन्नत से',
}
