// The alerts' sounds (add-ons 0072-add18 §1, 0072-add20 §1, 0072-add21 §3): what plays with a prayer bell, a portion
// reminder and an adhkar reminder in the iOS/Android app. Pure (no Capacitor): worker/test/alerts-0072.test.ts.
//
// Three choices for the prayer alert:
//   - «صوت النظام» (the default): the phone's own notification sound;
//   - «نغمة هادئة»: our own tone, made in code (web/scripts/make-calm-tone.py), shipped inside the app;
//   - «مطلع الأذان»: a slot. Its file comes from our server (/sounds/manifest.json, served by the Worker's static
//     assets) into Library/Sounds on the iPhone (UNNotificationSound looks there, in the App Group's Library/Sounds,
//     and in the bundle) or the app's files on Android (one notification channel per sound). It is offered only when
//     the server's manifest lists it with `approved: true`, which is written only after Talal has listened to it
//     (add-on 0072-add21 §3: «لا يُشغَّل خيار الأذان إلا بعد موافقته على السماع»).
// The spoken announcements («حان الآن موعد صلاة …», add-on 0072-add20 §2) are slots of the same kind: present here,
// hidden until their files are in the manifest and approved.
//
// Every file is checked before use: its SHA-256 against the manifest, and its length under 30 seconds (Apple:
// «Sound files must be less than 30 seconds in length. If the sound file is longer than 30 seconds, the system plays
// the default sound instead.»). Any failure, at any step, leaves the phone's own sound.
import { deviceStorage } from '../storage/device'

export type SoundChoice = 'system' | 'calm' | 'adhan'
export const SOUND_CHOICES: readonly SoundChoice[] = ['system', 'calm', 'adhan']

/** The recorded slots (add-on 0072-add20 §2). `alert`: may ring with a notification (under 30 s); `inApp`: listened to
 *  inside the app only (the full adhan), never a notification sound. */
export const SOUND_SLOTS = {
  'adhan-short': 'alert',
  'adhan-fajr-short': 'alert',
  'adhan-full': 'inApp',
  'adhan-fajr-full': 'inApp',
  // Each prayer's own full adhan, as the Doha recordings come (add-on 0072-add21 §4: «لكل صلاة أذانها»).
  'adhan-full-fajr': 'inApp',
  'adhan-full-dhuhr': 'inApp',
  'adhan-full-asr': 'inApp',
  'adhan-full-maghrib': 'inApp',
  'adhan-full-isha': 'inApp',
  'call-fajr': 'alert',
  'call-sunrise': 'alert',
  'call-dhuhr': 'alert',
  'call-asr': 'alert',
  'call-maghrib': 'alert',
  'call-isha': 'alert',
  'adhkar-morning': 'alert',
  'adhkar-evening': 'alert',
  ward: 'alert',
} as const
export type SoundSlot = keyof typeof SOUND_SLOTS
/** A slot's id with its language: «call-fajr» is Arabic, «call-fajr-en» English (add-on 0072-add20 §2), and the other
 *  eight languages' recorded announcements (§3) take their code the same way. */
export type SoundId = SoundSlot | `${SoundSlot}-${string}`

/** The longest alert file, in seconds: Apple's limit is «less than 30 seconds». */
export const MAX_ALERT_SECONDS = 30
/** The calm tone inside the app: web/ios/App/App/muslim-calm.caf, web/android/app/src/main/res/raw/muslim_calm.ogg. */
export const CALM = { ios: 'muslim-calm.caf', android: 'muslim_calm' } as const
/** The server's list of sounds: a static file of the Worker (web/public/sounds/manifest.json). */
export const MANIFEST_PATH = '/sounds/manifest.json'

export type SoundFile = { path: string; sha256: string; bytes: number; seconds: number }
export type SoundEntry = {
  id: SoundId
  /** Talal has listened and approved (add-on 0072-add21 §3). Without it the sound is never offered. */
  approved: boolean
  /** iOS: CAF/WAV/AIFF in Linear PCM, IMA4, µLaw or aLaw (UNNotificationSound's formats); Android: OGG or M4A. */
  files: { ios?: SoundFile; android?: SoundFile }
  /** Who recorded it and on what terms, as shown in «عن التطبيق» and licenses/. */
  credit: { source: string; url: string; license: string }
}
export type SoundManifest = { v: 1; sounds: SoundEntry[] }
export const EMPTY_MANIFEST: SoundManifest = { v: 1, sounds: [] }

const HEX64 = /^[0-9a-f]{64}$/
const IOS_EXT = /\.(caf|wav|aiff?)$/i
/** Listened to inside the app, never a notification sound: AAC is fine there. */
const IOS_IN_APP_EXT = /\.(caf|wav|aiff?|m4a)$/i
const ANDROID_EXT = /\.(ogg|m4a|wav)$/i
const isSlotId = (id: string) => Object.keys(SOUND_SLOTS).some((s) => id === s || (id.startsWith(`${s}-`) && /^[a-z]{2}$/.test(id.slice(s.length + 1))))
export const slotOf = (id: string): SoundSlot | null => (Object.keys(SOUND_SLOTS) as SoundSlot[]).sort((a, b) => b.length - a.length).find((s) => id === s || id.startsWith(`${s}-`)) ?? null

/** Why a file of the manifest is refused, or null when it may be used. */
export function fileProblem(f: unknown, os: 'ios' | 'android', alert: boolean): string | null {
  if (!f || typeof f !== 'object') return 'missing'
  const x = f as Partial<SoundFile>
  if (typeof x.path !== 'string' || !/^\/sounds\/[a-z0-9-]+\.[a-z0-9]+$/.test(x.path)) return 'path'
  if (!(os === 'ios' ? (alert ? IOS_EXT : IOS_IN_APP_EXT) : ANDROID_EXT).test(x.path)) return 'format'
  if (typeof x.sha256 !== 'string' || !HEX64.test(x.sha256)) return 'sha256'
  if (typeof x.bytes !== 'number' || !(x.bytes > 0) || x.bytes > 5_000_000) return 'bytes'
  if (typeof x.seconds !== 'number' || !(x.seconds > 0)) return 'seconds'
  if (alert && x.seconds >= MAX_ALERT_SECONDS) return 'too_long'
  return null
}

/** The manifest as the app may use it: anything malformed is dropped, never thrown (the phone's sound stays). */
export function parseManifest(raw: unknown): SoundManifest {
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1 || !Array.isArray((raw as { sounds?: unknown }).sounds)) return EMPTY_MANIFEST
  const sounds: SoundEntry[] = []
  for (const s of (raw as { sounds: unknown[] }).sounds) {
    if (!s || typeof s !== 'object') continue
    const e = s as Partial<SoundEntry>
    if (typeof e.id !== 'string' || !isSlotId(e.id) || typeof e.approved !== 'boolean' || !e.files || typeof e.files !== 'object') continue
    const c = e.credit as Partial<SoundEntry['credit']> | undefined
    if (!c || typeof c.source !== 'string' || typeof c.url !== 'string' || typeof c.license !== 'string') continue
    const alert = SOUND_SLOTS[slotOf(e.id)!] === 'alert'
    const files: SoundEntry['files'] = {}
    if (!fileProblem(e.files.ios, 'ios', alert)) files.ios = e.files.ios
    if (!fileProblem(e.files.android, 'android', alert)) files.android = e.files.android
    if (!files.ios && !files.android) continue
    sounds.push({ id: e.id as SoundId, approved: e.approved, files, credit: { source: c.source, url: c.url, license: c.license } })
  }
  return { v: 1, sounds }
}

/** The recordings' production record (relay/w1/0072-alerts/adhan/manifest.json: one row per file, with name, file,
 *  duration_s, bytes, sha256, source_page and license) as the server's manifest: each slot's files by system (CAF/WAV
 *  for the iPhone, OGG for Android, M4A for both inside the app). `approved` is Talal's word after listening
 *  (add-on 0072-add21 §3); until then it stays false and the app offers nothing. web/scripts/sounds-manifest.mjs. */
export function fromProductionRecord(raw: unknown, approved: boolean): SoundManifest {
  const rows = (raw as { files?: unknown[] } | null)?.files
  if (!Array.isArray(rows)) return EMPTY_MANIFEST
  const by = new Map<string, SoundEntry>()
  for (const r of rows as { name?: string; file?: string; duration_s?: number; bytes?: number; sha256?: string; source_page?: string; license?: { name?: string } }[]) {
    if (!r?.name || !r.file || !isSlotId(r.name)) continue
    const f: SoundFile = { path: `/sounds/${r.file}`, sha256: r.sha256 ?? '', bytes: r.bytes ?? 0, seconds: r.duration_s ?? 0 }
    const e = by.get(r.name) ?? { id: r.name as SoundId, approved, files: {}, credit: { source: 'Adhan Recordings from Doha, Qatar', url: r.source_page ?? '', license: r.license?.name ?? '' } }
    if (/\.(caf|wav|aiff?)$/i.test(r.file)) e.files.ios = f
    else if (/\.ogg$/i.test(r.file)) e.files.android = f
    else if (/\.m4a$/i.test(r.file)) {
      e.files.ios ??= f
      e.files.android ??= f
    }
    by.set(r.name, e)
  }
  return parseManifest({ v: 1, sounds: [...by.values()] })
}

/** The sound of a slot that may be offered on this phone: listed, approved, with a valid file for its system. */
export function usable(m: SoundManifest, id: SoundId, os: 'ios' | 'android'): SoundEntry | null {
  const e = m.sounds.find((s) => s.id === id)
  return e && e.approved && e.files[os] ? e : null
}

/** The choices the settings show: the system's and the calm tone always; the adhan only once its file is usable. */
export function offeredChoices(m: SoundManifest, os: 'ios' | 'android' | 'web'): SoundChoice[] {
  if (os === 'web') return []
  return SOUND_CHOICES.filter((c) => c !== 'adhan' || !!usable(m, 'adhan-short', os))
}

/** The file name a downloaded sound gets on the phone (Library/Sounds on iOS, files/sounds on Android). It carries
 *  the first 12 hex digits of its SHA-256, so a new edition never meets the old file under the same name. */
export const localName = (id: SoundId, f: SoundFile) => `muslim-${id}-${f.sha256.slice(0, 12)}${f.path.slice(f.path.lastIndexOf('.'))}`
/** Android's channel of a sound (one channel per sound: on Android 8+ the sound belongs to the channel). */
export const channelOf = (key: string, file?: string) => `alert-${key}${file ? `-${/-([0-9a-f]{12})\./.exec(file)?.[1] ?? ''}` : ''}`

/** What the native side has verified: a slot id → the local file name of its checked download; and on Android
 *  `channel:<key>` → the id of the channel it has made for that sound (system, calm, or a slot id). A downloaded
 *  sound's channel id carries its file's hash: Android keeps a channel's sound for good (a deleted channel comes back
 *  with its old settings), so a new edition gets a new channel. */
export type Ready = { [id: string]: string }
export type AlertSoundKind = 'prayer' | 'fajr' | 'sunrise' | 'ward' | 'adhkar'

/**
 * What one alert rings with, for the notification plugin:
 *   iOS: `sound` is a file name (the bundle's calm tone, or a verified file in Library/Sounds); the system's own sound
 *        is asked with a name no file has («default»), which UNNotificationSound answers with the default sound
 *        (without any `sound`, @capacitor/local-notifications 8 rings nothing on iOS);
 *   Android: `channelId` is the sound's channel, made by the app (AlertSoundsPlugin) from the same file, and only once
 *        it is made (a notification on a channel that does not exist is never shown); otherwise the plugin's own
 *        default channel, which rings the phone's sound.
 * The adhan is the prayers' only (never sunrise, the portion or the adhkar: «يُسمع عند دخول وقت الصلاة فقط»), and
 * plays only when its verified file is on the phone; otherwise the phone's sound.
 */
export function soundFor(kind: AlertSoundKind, choice: SoundChoice, os: 'ios' | 'android' | 'web', ready: Ready): { sound?: string; channelId?: string } {
  if (os === 'web') return {}
  const channel = (key: string) => (ready[`channel:${key}`] ? { channelId: ready[`channel:${key}`] } : null)
  const system = os === 'ios' ? { sound: 'default' } : (channel('system') ?? {})
  if (choice === 'calm') return os === 'ios' ? { sound: CALM.ios } : (channel('calm') ?? system)
  if (choice === 'adhan' && (kind === 'prayer' || kind === 'fajr')) {
    const id = kind === 'fajr' && ready['adhan-fajr-short'] ? 'adhan-fajr-short' : 'adhan-short'
    const file = ready[id]
    if (!file) return system
    return os === 'ios' ? { sound: file } : (channel(id) ?? system)
  }
  return system
}

// The saved choice, on the device only.
export type AlertSoundPrefs = { prayer: SoundChoice }
const KEY = 'muslim.alertSound.v1'
export function loadSoundPrefs(): AlertSoundPrefs {
  try {
    const v = JSON.parse(deviceStorage.getItem(KEY) ?? '{}') as Partial<AlertSoundPrefs>
    return { prayer: SOUND_CHOICES.includes(v.prayer as SoundChoice) ? (v.prayer as SoundChoice) : 'system' }
  } catch {
    return { prayer: 'system' }
  }
}
export function saveSoundPrefs(p: AlertSoundPrefs) {
  try {
    deviceStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}
