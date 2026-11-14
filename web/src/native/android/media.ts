// The recitation on Android's lock screen (reply 0067): Android's web view does not hand the page's Media Session to
// the system, so the app's own RecitationMedia plugin (web/android …/media/RecitationMediaPlugin.java) keeps a media
// session and a media playback service in the foreground while a recitation plays or is paused: the sura and ayah,
// the reciter's line, and play, pause, next and stop on the lock screen, in the notifications and from headphones.
// The names are the iPhone's (quran/media-session.ts nowPlayingTitle and nowPlayingArtist); only names and numbers,
// never the ayah's text. «التالي» is the next ayah of the range (stepAyah), as the reader's own button.
// The player passes by «idle» between suras and between ayat stepped to (recitation.ts ended, stepAyah): the session
// ends only after a few quiet seconds, so Android never has to start the service again from the background.
import { registerPlugin } from '@capacitor/core'
import { getSuras } from '../../quran/api'
import { nowPlayingArtist, nowPlayingTitle } from '../../quran/media-session'
import { getRecitation, getReciter, onRecitation, pause, resume, SHOW_RECITER_NAME, stepAyah, stop } from '../../quran/recitation'
import { isAndroid } from '../platform'

type Action = 'play' | 'pause' | 'next' | 'stop'
type Plugin = {
  update(o: { state: 'playing' | 'paused' | 'none'; title?: string; artist?: string; album?: string }): Promise<void>
  addListener(event: 'action', f: (e: { action: Action }) => void): Promise<{ remove: () => Promise<void> }>
}
const RecitationMedia = registerPlugin<Plugin>('RecitationMedia')

/** How long the player may stay idle before the session ends (a sura's end and the next one's start take less). */
export const IDLE_END_MS = 6000

let installed = false
export function installAndroidMedia(lang: () => string, plugin: Pick<Plugin, 'update' | 'addListener'> = RecitationMedia) {
  if (!isAndroid() || installed) return
  installed = true
  let names: Map<number, string> | null = null
  let asked = false
  let sent = ''
  let ending = 0
  const send = (o: Parameters<Plugin['update']>[0]) => {
    const key = JSON.stringify(o)
    if (key === sent) return
    sent = key
    void plugin.update(o).catch(() => undefined)
  }
  const update = () => {
    const s = getRecitation()
    if (s.status === 'idle' || s.status === 'error') {
      if (!sent || ending) return
      ending = window.setTimeout(() => {
        ending = 0
        const now = getRecitation()
        if (now.status === 'idle' || now.status === 'error') send({ state: 'none' })
      }, IDLE_END_MS)
      return
    }
    window.clearTimeout(ending)
    ending = 0
    if (!asked) {
      asked = true
      getSuras().then(
        (list) => {
          names = new Map(list.map((x) => [x.n, x.name]))
          update()
        },
        () => undefined,
      )
    }
    const l = lang()
    send({
      state: s.status === 'paused' ? 'paused' : 'playing',
      title: nowPlayingTitle(s.sura, s.aya, l, names),
      artist: nowPlayingArtist(l, getReciter(), SHOW_RECITER_NAME),
      album: l === 'ar' ? 'مسلم' : 'Muslim',
    })
  }
  onRecitation(update)
  void plugin.addListener('action', ({ action }) => {
    if (action === 'play') resume()
    else if (action === 'pause') pause()
    else if (action === 'next') stepAyah(1)
    else if (action === 'stop') {
      stop()
      send({ state: 'none' })
    }
  })
}
