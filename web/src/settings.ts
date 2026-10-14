import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '../../shared/api'
import { isLang } from './i18n'
import { contentFor } from './v2/lang/served'
import { firstRunLanguage } from './v2/lang/first-run'

export type FontSize = 'sm' | 'md' | 'lg'
/** `lang` is the interface (one of the ten); `content` the language of the sources' translations (reply 0033 §أ1):
 *  the same as `lang`, or any other served language with the English interface. */
export type Settings = { lang: Lang; fontSize: FontSize; simple: boolean; content: string }

const KEY = 'imuslim.settings.v1'
const DEFAULTS: Settings = { lang: 'ar', fontSize: 'md', simple: false, content: 'ar' }

function load(): Settings {
  let stored: Partial<Settings> = {}
  let saved = false
  try {
    const raw = localStorage.getItem(KEY)
    saved = raw !== null
    stored = JSON.parse(raw ?? '{}')
  } catch {
    stored = {}
  }
  // The first run: the phone's language (0048-add2 §6); after it, the saved choice.
  if (!saved) stored = { ...stored, ...firstRunLanguage(typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]) }
  // A theme kept from before the day-only version (reply 0043-add7) is dropped.
  const { theme: _theme, ...kept } = stored as Partial<Settings> & { theme?: unknown }
  const s: Settings = { ...DEFAULTS, ...kept }
  // URL override (?lang=en) lets a shared link or a screenshot open in a given language.
  const params = new URLSearchParams(location.search)
  const lang = params.get('lang')
  if (isLang(lang)) s.lang = lang
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
