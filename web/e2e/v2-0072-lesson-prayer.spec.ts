import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import data from '../src/lessons/prayer-data.json' with { type: 'json' }
import { canvasDrawn, HAVE_DATA, lessonHere, noSideScroll, openLesson as open, pageErrors, rowText, SHOTS, shotWhole, textsAreTheRows, TRANSLIT } from './lesson-helpers'

// «علّمني الصلاة» in the app (add-on 0072; review page relay/w1/0071-prayer) at /today/lesson/prayer: at 390 and 320,
// in Arabic and English, by day: the steps forward and back, the close-ups (the feet, the seven places, the hand)
// drawn, a disputed box, the sunnah.com reference, the links to the app's qibla and adhkar (and the wudu lesson once it
// is here), al-Fatiha's transliteration from our server's QF route (and nothing when it does not answer), reduced
// motion, a device without WebGL, a machine-translated interface; no console errors, and no request outside the page
// except our QF route (the app's CSP applied; mp3quran is asked only on «استمع»).
//   npx vite preview --port 8794 && BASE_URL=http://localhost:8794 npx playwright test e2e/v2-0072-lesson-prayer.spec.ts --project=mobile
// SHOTS=<dir> also saves a few steps at 390.
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.skip(!HAVE_DATA, 'the texts come from our server by id: answered here from data/processed, outside git')

// the lesson opened with our server's hadith and ayah routes answered from data/processed (lesson-helpers.ts)
const openLesson = (page: Page, id: string, o: Parameters<typeof open>[2] = {}) => open(page, id, { data, ...o })

const step = (key: string) => data.steps.findIndex((s) => s.key === key) + 1
const title = (n: number, lang: 'ar' | 'en') => data.steps[n - 1].title[lang]

for (const width of [390, 320]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`${lang} ${width}: the steps forward and back, nothing wider than the screen`, async ({ page }) => {
      const w = await openLesson(page, 'prayer', { lang, width })
      const card = page.locator('#lsn-prayer .card')
      await expect(card.locator('h1')).toHaveText(title(1, lang))
      await page.locator('#lsn-prayer .stepper .btn.primary').click()
      await expect(card.locator('h1')).toHaveText(title(2, lang))
      await expect(page).toHaveURL(/step=2/)
      await page.locator('#lsn-prayer .stepper .btn:not(.primary)').click()
      await expect(card.locator('h1')).toHaveText(title(1, lang))
      let texts = 0
      for (const n of [1, step('fatiha'), step('sujud1'), step('tashahhud'), step('after'), step('tawarruk'), step('rakat'), data.steps.length]) {
        await page.goto(`/today/lesson/prayer?lang=${lang}&theme=light&still=1&step=${n}`)
        await expect(page.locator('#lsn-prayer[data-ready="1"] .card h1')).toHaveText(title(n, lang))
        await expect(page.locator(`#lsn-prayer .lsn-pending`)).toHaveCount(0)
        await noSideScroll(page)
        texts += await textsAreTheRows(page, 'prayer')
      }
      expect(texts).toBeGreaterThan(5)
      expect(pageErrors(w)).toEqual([])
      expect(w.outside).toEqual([])
    })
  }
}

test('the close-ups: the feet, the seven places with their numbers, and the hand in the tashahhud', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { step: step('sujud1') })
  expect(await canvasDrawn(page, '#lsn-prayer .stage canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .feet-h', { hasText: 'القدمان عن قرب' })).toBeVisible()
  expect(await canvasDrawn(page, '#lsn-prayer .view-feet canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .feet-h', { hasText: 'مواضع السجود السبعة' })).toBeVisible()
  expect(await canvasDrawn(page, '#lsn-prayer .view-seven canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .view-seven .num-tag')).toHaveText(['١', '٢', '٣', '٤', '٥', '٦', '٧'])
  await expect(page.locator('#lsn-prayer .view-feet .qibla-tag')).toHaveText('القبلة')
  // the sunnah.com row: its reference and link, no text
  await expect(page.locator('#lsn-prayer .ev-item.sunnah a[href="https://sunnah.com/abudawud:734"]')).toBeVisible()
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-08-sujud-ar.png'))
  await page.goto(`/today/lesson/prayer?lang=ar&theme=light&still=1&step=${step('tashahhud')}`)
  await expect(page.locator('#lsn-prayer[data-ready="1"] .feet-h', { hasText: 'اليد اليمنى في التشهد' })).toBeVisible()
  await page.waitForTimeout(400)
  expect(await canvasDrawn(page, '#lsn-prayer .view-hand canvas')).toBe(true)
  // a disputed matter: the fixed sentence and the referral
  const box = page.locator('#lsn-prayer .khilaf')
  await expect(box.locator('.fixed')).toHaveText('هذه المسألة فيها أكثر من قول عند أهل العلم')
  await expect(box.locator('a.referral')).toHaveAttribute('href', 'https://www.alifta.gov.sa')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-13-tashahhud-ar.png'))
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('al-Fatiha: its transliteration as our server gives it, under each ayah; mp3quran not asked before «استمع»', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { step: step('fatiha') })
  const lines = page.locator('#lsn-prayer .ayah .translit .tl-text')
  await expect(lines).toHaveText(TRANSLIT.ayat.map((a) => a.text))
  await expect(page.locator('#lsn-prayer a[href="https://quran.foundation"]').first()).toBeVisible()
  expect(w.qf).toHaveLength(1)
  expect(new URL(w.qf[0]).pathname).toBe('/api/qf/translit/1')
  // the ayat are the stored text, the tafsir al-Muyassar of the selected one
  await expect(page.locator('#lsn-prayer .ayah [data-field="text"]').first()).toHaveText(rowText('quran:1:1', 'ar', 'text', null, null, null)!)
  await expect(page.locator('#lsn-prayer .tafsir [data-field="muyassar"]')).toHaveText(rowText('quran:1:1', 'ar', 'muyassar', null, null, null)!)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('al-Fatiha when our server does not answer the QF route: no transliteration and no QF line', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { step: step('fatiha'), qf: 'none' })
  await expect(page.locator('#lsn-prayer .ayah').first()).toBeVisible()
  await page.waitForTimeout(600)
  await expect(page.locator('#lsn-prayer .translit')).toHaveCount(0)
  await expect(page.locator('#lsn-prayer a[href="https://quran.foundation"]')).toHaveCount(0)
  // the shot without the stub's lines: on our servers the transliteration is Quran Foundation's own
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-04-fatiha-ar.png'))
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('the links: the app’s qibla and adhkar screens, and the wudu lesson once it is here', async ({ page }) => {
  await openLesson(page, 'prayer', { step: 1 })
  const wudu = page.locator('#lsn-prayer .links a.app-link[href="/today/lesson/wudu"]')
  await expect(wudu).toHaveCount(lessonHere('wudu') ? 1 : 0)
  if (lessonHere('wudu')) await expect(wudu).toHaveText('درس الوضوء')
  await page.locator('#lsn-prayer .links a.app-link[href="/today/qibla"]').click()
  await expect(page).toHaveURL(/\/today\/qibla(\?(?!.*step=)|$)/)
  await page.goto(`/today/lesson/prayer?lang=ar&theme=light&still=1&step=${step('after')}`)
  await page.locator('#lsn-prayer[data-ready="1"] .links a.app-link[href="/today/adhkar"]').click()
  await expect(page).toHaveURL(/\/today\/adhkar/)
  if (!lessonHere('wudu')) return
  await page.goto('/today/lesson/prayer?lang=ar&theme=light&still=1&step=1')
  await page.locator('#lsn-prayer[data-ready="1"] .links a.app-link[href="/today/lesson/wudu"]').click()
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText('قبل أن نبدأ', { timeout: 20_000 })
})

test('English: the step in English, the Arabic text always shown', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { lang: 'en', step: step('sujud1') })
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title(step('sujud1'), 'en'))
  await expect(page.locator('#lsn-prayer .say-box .dhikr[lang="ar"]')).toBeVisible()
  await expect(page.locator('#lsn-prayer .view-seven .num-tag')).toHaveText(['1', '2', '3', '4', '5', '6', '7'])
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-08-sujud-en.png'))
  expect(pageErrors(w)).toEqual([])
})

test('reduced motion: the figure stands in the pose at once and stays still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const w = await openLesson(page, 'prayer', { step: step('ruku'), still: false })
  await page.locator('#lsn-prayer .stepper .btn.primary').click()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title(step('itidal'), 'ar'))
  await page.waitForTimeout(400)
  const a = await page.locator('#lsn-prayer .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  await page.waitForTimeout(900)
  const b = await page.locator('#lsn-prayer .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  expect(a).toBe(b)
  expect(pageErrors(w)).toEqual([])
})

test('no WebGL on the device: the steps with their texts, without the figure, and nothing alarming', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { step: step('sujud1'), noGL: true })
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title(step('sujud1'), 'ar'))
  await expect(page.locator('#lsn-prayer .stage')).toBeHidden()
  await expect(page.locator('#lsn-prayer .feet-view').first()).toBeHidden()
  await expect(page.locator('#lsn-prayer .feet .legend')).toBeVisible()
  await expect(page.locator('#lsn-prayer')).not.toContainText('تعذّر')
  expect(pageErrors(w)).toEqual([])
})

test('a machine-translated interface (French): its frame words, the English content, the Arabic text', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { lang: 'fr', step: step('fatiha') })
  await expect(page.locator('#lsn-prayer .content-note')).toContainText('traduction automatique')
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title(step('fatiha'), 'en'))
  await expect(page.locator('#lsn-prayer .stepper .btn.primary')).toHaveText('Suivant')
  await expect(page.locator('#lsn-prayer .card h2').first()).toHaveText('Ce que vous faites')
  await expect(page.locator('#lsn-prayer .ayah [data-field="text_en"]').first()).toHaveText(rowText('quran:1:1', 'en', 'text_en', null, null, null)!)
  await noSideScroll(page)
  expect(pageErrors(w)).toEqual([])
})

test('our server does not answer: each step keeps its references and links, and shows no text (never a stale copy)', async ({ page }) => {
  const w = await openLesson(page, 'prayer', { step: step('sujud1'), texts: 'none' })
  await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0)
  await expect(page.locator('#lsn-prayer [data-ref^="hadith:"][data-field]')).toHaveCount(0)
  // the HadeethEnc source line, its number and its link stay
  await expect(page.locator('#lsn-prayer a[href="https://hadeethenc.com/ar/browse/hadith/10925"]').first()).toBeVisible()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title(step('sujud1'), 'ar'))
  await page.goto(`/today/lesson/prayer?lang=ar&theme=light&still=1&step=${step('fatiha')}`)
  await expect(page.locator('#lsn-prayer[data-ready="1"] .tafsir a[href^="https://quran.ksu.edu.sa/tafseer/muyassar/"]')).toBeVisible()
  await expect(page.locator('#lsn-prayer .ayah')).toHaveCount(0)
  await noSideScroll(page)
  expect(w.texts.length).toBeGreaterThan(0)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('while the texts come: a calm empty line in their place, then the texts', async ({ page }) => {
  await openLesson(page, 'prayer', { step: step('takbir'), texts: 'slow' })
  await expect(page.locator('#lsn-prayer .lsn-pending').first()).toBeVisible()
  await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0, { timeout: 15_000 })
  expect(await textsAreTheRows(page, 'prayer')).toBeGreaterThan(0)
})
