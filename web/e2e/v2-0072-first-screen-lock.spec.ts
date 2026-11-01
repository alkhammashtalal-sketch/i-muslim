import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// The visual lock of the first thing the reader sees (add-on 0072-add28 §4, 0072-add29 §5; CLAUDE.md §8): the welcome
// page, its language picker, and the first screen of «يومك» down to the blue date card, at the two phone sizes, against
// reference images taken from build 17 (1071514), the build Talal approved. The run fails when one of them changes by
// more than a small amount. The references in e2e/v2-0072-first-screen-lock.spec.ts-snapshots/ change only with an
// approval line from the coordinator in relay, named in e2e/first-screen-lock.json (worker/test/first-screen-lock.test.ts
// checks their hashes against it).
// Run on the app's own build (npm run build:native, then vite preview): BASE_URL=http://localhost:<port>.
// The day is fixed and the network refused, so the sky, the date and the cards are the same on every run.

// The references are the mobile project's (…-mobile-darwin.png): a desktop run would write new ones, so it skips
// (the mobile project is the one with isMobile, playwright.config.ts).
test.skip(({ isMobile }) => !isMobile, 'the lock references are mobile-only')

const SIZES = [
  ['16promax', 440, 956, 3],
  ['se', 375, 667, 2],
] as const
const DAY = new Date('2026-10-25T10:00:00+03:00')
const DIFF = { maxDiffPixelRatio: 0.01, animations: 'disabled' as const, caret: 'hide' as const }

async function quiet(page: Page, seen: boolean) {
  await page.clock.install({ time: DAY })
  // Nothing leaves the page: the server, the fonts' and the images' own origins are the page's, so they still load.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort())
  await page.route('**/api/**', (r) => r.abort())
  if (seen) await page.addInitScript(() => localStorage.setItem('muslim.welcome.v1', '1'))
  else await page.addInitScript(() => localStorage.removeItem('muslim.welcome.v1'))
}

for (const [name, width, height, scale] of SIZES)
  test.describe(`the first screens on ${name}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor: scale, storageState: { cookies: [], origins: [] } })

    test('the welcome page as in build 17: «العربية» and «ابدأ»', async ({ page }) => {
      await quiet(page, false)
      await page.goto('/?lang=ar')
      await page.locator('.wl-drawn').waitFor({ timeout: 15000 })
      await expect(page.locator('.wl-start')).toBeVisible()
      await expect(page.locator('.wl-lang')).toBeVisible()
      await page.clock.runFor(1500)
      await expect(page).toHaveScreenshot(`welcome-${name}.png`, DIFF)
    })

    test('the language picker from the welcome page, as in build 17', async ({ page }) => {
      await quiet(page, false)
      await page.goto('/?lang=ar')
      await page.locator('.wl-drawn').waitFor({ timeout: 15000 })
      await page.locator('.wl-lang').click()
      await page.clock.runFor(1500)
      await expect(page).toHaveScreenshot(`language-${name}.png`, DIFF)
    })

    test('the first screen of «يومك» down to the blue date card, as in build 17', async ({ page }) => {
      await quiet(page, true)
      await page.goto('/?lang=ar')
      const date = page.locator('.day-date')
      await date.waitFor({ timeout: 15000 })
      await page.clock.runFor(1500)
      const box = (await date.boundingBox())!
      await expect(page).toHaveScreenshot(`today-${name}.png`, { ...DIFF, clip: { x: 0, y: 0, width, height: Math.min(height, Math.ceil(box.y + box.height)) } })
    })
  })

// add-on 0072-add29 §5: the app comes up with no network and with a slow one: the welcome (first run) or «يومك» (later)
// within two seconds; nothing at launch waits for the network.
for (const net of ['none', 'slow'] as const)
  test.describe(`launch with ${net === 'none' ? 'no network' : 'a slow network'}`, () => {
    test.use({ storageState: { cookies: [], origins: [] } })
    const cut = async (page: Page) => {
      const away = /^https?:\/\/(?!localhost|127\.0\.0\.1)|\/api\//
      if (net === 'none') await page.route(away, (r) => r.abort())
      else await page.route(away, async (r) => (await new Promise((s) => setTimeout(s, 8000)), r.abort()))
    }
    test('first run: the welcome with «ابدأ» within two seconds', async ({ page }) => {
      await cut(page)
      const t0 = Date.now()
      await page.goto('/?lang=ar', { waitUntil: 'commit' })
      await expect(page.locator('.wl-start')).toBeVisible({ timeout: 2000 })
      expect(Date.now() - t0).toBeLessThan(2500)
    })
    test('a later launch: «يومك» within two seconds', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('muslim.welcome.v1', '1'))
      await cut(page)
      const t0 = Date.now()
      await page.goto('/?lang=ar', { waitUntil: 'commit' })
      await expect(page.locator('#q')).toBeVisible({ timeout: 2000 })
      expect(Date.now() - t0).toBeLessThan(2500)
    })
  })

// The lock's own record is read by the worker test; here only that it exists beside the references.
test('the lock record exists', () => {
  expect(fs.existsSync(path.resolve('e2e/first-screen-lock.json'))).toBe(true)
})
