// The recitation on the lock screen (reply 0033 §ب3): the Media Session API names what is playing (the sura and the
// ayah being recited, the reciter, the app) and gives the lock screen and headphones play, pause and stop. In the iOS
// app, UIBackgroundModes «audio» (ios/App/App/Info.plist) lets the recording go on with the screen locked; in a
// browser that supports it, the same controls appear. Only names and numbers are shown: the ayah's text is never
// read or written here, and the voice is the reciter's recording (command 17).
import { STRINGS, isLang } from '../i18n'
import { getSuras } from './api'
import { getRecitation, getReciter, onRecitation, pause, reciterLabel, resume, stop } from './recitation'
import { arabicDigits, numFmt } from './format'

type Names = Map<number, string>

/** The lock screen's title: «سورة البقرة · ٢٥٥» in Arabic, «Surah 2 · 255» in the other interfaces. */
export function nowPlayingTitle(sura: number, aya: number, lang: string, names: Names | null): string {
  if (lang === 'ar') return `سورة ${names?.get(sura) ?? arabicDigits(sura)} · ${arabicDigits(aya)}`
  const num = numFmt(isLang(lang) ? lang : 'en')
  const t = STRINGS[isLang(lang) ? lang : 'en']
  return `${t.suraNum.replace('{n}', num(sura))} · ${num(aya)}`
}

let installed = false
/** Once, at start. `lang` reads the interface language at the time of each change. */
export function installMediaSession(lang: () => string) {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
  if (installed || !ms || typeof MediaMetadata === 'undefined') return
  installed = true
  let names: Names | null = null
  let asked = false
  let shown = ''
  const update = () => {
    const s = getRecitation()
    if (s.status === 'idle' || s.status === 'error') {
      ms.playbackState = 'none'
      if (shown) ms.metadata = null
      shown = ''
      return
    }
    // The suras' names, once, when something first plays (the reader has usually loaded them already).
    if (!asked) {
      asked = true
      getSuras().then(
        (list) => {
          names = new Map(list.map((x) => [x.n, x.name]))
          shown = ''
          update()
        },
        () => undefined,
      )
    }
    ms.playbackState = s.status === 'paused' ? 'paused' : 'playing'
    const l = lang()
    const title = nowPlayingTitle(s.sura, s.aya, l, names)
    const artist = reciterLabel(getReciter(), l)
    const key = `${title}|${artist}`
    if (key === shown) return
    shown = key
    ms.metadata = new MediaMetadata({
      title,
      artist,
      album: l === 'ar' ? 'مسلم' : 'Muslim',
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
  }
  onRecitation(update)
  const on = (action: MediaSessionAction, f: (() => void) | null) => {
    try {
      ms.setActionHandler(action, f)
    } catch {
      // an action this browser does not know
    }
  }
  on('play', () => resume())
  on('pause', () => pause())
  on('stop', () => stop())
  // No seeking or skipping from the lock screen: a range is recited as the reader chose it.
  for (const a of ['seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) on(a, null)
}
