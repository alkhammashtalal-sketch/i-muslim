// Add-on 0072-add11 §2–4: the enriched «اسم من أسماء الله» card, served from data/names-enriched.json behind
// NAMES_ENRICHED (env v11 alone). Batch 1 is the 14 names of 25 October – 7 November 2026 by Riyadh date; each was
// checked against the saved shamela pages and reviewed independently in relay/w1/0072-names-content/batch-1/ (outside
// git). Here: the switch, the present-only fields, the rotation that batch 1 covers, the data's shape and limits, and
// the book whose order inspired the list named nowhere.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findForbidden } from '../../scripts/names/forbidden.mjs'
import enriched from '../../data/names-enriched.json'
import type { Env } from '../src/index'
import { enrichedOf, handleNamesDay, NAME_ENRICHED, NAME_ENTRIES, nameDayIndex, type NameQuote } from '../src/names-day'

const ROOT = path.resolve(import.meta.dirname, '../..')
const envWith = (vars: Record<string, string> = {}) => ({ ...vars }) as unknown as Env
async function getJson(env: Env, p: string) {
  const res = await handleNamesDay(new Request(`https://x${p}`), env, new URL(`https://x${p}`))
  expect(res?.status).toBe(200)
  return (await res!.json()) as Record<string, unknown>
}
const FIELDS = ['meaning', 'meaningHadith', 'salaf', 'heart']
// Batch 1: the coming 14 days from 25 October 2026, in the card's order.
const BATCH1_DAYS = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 9, 25 + i)).toISOString().slice(0, 10))
const BATCH1_NAMES = ['الشافي', 'الوكيل', 'الشكور', 'الجبار', 'الغفور', 'القريب', 'الله', 'الأحد', 'الأعلى', 'الأكرم', 'الإله', 'الأول', 'الآخر', 'الظاهر']
const words = (s: string) => s.split(/[\s،,.؛:!؟?«»()\-–—"]+/).filter(Boolean).length

describe('NAMES_ENRICHED: the switch', () => {
  it('off (absent, or anything but "on"): none of the enriched fields, on the day or the entry', async () => {
    for (const vars of [{}, { NAMES_ENRICHED: 'off' }, { NAMES_ENRICHED: 'ON' }, { NAMES_ENRICHED: 'true' }, { NAMES_ENRICHED: '' }, { NAMES_READINGS: 'on' }]) {
      const day = await getJson(envWith(vars), '/api/names/day?day=2026-10-26')
      const entry = await getJson(envWith(vars), '/api/names/entry/5')
      for (const f of FIELDS) {
        expect(day).not.toHaveProperty(f)
        expect(entry).not.toHaveProperty(f)
      }
      expect(JSON.stringify(day)).not.toContain(NAME_ENRICHED['5'].heart!)
    }
  })

  it('on: the day and the entry carry the entry’s texts, and nothing else changes', async () => {
    const on = envWith({ NAMES_ENRICHED: 'on' })
    const day = await getJson(on, '/api/names/day?day=2026-10-26')
    const off = await getJson(envWith(), '/api/names/day?day=2026-10-26')
    expect(day.entry).toEqual(off.entry)
    expect((day.entry as { n: number }).n).toBe(5)
    expect(day.meaning).toEqual(NAME_ENRICHED['5'].meaning)
    expect(day.salaf).toEqual(NAME_ENRICHED['5'].salaf)
    expect(day.heart).toBe(NAME_ENRICHED['5'].heart)
    expect(day).not.toHaveProperty('readings')
    const entry = await getJson(on, '/api/names/entry/5')
    expect(entry.heart).toBe(NAME_ENRICHED['5'].heart)
    expect(entry.prev).toEqual({ n: 4, name: 'الشافي' })
    expect(entry.next).toEqual({ n: 6, name: 'الشكور' })
  })

  it('independent of NAMES_READINGS: each switch brings its own fields', async () => {
    const both = await getJson(envWith({ NAMES_ENRICHED: 'on', NAMES_READINGS: 'on' }), '/api/names/day?day=2026-10-26')
    expect(both).toHaveProperty('readings')
    expect(both).toHaveProperty('heart')
    const readingsOnly = await getJson(envWith({ NAMES_READINGS: 'on' }), '/api/names/day?day=2026-10-26')
    expect(readingsOnly).toHaveProperty('readings')
    expect(readingsOnly).not.toHaveProperty('heart')
  })

  it('present only: a section with no text is absent, never an empty list; an entry no batch reached carries none', async () => {
    const on = envWith({ NAMES_ENRICHED: 'on' })
    // الشافي (n 4) has no saying of the salaf in batch 1.
    const shafi = await getJson(on, '/api/names/entry/4')
    expect(shafi).toHaveProperty('meaning')
    expect(shafi).not.toHaveProperty('salaf')
    expect(shafi).toHaveProperty('heart')
    // الصمد (n 1) is not in a batch yet.
    const samad = await getJson(on, '/api/names/entry/1')
    for (const f of FIELDS) expect(samad).not.toHaveProperty(f)
    expect(enrichedOf(96)).toEqual({})
    for (let n = 1; n <= 96; n++) {
      const e = enrichedOf(n)
      for (const f of ['meaning', 'salaf'] as const) if (f in e) expect(e[f]!.length).toBeGreaterThan(0)
    }
  })

  it('the list of names is unchanged by it', async () => {
    const on = await getJson(envWith({ NAMES_ENRICHED: 'on' }), '/api/names/list')
    const off = await getJson(envWith(), '/api/names/list')
    expect(on).toEqual(off)
  })

  it('NAMES_ENRICHED is "on" in env next (batch 1 approved: add-on 0072-add23 §1) and env v11; production has none', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')
    expect(cfg.match(/"NAMES_ENRICHED": "on"/g)).toHaveLength(2)
    expect(cfg.match(/"NAMES_ENRICHED"/g)).toHaveLength(2)
    const next = cfg.indexOf('"next": {')
    const v11 = cfg.indexOf('"v11": {')
    expect(next).toBeGreaterThan(0)
    expect(v11).toBeGreaterThan(next)
    const first = cfg.indexOf('"NAMES_ENRICHED": "on"')
    const second = cfg.indexOf('"NAMES_ENRICHED": "on"', first + 1)
    expect(first).toBeGreaterThan(next)
    expect(first).toBeLessThan(v11)
    expect(second).toBeGreaterThan(v11)
    // production (the top-level vars, before env next) has none
    expect(first).toBeGreaterThan(next)
  })
})

describe('batch 1: the 14 names of 25 October – 7 November 2026', () => {
  it('the days map to entries 4–17 in the card’s order, and those are the entries the file has', () => {
    const ns = BATCH1_DAYS.map((d) => NAME_ENTRIES[nameDayIndex(d)].n)
    expect(ns).toEqual(Array.from({ length: 14 }, (_, i) => i + 4))
    expect(ns.map((n) => NAME_ENTRIES[n - 1].name)).toEqual(BATCH1_NAMES)
    expect(Object.keys(NAME_ENRICHED).map(Number)).toEqual(ns)
    expect(enriched.batches).toEqual([{ n: 1, names: ns, days: '2026-10-25 – 2026-11-07' }])
    for (const n of ns) expect(NAME_ENRICHED[String(n)].name).toBe(NAME_ENTRIES[n - 1].name)
  })

  it('the day of the first name: 25 October 2026 is الشافي', async () => {
    const day = await getJson(envWith({ NAMES_ENRICHED: 'on' }), '/api/names/day?day=2026-10-25')
    expect((day.entry as { name: string }).name).toBe('الشافي')
    expect(day.heart).toBe(NAME_ENRICHED['4'].heart)
  })
})

describe('the data: shape and limits (add-on 0072-add11 §2–3, add-on 0072-add4)', () => {
  const all = Object.entries(NAME_ENRICHED)
  const quotes: [string, string, NameQuote][] = all.flatMap(([n, e]) => [...(e.meaning ?? []).map((q) => [n, 'meaning', q] as [string, string, NameQuote]), ...(e.salaf ?? []).map((q) => [n, 'salaf', q] as [string, string, NameQuote])])

  it('1 to 3 quotes in a section (4 in «معنى الاسم» of الشافي, add-on 0072-add23 §1), and every entry has its reading', () => {
    for (const [n, e] of all) {
      for (const f of ['meaning', 'salaf'] as const) {
        if (!e[f]) continue
        expect(e[f]!.length).toBeGreaterThanOrEqual(1)
        expect(e[f]!.length, `${n} ${f}`).toBeLessThanOrEqual(n === '4' && f === 'meaning' ? 4 : 3)
      }
      expect(typeof e.heart).toBe('string')
    }
  })

  it('every quote: «قال» or «يُروى عن», who said it, the book, the printed page and the shamela page', () => {
    expect(quotes.length).toBeGreaterThan(0)
    for (const [n, , q] of quotes) {
      expect(['qala', 'yurwa'], n).toContain(q.attribution)
      for (const k of ['text', 'by', 'author', 'book', 'url'] as const) expect(q[k], `${n} ${k}`).toBeTruthy()
      // A fatwa page of binbaz.org.sa (add-on 0072-add23 §1): its link with its title, and no volume or page.
      if (q.url.startsWith('https://binbaz.org.sa/')) {
        expect(q.url).toMatch(/^https:\/\/binbaz\.org\.sa\/fatwas\/\d+\/%[0-9A-F%-]+$/)
        expect(q.ref, n).toBe('')
      } else {
        expect(q.url).toMatch(/^https:\/\/shamela\.ws\/book\/\d+\/\d+#p\d+$/)
        expect(q.ref).toMatch(/^(ج\d+ - )?ص\d+(–\d+)?$/)
      }
      if (q.ayah) expect(q.ayah).toMatch(/^quran:\d+:\d+$/)
      if (q.contextRequired) expect(q.context, n).toBeTruthy()
      if (q.origin) expect(q.origin.url, n).toMatch(/^https:\/\/hadeethenc\.com\/ar\/browse\/hadith\/\d+$/)
    }
  })

  it('the quotes are short and carry nothing of the edition: no diacritics but the app’s own few, no footnote or page marker, no editor’s bracket; the Quran’s braces only whole, around words of an ayah (add-on 0072-add16 §10)', () => {
    for (const [n, , q] of quotes) {
      expect(q.text.length, n).toBeLessThanOrEqual(330)
      expect(q.text, n).not.toMatch(/\([٠-٩0-9]+\)|⦗|⦘|\[|\]|\{|\}/)
      expect(q.text.replace(/﴿[^﴿﴾]+﴾/g, ''), n).not.toMatch(/﴿|﴾/)
      // At most two words with the app's marks (add-on 0072-add4 §3 `app_diacritics`), a handful of marks each.
      expect((q.text.match(/[ً-ٰٟ]/g) ?? []).length, n).toBeLessThanOrEqual(6)
    }
  })

  it('«أثره في قلبك»: 120 to 200 words, no ayah or hadith quoted word for word, no scholar named', () => {
    const scholars = ['الطبري', 'ابن جرير', 'السعدي', 'ابن القيم', 'ابن قيم', 'ابن كثير', 'الخطابي', 'البيهقي', 'الحليمي', 'قتادة', 'ابن عباس']
    for (const [n, e] of all) {
      const w = words(e.heart!)
      expect(w, n).toBeGreaterThanOrEqual(120)
      expect(w, n).toBeLessThanOrEqual(200)
      expect(e.heart, n).not.toMatch(/﴿|﴾|\{|\}/)
      for (const m of e.heart!.matchAll(/«([^»]*)»/g)) expect(m[1].trim().split(/\s+/).length, `${n}: «${m[1]}»`).toBe(1)
      for (const s of scholars) expect(e.heart, `${n}: ${s}`).not.toContain(s)
    }
  })

  it('the book whose order inspired the list is named nowhere in it, nor in this test', () => {
    expect(findForbidden(fs.readFileSync(path.join(ROOT, 'data/names-enriched.json'), 'utf8'))).toEqual([])
    expect(findForbidden(fs.readFileSync(path.join(ROOT, 'worker/test/names-enriched-0072.test.ts'), 'utf8'))).toEqual([])
  })

  it('the app imports no copy of the file: it reaches the app from the server only', () => {
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]))
    for (const f of walk(path.join(ROOT, 'web/src')).filter((f) => /\.(ts|tsx)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), f).not.toContain('names-enriched')
  })
})

describe('add-on 0072-add16: batch 1 after the second independent review', () => {
  const all = Object.entries(NAME_ENRICHED)
  const quotes = all.flatMap(([n, e]) => [...(e.meaning ?? []), ...(e.salaf ?? [])].map((q) => [n, q] as [string, NameQuote]))
  it('الأول، الآخر، الظاهر: the hadith «أنت الأول فليس قبلك شيء…» from HadeethEnc (6335) beside the meaning, by id, as HadeethEnc grades it', () => {
    for (const n of ['15', '16', '17']) {
      expect(NAME_ENRICHED[n].meaningHadith, n).toEqual({ id: '6335', grade: 'صحيح', attribution: 'رواه مسلم', url: 'https://hadeethenc.com/ar/browse/hadith/6335' })
      expect(enrichedOf(Number(n)).meaningHadith).toEqual(NAME_ENRICHED[n].meaningHadith)
    }
    for (const [n, e] of all) if (!['15', '16', '17'].includes(n)) expect(e.meaningHadith, n).toBeUndefined()
  })

  it('the context line is required where the review asks it, and the quotes of worship close the meaning', () => {
    const req = all.flatMap(([, e]) => [...(e.meaning ?? []), ...(e.salaf ?? [])]).filter((q) => q.contextRequired).map((q) => q.context)
    expect(req).toContain('في التعبد باسمه الأول')
    expect(req).toContain('في التعبد باسمه الآخر')
    expect(req.length).toBe(9)
    for (const n of ['15', '16']) expect(NAME_ENRICHED[n].meaning!.at(-1)!.context, n).toMatch(/^في التعبد باسمه /)
  })

  it('الوكيل: «حسبنا الله ونعم الوكيل» in quotation marks, not the Quran’s braces, and its origin in al-Bukhari', () => {
    const s = NAME_ENRICHED['5'].salaf![0]
    expect(s.text).toContain(': «حسبنا الله ونعم الوكيل»')
    expect(s.text).not.toContain(' , ')
    expect(s.origin).toEqual({ text: 'وأصله في البخاري (4563، 4564)', url: 'https://hadeethenc.com/ar/browse/hadith/65287' })
  })

  it('no broken Latin comma left in a quote', () => {
    for (const [n, q] of quotes) expect(q.text, n).not.toContain(' , ')
  })
})

describe('add-on 0072-add23 §1: الشافي, Ibn Baz on treatment', () => {
  it('the two sentences of «حكم التداوي من الأمراض» after the two quotes, by «قال ابن باز», with the fatwa’s link with its title', () => {
    const m = NAME_ENRICHED['4'].meaning!
    expect(m).toHaveLength(4)
    const url = 'https://binbaz.org.sa/fatwas/8104/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%AA%D8%AF%D8%A7%D9%88%D9%8A-%D9%85%D9%86-%D8%A7%D9%84%D8%A7%D9%85%D8%B1%D8%A7%D8%B6'
    expect(m.slice(2).map((q) => [q.text, q.by, q.url, q.ref])).toEqual([
      ['الصواب في التداوي أنه مستحب ومشروع', 'ابن باز', url, ''],
      ['تعاطي الأسباب لا ينافي التوكل، بل هو من التوكل', 'ابن باز', url, ''],
    ])
    expect(NAME_ENRICHED['4'].heart).toContain('وإن أخذت بأسباب العلاج فلا يتعلق قلبك في شفائك إلا به')
  })
})
