import { useEffect, useSyncExternalStore } from 'react'
import config from '../config/recitation.json'

// Human recitation (command 17): a reciter's recording from mp3quran.net, played from their servers, with the ayah
// timings fetched once into web/public/recitation/ (scripts/ingest/recitation-timing.mjs). Nothing is requested from
// mp3quran before the user presses «استمع»: no autoplay, no preload. This is a person's recorded voice; the rule that
// no machine voice ever reads an ayah stays as it is, and voice conversation never starts a recitation.

type Timing = { sura: number; read: number; audio: string; ayat: [number, number, number][] }
export type Range = { sura: number; from: number; to: number }
export type RecitationState =
  | { status: 'idle' }
  | (Range & { status: 'loading' | 'playing' | 'paused'; aya: number })
  | (Range & { status: 'error' })

/** Rule 14: no person's name in the app. The attribution names the platform until Talal decides otherwise. */
export const SHOW_RECITER_NAME = false
export const reciterName = config.reciter
export const recitationSite = config.site
const available = new Set<number>(config.suras)
export const hasRecitation = (sura: number) => available.has(sura)
const audioUrl = (sura: number) => `${config.server}${String(sura).padStart(3, '0')}.mp3`

let state: RecitationState = { status: 'idle' }
const listeners = new Set<() => void>()
const set = (s: RecitationState) => {
  state = s
  for (const f of listeners) f()
}
const loaded = new Map<number, Timing>()
const pending = new Map<number, Promise<Timing>>()
let audio: HTMLAudioElement | null = null
let range: { start: number; end: number; ayat: [number, number, number][] } | null = null
let frame = 0

/** Our own small timing file (same origin, never mp3quran). Fetched when a listen button shows, so a press can start
 *  the audio at once: iOS plays only from inside the press itself. */
export function prime(sura: number): Promise<Timing> {
  const have = loaded.get(sura)
  if (have) return Promise.resolve(have)
  let p = pending.get(sura)
  if (!p) {
    p = fetch(`/recitation/${config.read}/${sura}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`timing ${sura}: ${r.status}`)
        return r.json() as Promise<Timing>
      })
      .then((t) => {
        loaded.set(sura, t)
        return t
      })
      .finally(() => pending.delete(sura))
    pending.set(sura, p)
  }
  return p
}

// The ayah being recited: the last whose start has passed. rAF while visible; timeupdate keeps the end in the background.
function follow() {
  if (!audio || !range || state.status !== 'playing') return
  const now = audio.currentTime * 1000
  if (now >= range.end) return stop()
  let aya = state.from
  for (const [a, s] of range.ayat) {
    if (s > now) break
    if (a >= state.from) aya = a
  }
  if (aya !== state.aya) set({ ...state, aya })
}
function loop() {
  follow()
  if (state.status === 'playing') frame = requestAnimationFrame(loop)
}

function start(t: Timing, r: Range) {
  const first = t.ayat[r.from - 1]
  const last = t.ayat[Math.min(r.to, t.ayat.length) - 1]
  if (!first || !last) return set({ ...r, status: 'error' })
  range = { start: first[1] / 1000, end: last[2], ayat: t.ayat }
  if (!audio) {
    audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('timeupdate', follow)
    audio.addEventListener('ended', () => stop())
    audio.addEventListener('error', () => {
      if (state.status === 'idle') return
      cancelAnimationFrame(frame)
      const { sura, from, to } = state
      set({ status: 'error', sura, from, to })
    })
  }
  const a = audio
  const url = audioUrl(r.sura)
  // Same recording with its length known: seek. Otherwise a media fragment starts the download at the ayah.
  if (a.src.split('#')[0] === url && a.readyState >= 1) a.currentTime = range.start
  else a.src = `${url}#t=${range.start}`
  window.dispatchEvent(new Event('recitation-start'))
  set({ ...r, status: 'loading', aya: r.from })
  a.play().then(
    () => {
      if (state.status !== 'loading' || state.sura !== r.sura || state.from !== r.from) return
      set({ ...r, status: 'playing', aya: r.from })
      frame = requestAnimationFrame(loop)
    },
    () => {
      if (state.status === 'loading') set({ ...r, status: 'error' })
    },
  )
}

/** Plays ayat `from`..`to` of a sura. Call it from the user's press only. */
export function play(sura: number, from: number, to: number) {
  stop()
  const r = { sura, from, to }
  const t = loaded.get(sura)
  if (t) return start(t, r)
  set({ ...r, status: 'loading', aya: from })
  prime(sura).then(
    (x) => state.status === 'loading' && state.sura === sura && start(x, r),
    () => state.status === 'loading' && set({ ...r, status: 'error' }),
  )
}

export function pause() {
  // Still fetching the timing file: nothing has started, so pausing ends it.
  if (state.status === 'loading' && !range) return stop()
  if ((state.status !== 'playing' && state.status !== 'loading') || !audio) return
  audio.pause()
  cancelAnimationFrame(frame)
  set({ ...state, status: 'paused' })
}

export function resume() {
  if (state.status !== 'paused' || !audio) return
  const s = state
  window.dispatchEvent(new Event('recitation-start'))
  audio.play().then(
    () => {
      set({ ...s, status: 'playing' })
      frame = requestAnimationFrame(loop)
    },
    () => set({ status: 'error', sura: s.sura, from: s.from, to: s.to }),
  )
}

export function stop() {
  cancelAnimationFrame(frame)
  audio?.pause()
  range = null
  if (state.status !== 'idle') set({ status: 'idle' })
}

export const getRecitation = () => state

export const parseAyahId = (id?: string) => {
  const m = id?.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  return m ? { sura: Number(m[1]), aya: Number(m[2]) } : null
}

export function useAyahReciting(id?: string) {
  const s = useRecitation()
  const a = parseAyahId(id)
  return !!a && (s.status === 'playing' || s.status === 'paused') && s.sura === a.sura && s.aya === a.aya
}


export function useRecitation(): RecitationState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => state,
    () => state,
  )
}

export function useOnline() {
  return useSyncExternalStore(
    (f) => {
      window.addEventListener('online', f)
      window.addEventListener('offline', f)
      return () => {
        window.removeEventListener('online', f)
        window.removeEventListener('offline', f)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

/** Lights the ayah being recited on a sura page (a class on its span) and follows it with a calm scroll. */
export function useRecitationHighlight(sura: number, ready: boolean) {
  const s = useRecitation()
  const aya = ready && (s.status === 'playing' || s.status === 'paused') && s.sura === sura ? s.aya : 0
  useEffect(() => {
    if (!aya) return
    const el = document.getElementById(`a-${aya}`)
    if (!el) return
    el.classList.add('is-reciting')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    return () => el.classList.remove('is-reciting')
  }, [aya])
  // Leaving the sura ends its recitation.
  useEffect(() => () => {
    const now = getRecitation()
    if (now.status !== 'idle' && now.sura === sura) stop()
  }, [sura])
}
