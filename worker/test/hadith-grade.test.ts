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
  it('the grade map decides an exact text before the rules (add14): accepted, mawquf, review, auto', () => {
    const map = {
      'إسناده صحيح': { class: 'accepted', tier: '3' },
      'صحيح موقوفًا على ابن عباس': { class: 'mawquf', tier: '3', mawquf: true },
      'قال الهيثمي: رجاله رجال الصحيح': { class: 'review', tier: 'X' },
      'صحيح.\nملحوظة': { class: 'sahih', tier: 'auto' },
    }
    expect(c('إسناده صحيح', 'رواه أحمد', map)).toEqual({ class: 'accepted', tier: '3' })
    expect(c('صحيح موقوفًا على ابن عباس', 'رواه البخاري', map)).toEqual({ class: 'mawquf', tier: '3', mawquf: true })
    expect(c('قال الهيثمي: رجاله رجال الصحيح', 'رواه الطبراني', map)).toEqual({ class: 'review', tier: 'X' })
    expect(c('صحيح.\nملحوظة', 'رواه مسلم', map)).toEqual({ class: 'sahih', tier: '1' })
    expect(c('صحيح.\nملحوظة', 'رواه أحمد', map)).toEqual({ class: 'sahih', tier: '2' })
  })
  it('several sound parts take the lowest, before the attribution rule (add14)', () => {
    expect(c('صحيح وحديث جابر حسن', 'متفق عليه')).toEqual({ class: 'hasan', tier: '3' })
    expect(c('حديث أبي ذر حسن.\nحديث قتادة صحيح.\nحديث ابن عباس حسن', 'رواه الترمذي')).toEqual({ class: 'hasan', tier: '3' })
    expect(c('حديث أبي قتادة: صحيح.\nحديث ابن أبي أوفى: صحيح', 'رواه مسلم')).toEqual({ class: 'sahih', tier: '1' })
  })
})
