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
export type PassageResponse = Quote & {
  before?: PassageContext[]
  after?: PassageContext[]
  tafsir?: { name: string; text: string; ref: string; url: string }[]
}

export type ReportReason = 'text_mismatch' | 'wrong_ref' | 'bad_translation' | 'other'
export type ReportRequest = { passageId: Cite; reason: ReportReason }
