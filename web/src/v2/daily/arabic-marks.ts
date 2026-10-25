// Small marks of the Arabic lines, shared by the widgets' file (native/widget-names.ts) and the share images
// (NameShare.tsx, SalafShare.tsx), and open to the name card (add-on 0072-add23 §4.4, §4.5, §4.7):
//   - the separator: «·» beside Arabic-Indic digits reads as a zero («هود · ٥٧»), so every Arabic line takes «✦», as the
//     card's header; the other interfaces keep «·»;
//   - Latin digits inside an Arabic reference line («ج10، ص29») as Arabic-Indic («ج١٠، ص٢٩»);
//   - «النص بالعربية» in the interface's language, above a quoted text shown in Arabic outside the Arabic interface
//     (no machine translation). Arabic and English reviewed, the others machine translation like the interface.
import type { Lang } from '../../../../shared/api'

export const AR_SEP = '✦'

/** The separator between two parts of a line, with its spaces: « ✦ » in Arabic, « · » elsewhere. */
export const sepOf = (lang: string) => (lang === 'ar' ? ` ${AR_SEP} ` : ' · ')

const INDIC = '٠١٢٣٤٥٦٧٨٩'
/** Every Latin digit of an Arabic line as its Arabic-Indic one; nothing else changes. */
export const arabicIndicIn = (s: string) => s.replace(/[0-9]/g, (d) => INDIC[d.charCodeAt(0) - 48])

/** «النص بالعربية», in each interface language (shown only outside Arabic). */
export const QUOTE_IN_ARABIC: Record<Lang, string> = {
  ar: 'النص بالعربية',
  en: 'Text in Arabic',
  ur: 'متن عربی میں',
  id: 'Teks dalam bahasa Arab',
  ms: 'Teks dalam bahasa Arab',
  tr: 'Metin Arapça',
  fr: 'Texte en arabe',
  es: 'Texto en árabe',
  bn: 'পাঠ আরবিতে',
  hi: 'पाठ अरबी में',
}

/** The note above a quoted Arabic text: none in the Arabic interface. */
export const quoteNote = (lang: string): string | null => (lang === 'ar' ? null : (QUOTE_IN_ARABIC[lang as Lang] ?? QUOTE_IN_ARABIC.en))
