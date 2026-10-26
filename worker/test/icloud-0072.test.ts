// Add-on 0072-add34 §ب2: a copy in the person's own iCloud (NSUbiquitousKeyValueStore), no sign-in, iPhone only.
// The merge rules run against a fake iCloud store and the real storage layer (with a fake Preferences); the Swift
// plugin, the entitlement and the registration are read from the project.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createDeviceStorage, isUserKey, STAMPS_KEY, type PrefsApi } from '../../web/src/storage/device'
import { alive, canon, CLOUD_KEYS, ICLOUD_SYNC, listWrite, MAX_CLOUD_VALUE, mergeKey, mergeOnce, newer, readStamps, startCloud, toCloud, type CloudApi, type Entry } from '../../web/src/storage/cloud'
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
  put(key: string, c: number, v: string | null, t = c, d = 'zz', x: Record<string, { c: number; t: number }> = {}, a: Record<string, number> = {}) {
    this.m.set(key, JSON.stringify({ c, t, d, v, x, a }))
  }
  entry(key: string) {
    return JSON.parse(this.m.get(key) ?? 'null') as Entry | null
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

const bm = (sura: number, aya: number, at: string) => ({ sura, aya, first: 'x', more: false, at })
const reading = (bookmarks: unknown[], ward = { days: 30, done: 7, reminder: false }, notes: unknown[] = []) => JSON.stringify({ bookmarks, notes, ward, favReciters: [] })
const goal = (id: string, createdAt: string, doneDays: string[]) => ({ id, title: `goal ${id}`, createdAt, doneDays })
const merge = (p: Awaited<ReturnType<typeof phone>>, cloud: FakeCloud, now = Date.now()) => mergeOnce({ storage: p.storage, cloud, setApplying: noApply, now: () => now })
const bookmarksOf = (p: Awaited<ReturnType<typeof phone>>) => (JSON.parse(p.storage.getItem('muslim.reading.v1')!).bookmarks as { sura: number; aya: number }[]).map((b) => `${b.sura}:${b.aya}`).sort()

describe('what goes to iCloud', () => {
  it('the tasbih, the bookmarks and portion, the goals, the settings and «طريق البداية»; not the place, the notes, the «صليت» log, the alerts or what belongs to the device', () => {
    const keys = Object.keys(CLOUD_KEYS)
    for (const k of keys) {
      expect(isUserKey(k)).toBe(true)
      expect(inBackup(k)).toBe(true)
    }
    for (const k of ['muslim.tasbih.v1', 'muslim.reading.v1', 'muslim.goals.v1', 'imuslim.settings.v1', 'imuslim.starter.v1']) expect(keys).toContain(k)
    for (const k of ['muslim.place.v1', 'muslim.prayed.v1', 'muslim.push.v1', 'muslim.adhkarReminders.v1', 'muslim.alertSound.v1', 'muslim.review.v1', 'imuslim.downloads.v1', 'ask.pending', 'muslim.lang.v1'])
      expect(keys).not.toContain(k)
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(128)
    const out = JSON.parse(toCloud('muslim.reading.v1', READING)!)
    expect(out.notes).toBeUndefined()
    expect(out.bookmarks).toHaveLength(1)
  })

  it('versions: the counter first (a late clock does not always lose), then the time, then the device; two held-before values never replace each other', () => {
    expect(newer({ c: 5, t: 100, d: 'a' }, { c: 4, t: 999_999, d: 'b' })).toBe(true)
    expect(newer({ c: 4, t: 200, d: 'a' }, { c: 4, t: 100, d: 'b' })).toBe(true)
    expect(newer({ c: 4, t: 100, d: 'b' }, { c: 4, t: 100, d: 'a' })).toBe(true)
    expect(newer({ c: 0, t: 0, d: 'b' }, { c: 0, t: 0, d: 'a' })).toBe(false)
    expect(newer({ c: 1, t: 0, d: 'a' }, { c: 0, t: 0, d: 'b' })).toBe(true)
    expect(canon('{"b":1,"a":[{"y":2,"x":1}]}')).toBe(canon('{"a":[{"x":1,"y":2}],"b":1}'))
  })

  it('a deletion is a tombstone at its counter; an item added again at a higher counter stays', () => {
    const before = reading([bm(1, 1, '2026-10-20T00:00:00Z'), bm(2, 2, '2026-10-21T00:00:00Z')])
    const after = reading([bm(2, 2, '2026-10-21T00:00:00Z')])
    const t = Date.parse('2026-10-26T00:00:00Z')
    const w = listWrite('muslim.reading.v1', before, after, {}, { '1:1': 0, '2:2': 0 }, 7, t)
    expect(w.x).toEqual({ '1:1': { c: 7, t } })
    expect(alive(w.x, w.a, '1:1')).toBe(false)
    const back = listWrite('muslim.reading.v1', after, before, w.x, w.a, 8, t + 60_000)
    expect(back.x).toEqual({})
    expect(back.a['1:1']).toBe(8)
    // kept 120 days, then dropped
    expect(listWrite('muslim.reading.v1', after, after, w.x, w.a, 9, Date.parse('2027-03-01T00:00:00Z')).x).toEqual({})
  })
})

describe('two copies become one: nothing a phone holds is replaced by another phone’s', () => {
  it('Q1: two phones upgraded from 1.0 with different data; A sends, then B: B keeps all its own, and has A’s as well', async () => {
    const A = await phone({
      'muslim.reading.v1': reading([bm(1, 1, '2026-10-01T00:00:00Z')], { days: 30, done: 3, reminder: false }, [{ sura: 9, aya: 9, text: 'A note' }]),
      'muslim.goals.v1': JSON.stringify([goal('ga', '2026-10-01', ['2026-10-02'])]),
      'imuslim.settings.v1': '{"lang":"en"}',
    })
    const B = await phone({
      'muslim.reading.v1': reading([bm(2, 255, '2026-10-05T00:00:00Z')], { days: 30, done: 12, reminder: true }, [{ sura: 2, aya: 255, text: 'B note' }]),
      'muslim.goals.v1': JSON.stringify([goal('gb', '2026-10-03', ['2026-10-04', '2026-10-05'])]),
      'imuslim.settings.v1': '{"lang":"ar"}',
    })
    const cloud = new FakeCloud()
    const t0 = Date.parse('2026-10-26T00:00:00Z')
    await merge(A, cloud, t0) // iCloud empty: nothing sent on the very first launch
    await merge(A, cloud, t0 + 3_600_000) // the next launch makes the copy
    expect(cloud.entry('muslim.reading.v1')!.c).toBe(0)
    await merge(B, cloud, t0 + 7_200_000)
    expect(bookmarksOf(B)).toEqual(['1:1', '2:255'])
    const rb = JSON.parse(B.storage.getItem('muslim.reading.v1')!)
    expect(rb.ward).toMatchObject({ days: 30, done: 12, reminder: true })
    expect(rb.notes.map((n: { text: string }) => n.text)).toEqual(['B note'])
    expect((JSON.parse(B.storage.getItem('muslim.goals.v1')!) as { id: string }[]).map((g) => g.id).sort()).toEqual(['ga', 'gb'])
    expect(B.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"ar"}') // a 1.0 setting is never replaced
    // A's next launch: A has B's too, and keeps its own; both settle (nothing more to send).
    await merge(A, cloud, t0 + 10_800_000)
    expect(bookmarksOf(A)).toEqual(['1:1', '2:255'])
    expect(JSON.parse(A.storage.getItem('muslim.reading.v1')!).notes[0].text).toBe('A note')
    expect(JSON.parse(A.storage.getItem('muslim.reading.v1')!).ward.done).toBe(12)
    expect(A.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"en"}')
    cloud.sets = []
    await merge(B, cloud, t0 + 14_400_000)
    await merge(A, cloud, t0 + 18_000_000)
    expect(cloud.sets).toEqual([])
  })

  it('Q2: both reach an empty iCloud and send; neither loses its bookmarks on the next launches', async () => {
    const A = await phone({ 'muslim.reading.v1': reading([bm(1, 1, '2026-10-01T00:00:00Z')]) })
    const B = await phone({ 'muslim.reading.v1': reading([bm(3, 3, '2026-10-02T00:00:00Z')]) })
    const cloud = new FakeCloud()
    const t0 = Date.parse('2026-10-26T00:00:00Z')
    await merge(A, cloud, t0)
    await merge(B, cloud, t0)
    await merge(A, cloud, t0 + 3_600_000) // A sends its own
    const late = new FakeCloud() // B's send lands on a copy without A's, then iCloud keeps B's (last writer)
    await merge(B, late, t0 + 3_600_000)
    cloud.m.set('muslim.reading.v1', late.m.get('muslim.reading.v1')!)
    await merge(A, cloud, t0 + 7_200_000)
    await merge(B, cloud, t0 + 7_300_000)
    expect(bookmarksOf(A)).toEqual(['1:1', '3:3'])
    expect(bookmarksOf(B)).toEqual(['1:1', '3:3'])
  })

  it('a deletion on one phone travels and is not brought back by the other', async () => {
    const cloud = new FakeCloud()
    const both = reading([bm(1, 1, '2026-10-01T00:00:00Z'), bm(2, 2, '2026-10-02T00:00:00Z')])
    cloud.put('muslim.reading.v1', 3, toCloud('muslim.reading.v1', both), 1000, 'a')
    const B = await phone({ 'muslim.reading.v1': both })
    B.storage.setItem(STAMPS_KEY, JSON.stringify({ dev: 'b', clock: 3, init: true, contact: true, keys: { 'muslim.reading.v1': { c: 3, t: 1000, d: 'a' } }, x: {}, a: { 'muslim.reading.v1': { '1:1': 0, '2:2': 0 } }, own: { 'muslim.reading.v1': true }, ownItems: { 'muslim.reading.v1': ['1:1', '2:2'] } }))
    // A deleted 1:1 later (counter 4), with its tombstone
    cloud.put('muslim.reading.v1', 4, toCloud('muslim.reading.v1', reading([bm(2, 2, '2026-10-02T00:00:00Z')])), 2000, 'a', { '1:1': { c: 4, t: Date.parse('2026-10-25T00:00:00Z') } }, { '2:2': 0 })
    await merge(B, cloud, Date.parse('2026-10-26T00:00:00Z'))
    expect(bookmarksOf(B)).toEqual(['2:2'])
    // and B added 1:1 again afterwards: newer than the tombstone, it stays
    const again = reading([bm(1, 1, '2026-10-27T00:00:00Z'), bm(2, 2, '2026-10-02T00:00:00Z')])
    const m = mergeKey('muslim.reading.v1', { v: again, ver: { c: 6, t: 3000, d: 'b' }, a: { '1:1': 6, '2:2': 0 } }, cloud.entry('muslim.reading.v1')!, false, Date.parse('2026-10-28T00:00:00Z'))
    expect((JSON.parse(m.v!).bookmarks as unknown[]).length).toBe(2)
  })

  it('tombstones go by the counter, not the clock: a phone six days ahead deletes, another re-adds a day later after seeing it; it stays', async () => {
    const ahead = Date.parse('2026-11-01T00:00:00Z')
    const cloud = new FakeCloud()
    // A (clock six days ahead) deleted 1:1 at counter 10
    cloud.put('muslim.reading.v1', 10, toCloud('muslim.reading.v1', reading([bm(2, 2, '2026-10-02T00:00:00Z')])), ahead, 'a', { '1:1': { c: 10, t: ahead } }, { '2:2': 0 })
    const B = await phone({ 'muslim.reading.v1': reading([bm(2, 2, '2026-10-02T00:00:00Z')]) })
    let wrote: (k: string) => void = () => {}
    const now = Date.parse('2026-10-27T00:00:00Z')
    await startCloud({ cloud, storage: B.storage, onWrite: (f) => (wrote = f), ios: true, ready: () => true, now: () => now })
    B.storage.setItem('muslim.reading.v1', reading([bm(1, 1, '2026-10-27T00:00:00Z'), bm(2, 2, '2026-10-02T00:00:00Z')]))
    wrote('muslim.reading.v1')
    const st = readStamps(B.storage.getItem(STAMPS_KEY))
    expect(st.a['muslim.reading.v1']['1:1']).toBeGreaterThan(10)
    // A merges B's write: the bookmark stays on both
    const m = mergeKey('muslim.reading.v1', { v: reading([bm(2, 2, '2026-10-02T00:00:00Z')]), ver: { c: 10, t: ahead, d: 'a' }, x: { '1:1': { c: 10, t: ahead } }, a: { '2:2': 0 } }, { c: st.keys['muslim.reading.v1'].c, t: now, d: st.dev, v: toCloud('muslim.reading.v1', B.storage.getItem('muslim.reading.v1')), x: st.x['muslim.reading.v1'], a: st.a['muslim.reading.v1'] }, false, ahead)
    expect((JSON.parse(m.v!).bookmarks as { sura: number }[]).map((b) => b.sura).sort()).toEqual([1, 2])
  })

  it('clock skew: a phone whose clock is days late still wins with a write made after it saw the other’s', async () => {
    const cloud = new FakeCloud()
    cloud.put('imuslim.settings.v1', 7, '{"lang":"fr"}', Date.parse('2026-10-26T00:00:00Z'), 'a')
    const late = await phone({ 'imuslim.settings.v1': '{"lang":"fr"}' })
    late.storage.setItem(STAMPS_KEY, JSON.stringify({ dev: 'b', clock: 7, init: true, contact: true, keys: { 'imuslim.settings.v1': { c: 7, t: Date.parse('2026-10-26T00:00:00Z'), d: 'a' } }, x: {}, own: { 'imuslim.settings.v1': true } }))
    let wrote: (k: string) => void = () => {}
    await startCloud({ cloud, storage: late.storage, onWrite: (f) => (wrote = f), ios: true, ready: () => true, now: () => Date.parse('2026-10-20T00:00:00Z') })
    late.storage.setItem('imuslim.settings.v1', '{"lang":"tr"}')
    wrote('imuslim.settings.v1')
    const st = readStamps(late.storage.getItem(STAMPS_KEY))
    expect(st.keys['imuslim.settings.v1'].c).toBe(8)
    expect(newer(st.keys['imuslim.settings.v1'], cloud.entry('imuslim.settings.v1')!)).toBe(true)
  })

  it('a new phone: what the app wrote by itself before its first contact gives way; the tasbih keeps the larger count', async () => {
    const cloud = new FakeCloud()
    cloud.put('imuslim.settings.v1', 9, '{"lang":"en","fontSize":"lg"}', 1, 'a')
    cloud.put('muslim.tasbih.v1', 9, TASBIH({ total: 1033 }), 1, 'a')
    cloud.put('muslim.reading.v1', 9, toCloud('muslim.reading.v1', READING), 1, 'a')
    const p = await phone({})
    p.storage.setItem('imuslim.settings.v1', '{"lang":"ar","fontSize":"md"}')
    p.storage.setItem('muslim.tasbih.v1', TASBIH({ total: 4 }))
    p.storage.setItem(STAMPS_KEY, JSON.stringify({ dev: 'n', clock: 2, init: true, contact: false, keys: { 'imuslim.settings.v1': { c: 1, t: 5, d: 'n', pre: true }, 'muslim.tasbih.v1': { c: 2, t: 6, d: 'n', pre: true } }, x: {}, own: { 'imuslim.settings.v1': true, 'muslim.tasbih.v1': true } }))
    const r = await merge(p, cloud)
    expect(r.contact).toBe(true)
    expect(JSON.parse(p.storage.getItem('imuslim.settings.v1')!).fontSize).toBe('lg')
    expect(JSON.parse(p.storage.getItem('muslim.tasbih.v1')!).total).toBe(1033)
    expect(JSON.parse(p.storage.getItem('muslim.reading.v1')!).notes).toEqual([])
    expect(bookmarksOf(p)).toEqual(['18:10'])
  })

  it('a 1.0 phone whose settings are written again unchanged on every open, then changed by the person: both kept at the first contact against counter 5', async () => {
    const cloud = new FakeCloud()
    const p = await phone({ 'imuslim.settings.v1': '{"lang":"ar","fontSize":"lg","simple":false,"content":"ar"}' })
    let wrote: (k: string) => void = () => {}
    await startCloud({ cloud, storage: p.storage, onWrite: (f) => (wrote = f), ios: true, ready: () => true }) // iCloud empty
    // useSettings writes the same value on open: no write
    p.storage.setItem('imuslim.settings.v1', '{"content":"ar","fontSize":"lg","lang":"ar","simple":false}')
    wrote('imuslim.settings.v1')
    expect(readStamps(p.storage.getItem(STAMPS_KEY)).keys['imuslim.settings.v1']).toBeUndefined()
    // the person changes the size
    p.storage.setItem('imuslim.settings.v1', '{"lang":"ar","fontSize":"xl","simple":false,"content":"ar"}')
    wrote('imuslim.settings.v1')
    // another phone's settings at counter 5 reach this phone's first contact
    cloud.put('imuslim.settings.v1', 5, '{"lang":"en","fontSize":"md","simple":false,"content":"en"}', 1, 'a')
    await merge(p, cloud)
    expect(JSON.parse(p.storage.getItem('imuslim.settings.v1')!)).toMatchObject({ lang: 'ar', fontSize: 'xl' })
    // and a later change on the other phone (above every counter this phone has seen) does reach it
    cloud.put('imuslim.settings.v1', 9, '{"lang":"en","fontSize":"md","simple":false,"content":"en"}', 2, 'a')
    await merge(p, cloud)
    expect(JSON.parse(p.storage.getItem('imuslim.settings.v1')!).lang).toBe('en')
  })

  it('another iCloud account: a first contact again; what came only from the previous account is never sent to the new one', async () => {
    const old = new FakeCloud()
    old.put('muslim.reading.v1', 4, toCloud('muslim.reading.v1', reading([bm(9, 9, '2026-10-01T00:00:00Z')])), 1, 'other', {}, { '9:9': 1 })
    old.put('muslim.sources.v1', 4, '{"pins":{"tafsir":"saadi"}}', 1, 'other')
    const p = await phone({ 'muslim.reading.v1': reading([bm(1, 1, '2026-10-02T00:00:00Z')]), 'imuslim.settings.v1': '{"lang":"ar"}' })
    await merge(p, old)
    expect(bookmarksOf(p)).toEqual(['1:1', '9:9'])
    expect(p.storage.getItem('muslim.sources.v1')).toBe('{"pins":{"tafsir":"saadi"}}')
    // the device signs in to another account, whose iCloud has its own settings and nothing else
    const next = new FakeCloud()
    next.put('muslim.sources.v1', 2, '{"pins":{"tafsir":"muyassar"}}', 1, 'n')
    const r = await mergeOnce({ storage: p.storage, cloud: next, setApplying: noApply, newAccount: true })
    expect(r.contact).toBe(true)
    // a value that came only from the previous account gives way to the new account's
    expect(p.storage.getItem('muslim.sources.v1')).toBe('{"pins":{"tafsir":"muyassar"}}')
    // this phone's own data stays and goes up; the previous account's bookmark stays on the phone and does not
    expect(bookmarksOf(p)).toEqual(['1:1', '9:9'])
    const up = next.entry('muslim.reading.v1')!
    expect((JSON.parse(up.v!).bookmarks as { sura: number }[]).map((b) => b.sura)).toEqual([1])
    expect(next.entry('imuslim.settings.v1')!.v).toBe('{"lang":"ar"}')
  })

  it('a value over 64 KB stays on the device', async () => {
    const cloud = new FakeCloud()
    cloud.put('muslim.welcome.v1', 5, '1')
    const big = JSON.stringify([{ id: 'g', title: 'x'.repeat(MAX_CLOUD_VALUE), createdAt: '2026-10-25', doneDays: [] }])
    const p = await phone({ 'muslim.goals.v1': big })
    p.storage.setItem(STAMPS_KEY, JSON.stringify({ dev: 'p', clock: 10, init: true, contact: true, keys: { 'muslim.goals.v1': { c: 10, t: 10, d: 'p' } }, x: {}, own: { 'muslim.goals.v1': true }, ownItems: { 'muslim.goals.v1': ['g'] } }))
    const r = await merge(p, cloud)
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

  it('a first merge slower than 1.5 s is dropped: nothing written after the first view read its data; the initial copy then reloads once', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      const cloud = new FakeCloud()
      cloud.put('muslim.reading.v1', 9, toCloud('muslim.reading.v1', reading([bm(7, 7, '2026-10-01T00:00:00Z')])), 1, 'a')
      const slow = cloud.getAll.bind(cloud)
      let release: () => void = () => {}
      cloud.getAll = () => new Promise((r) => (release = () => void slow().then(r)))
      const p = await phone({})
      const reload = vi.fn()
      const started = startCloud({ cloud, storage: p.storage, onWrite: p.onWrite, reload, ios: true, ready: () => true })
      await vi.advanceTimersByTimeAsync(1600)
      expect(await started).toBeNull()
      // the screens read their (empty) data; the slow answer comes now: nothing of it is written
      release()
      await vi.advanceTimersByTimeAsync(10)
      expect(p.storage.getItem('muslim.reading.v1')).toBeNull()
      expect(cloud.sets).toEqual([])
      // iCloud's copy coming down (initial sync): merged, and the app opens again once with it
      cloud.getAll = slow
      cloud.listener!({ reason: 'initial', keys: ['muslim.reading.v1'] })
      await vi.advanceTimersByTimeAsync(10)
      expect(bookmarksOf(p)).toEqual(['7:7'])
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a write is stamped one past the highest counter, sent a moment later with its tombstones; a server change waits for the next launch', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
      const cloud = new FakeCloud()
      cloud.put('muslim.reading.v1', 4, toCloud('muslim.reading.v1', reading([bm(1, 1, '2026-10-01T00:00:00Z'), bm(2, 2, '2026-10-02T00:00:00Z')])), 1, 'a')
      const p = await phone({})
      await startCloud({ cloud, storage: p.storage, onWrite: p.onWrite, reload: () => {}, ios: true, ready: () => true })
      expect(bookmarksOf(p)).toEqual(['1:1', '2:2'])
      p.storage.setItem('muslim.reading.v1', reading([bm(2, 2, '2026-10-02T00:00:00Z')]))
      p.storage.setItem('muslim.place.v1', '{"lat":1}')
      await vi.advanceTimersByTimeAsync(1600)
      const e = cloud.entry('muslim.reading.v1')!
      expect(e.c).toBe(5)
      expect(Object.keys(e.x ?? {})).toEqual(['1:1'])
      expect(cloud.m.has('muslim.place.v1')).toBe(false)
      // another phone's change while the app is open: not taken now
      cloud.put('imuslim.settings.v1', 50, '{"lang":"fr"}', Date.now(), 'z')
      cloud.listener!({ reason: 'server', keys: ['imuslim.settings.v1'] })
      await vi.advanceTimersByTimeAsync(10)
      expect(p.storage.getItem('imuslim.settings.v1')).toBeNull()
      // the next launch takes it
      await merge(p, cloud)
      expect(p.storage.getItem('imuslim.settings.v1')).toBe('{"lang":"fr"}')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the iPhone project and the switch', () => {
  it('the plugin, its registration, the entitlement; Android and the web untouched', () => {
    // The switch: the constant and the entitlement together (web/scripts/icloud-switch.sh off|on changes both).
    expect(read('web/ios/App/App/App.entitlements').includes('ubiquity-kvstore-identifier')).toBe(ICLOUD_SYNC)
    const sw = read('web/scripts/icloud-switch.sh')
    expect(sw).toContain('export const ICLOUD_SYNC = false')
    expect(sw).toContain('com.apple.developer.ubiquity-kvstore-identifier')
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
