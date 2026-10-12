// «عن المصدر» (V2_UI_SPEC §9): one config for every source an answer shows. Every row is a documented fact (docs/
// SOURCES.md, CLAUDE.md §2); what is not documented is not written. al-Muyassar's rows are exactly those of §9.
import type { Quote } from '../../../../shared/api'
import type { AnswerStrings } from './strings'

type Key = keyof AnswerStrings
export type SourceKey = 'mushaf' | 'muyassar' | 'saadi' | 'book239' | 'tawhid' | 'hadeethenc'
export type SourceRow = { label: 'rowPrepared' | 'rowPublished' | 'rowVia' | 'rowShown'; value: Key }
export type SourceInfo = {
  /** The full name (a string key); books carry their own title instead (from the passage). */
  name?: Key
  /** The second half of the light source line («التفسير الميسر · المصحف الإلكتروني»). */
  via: Key
  rows: SourceRow[]
  open: Key
  /** The source's own site when the passage gives no page of its own. */
  home: string
}

const KSU = 'https://quran.ksu.edu.sa/'
const asIs: SourceRow = { label: 'rowShown', value: 'factAsIs' }

export const SOURCES: Record<SourceKey, SourceInfo> = {
  // SOURCES.md [أ]: the Uthmani text, from the Ayat program of King Saud University, kept as downloaded.
  mushaf: { name: 'srcMushaf', via: 'viaKsuShort', rows: [{ label: 'rowVia', value: 'viaKsu' }, asIs], open: 'openMushaf', home: KSU },
  // V2_UI_SPEC §9: prepared by a group of scholars, published by the King Fahd Complex (Al-Yamamah University library
  // record), reached us through the electronic Mushaf of King Saud University, shown as is.
  muyassar: {
    name: 'srcMuyassar',
    via: 'viaKsuShort',
    rows: [{ label: 'rowPrepared', value: 'factScholars' }, { label: 'rowPublished', value: 'factKingFahd' }, { label: 'rowVia', value: 'viaKsu' }, asIs],
    open: 'openTafsir',
    home: KSU,
  },
  // SOURCES.md [أ]: tafasir/sa3dy.ayt from the same archive; the ayah's page on quran.ksu.edu.sa.
  saadi: { name: 'srcSaadi', via: 'viaKsuShort', rows: [{ label: 'rowVia', value: 'viaKsu' }, asIs], open: 'openTafsir', home: KSU },
  // SOURCES.md [ج]: book 239, the Ministry's first edition of 1421 AH, read on al-Maktaba al-Shamela.
  book239: { via: 'viaShamela', rows: [{ label: 'rowPublished', value: 'factMinistry' }, { label: 'rowVia', value: 'viaShamela' }, asIs], open: 'openBook', home: 'https://shamela.ws/book/239' },
  // SOURCES.md [ج]: book 11318, printed by Imam Muhammad ibn Saud University.
  tawhid: { via: 'viaShamela', rows: [{ label: 'rowPublished', value: 'factImamUniv' }, { label: 'rowVia', value: 'viaShamela' }, asIs], open: 'openBook', home: 'https://shamela.ws/book/11318' },
  // CLAUDE.md §2 (ب): HadeethEnc through its API, without change.
  hadeethenc: { name: 'srcHadith', via: 'srcHadith', rows: [{ label: 'rowVia', value: 'viaHadeethenc' }, asIs], open: 'openHadith', home: 'https://hadeethenc.com/' },
}

/** The source of a quoted text (not of its tafsir). */
export function sourceOfQuote(q: Pick<Quote, 'id' | 'kind'>): SourceKey {
  if (q.kind === 'ayah') return 'mushaf'
  if (q.id.startsWith('aqeedah:tawhid')) return 'tawhid'
  if (q.id.startsWith('aqeedah:')) return 'book239'
  return 'hadeethenc'
}

/** The book's title from a passage reference («الأصول الثلاثة – …»), for the source line of a book passage. */
export const bookTitle = (ref: string) => ref.split(/\s[–-]\s/)[0].trim()
