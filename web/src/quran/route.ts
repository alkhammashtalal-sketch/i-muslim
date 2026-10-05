import { useEffect, useState } from 'react'

// Path routing for the reader: /quran, /quran/2, /quran/2/255. Everything else is the chat.
export type Route = { view: 'chat' } | { view: 'quran'; sura?: number; aya?: number }

export function parseRoute(pathname: string): Route {
  const m = pathname.match(/^\/quran(?:\/(\d{1,3})(?:\/(\d{1,3}))?)?\/?$/)
  if (!m) return { view: 'chat' }
  const sura = m[1] ? Number(m[1]) : undefined
  const aya = m[2] ? Number(m[2]) : undefined
  if (sura !== undefined && (sura < 1 || sura > 114)) return { view: 'quran' }
  return { view: 'quran', sura, aya }
}

export const quranPath = (sura?: number, aya?: number) =>
  sura === undefined ? '/quran' : aya === undefined ? `/quran/${sura}` : `/quran/${sura}/${aya}`

const EVENT = 'imuslim:navigate'

/** pushState (or replaceState) and tell useRoute listeners. Keeps ?lang/?theme overrides. */
export function navigate(path: string, { replace = false } = {}) {
  const url = path + location.search
  if (replace) history.replaceState(null, '', url)
  else history.pushState(null, '', url)
  window.dispatchEvent(new Event(EVENT))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.pathname))
  useEffect(() => {
    const h = () => setRoute(parseRoute(location.pathname))
    window.addEventListener('popstate', h)
    window.addEventListener(EVENT, h)
    return () => {
      window.removeEventListener('popstate', h)
      window.removeEventListener(EVENT, h)
    }
  }, [])
  return route
}
