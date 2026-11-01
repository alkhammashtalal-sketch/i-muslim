// The welcome page as Talal wants it (1 November 12:31, add-on 0072-add62 §1, correcting his 10:00 order): «لازم في كل
// مرة الواحد يفتحها يشوف الصفحة، ويقدر يضغط ابدأ أو يختار اللغة حقته… ويكون واضح برضو في زر الخيارات جوّا التطبيق، إذا
// الواحد يبغى يغير لغته». The launch rule (web/src/v2/welcome/seen.ts) and the language kept through the real storage
// layer (a fake Preferences, a fake localStorage) and the real iCloud copy (a fake key-value store): kept when the web
// view's storage is reclaimed, after an update, and brought back on a reinstall, so the next welcome comes in it.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeviceStorage, type PrefsApi } from '../../web/src/storage/device'
import { CLOUD_KEYS, startCloud, type CloudApi } from '../../web/src/storage/cloud'
import { BRIEF_WELCOME, launchWelcome, markWelcomeSeen, WELCOME_KEY } from '../../web/src/v2/welcome/seen'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const SETTINGS = 'imuslim.settings.v1'
const EN = JSON.stringify({ lang: 'en', content: 'en' })

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

describe('the welcome on every launch of the app', () => {
  afterEach(() => vi.unstubAllGlobals())
  const at = (pathname: string, hash = '') => vi.stubGlobal('location', { pathname, hash })
  const app = () => true
  const tab = () => false

  it('the first run: the whole page, in the app and in a browser tab', async () => {
    const d = await launch(new FakePrefs(), new FakeLocal())
    at('/')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, app)).toBe('first')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, tab)).toBe('first')
  })

  it('every later launch of the app on its home: the whole page again (not the brief one, not none)', async () => {
    const d = await launch(new FakePrefs(), new FakeLocal())
    markWelcomeSeen(d.storage)
    at('/')
    expect(BRIEF_WELCOME).toBe(false)
    expect(launchWelcome(BRIEF_WELCOME, d.storage, app)).toBe('launch')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, app)).toBe('launch')
  })

  it('a widget\'s, an alert\'s or a link\'s page: that page at once; a browser tab after the first run: none', async () => {
    const d = await launch(new FakePrefs(), new FakeLocal())
    markWelcomeSeen(d.storage)
    at('/today/adhkar')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, app)).toBeNull()
    at('/', '#about')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, app)).toBeNull()
    at('/')
    expect(launchWelcome(BRIEF_WELCOME, d.storage, tab)).toBeNull()
  })

  it('App.tsx: the launch page is the whole page (its two buttons), and gives way to a page the app was opened on', () => {
    const app = read('web/src/App.tsx')
    expect(app).toMatch(/mode=\{welcome === 'brief' \? 'brief' : 'first'\}/)
    expect(app).toMatch(/setWelcome\(\(w\) => \(w === 'brief' \|\| w === 'launch' \? null : w\)\)/)
    expect(app).toMatch(/welcome !== 'brief' && welcome !== 'launch'/)
    // «ابدأ» enters; the language button opens the picker of the ten
    const w = app.slice(app.indexOf('<Welcome'), app.indexOf('/>', app.indexOf('<Welcome')))
    expect(w).toMatch(/onStart=\{\(\) => \{\s*markWelcomeSeen\(\)\s*setWelcome\(null\)/)
    expect(w).toMatch(/onLanguage=\{openLang\}/)
  })

  it('«اللغة» is the first row of Settings', () => {
    const sheets = read('web/src/components/Sheets.tsx')
    const body = sheets.slice(sheets.indexOf('<Sheet open={open} onClose={onClose} title={t.settings}>'))
    const first = body.indexOf('<section')
    expect(body.slice(first, body.indexOf('</section>', first))).toMatch(/data-testid="settings-language"/)
  })
})

describe('the language kept: the storage layer (Preferences, with a copy in localStorage)', () => {
  it('the settings that carry the language are copied to iCloud too', () => {
    expect(CLOUD_KEYS[SETTINGS]).toBe('newest')
    expect(CLOUD_KEYS[WELCOME_KEY]).toBe('newest')
  })

  it('written to Preferences and to localStorage at once', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    const d = await launch(prefs, local)
    d.storage.setItem(SETTINGS, EN)
    await d.flush()
    expect(prefs.m.get(SETTINGS)).toBe(EN)
    expect(local.getItem(SETTINGS)).toBe(EN)
  })

  it('the web view\'s storage reclaimed by the system (localStorage empty): the language still there', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    const d = await launch(prefs, local)
    d.storage.setItem(SETTINGS, EN)
    await d.flush()
    local.clear()
    const next = await launch(prefs, local)
    expect(next.storage.getItem(SETTINGS)).toBe(EN)
    expect(local.getItem(SETTINGS)).toBe(EN) // and the copy is written again
  })

  it('an update from a version that kept it in localStorage only (1.0, build 17): moved', async () => {
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    local.setItem(SETTINGS, EN)
    const d = await launch(prefs, local)
    expect(prefs.m.get(SETTINGS)).toBe(EN)
    expect(d.storage.getItem(SETTINGS)).toBe(EN)
  })
})

describe('the language kept: iCloud (the iPhone app)', () => {
  it('a phone that has reached its iCloud copy sends the language a moment after it is chosen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const cloud = new FakeCloud()
      cloud.put('muslim.sources.v1', 3, '{"pins":{}}') // iCloud reached: it holds this person's copy
      const d = await launch(new FakePrefs(), new FakeLocal(), cloud)
      d.storage.setItem(SETTINGS, EN)
      await vi.advanceTimersByTimeAsync(1600)
      expect(cloud.value(SETTINGS)).toBe(EN)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a reinstall (Preferences and localStorage empty) whose iCloud holds the language: there at the first view', async () => {
    const cloud = new FakeCloud()
    cloud.put(SETTINGS, 4, EN)
    const d = await launch(new FakePrefs(), new FakeLocal(), cloud)
    expect(d.storage.getItem(SETTINGS)).toBe(EN)
  })

  it('a reinstall whose iCloud copy comes down after the first view: taken then, and the app opens again once in it', async () => {
    const cloud = new FakeCloud()
    const prefs = new FakePrefs()
    const local = new FakeLocal()
    const reload = vi.fn()
    await launch(prefs, local, cloud, reload)
    cloud.put(SETTINGS, 4, EN)
    cloud.listener!({ reason: 'initial', keys: [SETTINGS] })
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    const next = await launch(prefs, local)
    expect(next.storage.getItem(SETTINGS)).toBe(EN)
  })

  it('nothing at launch waits for the network: main-native.tsx loads the storage and iCloud with their own deadlines, then the app', () => {
    const entry = read('web/src/main-native.tsx')
    expect(entry).toMatch(/hydrateStorage\(\)\s*\.then\(\(\) => startCloud\(\)\)\s*\.catch\(\(\) => undefined\)\s*\.finally\(\(\) => import\('\.\/main\.tsx'\)\)/)
    expect(read('web/src/storage/cloud.ts')).toMatch(/opts\?\.timeoutMs \?\? 1500/)
    expect(read('web/src/storage/device.ts')).toMatch(/deps\.timeoutMs \?\? 2500/)
  })
})

describe('Android: the language in the storage layer alone, kept across a reinstall by Auto Backup', () => {
  it('the SharedPreferences file of the storage layer is not excluded from the backup or the device transfer', () => {
    for (const f of ['web/android/app/src/main/res/xml/backup_rules.xml', 'web/android/app/src/main/res/xml/data_extraction_rules.xml']) {
      const x = read(f).replace(/<!--[\s\S]*?-->/g, '')
      expect(x, f).not.toMatch(/domain="sharedpref"/)
      expect(x, f).not.toMatch(/<include/)
    }
    expect(read('web/android/app/src/main/AndroidManifest.xml')).toMatch(/android:allowBackup="true"/)
  })
})
