// What the person keeps on this device, in one place (add-on 0072-add25): every file of web/src reads and writes through
// `deviceStorage` instead of localStorage itself. Nothing here leaves the device: no server, no account, no network.
//
// - The web: localStorage, exactly as before (each call goes straight to it, errors included).
// - The iOS and Android apps: @capacitor/preferences (UserDefaults in Library/Preferences on iOS, SharedPreferences on
//   Android), since the system may reclaim a web view's localStorage when the phone runs low on space
//   (https://capacitorjs.com/docs/guides/storage). The app reads synchronously, so before anything is drawn
//   (src/main-native.tsx, the native build's entry) every key is loaded into memory; reads come from memory, and each
//   write goes to memory, to Preferences (in order, one after another) and to localStorage.
// - localStorage stays a full copy in the apps, never cleared: the copy 1.0 wrote is the source of the one-time move,
//   and it is kept current afterwards, so it remains a backup for this version.
// - The move (once, at the first launch of the version with this file, while Preferences has no «moved» mark): every
//   key of the inventory found in localStorage is copied into Preferences, read back and compared; only then is the
//   move marked done. The move never deletes anything in Preferences.
// - A journal in localStorage («storage.pending.v1») names each key written here that Preferences has not confirmed
//   yet (a write in flight when the app is killed, a write Preferences refused, a write made while the app ran on
//   localStorage). The next launch loads Preferences, then takes those keys, and only those, from localStorage: so the
//   newer value wins, and nothing else of localStorage is ever written over Preferences.
// - If Preferences fails or is too slow at launch, the app runs on localStorage for that launch. When localStorage then
//   holds none of the person's keys (the system reclaimed it), nothing of that launch is journaled: its writes are the
//   blank defaults of an empty app, and must not reach Preferences, which still holds everything.
// - After a wiped web view the data comes from Preferences, and the copy in localStorage is written again.
// What the widgets share with the app (the App Group file, src/native/widget-data.ts) is not here and stays as it is.
import { isNative } from '../native/platform'

export type KeyValue = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

/** The part of @capacitor/preferences used here. */
export type PrefsApi = {
  get(o: { key: string }): Promise<{ value: string | null }>
  set(o: { key: string; value: string }): Promise<void>
  remove(o: { key: string }): Promise<void>
  keys(): Promise<{ keys: string[] }>
}

/** The keys that hold the person's data (the inventory in relay/w1/0072-storage/README.md): `muslim.*`, `imuslim.*`
 *  (the name before 0048), and the questions still in review. */
export const USER_KEY = /^(?:i?muslim\.[A-Za-z0-9_.-]+|ask\.pending)$/
export const isUserKey = (k: string) => USER_KEY.test(k)
/** The layer's own keys kept with the person's data (not in the backup file): when each key was last written here,
 *  for the iCloud copy's «newest wins» (./cloud.ts). */
export const STAMPS_KEY = 'storage.stamps.v1'
const isKept = (k: string) => isUserKey(k) || k === STAMPS_KEY
/** In Preferences: the move is done (its date and how many keys it carried). Not a user key. */
export const MOVED_KEY = 'storage.moved.v1'
/** In localStorage: the keys written here that Preferences has not confirmed, each with its write's id. */
export const JOURNAL_KEY = 'storage.pending.v1'
/** In localStorage: why the last launch ran on localStorage (for diagnosis; cleared by the next good launch). */
export const ERROR_KEY = 'storage.lastError.v1'
/** In localStorage: localStorage is a current copy of the person's data (set by a good launch whose copy was written
 *  whole, or when the first move starts from it); removed when a copy write fails, and gone with a reclaimed
 *  localStorage. A launch on localStorage journals its writes only while it is there. */
export const CURRENT_KEY = 'storage.current.v1'
/** In localStorage: a launch ran on a reclaimed (empty) localStorage; what is in localStorage since then is no copy of
 *  the person's data. Kept until a good launch: no later launch on localStorage journals anything, and the first move
 *  never writes over a key Preferences already holds. */
export const BLANK_KEY = 'storage.blank.v1'

export type Mode = 'web' | 'waiting' | 'prefs' | 'local'
export type StorageStatus = {
  mode: Mode
  /** This launch did the move (how many keys). */
  moved: number | null
  /** Why the app runs on localStorage this launch. */
  error: string | null
  /** Keys read or written before the app's storage was ready (must stay empty: main-native.tsx loads it first). */
  early: string[]
  /** Writes to Preferences that failed this launch (they stay journaled, and the next launch writes them). */
  failedWrites: number
  /** Journaled keys the launch took from localStorage over Preferences. */
  replayed: number
  /** The launch ran on localStorage and localStorage held none of the person's keys: its writes are not journaled. */
  blank: boolean
}

type Deps = {
  native: () => boolean
  prefs: () => Promise<PrefsApi>
  local: () => Storage | null
  /** How long a launch waits for Preferences (the load or the whole move) before running on localStorage. */
  timeoutMs?: number
}

const later = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what}: no answer in ${ms} ms`)), ms)
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    )
  })

function localEntries(local: Storage | null): Map<string, string> {
  const m = new Map<string, string>()
  if (!local) return m
  for (let i = 0; i < local.length; i++) {
    const k = local.key(i)
    if (k && isKept(k)) {
      const v = local.getItem(k)
      if (v !== null) m.set(k, v)
    }
  }
  return m
}

export function createDeviceStorage(deps: Deps) {
  const timeoutMs = deps.timeoutMs ?? 2500
  const status: StorageStatus = { mode: deps.native() ? 'waiting' : 'web', moved: null, error: null, early: [], failedWrites: 0, replayed: 0, blank: false }
  let mem = new Map<string, string>()
  let prefs: PrefsApi | null = null
  let chain: Promise<void> = Promise.resolve()

  const local = (): Storage | null => {
    try {
      return deps.local()
    } catch {
      return null
    }
  }
  const note = (k: string, v: string | null) => {
    try {
      const l = local()
      if (v === null) l?.removeItem(k)
      else l?.setItem(k, v)
    } catch {
      // nothing more can be done
    }
  }
  /** localStorage's copy of one key; false when localStorage refused it (full): the copy is then no longer current. */
  const mirror = (k: string, v: string | null): boolean => {
    try {
      const l = local()
      if (v === null) l?.removeItem(k)
      else l?.setItem(k, v)
      return true
    } catch {
      note(CURRENT_KEY, null)
      return false
    }
  }
  // The journal: key → its latest write not yet confirmed by Preferences (an id, and whether it was a removal).
  type Pending = { id: number; del: boolean }
  let journal: Record<string, Pending> = {}
  let seq = 0
  const saveJournal = () => note(JOURNAL_KEY, Object.keys(journal).length ? JSON.stringify(journal) : null)
  const journalAdd = (k: string, del: boolean) => {
    seq = Math.max(Date.now(), seq + 1)
    journal[k] = { id: seq, del }
    saveJournal()
    return seq
  }
  const journalDone = (k: string, id: number) => {
    if (journal[k]?.id !== id) return // a later write of the same key is still on its way
    delete journal[k]
    saveJournal()
  }
  /** Told of every write in the apps (not on the web): the iCloud copy (./cloud.ts). */
  const writes = new Set<(key: string) => void>()

  /** One write: journaled first, then localStorage's copy, then Preferences (in order); confirmed, it leaves the journal. */
  const write = (k: string, value: string | null) => {
    if (value === null) mem.delete(k)
    else mem.set(k, value)
    const p = status.mode === 'prefs' ? prefs : null
    const id = p || !status.blank ? journalAdd(k, value === null) : 0
    if (!mirror(k, value) && id) {
      // localStorage does not hold this write: nothing of it may ever be replayed from there.
      delete journal[k]
      saveJournal()
      if (!p) status.blank = true
    }
    for (const f of writes) f(k)
    if (!p) return
    chain = chain.then(() =>
      (value === null ? p.remove({ key: k }) : p.set({ key: k, value })).then(
        () => journalDone(k, id),
        () => void status.failedWrites++,
      ),
    )
  }

  const storage: KeyValue = {
    getItem(k) {
      if (status.mode === 'web') return globalThis.localStorage.getItem(k)
      if (status.mode === 'waiting') {
        status.early.push(k)
        return local()?.getItem(k) ?? null
      }
      return mem.get(k) ?? null
    },
    setItem(k, v) {
      const value = String(v)
      if (status.mode === 'web') return globalThis.localStorage.setItem(k, value)
      if (status.mode === 'waiting') {
        status.early.push(k)
        return local()?.setItem(k, value)
      }
      write(k, value)
    },
    removeItem(k) {
      if (status.mode === 'web') return globalThis.localStorage.removeItem(k)
      if (status.mode === 'waiting') {
        status.early.push(k)
        return local()?.removeItem(k)
      }
      write(k, null)
    },
  }

  /** The move (once, while Preferences has no «moved» mark): localStorage's keys copied into Preferences, read back and
   *  compared, then marked done. It deletes nothing: what Preferences already holds stays. `stop()` true (the launch
   *  stopped waiting) ends it before it can mark anything. */
  async function move(p: PrefsApi, from: Map<string, string>, stop: () => boolean) {
    const step = () => {
      if (stop()) throw new Error('stopped')
    }
    for (const [key, value] of from) {
      step()
      await p.set({ key, value })
    }
    for (const [key, value] of from) {
      step()
      const got = (await p.get({ key })).value
      if (got !== value) throw new Error(`not the same after the move: ${key}`)
    }
    step()
    const mark = JSON.stringify({ v: 1, at: new Date().toISOString(), keys: from.size })
    await p.set({ key: MOVED_KEY, value: mark })
    if ((await p.get({ key: MOVED_KEY })).value !== mark) throw new Error('the move could not be marked')
  }

  async function load(p: PrefsApi): Promise<Map<string, string>> {
    const keys = (await p.keys()).keys.filter(isKept)
    const values = await Promise.all(keys.map((key) => p.get({ key })))
    const m = new Map<string, string>()
    keys.forEach((k, i) => {
      const v = values[i].value
      if (v !== null) m.set(k, v)
    })
    return m
  }

  const readJournal = (l: Storage | null): Record<string, Pending> => {
    try {
      const o = JSON.parse(l?.getItem(JOURNAL_KEY) ?? '{}') as Record<string, unknown>
      const j: Record<string, Pending> = {}
      for (const [k, v] of Object.entries(o && typeof o === 'object' ? o : {})) {
        const e = v as Partial<Pending> | null
        if (isKept(k) && e && typeof e.id === 'number') j[k] = { id: e.id, del: e.del === true }
      }
      return j
    } catch {
      return {}
    }
  }

  /** Once, before anything is drawn. On the web it does nothing. The whole of it (Preferences' answer, the move, the
   *  load, the journal) has one deadline, so the first view never waits longer than `timeoutMs` for it. */
  async function hydrate(): Promise<StorageStatus> {
    if (status.mode !== 'waiting') return status
    const l = local()
    let stopped = false
    const from = localEntries(l)
    const pending = readJournal(l)
    const flag = (k: string) => {
      try {
        return l?.getItem(k) != null
      } catch {
        return false
      }
    }
    const blankBefore = flag(BLANK_KEY)
    const step = () => {
      if (stopped) throw new Error('stopped')
    }
    const work = async (): Promise<{ p: PrefsApi; data: Map<string, string>; moved: number | null; replayed: number }> => {
      const p = await deps.prefs()
      const done = (await p.get({ key: MOVED_KEY })).value
      let moved: number | null = null
      if (!done) {
        // The first move. After a blank launch, localStorage is no copy: only keys Preferences lacks are taken.
        const have = blankBefore ? new Set((await p.keys()).keys) : new Set<string>()
        const take = new Map([...from].filter(([k]) => !have.has(k)))
        // From here localStorage is the source of the person's data: a launch that fails now may journal its writes.
        if (!blankBefore && from.size > 0) note(CURRENT_KEY, '1')
        await move(p, take, () => stopped)
        moved = take.size
      }
      step()
      const data = await load(p)
      // The journaled keys: localStorage's value (or its absence) is the newer one. Never after a blank launch.
      let replayed = 0
      for (const [k, e] of blankBefore ? [] : Object.entries(pending)) {
        step()
        const v = from.get(k) ?? null
        if (e.del && v === null) {
          if (data.has(k)) await p.remove({ key: k })
          data.delete(k)
        } else if (v !== null) {
          if (data.get(k) !== v) await p.set({ key: k, value: v })
          data.set(k, v)
        } else continue // a write whose localStorage copy is missing (localStorage full): Preferences keeps its value
        replayed++
      }
      return { p, data, moved, replayed }
    }
    try {
      const r = await later(work(), timeoutMs, 'Preferences')
      mem = r.data
      // The copy in localStorage written again where it differs (after a wiped web view: all of it); current again only
      // when every key of it was written.
      let whole = true
      for (const [k, v] of mem) if (from.get(k) !== v) whole = mirror(k, v) && whole
      for (const k of from.keys()) if (!mem.has(k)) whole = mirror(k, null) && whole
      journal = {}
      saveJournal()
      note(ERROR_KEY, null)
      note(BLANK_KEY, null)
      note(CURRENT_KEY, whole ? '1' : null)
      status.moved = r.moved
      status.replayed = r.replayed
      prefs = r.p
      status.mode = 'prefs'
    } catch (e) {
      // Too late or failed: whatever is still running stops before it can mark the move or replay further.
      stopped = true
      mem = from
      prefs = null
      status.mode = 'local'
      status.error = e instanceof Error ? e.message : String(e)
      // Keys journaled before stay journaled. This launch journals its own writes only when localStorage is a current
      // copy: not after the system reclaimed it (now or in an earlier launch), not when a copy write failed.
      journal = { ...pending }
      const reclaimed = from.size === 0 || blankBefore
      // (read now: the first move marks localStorage current as it starts from it)
      status.blank = reclaimed || !flag(CURRENT_KEY)
      if (reclaimed) note(BLANK_KEY, new Date().toISOString())
      note(ERROR_KEY, `${new Date().toISOString()} ${status.error}`)
    }
    return status
  }

  /** Waits for the writes sent to Preferences so far (before a reload, and in tests). */
  const flush = () => chain

  /** Every user key and its value as the app sees it now. */
  function entries(): Map<string, string> {
    if (status.mode === 'web') return localEntries(local())
    if (status.mode === 'waiting') return localEntries(local())
    return new Map(mem)
  }

  const onWrite = (f: (key: string) => void) => {
    writes.add(f)
    return () => void writes.delete(f)
  }

  return { storage, hydrate, flush, status: () => ({ ...status, early: [...status.early] }) as StorageStatus, entries, onWrite }
}

export type DeviceStorage = ReturnType<typeof createDeviceStorage>

/** Capacitor's plugin object is a Proxy that answers every property as a native method, `then` included: returned
 *  from an async function it is taken for a promise, and its «then» is rejected («Preferences.then() is not
 *  implemented»), which the first simulator run showed (the app ran on localStorage). So it is handed over wrapped in
 *  a plain object. */
export const plainPrefs = (p: PrefsApi): PrefsApi => ({
  get: (o) => p.get(o),
  set: (o) => p.set(o),
  remove: (o) => p.remove(o),
  keys: () => p.keys(),
})

const device = createDeviceStorage({
  native: isNative,
  prefs: async () => plainPrefs((await import('@capacitor/preferences')).Preferences),
  local: () => globalThis.localStorage ?? null,
})

/** The one storage every file uses. */
export const deviceStorage: KeyValue = device.storage
export const hydrateStorage = device.hydrate
export const flushStorage = device.flush
export const storageStatus = device.status
export const storageEntries = device.entries
export const onStorageWrite = device.onWrite
