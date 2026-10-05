import { createContext, useContext } from 'react'
import type { Lang } from '../../../shared/api'
import ar from './ar'
import bn from './bn'
import en, { type Strings } from './en'
import es from './es'
import fr from './fr'
import hi from './hi'
import id from './id'
import ms from './ms'
import tr from './tr'
import ur from './ur'

export type { Strings }

export const LANGS: { code: Lang; native: string; dir: 'rtl' | 'ltr'; reviewed: boolean }[] = [
  { code: 'ar', native: 'العربية', dir: 'rtl', reviewed: true },
  { code: 'en', native: 'English', dir: 'ltr', reviewed: true },
  { code: 'ur', native: 'اردو', dir: 'rtl', reviewed: false },
  { code: 'id', native: 'Indonesia', dir: 'ltr', reviewed: false },
  { code: 'ms', native: 'Melayu', dir: 'ltr', reviewed: false },
  { code: 'tr', native: 'Türkçe', dir: 'ltr', reviewed: false },
  { code: 'fr', native: 'Français', dir: 'ltr', reviewed: false },
  { code: 'es', native: 'Español', dir: 'ltr', reviewed: false },
  { code: 'bn', native: 'বাংলা', dir: 'ltr', reviewed: false },
  { code: 'hi', native: 'हिन्दी', dir: 'ltr', reviewed: false },
]

export const STRINGS: Record<Lang, Strings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

export const langMeta = (code: Lang) => LANGS.find((l) => l.code === code)!
export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v)

export const I18nContext = createContext<{ lang: Lang; t: Strings }>({ lang: 'ar', t: ar })
export const useI18n = () => useContext(I18nContext)

export const levelLabel = (t: Strings, level: 'A' | 'B' | 'C' | 'D') =>
  ({ A: t.levelA, B: t.levelB, C: t.levelC, D: t.levelD })[level]

// Arabic UI uses Arabic-Indic digits; other languages use their locale default.
export const numberLocale = (lang: Lang) => (lang === 'ar' ? 'ar-u-nu-arab' : lang)
