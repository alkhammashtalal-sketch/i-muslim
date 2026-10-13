// The app's device features (reply 0033 §ب3): the local bells and the portion reminder (plan, 64 at most, order, the
// reminder's time, rescheduling), the offline layer (the app's copy rebuilt equal to the Worker's answers, the
// downloaded meanings, what is kept), the meanings route, the lock-screen title, and the native project's settings.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Meaning } from '../../shared/api'
import { dayTimes, ymdIn } from '../../web/src/daily/prayer'
import { pushMessage } from '../../web/src/daily/notify-text'
import { addDays, AFTER_ISHA_MS, alertId, IOS_PENDING_LIMIT, KINDS, planAlerts, PLAN_DAYS, type PlanInput } from '../../web/src/native/bells'
import { applyLocal, reschedule, toNotification, type AlertContext, type AlertPrefs, type NotifyApi } from '../../web/src/native/notify'
import { createOffline, editionOf, type Kv } from '../../web/src/native/offline'
import {
  adhkarLang,
  ayahFrom,
  keptName,
  keptToDrop,
  KEPT_MAX,
  KEPT_MAX_AGE_MS,
  MUYASSAR_NAME as APP_MUYASSAR_NAME,
  MUYASSAR_URL as APP_MUYASSAR_URL,
  offlineRoute,
  suraFrom,
  type BundledSura,
  type SuraMeanings,
} from '../../web/src/native/offline-data'
import { ML } from '../../web/src/quran/api'
import { nowPlayingArtist, nowPlayingTitle } from '../../web/src/quran/media-session'
import { RECITERS, SHOW_RECITER_NAME } from '../../web/src/quran/recitation'
import { ADHKAR_LANGS as BUILT_ADHKAR_LANGS, bundledSura, toolHadithIds } from '../../web/scripts/native-offline-gen'
import { ADHKAR_TRANSLATIONS, handleAdhkar } from '../src/adhkar'
import type { Env } from '../src/index'
import { MEANING_LANGS } from '../src/meaning'
import { MUYASSAR_NAME, MUYASSAR_URL } from '../src/passage'
import { AFTER_ISHA_MS as WORKER_AFTER_ISHA, nextBell } from '../src/push/schedule'
import { handleReader } from '../src/reader'
import { buildDb, hasFullData, SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const RIYADH = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh' }
const ALL = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
const plan = (p: Partial<PlanInput> = {}) =>
  planAlerts({ place: RIYADH, bells: ALL, ward: true, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now: new Date('2026-10-13T09:00:00Z'), ...p })

describe('local bells: the plan (adhan on the device)', () => {
  it('is at most 64 (iOS), in time order, all after now, with stable unique ids', () => {
    const p = plan()
    expect(p).toHaveLength(IOS_PENDING_LIMIT)
    const now = new Date('2026-10-13T09:00:00Z').getTime()
    for (let i = 0; i < p.length; i++) {
      expect(p[i].at).toBeGreaterThan(now)
      if (i) expect(p[i].at).toBeGreaterThan(p[i - 1].at)
    }
    expect(new Set(p.map((a) => a.id)).size).toBe(p.length)
    // Seven a day: nine days and one more alert (64 = 9 × 7 + 1), about the «six days» the reply expects for more.
    const days = new Set(p.map((a) => ymdIn(new Date(a.at), RIYADH.timeZone)).map((d) => `${d.y}-${d.m}-${d.d}`))
    expect(days.size).toBeGreaterThanOrEqual(9)
    // The same alert keeps its id from one plan to the next.
    const later = plan({ now: new Date('2026-10-14T09:00:00Z') })
    const common = later.filter((a) => p.some((b) => b.id === a.id))
    for (const a of common) expect(p.find((b) => b.id === a.id)!.at).toBe(a.at)
  })

  it('each time is the engine’s time for that civil day; the reminder is Isha + 30 minutes, as the Worker’s', () => {
    expect(AFTER_ISHA_MS).toBe(WORKER_AFTER_ISHA)
    const p = plan()
    for (const a of p) {
      const day = ymdIn(new Date(a.at - (a.kind === 'ward' ? AFTER_ISHA_MS : 0)), RIYADH.timeZone)
      const t = dayTimes(RIYADH, day, { method: 'UmmAlQura', asr: 'shafi' })
      expect(a.at).toBe(a.kind === 'ward' ? t.isha.getTime() + 30 * 60_000 : t[a.kind].getTime())
      expect(a.id).toBe(alertId(day, a.kind))
    }
    // The first reminder planned is the Worker's next «after_isha» for the same place and settings.
    const ward = planAlerts({ place: { lat: 24.7, lng: 46.7, timeZone: 'Asia/Riyadh' }, bells: [], ward: true, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now: new Date('2026-10-13T09:00:00Z') })
    const sub = { cell_lat: 24.7, cell_lng: 46.7, tz: 'Asia/Riyadh', method: 'UmmAlQura', asr: 'shafi', adjust: '{}', prayers: '[]', ward: 'after_isha' }
    expect(nextBell(sub, new Date('2026-10-13T09:00:00Z'))).toEqual({ at: ward[0].at, kind: 'ward' })
  })

  it('only what is on; one bell reaches PLAN_DAYS days ahead, never more than 64', () => {
    const fajr = plan({ bells: ['fajr'], ward: false })
    expect(fajr.every((a) => a.kind === 'fajr')).toBe(true)
    expect(fajr.length).toBeGreaterThanOrEqual(PLAN_DAYS - 1)
    expect(fajr.length).toBeLessThanOrEqual(IOS_PENDING_LIMIT)
    expect(plan({ bells: [], ward: false })).toEqual([])
    expect(plan({ bells: ['dhuhr', 'unknown'], ward: false }).every((a) => a.kind === 'dhuhr')).toBe(true)
    expect(plan({ limit: 10 })).toHaveLength(10)
    expect(plan({ limit: 500 })).toHaveLength(IOS_PENDING_LIMIT)
  })

  it('a day after a change of clocks is neither skipped nor doubled (calendar days, not 24-hour steps)', () => {
    for (const [place, from] of [
      [{ lat: 51.5074, lng: -0.1278, timeZone: 'Europe/London' }, '2026-10-24T22:45:00Z'],
      [{ lat: 40.7128, lng: -74.006, timeZone: 'America/New_York' }, '2026-03-08T04:30:00Z'],
    ] as const) {
      const p = planAlerts({ place, bells: ['fajr'], ward: false, method: 'MuslimWorldLeague', asr: 'shafi', lang: 'en', now: new Date(from) })
      const days = p.map((a) => ymdIn(new Date(a.at), place.timeZone))
      for (let i = 1; i < days.length; i++) expect(addDays(days[i - 1], 1)).toEqual(days[i])
    }
  })

  it('the texts are the Web Push texts, in the interface language, and lead to the same pages', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'xx']) {
      for (const a of plan({ lang }).slice(0, 8)) {
        const m = pushMessage(lang, a.kind)
        expect([a.title, a.body, a.url]).toEqual([m.title, m.body, m.url])
      }
    }
    expect(KINDS).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'ward'])
  })
})

/** The system's pending notifications, as the plugin keeps them. */
function fakeSystem(display: 'granted' | 'denied' | 'prompt' = 'granted', exact: 'granted' | 'denied' = 'denied') {
  const state = { display, pending: [] as { id: number; at: number; extra: unknown; isExactNotification?: boolean; allowWhileIdle?: boolean }[], asked: 0, scheduleCalls: 0 }
  const api = {
    async checkPermissions() {
      return { display: state.display }
    },
    async requestPermissions() {
      state.asked++
      if (state.display === 'prompt') state.display = 'granted'
      return { display: state.display }
    },
    async getPending() {
      return { notifications: state.pending.map((p) => ({ id: p.id, title: '', body: '' })) }
    },
    async cancel({ notifications }: { notifications: { id: number }[] }) {
      const ids = new Set(notifications.map((n) => n.id))
      state.pending = state.pending.filter((p) => !ids.has(p.id))
    },
    async schedule({ notifications }: { notifications: ReturnType<typeof toNotification>[] }) {
      state.scheduleCalls++
      if (state.display !== 'granted') throw new Error('schedule() would ask for the permission')
      for (const n of notifications) {
        if (state.pending.some((p) => p.id === n.id)) throw new Error(`duplicate id ${n.id}`)
        state.pending.push({ id: n.id, at: n.schedule.at.getTime(), extra: n.extra, isExactNotification: n.isExactNotification, allowWhileIdle: n.schedule.allowWhileIdle })
      }
      // iOS keeps only 64.
      state.pending = state.pending.sort((a, b) => a.at - b.at).slice(0, 64)
      return { notifications: notifications.map((n) => ({ id: n.id })) }
    },
    async checkExactNotificationSetting() {
      return { exact_alarm: exact }
    },
  }
  return { state, api: api as unknown as NotifyApi }
}
const ctx: AlertContext = { place: { ...RIYADH, source: 'city' }, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', platform: 'ios' }
const on: AlertPrefs = { bells: ALL, ward: true }

describe('local bells: rescheduling', () => {
  it('replaces the whole set each time (launch, return, a change), keeping 64 at most and no duplicate', async () => {
    const { state, api } = fakeSystem()
    expect(await reschedule(api, on, ctx, new Date('2026-10-13T09:00:00Z'))).toBe(64)
    const first = state.pending.map((p) => p.id)
    expect(await reschedule(api, on, ctx, new Date('2026-10-15T20:00:00Z'))).toBe(64)
    expect(state.pending).toHaveLength(64)
    expect(Math.min(...state.pending.map((p) => p.at))).toBeGreaterThan(new Date('2026-10-15T20:00:00Z').getTime())
    expect(state.pending.map((p) => p.id)).not.toEqual(first)
    // A change of settings: only the reminder now.
    expect(await reschedule(api, { bells: [], ward: true }, ctx, new Date('2026-10-15T20:00:00Z'))).toBeGreaterThan(50)
    expect(state.pending.every((p) => (p.extra as { kind: string }).kind === 'ward')).toBe(true)
    // Everything off, or no place: nothing pending.
    expect(await reschedule(api, { bells: [], ward: false }, ctx)).toBe(0)
    expect(state.pending).toEqual([])
    await reschedule(api, on, ctx)
    expect(await reschedule(api, on, { ...ctx, place: null })).toBe(0)
    expect(state.pending).toEqual([])
  })

  it('never asks for the permission by itself, and schedules nothing without it', async () => {
    const { state, api } = fakeSystem('prompt')
    expect(await reschedule(api, on, ctx)).toBe(0)
    expect(state.asked).toBe(0)
    expect(state.scheduleCalls).toBe(0)
    const denied = fakeSystem('denied')
    expect(await reschedule(denied.api, on, ctx)).toBe(0)
    expect(denied.state.scheduleCalls).toBe(0)
  })

  it('a tap asks once, saves the choice only when it holds, and says why when it does not', async () => {
    const saved: AlertPrefs[] = []
    const save = (p: AlertPrefs) => saved.push(p)
    const fresh = fakeSystem('prompt')
    expect(await applyLocal(fresh.api, { bells: ['fajr'], ward: false }, ctx, save)).toBe('ok')
    expect(fresh.state.asked).toBe(1)
    expect(fresh.state.pending.length).toBeGreaterThan(0)
    expect(saved).toEqual([{ bells: ['fajr'], ward: false }])
    const denied = fakeSystem('denied')
    expect(await applyLocal(denied.api, on, ctx, save)).toBe('denied')
    expect(await applyLocal(denied.api, on, { ...ctx, place: null }, save)).toBe('no_place')
    expect(saved).toHaveLength(1)
    // Turning everything off never asks and always holds.
    expect(await applyLocal(denied.api, { bells: [], ward: false }, ctx, save)).toBe('ok')
    expect(denied.state.asked).toBe(0)
  })

  it('Android: inexact while idle unless «Alarms & reminders» is already granted; iOS: no exact-alarm request', async () => {
    const ios = fakeSystem('granted', 'granted')
    await reschedule(ios.api, on, ctx)
    expect(ios.state.pending.every((p) => p.isExactNotification === false && p.allowWhileIdle === true)).toBe(true)
    const android = fakeSystem('granted', 'denied')
    await reschedule(android.api, on, { ...ctx, platform: 'android' })
    expect(android.state.pending.every((p) => p.isExactNotification === false)).toBe(true)
    const exact = fakeSystem('granted', 'granted')
    await reschedule(exact.api, on, { ...ctx, platform: 'android' })
    expect(exact.state.pending.every((p) => p.isExactNotification === true && p.allowWhileIdle === true)).toBe(true)
  })
})

describe('offline: routes', () => {
  const ML = ['ur', 'fr']
  const r = (p: string) => offlineRoute(new URL(`https://x.test${p}`), ML)
  it('knows the reads the app answers or keeps, and leaves the rest to the network', () => {
    expect(r('/api/suras')).toEqual({ kind: 'suras' })
    expect(r('/api/quarters')).toEqual({ kind: 'quarters' })
    expect(r('/api/sura/2?en=1&ml=ur')).toEqual({ kind: 'sura', n: 2, en: true, ml: 'ur' })
    expect(r('/api/sura/2?ml=de')).toEqual({ kind: 'sura', n: 2, en: false, ml: null })
    expect(r('/api/sura/115')).toBeNull()
    expect(r('/api/passage/quran:2:255?ml=fr')).toEqual({ kind: 'ayah', sura: 2, aya: 255, ml: 'fr' })
    expect(r('/api/passage/quran%3A2%3A255')).toEqual({ kind: 'ayah', sura: 2, aya: 255, ml: null })
    expect(r('/api/passage/aqeedah:usul:003')).toEqual({ kind: 'kept' })
    expect(r('/api/books')).toEqual({ kind: 'kept' })
    expect(r('/api/book/usul')).toEqual({ kind: 'kept' })
    expect(r('/api/mukhtasar/2/255')).toEqual({ kind: 'kept' })
    expect(r('/api/adhkar/301?lang=fa')).toEqual({ kind: 'adhkar', cat: '301', lang: 'fa' })
    expect(r('/api/adhkar/hadith/10948?lang=en')).toEqual({ kind: 'hadith', id: '10948', lang: 'en' })
    for (const p of ['/api/ask', '/api/hadith/day', '/api/meanings/ur/2', '/api/health', '/api/explain', '/api/push/key', '/api/sources/status']) expect(r(p)).toBeNull()
    expect(adhkarLang('fa', ['ar', 'hi'])).toBe('ar')
    expect(adhkarLang('hi', ['ar', 'hi'])).toBe('hi')
    expect(adhkarLang('hi', [])).toBe('ar')
  })
  it('keeps like the web’s service worker: 800 entries, 60 days', () => {
    expect(KEPT_MAX).toBe(800)
    expect(KEPT_MAX_AGE_MS).toBe(60 * 86400 * 1000)
    const ix: Record<string, number> = { a: 1000, b: 2000, c: 3000 }
    expect(keptToDrop(ix, 3000, 2)).toEqual(['a'])
    expect(keptToDrop(ix, 1000 + KEPT_MAX_AGE_MS + 1, 10)).toEqual(['a'])
    expect(keptName('/api/sura/2')).toMatch(/^[0-9a-f]{8}$/)
    expect(keptName('/api/sura/2')).not.toBe(keptName('/api/sura/3'))
    const vite = read('web/vite.config.ts')
    expect(vite).toContain('maxEntries: 800')
    expect(vite).toContain('maxAgeSeconds: 60 * 60 * 24 * 60')
  })
  it('al-Muyassar’s name and link are the Worker’s', () => {
    expect([APP_MUYASSAR_NAME, APP_MUYASSAR_URL]).toEqual([MUYASSAR_NAME, MUYASSAR_URL])
  })
})

describe.skipIf(!hasFullData)('offline: the app’s copy answers as the Worker does (data/processed)', () => {
  let env: Env
  const bundle = new Map<number, BundledSura>()
  const worker = async (p: string) => {
    const url = new URL(`https://i-muslim.test${p}`)
    const res = await handleReader(new Request(url), env, url)
    return { status: res!.status, body: res!.status === 200 ? await res!.json() : null }
  }
  const meaningsOf = async (lang: string, n: number) => (await worker(`/api/meanings/${lang}/${n}`)).body as SuraMeanings
  beforeAll(async () => {
    const d1 = buildDb()
    const ins = d1.db.prepare('INSERT OR REPLACE INTO ayah_translations (lang, sura, aya, text, translator, version, footnotes, source_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (let a = 1; a <= 7; a++) ins.run('ur', 1, a, `معنی ${a}`, 'مترجم', '1.0.4', a === 2 ? 'حاشیہ' : null, 'urdu_test')
    for (let a = 1; a <= 7; a++) ins.run('bn', 1, a, `অর্থ ${a}`, 'অনুবাদক', null, null, null)
    env = { DB: d1 } as unknown as Env
    for (const n of [1, 2, 9, 112, 114]) bundle.set(n, await bundledSura(env, n, (await worker('/api/suras')).body.find((s: { n: number }) => s.n === n).ayat))
  }, 60_000)

  it('a sura, with and without English', async () => {
    for (const [n, b] of bundle) {
      expect(suraFrom(b, false, null)).toEqual((await worker(`/api/sura/${n}`)).body)
      expect(suraFrom(b, true, null)).toEqual((await worker(`/api/sura/${n}?en=1`)).body)
    }
  })

  it('an ayah’s panel, without al-Saadi (the only part not in the app)', async () => {
    for (const [s, a] of [[1, 1], [1, 7], [2, 1], [2, 2], [2, 255], [2, 286], [9, 1], [112, 4], [114, 6]]) {
      const w = (await worker(`/api/passage/quran:${s}:${a}`)).body
      expect(ayahFrom(bundle.get(s)!, a, null)).toEqual({ ...w, tafsir: w.tafsir.filter((t: { key: string }) => t.key !== 'saadi') })
    }
    expect(ayahFrom(bundle.get(1)!, 8, null)).toBeNull()
  })

  it('with the downloaded meanings: the sura and the panel as the Worker gives them in that language', async () => {
    for (const lang of ['ur', 'bn']) {
      const m = await meaningsOf(lang, 1)
      expect(Object.keys(m.meanings)).toHaveLength(7)
      expect(suraFrom(bundle.get(1)!, false, m)).toEqual((await worker(`/api/sura/1?ml=${lang}`)).body)
      expect(suraFrom(bundle.get(1)!, true, m)).toEqual((await worker(`/api/sura/1?en=1&ml=${lang}`)).body)
      for (const a of [1, 2, 7]) {
        const w = (await worker(`/api/passage/quran:1:${a}?ml=${lang}`)).body
        expect(ayahFrom(bundle.get(1)!, a, m)).toEqual({ ...w, tafsir: w.tafsir.filter((t: { key: string }) => t.key !== 'saadi') })
      }
    }
    const ur = await meaningsOf('ur', 1)
    expect(ur.meanings['2']).toEqual({ lang: 'ur', text: 'معنی 2', translator: 'مترجم', version: '1.0.4', footnotes: 'حاشیہ', source_key: 'urdu_test' })
    expect(editionOf(ur)).toBe('مترجم|urdu_test|1.0.4')
  })

  it('the meanings route reads only served languages and real suras', async () => {
    expect((await worker('/api/meanings/de/1')).status).toBe(404)
    expect((await worker('/api/meanings/ur/115')).status).toBe(404)
    expect((await worker('/api/meanings/ur/2')).status).toBe(404) // no rows
    expect((await worker('/api/meanings/ar/1')).status).toBe(404)
  })

  it('the build’s copy holds the hadiths the names and the tasbih cite', () => {
    const ids = toolHadithIds()
    expect(ids).toContain('10948')
    expect(ids.length).toBeGreaterThanOrEqual(10)
  })
})

describe('offline: the adhkar languages of the app’s copy are the Worker’s', () => {
  it('made in Arabic and every language the Worker translates them into; any other is the Worker’s Arabic answer', async () => {
    expect(BUILT_ADHKAR_LANGS).toEqual(['ar', ...ADHKAR_TRANSLATIONS])
    // The Worker answers a language outside its list as Arabic, even with a row in it: what the app does for a
    // language its build did not make.
    const db = new DatabaseSync(':memory:')
    db.exec(read('worker/migrations/0008_hadiths.sql'))
    const ins = db.prepare('INSERT INTO hadiths (id, lang, title, text, attribution, grade, class, tier, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const [lang, text] of [['ar', 'نص'], ['en', 'English'], ['fa', 'فارسی']]) ins.run('5000', lang, `t-${lang}`, text, 'رواه مسلم', 'صحيح', 'sahih', '1', 'v1')
    db.prepare('INSERT INTO hadith_categories (category, id, tier) VALUES (?, ?, ?)').run('301', '5000', '1')
    const env = { DB: new SqliteD1(db) } as unknown as Env
    const get = async (lang: string) => {
      const u = new URL(`https://app.local/api/adhkar/301?lang=${lang}`)
      return (await handleAdhkar(new Request(u), env, u))!.json() as Promise<{ items: { translation?: unknown }[] }>
    }
    expect((await get('en')).items[0].translation).toBeTruthy()
    expect(await get('fa')).toEqual(await get('ar'))
    expect((await get('ar')).items[0].translation).toBeUndefined()
  })
})

/** A memory store and a scripted network for the offline layer. */
function harness(opts: { online?: boolean; slowMs?: number; adhkarLangs?: string[]; hadithLangs?: string[]; noManifest?: boolean } = {}) {
  const files = new Map<string, string>()
  const kv: Kv = {
    async get(p) {
      return files.get(p) ?? null
    },
    async put(p, d) {
      files.set(p, d)
    },
    async remove(p) {
      files.delete(p)
    },
    async list(dir) {
      return [...files.keys()].filter((k) => k.startsWith(`${dir}/`)).map((k) => k.slice(dir.length + 1))
    },
  }
  const sura1: BundledSura = {
    n: 1,
    name: 'الفاتحة',
    ayatCount: 2,
    basmala: null,
    ayat: [
      { aya: 1, id: 'quran:1:1', text: 'نص ١', page: 1, text_en: 'one', ref: 'الفاتحة: 1', url: 'https://u/1', url_en: 'https://e/1', muyassar: 'ميسر ١' },
      { aya: 2, id: 'quran:1:2', text: 'نص ٢', page: 1, text_en: 'two', ref: 'الفاتحة: 2', url: 'https://u/2', muyassar: 'ميسر ٢' },
    ],
  }
  const app = new Map<string, string>([
    ['suras.json', '[{"n":1}]'],
    ['sura/1.json', JSON.stringify(sura1)],
    ['adhkar/301.ar.json', '{"category":"301","items":["ar"]}'],
    ['adhkar/301.en.json', '{"category":"301","items":["en"]}'],
    ['hadith/10948.ar.json', '{"id":"10948"}'],
    ['hadith/10948.ps.json', '{"id":"10948","lang":"ps"}'],
    ['adhkar/301.ps.json', '{"category":"301","items":["ps"]}'],
    ['manifest.json', JSON.stringify({ built: '', suras: 1, adhkar: { categories: ['301'], langs: opts.adhkarLangs ?? ['ar', 'en'] }, hadiths: ['10948'], langs: opts.hadithLangs ?? ['ar', 'en'] })],
  ])
  if (opts.noManifest) app.delete('manifest.json')
  const net = { online: opts.online ?? true, calls: [] as string[], answers: new Map<string, { status: number; body: string }>(), meaningCalls: 0, failAfter: Infinity }
  const m = (lang: string, n: number, v = '1'): SuraMeanings => ({ lang, sura: n, meanings: { '1': { lang, text: `${lang} ${n}`, translator: 'T', version: v, source_key: `${lang}_k` } as Meaning } })
  const offline = createOffline({
    kv,
    apiBase: 'https://api.test',
    meaningLangs: ['ur', 'fr'],
    timeoutMs: 50,
    bundle: async (rel) => app.get(rel) ?? null,
    net: async (href) => {
      net.calls.push(href)
      if (opts.slowMs) await new Promise((r) => setTimeout(r, opts.slowMs))
      if (!net.online) throw new TypeError('Failed to fetch')
      const u = new URL(href)
      const mm = u.pathname.match(/^\/api\/meanings\/(\w+)\/(\d+)$/)
      if (mm && ++net.meaningCalls > net.failAfter) throw new TypeError('Failed to fetch')
      if (mm) return new Response(JSON.stringify(m(mm[1], Number(mm[2]), net.answers.get('edition')?.body ?? '1')), { status: 200 })
      const a = net.answers.get(u.pathname + u.search)
      return a ? new Response(a.body, { status: a.status }) : new Response('{"ok":false}', { status: 404 })
    },
  })
  const get = async (p: string) => {
    const res = await offline.answer(`https://api.test${p}`)
    return res ? { status: res.status, body: await res.json() } : null
  }
  return { files, net, offline, get, sura1 }
}

describe('offline: the layer', () => {
  it('answers the list of suras and a sura from the app, without the network', async () => {
    const h = harness({ online: false })
    expect((await h.get('/api/suras'))!.body).toEqual([{ n: 1 }])
    expect((await h.get('/api/sura/1?en=1'))!.body).toEqual(suraFrom(h.sura1, true, null))
    expect(h.net.calls).toEqual([])
    expect(await h.get('/api/ask')).toBeNull()
    expect(await h.offline.answer('https://elsewhere.test/api/suras')).toBeNull()
  })

  it('a content language: the network until its meanings are on the device, then the device', async () => {
    const h = harness({ online: false })
    // Offline and not downloaded: the text without the meaning.
    expect((await h.get('/api/sura/1?ml=ur'))!.body).toEqual(suraFrom(h.sura1, false, null))
    h.net.online = true
    expect(await h.offline.ensureMeanings('ur')).toBe('done')
    expect([...h.files.keys()].filter((k) => k.startsWith('meanings/ur/') && /\/\d+\.json$/.test(k))).toHaveLength(114)
    h.net.online = false
    h.net.calls.length = 0
    const body = (await h.get('/api/sura/1?ml=ur'))!.body
    expect(body.ayat[0].meaning).toBe('ur 1')
    expect(body.meaning_lang).toBe('ur')
    expect((await h.get('/api/passage/quran:1:1?ml=ur'))!.body.meaning.text).toBe('ur 1')
    expect(h.net.calls.every((c) => c.includes('/api/passage/'))).toBe(true)
    expect(await h.offline.ensureMeanings('en')).toBe('none')
    expect(await h.offline.ensureMeanings('ar')).toBe('none')
  })

  it('a download cut short goes on later; a new edition replaces the old files', async () => {
    const h = harness()
    const files = h.files
    // The connection drops after 40 suras.
    h.net.failAfter = 40
    expect(await h.offline.ensureMeanings('fr', 1)).toBe('partial')
    const partial = [...files.keys()].filter((k) => /^meanings\/fr\/\d+\.json$/.test(k)).length
    expect(partial).toBe(40)
    h.net.failAfter = Infinity
    expect(JSON.parse(files.get('meanings/fr/meta.json')!).complete).toBe(false)
    h.net.online = true
    h.net.calls.length = 0
    expect(await h.offline.ensureMeanings('fr')).toBe('done')
    expect(h.net.calls.length).toBe(1 + 114 - partial)
    // A week later, a new edition: everything again.
    expect(await h.offline.ensureMeanings('fr')).toBe('done')
    h.net.answers.set('edition', { status: 200, body: '2' })
    const meta = JSON.parse(files.get('meanings/fr/meta.json')!)
    files.set('meanings/fr/meta.json', JSON.stringify({ ...meta, checked: 0 }))
    h.net.calls.length = 0
    expect(await h.offline.ensureMeanings('fr')).toBe('done')
    expect(h.net.calls.length).toBe(114)
    expect(JSON.parse(files.get('meanings/fr/50.json')!).meanings['1'].version).toBe('2')
  })

  it('an ayah’s panel: the network first and kept; then what was kept; then the app’s copy', async () => {
    const h = harness()
    h.net.answers.set('/api/passage/quran:1:2', { status: 200, body: '{"id":"quran:1:2","from":"network"}' })
    expect((await h.get('/api/passage/quran:1:2'))!.body.from).toBe('network')
    await new Promise((r) => setTimeout(r, 10))
    h.net.online = false
    expect((await h.get('/api/passage/quran:1:2'))!.body.from).toBe('network')
    expect((await h.get('/api/passage/quran:1:1'))!.body).toEqual(ayahFrom(h.sura1, 1, null))
    // Not in the app and never read: the network's failure, as fetch gives it.
    await expect(h.offline.answer('https://api.test/api/book/usul')).rejects.toThrow('Failed to fetch')
  })

  it('a slow network gives way to the device, and its late answer is kept for the next read; a 404 stays a 404', async () => {
    const slow = harness({ slowMs: 300 })
    slow.net.answers.set('/api/passage/quran:1:1', { status: 200, body: '{"id":"quran:1:1","from":"network"}' })
    const t = Date.now()
    expect((await slow.get('/api/passage/quran:1:1'))!.body).toEqual(ayahFrom(slow.sura1, 1, null))
    expect(Date.now() - t).toBeLessThan(250)
    const keptFiles = () => [...slow.files.keys()].filter((k) => k.startsWith('kept/') && k !== 'kept/index.json')
    expect(keptFiles()).toEqual([])
    // The slow answer arrives after the device has answered: it is kept.
    await new Promise((r) => setTimeout(r, 400))
    expect(keptFiles()).toHaveLength(1)
    expect(JSON.parse(slow.files.get(keptFiles()[0])!)).toMatchObject({ u: '/api/passage/quran:1:1', b: '{"id":"quran:1:1","from":"network"}' })
    // The next read without a connection answers with what was kept, before the app's copy.
    slow.net.online = false
    expect((await slow.get('/api/passage/quran:1:1'))!.body.from).toBe('network')
    // A slow failure keeps nothing.
    const failing = harness({ slowMs: 300, online: false })
    expect((await failing.get('/api/passage/quran:1:2'))!.body).toEqual(ayahFrom(failing.sura1, 2, null))
    await new Promise((r) => setTimeout(r, 400))
    expect([...failing.files.keys()].filter((k) => k.startsWith('kept/'))).toEqual([])
    const h = harness()
    expect((await h.get('/api/passage/quran:9:9'))!.status).toBe(404)
  })

  it('the adhkar and their hadiths: the app’s copy in the reader’s language when the build made it (its manifest), Arabic for the others', async () => {
    const h = harness({ online: false })
    expect((await h.get('/api/adhkar/301?lang=en'))!.body.items).toEqual(['en'])
    expect((await h.get('/api/adhkar/301?lang=fa'))!.body.items).toEqual(['ar'])
    // A file the manifest does not list is not read: the Worker of that build answered the language as Arabic.
    expect((await h.get('/api/adhkar/301?lang=ps'))!.body.items).toEqual(['ar'])
    expect((await h.get('/api/adhkar/hadith/10948?lang=ps'))!.body).toEqual({ id: '10948' })
    // A later build with the Worker's new languages: the app follows its manifest, nothing to change by hand.
    const later = harness({ online: false, adhkarLangs: ['ar', 'en', 'ps'], hadithLangs: ['ar', 'en', 'ps'] })
    expect((await later.get('/api/adhkar/301?lang=ps'))!.body.items).toEqual(['ps'])
    expect((await later.get('/api/adhkar/hadith/10948?lang=ps'))!.body).toEqual({ id: '10948', lang: 'ps' })
    // No manifest in the app: Arabic.
    const none = harness({ online: false, noManifest: true })
    expect((await none.get('/api/adhkar/301?lang=en'))!.body.items).toEqual(['ar'])
  })
})

describe('lock screen and the native project', () => {
  it('the recitation’s title names the sura and the ayah, never its text', () => {
    expect(nowPlayingTitle(2, 255, 'ar', new Map([[2, 'البقرة']]))).toBe('سورة البقرة · ٢٥٥')
    expect(nowPlayingTitle(2, 255, 'en', null)).toBe('Surah 2 · 255')
    expect(nowPlayingTitle(2, 255, 'fa', null)).toBe('Surah 2 · 255')
  })

  it('the lock screen names the reciter only as the one switch SHOW_RECITER_NAME allows (docs/SOURCES.md)', () => {
    const r = RECITERS[0]
    // On: the reciter's name, as the player's credit line names it.
    expect(nowPlayingArtist('ar', r, true)).toBe(r.name.ar)
    expect(nowPlayingArtist('en', r, true)).toBe(r.name.en ?? r.name.ar)
    // Off: the attribution without a name, as the player shows it then; no name in any language.
    expect(nowPlayingArtist('ar', r, false)).toBe('التلاوة: موقع إم بي ثري قرآن')
    expect(nowPlayingArtist('en', r, false)).toBe('Recitation: mp3quran.net')
    expect(nowPlayingArtist('fa', r, false)).toBe('Recitation: mp3quran.net')
    for (const l of ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi', 'fa']) {
      const a = nowPlayingArtist(l, r, false)
      expect(a, l).not.toContain(r.name.ar)
      if (r.name.en) expect(a, l).not.toContain(r.name.en)
    }
    // The lock screen reads the switch itself, as the player does.
    expect(read('web/src/quran/media-session.ts')).toContain('nowPlayingArtist(l, getReciter(), SHOW_RECITER_NAME)')
    expect(read('web/src/quran/media-session.ts')).not.toMatch(/artist = reciterLabel/)
    expect(typeof SHOW_RECITER_NAME).toBe('boolean')
  })

  it('background audio, notification presentation without a badge, the plugins pinned, the offline copy in the build', () => {
    const plist = read('web/ios/App/App/Info.plist')
    expect(plist).toMatch(/<key>UIBackgroundModes<\/key>\s*<array>\s*<string>audio<\/string>\s*<\/array>/)
    const cap = read('web/capacitor.config.ts')
    expect(cap).toMatch(/presentationOptions: \['banner', 'list', 'sound'\]/)
    const pkg = JSON.parse(read('web/package.json'))
    for (const p of ['local-notifications', 'geolocation', 'share', 'haptics', 'filesystem']) expect(pkg.dependencies[`@capacitor/${p}`]).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pkg.scripts['build:native']).toMatch(/vite build --mode native && node scripts\/native-offline\.mjs$/)
    // The offline layer stands before anything reads the API.
    expect(read('web/src/main.tsx').match(/^import .*$/m)![0]).toBe("import './native/boot'")
    // The meaning languages the app downloads (ensureMeanings, through boot.ts's ML) are exactly those /api/meanings
    // serves, so no launch or resume asks for one the Worker answers with 404 (also in lang-picker.test.ts).
    expect([...ML].sort()).toEqual([...MEANING_LANGS].sort())
    expect(read('web/src/native/boot.ts')).toMatch(/import \{ ML \} from '\.\.\/quran\/api'[\s\S]*meaningLangs: ML,/)
  })

  it('no direct navigator.share or navigator.vibrate outside the native helpers', () => {
    const files: string[] = []
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.tsx?$/.test(e.name)) files.push(p)
      }
    }
    walk(path.join(ROOT, 'web/src'))
    const offenders = files.filter((f) => !f.includes(`${path.sep}native${path.sep}`) && /navigator\.(share|vibrate)\s*[(?]/.test(fs.readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
