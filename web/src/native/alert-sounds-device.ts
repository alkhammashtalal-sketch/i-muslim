// The alerts' sounds on the phone (add-ons 0072-add18 §1, 0072-add20 §1): the native side of alert-sounds.ts, loaded
// only inside the iOS/Android app (device.ts imports it). The plugin «AlertSounds» is the app's own:
//   iOS: web/ios/App/App/AlertSoundsPlugin.swift (downloads into Library/Sounds of the App Group container, checks the
//        SHA-256 and the length, removes old editions);
//   Android: web/android/…/AlertSoundsPlugin.java (the same checks into the app's files, and one notification channel
//        per sound from the same file).
// The server is ours (the Worker's static /sounds/manifest.json). Any failure leaves the phone's own sound.
import { registerPlugin } from '@capacitor/core'
import { API_BASE } from '../api/base'
import { ALERT_TEXT } from './alert-strings'
import { CALM, EMPTY_MANIFEST, localName, MANIFEST_PATH, MAX_ALERT_SECONDS, offeredChoices, parseManifest, usable, type Ready, type SoundChoice, type SoundId, type SoundManifest } from './alert-sounds'
import { platform } from './platform'

type ChannelSpec = { key: string; name: string; file?: string; raw?: string }
type Plugin = {
  /** The verified files on the phone (slot id → file name) and, on Android, the channels made (`channel:<key>`). */
  status(): Promise<{ ready: Ready }>
  /** Download one file, check its SHA-256 and its length, keep it under `name`; removes older editions of `id`. */
  prepare(o: { id: string; url: string; sha256: string; name: string; maxSeconds: number }): Promise<{ ok: boolean; error?: string }>
  /** Android: one channel per sound (system, the calm tone in res/raw, or a downloaded file). */
  channels(o: { channels: ChannelSpec[] }): Promise<{ ready: Ready }>
}
const AlertSounds = registerPlugin<Plugin>('AlertSounds')

let memo: { at: number; m: SoundManifest } | null = null
/** The server's manifest, asked at most once an hour; an empty one when it cannot be reached or read. */
export async function serverManifest(now = Date.now()): Promise<SoundManifest> {
  if (memo && now - memo.at < 3600_000) return memo.m
  const m = await fetch(API_BASE + MANIFEST_PATH, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then(parseManifest, () => EMPTY_MANIFEST)
  memo = { at: now, m }
  return m
}

const os = () => {
  const p = platform()
  return p === 'web' ? null : p
}

/** The choices to show in the settings on this phone (the adhan only once the server offers it approved). */
export async function soundChoices(): Promise<SoundChoice[]> {
  const p = os()
  return p ? offeredChoices(await serverManifest(), p) : []
}

/** Make sure what `choice` needs is on the phone, and say what is ready (soundFor reads it). Never throws. */
export async function prepareSounds(choice: SoundChoice, lang: string): Promise<Ready> {
  const p = os()
  if (!p) return {}
  let ready: Ready = {}
  try {
    ready = (await AlertSounds.status()).ready
  } catch {
    return {}
  }
  if (choice === 'adhan') {
    const m = await serverManifest()
    for (const id of ['adhan-short', 'adhan-fajr-short'] as SoundId[]) {
      const e = usable(m, id, p)
      const f = e?.files[p]
      if (!f) continue
      const name = localName(id, f)
      if (ready[id] === name) continue
      const r = await AlertSounds.prepare({ id, url: API_BASE + f.path, sha256: f.sha256, name, maxSeconds: MAX_ALERT_SECONDS }).catch(() => ({ ok: false }))
      if (r.ok) ready = { ...ready, [id]: name }
      else delete ready[id]
    }
  }
  if (p === 'android') {
    const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
    const specs: ChannelSpec[] = [
      { key: 'system', name: t.channelSystem },
      { key: 'calm', name: t.channelCalm, raw: CALM.android },
      ...(['adhan-short', 'adhan-fajr-short'] as const).filter((id) => ready[id]).map((id) => ({ key: id, name: id === 'adhan-fajr-short' ? t.channelAdhanFajr : t.channelAdhan, file: ready[id] })),
    ]
    ready = { ...ready, ...(await AlertSounds.channels({ channels: specs }).then((r) => r.ready, () => ({}))) }
  }
  return ready
}
