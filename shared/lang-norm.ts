// Normalisation of a language's name, for the language search on the device and the language requests on the server
// (reply 0033 §أ1), exactly as the reply sets it:
//   Arabic  no diacritics and no tatweel; أ/إ/آ → ا, ة → ه, ى → ي; a leading «ال» dropped from each word;
//   Latin   lower case, the accents removed (é → e, ç → c, ñ → n).
// Other scripts keep their letters and signs (a Devanagari or Bengali vowel sign is part of the word there).

// Harakat, shadda, sukun, the small high signs and hamza marks (U+0610–U+061A, U+064B–U+065F), the dagger alef
// (U+0670) and the Quranic annotation signs (U+06D6–U+06ED).
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g
const TATWEEL = /ـ/g
// The combining accents of Latin letters (and of Greek and Cyrillic, which fold the same way on both sides).
const LATIN_ACCENTS = /[̀-ͯ]/g

/** Folds one text: Arabic letters and marks, Latin case and accents, spaces collapsed. Idempotent. */
export function foldText(s: string): string {
  return s
    .normalize('NFC')
    .replace(TATWEEL, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(AR_MARKS, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .normalize('NFD')
    .replace(LATIN_ACCENTS, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A leading «ال» dropped from a word (only when a word of at least two letters remains). */
export const dropAl = (w: string) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w)

/** The full normalisation of a typed name: folded, then a leading «ال» dropped from each word. */
export function normalizeName(s: string): string {
  return foldText(s)
    .split(' ')
    .map(dropAl)
    .filter(Boolean)
    .join(' ')
}

/** One word for the search: normalised, without the punctuation around it («(kurmancî)» → «kurmanci»). */
export const searchWord = (w: string) => dropAl(foldText(w).replace(/[^\p{L}\p{M}\p{N}]/gu, ''))

/** A language request is accepted when its text is 2 to 40 characters, letters and spaces only (reply 0033 §أ1). */
export const REQUEST_MIN = 2
export const REQUEST_MAX = 40
export function validRequest(text: string): boolean {
  const n = [...text].length
  return n >= REQUEST_MIN && n <= REQUEST_MAX && /^[\p{L}\p{M} ]+$/u.test(text) && /\p{L}/u.test(text) && text === text.trim()
}
