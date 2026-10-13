// The languages the app serves content in (reply 0033 §أ1): data/served-langs.json, computed from the data by
// scripts/daily/served-langs-build.mjs, with each one's badges and the direction of its script. The interface stays in
// the ten languages of web/src/i18n (CLAUDE.md §4); the content language may be any of these.
import type { Lang } from '../../../../shared/api'
import data from '../../../../data/served-langs.json'
import { isLang } from '../../i18n'

/** The badges, in the order they are shown (reply 0033-add2 §2; scripts/daily/served-langs-rule.mjs): they say what
 *  is missing, and «كامل» when nothing is. */
export const BADGES = ['full', 'no-tafsir', 'some-hadith-ar', 'hadith-ar'] as const
export type Badge = (typeof BADGES)[number]
export type ServedLang = { code: string; dir: 'rtl' | 'ltr'; badges: Badge[]; namesAs?: string }

const isBadge = (b: unknown): b is Badge => (BADGES as readonly unknown[]).includes(b)
export const SERVED: ServedLang[] = (data.langs as { code: string; dir: string; badges: string[]; names_as?: string }[]).map((l) => ({
  code: l.code,
  dir: l.dir === 'rtl' ? 'rtl' : 'ltr',
  badges: BADGES.filter((b) => l.badges.filter(isBadge).includes(b)),
  ...(l.names_as ? { namesAs: l.names_as } : {}),
}))
const BY_CODE = new Map(SERVED.map((l) => [l.code, l]))

export const isServed = (code: unknown): code is string => typeof code === 'string' && BY_CODE.has(code)
export const servedLang = (code: string) => BY_CODE.get(code)

// Arabic-script languages among the translations (the fallback when neither the data nor Intl says).
const RTL = new Set(['ar', 'ur', 'fa', 'ps', 'ug', 'ku', 'ckb'])

/** The direction of a content language: from the data (read from the translation's own letters: QuranEnc's Kurdish is
 *  Central Kurdish in Arabic script), else Intl.Locale's text info when the browser has it, else the list above. */
export function contentDir(code: string): 'rtl' | 'ltr' {
  const known = BY_CODE.get(code)?.dir
  if (known) return known
  try {
    const loc = new Intl.Locale(code) as Intl.Locale & { textInfo?: { direction?: string }; getTextInfo?: () => { direction?: string } }
    const d = (loc.getTextInfo?.() ?? loc.textInfo)?.direction
    if (d === 'rtl' || d === 'ltr') return d
  } catch {
    // an unknown tag: the list decides
  }
  return RTL.has(code) ? 'rtl' : 'ltr'
}

/** The interface language that goes with a content language: itself when it is one of the ten, else English
 *  (the orchestrator's decision 2 for reply 0033). */
export const uiLangFor = (content: string): Lang => (isLang(content) ? content : 'en')

/** The content language kept with the settings: a served language that agrees with the interface language (one of the
 *  ten is both; any other goes with English), else the interface language itself. */
export function contentFor(stored: unknown, lang: Lang): string {
  if (!isServed(stored)) return lang
  return uiLangFor(stored) === lang ? stored : lang
}

// ---------- Names ----------
// From Intl.DisplayNames (CLDR) at build time, in data/served-langs.json: a browser with trimmed locale data answers
// in its own default language instead (in Chrome, Assamese, Uyghur and Pashto came back with their Arabic names as
// their own), so the names are not asked of the browser.

type Names = Record<string, string> & { self: string }
const NAMES = new Map((data.langs as { code: string; names: Names }[]).map((l) => [l.code, l.names]))
const nameIn = (locale: string, code: string): string | undefined => NAMES.get(code)?.[locale === 'self' ? 'self' : locale]

/** A name's first letter in capitals, in scripts that have them («español» → «Español», as on the board). */
const capital = (s: string, locale: string) => (s ? s.charAt(0).toLocaleUpperCase(locale) + s.slice(1) : s)

// The two corrections to CLDR's Arabic names (reply 0033 §أ1).
const AR_FIX: Record<string, string> = { ur: 'الأردية', ms: 'الملايوية' }

/** The language's name in the interface language (its Arabic name in Arabic, with the two corrections). */
export function uiName(code: string, uiLang: Lang): string {
  if (uiLang === 'ar' && AR_FIX[code]) return AR_FIX[code]
  return capital(nameIn(uiLang, code) ?? nameIn('en', code) ?? code, uiLang)
}
/** The language's name in itself (QuranEnc's Kurdish is named as Central Kurdish, the script of its text). */
export function nativeName(code: string): string {
  const as = BY_CODE.get(code)?.namesAs ?? code
  return capital(nameIn('self', code) ?? nameIn('en', code) ?? code, as)
}
export const englishName = (code: string) => capital(nameIn('en', code) ?? code, 'en')
/** The header's language button (reply 0045 ب): the language by its own name, short where the name is long, never cut
 *  with an ellipsis. «Indonesia» and «Melayu» are already the names' short forms; Central Kurdish is «کوردی» there. */
const SHORT_NATIVE: Record<string, string> = { ku: 'کوردی' }
export const shortNativeName = (code: string) => SHORT_NATIVE[code] ?? nativeName(code)

export type LangRow = { code: string; native: string; ui: string; en: string; badges: Badge[]; dir: 'rtl' | 'ltr'; namesAs?: string }

/** Every served language with its names, ordered by its name in the interface language (Intl.Collator). */
export function servedRows(uiLang: Lang): LangRow[] {
  const coll = new Intl.Collator(uiLang)
  return SERVED.map((l) => ({ code: l.code, native: nativeName(l.code), ui: uiName(l.code, uiLang), en: englishName(l.code), badges: l.badges, dir: l.dir, namesAs: l.namesAs })).sort(
    (a, b) => coll.compare(a.ui, b.ui) || a.code.localeCompare(b.code),
  )
}

/** The badges that some row of the list carries, in their order: one line under the list for each (reply 0033-add2 §2). */
export const shownBadges = (rows: readonly { badges: readonly Badge[] }[]): Badge[] => BADGES.filter((b) => rows.some((r) => r.badges.includes(b)))

/** «لغة جهازك»: the first of the device's languages that is served (zh-Hans-CN → zh, fil → tl, ckb → ku). */
const DEVICE_ALIAS: Record<string, string> = { fil: 'tl', ckb: 'ku', kmr: 'ku', pes: 'fa', prs: 'fa', zsm: 'ms', ful: 'ff', ind: 'id', in: 'id' }
export function deviceLang(langs: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])): string | null {
  for (const tag of langs) {
    const base = String(tag ?? '').toLowerCase().split(/[-_]/)[0]
    const code = DEVICE_ALIAS[base] ?? base
    if (BY_CODE.has(code)) return code
  }
  return null
}

/** What «عن التطبيق» counts (reply 0043-add3), from data/served-langs.json at build time, so the numbers follow the
 *  data: the languages besides Arabic with the meanings of the Quran, with al-Mukhtasar as served (not the stored
 *  Arabic and Italian, not «the original» of Arabic), and with HadeethEnc's hadiths and their explanation. */
type DataLang = { code: string; meanings?: { rows?: number } | null; mukhtasar?: unknown; hadith?: { explained?: number } | null }
const LANGS_DATA = (data.langs as DataLang[]).filter((l) => l.code !== 'ar')
export const CONTENT_COUNTS = {
  meanings: LANGS_DATA.filter((l) => (l.meanings?.rows ?? 0) > 0).length,
  mukhtasar: LANGS_DATA.filter((l) => !!l.mukhtasar).length,
  hadith: LANGS_DATA.filter((l) => (l.hadith?.explained ?? 0) > 0).length,
}
