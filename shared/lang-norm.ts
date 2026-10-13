// Normalisation of a language's name, for the language search on the device and the language requests on the server
// (reply 0033 §أ1), exactly as the reply sets it:
//   Arabic  no diacritics and no tatweel; a leading «ال» dropped from each word (a bare ا+ل only, so the «أل» of
//           «ألماني» stays); then أ/إ/آ → ا, ة → ه, ى → ي;
//   Latin   lower case, the accents removed (é → e, ç → c, ñ → n).
// Other scripts keep their letters and signs (a Devanagari or Bengali vowel sign is part of the word there).

// Harakat, shadda, sukun, the small high signs and hamza marks (U+0610–U+061A, U+064B–U+065F), the dagger alef
// (U+0670) and the Quranic annotation signs (U+06D6–U+06ED).
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g
const TATWEEL = /ـ/g
// The combining accents of Latin letters (and of Greek and Cyrillic, which fold the same way on both sides).
const LATIN_ACCENTS = /[̀-ͯ]/g

/** Tatweel and Arabic marks removed (after NFC, so a hamza written as a mark joins its alef first). */
const unmark = (s: string) => s.normalize('NFC').replace(TATWEEL, '').replace(AR_MARKS, '')

/** The letters folded: أ/إ/آ → ا, ة → ه, ى → ي; Latin lower case without accents. */
const foldLetters = (s: string) =>
  s
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .normalize('NFD')
    .replace(LATIN_ACCENTS, '')
    .normalize('NFC')

/** Folds one text: Arabic letters and marks, Latin case and accents, spaces collapsed. Idempotent. */
export function foldText(s: string): string {
  return foldLetters(unmark(s)).replace(/\s+/g, ' ').trim()
}

/**
 * A leading «ال» dropped from a word (only when a word of at least two letters remains). It is tested before the
 * hamza is folded, so only a bare ا+ل is the article: «ألماني» and «ألباني» keep their «أل» («الماني», «الباني»),
 * while «الألمانية» loses its article and meets them («المانيه»).
 */
export const dropAl = (w: string) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w)

/** The full normalisation of a typed name: marks removed, a leading «ال» dropped from each word, then folded. */
export function normalizeName(s: string): string {
  return unmark(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => foldLetters(dropAl(w)))
    .join(' ')
}

/** Whether a typed word begins with the article itself: a bare ا+ل («الع…»), not the «أل» of «ألماني». */
export const typedArticle = (s: string) => unmark(s).split(/\s+/).some((w) => w.replace(/^[^\p{L}]+/u, '').startsWith('ال'))

/** One word for the search: normalised, without the punctuation around it («(kurmancî)» → «kurmanci»). */
export const searchWord = (w: string) => foldLetters(dropAl(unmark(w).replace(/[^\p{L}\p{M}\p{N}]/gu, '')))

/** A language request is accepted when its text is 2 to 40 characters, letters and spaces only (reply 0033 §أ1). */
export const REQUEST_MIN = 2
export const REQUEST_MAX = 40
export function validRequest(text: string): boolean {
  const n = [...text].length
  return n >= REQUEST_MIN && n <= REQUEST_MAX && /^[\p{L}\p{M} ]+$/u.test(text) && /\p{L}/u.test(text) && text === text.trim()
}
