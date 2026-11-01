import { expect, test, type Locator, type Page } from '@playwright/test'
import wudu from '../src/lessons/wudu-data.json' with { type: 'json' }
import prayer from '../src/lessons/prayer-data.json' with { type: 'json' }
import { HAVE_DATA, openLesson } from './lesson-helpers'
import { DATA, namesRoute } from './names-stub'

// Add-on 0072-add54: «السابق» beside «التالي» wherever pages turn, both buttons at least 44 px to touch, «السابق» at the
// reading's start (the right in Arabic) and «التالي» at its end, and a swipe turning them both ways: the name's page,
// the cards' preview of «اصنع كروت», the starting path, and the lessons (their buttons were there; the swipe is new).
// The name's page and the cards read their texts from the server under test (vite dev with VITE_API_PROXY, as
// v2-0072-cards); the lessons run under the app's CSP, which the dev server's inline preamble does not pass, so on
// vite preview (their texts answered from data/processed by lesson-helpers.ts):
//   BASE_URL=http://localhost:<dev port> npx playwright test e2e/v2-0072-nav-prev.spec.ts --project=mobile --grep-invert lessons
//   BASE_URL=http://localhost:<preview port> npx playwright test e2e/v2-0072-nav-prev.spec.ts --project=mobile --grep lessons
// NAV_SHOTS=<dir> saves each place at 390.
test.use({ serviceWorkers: 'block' })
test.skip(({ isMobile }) => !isMobile, 'the swipe and the touch targets are the phone’s')
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
const SHOTS = process.env.NAV_SHOTS ?? ''

/** A swipe of `dx` px across `el` (a touch's start and end, as the finger makes them). */
async function swipe(el: Locator, dx: number) {
  await el.evaluate((node, dx) => {
    const r = node.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + Math.min(r.height / 2, 120)
    const t = (cx: number) => new Touch({ identifier: 1, target: node, clientX: cx, clientY: y })
    node.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }))
    node.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }))
  }, dx)
}

/** Both at least 44 × 44, and «السابق» on the right of «التالي» in Arabic, on the left in English. */
async function placed(prev: Locator, next: Locator, rtl: boolean) {
  const p = (await prev.boundingBox())!
  const n = (await next.boundingBox())!
  for (const b of [p, n]) {
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.width).toBeGreaterThanOrEqual(44)
  }
  if (rtl) expect(p.x).toBeGreaterThan(n.x)
  else expect(p.x).toBeLessThan(n.x)
}

async function shot(page: Page, name: string, el?: Locator) {
  if (!SHOTS) return
  if (el) await el.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

const dayOf = (n: number) => new Date(Date.parse(`${DATA.epoch}T09:00:00Z`) + (n - 1) * 86_400_000)

test.describe('the name’s page', () => {
  for (const lang of ['ar', 'en'] as const)
    test(`«الاسم السابق» and «الاسم التالي», and a swipe both ways (${lang})`, async ({ page }) => {
      await namesRoute(page)
      await page.clock.setFixedTime(dayOf(2))
      await page.goto(`/today/name/2?lang=${lang}&theme=light`)
      const card = page.getByTestId('name-page')
      await expect(card).toHaveAttribute('data-n', '2')
      const prev = page.getByTestId('name-prev')
      const next = page.getByTestId('name-next')
      await expect(prev).toBeVisible()
      await placed(prev, next, lang === 'ar')
      // each with its arrow
      await expect(prev.locator('svg')).toHaveCount(1)
      await expect(next.locator('svg')).toHaveCount(1)
      await shot(page, `name-page-${lang}`, next)
      const rtl = lang === 'ar'
      // the next by the finger moving right in Arabic, left in English; then back
      await swipe(page.locator('.nc-head').first(), rtl ? 120 : -120)
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '3')
      await swipe(page.locator('.nc-head').first(), rtl ? -120 : 120)
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '2')
      // a downward move turns nothing
      await page.locator('.nc-head').first().evaluate((node) => {
        const r = node.getBoundingClientRect()
        const t = (y: number) => new Touch({ identifier: 1, target: node, clientX: r.left + 20, clientY: y })
        node.dispatchEvent(new TouchEvent('touchstart', { touches: [t(r.top + 10)], changedTouches: [t(r.top + 10)], bubbles: true }))
        node.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(r.top + 200)], bubbles: true }))
      })
      await page.waitForTimeout(300)
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '2')
      // the buttons
      await next.click()
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '3')
      await page.getByTestId('name-prev').click()
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '2')
    })
})

test.describe('«اصنع كروت»: the preview', () => {
  for (const lang of ['ar', 'en'] as const)
    test(`«السابق» and «التالي» under the strip, the dots, the strip still scrolls (${lang})`, async ({ page }) => {
      await namesRoute(page)
      await page.clock.setFixedTime(dayOf(2))
      await page.goto(`/today/name/2?lang=${lang}&theme=light`)
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '2')
      await page.getByTestId('name-cards').click()
      await expect(page.getByTestId('cards-preview')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
      const n = Number(await page.getByTestId('cards-preview').getAttribute('data-count'))
      expect(n).toBeGreaterThan(1)
      const pager = page.getByTestId('cards-pager')
      const prev = page.getByTestId('cards-prev')
      const next = page.getByTestId('cards-next')
      await placed(prev, next, lang === 'ar')
      await expect(pager).toHaveAttribute('data-at', '0')
      // the first card: no «السابق», and it does not turn to the last
      await expect(prev).toBeDisabled()
      await expect(next).toHaveAttribute('aria-label', lang === 'ar' ? `التالي، الكرت ٢ من ${new Intl.NumberFormat('ar-u-nu-arab').format(n)}` : `Next, Card 2 of ${n}`)
      if (n <= 12) await expect(pager.locator('.cd-dots i')).toHaveCount(n)
      await shot(page, `cards-${lang}`, pager)
      // forward then back: the same card
      await next.click()
      await expect(pager).toHaveAttribute('data-at', '1')
      await prev.click()
      await expect(pager).toHaveAttribute('data-at', '0')
      // to the last: «التالي» stops there
      for (let i = 1; i < n; i++) {
        await next.click()
        await expect(pager).toHaveAttribute('data-at', String(i))
      }
      await expect(next).toBeDisabled()
      await expect(prev).toBeEnabled()
      // the strip scrolled by the finger still follows: back to the first card by scrolling (after the glide to the
      // last has settled; a finger's touch ends the glide at once)
      await page.waitForTimeout(1000)
      await page.getByTestId('cards-preview').evaluate((el) => (el.firstElementChild as HTMLElement).scrollIntoView({ inline: 'center', block: 'nearest' }))
      await expect(pager).toHaveAttribute('data-at', '0')
    })
})

test.describe('the starting path', () => {
  for (const lang of ['ar', 'en'] as const)
    test(`the previous step beside the next; none before the first (${lang})`, async ({ page }) => {
      await page.route(/\/api\/starter\/\w+\/stories/, (r) => r.fulfill({ json: { step: 'x', stories: [], chapters: [] } }))
      await page.goto(`/start/salah?lang=${lang}&theme=light`)
      const prev = page.getByTestId('starter-prev')
      const next = page.getByTestId('starter-next')
      await expect(prev).toHaveText(lang === 'ar' ? 'الخطوة السابقة: الشهادتان' : /^Previous step: /)
      await placed(prev, next, lang === 'ar')
      await shot(page, `starter-${lang}`, next)
      await prev.click()
      await expect(page).toHaveURL(/\/start\/shahada/)
      await page.getByTestId('starter-next').click()
      await expect(page).toHaveURL(/\/start\/salah/)
      await page.goto(`/start/islam?lang=${lang}&theme=light`)
      await expect(page.getByTestId('starter-next')).toBeVisible()
      await expect(page.getByTestId('starter-prev')).toHaveCount(0)
    })
})

test.describe('the lessons: a swipe both ways', () => {
  test.skip(!HAVE_DATA, 'the texts come from our server by id: answered here from data/processed, outside git')
  for (const lang of ['ar', 'en'] as const)
    test(`«علّمني الوضوء» (${lang})`, async ({ page }) => {
      await openLesson(page, 'wudu', { data: wudu, lang, step: 2 })
      const rtl = lang === 'ar'
      const card = page.locator('#lsn-wudu article.card')
      await swipe(card, rtl ? 120 : -120)
      await expect(page).toHaveURL(/step=3/)
      await swipe(page.locator('#lsn-wudu article.card'), rtl ? -120 : 120)
      await expect(page).toHaveURL(/step=2/)
      await swipe(page.locator('#lsn-wudu article.card'), rtl ? -120 : 120)
      await expect(page).toHaveURL(/step=1/)
      // the first step: no turning back past it
      await swipe(page.locator('#lsn-wudu article.card'), rtl ? -120 : 120)
      await page.waitForTimeout(300)
      await expect(page).toHaveURL(/step=1/)
      const [prev, next] = [page.locator('#lsn-wudu .stepper .btn').first(), page.locator('#lsn-wudu .stepper .btn.primary')]
      await expect(prev).toBeDisabled()
      await placed(prev, next, rtl)
      await shot(page, `lesson-wudu-${lang}`)
    })

  test('«علّمني الصلاة» (fajr): the steps by a swipe', async ({ page }) => {
    await openLesson(page, 'prayer', { data: prayer, prayer: 'fajr', step: 2 })
    await swipe(page.locator('#lsn-prayer article.card'), 120)
    await expect(page).toHaveURL(/step=3/)
    await swipe(page.locator('#lsn-prayer article.card'), -120)
    await expect(page).toHaveURL(/step=2/)
  })
})
