import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// «اسم من أسماء الله» (reply 0071 §4.2; add-ons 0071-add1 §2–4 and 0071-add2 §2) on the home page, under «يومك».
// Runs against a server with NAMES_READINGS on (env v11), whose route /api/names/day sends the readings:
//   BASE_URL=https://i-muslim-v11.… npx playwright test e2e/v2-0071-names-card.spec.ts --project=mobile
// The quoted texts come first and are the server's letter for letter; the readings follow under their fixed heading,
// in Arabic only; when the route sends none (the switch off, mocked here) the card shows the quoted texts alone.
// Screenshots at 390, by day, go to SHOTS_DIR (default out/shots/0071-names).
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0071-names')
const HEADING = 'شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء'
// The rotation's first day (data/names-daily.json): entry 1, الصمد; entry n falls on the (n − 1)th day after it.
const EPOCH = Date.parse('2026-10-22T09:00:00Z')
const dayOf = (n: number) => new Date(EPOCH + (n - 1) * 86_400_000)

type Day = { entry: { n: number; name: string; quranOnly: boolean }; readings?: { meaning: string; easy: string; deep: string[] } }

async function open(page: Page, lang: string, n: number) {
  await page.clock.setFixedTime(dayOf(n))
  const day = page.waitForResponse((r) => r.url().includes('/api/names/day') && r.status() === 200)
  await page.goto(`/?lang=${lang}&theme=light`)
  const body = (await (await day).json()) as Day
  const card = page.getByTestId('name-day')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-n', String(n))
  return { card, body }
}

/** The whole card at 390: the page scrolls inside the app's frame under a fixed head and bar, so the viewport is made
 *  tall enough to hold the card unscrolled for the picture, then put back. */
async function shoot(page: Page, card: ReturnType<Page['getByTestId']>, name: string) {
  const size = page.viewportSize()!
  const h = await card.evaluate((el) => el.getBoundingClientRect().height)
  await page.setViewportSize({ width: size.width, height: Math.ceil(h) + 2400 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(SHOTS, { recursive: true })
  await card.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await page.setViewportSize(size)
}

/** An ayah part's text without its end marker: the passage's text as served. */
const ayahText = (s: string) => s.replace(/ [\s\S]*$/, '')

test('ar: the quoted texts first, letter for letter, then the readings under their heading', async ({ page, request }) => {
  const { card, body } = await open(page, 'ar', 1)
  expect(body.entry.name).toBe('الصمد')
  await expect(card.locator('.nd-name')).toHaveText('الصمد')
  await expect(card.locator('.nd-title')).toHaveText('اسم من أسماء الله')
  // The evidence (al-Ikhlas 2), its tafsir by al-Saʿdi and Ibn Kathir, then the dua (al-Qasas 24).
  const parts = card.locator('[data-testid="name-day-quoted"] > .nd-part')
  await expect(parts.first()).toHaveAttribute('data-id', 'quran:112:2')
  await expect(card.locator('.nd-part[data-key="saadi"]')).toBeVisible()
  await expect(card.locator('.nd-part[data-key="katheer"]')).toBeVisible()
  await expect(card.locator('.nd-part[data-part="ayah"]').last()).toHaveAttribute('data-id', 'quran:28:24')
  for (const id of ['quran:112:2', 'quran:28:24']) {
    const p = (await (await request.get(`/api/passage/${id}`)).json()) as { text: string }
    expect(ayahText((await card.locator(`.nd-part[data-id="${id}"] .nd-ayah`).textContent()) ?? '')).toBe(p.text.trimEnd())
  }
  const katheer = (await (await request.get('/api/passage/quran:112:2?with=katheer')).json()) as { tafsir: { key: string; paragraphs: string[] }[] }
  await expect(card.locator('.nd-part[data-key="katheer"] .nd-tafsir').first()).toHaveText(katheer.tafsir.find((t) => t.key === 'katheer')!.paragraphs[0])

  // The readings, as the server sent them, after every quoted part, with the exact heading.
  expect(body.readings, 'the server under test must have NAMES_READINGS on').toBeTruthy()
  const made = card.getByTestId('name-day-readings')
  await expect(made).toBeVisible()
  await expect(made.locator('.nd-made-h')).toHaveText(HEADING)
  await expect(made).toContainText(body.readings!.easy)
  for (const p of body.readings!.deep) await expect(made).toContainText(p)
  const after = await page.evaluate(() => {
    const q = document.querySelector('[data-testid="name-day-quoted"]')!
    const m = document.querySelector('[data-testid="name-day-readings"]')!
    return !!(q.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) && q.getBoundingClientRect().bottom <= m.getBoundingClientRect().top
  })
  expect(after).toBe(true)
  await shoot(page, card, 'app-ar-390.png')
})

test('ar: the route sends no readings (the switch off): the quoted texts alone', async ({ page }) => {
  await page.route('**/api/names/day**', async (route) => {
    const res = await route.fetch()
    const off = (await res.json()) as Day
    delete off.readings
    await route.fulfill({ response: res, json: off })
  })
  const { card, body } = await open(page, 'ar', 1)
  expect(body.readings).toBeUndefined()
  await expect(card.locator('[data-testid="name-day-quoted"] > .nd-part').first()).toBeVisible()
  await expect(card.getByTestId('name-day-readings')).toHaveCount(0)
  await expect(card).not.toContainText(HEADING)
})

test('ar: an entry with no HadeethEnc hadith as evidence shows its Quranic evidence alone (الحكم)', async ({ page }) => {
  const { card, body } = await open(page, 'ar', 84)
  expect(body.entry).toMatchObject({ name: 'الحكم', quranOnly: true })
  await expect(card.locator('.nd-part[data-part="hadith"]')).toHaveCount(0)
  await expect(card.locator('.nd-part[data-part="ayah"]')).toHaveCount(1)
  await expect(card.locator('.nd-part[data-part="ayah"]')).toHaveAttribute('data-id', 'quran:7:89')
  await expect(card.locator('.nd-part[data-part="ayah"] .nd-label')).toHaveText('دعاء من القرآن')
  await expect(card.locator('.nd-part[data-key="saadi"]')).toBeVisible()
  await shoot(page, card, 'app-ar-390-quran-only.png')
})

test('ar: a hadith as evidence, with its grade and attribution as stored (الجميل)', async ({ page, request }) => {
  const { card } = await open(page, 'ar', 82)
  const part = card.locator('.nd-part[data-part="hadith"]').first()
  await expect(part).toHaveAttribute('data-id', '6209')
  const h = (await (await request.get('/api/adhkar/hadith/6209?lang=ar')).json()) as { text: string; grade: string; attribution: string }
  await expect(part.locator('.tool-text p')).toHaveText(h.text)
  await expect(part.locator('.tool-badge')).toHaveText(h.grade)
  await expect(part.locator('.tool-meta')).toContainText(h.attribution)
  await shoot(page, card, 'app-ar-390-hadith.png')
})

test('ar at 320 and the largest text size: nothing in the card scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.addInitScript(() => document.documentElement.setAttribute('data-font', 'lg'))
  const { card } = await open(page, 'ar', 1)
  await expect(card.getByTestId('name-day-readings')).toBeVisible()
  const over = await card.evaluate((el) =>
    [el, ...el.querySelectorAll('*')].filter((x) => (x as HTMLElement).scrollWidth > (x as HTMLElement).clientWidth + 1 && getComputedStyle(x).overflowX !== 'visible').length,
  )
  expect(over).toBe(0)
  const box = (await card.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
})

test('en: the Arabic texts with the meaning in English, the labels in English, and no readings', async ({ page }) => {
  const { card, body } = await open(page, 'en', 1)
  expect(body.readings).toBeUndefined()
  await expect(card.locator('.nd-title')).toHaveText('A Name of Allah')
  await expect(card.locator('.nd-name')).toHaveText('الصمد')
  const evidence = card.locator('.nd-part[data-id="quran:112:2"]')
  await expect(evidence.locator('.nd-label')).toHaveText('Evidence')
  await expect(evidence.locator('.nd-ayah')).toHaveAttribute('lang', 'ar')
  await expect(evidence.locator('.translation[lang="en"]')).toBeVisible()
  await expect(card.getByTestId('name-day-readings')).toHaveCount(0)
  await shoot(page, card, 'app-en-390.png')
})
