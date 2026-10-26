// A copy in the person's own iCloud, with no sign-in to us (add-on 0072-add34 §ب2), in the iPhone app only:
// NSUbiquitousKeyValueStore through the app's small CloudStore plugin (ios/App/App/CloudStorePlugin.swift). It brings
// the tasbih, the bookmarks and the portion, the goals, the settings and «طريق البداية» back on a new phone or after a
// reinstall, and keeps two phones of one person together. Android keeps its Auto Backup; the web keeps localStorage.
//
// What is copied: the keys of CLOUD_KEYS; of «muslim.reading.v1» everything but the notes (Apple asks that personal
// text not be kept in the key-value store, which is stored unencrypted on disk): the notes stay on the device and in
// the backup file. The place, the «صليت» log, the alerts and the rest stay on the device.
//
// How two copies become one (the reviews of 25–26 October: nothing a phone holds may be replaced by another's):
// - Each key in iCloud is {v, c, t, d, x, a}: the value, a Lamport counter, the wall time, the device that wrote it,
//   and for the lists the deleted items (tombstones: the counter of the deletion, and its time, kept 120 days) and the
//   counter at which each item was added. The counter decides: every write here counts one past the highest counter
//   this phone has seen, so a phone whose clock is wrong does not win or lose by its clock; the time, then the device,
//   only break a tie. An item stays unless deleted at a higher counter than it was added.
// - A write that does not change a value (the settings written again on every open) is no write: it is not stamped
//   and not sent.
// - A value this phone held before it first stamped anything (1.0's data, or data from before iCloud was on) is never
//   replaced by iCloud's at the first contact, and counts as the oldest write (0) after it; 0 never replaces 0. The lists
//   are merged instead of replaced: the bookmarks by sura and ayah, the goals by id (their done days together),
//   «طريق البداية» by step, the tasbih's total by the larger; the reading plan's progress by the furthest when its length
//   is the same, else the newer plan.
// - Before this install first reaches its iCloud copy (a new phone, a reinstall), what the app wrote by itself (the
//   default settings) gives way to iCloud's; the lists are still merged.
// - Another iCloud account on the device: a first contact again. What came from the previous account's iCloud (and
//   was never written on this phone) stays on the phone and is never sent to the new account.
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
const isList = (k: CloudKey) => CLOUD_KEYS[k] === 'reading' || CLOUD_KEYS[k] === 'goals'

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

/** A deleted item: the counter of the deletion (it decides) and its time (for keeping it 120 days only). */
export type Tomb = { c: number; t: number }
export type Tombs = Record<string, Tomb>
/** The counter at which each item of a list was added. */
export type Adds = Record<string, number>
/** One key in iCloud. */
export type Entry = Version & { v: string | null; x?: Tombs; a?: Adds }
/** This phone's side. `keys`: the version of each key's last write here (none: held since before stamping). `own`
 *  and `ownItems`: what this phone itself holds or wrote; `acct` and `acctItems`: what came from the current
 *  account's iCloud. Only these two are ever sent. */
export type Stamps = {
  dev: string
  clock: number
  init: boolean
  contact: boolean
  emptyAt?: number
  keys: Record<string, Version & { pre?: boolean }>
  x: Record<string, Tombs>
  a: Record<string, Adds>
  own: Record<string, boolean>
  /** Held when this phone first stamped (1.0's data): a write to it before the first contact is the person's. */
  held: Record<string, boolean>
  ownItems: Record<string, string[]>
  acct: Record<string, boolean>
  acctItems: Record<string, string[]>
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
const cleanTombs = (o: unknown): Tombs => {
  const out: Tombs = {}
  if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      const e = v as Partial<Tomb> | null
      if (e && typeof e.c === 'number' && typeof e.t === 'number') out[k] = { c: e.c, t: e.t }
    }
  return out
}
const cleanAdds = (o: unknown): Adds => {
  const out: Adds = {}
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}
const strs = (o: unknown) => (Array.isArray(o) ? o.filter((s): s is string => typeof s === 'string') : [])
const bools = (o: unknown) => {
  const out: Record<string, boolean> = {}
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (v === true) out[k] = true
  return out
}
const lists = (o: unknown) => {
  const out: Record<string, string[]> = {}
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) out[k] = strs(v)
  return out
}

export const readStamps = (raw: string | null, makeDev: () => string = () => Math.random().toString(36).slice(2, 10)): Stamps => {
  const o = json(raw) ?? {}
  const keys: Stamps['keys'] = {}
  for (const [k, v] of Object.entries((o.keys as Record<string, unknown>) ?? {})) if (isVersion(v)) keys[k] = { c: v.c, t: v.t, d: v.d, ...((v as { pre?: boolean }).pre ? { pre: true } : {}) }
  const x: Stamps['x'] = {}
  for (const [k, v] of Object.entries((o.x as Record<string, unknown>) ?? {})) x[k] = cleanTombs(v)
  const a: Stamps['a'] = {}
  for (const [k, v] of Object.entries((o.a as Record<string, unknown>) ?? {})) a[k] = cleanAdds(v)
  return {
    dev: typeof o.dev === 'string' && o.dev ? o.dev : makeDev(),
    clock: num(o.clock),
    init: o.init === true,
    contact: o.contact === true,
    ...(typeof o.emptyAt === 'number' ? { emptyAt: o.emptyAt } : {}),
    keys,
    x,
    a,
    own: bools(o.own),
    held: bools(o.held),
    ownItems: lists(o.ownItems),
    acct: bools(o.acct),
    acctItems: lists(o.acctItems),
  }
}

export const parseEntry = (raw: unknown): Entry | null => {
  if (typeof raw !== 'string') return null
  const o = json(raw)
  if (!o || !isVersion(o)) return null
  const r = o as Record<string, unknown>
  if (r.v !== null && typeof r.v !== 'string') return null
  return { c: r.c as number, t: r.t as number, d: r.d as string, v: (r.v as string | null) ?? null, x: cleanTombs(r.x), a: cleanAdds(r.a) }
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

/** The ids of a list key's items: bookmarks by sura:aya, goals by id. */
export function itemIds(key: CloudKey, value: string | null): Set<string> {
  const out = new Set<string>()
  if (CLOUD_KEYS[key] === 'reading') {
    for (const b of ((json(value)?.bookmarks as Bookmark[]) ?? []).filter((b) => b && Number.isInteger(b.sura) && Number.isInteger(b.aya))) out.add(bmId(b))
  } else if (CLOUD_KEYS[key] === 'goals') {
    for (const g of ((jsonArr(value) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')) out.add(g.id)
  }
  return out
}

/** A list write at counter `c`: removed items get a tombstone, added ones an add counter (and lose any tombstone). */
export function listWrite(key: CloudKey, before: string | null, after: string | null, x: Tombs, a: Adds, c: number, now: number) {
  const was = itemIds(key, before)
  const is = itemIds(key, after)
  const tombs = { ...x }
  const adds = { ...a }
  for (const id of was)
    if (!is.has(id)) {
      tombs[id] = { c, t: now }
      delete adds[id]
    }
  for (const id of is)
    if (!was.has(id)) {
      adds[id] = c
      delete tombs[id]
    }
  return { x: prune(tombs, now), a: adds, added: [...is].filter((id) => !was.has(id)) }
}
const prune = (x: Tombs, now: number) => {
  const out: Tombs = {}
  for (const [k, e] of Object.entries(x)) if (e.t > now - TOMBSTONE_DAYS * 86_400_000) out[k] = e
  return out
}
const unionTombs = (p: Tombs, q: Tombs) => {
  const out = { ...p }
  for (const [k, e] of Object.entries(q)) if (!out[k] || e.c > out[k].c) out[k] = e
  return out
}
const unionAdds = (p: Adds, q: Adds) => {
  const out = { ...p }
  for (const [k, c] of Object.entries(q)) out[k] = Math.max(out[k] ?? 0, c)
  return out
}
/** An item stays unless deleted at a higher counter than it was added. */
export const alive = (x: Tombs, a: Adds, id: string) => !x[id] || (a[id] ?? 0) > x[id].c

// ---- One key ------------------------------------------------------------------------------------------------------
export type Side = { v: string | null; ver: Version | null; pre?: boolean; x?: Tombs; a?: Adds }
export type Merged = { v: string | null; x: Tombs; a: Adds; take: boolean }

/** Two values of one key become one. `local.ver` null: held here since before stamping (it counts as the oldest
 *  write, LEGACY). `first`: this install has not reached its iCloud copy yet: only what it lacks, or what it wrote
 *  before on a key it did not hold (`pre`: a new install's defaults), gives way. */
export function mergeKey(key: CloudKey, local: Side, cloud: Entry, first: boolean, now: number): Merged {
  const kind = CLOUD_KEYS[key]
  const x = prune(unionTombs(local.x ?? {}, cloud.x ?? {}), now)
  const a = unionAdds(local.a ?? {}, cloud.a ?? {})
  // At the first contact iCloud takes only what this phone lacks, or what the app wrote by itself on a new install
  // before it (`pre`): a value this phone held, or the person changed, stays. After it, the newer write.
  const cloudWins = local.v === null || (first ? local.pre === true : newer(cloud, local.ver ?? LEGACY))
  if (kind === 'newest') return { v: cloudWins ? cloud.v : local.v, x, a, take: cloudWins && canon(cloud.v) !== canon(local.v) }
  if (local.v === null) {
    const v = kind === 'reading' ? withNotes(cloud.v, null) : cloud.v
    return { v, x, a, take: v !== null }
  }
  if (cloud.v === null) return cloudWins ? { v: null, x, a, take: true } : { v: local.v, x, a, take: false }
  const [win, lose] = cloudWins ? [cloud.v, local.v] : [local.v, cloud.v]
  let v: string
  if (kind === 'tasbih') v = mergeTasbih(win, lose)
  else if (kind === 'starter') v = mergeStarter(win, lose)
  else if (kind === 'goals') v = mergeGoals(win, lose, x, a)
  else v = mergeReading(win, lose, x, a, local.v)
  // the adds of items no longer there are not kept
  const present = itemIds(key, v)
  const keptA: Adds = {}
  for (const [id, c] of Object.entries(a)) if (present.has(id)) keptA[id] = c
  return { v, x, a: isList(key) ? keptA : a, take: canon(v) !== canon(local.v) }
}

const withNotes = (v: string | null, localValue: string | null): string | null => {
  const o = json(v)
  if (!o) return v
  const notes = json(localValue)?.notes
  return JSON.stringify({ ...o, notes: Array.isArray(notes) ? notes : [] })
}

function mergeTasbih(win: string, lose: string): string {
  const p = json(win)
  const q = json(lose)
  if (!p || !q) return win
  const out: Record<string, unknown> = { ...p, total: Math.max(num(p.total), num(q.total)) }
  if (p.day === q.day && num(p.step) === num(q.step)) out.n = Math.max(num(p.n), num(q.n))
  return JSON.stringify(out)
}

function mergeStarter(win: string, lose: string): string {
  const p = json(win) ?? {}
  const q = json(lose) ?? {}
  const u = (s: unknown, t: unknown) => [...new Set([...strs(s), ...strs(t)])]
  return JSON.stringify({ ...q, ...p, read: u(p.read, q.read), done: u(p.done, q.done) })
}

function mergeGoals(win: string, lose: string, x: Tombs, a: Adds): string {
  const p = ((jsonArr(win) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')
  const q = ((jsonArr(lose) as Goal[]) ?? []).filter((g) => g && typeof g.id === 'string')
  const byId = new Map<string, Goal>()
  for (const g of [...q, ...p]) {
    const had = byId.get(g.id)
    const days = [...new Set([...(had?.doneDays ?? []), ...(Array.isArray(g.doneDays) ? g.doneDays : [])])].sort()
    byId.set(g.id, { ...(had ?? {}), ...g, doneDays: days })
  }
  // One order on every phone: the newest goal first, then by id.
  const goals = [...byId.values()].filter((g) => alive(x, a, g.id))
  goals.sort((g, h) => ms(h.createdAt) - ms(g.createdAt) || (g.id < h.id ? -1 : g.id > h.id ? 1 : 0))
  return JSON.stringify(goals)
}

function mergeReading(win: string, lose: string, x: Tombs, a: Adds, localValue: string): string {
  const p = json(win) ?? {}
  const q = json(lose) ?? {}
  const bm = new Map<string, Bookmark>()
  for (const m of [...((q.bookmarks as Bookmark[]) ?? []), ...((p.bookmarks as Bookmark[]) ?? [])]) {
    if (!m || !Number.isInteger(m.sura) || !Number.isInteger(m.aya)) continue
    const had = bm.get(bmId(m))
    if (!had || ms(m.at) >= ms(had.at)) bm.set(bmId(m), m)
  }
  const bookmarks = [...bm.values()].filter((m) => alive(x, a, bmId(m))).sort((m, n) => ms(n.at) - ms(m.at) || (bmId(m) < bmId(n) ? -1 : 1))
  // The portion: the same plan's furthest progress; another plan's length: the winning side's plan.
  const wp = (p.ward ?? {}) as Record<string, unknown>
  const wq = (q.ward ?? {}) as Record<string, unknown>
  const ward = wp.days === wq.days ? { ...wq, ...wp, done: Math.max(num(wp.done), num(wq.done)) } : { ...wp }
  const notes = json(localValue)?.notes
  return JSON.stringify({ ...q, ...p, bookmarks, ward, notes: Array.isArray(notes) ? notes : [] })
}

/** What may go to the current account: what this phone holds or wrote, and what came from this account's iCloud. A
 *  key or an item that came only from a previous account's iCloud stays on the phone. */
export function forAccount(key: CloudKey, v: string | null, st: Stamps): string | null | undefined {
  if (!st.own[key] && !st.acct[key]) return undefined
  const out = toCloud(key, v)
  if (out === null || !isList(key)) return out
  const ok = new Set([...(st.ownItems[key] ?? []), ...(st.acctItems[key] ?? [])])
  if (CLOUD_KEYS[key] === 'reading') {
    const o = json(out)
    if (!o) return out
    return JSON.stringify({ ...o, bookmarks: ((o.bookmarks as Bookmark[]) ?? []).filter((b) => ok.has(bmId(b))) })
  }
  return JSON.stringify(((jsonArr(out) as Goal[]) ?? []).filter((g) => ok.has(g.id)))
}

/** The first time this phone stamps: everything it holds is its own. */
function initStamps(st: Stamps, storage: KeyValue) {
  if (st.init) return
  for (const key of Object.keys(CLOUD_KEYS) as CloudKey[]) {
    const v = storage.getItem(key)
    if (v === null) continue
    st.own[key] = true
    st.held[key] = true
    if (isList(key)) {
      st.ownItems[key] = [...itemIds(key, v)]
      st.a[key] = Object.fromEntries(st.ownItems[key].map((id) => [id, 0]))
    }
  }
  st.init = true
}

/** Another iCloud account on the device: a first contact again. The previous account's versions, tombstones and what
 *  came from it are forgotten; a value of this phone's own stays its own (held before), one that came only from the
 *  previous account gives way to the new one's. */
export function forNewAccount(st: Stamps): Stamps {
  const keys: Stamps['keys'] = {}
  for (const k of Object.keys(st.keys)) if (!st.own[k]) keys[k] = { ...LEGACY, d: st.dev, pre: true }
  const a: Stamps['a'] = {}
  for (const [k, ids] of Object.entries(st.ownItems)) a[k] = Object.fromEntries(ids.map((id) => [id, 0]))
  return { ...st, contact: false, emptyAt: undefined, keys, x: {}, a, acct: {}, acctItems: {} }
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
export async function mergeOnce(deps: {
  storage: KeyValue
  cloud: CloudApi
  setApplying: (on: boolean) => void
  now?: () => number
  stop?: () => boolean
  newAccount?: boolean
}): Promise<SyncResult> {
  const { storage, cloud } = deps
  const now = deps.now ?? Date.now
  const values = (await cloud.getAll()).values ?? {}
  if (deps.stop?.()) return { adopted: [], sent: [], contact: false, dropped: true }
  let stamps = readStamps(storage.getItem(STAMPS_KEY))
  initStamps(stamps, storage)
  if (deps.newAccount) stamps = forNewAccount(stamps)
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
      const there = entries.get(key) ?? null
      let v = lv
      let ver: Version | null = st ? { c: st.c, t: st.t, d: st.d } : null
      let x = prune(stamps.x[key] ?? {}, now())
      let a = stamps.a[key] ?? {}
      if (there) {
        const m = mergeKey(key, { v: lv, ver, pre: st?.pre, x, a }, there, first, now())
        x = m.x
        a = m.a
        if (m.take) {
          if (m.v === null) storage.removeItem(key)
          else storage.setItem(key, m.v)
          adopted.push(key)
          v = m.v
        }
        // What came from this account's iCloud may go back to it.
        if (there.v !== null) {
          stamps.acct[key] = true
          if (isList(key)) stamps.acctItems[key] = [...new Set([...(stamps.acctItems[key] ?? []), ...itemIds(key, there.v)])]
        }
        const out = forAccount(key, v, stamps)
        const same =
          (out === undefined || canon(out) === canon(there.v)) &&
          canon(JSON.stringify(x)) === canon(JSON.stringify(prune(there.x ?? {}, now()))) &&
          canon(JSON.stringify(a)) === canon(JSON.stringify(there.a ?? {}))
        // iCloud's value as it is, or this phone's own kept against it (recorded as seen, so it is not sent and only a
        // later write elsewhere replaces it): iCloud's version. A merged value that differs: a new write of this phone.
        if (same || (CLOUD_KEYS[key] === 'newest' && !m.take)) ver = { c: there.c, t: there.t, d: there.d }
        else ver = { c: ++stamps.clock, t: now(), d: stamps.dev }
      } else if (!ver && lv !== null && contact) ver = { ...LEGACY, d: stamps.dev }
      if (ver) stamps.keys[key] = { ...ver, ...(stamps.keys[key]?.pre && !contact ? { pre: true } : {}) }
      else delete stamps.keys[key]
      stamps.x[key] = x
      stamps.a[key] = a
      const out = forAccount(key, v, stamps)
      if (!contact || out === undefined || (out === null && !there) || (out !== null && out.length > MAX_CLOUD_VALUE)) continue
      // A value held since before stamping goes with counter 0: any stamped write elsewhere is newer.
      const sendVer = ver ?? { ...LEGACY, d: stamps.dev }
      const differs =
        !there || canon(there.v) !== canon(out) || canon(JSON.stringify(there.x ?? {})) !== canon(JSON.stringify(x)) || canon(JSON.stringify(there.a ?? {})) !== canon(JSON.stringify(a))
      if (differs && (!there || newer(sendVer, there))) sends.push([key, { ...sendVer, v: out, x, a }])
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

  // Each later write of a cloud key that changes it: one past the highest counter seen, its list's tombstones and
  // adds, sent a moment later. A write of the same value (the settings written again on open) is no write.
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
      const out = forAccount(key, storage.getItem(key), stamps)
      const ver = stamps.keys[key]
      if (!ver || out === undefined || (out !== null && out.length > MAX_CLOUD_VALUE)) continue
      await cloud
        .set({ key, value: JSON.stringify({ c: ver.c, t: ver.t, d: ver.d, v: out, x: stamps.x[key] ?? {}, a: stamps.a[key] ?? {} }) })
        .catch(() => undefined)
    }
  }
  const onWrite = opts?.onWrite ?? onStorageWrite
  onWrite((key) => {
    if (!isCloudKey(key)) return
    const after = storage.getItem(key)
    const before = seen.get(key) ?? null
    seen.set(key, after)
    if (applying || canon(after) === canon(before)) return
    const stamps = readStamps(storage.getItem(STAMPS_KEY))
    initStamps(stamps, storage)
    const t = now()
    const c = ++stamps.clock
    // Before the first contact, a write to a key this phone did not hold is a new install's own (defaults): `pre`.
    stamps.keys[key] = { c, t, d: stamps.dev, ...(stamps.contact || stamps.held[key] ? {} : { pre: true }) }
    stamps.own[key] = true
    if (isList(key)) {
      const w = listWrite(key, before, after, stamps.x[key] ?? {}, stamps.a[key] ?? {}, c, t)
      stamps.x[key] = w.x
      stamps.a[key] = w.a
      stamps.ownItems[key] = [...new Set([...(stamps.ownItems[key] ?? []), ...w.added])]
    }
    applying = true
    try {
      storage.setItem(STAMPS_KEY, JSON.stringify(stamps))
    } finally {
      applying = false
    }
    pending.add(key)
    timer ??= setTimeout(() => void send(), 1500)
  })

  // iCloud's copy reaching a new phone or a reinstall: merged once; another account: a first contact again. If anything
  // came, the app opens again with it. A change from another phone while the app is open waits for the next launch.
  let reloaded = false
  void cloud
    .addListener('change', (e) => {
      if (e.reason === 'quota') full = true
      if (e.reason !== 'initial' && e.reason !== 'account') return
      void mergeOnce({ storage, cloud, setApplying, now, newAccount: e.reason === 'account' })
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
