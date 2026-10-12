import { useEffect, useState } from 'react'

// Path routing for the library: /quran, /quran/2, /quran/2/255; /books, /book/usul, /book/usul/aqeedah:usul:003.
// /verify is the judges' page (command 17). Everything else is the chat.
// The reader's own pages (reply 0032 C): saved bookmarks and notes, the daily portion, the reciters.
export type ReaderPage = 'saved' | 'ward' | 'reciters'
export type Route =
  | { view: 'chat' }
  | { view: 'quran'; sura?: number; aya?: number; page?: ReaderPage }
  | { view: 'books'; book?: string; seg?: string }
  | { view: 'verify' }
  | { view: 'tools'; tool: 'adhkar' | 'tasbih' | 'names' | 'words' } // reply 0032 D-5, D-6, D-8, D-11
  | { view: 'today'; tool: string }

export function parseRoute(rawPath: string): Route {
  // Shared links may arrive with the colons of a segment id percent-encoded (aqeedah%3Ausul%3A004).
  let pathname = rawPath
  try {
    pathname = decodeURIComponent(rawPath)
  } catch {
    // malformed escape: match the raw path
  }
  if (/^\/verify\/?$/.test(pathname)) return { view: 'verify' }
  const tool = pathname.match(/^\/today\/(adhkar|tasbih|names|words)\/?$/)
  if (tool) return { view: 'tools', tool: tool[1] as 'adhkar' | 'tasbih' | 'names' | 'words' }
  // The daily screens (reply 0032 D): /today/times, /today/qibla, … (web/src/v2/daily/TodayView.tsx).
  const td = pathname.match(/^\/today\/([a-z]{2,20})\/?$/)
  if (td) return { view: 'today', tool: td[1] }
  if (/^\/books\/?$/.test(pathname)) return { view: 'books' }
  // Any segment part opens the book; an unknown id then shows «not found» in its sheet instead of the chat.
  const b = pathname.match(/^\/book\/([a-z]{1,20})(?:\/([^/]{1,64}))?\/?$/)
  if (b) return { view: 'books', book: b[1], seg: b[2] }
  const rp = pathname.match(/^\/quran\/(saved|ward|reciters)\/?$/)
  if (rp) return { view: 'quran', page: rp[1] as ReaderPage }
  const m = pathname.match(/^\/quran(?:\/(\d{1,3})(?:\/(\d{1,3}))?)?\/?$/)
  if (!m) return { view: 'chat' }
  const sura = m[1] ? Number(m[1]) : undefined
  const aya = m[2] ? Number(m[2]) : undefined
  if (sura !== undefined && (sura < 1 || sura > 114)) return { view: 'quran' }
  return { view: 'quran', sura, aya }
}

export const bookPath = (book?: string, seg?: string) => (!book ? '/books' : seg ? `/book/${book}/${seg}` : `/book/${book}`)

export const quranPath = (sura?: number, aya?: number) =>
  sura === undefined ? '/quran' : aya === undefined ? `/quran/${sura}` : `/quran/${sura}/${aya}`

/** True when the current URL already points at `path` (ignoring percent-encoding). */
export function isCurrentPath(path: string) {
  try {
    return decodeURIComponent(location.pathname) === path
  } catch {
    return location.pathname === path
  }
}

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
