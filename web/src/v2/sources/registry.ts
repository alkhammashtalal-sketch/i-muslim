// Typed access to data/sources.json, the one registry of the sources (reply 0033 §أ3), and the small helpers the page,
// its sheets and «أبلغ عن خطأ» share: a text in the interface language, a count from the data, a language's name, a
// Riyadh date written in the interface language.
import type { Lang } from '../../../../shared/api'
import data from '../../../../data/sources.json'
import { numberLocale } from '../../i18n'
import { gregorianText } from '../daily/format'

/** Per-language text, or a proper name that is the same in every language (written as is, left to right). */
export type Text = string | Record<Lang, string>
export type GroupIcon = 'book' | 'books' | 'headphones' | 'wrench'
export type Group = { id: string; icon: GroupIcon; name: Record<Lang, string> }
export type Source = {
  id: string
  group: string
  name: Text
  /** The row's lead before «:» (KSU on the board: «جامعة الملك سعود: …»). */
  by?: Record<Lang, string>
  /** What we take; the row's line and the sheet's «ما نأخذ منه». {n} is a count from `langs`. */
  take: Record<Lang, string>
  prepared?: Text
  published?: Text
  via?: string
  version?: string
  versions?: Partial<Record<Lang, string>>
  versionFrom?: 'meanings' | 'mukhtasar'
  langs?: string[]
  check?: string
  fetched?: string[]
  fetchedNote?: Record<Lang, string>
  terms?: Record<Lang, string>
  termsLabel?: 'licence'
  termsUrl?: string
  licence?: { name: string; url: string }
  tail?: string
  tailLabel?: 'licence'
  /** The credit a licence asks for, word for word (the reciters' photos, reply 0047 §1): on the row and in its sheet. */
  credit?: Text
  site?: string
}

export const GROUPS = data.groups as Group[]
export const SOURCES = data.sources as unknown as Source[]
export const sourceById = (id: string) => SOURCES.find((s) => s.id === id)

/** A registry text in the interface language; Latin proper names stay as they are. */
export const text = (t: Text | undefined, lang: Lang) => (t === undefined ? '' : typeof t === 'string' ? t : (t[lang] ?? t.en))
export const isProper = (t: Text | undefined) => typeof t === 'string'

/** The row's line: «{by}: {take}», counts filled from the data in the interface language's digits. */
export function takeText(s: Source, lang: Lang) {
  const n = new Intl.NumberFormat(numberLocale(lang), { useGrouping: false }).format(s.langs?.length ?? 0)
  return text(s.take, lang).replace('{n}', n)
}

// Arabic names of two languages as the reply writes them (Intl writes «الأوردية» and «الماليزية»).
const AR_NAMES: Record<string, string> = { ur: 'الأردية', ms: 'الملايوية' }

/** A language's name in the interface language. */
export function langName(code: string, lang: Lang): string {
  if (lang === 'ar' && AR_NAMES[code]) return AR_NAMES[code]
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

/** A Riyadh date «YYYY-MM-DD» written in the interface language («١٢ أكتوبر ٢٠٢٦»). */
export const dateText = (ymd: string, lang: Lang) =>
  gregorianText(new Date(`${ymd}T12:00:00Z`), lang, { day: 'numeric', month: 'long', year: 'numeric' }, 'UTC')

/** The «عن المصدر» keys of the answer and reader sheets, as registry ids (for «أبلغ عن خطأ»). */
export const REGISTRY_OF: Record<string, string> = {
  mushaf: 'ksu',
  muyassar: 'ksu',
  saadi: 'ksu',
  book239: 'shamela',
  tawhid: 'shamela',
  hadeethenc: 'hadeethenc',
  mp3quran: 'mp3quran',
}
