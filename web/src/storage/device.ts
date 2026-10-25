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
// - The move (at the first launch of the version with this file): every key of the inventory found in localStorage is
//   written to Preferences, read back and compared; only then is the move marked done. If anything fails or takes too
//   long, the app runs on localStorage as before, with nothing lost, and marks localStorage «newer»: the next launch
//   moves it again, whole.
// - After a wiped web view (localStorage empty, nothing marked newer), the data comes from Preferences, and the copy in
//   localStorage is written again.
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
/** In localStorage: localStorage holds writes Preferences may lack, so the next launch moves it again. */
export const NEWER_KEY = 'storage.localNewer.v1'

export type Mode = 'web' | 'waiting' | 'prefs' | 'local'
export type StorageStatus = {
  mode: Mode
  /** This launch did the move (how many keys). */
  moved: number | null
  /** Why the app runs on localStorage this launch. */
  error: string | null
  /** Keys read or written before the app's storage was ready (must stay empty: main-native.tsx loads it first). */
  early: string[]
  /** Writes to Preferences that failed this launch (they are in localStorage, marked newer). */
  failedWrites: number
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
  const status: StorageStatus = { mode: deps.native() ? 'waiting' : 'web', moved: null, error: null, early: [], failedWrites: 0 }
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
  const markLocalNewer = (why = '') => {
    try {
      local()?.setItem(NEWER_KEY, `${new Date().toISOString()}${why ? ` ${why}` : ''}`)
    } catch {
      // nothing more can be done
    }
  }
  const mirror = (k: string, v: string | null) => {
    try {
      const l = local()
      if (v === null) l?.removeItem(k)
      else l?.setItem(k, v)
    } catch {
      // localStorage full or refused: Preferences holds it
    }
  }
  const toPrefs = (f: (p: PrefsApi) => Promise<void>) => {
    const p = prefs
    if (!p) return
    chain = chain.then(
      () =>
        f(p).catch(() => {
          status.failedWrites++
          markLocalNewer()
        }),
    )
  }

  /** Told of every write in the apps (not on the web): the iCloud copy (./cloud.ts). */
  const writes = new Set<(key: string) => void>()

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
      mem.set(k, value)
      mirror(k, value)
      if (status.mode === 'prefs') toPrefs((p) => p.set({ key: k, value }))
      for (const f of writes) f(k)
    },
    removeItem(k) {
      if (status.mode === 'web') return globalThis.localStorage.removeItem(k)
      if (status.mode === 'waiting') {
        status.early.push(k)
        return local()?.removeItem(k)
      }
      mem.delete(k)
      mirror(k, null)
      if (status.mode === 'prefs') toPrefs((p) => p.remove({ key: k }))
      for (const f of writes) f(k)
    },
  }

  /** The move: localStorage's keys into Preferences, the extra ones there removed, all read back and compared, then
   *  marked done. `stop()` true (the launch stopped waiting) ends it before it can mark anything. */
  async function move(p: PrefsApi, from: Map<string, string>, stop: () => boolean) {
    const step = () => {
      if (stop()) throw new Error('stopped')
    }
    for (const [key, value] of from) {
      step()
      await p.set({ key, value })
    }
    step()
    for (const key of (await p.keys()).keys) {
      step()
      if (isKept(key) && !from.has(key)) await p.remove({ key })
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

  /** Once, before anything is drawn. On the web it does nothing. The whole of it (Preferences' answer, the load or
   *  the move) has one deadline, so the first view never waits longer than `timeoutMs` for it. */
  async function hydrate(): Promise<StorageStatus> {
    if (status.mode !== 'waiting') return status
    const l = local()
    let stopped = false
    const work = async (): Promise<{ p: PrefsApi; data: Map<string, string>; moved: number | null }> => {
      const p = await deps.prefs()
      const done = (await p.get({ key: MOVED_KEY })).value
      let newer = false
      try {
        newer = l?.getItem(NEWER_KEY) != null
      } catch {
        newer = false
      }
      if (done && !newer) return { p, data: await load(p), moved: null }
      const from = localEntries(l)
      await move(p, from, () => stopped)
      return { p, data: from, moved: from.size }
    }
    try {
      const r = await later(work(), timeoutMs, 'Preferences')
      mem = r.data
      if (r.moved === null) {
        // The copy in localStorage written again where it differs (after a wiped web view: all of it).
        const have = localEntries(l)
        for (const [k, v] of mem) if (have.get(k) !== v) mirror(k, v)
        for (const k of have.keys()) if (!mem.has(k)) mirror(k, null)
      } else {
        status.moved = r.moved
        try {
          l?.removeItem(NEWER_KEY)
        } catch {
          // it is moved again next time: no harm
        }
      }
      prefs = r.p
      status.mode = 'prefs'
    } catch (e) {
      // Too late or failed: whatever is still running stops before it can mark the move (move() checks `stopped`).
      stopped = true
      mem = localEntries(l)
      prefs = null
      status.mode = 'local'
      status.error = e instanceof Error ? e.message : String(e)
      markLocalNewer(status.error)
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
