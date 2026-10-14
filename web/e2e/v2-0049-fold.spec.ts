import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { TOOLS } from '../src/v2/daily/strings-tools'

// The hadith folded under the dhikr (0049-add2) on a preview of next (never the live link): the line, the box, the
// source line (grade, attribution, counter) always shown; «الحديث كاملًا» opens the hadith in the card, under it, and
// closes it again; every card folded at each opening of the list; a link to the hadith opens its card.
//   cd web && BASE_URL=… npx playwright test e2e/v2-0049-fold.spec.ts --project=mobile --workers=2
// SHOTS=dir saves both lists folded, and 3008's and 6082's cards open, in Arabic and English.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const open = async (page: Page, q: string) => {
  await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
  await page.goto(`/today/adhkar?${q}`)
  await expect(page.locator('main .tool-card').first()).toBeVisible()
}
const shoot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  if (el) return void (await page.locator(el).screenshot({ path: path.join(SHOTS, name) }))
  const h = await page.evaluate(() => document.querySelector('main')!.scrollHeight + 300)
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.width, height: h })
  await page.screenshot({ path: path.join(SHOTS, name) })
  await page.setViewportSize(vp)
}

test('folded at each opening: the box, the grade and the attribution shown, the hadith not; the button names its state', async ({ page }) => {
  await open(page, 'lang=ar&part=morning')
  const cards = page.locator('main .tool-card')
  const n = await cards.count()
  expect(n).toBeGreaterThan(3)
  await expect(page.locator('.dhikr-more[aria-expanded="true"]')).toHaveCount(0)
  await expect(page.locator('.dhikr-fold:visible')).toHaveCount(0)
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i)
    await expect(c.locator('.dhikr-box')).toBeVisible()
    await expect(c.locator('.dhikr-src .tool-badge')).toBeVisible()
    const b = c.locator('.dhikr-more')
    await expect(b).toHaveText(TOOLS.ar.fullHadith)
    await expect(b).toHaveAttribute('aria-controls', (await c.locator('.dhikr-fold').getAttribute('id'))!)
    const box = (await b.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
  }
  // The counter stays with the source line, folded or not.
  await expect(page.getByTestId('count-5508')).toBeVisible()
  await shoot(page, 'morning-folded-ar.png')
})

test('the button opens the hadith in place, under it, and closes it; the card\'s head stays put; the morning line in the fold', async ({ page }) => {
  await open(page, 'lang=ar&part=morning')
  const c = page.locator('[data-hadith="3008"]')
  // Pressed where it is (a test's click would first scroll the button into view).
  await c.scrollIntoViewIfNeeded()
  const before = (await c.boundingBox())!.y
  await c.locator('.dhikr-more').evaluate((b) => (b as HTMLButtonElement).click())
  await expect(c.locator('.dhikr-more')).toHaveAttribute('aria-expanded', 'true')
  await expect(c.locator('.dhikr-fold')).toBeVisible()
  // In the fold, first the line of 0049-add1, then the hadith with its three highlights.
  await expect(c.locator('.dhikr-fold > :first-child')).toHaveText(TOOLS.ar.composedLine)
  await expect(c.locator('.dhikr-fold .tool-text mark')).toHaveCount(3)
  expect((await c.boundingBox())!.y).toBe(before)
  await shoot(page, 'card-3008-open-ar.png', '[data-hadith="3008"]')
  await c.locator('.dhikr-more').click()
  await expect(c.locator('.dhikr-more')).toHaveAttribute('aria-expanded', 'false')
  await expect(c.locator('.dhikr-fold')).toBeHidden()
  // Opened again after a reload: folded, nothing kept.
  await c.locator('.dhikr-more').click()
  await page.reload()
  await expect(page.locator('.dhikr-more[aria-expanded="true"]')).toHaveCount(0)
})

test('closing from below keeps the card\'s head in view', async ({ page }) => {
  await open(page, 'lang=ar&part=morning')
  const c = page.locator('[data-hadith="3008"]')
  await c.locator('.dhikr-more').click()
  await c.locator('.dhikr-fold .tool-source').scrollIntoViewIfNeeded()
  await page.evaluate(() => document.querySelector('main')!.scrollBy(0, 400))
  await c.locator('.dhikr-more').evaluate((b) => (b as HTMLButtonElement).click())
  const top = (await c.boundingBox())!.y
  expect(top).toBeGreaterThanOrEqual(-1)
})

test('a recitation: the suras shown, the hadith alone folded; a link to a hadith opens its card', async ({ page }) => {
  await open(page, 'lang=ar&part=morning')
  const c = page.locator('[data-hadith="6082"]')
  await expect(c.locator('.dhikr-quran [data-sura="112"]')).toBeVisible()
  await c.locator('.dhikr-more').click()
  await expect(c.locator('.dhikr-fold .tool-text')).toBeVisible()
  await expect(c.locator('.dhikr-quran [data-sura="112"]')).toBeVisible()
  await shoot(page, 'card-6082-open-ar.png', '[data-hadith="6082"]')
  await open(page, 'lang=ar&part=evening&hadith=5490')
  await expect(page.locator('[data-hadith="5490"] .dhikr-more')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-hadith="66086"] .dhikr-more')).toHaveAttribute('aria-expanded', 'false')
})

test('with reduced motion, no movement when it opens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 'lang=ar&part=morning')
  const c = page.locator('[data-hadith="3008"]')
  await c.locator('.dhikr-more').click()
  expect(await c.locator('.dhikr-fold').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  expect(await c.locator('.dhikr-more svg').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s')
})

test('in English: the button and the lists folded, and 3008 and 6082 open', async ({ page }) => {
  await open(page, 'lang=en&part=morning')
  await expect(page.locator('[data-hadith="3008"] .dhikr-more')).toHaveText(TOOLS.en.fullHadith)
  await shoot(page, 'morning-folded-en.png')
  await page.locator('[data-hadith="3008"] .dhikr-more').click()
  await shoot(page, 'card-3008-open-en.png', '[data-hadith="3008"]')
  await page.locator('[data-hadith="6082"] .dhikr-more').click()
  await shoot(page, 'card-6082-open-en.png', '[data-hadith="6082"]')
  await open(page, 'lang=en&part=evening')
  await shoot(page, 'evening-folded-en.png')
  await open(page, 'lang=ar&part=evening')
  await shoot(page, 'evening-folded-ar.png')
})
