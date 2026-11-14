// The listen button's sound (add-on 0072-add14 §1): one sound in the whole app at a time, built on what exists.
//   - An ayah: the human recitation (quran/recitation.ts: the chosen reciter's recording from mp3quran.net, CLAUDE.md
//     §2 row و), for its range of ayat. Never a device voice.
//   - Any other text: the device's own voice (speechSynthesis; in the Android app the one native/android/speech.ts puts
//     on the window over Android's engine). Nothing leaves the device. Only what guard.ts allows reaches it, and each
//     piece is checked once more, just before it is spoken, against the ayat and Arabic hadith on the screen.
// Starting one stops the other and anything before it; the voice conversation's reading (voice/speaker.ts) stops too.
// The phone's silent switch: the user pressed the button, so the page asks for playback (navigator.audioSession in
// Safari 17+ and the iPhone app; the recitation's <audio> element plays with the switch on already).
import { useSyncExternalStore } from 'react'
import { play, stop as stopRecitation } from '../quran/recitation'
import { setAudioSession } from '../voice/session'
import { chunk, loadVoices, pickVoice, speechSupported, voiceQuality } from '../voice/speaker'
import { pieceAllowed } from './guard'

const APP_LANGS = new Set(['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])
const base = (tag: string) => tag.toLowerCase().replace('_', '-').split('-')[0]

/** A device voice for a language tag: the app's ten by speaker.ts's own choice, any other (a meaning in a served
 *  language outside the ten) by its tag, then by its language; enhanced and on-device voices first. */
export function voiceFor(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  const b = base(tag)
  if (APP_LANGS.has(b)) return pickVoice(voices, b as Parameters<typeof pickVoice>[1])
  const t = tag.toLowerCase().replace('_', '-')
  const ordered = [...voices].sort((x, y) => voiceQuality(y) - voiceQuality(x) || Number(y.localService) - Number(x.localService))
  return ordered.find((v) => v.lang.toLowerCase().replace('_', '-') === t) ?? ordered.find((v) => base(v.lang) === b) ?? null
}

let voices: SpeechSynthesisVoice[] = []
let ready: Promise<SpeechSynthesisVoice[]> | null = null
/** The device voices, asked once (a button shows only when its language has one). */
export function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([])
  ready ??= loadVoices().then((v) => {
    voices = v
    // Some browsers add voices later (a voice installed meanwhile): the list follows.
    speechSynthesis.addEventListener?.('voiceschanged', () => (voices = speechSynthesis.getVoices()))
    return v
  })
  return ready
}
export const voicesNow = () => (voices.length || !speechSupported() ? voices : speechSynthesis.getVoices())

/** The Arabic words of the ayat and Arabic hadith on the screen now, from the elements that show them: Arabic letters
 *  only, so a translation beside them is never mistaken for them, and none of an element marked as another language
 *  (Urdu shares the script). */
const SACRED = '.sacred, [data-ayah], [data-sacred], [data-ref^="quran:"][data-field="text"], [data-ref^="hadith:"][data-lang="ar"][data-field="hadeeth"]'
export function sacredOnScreen(): string[] {
  if (typeof document === 'undefined') return []
  const out: string[] = []
  for (const el of document.querySelectorAll<HTMLElement>(SACRED)) {
    const holder = el.closest<HTMLElement>('[lang]')
    if (holder && holder !== document.documentElement && base(holder.lang) !== 'ar') continue
    const words = (el.textContent ?? '').match(/[؀-ۿݐ-ݿࢠ-ࣿ]+/g)
    if (words?.length) out.push(words.join(' '))
  }
  return out
}

export type SpeakState = { key: string; status: 'loading' | 'playing' } | null
let now: SpeakState = null
const listeners = new Set<() => void>()
const set = (s: SpeakState) => {
  now = s
  for (const f of listeners) f()
}
export const getSpeaking = () => now
export function useSpeaking(): SpeakState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => now,
    () => null,
  )
}

// Each start and stop is a new generation: an utterance's late `end` from an earlier one is ignored.
let generation = 0
let current: SpeechSynthesisUtterance | null = null // held so Chrome does not collect it before `end`
let wired = false
function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  // A recitation pressed anywhere (the sura's bar, the ayah sheet, another listen button) ends the device voice.
  window.addEventListener('recitation-start', () => stopSpeaking())
}

/** Ends the device voice, if this module started it. */
export function stopSpeaking() {
  generation++
  if (!now) return
  set(null)
  current = null
  if (speechSupported()) speechSynthesis.cancel()
  setAudioSession('auto')
}

/** Ends whatever the listen buttons play: the device voice and the recitation. */
export function stopListening() {
  stopSpeaking()
  stopRecitation()
}

export type SpeakResult = 'started' | 'no-voice' | 'refused'

/**
 * Reads `text` (already allowed by guard.ts) in the device voice for `tag`. Call it from the press itself: iOS speaks
 * only inside one. `key` names the button, for its state.
 */
export function speakNow(key: string, text: string, tag: string): SpeakResult {
  if (!speechSupported()) return 'no-voice'
  const voice = voiceFor(voicesNow(), tag)
  if (!voice) return 'no-voice'
  const pieces = chunk(text)
  // The last check, here and not only where the button was drawn: nothing on the screen's ayat or Arabic hadith.
  const sacred = sacredOnScreen()
  if (!pieces.length || !pieceAllowed(text, sacred) || pieces.some((p) => !pieceAllowed(p, sacred))) {
    console.warn('listen: a text that repeats an ayah or a hadith on the screen was not read')
    return 'refused'
  }
  wire()
  stopRecitation()
  stopSpeaking()
  // The voice conversation's reading ends too (voice/speaker.ts listens for this).
  window.dispatchEvent(new Event('listen-start'))
  speechSynthesis.cancel()
  const gen = ++generation
  setAudioSession('playback')
  set({ key, status: 'loading' })
  let i = 0
  const finish = () => {
    if (gen !== generation) return
    generation++
    current = null
    set(null)
    setAudioSession('auto')
  }
  const next = () => {
    if (gen !== generation) return
    if (i >= pieces.length) return finish()
    const u = new SpeechSynthesisUtterance(pieces[i++])
    u.voice = voice
    u.lang = voice.lang
    u.onstart = () => {
      if (gen === generation && now?.status !== 'playing') set({ key, status: 'playing' })
    }
    u.onend = () => next()
    u.onerror = (e) => {
      if (gen !== generation) return
      if (e.error === 'interrupted' || e.error === 'canceled') return finish()
      next()
    }
    current = u
    speechSynthesis.speak(current)
  }
  next()
  return 'started'
}

// The recitation a listen button started, by its key: that button stops it when its screen goes.
let recitedBy: string | null = null
export const recitedKey = () => recitedBy

/** The reciter's recording of ayat `from`..`to` (from the press). Ends the device voice first. */
export function reciteNow(key: string, sura: number, from: number, to = from) {
  wire()
  stopSpeaking()
  setAudioSession('playback')
  recitedBy = key
  play(sura, from, to)
}

/** A button leaving the screen: what it started stops. */
export function releaseKey(key: string, reciting: boolean) {
  if (now?.key === key) stopSpeaking()
  if (recitedBy === key) {
    recitedBy = null
    if (reciting) stopRecitation()
  }
}
