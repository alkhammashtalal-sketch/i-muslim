// «قصص من السنة» (add-on 0033-add7 §ب): data/starter-story-cats.json maps the ten steps of the starter path to HadeethEnc
// categories, and scripts/daily/starter-stories-build.mjs picks the candidates by the add-on's rule: grade exactly
// «صحيح», not mawquf, a story marker, more interface languages first, up to 12. Synthetic records only; the check of the
// category titles against categories-list-ar.json needs data/raw (outside git) and skips without it.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script
import * as S from '../../scripts/daily/starter-stories-build.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/starter-story-cats.json'), 'utf8'))
const PATH = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/starter-path.json'), 'utf8'))
const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

describe('data/starter-story-cats.json', () => {
  it('the ten steps of the starter path, in its order', () => {
    expect(CFG.steps.map((s: any) => s.id)).toEqual(PATH.steps.map((s: any) => s.id))
  })
  it('category ids and titles only; no category both main and extra in a step', () => {
    for (const s of CFG.steps) {
      expect(s.categories.length, s.id).toBeGreaterThan(0)
      for (const c of [...s.categories, ...s.more]) {
        expect(Object.keys(c).sort()).toEqual(['id', 'title'])
        expect(c.id).toMatch(/^\d+$/)
        expect(c.title.length).toBeGreaterThan(0)
      }
      const main = new Set(s.categories.map((c: any) => c.id))
      for (const c of s.more) expect(main.has(c.id), `${s.id} ${c.id}`).toBe(false)
      for (const id of s.hadiths) expect(id).toMatch(/^\d+$/)
    }
  })
  it('the prayer step is the coordinator example: 464, 457, 456 and hadith 66313', () => {
    const salah = CFG.steps.find((s: any) => s.id === 'salah')
    expect(salah.categories.map((c: any) => c.id)).toEqual(['464', '457', '456'])
    expect(salah.hadiths).toEqual(['66313'])
  })
  it('the add-on rule as written: «صحيح», its six markers, the ten languages, up to 12; the examples', () => {
    expect(CFG.rule.grade).toBe('صحيح')
    expect(CFG.rule.markers_addon).toEqual(['أن رجلًا', 'جاء رجل', 'دخل رجل', 'بينما', 'كنا مع', 'سألت'])
    expect(CFG.rule.languages).toEqual(TEN)
    expect(CFG.rule.max).toBe(12)
    expect(CFG.examples.ids).toEqual(['3185', '4968', '65044', '66313', '3365'])
  })
})

describe('the rule (add-on §ب)', () => {
  const rule = CFG.rule
  it('story markers after normalisation, at a word start, with or without ف or و', () => {
    expect(S.storyMarker('عن فلان: أَنَّ رَجُلًا قال', rule)).toMatchObject({ marker: 'أن رجلًا', addon: true })
    expect(S.storyMarker('قال: فَبَيْنَمَا نحن', rule)).toMatchObject({ marker: 'بينما', addon: true })
    expect(S.storyMarker('وسألتُه عن ذلك', rule)).toMatchObject({ marker: 'سألت', addon: true })
    expect(S.storyMarker('جاءت امرأةٌ', rule)).toMatchObject({ marker: 'جاءت امرأة', addon: false })
    expect(S.storyMarker('قال رسول الله: الدين النصيحة', rule)).toBeNull()
    // Inside a word is not a marker: «تبينما» does not start with «بينما».
    expect(S.storyMarker('تبينما', rule)).toBeNull()
  })
  it('an add-on marker is reported before an added one, and every marker is listed', () => {
    const m = S.storyMarker('أتى رجلٌ النبي، فبينما هو', rule)
    expect(m.marker).toBe('بينما')
    expect(m.addon).toBe(true)
    expect(m.all).toEqual(['بينما', 'أتى رجل'])
  })
  it('the grade exactly «صحيح», and not mawquf', () => {
    expect(S.gradeOk({ grade: 'صحيح', attribution: 'متفق عليه' })).toBe(true)
    expect(S.gradeOk({ grade: ' صحيح ', attribution: 'رواه مسلم' })).toBe(true)
    for (const g of ['حسن', 'صحيح لغيره', 'إسناده صحيح', 'صحيح موقوفًا على ابن عباس', 'حسن صحيح'])
      expect(S.gradeOk({ grade: g, attribution: 'رواه البخاري' }), g).toBe(false)
    const map = { صحيح: { class: 'mawquf', tier: '3', mawquf: true } }
    expect(S.gradeOk({ grade: 'صحيح', attribution: 'رواه البخاري' }, map)).toBe(false)
  })
  it('languages counted among the ten only', () => {
    expect(S.langsOf({ translations: ['ar', 'en', 'fa', 'ru', 'hi', 'zh'] }, TEN)).toEqual(['ar', 'en', 'hi'])
    expect(S.langsOf({}, TEN)).toEqual([])
  })
  it('order and limit: more languages first, add-on markers before added, tier, number; pinned kept; extra only to fill', () => {
    const c = (id: string, n: number, addon = true, tier = '1', gradeOk = true, marker = true) => ({
      id,
      langs: TEN.slice(0, n),
      marker: marker ? { marker: 'x', addon, all: ['x'] } : null,
      tier,
      gradeOk,
    })
    const pool = [c('5', 8), c('4', 9, false), c('3', 9), c('2', 9, true, '2'), c('1', 10, true, '1', false), c('9', 1, true, '1', true, false)]
    const picked = S.pickStep(pool, new Set(['9']), 3, [c('7', 10), c('8', 10)])
    // «9» is pinned (no marker, one language) and kept; «1» fails the grade; the best two of the rest: 3 then 2.
    expect(picked.map((x: any) => x.id)).toEqual(['3', '2', '9'])
    const filled = S.pickStep([c('3', 9)], new Set(), 3, [c('8', 10), c('7', 10), c('6', 2, true, '1', false)])
    expect(filled.map((x: any) => [x.id, Boolean(x.fill)])).toEqual([
      ['3', false],
      ['7', true],
      ['8', true],
    ])
  })
})

const CATS = path.join(ROOT, 'data/raw/hadeethenc/categories-list-ar.json')
describe.skipIf(!fs.existsSync(CATS))('against the HadeethEnc category list', () => {
  it('every category title as written in categories-list-ar.json', () => {
    const cats = new Map((JSON.parse(fs.readFileSync(CATS, 'utf8')) as { id: string; title: string }[]).map((c) => [String(c.id), c.title]))
    for (const s of CFG.steps) for (const c of [...s.categories, ...s.more]) expect(cats.get(c.id), `${s.id} ${c.id}`).toBe(c.title)
  })
})
