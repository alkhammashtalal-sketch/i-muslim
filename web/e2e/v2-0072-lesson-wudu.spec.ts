import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import data from '../src/lessons/wudu-data.json' with { type: 'json' }
import { canvasDrawn, HAVE_DATA, lessonHere, noSideScroll, openLesson as open, pageErrors, rowText, SHOTS, shotWhole, textsAreTheRows } from './lesson-helpers'

// «علّمني الوضوء» in the app (add-on 0072; review page relay/w1/0072-wudu) at /today/lesson/wudu: at 390 and 320, in
// Arabic and English, by day: the steps forward and back, the close-ups (the ear, the heel) drawn, the disputed box
// with its fixed sentence and referral, the links, reduced motion, a device without WebGL, a machine-translated
// interface; no console errors and no request outside the page (the app's CSP applied).
//   npx vite preview --port 8794 && BASE_URL=http://localhost:8794 npx playwright test e2e/v2-0072-lesson-wudu.spec.ts --project=mobile
// SHOTS=<dir> also saves a few steps at 390.
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.skip(!HAVE_DATA, 'the texts come from our server by id: answered here from data/processed, outside git')

// the lesson opened with our server's hadith and ayah routes answered from data/processed (lesson-helpers.ts)
const openLesson = (page: Page, id: string, o: Parameters<typeof open>[2] = {}) => open(page, id, { data, ...o })

const step = (key: string) => data.steps.findIndex((s) => s.key === key) + 1
// the heel's line, cut from its row where the review page cut it (its marks in the row's own order)
const heel = (lang: 'ar' | 'en') => {
  const p = data.feet.heel.line[lang]!
  return rowText('3535', lang, p.field, null, p.start, p.end)!
}
const title = (n: number, lang: 'ar' | 'en') => data.steps[n - 1].title[lang]

for (const width of [390, 320]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`${lang} ${width}: the steps forward and back, nothing wider than the screen`, async ({ page }) => {
      const w = await openLesson(page, 'wudu', { lang, width })
      const card = page.locator('#lsn-wudu .card')
      await expect(card.locator('h1')).toHaveText(title(1, lang))
      await page.locator('#lsn-wudu .stepper .btn.primary').click()
      await expect(card.locator('h1')).toHaveText(title(2, lang))
      await expect(page).toHaveURL(/step=2/)
      await page.locator('#lsn-wudu .stepper .btn:not(.primary)').click()
      await expect(card.locator('h1')).toHaveText(title(1, lang))
      // the lesson map on the first step opens any step
      await card.locator('.map button', { hasText: title(step('feet'), lang) }).click()
      await expect(card.locator('h1')).toHaveText(title(step('feet'), lang))
      let texts = 0
      for (const n of [1, step('tasmiya'), step('ears'), step('feet'), step('after'), data.steps.length]) {
        await page.goto(`/today/lesson/wudu?lang=${lang}&theme=light&still=1&step=${n}`)
        await expect(page.locator('#lsn-wudu[data-ready="1"] .card h1')).toHaveText(title(n, lang))
        await expect(page.locator(`#lsn-wudu .lsn-pending`)).toHaveCount(0)
        await noSideScroll(page)
        texts += await textsAreTheRows(page, 'wudu')
      }
      expect(texts).toBeGreaterThan(5)
      expect(pageErrors(w)).toEqual([])
      expect(w.outside).toEqual([])
    })
  }
}

test('the close-ups: the companion, the ear and the heel are drawn', async ({ page }) => {
  const w = await openLesson(page, 'wudu', { step: step('ears') })
  await expect(page.locator('#lsn-wudu .feet-h', { hasText: 'الأذن عن قرب' })).toBeVisible()
  // the ear's line under its close-up (add-on 0072-add7)
  await expect(page.locator('#lsn-wudu figure.feet.hand .feet-line')).toHaveText('السبابة داخل الأذن، والإبهام على ظاهرها')
  expect(await canvasDrawn(page, '#lsn-wudu .stage canvas')).toBe(true)
  expect(await canvasDrawn(page, '#lsn-wudu .view-hand canvas')).toBe(true)
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'wudu-09-ears-ar.png'))
  await page.locator('#lsn-wudu .stepper .btn.primary').click()
  await expect(page.locator('#lsn-wudu .feet-h', { hasText: 'العقب عن قرب' })).toBeVisible()
  await page.waitForTimeout(400)
  expect(await canvasDrawn(page, '#lsn-wudu .view-feet canvas')).toBe(true)
  // the heel's line is hadith 3535's own words, with its grade and its link
  const fig = page.locator('#lsn-wudu figure.feet')
  await expect(fig.locator('.feet-line[data-ref="hadith:3535"]')).toHaveText(heel('ar'))
  await expect(fig.locator('.grade').first()).toHaveText('صحيح')
  await expect(fig.locator('a[href="https://hadeethenc.com/ar/browse/hadith/3535"]').first()).toHaveAttribute('target', '_blank')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'wudu-10-feet-ar.png'))
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('a disputed matter: the fixed sentence, the texts and the referral, no choice between them', async ({ page }) => {
  await openLesson(page, 'wudu', { step: step('tasmiya') })
  const box = page.locator('#lsn-wudu .khilaf')
  await expect(box.locator('.badge')).toHaveText('فيها أكثر من قول')
  await expect(box.locator('.fixed')).toHaveText('هذه المسألة فيها أكثر من قول عند أهل العلم')
  await expect(box.locator('a.referral')).toHaveAttribute('href', 'https://www.alifta.gov.sa')
  await expect(box.locator('a.referral')).toHaveText('الرئاسة العامة للبحوث العلمية والإفتاء')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'wudu-03-tasmiya-ar.png'))
})

test(`the link to the prayer lesson ${lessonHere('prayer') ? 'opens it in the app' : 'waits until that lesson is here'}`, async ({ page }) => {
  await openLesson(page, 'wudu', { step: step('after') })
  const link = page.locator('#lsn-wudu .links a.app-link', { hasText: 'درس الصلاة' })
  if (!lessonHere('prayer')) return expect(link).toHaveCount(0)
  await expect(link).toHaveAttribute('href', '/today/lesson/prayer')
  await link.click()
  await expect(page).toHaveURL(/\/today\/lesson\/prayer(\?(?!.*step=)|$)/)
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText('قبل أن نبدأ', { timeout: 20_000 })
})

test('English: the same step in English, with the Arabic text always shown', async ({ page }) => {
  await openLesson(page, 'wudu', { lang: 'en', step: step('feet') })
  const fig = page.locator('#lsn-wudu figure.feet')
  await expect(fig.locator('.feet-line[data-lang="ar"]')).toHaveText(heel('ar'))
  await expect(fig.locator('.feet-line[data-lang="en"]')).toHaveText(heel('en'))
  await page.locator('#lsn-wudu .stepper .btn:not(.primary)').click()
  await expect(page.locator('#lsn-wudu figure.feet.hand .feet-line')).toHaveText('The index inside the ear, the thumb on its back.')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'wudu-10-feet-en.png'))
})

test('reduced motion: the figure stands in the pose at once and stays still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const w = await openLesson(page, 'wudu', { step: step('arms'), still: false })
  await page.locator('#lsn-wudu .stepper .btn.primary').click()
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText(title(step('head'), 'ar'))
  await page.waitForTimeout(400)
  const a = await page.locator('#lsn-wudu .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  await page.waitForTimeout(900)
  const b = await page.locator('#lsn-wudu .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  expect(a).toBe(b)
  expect(pageErrors(w)).toEqual([])
})

test('no WebGL on the device: the steps with their texts, without the figure, and nothing alarming', async ({ page }) => {
  const w = await openLesson(page, 'wudu', { step: step('feet'), noGL: true })
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText(title(step('feet'), 'ar'))
  await expect(page.locator('#lsn-wudu .stage')).toBeHidden()
  await expect(page.locator('#lsn-wudu .feet-view')).toBeHidden()
  await expect(page.locator('#lsn-wudu .feet-line[data-ref="hadith:3535"]')).toBeVisible()
  await expect(page.locator('#lsn-wudu')).not.toContainText('تعذّر')
  expect(pageErrors(w)).toEqual([])
})

test('a machine-translated interface (Urdu): its frame words, the English content, the Arabic text', async ({ page }) => {
  const w = await openLesson(page, 'wudu', { lang: 'ur', step: step('feet') })
  await expect(page.locator('#lsn-wudu .content-note')).toContainText('مشینی ترجمہ')
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText(title(step('feet'), 'en'))
  await expect(page.locator('#lsn-wudu .stepper .btn.primary')).toHaveText('اگلا')
  await expect(page.locator('#lsn-wudu .feet-line[data-lang="ar"]')).toBeVisible()
  await noSideScroll(page)
  expect(pageErrors(w)).toEqual([])
})

test('our server does not answer: the step keeps its references and links, and shows no text (never a stale copy)', async ({ page }) => {
  const w = await openLesson(page, 'wudu', { step: step('feet'), texts: 'none' })
  await expect(page.locator('#lsn-wudu .lsn-pending')).toHaveCount(0)
  await expect(page.locator('#lsn-wudu [data-ref^="hadith:"][data-field]')).toHaveCount(0)
  await expect(page.locator('#lsn-wudu a[href="https://hadeethenc.com/ar/browse/hadith/3535"]').first()).toBeVisible()
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText(title(step('feet'), 'ar'))
  await noSideScroll(page)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})
