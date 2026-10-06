/** Where the Ayat archive names the language and not a translator (Indonesian: trans_name «Indonesian - Bahasa
 *  Indonesia»), the credit is the archive itself, never the language in the translator's place (reply 0025). Decided
 *  here, not in D1, so meanings already in the edge cache read the same. */
const UNNAMED = new Set(['id'])
export const namedTranslator = (m: { lang: string; translator: string }): string | null => (UNNAMED.has(m.lang) ? null : m.translator)
