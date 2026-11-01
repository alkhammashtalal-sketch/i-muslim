// Talal's direct order of 1 November 10:00: «وإذا اختار المستخدم اللغة أو ضغط «ابدأ» يُحفظ ذلك في طبقة التخزين وiCloud، ولا
// تظهر له الترحيب مرة ثانية». The record of the welcome (web/src/v2/welcome/seen.ts) through the real storage layer (a fake
// Preferences, a fake localStorage) and the real iCloud copy (a fake key-value store): written by «ابدأ» and by a
// language picked, kept when the web view's storage is reclaimed, after an update, and brought back on a reinstall.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createDeviceStorage, MOVED_KEY, type PrefsApi } from '../../web/src/storage/device'
import { CLOUD_KEYS, startCloud, type CloudApi } from '../../web/src/storage/cloud'
import { BRIEF_WELCOME, launchWelcome, markWelcomeSeen, WELCOME_KEY, welcomeSeen } from '../../web/src/v2/welcome/seen'

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
class FakeCloud implements CloudApi {
  m = new Map<string, string>()
  sets: string[] = []
  listener: ((e: { reason: 'server' | 'initial' | 'quota' | 'account' | 'unknown'; keys: string[] }) => void) | null = null
  async available() {
    return { available: true }
  }
  async getAll() {
    return { values: Object.fromEntries(this.m) }
  }
  async set({ key, value }: { key: string; value: string }) {
    this.sets.push(key)
    this.m.set(key, value)
    return { ok: true }
  }
  async addListener(_e: 'change', f: FakeCloud['listener'] & object) {
    this.listener = f
    return { remove: async () => void (this.listener = null) }
  }
  put(key: string, c: number, v: string | null) {
    this.m.set(key, JSON.stringify({ c, t: c, d: 'other', v, x: {}, a: {} }))
  }
  value(key: string) {
    return (JSON.parse(this.m.get(key) ?? 'null') as { v: string | null } | null)?.v ?? null
  }
}

/** One launch of the app: the storage loaded from Preferences (main-native.tsx), then the iCloud merge, then the view. */
async function launch(prefs: FakePrefs, local: FakeLocal, cloud?: FakeCloud, reload = () => {}) {
  const d = createDeviceStorage({ native: () => true, prefs: async () => prefs, local: () => local })
  await d.hydrate()
  if (cloud) await startCloud({ cloud, storage: d.storage, onWrite: d.onWrite, ios: true, ready: () => d.status().mode === 'prefs', reload })
  return d
}

describe('the welcome is recorded by «ابدأ» and by a language picked', () => {
  it('the key is the one the storage layer keeps and iCloud copies', () => {
    expect(WELCOME_KEY).toBe('muslim.welcome.v1')
    expect(CLOUD_KEYS[WELCOME_KEY]).toBe('newest')
  })

  it('first run: the whole welcome; once recorded: none, and no brief one either', async () => {
    const d = await launch(new FakePrefs(), new FakeLocal())
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBe('first')
    markWelcomeSeen(d.storage)
    expect(welcomeSeen(d.storage)).toBe(true)
    expect(BRIEF_WELCOME).toBe(false)
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBeNull()
  })

  it('App.tsx records it both on «ابدأ» and when a language is picked (the picker the welcome opens)', () => {
    const app = read('web/src/App.tsx')
    const pick = app.slice(app.indexOf('const pickLang = useCallback('), app.indexOf('const openLang = useCallback('))
    expect(pick).toMatch(/markWelcomeSeen\(\)/)
    const start = app.slice(app.indexOf('<Welcome'), app.indexOf('onLanguage={openLang}', app.indexOf('<Welcome')))
    expect(start).toMatch(/onStart=\{\(\) => \{\s*markWelcomeSeen\(\)/)
    // the language button on the welcome opens that picker
    expect(app).toMatch(/onLanguage=\{openLang\}/)
  })
})

describe('in the storage layer: Preferences, with a copy in localStorage', () => {
  it('written to Preferences and to localStorage at once', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    const d = await launch(prefs, local)
    markWelcomeSeen(d.storage)
    await d.flush()
    expect(prefs.m.get(WELCOME_KEY)).toBe('1')
    expect(local.getItem(WELCOME_KEY)).toBe('1')
  })

  it('the web view\'s storage reclaimed by the system (localStorage empty): Preferences still says done, no welcome', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    markWelcomeSeen((await launch(prefs, local)).storage)
    local.clear()
    const next = await launch(prefs, local)
    expect(launchWelcome(BRIEF_WELCOME, next.storage)).toBeNull()
    expect(local.getItem(WELCOME_KEY)).toBe('1') // and the copy is written again
  })

  it('an update from a version that kept it in localStorage only (1.0, build 17): moved, no welcome', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    local.setItem(WELCOME_KEY, '1')
    const d = await launch(prefs, local)
    expect(prefs.m.get(WELCOME_KEY)).toBe('1')
    expect(prefs.m.has(MOVED_KEY)).toBe(true)
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBeNull()
  })

  it('Preferences too slow at launch: the app runs on localStorage, which still says done', async () => {
    const local = new FakeLocal()
    local.setItem(WELCOME_KEY, '1')
    const d = createDeviceStorage({ native: () => true, prefs: () => new Promise<PrefsApi>(() => {}), local: () => local, timeoutMs: 20 })
    expect((await d.hydrate()).mode).toBe('local')
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBeNull()
  })
})

describe('in iCloud (the iPhone app)', () => {
  it('a phone that has reached its iCloud copy sends it a moment after «ابدأ» or the language', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const cloud = new FakeCloud()
      cloud.put('imuslim.settings.v1', 3, '{"lang":"ar"}') // iCloud reached: it holds this person's copy
      const d = await launch(new FakePrefs(), new FakeLocal(), cloud)
      markWelcomeSeen(d.storage)
      await vi.advanceTimersByTimeAsync(1600)
      expect(cloud.value(WELCOME_KEY)).toBe('1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a reinstall (Preferences and localStorage empty) whose iCloud says done: no welcome at the first view', async () => {
    const cloud = new FakeCloud()
    cloud.put(WELCOME_KEY, 4, '1')
    cloud.put('imuslim.settings.v1', 4, '{"lang":"en","content":"en"}')
    const d = await launch(new FakePrefs(), new FakeLocal(), cloud)
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBeNull()
  })

  it('a reinstall whose iCloud copy comes down after the first view: recorded then, and the app opens again once, without the welcome', async () => {
    const cloud = new FakeCloud()
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    const reload = vi.fn()
    const d = await launch(prefs, local, cloud, reload)
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBe('first')
    // iCloud's copy reaches the phone (InitialSyncChange)
    cloud.put(WELCOME_KEY, 4, '1')
    cloud.listener!({ reason: 'initial', keys: [WELCOME_KEY] })
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    await d.flush()
    const next = await launch(prefs, local)
    expect(launchWelcome(BRIEF_WELCOME, next.storage)).toBeNull()
  })

  it('either one is enough: iCloud never takes the record back from a phone that holds it', async () => {
    const cloud = new FakeCloud()
    cloud.put('imuslim.settings.v1', 9, '{"lang":"ar"}')
    const prefs = new FakePrefs()
    prefs.m.set(WELCOME_KEY, '1')
    const d = await launch(prefs, new FakeLocal(), cloud)
    expect(launchWelcome(BRIEF_WELCOME, d.storage)).toBeNull()
  })

  it('nothing at launch waits for the network: main-native.tsx loads the storage and iCloud with their own deadlines, then the app', () => {
    const entry = read('web/src/main-native.tsx')
    expect(entry).toMatch(/hydrateStorage\(\)\s*\.then\(\(\) => startCloud\(\)\)\s*\.catch\(\(\) => undefined\)\s*\.finally\(\(\) => import\('\.\/main\.tsx'\)\)/)
    expect(read('web/src/storage/cloud.ts')).toMatch(/opts\?\.timeoutMs \?\? 1500/)
    expect(read('web/src/storage/device.ts')).toMatch(/deps\.timeoutMs \?\? 2500/)
  })
})

describe('Android: the storage layer alone, kept across a reinstall by Auto Backup', () => {
  it('the SharedPreferences file of the storage layer is not excluded from the backup or the device transfer', () => {
    for (const f of ['web/android/app/src/main/res/xml/backup_rules.xml', 'web/android/app/src/main/res/xml/data_extraction_rules.xml']) {
      const x = read(f).replace(/<!--[\s\S]*?-->/g, '')
      expect(x, f).not.toMatch(/domain="sharedpref"/)
      expect(x, f).not.toMatch(/<include/)
    }
    expect(read('web/android/app/src/main/AndroidManifest.xml')).toMatch(/android:allowBackup="true"/)
  })
})
