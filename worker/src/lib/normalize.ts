// Search-only Arabic normalization, shared by the Worker (user queries) and scripts/ingest (text_search).
// Never applied to displayed text. Removes harakat, Quranic annotation marks, tatweel and invisible
// bidi/zero-width marks; unifies alef forms, ya and ta marbuta.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g
const TATWEEL = /ـ/g
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g

export function normalizeArabic(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(INVISIBLE, '')
    .replace(/[آأإٱٲٳ]/g, 'ا') // آ أ إ ٱ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/[۞۩۝]/g, ' ') // ۞ ۩ ۝
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
