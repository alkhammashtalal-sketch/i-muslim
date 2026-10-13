export type Lang = 'ar' | 'en' | 'ur' | 'id' | 'ms' | 'tr' | 'fr' | 'es' | 'bn' | 'hi'
/** `ml`: the content language of the ayat's meanings when it differs from the interface language (reply 0033 §أ1). */
export type AskRequest = { q: string; lang: Lang; simple?: boolean; ml?: string }
export type Cite = string // passage id, e.g. "quran:2:255"
export type Sentence = { text: string; cites: Cite[] }
export type Quote = {
  id: Cite
  kind: 'ayah' | 'hadith' | 'aqeedah' | 'fatwa'
  text: string
  text_en?: string
  ref: string
  url: string
  verified: boolean
  grade?: string
  tafsirExcerpt?: string // al-Muyassar for this ayah, verbatim from D1 (rule 12: text and its tafsir first)
  meaning?: Meaning // the ayah's meaning in the reader's language, a human translation from the Ayat archive (command 22)
}
/** The meaning of an ayah in the reader's language, with its translator: from QuranEnc (source ط, reply 0032 A) with
 *  its version, footnotes and translation key, or from the Ayat archive (Bengali, Malay) without them. English is
 *  Sahih International (text_en); Arabic has none. */
export type Meaning = { lang: string; text: string; translator: string; version?: string | null; footnotes?: string | null; source_key?: string | null }
export type AnswerResponse = {
  type: 'answer'
  level: 'A' | 'B'
  direct?: Sentence // absent in on_demand mode (rule 12): no generated text is shown by default
  quotes: Quote[]
  explanation: Sentence[]
  tafsir?: { name: string; ref: string; url: string }[]
  machineTranslated: boolean
  reviewed?: { at: string } // approved by the Sharia reviewer on this date; no names in the app (rule 14)
  fromCache: boolean
  considered?: Cite[] // the passages retrieval sent to the model (command 10)
  answer_lang?: string // BCP-47 code of the explanation's language (command 08); machineTranslated = not ar/en
  explain_mode?: ExplainMode // on_demand: texts only, with an «explain» button per passage (rule 12)
}
export type ExplainMode = 'on_demand' | 'generated' | 'tafsir_only'
export type ReferralResponse = {
  type: 'referral'
  level: 'C' | 'D'
  message: string
  link: string
  disputed?: boolean // rule 11: more than one scholarly view; the texts are shown with references, nothing generated
  quotes?: Quote[]
}
export type AbstainResponse = { type: 'abstain'; message: string; link: string }
export type ErrorResponse = {
  type: 'error'
  // rate_limited: the day's 300 requests; answers_limited: the day's 60 new answers; burst: 6 new answers in a minute;
  // monthly_cap: the month's model budget (reply 0037 §5). At the last three, cached answers and the FAQ still answer.
  code: 'rate_limited' | 'answers_limited' | 'burst' | 'monthly_cap' | 'bad_input' | 'server'
  message: string
}
export type AskResponse = AnswerResponse | ReferralResponse | AbstainResponse | ErrorResponse

// Not in the original contract: needed by the "full text" sheet. Served later by GET /api/passage/:id.
export type PassageContext = { id: Cite; text: string; text_en?: string; ref: string }
export type TafsirText = {
  name: string
  text: string // paragraphs joined by a blank line, verbatim from D1 (HTML tags removed)
  ref: string
  url: string
  key?: 'muyassar' | 'saadi'
  paragraphs?: string[]
  empty?: boolean // al-Saadi has no entry for this ayah in the source (50 ayat)
}
export type PassageResponse = Quote & {
  before?: PassageContext[]
  after?: PassageContext[]
  tafsir?: TafsirText[]
  // Ayah position, for the Quran reader (command 09).
  ayah?: { sura: number; aya: number; page: number; suraName: string; suraAyat: number; urlEn?: string }
  // Aqeedah segment position and the editor's footnotes, verbatim (command 10).
  segment?: { book: string; bookKey: string; chapter: string; page: number; pageEnd: number; footnotes?: string }
}

// Quran reader (command 09).
export type SuraSummary = { n: number; name: string; ayat: number; page: number }
export type SuraAyah = { aya: number; id: Cite; text: string; page: number; text_en?: string; meaning?: string }
export type SuraResponse = { n: number; name: string; basmala: string | null; ayat: SuraAyah[]; meaning_translator?: string; meaning_lang?: string; meaning_version?: string | null; meaning_key?: string | null }

export type ReportReason = 'text_mismatch' | 'wrong_ref' | 'bad_translation' | 'other'
export type ReportRequest = { passageId: Cite; reason: ReportReason }

// «أبلغ عن خطأ» and support messages (reply 0033 §أ3, part ج): the same POST /api/report, told apart by `kind`.
export type SourceReportKind = 'text' | 'translation' | 'explanation' | 'other' | 'support'
/** Where the error is: an ayah «2:255», a HadeethEnc number, or a passage id; the reader's language; the registry id
 *  of the source (data/sources.json) and its version when it has one. */
export type ReportPlace = { type: 'ayah' | 'hadith' | 'passage'; id: string; lang: string; source: string; version?: string }
export type SourceReportRequest = { kind: SourceReportKind; loc?: ReportPlace; note?: string }

/** GET /api/sources/status?lang=xx: the last monthly check, the updates waiting, and the reader's language versions. */
export type SourceCheck = { source: string; key: string; lang: string | null; ours: string | null; theirs: string | null }
export type SourcesStatus = {
  checked_at: string | null
  pending: SourceCheck[]
  meaning: { key: string; version: string | null; translator: string } | null
  mukhtasar: { key: string; version: string | null } | null
}

// Aqeedah library (command 10).
export type BookSummary = { key: string; name: string; segments: number; chapters: number }
export type BookSegment = { id: Cite; chapter: string; page: number; pageEnd: number; text: string }
export type BookResponse = { key: string; name: string; chapters: { title: string; segments: BookSegment[] }[] }
