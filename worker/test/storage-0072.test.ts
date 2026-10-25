// Add-on 0072-add25: the person's data kept on the device, no account. In the iOS/Android apps every key of the
// inventory lives in @capacitor/preferences (UserDefaults / SharedPreferences), loaded into memory before the first
// render, with localStorage kept as a full copy; the one-time move from 1.0's localStorage; and the backup file.
// These run the storage layer against a fake Preferences and a fake localStorage (the simulator run is in
// relay/w1/0072-storage/README.md).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDeviceStorage, isUserKey, MOVED_KEY, NEWER_KEY, plainPrefs, type PrefsApi } from '../../web/src/storage/device'
import { BACKUP_FORMAT, inBackup, makeBackup, NOT_IN_BACKUP, parseBackup, restoreBackup } from '../../web/src/storage/backup'
import { BACKUP_TEXT } from '../../web/src/storage/backup-strings'
import { nativeEntryHtml } from '../../web/native-build'

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'web/src')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

/** The inventory (README): the 25 keys of web/src that hold the person's data (muslim.review.v1 since bb8ddc2). */
const INVENTORY = [
  'ask.pending',
  'imuslim.downloads.queue.v1',
  'imuslim.downloads.v1',
  'imuslim.reader.v1',
  'imuslim.recitation.options.v1',
  'imuslim.reciter.v1',
  'imuslim.settings.v1',
  'imuslim.starter.v1',
  'imuslim.voiceChat.v1',
  'muslim.adhkar.v1',
  'muslim.adhkarReminders.v1',
  'muslim.alertSound.v1',
  'muslim.goals.v1',
  'muslim.hijri.offset.v1',
  'muslim.lang.v1',
  'muslim.place.v1',
  'muslim.prayed.v1',
  'muslim.prayer.v1',
  'muslim.push.v1',
  'muslim.reading.v1',
  'muslim.review.v1',
  'muslim.shortcuts.order.v1',
  'muslim.sources.v1',
  'muslim.tasbih.v1',
  'muslim.welcome.v1',
]

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

/** UserDefaults / SharedPreferences as the plugin shows them. `failSetAt`: the n-th set (1-based) rejects;
 *  `corrupt`: a key read back with another value; `hang`: nothing ever answers. */
class FakePrefs implements PrefsApi {
  m = new Map<string, string>()
  sets = 0
  failSetAt = 0
  failAllSets = false
  corrupt: string | null = null
  hang = false
  private wait<T>(v: T): Promise<T> {
    return this.hang ? new Promise<T>(() => {}) : Promise.resolve(v)
  }
  async get({ key }: { key: string }) {
    const v = this.m.get(key) ?? null
    return this.wait({ value: key === this.corrupt && v !== null ? v + 'x' : v })
  }
  async set({ key, value }: { key: string; value: string }) {
    this.sets++
    if (this.failAllSets || this.sets === this.failSetAt) throw new Error('UserDefaults refused')
    await this.wait(undefined)
    this.m.set(key, value)
  }
  async remove({ key }: { key: string }) {
    await this.wait(undefined)
    this.m.delete(key)
  }
  async keys() {
    return this.wait({ keys: [...this.m.keys()] })
  }
}

const app = (prefs: FakePrefs, local: FakeLocal | null, timeoutMs = 200) =>
  createDeviceStorage({ native: () => true, prefs: async () => prefs, local: () => local, timeoutMs })

/** What a 1.0 user's localStorage looks like after some weeks (the shapes of build 16, 4a2b510), with a key that is
 *  not the app's. */
function oneZeroUser(): FakeLocal {
  const l = new FakeLocal()
  const put = (k: string, v: unknown) => l.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  put('imuslim.settings.v1', { lang: 'ar', fontSize: 'lg', simple: true, content: 'ar' })
  put('muslim.welcome.v1', '1')
  put('muslim.reading.v1', {
    bookmarks: [{ sura: 18, aya: 10, first: 'إِذۡ أَوَى ٱلۡفِتۡيَةُ إِلَى ٱلۡكَهۡفِ', more: true, at: '2026-10-20T19:02:11.000Z' }],
    notes: [{ sura: 2, aya: 255, text: 'أحفظها قبل النوم — مع أولادي', first: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ', more: true, at: '2026-10-21T21:40:00.000Z' }],
    ward: { days: 30, done: 7, reminder: true },
    favReciters: [7, 102],
  })
  put('muslim.goals.v1', [{ id: 'g1', title: 'قراءة سورة الملك', createdAt: '2026-10-18', doneDays: ['2026-10-18', '2026-10-19', '2026-10-21'], target: 40 }])
  put('muslim.tasbih.v1', { day: '2026-10-24', total: 1033, word: 1, limit: 33, n: 12, custom: '', vibrate: true, after: false, step: 0 })
  put('muslim.place.v1', { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' })
  put('muslim.prayer.v1', { method: 'UmmAlQura', asr: 'shafi' })
  put('muslim.hijri.offset.v1', '0')
  put('imuslim.reader.v1', { mode: 'mushaf', last: { sura: 36, aya: 12 } })
  put('imuslim.reciter.v1', '102')
  put('imuslim.recitation.options.v1', { rate: 1, after: 'next' })
  put('muslim.sources.v1', { pins: { tafsir: 'saadi', hadith: 'best' }, picks: {}, declined: [], tipSeen: true })
  put('imuslim.starter.v1', { read: ['shahada', 'salah'], done: ['shahada'] })
  put('muslim.adhkar.v1', { day: '2026-10-24', n: { 'morning-3': 2 } })
  put('muslim.lang.v1', { prev: 'en', requested: ['swahili'] })
  put('imuslim.downloads.v1', { '102': { '36': 3_456_789, '67': 1_234_567 } })
  put('ask.pending', [{ id: 'q_abc', q: 'ما أركان الإسلام', at: Date.now() }])
  put('workbox-something', 'not ours')
  return l
}
const snapshot = (l: FakeLocal) => new Map(l.m)

describe('1. the inventory: one storage for every file', () => {
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []))
  const code = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '')
  const all = files(SRC)

  it('no file of web/src touches localStorage itself except the storage layer; sessionStorage only for the index tab', () => {
    const direct = all.filter((f) => /\blocalStorage\b/.test(code(f))).map((f) => path.relative(SRC, f))
    expect(direct).toEqual(['storage/device.ts'])
    const session = all.filter((f) => /\bsessionStorage\b/.test(code(f))).map((f) => path.relative(SRC, f))
    expect(session).toEqual(['quran/QuranIndex.tsx'])
    expect(all.filter((f) => /\bindexedDB\b/.test(code(f)))).toEqual([])
  })

  it('every key literal of web/src is in the inventory and is a user key (25); the session tab is not', () => {
    const keys = new Set<string>()
    for (const f of all) for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`](i?muslim\.[A-Za-z0-9_.-]+|ask\.pending)['"`]/g)) keys.add(m[1])
    keys.delete('muslim.index.by')
    expect([...keys].sort()).toEqual([...INVENTORY].sort())
    expect(INVENTORY).toHaveLength(25)
    for (const k of INVENTORY) expect(isUserKey(k)).toBe(true)
    for (const k of [MOVED_KEY, NEWER_KEY, 'workbox-something', 'muslim', 'muslim:widgets', 'ask.pendingx']) expect(isUserKey(k)).toBe(false)
  })

  it('the native build starts from main-native.tsx, which loads the storage before main.tsx; the web keeps main.tsx', () => {
    const entry = read('web/src/main-native.tsx')
    expect(entry).toContain("import { hydrateStorage } from './storage/device'")
    expect(entry).toMatch(/hydrateStorage\(\)\s*\.catch\(\(\) => undefined\)\s*\.finally\(\(\) => import\('\.\/main\.tsx'\)\)/)
    expect(read('web/index.html')).toContain('<script type="module" src="/src/main.tsx"></script>')
    const swapped = nativeEntryHtml(read('web/index.html'))
    expect(swapped).toContain('<script type="module" src="/src/main-native.tsx"></script>')
    expect(swapped).not.toContain('/src/main.tsx')
    const vite = read('web/vite.config.ts')
    expect(vite).toContain('handler: (html) => nativeEntryHtml(html),')
    expect(vite).toContain('native && nativeEntry,')
    expect(read('web/src/main.tsx')).not.toMatch(/hydrateStorage/)
  })

  it('nothing in the storage layer or the backup touches the network', () => {
    for (const f of ['device.ts', 'backup.ts', 'BackupSettings.tsx']) {
      const src = code(path.join(SRC, 'storage', f))
      expect(src).not.toMatch(/fetch\(|\bapi\(|XMLHttpRequest|sendBeacon|WebSocket|\/api\//)
    }
  })
})

describe('2–3. the apps: Preferences, and the one-time move from 1.0', () => {
  it('a 1.0 user: every user key is moved, read back the same, marked; localStorage is left as it was', async () => {
    const local = oneZeroUser()
    const before = snapshot(local)
    const prefs = new FakePrefs()
    const d = app(prefs, local)
    const st = await d.hydrate()
    expect(st.mode).toBe('prefs')
    expect(st.moved).toBe(17)
    expect(st.error).toBeNull()
    for (const [k, v] of before) {
      if (isUserKey(k)) expect(prefs.m.get(k)).toBe(v)
      else expect(prefs.m.has(k)).toBe(false)
    }
    expect(JSON.parse(prefs.m.get(MOVED_KEY)!)).toMatchObject({ v: 1, keys: 17 })
    expect(snapshot(local)).toEqual(before)
    expect(JSON.parse(d.storage.getItem('muslim.reading.v1')!).notes[0].text).toBe('أحفظها قبل النوم — مع أولادي')
    expect(d.status().early).toEqual([])
  })

  it('after a wiped web view the data is all there, from Preferences, and localStorage is written again', async () => {
    const prefs = new FakePrefs()
    await app(prefs, oneZeroUser()).hydrate()
    const wiped = new FakeLocal()
    const d = app(prefs, wiped)
    const st = await d.hydrate()
    expect(st.mode).toBe('prefs')
    expect(st.moved).toBeNull()
    const reading = JSON.parse(d.storage.getItem('muslim.reading.v1')!)
    expect(reading.bookmarks[0]).toMatchObject({ sura: 18, aya: 10 })
    expect(reading.ward.done).toBe(7)
    expect(JSON.parse(d.storage.getItem('muslim.goals.v1')!)[0].doneDays).toHaveLength(3)
    expect(d.storage.getItem('muslim.welcome.v1')).toBe('1')
    expect(wiped.getItem('muslim.tasbih.v1')).toBe(prefs.m.get('muslim.tasbih.v1'))
    expect(wiped.length).toBe(17)
  })

  it('writes go to memory, to Preferences in order and to localStorage; the next launch reads Preferences', async () => {
    const prefs = new FakePrefs()
    const local = oneZeroUser()
    const d = app(prefs, local)
    await d.hydrate()
    d.storage.setItem('muslim.welcome.v1', '1')
    d.storage.setItem('muslim.tasbih.v1', '{"n":1}')
    d.storage.setItem('muslim.tasbih.v1', '{"n":2}')
    d.storage.removeItem('ask.pending')
    d.storage.setItem('muslim.prayed.v1', '{"2026-10-25":["fajr"]}')
    expect(d.storage.getItem('muslim.tasbih.v1')).toBe('{"n":2}')
    await d.flush()
    expect(prefs.m.get('muslim.tasbih.v1')).toBe('{"n":2}')
    expect(prefs.m.has('ask.pending')).toBe(false)
    expect(local.getItem('muslim.prayed.v1')).toBe('{"2026-10-25":["fajr"]}')
    expect(local.getItem('ask.pending')).toBeNull()
    const next = app(prefs, new FakeLocal())
    await next.hydrate()
    expect(next.storage.getItem('muslim.tasbih.v1')).toBe('{"n":2}')
    expect(next.storage.getItem('muslim.prayed.v1')).toBe('{"2026-10-25":["fajr"]}')
    expect(next.storage.getItem('ask.pending')).toBeNull()
  })

  it('a move that fails halfway: the app runs on localStorage with nothing lost; the next launch moves it whole', async () => {
    const local = oneZeroUser()
    const prefs = new FakePrefs()
    prefs.failSetAt = 6 // five keys are in Preferences, then UserDefaults refuses
    const first = app(prefs, local)
    const st = await first.hydrate()
    expect(st.mode).toBe('local')
    expect(st.error).toMatch(/UserDefaults refused/)
    expect(prefs.m.size).toBe(5)
    expect(prefs.m.has(MOVED_KEY)).toBe(false)
    expect(local.getItem(NEWER_KEY)).not.toBeNull()
    // The app works as before, on localStorage: the person's data is there, and what they do is kept.
    expect(JSON.parse(first.storage.getItem('muslim.reading.v1')!).favReciters).toEqual([7, 102])
    const movedFirst = [...prefs.m.keys()][0]
    first.storage.removeItem(movedFirst)
    first.storage.setItem('muslim.goals.v1', '[]')
    await first.flush()
    expect(local.getItem('muslim.goals.v1')).toBe('[]')
    expect(prefs.sets).toBe(6) // nothing written to Preferences while it runs on localStorage
    // The next launch: Preferences works again.
    prefs.failSetAt = 0
    const second = app(prefs, local)
    const st2 = await second.hydrate()
    expect(st2.mode).toBe('prefs')
    expect(st2.moved).toBe(16)
    expect(prefs.m.has(movedFirst)).toBe(false) // removed in the meantime: not brought back
    expect(prefs.m.get('muslim.goals.v1')).toBe('[]')
    expect(local.getItem(NEWER_KEY)).toBeNull()
    for (const [k, v] of local.m) if (isUserKey(k)) expect(prefs.m.get(k)).toBe(v)
    // And after that, a wiped web view loses nothing.
    const third = app(prefs, new FakeLocal())
    await third.hydrate()
    expect(third.storage.getItem('muslim.goals.v1')).toBe('[]')
    expect(third.storage.getItem(movedFirst)).toBeNull()
  })

  it('a value that does not read back the same is not marked moved; the app stays on localStorage', async () => {
    const local = oneZeroUser()
    const prefs = new FakePrefs()
    prefs.corrupt = 'muslim.reading.v1'
    const st = await app(prefs, local).hydrate()
    expect(st.mode).toBe('local')
    expect(st.error).toMatch(/not the same after the move: muslim\.reading\.v1/)
    expect(prefs.m.has(MOVED_KEY)).toBe(false)
  })

  it('Preferences that never answers: the app starts on localStorage after the wait, and the move is never marked late', async () => {
    const local = oneZeroUser()
    const prefs = new FakePrefs()
    prefs.hang = true
    const t0 = Date.now()
    const d = app(prefs, local, 50)
    const st = await d.hydrate()
    expect(Date.now() - t0).toBeLessThan(1000)
    expect(st.mode).toBe('local')
    expect(st.error).toMatch(/no answer/)
    expect(d.storage.getItem('imuslim.reciter.v1')).toBe('102')
    expect(prefs.m.has(MOVED_KEY)).toBe(false)
  })

  it('Capacitor’s plugin Proxy answers `then` too: handed over raw it is taken for a promise and fails; wrapped, it works', async () => {
    // As @capacitor/core's registerPlugin: every property is a native method, `then` included («not implemented»).
    const fake = new FakePrefs()
    const proxy = new Proxy({} as PrefsApi, {
      get: (_, prop) =>
        prop === 'then'
          ? (_ok: unknown, no: (e: Error) => void) => no(new Error('"Preferences.then()" is not implemented on ios'))
          : (o: never) => (fake as unknown as Record<string, (o: never) => unknown>)[prop as string](o),
    })
    const raw = await app(fake, oneZeroUser()).hydrate.call(null)
    expect(raw.mode).toBe('prefs') // the fake itself is a plain object
    const local = oneZeroUser()
    const bad = createDeviceStorage({ native: () => true, prefs: async () => proxy, local: () => local })
    const st = await bad.hydrate()
    expect(st.mode).toBe('local')
    expect(st.error).toMatch(/then\(\)" is not implemented/)
    expect(local.getItem(NEWER_KEY)).toMatch(/then\(\)" is not implemented/)
    const good = createDeviceStorage({ native: () => true, prefs: async () => plainPrefs(proxy), local: () => local })
    expect((await good.hydrate()).mode).toBe('prefs')
    expect(fake.m.get('muslim.welcome.v1')).toBe('1')
    expect(read('web/src/storage/device.ts')).toContain("prefs: async () => plainPrefs((await import('@capacitor/preferences')).Preferences),")
  })

  it('a plugin missing from the app (Preferences rejects): localStorage, as before', async () => {
    const local = oneZeroUser()
    const d = createDeviceStorage({ native: () => true, prefs: async () => Promise.reject(new Error('"Preferences" plugin is not implemented on ios')), local: () => local })
    const st = await d.hydrate()
    expect(st.mode).toBe('local')
    expect(d.storage.getItem('muslim.welcome.v1')).toBe('1')
    d.storage.setItem('muslim.welcome.v1', '1')
    expect(local.getItem('muslim.welcome.v1')).toBe('1')
  })

  it('a write Preferences refuses later is in localStorage, marked newer: the next launch moves localStorage again', async () => {
    const local = oneZeroUser()
    const prefs = new FakePrefs()
    const d = app(prefs, local)
    await d.hydrate()
    prefs.failAllSets = true
    d.storage.setItem('muslim.goals.v1', '[{"id":"g2","title":"x","createdAt":"2026-10-25","doneDays":[]}]')
    await d.flush()
    expect(d.status().failedWrites).toBe(1)
    expect(local.getItem(NEWER_KEY)).not.toBeNull()
    prefs.failAllSets = false
    const next = app(prefs, local)
    const st = await next.hydrate()
    expect(st.moved).toBe(17)
    expect(prefs.m.get('muslim.goals.v1')).toContain('"g2"')
  })

  it('a fresh install: nothing to move, marked, and the first write is kept', async () => {
    const prefs = new FakePrefs()
    const d = app(prefs, new FakeLocal())
    expect((await d.hydrate()).moved).toBe(0)
    d.storage.setItem('muslim.welcome.v1', '1')
    await d.flush()
    expect(prefs.m.get('muslim.welcome.v1')).toBe('1')
  })

  it('before the storage is ready, a read is counted as early (main-native.tsx keeps this list empty)', async () => {
    const local = oneZeroUser()
    const d = app(new FakePrefs(), local)
    expect(d.storage.getItem('muslim.welcome.v1')).toBe('1')
    expect(d.status()).toMatchObject({ mode: 'waiting', early: ['muslim.welcome.v1'] })
  })

  it('the web: localStorage itself, unchanged, errors included', async () => {
    const local = oneZeroUser()
    const g = globalThis as { localStorage?: Storage }
    const was = g.localStorage
    g.localStorage = local
    try {
      const d = createDeviceStorage({ native: () => false, prefs: async () => Promise.reject(new Error('never asked')), local: () => local })
      expect((await d.hydrate()).mode).toBe('web')
      d.storage.setItem('muslim.welcome.v1', '0')
      expect(local.getItem('muslim.welcome.v1')).toBe('0')
      g.localStorage = { getItem: () => { throw new Error('SecurityError') } } as unknown as Storage
      expect(() => d.storage.getItem('x')).toThrow('SecurityError')
    } finally {
      g.localStorage = was
    }
  })
})

describe('5. «نسخة احتياطية من بياناتي» and «استعادة»', () => {
  const entries = () => new Map([...oneZeroUser().m].filter(([k]) => isUserKey(k)))

  it('the file: this app’s format, the person’s data, without what belongs to this device alone', () => {
    const b = makeBackup(entries(), new Date('2026-10-25T10:00:00Z'))
    expect(b.format).toBe(BACKUP_FORMAT)
    expect(b.v).toBe(1)
    expect(Object.keys(b.data)).not.toContain('imuslim.downloads.v1')
    expect(Object.keys(b.data)).not.toContain('ask.pending')
    expect([...NOT_IN_BACKUP].sort()).toEqual(['ask.pending', 'imuslim.downloads.queue.v1', 'imuslim.downloads.v1', 'muslim.review.v1'])
    expect(Object.keys(b.data)).not.toContain('workbox-something')
    expect(Object.keys(b.data)).toHaveLength(15)
    const back = parseBackup(JSON.stringify(b, null, 1))
    expect(back.ok && back.data).toEqual(b.data)
  })

  it('strict: anything that is not exactly such a file is refused, and nothing is touched', () => {
    const good = makeBackup(entries())
    const bad = (o: unknown) => parseBackup(typeof o === 'string' ? o : JSON.stringify(o))
    expect(bad('')).toEqual({ ok: false, reason: 'size' })
    expect(bad('x'.repeat(2 * 1024 * 1024 + 1))).toEqual({ ok: false, reason: 'size' })
    expect(bad('{not json')).toEqual({ ok: false, reason: 'json' })
    expect(bad([])).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, format: 'other' })).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, v: 2 })).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, extra: 1 })).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, created: 'yesterday' })).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, data: {} })).toEqual({ ok: false, reason: 'shape' })
    expect(bad({ ...good, data: { ...good.data, 'evil.key': '1' } })).toEqual({ ok: false, reason: 'key' })
    expect(bad({ ...good, data: { ...good.data, 'storage.moved.v1': '1' } })).toEqual({ ok: false, reason: 'key' })
    expect(bad({ ...good, data: { ...good.data, 'imuslim.downloads.v1': '{}' } })).toEqual({ ok: false, reason: 'key' })
    expect(bad({ ...good, data: { ...good.data, 'muslim.welcome.v1': 1 } })).toEqual({ ok: false, reason: 'value' })
    expect(bad({ ...good, data: { ...good.data, 'muslim.goals.v1': '[{' } })).toEqual({ ok: false, reason: 'value' })
    expect(bad({ ...good, data: { ...good.data, 'muslim.goals.v1': '"' + 'x'.repeat(600_000) + '"' } })).toEqual({ ok: false, reason: 'value' })
  })

  it('restoring on another phone: the file’s keys are written and kept in Preferences; the rest stays', async () => {
    const file = JSON.stringify(makeBackup(entries()))
    const prefs = new FakePrefs()
    const phone = app(prefs, new FakeLocal())
    await phone.hydrate()
    phone.storage.setItem('imuslim.downloads.v1', '{"7":{"1":10}}')
    const p = parseBackup(file)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    await restoreBackup(p.data, phone.storage, phone.flush)
    expect(JSON.parse(prefs.m.get('muslim.reading.v1')!).bookmarks).toHaveLength(1)
    expect(prefs.m.get('imuslim.downloads.v1')).toBe('{"7":{"1":10}}')
    for (const k of Object.keys(p.data)) expect(inBackup(k)).toBe(true)
  })

  it('its texts in the ten languages, without exclamation marks; the section only in the app', () => {
    for (const l of LANGS) {
      const t = BACKUP_TEXT[l]
      for (const v of Object.values(t)) {
        expect(v.length).toBeGreaterThan(0)
        expect(v).not.toMatch(/[!！]/)
      }
    }
    expect(BACKUP_TEXT.ar.backup).toBe('نسخة احتياطية من بياناتي')
    expect(BACKUP_TEXT.ar.restore).toBe('استعادة من نسخة')
    expect(read('web/src/components/Sheets.tsx')).toContain('{isNative() && <BackupSettings lang={lang} />}')
  })
})

describe('2, 4. the plugin and the backups of the phone', () => {
  it('@capacitor/preferences at Capacitor 8, in both apps', async () => {
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@capacitor/preferences']).toBe('8.0.1')
    const { IOS_PLUGINS } = await import('../../web/capacitor.config')
    expect(IOS_PLUGINS).toContain('@capacitor/preferences')
    expect(read('web/ios/App/CapApp-SPM/Package.swift')).toContain('.package(name: "CapacitorPreferences", path: "../../../node_modules/@capacitor/preferences")')
    expect(read('web/android/capacitor.settings.gradle')).toContain("project(':capacitor-preferences').projectDir = new File('../node_modules/@capacitor/preferences/android')")
    expect(read('docs/COMPONENTS.csv')).toMatch(/^library,@capacitor\/preferences 8\.0\.1,/m)
  })

  it('Android Auto Backup keeps the SharedPreferences: allowed, and the rules only leave out the two downloaded folders', () => {
    const manifest = read('web/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('android:allowBackup="true"')
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"')
    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"')
    for (const f of ['backup_rules.xml', 'data_extraction_rules.xml']) {
      const x = read(`web/android/app/src/main/res/xml/${f}`).replace(/<!--[\s\S]*?-->/g, '')
      // An <include> would back up only what it names; none, so everything but the excluded folders is kept.
      expect(x).not.toMatch(/<include\b/)
      expect(x).not.toMatch(/domain="sharedpref"/)
      expect([...x.matchAll(/<exclude domain="([a-z]+)" path="([^"]+)" \/>/g)].map((m) => `${m[1]}:${m[2]}`).every((e) => ['file:muslim-offline/', 'file:Application Support/recitations/'].includes(e))).toBe(true)
    }
  })
})
