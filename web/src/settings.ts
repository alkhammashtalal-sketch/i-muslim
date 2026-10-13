import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '../../shared/api'
import { isLang } from './i18n'
import { contentFor } from './v2/lang/served'

export type Theme = 'light' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg'
/** `lang` is the interface (one of the ten); `content` the language of the sources' translations (reply 0033 §أ1):
 *  the same as `lang`, or any other served language with the English interface. */
export type Settings = { lang: Lang; theme: Theme; fontSize: FontSize; simple: boolean; content: string }

const KEY = 'imuslim.settings.v1'
const DEFAULTS: Settings = { lang: 'ar', theme: 'auto', fontSize: 'md', simple: false, content: 'ar' }

function load(): Settings {
  let stored: Partial<Settings> = {}
  try {
    stored = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    stored = {}
  }
  const s: Settings = { ...DEFAULTS, ...stored }
  // URL overrides (?lang=en&theme=dark) let a shared link or a screenshot open in a given state.
  const params = new URLSearchParams(location.search)
  const lang = params.get('lang')
  if (isLang(lang)) s.lang = lang
  const theme = params.get('theme')
  if (theme === 'light' || theme === 'dark' || theme === 'auto') s.theme = theme
  if (!isLang(s.lang)) s.lang = 'ar'
  s.content = contentFor(stored.content, s.lang)
  return s
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable (private mode): settings live for this session only
    }
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])
  return [settings, update] as const
}
