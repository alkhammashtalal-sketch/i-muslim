// Reply 0047: §2 the English meaning of a non-ayah passage names HadeethEnc, not sunnah.com, in the ten languages;
// §3 «حسب إعداد الجوال» is the phone's Text Size within 100%–135% (web/src/text-size.ts; the page side is
// web/e2e/v2-0047.spec.ts).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BODY_DEFAULT_PX, PHONE_SCALE_MAX, PHONE_SCALE_MIN, phoneScale } from '../../web/src/text-size'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

describe('§2 meaningHadith', () => {
  it('names the hadith encyclopedia in the ten languages and sunnah.com nowhere in the interface strings', async () => {
    for (const l of LANGS) {
      const file = fs.readFileSync(path.join(ROOT, `web/src/i18n/${l}.ts`), 'utf8')
      expect(file, l).not.toMatch(/sunnah\.com|سُنّة دوت كوم/)
      const line = file.match(/meaningHadith: '([^']*)'/)?.[1]
      expect(line, l).toBeTruthy()
      // Arabic has no Latin inside its text (CLAUDE.md §8): the name alone; the others add HadeethEnc.
      if (l === 'ar') expect(line).toBe('ترجمة الحديث بالإنجليزية · موسوعة الأحاديث النبوية')
      else expect(line, l).toMatch(/\(HadeethEnc\)$/)
    }
  })
})

describe('§3 the phone\'s Text Size', () => {
  // The cap was 135% (reply 0047 §3); Apple's «Larger Text» label asks for 200% (add-on 0072-add34 §ب3).
  it('is the ratio to the default body size, never below 100% nor above 200%', () => {
    expect(BODY_DEFAULT_PX).toBe(17)
    expect([PHONE_SCALE_MIN, PHONE_SCALE_MAX]).toEqual([1, 2])
    expect(phoneScale(17)).toBe(1)
    expect(phoneScale(14)).toBe(1) // xSmall
    expect(phoneScale(16)).toBe(1) // Medium
    expect(phoneScale(19)).toBeCloseTo(19 / 17, 3) // xLarge
    expect(phoneScale(21)).toBeCloseTo(21 / 17, 3) // xxLarge
    expect(phoneScale(23)).toBeCloseTo(23 / 17, 3) // xxxLarge
    expect(phoneScale(28)).toBeCloseTo(28 / 17, 3) // AX1
    expect(phoneScale(33)).toBeCloseTo(33 / 17, 3) // AX2
    expect(phoneScale(40)).toBe(2) // AX3, 2.353 held at 200%
    expect(phoneScale(53)).toBe(2) // the largest accessibility size (AX5)
  })

  it('is 1 where the size is unknown', () => {
    for (const px of [null, Number.NaN, 0, -3, Number.POSITIVE_INFINITY]) expect(phoneScale(px)).toBe(1)
  })
})
