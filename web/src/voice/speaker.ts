import type { Lang } from '../../../shared/api'
import type { Speech } from '../trust/speakable'
import { stop as stopRecitation } from '../quran/recitation'

// Reads the parts built by trust/speakable.ts with the device's own voices (speechSynthesis): no server, nothing
// leaves the device. A part whose language has no voice on this device is skipped; ayah and quotation parts are
// fixed lines in place of the text. `onAyah` stays unwired: voice conversation never starts a recitation (command 17).

const PREFERRED: Record<Lang, string[]> = {
  ar: ['ar-SA', 'ar'],
  en: ['en-US', 'en-GB', 'en'],
  ur: ['ur-PK', 'ur'],
  id: ['id-ID', 'id'],
  ms: ['ms-MY', 'ms'],
  tr: ['tr-TR', 'tr'],
  fr: ['fr-FR', 'fr'],
  es: ['es-ES', 'es'],
  bn: ['bn-BD', 'bn-IN', 'bn'],
  hi: ['hi-IN', 'hi'],
}

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

/** iOS only lets a page speak after it has spoken inside a tap: call this from the tap that starts a conversation. */
export function primeSpeech() {
  if (!speechSupported()) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    speechSynthesis.speak(u)
  } catch {
    // nothing to unlock
  }
}

/** The device voices; some browsers fill the list a moment after load. */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done)
      window.clearTimeout(timer)
      resolve(speechSynthesis.getVoices())
    }
    const timer = window.setTimeout(done, timeoutMs)
    speechSynthesis.addEventListener('voiceschanged', done)
  })
}

const tag = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()

/** A voice for the language: a preferred regional voice, then any voice of that language; on-device first. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | null {
  const ordered = [...voices].sort((a, b) => Number(b.localService) - Number(a.localService))
  for (const want of PREFERRED[lang].map((x) => x.toLowerCase())) {
    const hit = ordered.find((v) => (want.includes('-') ? tag(v) === want : tag(v) === want || tag(v).startsWith(`${want}-`)))
    if (hit) return hit
  }
  return null
}

/** Short pieces at sentence ends (then commas, then spaces): long utterances stop early on iOS and in Chrome. */
export function chunk(text: string, max = 160): string[] {
  const out: string[] = []
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?؟۔।\n]+[.!?؟۔।]*\s*/g) ?? []
  for (const s0 of sentences) {
    let s = s0.trim()
    while (s.length > max) {
      const head = s.slice(0, max)
      const cut = Math.max(head.lastIndexOf('،'), head.lastIndexOf(','), head.lastIndexOf('؛'), head.lastIndexOf(';'))
      const at = cut > max / 3 ? cut + 1 : head.lastIndexOf(' ') > 0 ? head.lastIndexOf(' ') : max
      out.push(s.slice(0, at).trim())
      s = s.slice(at).trim()
    }
    if (s) out.push(s)
  }
  return out.filter((x) => /[\p{L}\p{N}]/u.test(x))
}

export type Reading = { stop: () => void; done: Promise<'ended' | 'stopped'> }

/**
 * Speaks the parts in order, one short utterance at a time. Returns null when not one part has a voice on this
 * device (the caller says so on screen).
 */
export function speak(
  parts: Speech[],
  voices: SpeechSynthesisVoice[],
  opts: { onAyah?: (part: Extract<Speech, { kind: 'ayah' }>) => Promise<void> } = {},
): Reading | null {
  type Step = { text: string; voice: SpeechSynthesisVoice } | { ayah: Extract<Speech, { kind: 'ayah' }> }
  const steps: Step[] = []
  for (const p of parts) {
    if (p.kind === 'ayah' && opts.onAyah) {
      steps.push({ ayah: p })
      continue
    }
    const voice = pickVoice(voices, p.lang)
    if (voice) for (const text of chunk(p.text)) steps.push({ text, voice })
  }
  if (!steps.some((s) => 'text' in s)) return null

  let stopped = false
  let current: SpeechSynthesisUtterance | null = null // held so Chrome does not collect it before `end`
  let finish: (r: 'ended' | 'stopped') => void = () => {}
  const done = new Promise<'ended' | 'stopped'>((r) => (finish = r))
  const next = async (i: number) => {
    if (stopped) return
    if (i >= steps.length) return finish('ended')
    const step = steps[i]
    if ('ayah' in step) {
      await opts.onAyah?.(step.ayah).catch(() => {})
      return void next(i + 1)
    }
    const u = new SpeechSynthesisUtterance(step.text)
    u.voice = step.voice
    u.lang = step.voice.lang
    u.onend = () => void next(i + 1)
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? undefined : void next(i + 1))
    current = u
    speechSynthesis.speak(current)
  }
  speechSynthesis.cancel()
  // One voice at a time: a reply read aloud ends a human recitation, and a recitation pressed ends the reading.
  stopRecitation()
  const reading: Reading = {
    stop: () => {
      if (stopped) return
      stopped = true
      speechSynthesis.cancel()
      window.removeEventListener('recitation-start', reading.stop)
      finish('stopped')
    },
    done,
  }
  window.addEventListener('recitation-start', reading.stop)
  void done.then(() => window.removeEventListener('recitation-start', reading.stop))
  void next(0)
  return reading
}
