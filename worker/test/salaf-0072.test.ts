// «من أقوال السلف» (reply 0072 item 11; add-on 0072-add4): data/salaf-daily.json and the home card's model
// (web/src/v2/daily/salaf). The rotation: one card a day for everyone by the Riyadh date, (days since 2026-01-01) mod
// 26, in the pre-set order; no two consecutive days share a sayer or a topic, the wrap included (§5 ب). The fields the
// card needs, each text as reviewed (relay/w1/0072-salaf/samples.json, read when present), and the card in the Arabic
// interface only (§5 أ).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../../data/salaf-daily.json'
import { SALAF_CARDS, salafAttribution, salafIndex, salafOfDay, salafParts, salafShown, salafSource, salafVolPage } from '../../web/src/v2/daily/salaf/salaf-model'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SAMPLES = '/Users/talal/i-muslim/relay/w1/0072-salaf/samples.json'
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
/** Noon in Riyadh on the epoch day plus `d` days. */
const noon = (d: number) => Date.parse('2026-01-01T09:00:00Z') + d * 86_400_000

describe('«من أقوال السلف»: the data (add-on 0072-add4)', () => {
  it('26 cards, the epoch 2026-01-01, Arabic only, and an _about with the source and the decision', () => {
    expect(data.count).toBe(26)
    expect(SALAF_CARDS).toHaveLength(26)
    expect(data.epoch).toBe('2026-01-01')
    expect(data.show_when_interface_lang).toBe('ar')
    expect(data._about).toContain('0072-add4')
    expect(data._about).toContain('shamela.ws')
  })

  it('every card has the fields the card needs, a Shamela page link, and a short text', () => {
    const ns = new Set<number>()
    SALAF_CARDS.forEach((c, i) => {
      expect(c.day, `card ${c.n}`).toBe(i)
      expect(ns.has(c.n)).toBe(false)
      ns.add(c.n)
      expect(['qala', 'yurwa']).toContain(c.attribution)
      for (const k of ['topic', 'text', 'sayer', 'book', 'book_title', 'author', 'author_by', 'vol_page', 'url'] as const) expect(c[k].trim(), `${c.n}.${k}`).not.toBe('')
      expect(c.url, `${c.n}`).toMatch(/^https:\/\/shamela\.ws\/book\/\d+\/\d+#p\d+$/)
      expect(c.vol_page, `${c.n}`).toMatch(/^(ج\d+ - )?ص\d+$/)
      // The topic short (§2: two words, and the review's own «التحذير من العُجب»), the text short (one to three
      // lines; §5 د).
      expect(c.topic.split(/\s+/).length, `${c.n}`).toBeLessThanOrEqual(c.n === 19 ? 3 : 2)
      expect(c.text.length, `${c.n}`).toBeLessThanOrEqual(160)
      // Without the edition's diacritics (§5 ج): only the app's own «المَلِك» (13) carries a vowel mark.
      const marks = c.text.replace(/المَلِك/g, '').match(/[ً-ْ]/g)
      expect(marks, `${c.n}`).toBeNull()
    })
    // The topics and attributions the review set (§1, §2).
    const by = (n: number) => SALAF_CARDS.find((c) => c.n === n)!
    for (const n of [1, 2, 3, 5, 19, 22]) expect(by(n).attribution, `${n}`).toBe('yurwa')
    expect(SALAF_CARDS.filter((c) => c.attribution === 'yurwa')).toHaveLength(6)
    expect(by(10).topic).toBe('حفظ اللسان')
    expect(by(17).topic).toBe('معرفة الله')
    expect(by(18).topic).toBe('العمل بالعلم')
    expect(by(19).topic).toBe('التحذير من العُجب')
    expect(by(30).topic).toBe('العمل بالعلم')
    expect(by(25).sayer).toBe('مطرف بن عبد الله')
    expect(by(13).text).toBe('ما دمت في صلاة فأنت تقرع باب المَلِك ومن يقرع باب المَلِك يفتح له')
    expect(by(12).text).toContain('والأناة')
    // Removed by the review (§4): 4, 7, 9, 16, 27; 31 replaces 9.
    for (const n of [4, 7, 9, 16, 27]) expect(SALAF_CARDS.some((c) => c.n === n), `${n}`).toBe(false)
    expect(by(31).text).toBe('يسير الدنيا يشغل عن كثير الآخرة')
  })

  it('one author per book, in the names Talal gave (add-on 0072-add7 §3.4)', () => {
    const AUTHORS: Record<number, [string, string]> = {
      8494: ['الإمام أحمد بن حنبل', 'للإمام أحمد بن حنبل'],
      10495: ['أبو نعيم الأصبهاني', 'لأبي نعيم الأصبهاني'],
      12031: ['ابن الجوزي', 'لابن الجوزي'],
      10906: ['الذهبي', 'للذهبي'],
      11363: ['ابن رجب الحنبلي', 'لابن رجب الحنبلي'],
    }
    for (const c of data.cards) expect([c.author, c.author_by], `${c.n}`).toEqual(AUTHORS[c.book_id])
    expect(new Set(data.cards.map((c) => c.book_id)).size).toBe(5)
  })

  it('the gloss of card 23 apart, and the parts joined are the text exactly', () => {
    for (const c of SALAF_CARDS) expect(salafParts(c).map((p) => p.text).join(''), `${c.n}`).toBe(c.text)
    const c23 = SALAF_CARDS.find((c) => c.n === 23)!
    expect(salafParts(c23).filter((p) => p.gloss).map((p) => p.text)).toEqual(['-يعني: كتبه-'])
    expect(SALAF_CARDS.filter((c) => c.gloss).map((c) => c.n)).toEqual([23])
  })

  it('no raw page and no edition text in the repository: only the shown text, no `text` with diacritics', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'data/salaf-daily.json'), 'utf8')
    expect(raw).not.toMatch(/<html|<div|page_file|live_file|chapter_on_page/)
    expect(raw.length).toBeLessThan(40_000)
  })

  it('every shown text is samples.json\'s display_text, letter for letter (when the relay file is present)', (ctx) => {
    if (!fs.existsSync(SAMPLES)) ctx.skip()
    const s = JSON.parse(fs.readFileSync(SAMPLES, 'utf8')) as {
      rotation: { epoch: string; count: number }
      samples: { n: number; display_text: string; gloss_display?: string; attribution: string; topic: string; sayer_display: string; url: string; vol_page: string; rotation_day: number; book: string }[]
    }
    expect(s.rotation.epoch).toBe(data.epoch)
    expect(s.samples).toHaveLength(SALAF_CARDS.length)
    for (const x of s.samples) {
      const c = SALAF_CARDS.find((y) => y.n === x.n)!
      expect(c, `${x.n}`).toBeTruthy()
      expect(c.text, `${x.n}`).toBe(x.display_text)
      expect(c.gloss, `${x.n}`).toBe(x.gloss_display)
      expect(c.day, `${x.n}`).toBe(x.rotation_day)
      expect([c.attribution, c.topic, c.sayer, c.url, c.vol_page, c.book], `${x.n}`).toEqual([x.attribution, x.topic, x.sayer_display, x.url, x.vol_page, x.book])
    }
  })
})

describe('«من أقوال السلف»: the rotation (§5 ب)', () => {
  it('day 0 is 2026-01-01 in Riyadh, then one card a day, and the 27th day wraps to the first', () => {
    expect(salafIndex(noon(0))).toBe(0)
    expect(salafOfDay(noon(0))!.n).toBe(1)
    for (let d = 0; d < 26; d++) expect(salafIndex(noon(d))).toBe(d)
    expect(salafIndex(noon(26))).toBe(0)
    expect(salafIndex(noon(27))).toBe(1)
    // Before the epoch: never negative.
    expect(salafIndex(noon(-1))).toBe(25)
    // The Riyadh date: 23:30 on 31 December in Riyadh is still the day before; 00:30 on 1 January is day 0.
    expect(salafIndex(Date.parse('2025-12-31T20:30:00Z'))).toBe(25)
    expect(salafIndex(Date.parse('2025-12-31T21:30:00Z'))).toBe(0)
    // Today in the decision's week: 24 October 2026 is day 296, 296 mod 26 = 10, card 13.
    expect(salafOfDay(Date.parse('2026-10-24T09:00:00Z'))!.n).toBe(13)
  })

  it('no two consecutive days share a sayer or a topic, across a whole year and the wrap', () => {
    const n = SALAF_CARDS.length
    for (let i = 0; i < n; i++) {
      const a = SALAF_CARDS[i]
      const b = SALAF_CARDS[(i + 1) % n]
      expect(a.sayer, `day ${i}`).not.toBe(b.sayer)
      expect(a.topic, `day ${i}`).not.toBe(b.topic)
    }
    for (let d = 0; d < 366; d++) {
      const a = salafOfDay(noon(d))!
      const b = salafOfDay(noon(d + 1))!
      expect([a.sayer, a.topic], `day ${d}`).not.toEqual([b.sayer, b.topic])
      expect(a.sayer).not.toBe(b.sayer)
      expect(a.topic).not.toBe(b.topic)
    }
  })
})

describe('«من أقوال السلف»: the card', () => {
  it('shown in the Arabic interface only', () => {
    expect(salafShown('ar')).toBe(true)
    for (const l of LANGS.filter((x) => x !== 'ar')) expect(salafShown(l), l).toBe(false)
    const src = fs.readFileSync(path.join(ROOT, 'web/src/v2/daily/salaf/SalafCard.tsx'), 'utf8')
    expect(src).toContain('if (!salafShown(lang) || !card) return null')
    // On the home page under «يومك», after «اسم من أسماء الله».
    const slots = fs.readFileSync(path.join(ROOT, 'web/src/v2/daily/HomeSlots.tsx'), 'utf8')
    expect(slots.indexOf('<SalafCard />')).toBeGreaterThan(slots.indexOf('<NameOfDay />'))
  })

  it('«قال فلان» or «يُروى عن فلان», «الكتاب» with its volume and page, and the link opening outside', () => {
    const by = (n: number) => SALAF_CARDS.find((c) => c.n === n)!
    expect(salafAttribution(by(1))).toBe('يُروى عن عمر بن الخطاب')
    expect(salafAttribution(by(8))).toBe('قال طلق بن حبيب')
    expect(salafVolPage(by(8))).toBe('ج3، ص65')
    expect(salafVolPage(by(1))).toBe('ص99')
    // The book with its author (add-on 0072-add7 §3.4), then the volume and page.
    expect(salafSource(by(1))).toBe('«الزهد» للإمام أحمد بن حنبل، ص99')
    expect(salafSource(by(8))).toBe('«حلية الأولياء» لأبي نعيم الأصبهاني، ج3، ص65')
    expect(salafSource(by(13))).toBe('«صفة الصفوة» لابن الجوزي، ج1، ص156')
    expect(salafSource(by(23))).toBe('«سير أعلام النبلاء» للذهبي، ج10، ص29')
    expect(salafSource(by(25))).toBe('«لطائف المعارف» لابن رجب الحنبلي، ص206')
    const src = fs.readFileSync(path.join(ROOT, 'web/src/v2/daily/salaf/SalafCard.tsx'), 'utf8')
    expect(src).toContain('target="_blank" rel="noopener noreferrer"')
    // No model, no translation, no server: the card's words are the data's.
    expect(src).not.toMatch(/fetch\(|\bapi\b|translate|STRINGS\[/)
  })
})
