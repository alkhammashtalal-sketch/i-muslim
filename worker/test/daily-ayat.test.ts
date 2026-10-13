// The ayah of the day (reply 0031-add16 §1): data/daily-ayat.json (scripts/daily/daily-ayat-build.mjs) is exactly the
// Beautiful Names' Quran evidence in data/names.json and the ayat beginning with «رَبَّنَا», without duplicates and in
// Mushaf order, and the rotation in web/src/v2/home/daily-ayah.ts is stable and never negative. The checks against the
// Quran text need data/processed (outside git) and skip without it.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DAILY_AYAT, DAILY_EPOCH, dailyAyah, dailyAyahIndex, riyadhDayNumber } from '../../web/src/v2/home/daily-ayah'

const ROOT = path.resolve(import.meta.dirname, '../..')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/daily-ayat.json'), 'utf8'))
const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names.json'), 'utf8')).names as { name: string; quran?: { ayah: string } }[]
const NAME = 'دليل اسم'
const DUA = 'دعاء'
// Diacritics, the dagger alef, the Mushaf's marks and tatweel, as in the build script.
const bare = (s: string) => s.replace(/[ً-ٰٟۖ-ۭـ]/g, '').trim()
const beginsRabbana = (s: string) => /^ربنا(\s|$)/.test(bare(s))

describe('the list (reply 0031-add16 §1)', () => {
  it('every ayah once, in Mushaf order, its id matching its sura and aya', () => {
    expect(DAILY_AYAT.length).toBe(file.ayat.length)
    expect(new Set(DAILY_AYAT.map((x) => x.id)).size).toBe(DAILY_AYAT.length)
    for (const [i, x] of DAILY_AYAT.entries()) {
      expect(x.id).toBe(`quran:${x.sura}:${x.aya}`)
      if (i) {
        const p = DAILY_AYAT[i - 1]
        expect(p.sura < x.sura || (p.sura === x.sura && p.aya < x.aya), `${p.id} before ${x.id}`).toBe(true)
      }
    }
  })
  it('each ayah carries its source(s): «دليل اسم» with its names, «دعاء», or both', () => {
    for (const x of DAILY_AYAT) {
      expect(x.sources.length, x.id).toBeGreaterThan(0)
      expect([NAME, DUA].filter((s) => x.sources.includes(s)), x.id).toEqual(x.sources)
      if (x.sources.includes(NAME)) {
        expect(x.names?.length, x.id).toBeGreaterThan(0)
        for (const n of x.names!) expect(names.some((m) => m.name === n && m.quran?.ayah === x.id), `${n} in ${x.id}`).toBe(true)
      } else expect(x.names, x.id).toBeUndefined()
    }
  })
  it('every name evidence ayah is in the list, under «دليل اسم», with all its names', () => {
    const byId = new Map(DAILY_AYAT.map((x) => [x.id, x]))
    for (const n of names.filter((m) => m.quran?.ayah)) {
      const x = byId.get(n.quran!.ayah)
      expect(x, `${n.name} ${n.quran!.ayah}`).toBeDefined()
      expect(x!.sources).toContain(NAME)
      expect(x!.names).toContain(n.name)
    }
  })
  it('the counts, the epoch and the rule as written in the file', () => {
    const named = DAILY_AYAT.filter((x) => x.sources.includes(NAME)).length
    const dua = DAILY_AYAT.filter((x) => x.sources.includes(DUA)).length
    const both = DAILY_AYAT.filter((x) => x.sources.length === 2).length
    expect(file.counts).toEqual({ name_evidence: named, dua, both, total: DAILY_AYAT.length })
    expect(named + dua - both).toBe(DAILY_AYAT.length)
    expect(DAILY_EPOCH).toBe('2026-10-13')
    expect(file.rule).toContain('0031-add16 §1')
  })
  it.skipIf(!fs.existsSync(QURAN))('exactly the union: name evidence or beginning with «ربنا», none missing, none extra', () => {
    const ayat = new Map<string, { text: string; ref: string }>()
    for (const l of fs.readFileSync(QURAN, 'utf8').trim().split('\n')) {
      const r = JSON.parse(l)
      if (r.kind === 'ayah') ayat.set(r.id, r)
    }
    const evidence = new Set(names.filter((m) => m.quran?.ayah).map((m) => m.quran!.ayah))
    const rabbana = new Set([...ayat].filter(([, a]) => beginsRabbana(a.text)).map(([id]) => id))
    // The stored text writes some as «رَّبَّنَا» (3:193, 14:37, 44:12): found all the same.
    for (const id of ['quran:3:193', 'quran:14:37', 'quran:44:12']) expect(rabbana.has(id), id).toBe(true)
    expect(DAILY_AYAT.map((x) => x.id).sort()).toEqual([...new Set([...evidence, ...rabbana])].sort())
    for (const x of DAILY_AYAT) {
      const a = ayat.get(x.id)!
      expect(a.ref, x.id).toBe(x.ref)
      expect(x.sources.includes(DUA), x.id).toBe(beginsRabbana(a.text))
      expect(x.sources.includes(NAME), x.id).toBe(evidence.has(x.id))
    }
  })
})

describe('the rotation', () => {
  const at = (iso: string) => Date.parse(iso)
  it('the epoch day in Riyadh is the first ayah, and each day the next one, round the list', () => {
    const n = DAILY_AYAT.length
    // 2026-10-13 00:00 in Riyadh is 2026-10-12 21:00 UTC.
    expect(dailyAyahIndex(at('2026-10-12T21:00:00Z'))).toBe(0)
    expect(dailyAyahIndex(at('2026-10-12T20:59:00Z'))).toBe(n - 1)
    expect(dailyAyahIndex(at('2026-10-13T20:59:00Z'))).toBe(0)
    expect(dailyAyahIndex(at('2026-10-13T21:00:00Z'))).toBe(1)
    expect(dailyAyahIndex(at('2026-10-12T21:00:00Z') + n * 86_400_000)).toBe(0)
    expect(dailyAyah(at('2026-10-13T09:00:00Z'))?.id).toBe(DAILY_AYAT[0].id)
  })
  it('stable within a day and never negative, before the epoch too', () => {
    const n = DAILY_AYAT.length
    const morning = at('2027-03-01T06:00:00Z')
    expect(dailyAyahIndex(morning)).toBe(dailyAyahIndex(at('2027-03-01T20:00:00Z')))
    for (let d = -3 * n; d <= 3 * n; d += 7) {
      const i = dailyAyahIndex(at('2026-10-13T09:00:00Z') + d * 86_400_000)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(n)
      expect(i).toBe(((d % n) + n) % n)
    }
    expect(riyadhDayNumber(at('2026-10-12T21:00:00Z'))).toBe(riyadhDayNumber(at('2026-10-12T20:59:59Z')) + 1)
  })
  it('an empty list gives no ayah', () => {
    expect(dailyAyahIndex(Date.now(), 0)).toBe(-1)
  })
})
