// The place of a «أبلغ عن خطأ» report (reply 0033 §أ3), shared by the screens that open it: the reader's ayah sheet,
// the answer's «عن المصدر», the hadith page; and the sources page's path.
import type { Lang, Meaning, Quote, ReportPlace, SourceReportKind } from '../../../../shared/api'
import { displayRef } from '../../quran/format'
import { REGISTRY_OF } from './registry'

export const NOTE_MAX = 500
export const SOURCES_PATH = '/sources'

/** A source and its version, as a report names them. */
export type ReportSource = { source: string; version?: string }

/** The place of a report, with what the form shows for it (the ayah's sura and number, the book's reference), and the
 *  source of a part that is not the place's own: an ayah's meaning outside Arabic is QuranEnc's translation with its
 *  version (the ayah is KSU's); a hadith's Arabic text has the Arabic file's version (the reader's translation and
 *  explanation have theirs). */
export type ReportLoc = ReportPlace & { label?: string; byKind?: Partial<Record<SourceReportKind, ReportSource>> }

/** The place sent for a report of `kind`: the source and version of the part reported. */
export function placeFor(loc: ReportLoc, kind: SourceReportKind | null): ReportPlace {
  const s = (kind && loc.byKind?.[kind]) || { source: loc.source, version: loc.version }
  return { type: loc.type, id: loc.id, lang: loc.lang, source: s.source, ...(s.version ? { version: s.version } : {}) }
}

/** The source of an ayah's meaning in the reader's language, when it is not the ayah's own (KSU): QuranEnc's
 *  translation, with its version. The Ayat archive's Bengali and Malay and Sahih International are KSU's. */
export function meaningSource(meaning: Meaning | null | undefined): Partial<Record<SourceReportKind, ReportSource>> | undefined {
  if (!meaning?.source_key) return undefined
  return { translation: { source: 'quranenc', ...(meaning.version ? { version: meaning.version } : {}) } }
}

/** The place of an answer's quoted text, for the «عن المصدر» sheet of `key` (an ayah or a book passage). */
export function placeOfQuote(q: Pick<Quote, 'id' | 'ref' | 'meaning'>, key: string, lang: Lang): ReportLoc | undefined {
  const source = REGISTRY_OF[key]
  if (!source) return undefined
  const label = displayRef(q.ref, lang)
  const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  if (m) {
    const byKind = meaningSource(q.meaning)
    return { type: 'ayah', id: `${m[1]}:${m[2]}`, lang, source, label, ...(byKind ? { byKind } : {}) }
  }
  return /^[a-z]+(:[a-z0-9_-]+){1,4}$/.test(q.id) && q.id.length <= 64 ? { type: 'passage', id: q.id, lang, source, label } : undefined
}
