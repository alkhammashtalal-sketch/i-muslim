// The place of a «أبلغ عن خطأ» report (reply 0033 §أ3), shared by the screens that open it: the reader's ayah sheet,
// the answer's «عن المصدر», the hadith page; and the sources page's path.
import type { Lang, Quote, ReportPlace } from '../../../../shared/api'
import { displayRef } from '../../quran/format'
import { REGISTRY_OF } from './registry'

export const NOTE_MAX = 500
export const SOURCES_PATH = '/sources'

/** The place of a report, with what the form shows for it (the ayah's sura and number, the book's reference). */
export type ReportLoc = ReportPlace & { label?: string }

/** The place of an answer's quoted text, for the «عن المصدر» sheet of `key` (an ayah or a book passage). */
export function placeOfQuote(q: Pick<Quote, 'id' | 'ref'>, key: string, lang: Lang): ReportLoc | undefined {
  const source = REGISTRY_OF[key]
  if (!source) return undefined
  const label = displayRef(q.ref, lang)
  const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  if (m) return { type: 'ayah', id: `${m[1]}:${m[2]}`, lang, source, label }
  return /^[a-z]+(:[a-z0-9_-]+){1,4}$/.test(q.id) && q.id.length <= 64 ? { type: 'passage', id: q.id, lang, source, label } : undefined
}
