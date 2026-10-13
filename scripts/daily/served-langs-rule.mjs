// The badges of a content language (reply 0033-add2 §2, in place of the table of reply 0033 §أ1): a badge says what
// is missing, and «كامل» when nothing is.
//   full            «كامل»                   the meanings, al-Mukhtasar, and hadiths with their explanation for 90% or
//                                            more of the hadiths shown in Arabic (Arabic itself: the originals)
//   no-tafsir       «بدون تفسير مترجم»       no al-Mukhtasar in that language
//   some-hadith-ar  «بعض الأحاديث بالعربية»  hadiths with their explanation for less than 90% of those shown in
//                                            Arabic, and more than none
//   hadith-ar       «الأحاديث بالعربية»      no hadith with its explanation in that language
// «كامل» stands alone; «بدون تفسير مترجم» may stand with either hadith badge (Malay: both no-tafsir and some-hadith-ar).
// Used by scripts/daily/served-langs-build.mjs and checked in worker/test/lang-picker.test.ts.

/** The badges in the order they are shown, on a row and in the legend under the list. */
export const BADGES = ['full', 'no-tafsir', 'some-hadith-ar', 'hadith-ar']

/** The share of hadiths that counts as «all» of them: 90%. */
export const HADITH_FULL = 0.9

/** Whether `explained` of `shownAr` reaches 90%, in whole numbers (no rounding at the boundary). */
export const hadithFull = (explained, shownAr) => shownAr > 0 && explained * 10 >= shownAr * 9

/** The percentage stored with each language, to one decimal place (the badge is decided by hadithFull, not by this). */
export const hadithPercent = (explained, shownAr) => (shownAr > 0 ? Math.round((explained / shownAr) * 1000) / 10 : 0)

/**
 * The badges of one language.
 * @param {{ meanings: boolean, mukhtasar: boolean, explained: number, shownAr: number }} x
 *   meanings: a human translation of the meanings (Arabic: the Quran with al-Muyassar and al-Saʿdi); mukhtasar:
 *   al-Mukhtasar served in that language (Arabic: the originals); explained: the hadiths shown in Arabic whose row in
 *   that language carries an explanation; shownAr: the hadiths shown in Arabic.
 * @returns {string[]} a subset of BADGES, in their order
 */
export function badgesOf({ meanings, mukhtasar, explained, shownAr }) {
  const full = hadithFull(explained, shownAr)
  if (meanings && mukhtasar && full) return ['full']
  const out = []
  if (!mukhtasar) out.push('no-tafsir')
  if (!full) out.push(explained > 0 ? 'some-hadith-ar' : 'hadith-ar')
  return out
}
