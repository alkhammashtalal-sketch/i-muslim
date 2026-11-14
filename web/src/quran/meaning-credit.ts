/** Where the Ayat archive names the language and not a translator (Indonesian: trans_name «Indonesian - Bahasa
 *  Indonesia»), the credit is the archive itself, never the language in the translator's place (reply 0025). Decided
 *  here, not in D1, so meanings already in the edge cache read the same. */
const UNNAMED = new Set(['id'])
export const namedTranslator = (m: { lang: string; translator: string; source_key?: string | null }): string | null =>
  UNNAMED.has(m.lang) && !m.source_key ? null : m.translator

/** The page of a QuranEnc translation (source ط), in the reader's interface language when QuranEnc has it. */
const QE_LOCALES = new Set(['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])
export const quranEncUrl = (key: string, uiLang: string) => `https://quranenc.com/${QE_LOCALES.has(uiLang) ? uiLang : 'en'}/browse/${key}`
