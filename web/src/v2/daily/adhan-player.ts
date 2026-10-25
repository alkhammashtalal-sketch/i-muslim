// The full adhan inside the app (add-on 0072-add24 §1: «داخل التطبيق: لكل صلاة أذانها، والفجر بالنسخة المُصلحة»): each
// of the five prayers on the times page plays its own recording, streamed from our server (/sounds/adhan-full-<prayer>.m4a,
// listed in /sounds/manifest.json with Talal's approval), never bundled in the app.
//   - Only on the user's tap, and stopped by the same tap; nothing plays by itself.
//   - One sound in the whole app at a time, as the listen button (web/src/listen/engine.ts): starting the adhan stops the
//     recitation and the device voice («listen-start», as the listen buttons announce), and a recitation or a listen
//     button started elsewhere stops the adhan («recitation-start», «listen-start»).
//   - The phone's silent switch: as the listen button, the page asks for playback while it plays (navigator.audioSession
//     in Safari 17+ and the iPhone app) and gives it back after.
// Streaming needs no hash: the file is read as it plays, from our own server; the manifest's SHA-256 checks the alert
// clips the phone keeps (alert-sounds-device.ts). Pure parts first (worker/test/adhan-player-0072.test.ts).
import { useSyncExternalStore } from 'react'
import { API_BASE } from '../../api/base'
import { EMPTY_MANIFEST, MANIFEST_PATH, parseManifest, type SoundManifest } from '../../native/alert-sounds'
import { stopListening } from '../../listen/engine'
import { setAudioSession } from '../../voice/session'

export const ADHAN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type AdhanPrayer = (typeof ADHAN_PRAYERS)[number]

/** The full adhan of a prayer in the manifest: its path, when approved (an M4A both systems and browsers play). */
export function fullAdhanPath(m: SoundManifest, prayer: string): string | null {
  const e = m.sounds.find((s) => s.id === `adhan-full-${prayer}`)
  if (!e?.approved) return null
  const f = e.files.ios ?? e.files.android
  return f && /\.m4a$/i.test(f.path) ? f.path : null
}

/** The prayers that have their own adhan now (none until the server lists them). */
export const adhanPrayers = (m: SoundManifest): AdhanPrayer[] => ADHAN_PRAYERS.filter((p) => fullAdhanPath(m, p))

let memo: Promise<SoundManifest> | null = null
/** The server's manifest, asked once per run of the app; empty when it cannot be read. */
export function adhanManifest(): Promise<SoundManifest> {
  memo ??= fetch(API_BASE + MANIFEST_PATH)
    .then((r) => (r.ok ? r.json() : null))
    .then(parseManifest, () => EMPTY_MANIFEST)
  return memo
}

export type AdhanState = { prayer: string; status: 'loading' | 'playing' | 'error' } | null
let state: AdhanState = null
const listeners = new Set<() => void>()
const set = (s: AdhanState) => {
  state = s
  for (const f of listeners) f()
}
export const getAdhan = () => state
export function useAdhan(): AdhanState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => state,
    () => null,
  )
}

let audio: HTMLAudioElement | null = null
let starting = false
let wired = false
function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  // Another sound started elsewhere: the adhan gives way (its own «listen-start» is ignored while it starts).
  const giveWay = () => !starting && stopAdhan()
  window.addEventListener('recitation-start', giveWay)
  window.addEventListener('listen-start', giveWay)
}

/** Stop the adhan, if it plays. */
export function stopAdhan() {
  if (!audio && !state) return
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  if (state) setAudioSession('auto')
  set(null)
}

/** The tap on a prayer's button: plays its adhan, or stops it when it is the one playing. Call it from the tap itself:
 *  iOS plays sound only inside one. */
export function toggleAdhan(prayer: string, path: string) {
  wire()
  if (state?.prayer === prayer && state.status !== 'error') return stopAdhan()
  stopAdhan()
  starting = true
  try {
    stopListening()
    window.dispatchEvent(new Event('listen-start'))
  } finally {
    starting = false
  }
  audio ??= new Audio()
  const a = audio
  a.preload = 'auto'
  a.onended = () => {
    setAudioSession('auto')
    set(null)
  }
  a.onerror = () => {
    if (!state || state.prayer !== prayer) return
    setAudioSession('auto')
    set({ prayer, status: 'error' })
  }
  a.onplaying = () => state?.prayer === prayer && set({ prayer, status: 'playing' })
  setAudioSession('playback')
  set({ prayer, status: 'loading' })
  a.src = API_BASE + path
  void a.play().catch(() => {
    if (state?.prayer === prayer) {
      setAudioSession('auto')
      set({ prayer, status: 'error' })
    }
  })
}
