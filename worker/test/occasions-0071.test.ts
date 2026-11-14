// The next occasion under the Hijri date (add-on 0071-add13 §3; web/src/v2/home/occasions.ts, data/occasions.json):
// the occasions fixed by the Sharia alone, each by its Umm al-Qura day and its hadith; the line's words in the ten
// languages; and the forbidden window of «now» (§7, web/src/daily/forbidden.ts) as the times page marks it.
// Dates are local noons and the Hijri day is the device's own (Intl, Umm al-Qura named), as on the phone.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hijriParts } from '../../web/src/daily/hijri'
import { EVENTS } from '../../web/src/v2/daily/calendar-model'
import { TODAY } from '../../web/src/v2/daily/strings-today'
import { hijriDisc } from '../../web/src/v2/home/hijri-disc'
import { beginsOn, cardHijri, holdsOn, nextOccasion, occasionWhen, OCCASIONS, whenOf } from '../../web/src/v2/home/occasions'
import { HOME } from '../../web/src/v2/home/strings'

const ROOT = path.resolve(import.meta.dirname, '../..')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/occasions.json'), 'utf8'))
const strip = (s: string) => s.replace(/[ً-ْٰ‌‍]/g, '').replace(/\s+/g, ' ')
const H = (d: Date) => hijriParts(d, 0)
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('the occasions: the Sharia-fixed ones only, each with its hadith', () => {
  it('nine occasions, the order’s list and nothing else', () => {
    expect(OCCASIONS.map((o) => o.key)).toEqual(['ramadan', 'eid_fitr', 'dhul_hijjah_ten', 'arafah', 'eid_adha', 'ashura', 'sacred_rajab', 'sacred_dhul_qadah', 'white_days'])
    // By their Umm al-Qura first day.
    const first = Object.fromEntries(OCCASIONS.map((o) => [o.key, [o.month, o.day]]))
    expect(first).toEqual({
      ramadan: [9, 1],
      eid_fitr: [10, 1],
      dhul_hijjah_ten: [12, 1],
      arafah: [12, 9],
      eid_adha: [12, 10],
      ashura: [1, 10],
      sacred_rajab: [7, 1],
      sacred_dhul_qadah: [11, 1],
      white_days: ['each', 13],
    })
  })
  it('the calendar’s own hadith for the calendar’s days; the sacred months by HadeethEnc 10104', () => {
    for (const o of OCCASIONS) {
      if (o.key.startsWith('sacred_')) expect(o.hadithId, o.key).toBe('10104')
      else expect(o.hadithId, o.key).toBe(EVENTS.find((e) => e.key === o.key)!.hadith_id)
    }
  })
  it('none of the days the calendar leaves unmarked (12 Rabi I, 27 Rajab, 15 Sha‘ban, 1 Muharram) is an occasion', () => {
    const cal = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/calendar-events.json'), 'utf8'))
    for (const d of cal.not_marked.days as { month: number; day: number }[]) for (const o of OCCASIONS) expect(holdsOn(o, d), `${o.key} ${d.month}-${d.day}`).toBe(false)
  })
  it.skipIf(!fs.existsSync(HADITH))('the sacred months’ hadith: sahih (tier 1), agreed upon, and its words hold the evidence', () => {
    const rows = new Map<string, { hadeeth: string; tier: string; grade: string; attribution: string }>()
    for (const l of fs.readFileSync(HADITH, 'utf8').trim().split('\n')) {
      if (!l.includes('"10104"')) continue
      const r = JSON.parse(l)
      if (r.lang === 'ar') rows.set(r.id, r)
    }
    for (const o of data.occasions.filter((x: { evidence?: string }) => x.evidence)) {
      const r = rows.get(o.hadith_id)!
      expect(r, o.key).toBeDefined()
      expect(r.tier).toBe('1')
      expect(r.grade).toBe('صحيح')
      expect(r.attribution).toBe('متفق عليه')
      expect(strip(r.hadeeth)).toContain(strip(o.evidence))
    }
  })
  it('the white days: not in Ramadan (its fasting is obligatory) nor in Dhul-Hijjah (the 13th is a day of Tashreeq)', () => {
    const w = OCCASIONS.find((o) => o.key === 'white_days')!
    for (let m = 1; m <= 12; m++) expect(beginsOn(w, { month: m, day: 13 }), `month ${m}`).toBe(m !== 9 && m !== 12)
    expect(holdsOn(w, { month: 5, day: 15 })).toBe(true)
    expect(holdsOn(w, { month: 5, day: 16 })).toBe(false)
  })
})

describe('nextOccasion: today’s, else the next to begin (Umm al-Qura on the device)', () => {
  const cases: [[number, number, number], string, number][] = [
    [[2026, 10, 22], 'white_days', 2], // 11 Jumada I 1448
    [[2026, 10, 23], 'white_days', 1],
    [[2026, 10, 24], 'white_days', 0], // 13, 14 and 15: «today»
    [[2026, 10, 26], 'white_days', 0],
    [[2026, 11, 30], 'sacred_rajab', 10], // 20 Jumada II
    [[2027, 1, 28], 'ramadan', 11], // 20 Sha‘ban
    [[2027, 1, 23], 'ramadan', 16], // 15 Sha‘ban: never marked, though a white day; the line looks to Ramadan
    [[2027, 2, 8], 'ramadan', 0], // 1 Ramadan
    [[2027, 2, 12], 'eid_fitr', 25], // 5 Ramadan: the Eid, not Ramadan's white days
    [[2027, 3, 28], 'sacred_dhul_qadah', 11], // 20 Shawwal
    [[2027, 5, 15], 'arafah', 0], // 9 Dhul-Hijjah
    [[2027, 5, 17], 'ashura', 29], // 11 Dhul-Hijjah: Ashura, not the 13th (Tashreeq)
  ]
  for (const [[y, m, d], key, days] of cases)
    it(`${y}-${m}-${d}: ${key} in ${days} days`, () => {
      const r = nextOccasion(at(y, m, d), H)!
      expect([r.occasion.key, r.days]).toEqual([key, days])
      // The day it names is that occasion's day by Umm al-Qura.
      expect(holdsOn(r.occasion, H(at(y, m, d + r.days))!)).toBe(true)
    })

  it('every day of a whole Hijri year has one, within a month, and each occasion comes up', () => {
    const seen = new Set<string>()
    let max = 0
    for (let i = 0; i < 355; i++) {
      const r = nextOccasion(at(2026, 6, 16 + i), H)!
      expect(r, `day ${i}`).not.toBeNull()
      max = Math.max(max, r.days)
      seen.add(r.occasion.key)
    }
    expect(max).toBeLessThanOrEqual(31)
    expect([...seen].sort()).toEqual(OCCASIONS.map((o) => o.key).sort())
  })

  it('the offsets move it as they move the calendar: a day later by Umm al-Qura is a day nearer', () => {
    const plain = nextOccasion(at(2026, 10, 22), H)!
    const later = nextOccasion(at(2026, 10, 22), (d) => hijriParts(d, 1))!
    expect(later.occasion.key).toBe(plain.occasion.key)
    expect(later.days).toBe(plain.days - 1)
  })

  it('without Umm al-Qura in the engine: nothing', () => {
    expect(nextOccasion(at(2026, 10, 22), () => null)).toBeNull()
  })
})

describe('add-on 0071-add15 §3: the card’s disc takes the line’s Hijri offset, so the two agree', () => {
  it('12 Jumada I with +1: the disc says 13 and the line «today»; with no offset, 12 and «tomorrow»; with −1 on the 13th, 12 and «tomorrow»', () => {
    const plus = cardHijri('ar', at(2026, 10, 23), 1)
    expect(plus.disc!.day).toBe('١٣')
    expect([plus.occasion!.occasion.key, plus.occasion!.days]).toEqual(['white_days', 0])
    const none = cardHijri('ar', at(2026, 10, 23), 0)
    expect(none.disc!.day).toBe('١٢')
    expect([none.occasion!.occasion.key, none.occasion!.days]).toEqual(['white_days', 1])
    const minus = cardHijri('ar', at(2026, 10, 24), -1)
    expect(minus.disc!.day).toBe('١٢')
    expect([minus.occasion!.occasion.key, minus.occasion!.days]).toEqual(['white_days', 1])
  })
  it('every day of a Hijri year, offsets −2 to +2: the disc’s day and month are the line’s, and an occasion of «today» holds on the disc’s day', () => {
    const monthName = new Map<number, string>()
    for (const off of [-2, -1, 0, 1, 2])
      for (let i = 0; i < 355; i++) {
        const d = at(2026, 6, 16 + i)
        const { disc, occasion } = cardHijri('en', d, off)
        const h = hijriParts(d, off)!
        expect(Number(disc!.day), `${off} ${i}`).toBe(h.day)
        if (!monthName.has(h.month)) monthName.set(h.month, disc!.month)
        expect(disc!.month, `${off} ${i}`).toBe(monthName.get(h.month))
        if (occasion!.days === 0) expect(holdsOn(occasion!.occasion, h), `${off} ${i}`).toBe(true)
        // The offset is really applied to the disc: a day later by the offset is the next day's plain disc.
        if (off === 1) expect(disc).toEqual(hijriDisc('en', at(2026, 6, 17 + i)))
      }
    expect(monthName.size).toBe(12)
  })
})

describe('the line’s words', () => {
  it('today, tomorrow, days under a month, then about n months', () => {
    expect(whenOf(0)).toEqual({ kind: 'today' })
    expect(whenOf(1)).toEqual({ kind: 'tomorrow' })
    expect(whenOf(2)).toEqual({ kind: 'days', n: 2 })
    expect(whenOf(29)).toEqual({ kind: 'days', n: 29 })
    expect(whenOf(30)).toEqual({ kind: 'months', n: 1 })
    expect(whenOf(45)).toEqual({ kind: 'months', n: 2 })
    expect(whenOf(89)).toEqual({ kind: 'months', n: 3 })
  })
  it('Arabic and English as written («بعد نحو …» for months)', () => {
    const ar = HOME.ar.occ
    expect([0, 1, 2, 3, 11, 30, 45, 90].map((n) => occasionWhen(n, ar, 'ar'))).toEqual([
      'اليوم',
      'غدًا',
      'بعد يومين',
      'بعد ٣ أيام',
      'بعد ١١ يومًا',
      'بعد نحو شهر',
      'بعد نحو شهرين',
      'بعد نحو ٣ أشهر',
    ])
    const en = HOME.en.occ
    expect([0, 1, 2, 30, 90].map((n) => occasionWhen(n, en, 'en'))).toEqual(['today', 'tomorrow', 'in 2 days', 'in about a month', 'in about 3 months'])
  })
  it('the sacred months as Talal worded them (add-on 0071-add15 §3), and no deed named for Rajab', () => {
    expect(HOME.ar.occ.names.sacred_rajab).toBe('رجب، من الأشهر الحرم')
    expect(HOME.ar.occ.names.sacred_dhul_qadah).toBe('بداية الأشهر الحرم الثلاثة المتتابعة')
    expect(HOME.en.occ.names.sacred_rajab).toBe('Rajab, a sacred month')
    expect(HOME.en.occ.names.sacred_dhul_qadah).toBe('Start of the three consecutive sacred months')
    // Rajab's evidence is the sacred months' hadith alone (no fasting day of the calendar), and its name names no deed.
    expect(data.occasions.find((o: { key: string }) => o.key === 'sacred_rajab')).toMatchObject({ month: 7, day: 1, hadith_id: '10104' })
    expect(data.occasions.find((o: { key: string }) => o.key === 'sacred_rajab').event).toBeUndefined()
    for (const l of LANGS) expect(HOME[l].occ.names.sacred_rajab, l).not.toMatch(/صي|صوم|صلا|عمر|ذكر|fast|pray|umrah|oruç|puasa|jeûn|ayun|রোজা|রোযা|নামাজ|रोज़|नमाज़|روز|نماز/i)
  })
  it('the ten languages: every occasion named, every form filled, no placeholder left', () => {
    for (const l of LANGS) {
      const o = HOME[l].occ
      for (const x of OCCASIONS) expect(o.names[x.key], `${l} ${x.key}`).toBeTruthy()
      for (const n of [0, 1, 2, 3, 5, 11, 21, 29, 30, 60, 100]) expect(occasionWhen(n, o, l), `${l} ${n}`).not.toMatch(/\{|\}/)
      expect(o.label && o.opens, l).toBeTruthy()
    }
  })
  it('the forbidden-now texts in the ten languages, with the end time in the card’s line', () => {
    for (const l of LANGS) {
      const s = TODAY[l]
      expect(s.forbiddenNowTag, l).toBeTruthy()
      expect(s.forbiddenNowAsr, l).toBeTruthy()
      expect(s.forbiddenNowLine, l).toContain('{b}')
    }
  })
})
