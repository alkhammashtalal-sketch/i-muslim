import { useEffect, useSyncExternalStore } from 'react'
import config from '../config/recitation.json'
import meta from '../v2/reading/quran-meta.json'

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

// The player's options (reply 0047 §4, board RepeatAfter): the speed and what follows a whole sura stay on this
// device; the sleep timer lasts for this visit only. A whole sura that ends goes on to the next one unless «توقف».
export const RATES = [0.75, 1, 1.25, 1.5] as const
export type Rate = (typeof RATES)[number]
export const SLEEP_MINUTES = [0, 15, 30, 60] as const // 0: no timer
export type SleepMinutes = (typeof SLEEP_MINUTES)[number]
export type AfterSura = 'next' | 'stop'
export type PlayerOptions = { rate: Rate; after: AfterSura; sleep: SleepMinutes; sleepUntil: number | null }
const OPTIONS_KEY = 'imuslim.recitation.options.v1'
let options: PlayerOptions = (() => {
  const o: PlayerOptions = { rate: 1, after: 'next', sleep: 0, sleepUntil: null }
  try {
    const saved = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') as Partial<PlayerOptions>
    if (RATES.includes(saved.rate as Rate)) o.rate = saved.rate as Rate
    if (saved.after === 'stop' || saved.after === 'next') o.after = saved.after
  } catch {
    // nothing saved, or no storage: the defaults
  }
  return o
})()
const optionListeners = new Set<() => void>()
function setOptions(next: Partial<PlayerOptions>) {
  options = { ...options, ...next }
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify({ rate: options.rate, after: options.after }))
  } catch {
    // private mode: the choice lasts for this visit
  }
  for (const f of optionListeners) f()
}
export const getPlayerOptions = () => options
export function usePlayerOptions(): PlayerOptions {
  return useSyncExternalStore(
    (f) => {
      optionListeners.add(f)
      return () => void optionListeners.delete(f)
    },
    () => options,
    () => options,
  )
}
/** The ayat of a sura (1–114), from the reading metadata. */
export const suraAyatCount = (sura: number) => (meta.suraAyat as number[])[sura] ?? 0

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
  // The sleep timer, also here: the time updates go on in the background, where a timeout may wait.
  if (options.sleepUntil !== null && Date.now() >= options.sleepUntil) return sleepNow()
  const now = audio.currentTime * 1000
  if (now >= range.end) return ended()
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
    audio.defaultPlaybackRate = options.rate
    audio.playbackRate = options.rate
    audio.addEventListener('timeupdate', follow)
    audio.addEventListener('ended', () => {
      if (state.status !== 'idle') ended()
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

// Each start and stop is a new generation: a play() still pending from an earlier one (a quick «التالية», or a reciter
// changed at once) is aborted by the pause in between, and its rejection must not fail the start that followed it.
let generation = 0

function start(t: Timing, r: Range, quiet = false, at = r.from) {
  const gen = ++generation
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
  // A new source starts at the default rate: the chosen speed again.
  a.defaultPlaybackRate = options.rate
  a.playbackRate = options.rate
  // A press ends any reading aloud; a recitation the reading itself starts must not end that reading.
  if (!quiet) window.dispatchEvent(new Event('recitation-start'))
  set({ ...r, status: 'loading', aya: at })
  a.play().then(
    () => {
      if (gen !== generation || state.status !== 'loading' || state.sura !== r.sura || state.from !== r.from) return
      set({ ...r, status: 'playing', aya: at })
      frame = requestAnimationFrame(loop)
    },
    () => {
      if (gen === generation && state.status === 'loading') set({ ...r, status: 'error' })
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
  const gen = generation
  window.dispatchEvent(new Event('recitation-start'))
  audio.play().then(
    () => {
      if (gen !== generation || state !== s) return
      set({ ...s, status: 'playing' })
      frame = requestAnimationFrame(loop)
    },
    () => {
      if (gen === generation && state === s) set({ status: 'error', sura: s.sura, from: s.from, to: s.to })
    },
  )
}

// Called once when the range playing reaches its end by itself (not on stop, pause or error): the memorising repeat
// (reply 0032 C-4) plays the range again from here. Cleared by any stop.
let onEnd: (() => void) | null = null

function ended() {
  const h = onEnd
  const was = state
  stop()
  if (h) return h()
  // A whole sura the user started, recited to its end: the next sura from its first ayah, unless «توقف» (reply
  // 0047 §4). The page that shows the sura follows it («recitation-next-sura»).
  if (options.after !== 'next' || byReading || was.status === 'idle' || was.status === 'error') return
  if (was.from !== 1 || was.to !== suraAyatCount(was.sura) || was.sura >= 114) return
  const next = was.sura + 1
  play(next, 1, suraAyatCount(next))
  window.dispatchEvent(new CustomEvent('recitation-next-sura', { detail: { sura: next } }))
}

/** Like play, and `then` runs when the range has been recited to its end (never when stopped). */
export function playThen(sura: number, from: number, to: number, then: () => void) {
  play(sura, from, to)
  onEnd = then
}

export function stop() {
  generation++
  onEnd = null
  cancelAnimationFrame(frame)
  audio?.pause()
  range = null
  if (state.status !== 'idle') set({ status: 'idle' })
}

export const getRecitation = () => state

/** The speed, at once on what is playing. */
export function setRate(rate: Rate) {
  if (!RATES.includes(rate)) return
  setOptions({ rate })
  if (audio) {
    audio.defaultPlaybackRate = rate
    audio.playbackRate = rate
  }
}

export const setAfterSura = (after: AfterSura) => setOptions({ after })

let sleepTimer = 0
/** Pauses the recitation when the timer ends, and clears it. */
function sleepNow() {
  window.clearTimeout(sleepTimer)
  setOptions({ sleep: 0, sleepUntil: null })
  if (state.status === 'playing' || state.status === 'loading') pause()
}
/** A sleep timer of `minutes` from now (0 clears it). */
export function setSleep(minutes: SleepMinutes) {
  window.clearTimeout(sleepTimer)
  if (!minutes) return setOptions({ sleep: 0, sleepUntil: null })
  setOptions({ sleep: minutes, sleepUntil: Date.now() + minutes * 60_000 })
  sleepTimer = window.setTimeout(sleepNow, minutes * 60_000)
}

/** The previous or the next ayah of the range on, from its start; a memorising repeat goes on. */
export function stepAyah(d: 1 | -1) {
  if (state.status === 'idle' || state.status === 'error') return
  const at = Math.min(state.to, Math.max(state.from, state.aya + d))
  if (at === state.aya && state.status !== 'paused') return
  const h = onEnd
  play(state.sura, state.from, state.to, false, at)
  onEnd = h
}

/** Every change of the recitation's state, outside React (the lock screen's controls, web/src/quran/media-session.ts). */
export function onRecitation(f: () => void): () => void {
  listeners.add(f)
  return () => void listeners.delete(f)
}

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
