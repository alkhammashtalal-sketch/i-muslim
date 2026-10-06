import { useEffect, useSyncExternalStore } from 'react'
import config from '../config/recitation.json'

// Human recitation (command 17): a reciter's recording from mp3quran.net, played from their servers, with the ayah
// timings fetched once into web/public/recitation/ (scripts/ingest/recitation-timing.mjs). Nothing is requested from
// mp3quran before the user presses «استمع»: no autoplay, no preload. This is a person's recorded voice; the rule that
// no machine voice ever reads an ayah stays as it is. Since command 19 (Talal, 6 October) voice conversation, which
// the user chose, may play an ayah of its reply here (reciteRange); typing never does.

type Timing = { sura: number; read: number; audio: string; ayat: [number, number, number][] }
export type Range = { sura: number; from: number; to: number }
export type RecitationState =
  | { status: 'idle' }
  | (Range & { status: 'loading' | 'playing' | 'paused'; aya: number })
  | (Range & { status: 'error' })

/** Rule 14 (no person's name in the app) has one exception, the reciter (Talal, 6 October 09:58: «يفضل يكتب اسم
 *  القاريء»): the attribution names whoever is heard. */
export const SHOW_RECITER_NAME = true
export const recitationSite = config.site

// Several reciters (command 20), each with checked timings for all 114 suras; the choice stays on this device.
export type Reciter = { read: number; name: { ar: string; en: string | null }; server: string; suras: number[] }
export const RECITERS = config.reciters as Reciter[]
const KEY = 'imuslim.reciter.v1'
let reciter: Reciter = (() => {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return RECITERS.find((r) => r.read === saved) ?? RECITERS[0]
  } catch {
    return RECITERS[0]
  }
})()
const reciterListeners = new Set<() => void>()
export const getReciter = () => reciter
/** The reciter's name as mp3quran gives it: Arabic in Arabic, English elsewhere. */
export const reciterLabel = (r: Reciter, lang: string) => (lang === 'ar' ? r.name.ar : (r.name.en ?? r.name.ar))
export const hasRecitation = (sura: number) => reciter.suras.includes(sura)
const audioUrl = (sura: number) => `${reciter.server}${String(sura).padStart(3, '0')}.mp3`

let state: RecitationState = { status: 'idle' }
const listeners = new Set<() => void>()
const set = (s: RecitationState) => {
  state = s
  for (const f of listeners) f()
}
const loaded = new Map<string, Timing>() // by read:sura
const pending = new Map<string, Promise<Timing>>()
let audio: HTMLAudioElement | null = null
let range: { start: number; end: number; ayat: [number, number, number][] } | null = null
let frame = 0

/** Our own small timing file (same origin, never mp3quran). Fetched when a listen button shows, so a press can start
 *  the audio at once: iOS plays only from inside the press itself. */
export function prime(sura: number): Promise<Timing> {
  const key = `${reciter.read}:${sura}`
  const have = loaded.get(key)
  if (have) return Promise.resolve(have)
  let p = pending.get(key)
  if (!p) {
    p = fetch(`/recitation/${reciter.read}/${sura}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`timing ${key}: ${r.status}`)
        return r.json() as Promise<Timing>
      })
      .then((t) => {
        loaded.set(key, t)
        return t
      })
      .finally(() => pending.delete(key))
    pending.set(key, p)
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

/** The one audio element, reused for every recitation: iOS lets a page play sound later only on an element that has
 *  played inside a press (unlockAudio). */
function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('timeupdate', follow)
    audio.addEventListener('ended', () => {
      if (state.status !== 'idle') stop()
    })
    audio.addEventListener('error', () => {
      if (state.status === 'idle') return
      cancelAnimationFrame(frame)
      const { sura, from, to } = state
      set({ status: 'error', sura, from, to })
    })
  }
  return audio
}

/** Inside the press that opens a voice conversation: a fraction of a second of silence from our own site, so the
 *  same element may later play a recitation with no press of its own (iOS). Nothing is asked of mp3quran here. */
export function unlockAudio() {
  const a = element()
  if (state.status !== 'idle') return
  try {
    a.src = '/audio/unlock.mp3'
    void a.play().catch(() => undefined)
  } catch {
    // nothing to unlock
  }
}

// A recitation started by a reply being read aloud (command 19), as opposed to one the user pressed.
let byReading = false

function start(t: Timing, r: Range, quiet = false, at = r.from) {
  const first = t.ayat[at - 1]
  const last = t.ayat[Math.min(r.to, t.ayat.length) - 1]
  if (!first || !last) return set({ ...r, status: 'error' })
  range = { start: first[1] / 1000, end: last[2], ayat: t.ayat }
  const a = element()
  const url = audioUrl(r.sura)
  // Same recording with its length known: seek. Otherwise a media fragment starts the download at the ayah, and the
  // seek is made again once the length is known (not every browser or server honours the fragment).
  const sec = range.start
  if (a.src.split('#')[0] === url && a.readyState >= 1) a.currentTime = sec
  else {
    a.src = `${url}#t=${sec}`
    a.addEventListener(
      'loadedmetadata',
      () => {
        if (Math.abs(a.currentTime - sec) > 0.25) a.currentTime = sec
      },
      { once: true },
    )
  }
  // A press ends any reading aloud; a recitation the reading itself starts must not end that reading.
  if (!quiet) window.dispatchEvent(new Event('recitation-start'))
  set({ ...r, status: 'loading', aya: at })
  a.play().then(
    () => {
      if (state.status !== 'loading' || state.sura !== r.sura || state.from !== r.from) return
      set({ ...r, status: 'playing', aya: at })
      frame = requestAnimationFrame(loop)
    },
    () => {
      if (state.status === 'loading') set({ ...r, status: 'error' })
    },
  )
}

/** Plays ayat `from`..`to` of a sura (starting at ayah `at` inside that range). Call it from the user's press only. */
export function play(sura: number, from: number, to: number, quiet = false, at = from) {
  stop()
  byReading = quiet
  const r = { sura, from, to }
  const t = loaded.get(`${reciter.read}:${sura}`)
  if (t) return start(t, r, quiet, at)
  set({ ...r, status: 'loading', aya: at })
  prime(sura).then(
    (x) => state.status === 'loading' && state.sura === sura && start(x, r, quiet, at),
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

/** Choosing another reciter. A recitation the user started goes on from the same ayah in the new voice; one a
 *  reading started ends, and the reading goes on. */
export function setReciter(read: number) {
  const next = RECITERS.find((r) => r.read === read)
  if (!next || next.read === reciter.read) return
  const was = state
  reciter = next
  try {
    localStorage.setItem(KEY, String(read))
  } catch {
    // private mode: the choice lasts for this visit
  }
  for (const f of reciterListeners) f()
  if (was.status === 'idle' || was.status === 'error') return
  if (byReading) return stop()
  // The same range, from the ayah that was being recited.
  play(was.sura, was.from, was.to, false, was.aya)
}

export function useReciter(): Reciter {
  return useSyncExternalStore(
    (f) => {
      reciterListeners.add(f)
      return () => void reciterListeners.delete(f)
    },
    () => reciter,
    () => reciter,
  )
}

/** Milliseconds from the start of ayah `from` to the end of ayah `to`, or null when the timings cannot say. */
export async function rangeMs(sura: number, from: number, to: number): Promise<number | null> {
  if (!hasRecitation(sura)) return null
  try {
    const t = await prime(sura)
    const a = t.ayat[from - 1]
    const b = t.ayat[to - 1]
    return a && b && b[2] > a[1] ? b[2] - a[1] : null
  } catch {
    return null
  }
}

/** A recitation for a reply read aloud (command 19): plays the range and settles when it has ended, when it was
 *  stopped, or as failed when it has not started within `startMs` (or cannot start: offline, no timings). */
export function reciteRange(sura: number, from: number, to: number, startMs = 4000): Promise<'ended' | 'stopped' | 'failed'> {
  if (!hasRecitation(sura) || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve('failed')
  return new Promise((resolve) => {
    let started = false
    let done = false
    const finish = (r: 'ended' | 'stopped' | 'failed') => {
      if (done) return
      done = true
      listeners.delete(watch)
      window.clearTimeout(timer)
      resolve(r)
    }
    const watch = () => {
      const s = state
      const mine = s.status !== 'idle' && s.sura === sura && s.from === from && s.to === to
      if (mine && s.status === 'playing') started = true
      else if (mine && s.status === 'error') {
        finish('failed') // first: stop() below notifies this watcher again
        stop()
      } else if (!mine) finish(started ? 'ended' : 'stopped')
    }
    const timer = window.setTimeout(() => {
      if (started) return
      finish('failed')
      stop()
    }, startMs)
    play(sura, from, to, true)
    listeners.add(watch)
    watch()
  })
}

/** Ends a recitation only when a reading aloud started it (the reader's stop), never one the user pressed. */
export function stopReadingRecitation() {
  if (byReading && state.status !== 'idle') stop()
}

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
