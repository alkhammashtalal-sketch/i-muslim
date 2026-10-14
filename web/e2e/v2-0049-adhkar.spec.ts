import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { TOOLS } from '../src/v2/daily/strings-tools'

// «أذكار الصباح» and «أذكار المساء» ready to say (0049 د) on a preview of next (never the live link): each dhikr our
// line «تقول في الصباح:» (with the hadith's count), then the words in a box, the list's highlighted segments of the
// hadith's own text in their order, then the hadith whole; no HadeethEnc title in the two lists; 3008's morning box
// with the explanation's line under it; 5490's evening box its first saying only.
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

/** Every box is the card's own highlighted words: its first marks, joined, in parentheses. */
async function boxesAreTheMarks(page: Page) {
  const cards = await page.locator('main .tool-card').evaluateAll((els) =>
    els.map((e) => ({
      id: (e as HTMLElement).dataset.hadith!,
      box: e.querySelector('.dhikr-box')?.textContent ?? null,
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
    expect(c.box.startsWith('(') && c.box.endsWith(')'), c.id).toBe(true)
    const inner = c.box.slice(1, -1)
    const fits = c.marks.some((_, i) => strip(join(c.marks.slice(0, i + 1))) === strip(inner))
    expect(fits, `${c.id}: the box is its highlighted words`).toBe(true)
    // And the words are the hadith's: each part found in its text, diacritics set aside to compare only.
    for (const m of c.marks) expect(strip(c.text)).toContain(strip(m))
  }
  return cards
}

test('the morning list in Arabic: the line, the box, the hadith; 3008 with the explanation\'s line', async ({ page }) => {
  await open(page, 'ar', 'morning')
  const cards = await boxesAreTheMarks(page)
  const card = (id: string) => page.locator(`[data-hadith="${id}"]`)
  await expect(page.getByTestId('box-3008')).toHaveText('(أصبحنا وأصبح الملك لله)')
  await expect(card('3008').locator('.dhikr-intro')).toHaveText(TOOLS.ar.sayIn.morning)
  const note = page.getByTestId('note-3008')
  await expect(note).toContainText('ويبدل اليوم بالليلة فيقول: اللهم إني أسالك من خير هذا اليوم، ويذكر الضمائر بعده.')
  await expect(note).toContainText(`(${TOOLS.ar.fromSharh})`)
  // A count in the hadith goes with the line: 5508, three times.
  await expect(card('5508').locator('.dhikr-intro')).toHaveText('تقول في الصباح ثلاث مرات:')
  // The box comes first, then the hadith whole, with its grade.
  const order = await card('5508').evaluate((e) => Array.from(e.children).map((c) => c.className))
  expect(order.indexOf('dhikr-box')).toBeLessThan(order.indexOf('tool-text'))
  expect(cards.find((c) => c.id === '3008')!.marks).toEqual(['أصبحنا وأصبح الملك لله'])
  await shoot(page, 'morning-ar.png')
})

test('the evening list in Arabic: 3008\'s two segments joined, 5490\'s first saying alone, the night\'s at the end', async ({ page }) => {
  await open(page, 'ar', 'evening')
  await boxesAreTheMarks(page)
  const b3008 = (await page.getByTestId('box-3008').textContent())!
  expect(strip(b3008)).toMatch(/^\(امسينا وامسى الملك لله|^\(أمسينا وأمسى الملك لله/)
  expect(b3008).toContain('لا شريك له، له الملك')
  expect(b3008).not.toMatch(/الراوي|أراه/)
  await expect(page.getByTestId('note-3008')).toHaveCount(0)
  const b5490 = (await page.getByTestId('box-5490').textContent())!
  expect(b5490).not.toContain('الْمَصِيرُ')
  await expect(page.locator('[data-hadith="5490"] .tool-text mark')).toHaveCount(2)
  await expect(page.getByTestId('box-6274')).toHaveCount(0)
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
  await expect(page.getByTestId('note-3008')).toContainText(`(${TOOLS.en.fromSharh})`)
  await shoot(page, 'morning-en.png')
  await open(page, 'en', 'evening')
  await expect(page.locator('[data-hadith="66086"] .dhikr-intro')).toHaveText('In the evening, say three times:')
  await shoot(page, 'evening-en.png')
})
