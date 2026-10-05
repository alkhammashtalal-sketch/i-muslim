import { numberLocale } from '../i18n'
import type { Lang } from '../../../shared/api'

/** Fill {name} placeholders. */
export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))

export const numFmt = (lang: Lang) => {
  const nf = new Intl.NumberFormat(numberLocale(lang), { useGrouping: false })
  return (n: number) => nf.format(n)
}

// Ayah markers inside the Arabic text always use Eastern Arabic digits, as in the Mushaf.
const arab = new Intl.NumberFormat('ar-u-nu-arab', { useGrouping: false })
export const arabicDigits = (n: number) => arab.format(n)

/** Search-only folding of an Arabic name: drop harakat/tatweel, unify alef, ya, ta marbuta. */
export const foldArabic = (s: string) =>
  s
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')
    .trim()

/** References are composed by us (e.g. "البقرة: 255"): in the Arabic UI show Eastern Arabic digits (DECISIONS 14). Display only. */
export const displayRef = (ref: string, lang: Lang) =>
  lang === 'ar' ? ref.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]) : ref
