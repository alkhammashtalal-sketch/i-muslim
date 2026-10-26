// A copy in the person's own iCloud, with no sign-in to us (add-on 0072-add34 §ب2), in the iPhone app only:
// NSUbiquitousKeyValueStore through the app's small CloudStore plugin (ios/App/App/CloudStorePlugin.swift). It brings
// the tasbih, the bookmarks and the portion, the goals, the settings and «طريق البداية» back on a new phone or after a
// reinstall, and keeps two phones of one person together. Android keeps its Auto Backup; the web keeps localStorage.
//
// What is copied: the keys of CLOUD_KEYS; of «muslim.reading.v1» everything but the notes (Apple asks that personal
// text not be kept in the key-value store, which is stored unencrypted on disk): the notes stay on the device and in
// the backup file. The place, the «صليت» log, the alerts and the rest stay on the device.
//
// How two copies become one (the review of 25–26 October: nothing a phone holds may be replaced by another's):
// - Each key in iCloud is {v, c, t, d, x}: the value, a Lamport counter, the wall time, the device that wrote it, and
//   for the lists the items deleted (tombstones, kept 120 days). The counter decides which write is newer: every write
//   here counts one past the highest counter this phone has seen, so a phone whose clock is late does not always lose;
//   the time, then the device, only break a tie.
// - A value this phone held before it first stamped anything (1.0's data, or data from before iCloud was on) is never
//   replaced by iCloud's. The lists are merged instead of replaced: the bookmarks by sura and ayah, the goals by id
//   (their done days together), «طريق البداية» by step, the tasbih's total by the larger; the reading plan's progress
//   by the furthest when its length is the same, else the newer plan.
// - Before this install first reaches its iCloud copy (a new phone, a reinstall), what the app wrote by itself (the
//   default settings) gives way to iCloud's; the lists are still merged.
// - A deletion travels as a tombstone, so a phone that still has the item does not bring it back; an item added again
//   later is newer than its tombstone and stays.
// - A merge that has not finished when the first view is due (1.5 s) is dropped: nothing of it is written after the
//   screens have read their data. iCloud's copy reaching the phone later (a new phone: InitialSyncChange) is merged
//   then, and the app opens again once if anything came. A change from another phone while the app is open
//   (ServerChange) waits for the next launch's merge: the open screens hold their data in memory and would write it
//   back over what came.
// - Apple's limits (1 MB, 1024 keys, 128 characters for a key): a value over 64 KB stays on the device; once the system
//   reports the quota full nothing more is sent this launch. No iCloud on the device: nothing happens, nothing is said.
// Nothing reaches our server: iCloud is the person's own account, which we cannot read.
import { registerPlugin } from '@capacitor/core'
import { platform } from '../native/platform'
import { deviceStorage, onStorageWrite, STAMPS_KEY, storageStatus, type KeyValue } from './device'

/** The switch. It is two places, kept together by worker/test/icloud-0072.test.ts and switched by one command,
 *  `bash web/scripts/icloud-switch.sh off|on`: this constant and the key-value store entitlement in
 *  ios/App/App/App.entitlements (an archive refused for iCloud is fixed by `off`). */
export const ICLOUD_SYNC = true

export type Kind = 'newest' | 'reading' | 'goals' | 'starter' | 'tasbih'
/** What is copied, and how two copies become one. */
export const CLOUD_KEYS = {
  'muslim.tasbih.v1': 'tasbih',
  'muslim.reading.v1': 'reading',
  'muslim.goals.v1': 'goals',
  'imuslim.starter.v1': 'starter',
  'imuslim.settings.v1': 'newest',
  'muslim.welcome.v1': 'newest',
  'muslim.sources.v1': 'newest',
  'imuslim.reader.v1': 'newest',
  'imuslim.reciter.v1': 'newest',
  'imuslim.recitation.options.v1': 'newest',
  'muslim.shortcuts.order.v1': 'newest',
  'muslim.prayer.v1': 'newest',
  'muslim.hijri.offset.v1': 'newest',
} as const satisfies Record<string, Kind>
export type CloudKey = keyof typeof CLOUD_KEYS
export const isCloudKey = (k: string): k is CloudKey => Object.hasOwn(CLOUD_KEYS, k)

/** A value larger than this stays on the device (Apple's quota is 1 MB for all values together). */
export const MAX_CLOUD_VALUE = 64 * 1024
export const TOMBSTONE_DAYS = 120

/** Which write is newer: the counter, then the time, then the device. */
export type Version = { c: number; t: number; d: string }
export const newer = (a: Version, b: Version) => {
  // Counter 0 is a value held since before stamping, on either phone: neither replaces the other.
  if (a.c === 0 && b.c === 0) return false
  return a.c !== b.c ? a.c > b.c : a.t !== b.t ? a.t > b.t : a.d > b.d
}
/** A value held since before stamping (1.0's data, or from before iCloud was on). */
export const LEGACY: Version = { c: 0, t: 0, d: '' }
/** The same JSON whatever the order of its keys: two equal values compare equal. */
export function canon(v: string | null): string | null {
  if (v === null) return null
  try {
    const sort = (o: unknown): unknown =>
      Array.isArray(o) ? o.map(sort) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sort((o as Record<string, unknown>)[k])])) : o
    return JSON.stringify(sort(JSON.parse(v)))
  } catch {
    return v
  }
}
/** One key in iCloud. `x`: the deleted items' ids and when (for the lists). */
export type Entry = Version & { v: string | null; x?: Record<string, number> }
/** This phone's side. `keys`: the version of each key's last write here (none: held since before stamping). */
export type Stamps = {
  dev: string
  clock: number
  contact: boolean
  emptyAt?: number
  keys: Record<string, Version & { pre?: boolean }>
  x: Record<string, Record<string, number>>
}

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
const json = (s: string | null): Record<string, unknown> | null => {
  try {
    const o = JSON.parse(s ?? 'null') as unknown
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}
const jsonArr = (s: string | null): unknown[] | null => {
  try {
    const o = JSON.parse(s ?? 'null') as unknown
    return Array.isArray(o) ? o : null
  } catch {
    return null
  }
}
const isVersion = (o: unknown): o is Version => !!o && typeof o === 'object' && typeof (o as Version).c === 'number' && typeof (o as Version).t === 'number' && typeof (o as Version).d === 'string'
const cleanX = (o: unknown): Record<string, number> => {
  const out: Record<string, number> = {}
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}

export const readStamps = (raw: string | null, makeDev: () => string = () => Math.random().toString(36).slice(2, 10)): Stamps => {
  const o = json(raw) ?? {}
  const keys: Stamps['keys'] = {}
  for (const [k, v] of Object.entries((o.keys as Record<string, unknown>) ?? {})) if (isVersion(v)) keys[k] = { c: v.c, t: v.t, d: v.d, ...((v as { pre?: boolean }).pre ? { pre: true } : {}) }
  const x: Stamps['x'] = {}
  for (const [k, v] of Object.entries((o.x as Record<string, unknown>) ?? {})) x[k] = cleanX(v)
  return {
    dev: typeof o.dev === 'string' && o.dev ? o.dev : makeDev(),
    clock: num(o.clock),
    contact: o.contact === true,
    ...(typeof o.emptyAt === 'number' ? { emptyAt: o.emptyAt } : {}),
    keys,
    x,
  }
}

export const parseEntry = (raw: unknown): Entry | null => {
  if (typeof raw !== 'string') return null
  const o = json(raw)
  if (!o || !isVersion(o)) return null
  const r = o as Record<string, unknown>
  if (r.v !== null && typeof r.v !== 'string') return null
  return { c: r.c as number, t: r.t as number, d: r.d as string, v: (r.v as string | null) ?? null, x: cleanX(r.x) }
}

/** What goes to iCloud for a key: the reading data without its notes; the rest as it is. */
export function toCloud(key: CloudKey, value: string | null): string | null {
  if (value === null || CLOUD_KEYS[key] !== 'reading') return value
  const o = json(value)
  if (!o) return value
  const { notes: _notes, ...rest } = o as Record<string, unknown> & { notes?: unknown }
  return JSON.stringify(rest)
}

// ---- The lists' items and their ids -------------------------------------------------------------------------------
type Bookmark = { sura: number; aya: number; at?: string } & Record<string, unknown>
type Goal = { id: string; doneDays?: string[]; createdAt?: string } & Record<string, unknown>
const bmId = (b: Bookmark) => `${b.sura}:${b.aya}`
const ms = (iso: unknown) => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? t : 0
}

/** The ids of a value's list items (for tombstones): bookmarks by sura:aya, goals by id. */
export function itemIds(key: CloudKey, value: string | null): Map<string, number> {
  const out = new Map<string, number>()
  if (CLOUD_KEYS[key] === 'reading') {
    for (const b of ((json(value)?.bookmarks as Bookmark[]) ?? []).filter((b) => b && Number.isInteger(b.sura))) out.set(bmId(b), ms(b.at))
  } else if (CLOUD_KEYS[key] === 'goals') {
    for (const g of ((jsonArr(value) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')) out.set(g.id, ms(g.createdAt))
  }
  return out
}

/** Items removed between two values of a list key: new tombstones; items (re)added: tombstones lifted. */
export function tombstonesAfterWrite(key: CloudKey, before: string | null, after: string | null, x: Record<string, number>, now: number) {
  const a = itemIds(key, before)
  const b = itemIds(key, after)
  const out = { ...x }
  for (const id of a.keys()) if (!b.has(id)) out[id] = now
  for (const id of b.keys()) if (!a.has(id)) delete out[id]
  return prune(out, now)
}
const prune = (x: Record<string, number>, now: number) => {
  const out: Record<string, number> = {}
  for (const [k, t] of Object.entries(x)) if (t > now - TOMBSTONE_DAYS * 86_400_000) out[k] = t
  return out
}
const unionX = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a }
  for (const [k, t] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, t)
  return out
}
/** An item stays unless deleted after it was made. */
const alive = (x: Record<string, number>, id: string, made: number) => !(id in x) || made > x[id]

// ---- One key ------------------------------------------------------------------------------------------------------
export type Side = { v: string | null; ver: Version | null; pre?: boolean }
export type Merged = { v: string | null; x: Record<string, number>; take: boolean }

/** Two values of one key become one. `local.ver` null: held here since before stamping, and at the first contact it
 *  is never replaced (later it counts as the oldest write, LEGACY). `first`: this install has not reached its iCloud
 *  copy yet, so what it wrote by itself before (`pre`) gives way. */
export function mergeKey(key: CloudKey, local: Side, cloud: Entry, lx: Record<string, number>, first: boolean, now: number): Merged {
  const kind = CLOUD_KEYS[key]
  const x = prune(unionX(lx, cloud.x ?? {}), now)
  // Which side's whole value wins where nothing can be merged.
  const cloudWins = local.v === null || (first && local.pre === true) || (!(first && local.ver === null) && newer(cloud, local.ver ?? LEGACY))
  if (kind === 'newest') return { v: cloudWins ? cloud.v : local.v, x, take: cloudWins && canon(cloud.v) !== canon(local.v) }
  if (local.v === null) return { v: kind === 'reading' ? withNotes(cloud.v, null) : cloud.v, x, take: true }
  if (cloud.v === null) {
    // deleted elsewhere: a list's items go by their tombstones; the whole key only when the deletion is newer
    return cloudWins ? { v: null, x, take: true } : { v: local.v, x, take: false }
  }
  const [win, lose] = cloudWins ? [cloud.v, local.v] : [local.v, cloud.v]
  let v: string | null
  if (kind === 'tasbih') v = mergeTasbih(win, lose)
  else if (kind === 'starter') v = mergeStarter(win, lose)
  else if (kind === 'goals') v = mergeGoals(win, lose, x)
  else v = mergeReading(win, lose, x, local.v)
  return { v, x, take: canon(v) !== canon(local.v) }
}

const withNotes = (v: string | null, localValue: string | null): string | null => {
  const o = json(v)
  if (!o) return v
  const notes = json(localValue)?.notes
  return JSON.stringify({ ...o, notes: Array.isArray(notes) ? notes : [] })
}

function mergeTasbih(win: string, lose: string): string {
  const a = json(win)
  const b = json(lose)
  if (!a || !b) return win
  const out: Record<string, unknown> = { ...a, total: Math.max(num(a.total), num(b.total)) }
  if (a.day === b.day && num(a.step) === num(b.step)) out.n = Math.max(num(a.n), num(b.n))
  return JSON.stringify(out)
}

function mergeStarter(win: string, lose: string): string {
  const a = json(win) ?? {}
  const b = json(lose) ?? {}
  const u = (p: unknown, q: unknown) => [...new Set([...(Array.isArray(p) ? p : []), ...(Array.isArray(q) ? q : [])].filter((s) => typeof s === 'string'))]
  return JSON.stringify({ ...b, ...a, read: u(a.read, b.read), done: u(a.done, b.done) })
}

function mergeGoals(win: string, lose: string, x: Record<string, number>): string {
  const a = ((jsonArr(win) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')
  const b = ((jsonArr(lose) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')
  const byId = new Map<string, Goal>()
  for (const g of [...b, ...a]) {
    const had = byId.get(g.id)
    const days = [...new Set([...(had?.doneDays ?? []), ...(Array.isArray(g.doneDays) ? g.doneDays : [])])].sort()
    byId.set(g.id, { ...(had ?? {}), ...g, doneDays: days })
  }
  // One order on every phone: the newest goal first, then by id.
  const goals = [...byId.values()].filter((g) => alive(x, g.id, ms(g.createdAt)))
  goals.sort((p, q) => ms(q.createdAt) - ms(p.createdAt) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0))
  return JSON.stringify(goals)
}

function mergeReading(win: string, lose: string, x: Record<string, number>, localValue: string): string {
  const a = json(win) ?? {}
  const b = json(lose) ?? {}
  const bm = new Map<string, Bookmark>()
  for (const m of [...((b.bookmarks as Bookmark[]) ?? []), ...((a.bookmarks as Bookmark[]) ?? [])]) {
    if (!m || !Number.isInteger(m.sura) || !Number.isInteger(m.aya)) continue
    const had = bm.get(bmId(m))
    if (!had || ms(m.at) >= ms(had.at)) bm.set(bmId(m), m)
  }
  const bookmarks = [...bm.values()].filter((m) => alive(x, bmId(m), ms(m.at))).sort((p, q) => ms(q.at) - ms(p.at) || (bmId(p) < bmId(q) ? -1 : 1))
  // The portion: the same plan's furthest progress; another plan's length: the winning side's plan.
  const wa = (a.ward ?? {}) as Record<string, unknown>
  const wb = (b.ward ?? {}) as Record<string, unknown>
  const ward = wa.days === wb.days ? { ...wb, ...wa, done: Math.max(num(wa.done), num(wb.done)) } : { ...wa }
  const notes = json(localValue)?.notes
  return JSON.stringify({ ...b, ...a, bookmarks, ward, notes: Array.isArray(notes) ? notes : [] })
}

// ---- The plugin, the merge of all keys, the sending -----------------------------------------------------------------
/** The plugin (ios/App/App/CloudStorePlugin.swift). */
export type CloudApi = {
  available(): Promise<{ available: boolean }>
  getAll(): Promise<{ values: Record<string, unknown> }>
  set(o: { key: string; value: string }): Promise<{ ok: boolean }>
  addListener(event: 'change', f: (e: { reason: 'server' | 'initial' | 'quota' | 'account' | 'unknown'; keys: string[] }) => void): Promise<{ remove: () => Promise<void> }>
}

export type SyncResult = { adopted: string[]; sent: string[]; contact: boolean; dropped?: boolean }

/** One merge of every cloud key between the storage and iCloud. `stop()` true when the values come back: nothing is
 *  written or sent (the first view has read the storage). Adopted values are written without new stamps. */
export async function mergeOnce(deps: { storage: KeyValue; cloud: CloudApi; setApplying: (on: boolean) => void; now?: () => number; stop?: () => boolean }): Promise<SyncResult> {
  const { storage, cloud } = deps
  const now = deps.now ?? Date.now
  const values = (await cloud.getAll()).values ?? {}
  if (deps.stop?.()) return { adopted: [], sent: [], contact: false, dropped: true }
  const stamps = readStamps(storage.getItem(STAMPS_KEY))
  const entries = new Map<string, Entry>()
  for (const k of Object.keys(CLOUD_KEYS)) {
    const e = parseEntry(values[k])
    if (e) entries.set(k, e)
  }
  for (const e of entries.values()) stamps.clock = Math.max(stamps.clock, e.c)
  const first = !stamps.contact
  // The first contact: iCloud has something, or it was already empty on an earlier launch of this install.
  const contact = stamps.contact || entries.size > 0 || (stamps.emptyAt !== undefined && stamps.emptyAt < now() - 60_000)
  const adopted: string[] = []
  const sends: [CloudKey, Entry][] = []
  deps.setApplying(true)
  try {
    for (const key of Object.keys(CLOUD_KEYS) as CloudKey[]) {
      const lv = storage.getItem(key)
      const st = stamps.keys[key]
      const lx = stamps.x[key] ?? {}
      const there = entries.get(key) ?? null
      let v = lv
      let ver: Version | null = st ? { c: st.c, t: st.t, d: st.d } : null
      let x = prune(lx, now())
      if (there) {
        const m = mergeKey(key, { v: lv, ver, pre: st?.pre }, there, lx, first, now())
        x = m.x
        if (m.take) {
          if (m.v === null) storage.removeItem(key)
          else storage.setItem(key, m.v)
          adopted.push(key)
          v = m.v
        }
        const same = canon(toCloud(key, v)) === canon(there.v) && canon(JSON.stringify(x)) === canon(JSON.stringify(prune(there.x ?? {}, now())))
        // iCloud's value as it is, or this phone's own kept against it (recorded as seen, so it is not sent and only a
        // later write elsewhere replaces it): iCloud's version. A merged value that differs: a new write of this phone.
        if (same || (CLOUD_KEYS[key] === 'newest' && !m.take)) ver = { c: there.c, t: there.t, d: there.d }
        else ver = { c: ++stamps.clock, t: now(), d: stamps.dev }
      } else if (!ver && lv !== null && contact) ver = { ...LEGACY, d: stamps.dev }
      if (ver) stamps.keys[key] = { ...ver }
      else delete stamps.keys[key]
      stamps.x[key] = x
      const out = toCloud(key, v)
      if (!contact || (out === null && !there) || (out !== null && out.length > MAX_CLOUD_VALUE)) continue
      // A value held since before stamping goes with counter 0: any stamped write elsewhere is newer.
      const sendVer = ver ?? { ...LEGACY, d: stamps.dev }
      if (!there || (newer(sendVer, there) && canon(there.v) !== canon(out)) || (newer(sendVer, there) && canon(JSON.stringify(there.x ?? {})) !== canon(JSON.stringify(x))))
        sends.push([key, { ...sendVer, v: out, x }])
    }
    stamps.contact = contact
    if (!contact && entries.size === 0) stamps.emptyAt ??= now()
    storage.setItem(STAMPS_KEY, JSON.stringify(stamps))
  } finally {
    deps.setApplying(false)
  }
  const sent: string[] = []
  for (const [key, e] of sends) if ((await cloud.set({ key, value: JSON.stringify(e) })).ok) sent.push(key)
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
  /** The storage loaded from Preferences this launch; on a launch that runs on localStorage nothing is copied. */
  ready?: () => boolean
  now?: () => number
}): Promise<SyncResult | null> {
  if (!ICLOUD_SYNC || !(opts?.ios ?? platform() === 'ios')) return null
  // A launch on localStorage (Preferences failed) may be a blank one after the system reclaimed it: never copied.
  if (!(opts?.ready ?? (() => storageStatus().mode === 'prefs'))()) return null
  const cloud = opts?.cloud ?? registerPlugin<CloudApi>('CloudStore')
  const storage = opts?.storage ?? deviceStorage
  const reload = opts?.reload ?? (() => location.reload())
  const now = opts?.now ?? Date.now
  let applying = false
  let full = false
  const setApplying = (on: boolean) => void (applying = on)
  let late = false
  const deadline = <T,>(p: Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => {
        late = true
        reject(new Error('iCloud: no answer'))
      }, opts?.timeoutMs ?? 1500)
      p.then(
        (v) => (clearTimeout(t), resolve(v)),
        (e) => (clearTimeout(t), reject(e)),
      )
    })
  let first: SyncResult | null = null
  try {
    if (!(await deadline(cloud.available())).available) return null
    first = await deadline(mergeOnce({ storage, cloud, setApplying, now, stop: () => late }))
  } catch {
    // Too late for the first view: the merge is dropped (mergeOnce checks `late`); the listener below still merges
    // iCloud's copy when it comes down.
    first = null
  }

  // Each later write of a cloud key: one past the highest counter seen, its list's tombstones, sent a moment later.
  const seen = new Map<CloudKey, string | null>()
  for (const k of Object.keys(CLOUD_KEYS) as CloudKey[]) seen.set(k, storage.getItem(k))
  const pending = new Set<CloudKey>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const send = async () => {
    timer = null
    const stamps = readStamps(storage.getItem(STAMPS_KEY))
    if (!stamps.contact || full) return pending.clear()
    for (const key of [...pending]) {
      pending.delete(key)
      const out = toCloud(key, storage.getItem(key))
      const ver = stamps.keys[key]
      if (!ver || (out !== null && out.length > MAX_CLOUD_VALUE)) continue
      await cloud.set({ key, value: JSON.stringify({ c: ver.c, t: ver.t, d: ver.d, v: out, x: stamps.x[key] ?? {} }) }).catch(() => undefined)
    }
  }
  const onWrite = opts?.onWrite ?? onStorageWrite
  onWrite((key) => {
    if (applying || !isCloudKey(key)) {
      if (isCloudKey(key)) seen.set(key, storage.getItem(key))
      return
    }
    const stamps = readStamps(storage.getItem(STAMPS_KEY))
    const after = storage.getItem(key)
    const t = now()
    stamps.keys[key] = { c: ++stamps.clock, t, d: stamps.dev, ...(stamps.contact ? {} : { pre: true }) }
    stamps.x[key] = tombstonesAfterWrite(key, seen.get(key) ?? null, after, stamps.x[key] ?? {}, t)
    seen.set(key, after)
    applying = true
    try {
      storage.setItem(STAMPS_KEY, JSON.stringify(stamps))
    } finally {
      applying = false
    }
    pending.add(key)
    timer ??= setTimeout(() => void send(), 1500)
  })

  // iCloud's copy reaching a new phone or a reinstall (or another account): merged once; if anything came, the app
  // opens again with it. A change from another phone while the app is open waits for the next launch's merge.
  let reloaded = false
  void cloud
    .addListener('change', (e) => {
      if (e.reason === 'quota') full = true
      if (e.reason !== 'initial' && e.reason !== 'account') return
      void mergeOnce({ storage, cloud, setApplying, now })
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
