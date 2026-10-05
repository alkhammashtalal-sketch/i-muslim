import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '../../shared/api'
import { isLang } from './i18n'

export type Theme = 'light' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg'
export type Settings = { lang: Lang; theme: Theme; fontSize: FontSize; simple: boolean }

const KEY = 'imuslim.settings.v1'
const DEFAULTS: Settings = { lang: 'ar', theme: 'auto', fontSize: 'md', simple: false }

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
