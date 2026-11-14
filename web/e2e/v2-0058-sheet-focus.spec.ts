import { expect, test } from '@playwright/test'

// Reply 0058 §2 on a preview of next (never the live link): a sheet opened by a press takes the focus itself, so no
// ring is drawn around its «×» (WebKit drew one, as it did around «ابدأ», 0055 ب); the modal sheet keeps the focus
// inside it, Tab reaches «×» first with its ring, and Escape closes it. Checked in WebKit by hand with real taps
// (relay/w1/0055-report.md); here in the suite's browser.
//   cd web && BASE_URL=… npx playwright test e2e/v2-0058-sheet-focus.spec.ts --workers=2
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

test('the ayah sheet opened by a press: the focus on the sheet, no ring on «×»; Tab reaches «×» with its ring; Escape closes', async ({ page }) => {
  await page.goto('/quran/2?lang=ar')
  await page.locator('.ayah-num').nth(4).click()
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet).toBeVisible()
  const close = sheet.locator('.sheet-head .icon-btn')
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('DIALOG')
  expect(await close.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('none')
  expect(await sheet.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('none')
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  expect(await close.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('solid')
  // The focus stays in the sheet as Tab goes on.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})

test('the settings sheet too: the focus on the sheet, no ring on «×»', async ({ page }) => {
  await page.goto('/?lang=ar')
  await page.locator('header').getByRole('button', { name: 'الإعدادات' }).click()
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('DIALOG')
  expect(await sheet.locator('.sheet-head .icon-btn').evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('none')
})
