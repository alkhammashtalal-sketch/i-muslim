// A copy in the person's own iCloud, with no sign-in to us (add-on 0072-add34 §ب2), in the iPhone app only:
// NSUbiquitousKeyValueStore through the app's small CloudStore plugin (ios/App/App/CloudStorePlugin.swift). It brings
// the tasbih, the bookmarks and the portion, the settings and «طريق البداية» back on a new phone or after a reinstall.
// Android keeps its Auto Backup; the web keeps localStorage.
// - Only the keys of CLOUD_KEYS, and of «muslim.reading.v1» everything but the notes: Apple's documentation asks that
//   personal text not be kept there (it is stored unencrypted on disk); the notes stay on the device and in the backup
//   file. The place (a location), the «صليت» log, the alerts and the rest stay on the device.
// - Each value travels as {t, v}: t the time it was written on a device. The newest wins, key by key; the tasbih's
//   count takes the larger of the two.
// - An install that has never reached its iCloud copy (a new phone, a reinstall: the copy comes down a little after
//   launch) takes iCloud's values and sends nothing until it has; then, if something came, the app opens again once.
// - Apple's limits (1 MB, 1024 keys, a key of 128 characters): a value over 64 KB is kept on the device only, and once
//   the system reports the quota is full nothing more is sent this launch. No iCloud on the device (signed out, or
//   iCloud Drive off for the app): nothing happens, and nothing is said.
// Nothing reaches our server: iCloud is the person's own account, which we cannot read.
import { registerPlugin } from '@capacitor/core'
import { platform } from '../native/platform'
import { deviceStorage, onStorageWrite, STAMPS_KEY, type KeyValue } from './device'

/** The switch: on in the iPhone app (the iCloud key-value store entitlement in ios/App/App/App.entitlements). */
export const ICLOUD_SYNC = true

/** What is copied, and how two copies become one. */
export const CLOUD_KEYS = {
  'muslim.tasbih.v1': 'tasbih',
  'muslim.reading.v1': 'reading',
  'imuslim.settings.v1': 'newest',
  'muslim.welcome.v1': 'newest',
  'muslim.sources.v1': 'newest',
  'imuslim.reader.v1': 'newest',
  'imuslim.reciter.v1': 'newest',
  'imuslim.recitation.options.v1': 'newest',
  'muslim.shortcuts.order.v1': 'newest',
  'muslim.prayer.v1': 'newest',
  'muslim.hijri.offset.v1': 'newest',
  'imuslim.starter.v1': 'newest',
  'muslim.goals.v1': 'newest',
} as const satisfies Record<string, 'tasbih' | 'reading' | 'newest'>
export type CloudKey = keyof typeof CLOUD_KEYS
export const isCloudKey = (k: string): k is CloudKey => Object.hasOwn(CLOUD_KEYS, k)

/** A value larger than this stays on the device (Apple's quota is 1 MB for all values together). */
export const MAX_CLOUD_VALUE = 64 * 1024

/** One key in iCloud: the value (null: removed) and when it was written. */
export type Entry = { t: number; v: string | null }
/** This install's side: when each key was last written here, and whether it has reached its iCloud copy yet. */
export type Stamps = { keys: Record<string, number>; contact: boolean; emptyAt?: number }

export const readStamps = (raw: string | null): Stamps => {
  try {
    const o = JSON.parse(raw ?? 'null') as Partial<Stamps> | null
    if (!o || typeof o !== 'object') return { keys: {}, contact: false }
    const keys: Record<string, number> = {}
    for (const [k, t] of Object.entries(o.keys ?? {})) if (typeof t === 'number' && Number.isFinite(t)) keys[k] = t
    return { keys, contact: o.contact === true, ...(typeof o.emptyAt === 'number' ? { emptyAt: o.emptyAt } : {}) }
  } catch {
    return { keys: {}, contact: false }
  }
}

export const parseEntry = (raw: unknown): Entry | null => {
  if (typeof raw !== 'string') return null
  try {
    const o = JSON.parse(raw) as Partial<Entry>
    if (!o || typeof o.t !== 'number' || !Number.isFinite(o.t)) return null
    if (o.v !== null && typeof o.v !== 'string') return null
    return { t: o.t, v: o.v ?? null }
  } catch {
    return null
  }
}

const json = (s: string | null): Record<string, unknown> | null => {
  try {
    const o = JSON.parse(s ?? 'null') as unknown
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** What goes to iCloud for a key: the reading data without its notes; the rest as it is. */
export function toCloud(key: CloudKey, value: string | null): string | null {
  if (value === null || CLOUD_KEYS[key] !== 'reading') return value
  const o = json(value)
  if (!o) return value
  const { notes: _notes, ...rest } = o as Record<string, unknown> & { notes?: unknown }
  return JSON.stringify(rest)
}

/** The value kept here when iCloud's is taken: the reading data keeps this device's notes. */
export function fromCloud(key: CloudKey, cloud: string | null, local: string | null): string | null {
  if (cloud === null || CLOUD_KEYS[key] !== 'reading') return cloud
  const c = json(cloud)
  const l = json(local)
  if (!c) return cloud
  return JSON.stringify({ ...c, notes: Array.isArray(l?.notes) ? l.notes : [] })
}

/** The tasbih: the newer state, with the larger total; on the same day and step, the larger count too. */
function tasbih(newer: string | null, older: string | null): string | null {
  const a = json(newer)
  const b = json(older)
  if (!a || !b) return newer ?? older
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
  const out: Record<string, unknown> = { ...a, total: Math.max(num(a.total), num(b.total)) }
  if (a.day === b.day && num(a.step) === num(b.step)) out.n = Math.max(num(a.n), num(b.n))
  return JSON.stringify(out)
}

export type Decision = { keep: 'local' | 'cloud' | 'both'; value: string | null; t: number }

/** One key: `local` this device's value and stamp (0: never written here), `cloud` iCloud's entry or null; `contact`
 *  false on an install that has not reached its copy yet, where iCloud's values win. */
export function decide(key: CloudKey, local: { v: string | null; t: number }, cloud: Entry | null, contact: boolean): Decision {
  if (!cloud) return { keep: 'local', value: local.v, t: local.t }
  const cloudWins = !contact || cloud.t > local.t
  if (CLOUD_KEYS[key] === 'tasbih' && local.v !== null && cloud.v !== null) {
    const value = cloudWins ? tasbih(cloud.v, local.v) : tasbih(local.v, cloud.v)
    return { keep: 'both', value, t: Math.max(local.t, cloud.t) }
  }
  if (cloudWins) return { keep: 'cloud', value: fromCloud(key, cloud.v, local.v), t: cloud.t }
  return { keep: 'local', value: local.v, t: local.t }
}

/** The plugin (ios/App/App/CloudStorePlugin.swift). */
export type CloudApi = {
  available(): Promise<{ available: boolean }>
  getAll(): Promise<{ values: Record<string, unknown> }>
  set(o: { key: string; value: string }): Promise<{ ok: boolean }>
  addListener(event: 'change', f: (e: { reason: 'server' | 'initial' | 'quota' | 'account' | 'unknown'; keys: string[] }) => void): Promise<{ remove: () => Promise<void> }>
}

export type SyncResult = { adopted: string[]; sent: string[]; contact: boolean }

/** One merge of every cloud key, between the storage and iCloud. Adopted values are written without new stamps. */
export async function mergeOnce(deps: { storage: KeyValue; cloud: CloudApi; setApplying: (on: boolean) => void; now?: () => number }): Promise<SyncResult> {
  const { storage, cloud } = deps
  const now = deps.now ?? Date.now
  const stamps = readStamps(storage.getItem(STAMPS_KEY))
  const values = (await cloud.getAll()).values ?? {}
  const entries = new Map<string, Entry>()
  for (const k of Object.keys(CLOUD_KEYS)) {
    const e = parseEntry(values[k])
    if (e) entries.set(k, e)
  }
  // The first contact: iCloud has something, or it was already empty on an earlier launch of this install.
  const contactBefore = stamps.contact
  const contact = contactBefore || entries.size > 0 || (stamps.emptyAt !== undefined && stamps.emptyAt < now() - 60_000)
  const adopted: string[] = []
  const sent: string[] = []
  deps.setApplying(true)
  try {
    for (const key of Object.keys(CLOUD_KEYS) as CloudKey[]) {
      const lv = storage.getItem(key)
      const d = decide(key, { v: lv, t: stamps.keys[key] ?? 0 }, entries.get(key) ?? null, contactBefore)
      if (d.keep !== 'local' && d.value !== lv) {
        if (d.value === null) storage.removeItem(key)
        else storage.setItem(key, d.value)
        adopted.push(key)
      }
      stamps.keys[key] = d.t
      const out = toCloud(key, d.value)
      const there = entries.get(key)
      const differs = !there || there.t !== d.t || there.v !== out
      if (contact && differs && (out === null || out.length <= MAX_CLOUD_VALUE) && (d.t > 0 || out !== null)) {
        // A value never written since this install began stamping goes as the oldest (t 1): any stamped one wins.
        const r = await cloud.set({ key, value: JSON.stringify({ t: d.t || 1, v: out }) })
        if (r.ok) sent.push(key)
      }
    }
    stamps.contact = contact
    if (!contact && entries.size === 0) stamps.emptyAt ??= now()
    storage.setItem(STAMPS_KEY, JSON.stringify(stamps))
  } finally {
    deps.setApplying(false)
  }
  return { adopted, sent, contact }
}

/** After the storage is loaded, before the first render (main-native.tsx): merge, then keep iCloud current. */
export async function startCloud(opts?: {
  cloud?: CloudApi
  storage?: KeyValue
  onWrite?: (f: (key: string) => void) => unknown
  reload?: () => void
  timeoutMs?: number
  ios?: boolean
}): Promise<SyncResult | null> {
  if (!ICLOUD_SYNC || !(opts?.ios ?? platform() === 'ios')) return null
  const cloud = opts?.cloud ?? registerPlugin<CloudApi>('CloudStore')
  const storage = opts?.storage ?? deviceStorage
  const reload = opts?.reload ?? (() => location.reload())
  let applying = false
  let full = false
  const setApplying = (on: boolean) => void (applying = on)
  const deadline = <T,>(p: Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('iCloud: no answer')), opts?.timeoutMs ?? 1500)
      p.then(
        (v) => (clearTimeout(t), resolve(v)),
        (e) => (clearTimeout(t), reject(e)),
      )
    })
  let first: SyncResult | null = null
  try {
    if (!(await deadline(cloud.available())).available) return null
    first = await deadline(mergeOnce({ storage, cloud, setApplying }))
  } catch {
    return null
  }

  // Each later write of a cloud key: stamped now, and sent a moment later (several writes in a row go once).
  const pending = new Set<CloudKey>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const send = async () => {
    timer = null
    const stamps = readStamps(storage.getItem(STAMPS_KEY))
    if (!stamps.contact || full) return pending.clear()
    for (const key of [...pending]) {
      pending.delete(key)
      const out = toCloud(key, storage.getItem(key))
      if (out !== null && out.length > MAX_CLOUD_VALUE) continue
      await cloud.set({ key, value: JSON.stringify({ t: stamps.keys[key] ?? Date.now(), v: out }) }).catch(() => undefined)
    }
  }
  const onWrite = opts?.onWrite ?? onStorageWrite
  onWrite((key) => {
    if (applying || !isCloudKey(key)) return
    const stamps = readStamps(storage.getItem(STAMPS_KEY))
    stamps.keys[key] = Date.now()
    applying = true
    try {
      storage.setItem(STAMPS_KEY, JSON.stringify(stamps))
    } finally {
      applying = false
    }
    pending.add(key)
    timer ??= setTimeout(() => void send(), 1500)
  })

  // iCloud's copy reaching a new phone or a reinstall: merged once; if anything came, the app opens again with it.
  let reloaded = false
  void cloud
    .addListener('change', (e) => {
      if (e.reason === 'quota') full = true
      if (e.reason !== 'initial' && e.reason !== 'account') return
      void mergeOnce({ storage, cloud, setApplying })
        .then((r) => {
          if (r.adopted.length && !reloaded) {
            reloaded = true
            reload()
          }
        })
        .catch(() => undefined)
    })
    .catch(() => undefined)
  return first
}
