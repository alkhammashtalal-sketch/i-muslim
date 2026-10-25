// Add-on 0072-add34 §ب2: a copy in the person's own iCloud (NSUbiquitousKeyValueStore), no sign-in, iPhone only.
// The merge rules run against a fake iCloud store and the real storage layer (with a fake Preferences); the Swift
// plugin, the entitlement and the registration are read from the project.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createDeviceStorage, isUserKey, STAMPS_KEY, type PrefsApi } from '../../web/src/storage/device'
import { CLOUD_KEYS, decide, fromCloud, ICLOUD_SYNC, MAX_CLOUD_VALUE, mergeOnce, readStamps, startCloud, toCloud, type CloudApi } from '../../web/src/storage/cloud'
import { inBackup } from '../../web/src/storage/backup'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

class FakeLocal implements Storage {
  m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
}
class FakePrefs implements PrefsApi {
  m = new Map<string, string>()
  async get({ key }: { key: string }) {
    return { value: this.m.get(key) ?? null }
  }
  async set({ key, value }: { key: string; value: string }) {
    this.m.set(key, value)
  }
  async remove({ key }: { key: string }) {
    this.m.delete(key)
  }
  async keys() {
    return { keys: [...this.m.keys()] }
  }
}
/** NSUbiquitousKeyValueStore as the plugin shows it. */
class FakeCloud implements CloudApi {
  m = new Map<string, string>()
  signedIn = true
  sets: string[] = []
  listener: ((e: { reason: 'server' | 'initial' | 'quota' | 'account' | 'unknown'; keys: string[] }) => void) | null = null
  async available() {
    return { available: this.signedIn }
  }
  async getAll() {
    return { values: Object.fromEntries(this.m) }
  }
  async set({ key, value }: { key: string; value: string }) {
    if (value.length > MAX_CLOUD_VALUE + 100) return { ok: false }
    this.sets.push(key)
    this.m.set(key, value)
    return { ok: true }
  }
  async addListener(_e: 'change', f: FakeCloud['listener'] & object) {
    this.listener = f
    return { remove: async () => void (this.listener = null) }
  }
  put(key: string, t: number, v: string | null) {
    this.m.set(key, JSON.stringify({ t, v }))
  }
  entry(key: string) {
    return JSON.parse(this.m.get(key) ?? 'null') as { t: number; v: string | null } | null
  }
}
async function phone(seed: Record<string, string> = {}) {
  const local = new FakeLocal()
  for (const [k, v] of Object.entries(seed)) local.setItem(k, v)
  const d = createDeviceStorage({ native: () => true, prefs: async () => new FakePrefs(), local: () => local })
  await d.hydrate()
  return d
}
const READING = JSON.stringify({
  bookmarks: [{ sura: 18, aya: 10, first: 'إِذۡ أَوَى', more: true, at: '2026-10-20T19:02:11.000Z' }],
  notes: [{ sura: 2, aya: 255, text: 'ملاحظة خاصة', first: 'ٱللَّهُ', more: true, at: '2026-10-21T21:40:00.000Z' }],
  ward: { days: 30, done: 7, reminder: false },
  favReciters: [102],
})
const TASBIH = (o: Record<string, unknown>) => JSON.stringify({ day: '2026-10-25', total: 0, word: 0, limit: 33, n: 0, custom: '', vibrate: true, after: false, step: 0, ...o })
const noApply = () => {}

describe('what goes to iCloud', () => {
  it('the tasbih, the bookmarks and portion, the settings and «طريق البداية»; not the place, the notes, the «صليت» log, the alerts or what belongs to the device', () => {
    const keys = Object.keys(CLOUD_KEYS)
    for (const k of keys) {
      expect(isUserKey(k)).toBe(true)
      expect(inBackup(k)).toBe(true)
    }
    for (const k of ['muslim.tasbih.v1', 'muslim.reading.v1', 'imuslim.settings.v1', 'imuslim.starter.v1']) expect(keys).toContain(k)
    for (const k of ['muslim.place.v1', 'muslim.prayed.v1', 'muslim.push.v1', 'muslim.adhkarReminders.v1', 'muslim.alertSound.v1', 'muslim.review.v1', 'imuslim.downloads.v1', 'ask.pending', 'muslim.lang.v1'])
      expect(keys).not.toContain(k)
    expect(keys.length).toBeLessThan(1024)
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(128)
    // The notes stay on the device (Apple: no personal text in the key-value store); a new copy keeps this phone's.
    const out = JSON.parse(toCloud('muslim.reading.v1', READING)!)
    expect(out.notes).toBeUndefined()
    expect(out.bookmarks).toHaveLength(1)
    const back = JSON.parse(fromCloud('muslim.reading.v1', JSON.stringify(out), READING)!)
    expect(back.notes[0].text).toBe('ملاحظة خاصة')
    expect(JSON.parse(fromCloud('muslim.reading.v1', JSON.stringify(out), null)!).notes).toEqual([])
  })

  it('the rules: the newest wins key by key; before the first contact iCloud wins; the tasbih takes the larger count', () => {
    const k = 'imuslim.settings.v1'
    expect(decide(k, { v: 'a', t: 100 }, { v: 'b', t: 50 }, true)).toEqual({ keep: 'local', value: 'a', t: 100 })
    expect(decide(k, { v: 'a', t: 100 }, { v: 'b', t: 200 }, true)).toEqual({ keep: 'cloud', value: 'b', t: 200 })
    expect(decide(k, { v: 'a', t: 100 }, null, true)).toEqual({ keep: 'local', value: 'a', t: 100 })
    expect(decide(k, { v: 'defaults', t: 900 }, { v: 'mine', t: 50 }, false)).toEqual({ keep: 'cloud', value: 'mine', t: 50 })
    expect(decide(k, { v: 'a', t: 100 }, { v: null, t: 200 }, true)).toEqual({ keep: 'cloud', value: null, t: 200 })
    const t = decide('muslim.tasbih.v1', { v: TASBIH({ total: 1033, n: 12 }), t: 300 }, { v: TASBIH({ total: 900, n: 20 }), t: 100 }, true)
    expect(t.keep).toBe('both')
    expect(JSON.parse(t.value!)).toMatchObject({ total: 1033, n: 20 })
    const other = decide('muslim.tasbih.v1', { v: TASBIH({ total: 5, n: 5, day: '2026-10-24' }), t: 100 }, { v: TASBIH({ total: 40, n: 7 }), t: 300 }, true)
    expect(JSON.parse(other.value!)).toMatchObject({ total: 40, n: 7, day: '2026-10-25' })
    expect(readStamps('{bad')).toEqual({ keys: {}, contact: false })
  })
})

describe('the merge, on the storage layer', () => {
  it('a new phone: the defaults it wrote do not win; iCloud’s copy is taken, notes of this phone kept, nothing older sent back', async () => {
    const cloud = new FakeCloud()
    cloud.put('muslim.reading.v1', 50, toCloud('muslim.reading.v1', READING))
    cloud.put('imuslim.settings.v1', 60, '{"lang":"en","fontSize":"lg","simple":false,"content":"en"}')
    cloud.put('muslim.tasbih.v1', 70, TASBIH({ total: 1033 }))
    cloud.put('muslim.welcome.v1', 40, '1')
    const p = await phone({ 'imuslim.settings.v1': '{"lang":"ar","fontSize":"md","simple":false,"content":"ar"}' })
    const r = await mergeOnce({ storage: p.storage, cloud, setApplying: noApply, now: () => 10_000 })
    expect(r.contact).toBe(true)
    expect(r.adopted.sort()).toEqual(['imuslim.settings.v1', 'muslim.reading.v1', 'muslim.tasbih.v1', 'muslim.welcome.v1'])
    expect(JSON.parse(p.storage.getItem('imuslim.settings.v1')!).lang).toBe('en')
    expect(JSON.parse(p.storage.getItem('muslim.reading.v1')!).bookmarks[0].sura).toBe(18)
    expect(JSON.parse(p.storage.getItem('muslim.reading.v1')!).notes).toEqual([])
    expect(p.storage.getItem('muslim.welcome.v1')).toBe('1')
    expect(cloud.sets).toEqual([])
    expect(readStamps(p.storage.getItem(STAMPS_KEY))).toMatchObject({ contact: true, keys: { 'imuslim.settings.v1': 60 } })
  })

  it('two phones: the newer side wins each key, the older side is sent its newer values', async () => {
    const cloud = new FakeCloud()
    cloud.put('imuslim.settings.v1', 500, '{"lang":"fr"}')
    cloud.put('muslim.goals.v1', 100, '[]')
    const p = await phone({ 'imuslim.settings.v1': '{"lang":"en"}', 'muslim.goals.v1': '[{"id":"g1","title":"x","createdAt":"2026-10-25","doneDays":[]}]' })
    p.storage.setItem(STAMPS_KEY, JSON.stringify({ contact: true, keys: { 'imuslim.settings.v1': 300, 'muslim.goals.v1': 400 } }))
    const r = await mergeOnce({ storage: p.storage, cloud, setApplying: noApply })
    expect(r.adopted).toEqual(['imuslim.settings.v1'])
    expect(p.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"fr"}')
    expect(r.sent).toEqual(['muslim.goals.v1'])
    expect(cloud.entry('muslim.goals.v1')).toMatchObject({ t: 400 })
    expect(JSON.parse(cloud.entry('muslim.goals.v1')!.v!)[0].id).toBe('g1')
  })

  it('an empty iCloud on the first launch: nothing sent; on a later launch the copy is made', async () => {
    const cloud = new FakeCloud()
    const p = await phone({ 'muslim.reading.v1': READING, 'muslim.welcome.v1': '1' })
    const first = await mergeOnce({ storage: p.storage, cloud, setApplying: noApply, now: () => 1_000_000 })
    expect(first).toMatchObject({ contact: false, sent: [] })
    expect(cloud.m.size).toBe(0)
    const second = await mergeOnce({ storage: p.storage, cloud, setApplying: noApply, now: () => 1_000_000 + 3_600_000 })
    expect(second.contact).toBe(true)
    expect(second.sent.sort()).toEqual(['muslim.reading.v1', 'muslim.welcome.v1'])
    expect(JSON.parse(cloud.entry('muslim.reading.v1')!.v!).notes).toBeUndefined()
    expect(cloud.entry('muslim.welcome.v1')!.t).toBe(1) // never stamped here: the oldest, any stamped value wins
  })

  it('a value over 64 KB stays on the device', async () => {
    const cloud = new FakeCloud()
    cloud.put('muslim.welcome.v1', 5, '1')
    const big = JSON.stringify([{ id: 'g', title: 'x'.repeat(MAX_CLOUD_VALUE), createdAt: '2026-10-25', doneDays: [] }])
    const p = await phone({ 'muslim.goals.v1': big })
    p.storage.setItem(STAMPS_KEY, JSON.stringify({ contact: true, keys: { 'muslim.goals.v1': 10 } }))
    const r = await mergeOnce({ storage: p.storage, cloud, setApplying: noApply })
    expect(r.sent).not.toContain('muslim.goals.v1')
    expect(p.storage.getItem('muslim.goals.v1')).toBe(big)
  })
})

describe('startCloud in the app', () => {
  it('no iCloud on the device: nothing happens, nothing is said', async () => {
    const cloud = new FakeCloud()
    cloud.signedIn = false
    const p = await phone({ 'muslim.welcome.v1': '1' })
    expect(await startCloud({ cloud, storage: p.storage, onWrite: p.onWrite, ios: true, ready: () => true })).toBeNull()
    expect(cloud.sets).toEqual([])
    expect(await startCloud({ cloud, storage: p.storage, onWrite: p.onWrite, ios: false })).toBeNull()
  })

  it('a launch that runs on localStorage (Preferences failed) copies nothing to or from iCloud', async () => {
    const cloud = new FakeCloud()
    cloud.put('imuslim.settings.v1', 5, '{"lang":"fr"}')
    const local = new FakeLocal()
    const d = createDeviceStorage({ native: () => true, prefs: async () => Promise.reject(new Error('no bridge')), local: () => local })
    expect((await d.hydrate()).mode).toBe('local')
    expect(await startCloud({ cloud, storage: d.storage, onWrite: d.onWrite, ios: true, ready: () => d.status().mode === 'prefs' })).toBeNull()
    d.storage.setItem('imuslim.settings.v1', '{"lang":"ar"}')
    expect(cloud.sets).toEqual([])
    expect(cloud.entry('imuslim.settings.v1')!.v).toBe('{"lang":"fr"}')
  })

  it('a write is stamped and sent a moment later; the copy reaching a reinstall reloads the app once', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      vi.setSystemTime(new Date('2026-10-25T12:00:00Z'))
      const cloud = new FakeCloud()
      cloud.put('muslim.welcome.v1', 5, '1')
      const p = await phone({ 'muslim.welcome.v1': '1' })
      const reload = vi.fn()
      const r = await startCloud({ cloud, storage: p.storage, onWrite: p.onWrite, reload, ios: true, ready: () => true })
      expect(r?.contact).toBe(true)
      p.storage.setItem('muslim.tasbih.v1', TASBIH({ total: 3, n: 3 }))
      p.storage.setItem('muslim.tasbih.v1', TASBIH({ total: 4, n: 4 }))
      p.storage.setItem('muslim.place.v1', '{"lat":1}')
      expect(cloud.sets).toEqual([])
      await vi.advanceTimersByTimeAsync(1600)
      expect(cloud.sets).toEqual(['muslim.tasbih.v1'])
      expect(JSON.parse(cloud.entry('muslim.tasbih.v1')!.v!).total).toBe(4)
      expect(cloud.entry('muslim.tasbih.v1')!.t).toBe(Date.parse('2026-10-25T12:00:00Z'))
      expect(cloud.m.has('muslim.place.v1')).toBe(false)
      // Another phone's copy comes down (initial sync), newer: taken, and the app opens again, once.
      cloud.put('imuslim.settings.v1', Date.now() + 10_000, '{"lang":"tr"}')
      cloud.listener!({ reason: 'initial', keys: ['imuslim.settings.v1'] })
      await vi.advanceTimersByTimeAsync(10)
      expect(p.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"tr"}')
      cloud.listener!({ reason: 'initial', keys: [] })
      await vi.advanceTimersByTimeAsync(10)
      expect(reload).toHaveBeenCalledTimes(1)
      // A server change (another phone, later) waits for the next launch's merge.
      cloud.put('imuslim.settings.v1', Date.now() + 20_000, '{"lang":"fr"}')
      cloud.listener!({ reason: 'server', keys: ['imuslim.settings.v1'] })
      await vi.advanceTimersByTimeAsync(10)
      expect(p.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"tr"}')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the iPhone project and the switch', () => {
  it('the plugin, its registration, the entitlement; Android and the web untouched', () => {
    expect(ICLOUD_SYNC).toBe(true)
    const swift = read('web/ios/App/App/CloudStorePlugin.swift')
    expect(swift).toContain('NSUbiquitousKeyValueStore.default')
    expect(swift).toContain('NSUbiquitousKeyValueStoreInitialSyncChange')
    expect(swift).toContain('public let jsName = "CloudStore"')
    expect(read('web/ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(CloudStorePlugin())')
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    expect(pbx.match(/CloudStorePlugin\.swift/g)?.length).toBe(pbx.match(/AccessibilityPrefsPlugin\.swift/g)?.length)
    const ent = read('web/ios/App/App/App.entitlements')
    expect(ent).toMatch(/<key>com\.apple\.developer\.ubiquity-kvstore-identifier<\/key>\s*<string>\$\(TeamIdentifierPrefix\)\$\(CFBundleIdentifier\)<\/string>/)
    expect(read('web/ios/App/MuslimWidgets/MuslimWidgets.entitlements')).not.toMatch(/ubiquity/)
    expect(read('web/src/main-native.tsx')).toMatch(/hydrateStorage\(\)\s*\.then\(\(\) => startCloud\(\)\)\s*\.catch\(\(\) => undefined\)\s*\.finally\(\(\) => import\('\.\/main\.tsx'\)\)/)
    const src = read('web/src/storage/cloud.ts').replace(/^\s*\/\/.*$/gm, '')
    expect(src).not.toMatch(/fetch\(|\bapi\(|\/api\/|XMLHttpRequest|sendBeacon/)
    expect(src).toContain("platform() === 'ios'")
    const androidFiles = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? androidFiles(path.join(d, e.name)) : [path.join(d, e.name)]))
    for (const f of androidFiles(path.join(ROOT, 'web/android/app/src/main/java'))) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/CloudStore|ubiquity/)
  })
})
