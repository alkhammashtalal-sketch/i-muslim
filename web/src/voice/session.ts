import flag from '../config/voice-mode.json'
import { primeSpeech } from './speaker'

// The full-screen voice mode (command 18) is hidden: it exists only when web/src/config/voice-mode.json says
// enabled, or the link carries ?voicemode=1 (kept by in-app navigation).
export const voiceModeEnabled = () => flag.enabled || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('voicemode') === '1')

export type VoiceSession = { ctx: AudioContext | null; stream: Promise<MediaStream> }

const AUDIO: MediaTrackConstraints = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
export const getMic = () => navigator.mediaDevices.getUserMedia({ audio: AUDIO })

/** Everything iOS allows only inside a press, done in the press that opens the mode: the microphone, an audio
 *  context for the level meter, and a silent utterance that unlocks speech. */
export function openSession(): VoiceSession {
  primeSpeech()
  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    void ctx.resume()
  } catch {
    // no Web Audio: the mode says it cannot listen
  }
  const stream = typeof navigator.mediaDevices?.getUserMedia === 'function' ? getMic() : Promise.reject(new DOMException('no microphone API', 'NotSupportedError'))
  stream.catch(() => undefined) // reported by VoiceMode
  return { ctx, stream }
}

/** Safari 17+ (navigator.audioSession): recording while listening, playback while reading, so a reply is not sent to
 *  the earpiece. Elsewhere nothing happens. */
export function setAudioSession(type: 'play-and-record' | 'playback' | 'auto') {
  const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
  if (!s) return
  try {
    s.type = type
  } catch {
    // not settable here
  }
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
