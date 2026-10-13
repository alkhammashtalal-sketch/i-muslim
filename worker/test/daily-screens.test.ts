// The daily screens' logic, part D items 1-4, 7, 9 (reply 0032; web/src/v2/daily): the quotes of the forbidden times
// cut from data/fatwas.json, the calendar month and its marks, plural and duration wording, the hadith reader, the
// shipped city list.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dayList, eventsOn, monthAround, noon } from '../../web/src/v2/daily/calendar-model'
import { cut, fatwa, forbiddenQuotes, mawlidExcerpt, shownQuote } from '../../web/src/v2/daily/fatwas'
import { duration, plural } from '../../web/src/v2/daily/format'
import { readHadith } from '../../web/src/v2/daily/hadith-client'
import { TODAY } from '../../web/src/v2/daily/strings-today'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const fatwas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fatwas.json'), 'utf8'))

describe('forbidden-times quotes: exact words of the stored texts (reply 0031-add14)', () => {
  it('each quote is found as written in its source, and none is retyped', () => {
    const q = forbiddenQuotes()
    expect(q.afterSunrise).toEqual({ text: 'بعد طلوع الشمس إلى أن ترتفع قيد رمح', elided: true })
    expect(q.standing).toEqual({ text: 'والوقت ليس بالطويل يقارب ربع ساعة أو ثلث ساعة', elided: false })
    expect(fatwas.fatwas.find((f: { number: string }) => f.number === '10693').answer).toContain(q.afterSunrise!.text)
    expect(fatwas.fatwas.find((f: { number: string }) => f.number === '12348').answer).toContain(q.standing!.text)
    expect(q.beforeZawal?.text).toBe(fatwas.books[0].passage)
    expect(q.sources.f10693?.url).toMatch(/^https:\/\/binbaz\.org\.sa\/fatwas\/10693\/.+/)
    expect(q.sources.book?.url).toBe('https://shamela.ws/book/10649/1319#p2')
  })
  it('after sunrise is shown «… بعد طلوع الشمس إلى أن ترتفع قيد رمح»: «…» in place of «الثاني:», the rest cut as written (reply 0031-add16 §4)', () => {
    const q = forbiddenQuotes()
    expect(shownQuote(q.afterSunrise!)).toBe('… بعد طلوع الشمس إلى أن ترتفع قيد رمح')
    expect(shownQuote(q.afterSunrise!)).not.toContain('الثاني')
    // The other quotes are shown with nothing added.
    expect(shownQuote(q.standing!)).toBe(q.standing!.text)
    expect(shownQuote(q.beforeZawal!)).toBe(fatwas.books[0].passage)
  })
  it('the two estimates before the zawal are both quoted, and the fixed line under them says the window covers both', () => {
    const q = forbiddenQuotes()
    expect(q.standing!.text).toContain('يقارب ربع ساعة أو ثلث ساعة')
    expect(q.beforeZawal!.text).toContain('بنحو عشر دقائق')
    expect(TODAY.ar.zawalEstimates).toBe('اختلف تقدير الشيخين للمدة، والوقت المعروض يشمل التقديرين.')
    for (const l of LANGS) expect(TODAY[l].zawalEstimates.length).toBeGreaterThan(20)
  })
  it('a quote that is not in the text is not shown', () => {
    expect(cut('نص', 'غيره')).toBeNull()
    expect(cut(undefined, 'x')).toBeNull()
  })
  it('13471 keeps its private-use characters in the stored text (the screen hides them from view only)', () => {
    const a = fatwa('13471')!.answer
    expect([...a.matchAll(/[-]/g)].map((m) => m[0].codePointAt(0)!.toString(16))).toEqual(['f074', 'f079', 'f074'])
  })
  it('13471 on screen: its title, one sentence cut as written, and its full link; never a private-use character (reply 0031-add16 §5)', () => {
    const f = fatwa('13471')!
    const m = mawlidExcerpt()!
    expect(m.sentence).toBe('الاحتفال بالموالد ليس بمشروع، بل هو من البدع')
    expect(f.answer).toContain(m.sentence)
    expect(m.url).toBe(f.url)
    expect(m.title).toBe(f.title)
    // Everything the screen draws from 13471, and the link's label in every language.
    const shown = [m.title, m.sentence, ...LANGS.map((l) => TODAY[l].fatwaFull)].join('\n')
    expect(shown).not.toMatch(/[-]/u)
    // Neither the question nor the rest of the answer.
    expect(shown).not.toContain(f.question.slice(0, 20))
    expect(shown).not.toContain('ولم يثبت')
    expect(TODAY.ar.fatwaFull).toBe('الفتوى كاملة في موقع الشيخ')
  })
})

describe('calendar month', () => {
  it('days lists and ranges', () => {
    expect([...dayList('21,23,25')]).toEqual([21, 23, 25])
    expect(dayList('13-15').size).toBe(3)
  })
  it('the marks of a day: by Hijri date, «each» month, and weekday', () => {
    const keys = (m: number, d: number, wd: number) => eventsOn({ month: m, day: d }, wd).map((e) => e.key).sort()
    expect(keys(9, 27, 3)).toEqual(['last_ten', 'odd_nights', 'ramadan'])
    expect(keys(5, 14, 3)).toEqual(['white_days'])
    expect(keys(12, 9, 1)).toEqual(['arafah', 'dhul_hijjah_ten', 'mon_thu'])
    expect(keys(3, 12, 3)).toEqual([])
    expect(keys(7, 27, 2)).toEqual([])
    // The decided unmarked days carry no mark at all, though Sha'ban and the white days cover the 15th.
    expect(keys(8, 15, 2)).toEqual([])
    expect(keys(8, 14, 2)).toEqual(['shaban', 'white_days'])
    expect(keys(3, 12, 1)).toEqual([])
    expect(keys(1, 1, 2)).toEqual([])
  })
  it('a month from Intl Umm al-Qura: 29 or 30 days from day 1, the dot only on recommended fasting days', () => {
    const m = monthAround(new Date(2026, 9, 15), 0)!
    expect(m[0].h.day).toBe(1)
    expect([29, 30]).toContain(m.length)
    expect(m.every((d, i) => d.h.day === i + 1)).toBe(true)
    for (const d of m) expect(d.fasting).toBe(d.events.length > 0 && !d.events.some((e) => ['ramadan', 'eid_fitr', 'eid_adha', 'tashreeq'].includes(e.key)))
    const shifted = monthAround(noon(new Date(2026, 9, 15)), 1)!
    expect(shifted[0].date.getTime()).toBe(m[0].date.getTime() - 86_400_000)
  })
  it('no dot on an Eid or Tashreeq day even on a Monday, nor in Ramadan', () => {
    // 1447: Dhul-Hijjah 13 is Tashreeq and a white day; Ramadan days are never dotted.
    const dh = monthAround(new Date(2027, 4, 28), 0)!.find((d) => d.h.month === 12 && d.h.day === 13)
    if (dh) expect(dh.fasting).toBe(false)
    const rm = monthAround(new Date(2027, 1, 20), 0)!
    expect(rm.every((d) => !d.fasting)).toBe(true)
  })
})

describe('wording', () => {
  it('Arabic after «بعد»: the genitive forms', () => {
    const s = TODAY.ar
    expect(duration(2 * 3600_000 + 35 * 60_000, 'ar', s)).toBe('ساعتين و٣٥ دقيقة')
    expect(duration(60_000, 'ar', s)).toBe('دقيقة')
    expect(duration(2 * 60_000, 'ar', s)).toBe('دقيقتين')
    expect(duration(5 * 60_000, 'ar', s)).toBe('٥ دقائق')
    expect(duration(3600_000, 'ar', s)).toBe('ساعة')
    expect(duration(25 * 60_000, 'en', TODAY.en)).toBe('25 minutes')
    expect(duration(61 * 60_000, 'en', TODAY.en)).toBe('1 hour 1 minute')
  })
  it('days done: Arabic plural forms and the zero line', () => {
    const p = TODAY.ar.doneOf
    expect(plural(p, 0, 'ar', { t: '٤٠' })).toBe('لم تنجزه بعد، من ٤٠')
    expect(plural(p, 1, 'ar', { t: '٤٠' })).toBe('أنجزته يومًا واحدًا من ٤٠')
    expect(plural(p, 12, 'ar', { t: '٤٠' })).toBe('أنجزته ١٢ يومًا من ٤٠')
    expect(plural(p, 7, 'ar', { t: '٣٠' })).toBe('أنجزته ٧ أيام من ٣٠')
    expect(plural(TODAY.ar.daysN, 100, 'ar')).toBe('١٠٠ يوم')
  })
})

describe('hadith reader for the calendar', () => {
  it('reads { ar, tr } and a flat Arabic row; a missing grade gives nothing', () => {
    expect(readHadith({ ar: { text: 'نص', grade: 'صحيح', attribution: 'رواه مسلم' }, tr: { text: 'text' } }, '1', 'en')).toEqual({
      id: '1',
      text: 'نص',
      grade: 'صحيح',
      attribution: 'رواه مسلم',
      translation: { lang: 'en', text: 'text' },
    })
    expect(readHadith({ lang: 'ar', text: 'نص', grade: 'حسن', attribution: '' }, '2', 'ar')).toMatchObject({ text: 'نص', grade: 'حسن' })
    expect(readHadith({ lang: 'en', text: 'text', text_ar: 'نص', grade_ar: 'صحيح' }, '3', 'en')).toMatchObject({ text: 'نص', translation: { text: 'text' } })
    expect(readHadith({ ar: { text: 'نص' } }, '4', 'ar')).toBeNull()
  })
})

describe('the shipped city list (web/public/geo/cities.json)', () => {
  const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/public/geo/cities.json'), 'utf8'))
  it('rows of [name, Arabic or 0, lat, lng, country, tz index]; the eight Saudi cities of the prayer table are in it', () => {
    expect(f.rows.length).toBeGreaterThan(10_000)
    for (const r of f.rows) expect(typeof f.tz[r[5]]).toBe('string')
    for (const n of ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Dammam', 'Abha', 'Tabuk', "Ha'il"]) expect(f.rows.some((r: unknown[]) => r[0] === n && r[4] === 'SA')).toBe(true)
  })
})
