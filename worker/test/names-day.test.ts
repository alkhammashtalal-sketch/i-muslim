// «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4 and 0071-add2 §2): the route, its switch,
// the rotation, and the data (data/names-daily.json, scripts/names/daily-build.mjs): the 96 main entries in the
// reviewed file's order, ids only beside the file's readings, the six with their Quranic evidence alone, and the
// book whose order inspired the list named nowhere. The checks against data/processed skip without it.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findForbidden } from '../../scripts/names/forbidden.mjs'
import data from '../../data/names-daily.json'
import type { Env } from '../src/index'
import { handleNamesDay, nameDayIndex, NAME_ENTRIES, NAMES_EPOCH, validDay } from '../src/names-day'

const ROOT = path.resolve(import.meta.dirname, '../..')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
// The old draft, outside git (relay), for the check's own control; NAMES_DRAFT points to it from a worktree.
const DRAFT = process.env.NAMES_DRAFT ?? path.join(ROOT, 'relay/w1/0071-names/names-draft.txt')

// No DB binding: the route reads nothing from D1.
const envWith = (vars: Record<string, string> = {}) => ({ ...vars }) as unknown as Env
async function get(env: Env, p: string) {
  const res = await handleNamesDay(new Request(`https://x${p}`), env, new URL(`https://x${p}`))
  if (!res) return { status: 0, body: null as never, cache: null }
  return { status: res.status, body: (await res.json()) as Record<string, unknown> & { entry: (typeof NAME_ENTRIES)[number]; readings?: unknown; index: number }, cache: res.headers.get('cache-control') }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/names/day', () => {
  it('answers only its own path, and only GET', async () => {
    expect(await handleNamesDay(new Request('https://x/api/names'), envWith(), new URL('https://x/api/names'))).toBeNull()
    expect(await handleNamesDay(new Request('https://x/api/names/day', { method: 'POST' }), envWith(), new URL('https://x/api/names/day'))).toBeNull()
  })

  it('the day asked: its entry, ids only, cached ten minutes', async () => {
    const r = await get(envWith(), '/api/names/day?day=2026-10-22')
    expect(r.status).toBe(200)
    expect(r.cache).toBe('public, max-age=600')
    expect(r.body.day).toBe('2026-10-22')
    expect(r.body.index).toBe(0)
    expect(r.body.count).toBe(96)
    expect(r.body.entry).toEqual({ n: 1, name: 'الصمد', ayah: 'quran:112:2', hadith: null, meaningAyah: null, duas: [{ kind: 'ayah', id: 'quran:28:24' }], quranOnly: false, tafsirOf: 'quran:112:2' })
  })

  it('switch off (absent, or anything but "on"): no readings', async () => {
    for (const vars of [{}, { NAMES_READINGS: 'off' }, { NAMES_READINGS: 'ON' }, { NAMES_READINGS: 'true' }, { NAMES_READINGS: '' }]) {
      const r = await get(envWith(vars), '/api/names/day?day=2026-10-22')
      expect(r.status).toBe(200)
      expect(r.body).not.toHaveProperty('readings')
      expect(JSON.stringify(r.body)).not.toContain(NAME_ENTRIES[0].readings.easy)
    }
  })

  it('switch on: the readings of the day, as stored, in Arabic only', async () => {
    const on = envWith({ NAMES_READINGS: 'on' })
    for (const p of ['/api/names/day?day=2026-10-22', '/api/names/day?day=2026-10-22&lang=ar']) {
      const r = await get(on, p)
      expect(r.body.readings).toEqual(NAME_ENTRIES[0].readings)
    }
    for (const lang of ['en', 'ur', 'fr', 'xx']) expect((await get(on, `/api/names/day?day=2026-10-22&lang=${lang}`)).body).not.toHaveProperty('readings')
  })

  it('a day that is not a date is refused, never cached', async () => {
    for (const d of ['22-10-2026', '2026-10-2', '2026-02-30', 'today', '']) {
      const r = await get(envWith(), `/api/names/day?day=${d}`)
      expect(r.status, d).toBe(400)
      expect(r.cache).toBe('no-store')
    }
  })

  it('no day: the server’s Riyadh date, which turns at 21:00 UTC', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T20:59:00Z'))
    expect((await get(envWith(), '/api/names/day')).body).toMatchObject({ day: '2026-10-22', index: 0 })
    vi.setSystemTime(new Date('2026-10-22T21:00:00Z'))
    expect((await get(envWith(), '/api/names/day')).body).toMatchObject({ day: '2026-10-23', index: 1 })
  })
})

describe('the rotation', () => {
  it('entry 1 on the epoch, one a day, again after the 96th; before the epoch it counts back', () => {
    expect(NAMES_EPOCH).toBe('2026-10-22')
    expect(nameDayIndex('2026-10-22')).toBe(0)
    expect(nameDayIndex('2026-10-23')).toBe(1)
    expect(nameDayIndex('2027-01-25')).toBe(95)
    expect(nameDayIndex('2027-01-26')).toBe(0)
    expect(nameDayIndex('2026-10-21')).toBe(95)
    expect(nameDayIndex('2025-01-01')).toBeGreaterThanOrEqual(0)
  })
  it('96 days in a row show the 96 entries once each', () => {
    const start = Date.parse('2026-12-01T00:00:00Z')
    const seen = new Set(Array.from({ length: 96 }, (_, k) => nameDayIndex(new Date(start + k * 86_400_000).toISOString().slice(0, 10))))
    expect(seen.size).toBe(96)
  })
  it('validDay', () => {
    expect(validDay('2026-10-22')).toBe(true)
    expect(validDay('2028-02-29')).toBe(true)
    expect(validDay('2027-02-29')).toBe(false)
    expect(validDay(null)).toBe(false)
  })
})

describe('data/names-daily.json', () => {
  const entries = data.entries
  const APPENDIX = ['الهادي', 'المسعر', 'مالك الملك', 'ذو الجلال والإكرام', 'الحفي', 'المحسن']
  const SIX = ['الجواد', 'الحكم', 'السيد', 'المعطي', 'المنان', 'الوتر']

  it('the 96 main entries, numbered 1–96 in the reviewed order; the appendix is not in the rotation', () => {
    expect(data.count).toBe(96)
    expect(entries.map((e) => e.n)).toEqual(Array.from({ length: 96 }, (_, k) => k + 1))
    expect(new Set(entries.map((e) => e.name)).size).toBe(96)
    for (const a of APPENDIX) expect(entries.map((e) => e.name)).not.toContain(a)
    // The two pairs that are one entry each (add-on 0071-add1), and al-Jawad in the main part.
    expect(entries.map((e) => e.name)).toEqual(expect.arrayContaining(['القابض الباسط', 'المقدم المؤخر', 'الجواد']))
  })

  it('ids only: no text of the Quran, a hadith or a tafsir beside the name and the readings', () => {
    for (const e of entries) {
      expect(Object.keys(e).sort(), e.name).toEqual(['ayah', 'duas', 'hadith', 'meaningAyah', 'n', 'name', 'quranOnly', 'readings', 'tafsirOf'])
      for (const id of [e.ayah, e.meaningAyah, e.tafsirOf]) if (id) expect(id).toMatch(/^quran:\d{1,3}:\d{1,3}$/)
      if (e.hadith) expect(e.hadith).toMatch(/^\d{1,7}$/)
      for (const d of e.duas) expect(d.kind === 'ayah' ? /^quran:\d{1,3}:\d{1,3}$/.test(d.id) : d.kind === 'hadith' && /^\d{1,7}$/.test(d.id), `${e.name} ${d.id}`).toBe(true)
      expect(Object.keys(e.readings).sort()).toEqual(['deep', 'easy', 'meaning'])
      expect(e.readings.meaning.length && e.readings.easy.length && e.readings.deep.length, e.name).toBeTruthy()
      // The file's reference marks and codes stay out.
      for (const t of [e.readings.meaning, e.readings.easy, ...e.readings.deep]) expect(t, e.name).not.toMatch(/\[\d|\b[DHR]\d{2,3}\b|^(دعاء|ذكر|ثناء) /)
    }
  })

  it('the tafsir goes with an ayah the entry itself cites', () => {
    for (const e of entries) {
      const own = [e.ayah, e.meaningAyah, ...e.duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]
      if (e.tafsirOf) expect(own, e.name).toContain(e.tafsirOf)
      if (e.ayah) expect(e.tafsirOf).toBe(e.ayah)
    }
  })

  it('the six with no HadeethEnc hadith as evidence (add-on 0071-add2 §2): their Quranic evidence alone', () => {
    const six = entries.filter((e) => e.quranOnly)
    expect(six.map((e) => e.name)).toEqual(SIX)
    for (const e of six) {
      expect(e.hadith, e.name).toBeNull()
      expect(e.duas.every((d) => d.kind === 'ayah'), e.name).toBe(true)
      expect(e.tafsirOf, e.name).not.toBeNull()
    }
    // al-Jawad's ayah is the one the file gives for the meaning; the others' is their Quranic dua.
    expect(six.map((e) => e.tafsirOf)).toEqual(['quran:3:8', 'quran:7:89', 'quran:28:24', 'quran:28:24', 'quran:3:8', 'quran:1:6'])
    expect(entries.find((e) => e.name === 'الجواد')!.meaningAyah).toBe('quran:3:8')
  })

  it('every entry shows a quoted text: an ayah or a hadith', () => {
    for (const e of entries) expect(!!(e.ayah || e.hadith || e.meaningAyah || e.duas.length), e.name).toBe(true)
  })

  it.skipIf(!fs.existsSync(QURAN))('every ayah id is in quran.jsonl', () => {
    const ids = new Set(
      fs
        .readFileSync(QURAN, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l).id as string),
    )
    for (const e of entries) for (const id of [e.ayah, e.meaningAyah, ...e.duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]) if (id) expect(ids.has(id), `${e.name} ${id}`).toBe(true)
  })

  it.skipIf(!fs.existsSync(HADITH))('every hadith id is an accepted Arabic row of HadeethEnc (tier 1–3), as /api/adhkar/hadith serves', () => {
    const want = new Set(entries.flatMap((e) => [e.hadith, ...e.duas.filter((d) => d.kind === 'hadith').map((d) => d.id)]).filter(Boolean) as string[])
    const tier = new Map<string, string>()
    for (const l of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!l.startsWith('{"lang":"ar"')) continue
      const r = JSON.parse(l)
      if (want.has(r.id)) tier.set(r.id, r.tier)
    }
    for (const id of want) expect(['1', '2', '3'], id).toContain(tier.get(id))
  })
})

describe('the book whose order inspired the list is named nowhere (reply 0071 §4.2, add-on 0071-add1)', () => {
  const files = [
    'data/names-daily.json',
    'scripts/names/daily-build.mjs',
    'worker/src/names-day.ts',
    'web/src/v2/daily/names/NameOfDay.tsx',
    'web/src/v2/daily/names/name-day-api.ts',
    'web/src/v2/daily/names/strings-name-day.ts',
    'web/e2e/v2-0071-names-card.spec.ts',
    'worker/test/names-day.test.ts',
    'scripts/names/forbidden.mjs',
  ]
  it.each(files)('%s', (f) => expect(findForbidden(fs.readFileSync(path.join(ROOT, f), 'utf8'))).toEqual([]))
  it.skipIf(!fs.existsSync(DRAFT))('and the check finds it where it is: the old draft’s header', () => {
    expect(findForbidden(fs.readFileSync(DRAFT, 'utf8')).length).toBeGreaterThan(0)
  })
})

describe('the readings reach the app from the server only', () => {
  it('the app imports no copy of the data file', () => {
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]))
    for (const f of walk(path.join(ROOT, 'web/src')).filter((f) => /\.(ts|tsx)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), f).not.toContain('names-daily')
  })
  it('NAMES_READINGS is "on" in env v11 alone (worker/wrangler.jsonc); production and next have none', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')
    expect(cfg.match(/"NAMES_READINGS"/g)).toHaveLength(1)
    const v11 = cfg.indexOf('"v11": {')
    const at = cfg.indexOf('"NAMES_READINGS": "on"')
    expect(v11).toBeGreaterThan(0)
    expect(at).toBeGreaterThan(v11)
    expect(cfg.indexOf('"next": {')).toBeLessThan(v11)
  })
})
