// Reading replies aloud in the Android app (reply 0067): Android's web view has no speechSynthesis, so this gives it one
// over Android's own text-to-speech engine (@capacitor-community/text-to-speech, Android only: capacitor.config.ts
// keeps it out of the iPhone app). The voice conversation then runs as it does on the iPhone (voice/speaker.ts, the
// parts of trust/speakable.ts, no automatic recitation of the Quran: nothing about what is read changes here).
//   - only voices on the phone itself: no network needed and their data installed (the app's AndroidVoices plugin,
//     VoicesPlugin.java), each spoken by its own name, so the text never goes to an engine's servers, as the iPhone
//     reads on the device (CLAUDE.md §11: no server). Google's engine says «supported» for languages it would speak
//     online (Urdu on the emulator, which then fails with no network);
//   - a language without one has no voice here, so its parts are not read and the app says how to install one
//     (strings.ts voiceMissing): never another language's voice;
//   - one utterance at a time, as speaker.ts speaks; cancel() ends it with the «interrupted» error a browser gives.
// Installed once by native/boot.ts in the Android app; the iPhone and the browser keep their own speechSynthesis.
import { registerPlugin } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { isAndroid } from '../platform'

/** The tags of the app's languages, as speaker.ts PREFERRED (a voice of the language when the region differs). */
const TAGS: [string, string][] = [
  ['ar', 'ar-SA'],
  ['en', 'en-US'],
  ['ur', 'ur-PK'],
  ['id', 'id-ID'],
  ['ms', 'ms-MY'],
  ['tr', 'tr-TR'],
  ['fr', 'fr-FR'],
  ['es', 'es-ES'],
  ['bn', 'bn-BD'],
  ['hi', 'hi-IN'],
]

type Voice = { name: string; lang: string; voiceURI: string; localService: boolean; default: boolean; index: number }
/** The engine's calls used here (the plugin; a test gives its own). */
type Engine = Pick<typeof TextToSpeech, 'getSupportedVoices' | 'speak' | 'stop'>
type OnPhone = { installed(): Promise<{ voices: { name: string; lang: string }[] }> }
const AndroidVoices = registerPlugin<OnPhone>('AndroidVoices')
type Handler = ((e: { error?: string; utterance?: Utterance }) => void) | null

class Utterance extends EventTarget {
  text: string
  lang = ''
  voice: Voice | null = null
  volume = 1
  rate = 1
  pitch = 1
  onstart: Handler = null
  onend: Handler = null
  onerror: Handler = null
  constructor(text = '') {
    super()
    this.text = text
  }
}

/** For each language, a voice on the phone: its region's first, else any of the language; with its place in the
 *  plugin's list (speak's `voice`, the list sorted by name). Asked again a few times while the engine starts. */
async function phoneVoices(tts: Engine, phone: OnPhone): Promise<Voice[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const all = await tts.getSupportedVoices().then((r) => r.voices, () => [])
    const here = await phone.installed().then((r) => r.voices, () => [])
    const found: Voice[] = []
    for (const [lang, tag] of TAGS) {
      const own = (v: { lang: string }) => v.lang.toLowerCase().split('-')[0] === lang
      const v = here.find((x) => x.lang.toLowerCase() === tag.toLowerCase()) ?? here.find(own)
      const index = v ? all.findIndex((x) => x.voiceURI === v.name) : -1
      if (v && index >= 0) found.push({ name: v.name, lang: v.lang, voiceURI: v.name, localService: true, default: lang === 'ar', index })
    }
    if (found.length || all.length) return found
    await new Promise((r) => setTimeout(r, 800))
  }
  return []
}

let ready: Promise<Voice[]> | null = null

let installed = false
/** Puts speechSynthesis on the window (over one an older or newer web view might expose without Android's voices). */
export function installAndroidSpeech(tts: Engine = TextToSpeech, phone: OnPhone = AndroidVoices) {
  if (!isAndroid() || typeof window === 'undefined' || installed) return
  installed = true
  let voices: Voice[] = []
  let current: Utterance | null = null
  let gen = 0
  const events = new EventTarget()
  const fire = (u: Utterance, type: 'start' | 'end' | 'error', error?: string) => {
    const e = { error, utterance: u }
    const h = type === 'start' ? u.onstart : type === 'end' ? u.onend : u.onerror
    h?.call(u, e)
    u.dispatchEvent(Object.assign(new Event(type), e))
  }
  const synth = {
    get speaking() {
      return current !== null
    },
    pending: false,
    paused: false,
    onvoiceschanged: null as ((e: Event) => void) | null,
    getVoices: () => voices.slice(),
    speak(u: Utterance) {
      const my = ++gen
      current = u
      // A voice of the phone only: a line with none is not read (never sent to the engine to speak online).
      const v = u.voice ?? voices.find((x) => x.lang.toLowerCase().split('-')[0] === (u.lang || 'ar').toLowerCase().split('-')[0]) ?? null
      if (!v) {
        current = null
        fire(u, 'error', 'language-unavailable')
        return
      }
      fire(u, 'start')
      tts.speak({ text: u.text, lang: v.lang, voice: v.index, rate: u.rate, pitch: u.pitch, volume: u.volume }).then(
        () => {
          if (my !== gen) return
          current = null
          fire(u, 'end')
        },
        () => {
          if (my !== gen) return
          current = null
          fire(u, 'error', 'synthesis-failed')
        },
      )
    },
    cancel() {
      gen++
      const u = current
      current = null
      void tts.stop().catch(() => undefined)
      if (u) fire(u, 'error', 'interrupted')
    },
    pause() {},
    resume() {},
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
  ready = phoneVoices(tts, phone)
  void ready.then((v) => {
    voices = v
    const e = new Event('voiceschanged')
    synth.onvoiceschanged?.(e)
    events.dispatchEvent(e)
  })
}

/** Whether the phone has a voice for the language (after the engine has answered; false outside the Android app). */
export async function hasAndroidVoice(lang: string): Promise<boolean> {
  const v = ready ? await ready : []
  return v.some((x) => x.lang.toLowerCase().split('-')[0] === lang)
}

/** The engine's own screen for installing voices (Google's «install voice data»), else Android's text-to-speech
 *  settings. AppLauncher starts an action given as its url (an intent the system resolves, no package named). */
export async function openVoiceInstall() {
  const { AppLauncher } = await import('@capacitor/app-launcher')
  const open = (url: string) => AppLauncher.openUrl({ url }).then((r) => r.completed, () => false)
  if (!(await open('android.speech.tts.engine.INSTALL_TTS_DATA'))) await open('com.android.settings.TTS_SETTINGS')
}
