import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { TOOLS } from '../src/v2/daily/strings-tools'
import { openFolds } from './fold'

// «أذكار الصباح» and «أذكار المساء» ready to say (0049 د) on a preview of next (never the live link): each dhikr our
// line «تقول في الصباح:» (with the hadith's count), then the words in a box, the list's highlighted segments of the
// hadith's own text in their order, then the hadith whole; no HadeethEnc title in the two lists; 3008's morning its
// wording whole, built from its segments (0049-add1 أ); 5490's evening box its first saying only; the recitations'
// boxes from the Mushaf data (0049-add1 ب).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0049-adhkar.spec.ts --project=mobile --workers=2
// SHOTS=dir saves both lists in Arabic and English there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const open = async (page: Page, lang: string, part: 'morning' | 'evening') => {
  await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
  await page.goto(`/today/adhkar?lang=${lang}&part=${part}`)
  await expect(page.locator('.tool-card').first()).toBeVisible()
  await openFolds(page)
}
const strip = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/\s+/g, ' ').trim()
/** The whole list in one picture: the list scrolls inside main, so the window is made as tall as it. */
const shoot = async (page: Page, name: string) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const h = await page.evaluate(() => document.querySelector('main')!.scrollHeight + 300)
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.width, height: h })
  await page.screenshot({ path: path.join(SHOTS, name) })
  await page.setViewportSize(vp)
}
const join = (segs: string[]) => segs.reduce((acc, x) => (acc ? `${acc}${/[،,.؛:]$/.test(acc) ? ' ' : '، '}${x}` : x), '')

/** A recitation's box: each sura's ayat in range as GET /api/sura/:n has them, in order, the basmala before a whole sura. */
async function quranIsTheMushaf(page: Page, id: string, ranges: { s: number; from?: number; to?: number }[]) {
  for (const r of ranges) {
    const sura = (await (await page.request.get(`/api/sura/${r.s}`)).json()) as { basmala: string | null; ayat: { aya: number; text: string }[] }
    const want = sura.ayat.filter((a) => a.aya >= (r.from ?? 1) && a.aya <= (r.to ?? 999)).map((a) => a.text.trim())
    const sec = page.locator(`[data-testid="box-${id}"] [data-sura="${r.s}"]`)
    await expect(sec.locator('[data-aya]')).toHaveCount(want.length)
    const got = await sec.locator('[data-aya]').evaluateAll((els) =>
      els.map((e) => {
        const c = e.cloneNode(true) as HTMLElement
        c.querySelectorAll('svg, .mkp, [aria-hidden]').forEach((x) => x.remove())
        return (c.textContent ?? '').replace(/\u00A0/g, ' ').replace(/[٠-٩]+/g, '').trim()
      }),
    )
    expect(got).toEqual(want)
    if ((r.from ?? 1) === 1 && sura.basmala) await expect(sec.locator('.dhikr-basmala')).toHaveText(sura.basmala)
  }
}

/** Every box is the card's own highlighted words: its first marks, joined, in parentheses. */
async function boxesAreTheMarks(page: Page) {
  const cards = await page.locator('main .tool-card').evaluateAll((els) =>
    els.map((e) => ({
      id: (e as HTMLElement).dataset.hadith!,
      box: e.querySelector('.dhikr-box')?.textContent ?? null,
      quran: !!e.querySelector('.dhikr-quran, .dhikr-suras'),
      composed: !!e.querySelector('.dhikr-composed'),
      marks: Array.from(e.querySelectorAll('.tool-text mark')).map((m) => m.textContent ?? ''),
      text: e.querySelector('.tool-text')?.textContent ?? '',
      title: !!e.querySelector('.tool-title'),
    })),
  )
  expect(cards.length).toBeGreaterThan(3)
  for (const c of cards) {
    expect(c.title, `${c.id}: no title`).toBe(false)
    if (c.box === null) {
      expect(c.marks, `${c.id}: no box without highlights`).toEqual([])
      continue
    }
    if (c.quran || c.composed) continue // from the Mushaf, or built from the marks (checked on their own)
    expect(c.box.startsWith('(') && c.box.endsWith(')'), c.id).toBe(true)
    const inner = c.box.slice(1, -1)
    const fits = c.marks.some((_, i) => strip(join(c.marks.slice(0, i + 1))) === strip(inner))
    expect(fits, `${c.id}: the box is its highlighted words`).toBe(true)
    // And the words are the hadith's: each part found in its text, diacritics set aside to compare only.
    for (const m of c.marks) expect(strip(c.text)).toContain(strip(m))
  }
  return cards
}

test('the morning list in Arabic: the line, the box, the hadith; 3008 its morning wording whole, with our line', async ({ page }) => {
  await open(page, 'ar', 'morning')
  const cards = await boxesAreTheMarks(page)
  const card = (id: string) => page.locator(`[data-hadith="${id}"]`)
  // Built from the three reviewed segments by the five replacements (0049-add1 أ; the unit test holds every letter).
  const b = (await page.getByTestId('box-3008').textContent())!
  expect(b.normalize('NFC')).toBe(
    '(أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، ربِّ أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، رب أعوذ بك من الكسل، وسُوءِ الكِبَرِ، رب أعوذ بك من عذاب في النار، وعذاب في القبر)'.normalize('NFC'),
  )
  await expect(card('3008').locator('.dhikr-intro')).toHaveText(TOOLS.ar.sayIn.morning)
  await expect(page.getByTestId('composed-3008')).toHaveText(TOOLS.ar.composedLine)
  await expect(card('3008').locator('.tool-text mark')).toHaveCount(3)
  expect(cards.find((c) => c.id === '3008')!.marks).toHaveLength(3)
  // A count in the hadith goes with the line: 5508, three times.
  await expect(card('5508').locator('.dhikr-intro')).toHaveText('تقول في الصباح ثلاث مرات:')
  // The box comes first, then the source line, the button, and the hadith folded under it (0049-add2).
  const order = await card('5508').evaluate((e) => Array.from(e.children).map((c) => c.className))
  expect(order.indexOf('dhikr-box')).toBeLessThan(order.indexOf('dhikr-src'))
  expect(order.indexOf('dhikr-src')).toBeLessThan(order.indexOf('dhikr-more'))
  expect(order.indexOf('dhikr-more')).toBeLessThan(order.indexOf('dhikr-fold'))
  await expect(card('5508').locator('.dhikr-fold .tool-text')).toBeVisible()
  // 6082: «تقرأ في الصباح ثلاث مرات:», and the three suras whole from the Mushaf data, each under its name.
  await expect(card('6082').locator('.dhikr-intro')).toHaveText('تقرأ في الصباح ثلاث مرات:')
  await quranIsTheMushaf(page, '6082', [{ s: 112 }, { s: 113 }, { s: 114 }])
  await shoot(page, 'morning-ar.png')
})

test('the evening list in Arabic: 3008\'s two segments joined, 5490\'s first saying alone, the night\'s at the end', async ({ page }) => {
  await open(page, 'ar', 'evening')
  await boxesAreTheMarks(page)
  const b3008 = (await page.getByTestId('box-3008').textContent())!
  expect(strip(b3008)).toMatch(/^\(امسينا وامسى الملك لله|^\(أمسينا وأمسى الملك لله/)
  expect(b3008).toContain('لا شريك له، له الملك')
  expect(b3008).not.toMatch(/الراوي|أراه/)
  await expect(page.getByTestId('composed-3008')).toHaveCount(0)
  const b5490 = (await page.getByTestId('box-5490').textContent())!
  expect(b5490).not.toContain('الْمَصِيرُ')
  await expect(page.locator('[data-hadith="5490"] .tool-text mark')).toHaveCount(2)
  // The night's: 6274 the last two ayat of al-Baqarah from the Mushaf; 65260 two buttons to the reader.
  await expect(page.locator('[data-hadith="6274"] .dhikr-intro')).toHaveText('تقرأ في الليل:')
  await quranIsTheMushaf(page, '6274', [{ s: 2, from: 285, to: 286 }])
  await expect(page.locator('[data-hadith="65260"] .dhikr-intro')).toHaveText('تقرأ قبل أن تنام:')
  await expect(page.getByTestId('sura-32')).toHaveText('سورة السجدة')
  await expect(page.getByTestId('sura-67')).toHaveText('سورة الملك')
  // No card of the list without its box.
  expect(await page.locator('main .tool-card:not(:has(.dhikr-box))').count()).toBe(0)
  await expect(page.locator('[data-hadith="66086"] .dhikr-intro')).toHaveText('تقول في المساء ثلاث مرات:')
  await expect(page.getByTestId('night-adhkar')).toHaveText(TOOLS.ar.nightAdhkar)
  await shoot(page, 'evening-ar.png')
})

test('in English: our line in English, the words in Arabic as the hadith has them, its translation below', async ({ page }) => {
  await open(page, 'en', 'morning')
  await boxesAreTheMarks(page)
  await expect(page.locator('[data-hadith="3008"] .dhikr-intro')).toHaveText(TOOLS.en.sayIn.morning)
  await expect(page.locator('[data-hadith="5508"] .dhikr-intro')).toHaveText('In the morning, say three times:')
  await expect(page.getByTestId('box-3008')).toHaveAttribute('lang', 'ar')
  await expect(page.getByTestId('composed-3008')).toHaveText(TOOLS.en.composedLine)
  await expect(page.locator('[data-hadith="6082"] .dhikr-intro')).toHaveText('In the morning, recite three times:')
  await shoot(page, 'morning-en.png')
  await open(page, 'en', 'evening')
  await expect(page.locator('[data-hadith="66086"] .dhikr-intro')).toHaveText('In the evening, say three times:')
  await shoot(page, 'evening-en.png')
})
