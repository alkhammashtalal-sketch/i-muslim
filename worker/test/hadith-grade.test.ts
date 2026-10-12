// The grade classes of scripts/ingest/hadeethenc-build.mjs (replies 0031-add4, add9 and add13), on grade texts as
// HadeethEnc writes them.
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script
import { classify } from '../../scripts/ingest/hadeethenc-build.mjs'

const c = (g: string, a = 'رواه أبو داود', map = {}) => classify(g, a, map)

describe('hadith grade classes', () => {
  it('sahih: tier 1 with al-Bukhari, Muslim or agreed upon; else tier 2; «صححه فلان» is sahih (add13)', () => {
    expect(c('صحيح', 'متفق عليه')).toEqual({ class: 'sahih', tier: '1' })
    expect(c('صحيح', 'رواه مسلم')).toEqual({ class: 'sahih', tier: '1' })
    expect(c('صحيح')).toEqual({ class: 'sahih', tier: '2' })
    expect(c('صححه الحافظ ابن حجر', 'رواه مالك')).toEqual({ class: 'sahih', tier: '2' })
  })
  it('hasan: «حسن», «حسّنه» (with or without the shadda), «حسن صحيح»', () => {
    expect(c('حسن')).toEqual({ class: 'hasan', tier: '3' })
    expect(c('حسّنه الألباني')).toEqual({ class: 'hasan', tier: '3' })
    expect(c('حسن صحيح')).toEqual({ class: 'hasan', tier: '3' })
  })
  it('weak, mawdu, and mixed (a weakening and an authenticating word together, add13)', () => {
    expect(c('ضعيف')).toEqual({ class: 'weak', tier: 'X' })
    expect(c('موضوع')).toEqual({ class: 'mawdu', tier: 'X' })
    expect(c('منكر')).toEqual({ class: 'weak', tier: 'X' })
    expect(c('حديث أبي ذر ضعيف، وحديث معيقيب صحيح')).toEqual({ class: 'mixed', tier: 'X' })
  })
  it('review: empty, rulings on the chain, mawquf reports', () => {
    for (const g of ['', 'إسناده صحيح', 'إسناده حسن', 'سنده صحيح', 'صحيح الإسناد', 'قال النووي: بإسناد حسن', 'قال الهيثمي في مجمع الزوائد: رجاله رجال الصحيح', 'صحيح موقوفًا على ابن عباس'])
      expect(c(g).class, g).toBe('review')
  })
  it('the grade map decides an exact text before the rules', () => {
    expect(c('إسناده صحيح', 'رواه أحمد', { 'إسناده صحيح': { class: 'sahih', tier: '2' } })).toEqual({ class: 'sahih', tier: '2' })
  })
})
