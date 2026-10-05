export type Lang = 'ar' | 'en' | 'ur' | 'id' | 'ms' | 'tr' | 'fr' | 'es' | 'bn' | 'hi'
export type AskRequest = { q: string; lang: Lang; simple?: boolean }
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
}
export type AnswerResponse = {
  type: 'answer'
  level: 'A' | 'B'
  direct: Sentence
  quotes: Quote[]
  explanation: Sentence[]
  tafsir?: { name: string; ref: string; url: string }[]
  machineTranslated: boolean
  reviewed?: { by: string; at: string }
  fromCache: boolean
}
export type ReferralResponse = { type: 'referral'; level: 'C' | 'D'; message: string; link: string }
export type AbstainResponse = { type: 'abstain'; message: string; link: string }
export type ErrorResponse = {
  type: 'error'
  code: 'rate_limited' | 'monthly_cap' | 'bad_input' | 'server'
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
}

// Quran reader (command 09).
export type SuraSummary = { n: number; name: string; ayat: number; page: number }
export type SuraAyah = { aya: number; id: Cite; text: string; page: number; text_en?: string }
export type SuraResponse = { n: number; name: string; basmala: string | null; ayat: SuraAyah[] }

export type ReportReason = 'text_mismatch' | 'wrong_ref' | 'bad_translation' | 'other'
export type ReportRequest = { passageId: Cite; reason: ReportReason }
