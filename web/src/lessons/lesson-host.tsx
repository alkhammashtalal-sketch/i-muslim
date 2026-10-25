// The host of a lesson page inside the app: the review page's own renderer (each lesson's lesson.js, ported from
// relay/w1/<lesson>/src/lesson.js) draws into one element that React leaves alone, as it drew into its page. The app
// gives it the content language, the frame words of the eight machine-translated interfaces (chrome.ts), its routes
// (an in-app link opens the app's screen), the hadith and ayah texts by id from our server (texts.js), and al-Fatiha's
// transliteration when our server sends it.
// Imported by the lesson pages only: it is in their lazy chunks.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Lang } from '../../../shared/api'
import { api } from '../api/base'
import { openToday } from '../v2/daily/Screen'
import { CHROME, contentLang, type Chrome } from './chrome'
import { hasRoute } from './registry'
import { ListenAyah, ListenText } from '../listen/Listen'
import type { SpeakGuard, SpeakRole } from '../listen/guard'

export type MountOptions = {
  data: unknown
  /** 'ar' or 'en': the language of the lesson's content, as on its review page */
  lang: 'ar' | 'en'
  /** the interface's own frame words when it is neither Arabic nor English */
  chrome?: Chrome
  navigate: (href: string) => void
  hasRoute: (href: string) => boolean
  scrollTop: () => void
  /** GET /api/hadith/:id?lang= (worker/src/hadith.ts): { ar, tr? }, or null */
  fetchHadith: (id: string, lang: string) => Promise<unknown>
  /** GET /api/passage/quran:S:A (worker/src/passage.ts), or null */
  fetchAyah: (id: string) => Promise<unknown>
  /** The app's listen button (add-on 0072-add14) in an element the lesson places under the text: the app draws it there.
   *  Absent on the review page. */
  listen?: (spec: ListenSpec) => HTMLElement
  /** the prayer lesson's definitions of each prayer (prayer/prayers.js; add-on 0072-add13) */
  prayers?: unknown
  /** today's time of each prayer as the prayer-times screen gives it, by its name ('fajr'…), or null without a place */
  times?: Record<string, string> | null
}
/** What a listen slot plays: an ayah by its id (the reciter's recording; outside Arabic its meaning beside it), or a
 *  text of the lesson in the device's voice by the rules of listen/guard.ts. */
export type ListenSpec =
  | { kind: 'ayah'; id: string; meaning?: { text: string; lang: string; ayah?: string } | null }
  | { kind: 'speak'; text: string; lang: string; role: SpeakRole; guard?: SpeakGuard }
export type MountedLesson = {
  destroy: () => void
  /** al-Fatiha's transliteration as Quran Foundation gives it through our server, by ayah id ('quran:1:1') */
  setTranslit?: (lines: Record<string, string>) => void
  /** the prayers' definitions once our server has answered (add-on 0072-add13 §2) */
  setPrayers?: (set: unknown) => void
}
export type Mount = (root: HTMLElement, opts: MountOptions) => MountedLesson

/** Open an app route from inside a lesson: the lesson's own ?step= (and the prayer lesson's ?prayer= and ?practice=)
 *  stay behind. */
function goApp(href: string) {
  const p = new URLSearchParams(location.search)
  for (const k of ['step', 'prayer', 'practice']) p.delete(k)
  const q = p.toString()
  history.replaceState(history.state, '', location.pathname + (q ? `?${q}` : ''))
  openToday(href)
}

/** Our server's answer as JSON, or null (not found, no answer, or not JSON). */
async function getJson(url: string): Promise<unknown> {
  try {
    const r = await fetch(url)
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}
// The lesson's hadith and ayah texts by id (texts.js): the routes the app's hadith page and Quran reader use.
const fetchHadith = (id: string, lang: string) => getJson(api(`/api/hadith/${id}?lang=${lang}`))
const fetchAyah = (id: string) => getJson(api(`/api/passage/${encodeURIComponent(id)}`)) // as web/src/api/client.ts asks

function scrollTop() {
  window.scrollTo?.(0, 0)
  document.querySelector('.dt-screen')?.scrollTo?.(0, 0)
}

/** GET /api/qf/translit/<sura> (worker/src/qf.ts): the ayat's lines, or null when the server does not answer with
 *  them. Not kept anywhere: Quran Foundation's terms keep their content a week at most (add-on 0071-add14 §4). */
async function fetchTranslit(sura: number): Promise<Record<string, string> | null> {
  try {
    const r = await fetch(api(`/api/qf/translit/${sura}`))
    if (!r.ok) return null
    const j = (await r.json()) as { sura?: unknown; ayat?: unknown }
    if (j?.sura !== sura || !Array.isArray(j.ayat)) return null
    const lines: Record<string, string> = {}
    for (const a of j.ayat as { aya?: unknown; text?: unknown }[])
      if (Number.isInteger(a?.aya) && typeof a.text === 'string' && a.text) lines[`quran:${sura}:${a.aya}`] = a.text
    return Object.keys(lines).length ? lines : null
  } catch {
    return null
  }
}

type Slot = { n: number; el: HTMLElement; spec: ListenSpec }

/** Our server's JSON at a URL made by api(…), or null; for a lesson's own data (the prayers' definitions). */
export const getOurs = (url: string) => getJson(url)

export function LessonHost({
  id,
  lang,
  data,
  mount,
  translitSura,
  more,
  onMounted,
}: {
  id: string
  lang: Lang
  data: unknown
  mount: Mount
  translitSura?: number
  /** the lesson's own options (stable: memoised by the page) */
  more?: Partial<MountOptions>
  /** after the mount: what the page then asks of our server for it (the prayers' definitions) */
  onMounted?: (lesson: MountedLesson, alive: () => boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // The listen buttons the lesson asks for: drawn by the app into the lesson's own elements (portals keep the app's
  // language and its one sound at a time); a slot the lesson's next render removed goes, and what it played stops.
  const [slots, setSlots] = useState<Slot[]>([])
  const fresh = useRef<Slot[]>([])
  const count = useRef(0)
  const listen = useCallback((spec: ListenSpec) => {
    const el = document.createElement('div')
    el.className = 'lsn-listen'
    fresh.current.push({ n: ++count.current, el, spec })
    queueMicrotask(() => {
      const add = fresh.current.splice(0)
      setSlots((prev) => (add.length || prev.some((x) => !x.el.isConnected) ? [...prev, ...add].filter((x) => x.el.isConnected) : prev))
    })
    return el
  }, [])
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const content = contentLang(lang)
    const lesson = mount(root, {
      data,
      lang: content,
      chrome: content === 'en' && lang !== 'en' ? CHROME[lang] : undefined,
      navigate: goApp,
      hasRoute,
      scrollTop,
      fetchHadith,
      fetchAyah,
      listen,
      ...more,
    })
    let alive = true
    if (translitSura && lesson.setTranslit)
      void fetchTranslit(translitSura).then((lines) => {
        if (alive && lines) lesson.setTranslit?.(lines)
      })
    onMounted?.(lesson, () => alive)
    return () => {
      alive = false
      lesson.destroy()
      setSlots([])
    }
  }, [lang, data, mount, translitSura, listen, more, onMounted])
  // the page's stylesheet is scoped to #lsn-<id> (scripts/lessons/build.mjs): an id, so the app's classes do not reach in
  return (
    <div className="lsn-frame">
      <div ref={ref} id={`lsn-${id}`} className="lsn" data-lesson={id} />
      {slots.map((x) =>
        createPortal(x.spec.kind === 'ayah' ? <ListenAyah id={x.spec.id} meaning={x.spec.meaning} /> : <ListenText text={x.spec.text} lang={x.spec.lang} role={x.spec.role} guard={x.spec.guard} />, x.el, String(x.n)),
      )}
    </div>
  )
}
