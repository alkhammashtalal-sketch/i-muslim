// What a device voice may read under the listen button (add-on 0072-add14 §2). Pure: no DOM, no audio.
//
//   - Never the Quran (command 12, rule kept since): an ayah is heard only in the reciter's recorded voice, through the
//     recitation (quran/recitation.ts), never here. A text given to the device voice is masked first: ayat quoted in
//     it between ﴿…﴾ or {…} are replaced by a fixed line. Then, if it still repeats four words in a row of any ayah it
//     is guarded against (the ayah it explains, the ayat on the screen, the basmala), it is not read at all: rather
//     than read in pieces (al-Muyassar often repeats its ayah's words: trust/speakable.ts keeps the same rule).
//   - Never the Arabic text of a hadith, an Arabic saying of the salaf or an Arabic prophetic dhikr in 1.1 (§3): their
//     roles refuse Arabic, whatever the text; and a text guarded against Arabic hadith (`quotes`) is not read when it
//     repeats four of their words in a row (an explanation that quotes its hadith).
import guard from '../config/voice-guard.json'
import { BASMALA, protectedRuns, sharesRun } from '../trust/sacred'

/** What a text is, which decides whether a device voice may read it (the table of §2). */
export type SpeakRole =
  | 'meaning' // an ayah's meaning in the reader's language (a translation of meanings, not the Quran)
  | 'tafsir' // al-Muyassar, al-Saʿdi, Ibn Kathir (Arabic, or abridged in English), as stored
  | 'explanation' // a machine explanation («بسّط لي»), a reading of a name, HadeethEnc's explanation
  | 'step' // a lesson's «ماذا تفعل» and its other sentences of ours
  | 'answer' // the «اسأل» answer's own sentences
  | 'hadith-translation' // a hadith in the reader's language (never Arabic)
  | 'salaf-translation' // a saying of the salaf in the reader's language (never Arabic)

const NEVER_ARABIC: ReadonlySet<SpeakRole> = new Set(['hadith-translation', 'salaf-translation'])

export type SpeakGuard = {
  /** Ayah texts the text must not repeat (the ayah explained, the ayat on screen). The basmala always. */
  ayat?: string[]
  /** Arabic hadith (or salaf) texts it must not repeat either. */
  quotes?: string[]
  /** The ayah the text is al-Muyassar of: some quote another ayah (scripts/ingest/voice-guard.mjs), not read. */
  muyassarOf?: string
}

/** Ayat quoted inside a tafsir or an explanation: ﴿…﴾ as the Mushaf prints them, {…} as some sources do. */
const QURAN_QUOTE = /﴿[^﴾]*﴾|\{[^}]*\}/gu

/** The text with every quoted ayah replaced by `slot` (a fixed line said in its place). */
export function maskQuoted(text: string, slot: string): string {
  return text.replace(QURAN_QUOTE, ` ${slot} `).replace(/\s+/g, ' ').trim()
}

const muyassarQuotesOther = new Set<string>(guard.muyassarQuotesOtherAyat)
const unmarked = Object.values(guard.passages as Record<string, string[]>).flat()

/** Languages written in the Arabic script: their texts are Arabic letters throughout. */
const ARABIC_SCRIPT = new Set(['ar', 'ur', 'fa', 'ps', 'sd', 'ug', 'ckb', 'ku'])
const AR = '\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF'
const ARABIC_RUN = new RegExp(`[${AR}][${AR}\\s\\d.,:;()\\[\\]«»"'-]*`, 'gu')

/** A language tag's primary subtag. */
const base = (tag: string) => tag.toLowerCase().split(/[-_]/)[0]

/**
 * The text a device voice may say for this role, or null when it may not be read at all. `slot` is the fixed line
 * said where a quoted ayah stood (STRINGS[lang].speakAyahSlot).
 */
export function speakableText(text: string, tag: string, role: SpeakRole, g: SpeakGuard, slot: string): string | null {
  if (!text.trim()) return null
  if (NEVER_ARABIC.has(role) && base(tag) === 'ar') return null
  if (role === 'tafsir' && g.muyassarOf && muyassarQuotesOther.has(g.muyassarOf)) return null
  let masked = maskQuoted(text, slot)
  // In a text of another script (an English tafsir, a translation), Arabic letters are a quotation of the Quran or a
  // hadith: the device voice of that language never reads them; the fixed line stands in their place.
  if (!ARABIC_SCRIPT.has(base(tag))) masked = masked.replace(ARABIC_RUN, ` ${slot} `).replace(/\s+/g, ' ').trim()
  if (!/[\p{L}\p{N}]/u.test(masked.split(slot).join(''))) return null
  const runs = protectedRuns([BASMALA, ...unmarked, ...(g.ayat ?? []), ...(g.quotes ?? [])])
  if (sharesRun(masked, runs)) return null
  return masked
}

/** The last check, on each piece just before it is spoken: none of the sacred texts given (those on the screen)
 *  repeated. True when the piece may be said. */
export function pieceAllowed(piece: string, sacred: string[]): boolean {
  if (!sacred.length) return true
  return !sharesRun(piece, protectedRuns(sacred))
}
