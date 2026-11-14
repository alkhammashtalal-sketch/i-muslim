import { expect, test, type Page } from '@playwright/test'

// Add-on 0072-add69 §3: no minutes are added for Dhaka (add-on 0071-add17 §1); «طريقة الحساب» says, for a country whose
// table is known to differ, «قد يختلف جدول مسجدك بدقائق؛ عدّل كل صلاة من هنا», with Bangladesh's difference and its
// reason, and a button to each prayer's own minutes, which the times then follow. A country without a known difference:
// no line. No network: the place is seeded, nothing is asked of the server.
const DHAKA = { lat: 23.71, lng: 90.407, timeZone: 'Asia/Dhaka', source: 'city', country: 'BD', name: 'ঢাকা' }
const RIYADH = { lat: 24.688, lng: 46.722, timeZone: 'Asia/Riyadh', source: 'city', country: 'SA', name: 'الرياض' }
const PARIS = { lat: 48.853, lng: 2.349, timeZone: 'Europe/Paris', source: 'city', country: 'FR', name: 'Paris' }

async function seed(page: Page, place: object) {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('muslim.place.v1', JSON.stringify(p))
      sessionStorage.setItem('seeded', '1')
    }
  }, place)
}
const openSheet = async (page: Page, lang = 'ar') => {
  await page.goto(`/today/times?lang=${lang}`)
  await page.getByRole('button', { name: lang === 'ar' ? /طريقة الحساب/ : /Calculation/ }).click()
}

test('Bangladesh: the line, its difference and reason, and the button to each prayer’s minutes', async ({ page }) => {
  await seed(page, DHAKA)
  await openSheet(page)
  const hint = page.locator('[data-adjust-hint="BD"]')
  await expect(hint).toBeVisible()
  await expect(hint.getByText('قد يختلف جدول مسجدك بدقائق؛ عدّل كل صلاة من هنا', { exact: true })).toBeVisible()
  await expect(page.locator('[data-adjust-reason="BD"]')).toContainText('بدقيقة إلى ٣ دقائق')
  await expect(page.locator('[data-adjust-reason="BD"]')).toContainText('لم نجد نصًا منشورًا من المؤسسة يذكرها')
  // The button brings the minutes into view and puts the focus on them.
  await hint.getByRole('button', { name: 'تعديل دقائق كل صلاة' }).click()
  const adjust = page.locator('#dt-adjust')
  await expect(adjust).toBeFocused()
  await expect(adjust).toBeInViewport()
  await expect(adjust.locator('[data-adjust]')).toHaveCount(5)
})

test('the minutes change the times shown, are kept, and go back to the calculation', async ({ page }) => {
  await seed(page, DHAKA)
  await page.goto('/today/times?lang=ar')
  const fajrAt = page.locator('.dt-time', { has: page.locator('[data-row-name="fajr"]') }).locator('.dt-time-at')
  const fajrBefore = await fajrAt.textContent()
  await page.getByRole('button', { name: /طريقة الحساب/ }).click()
  const fajrRow = page.locator('[data-adjust="fajr"]')
  await expect(fajrRow.locator('output')).toHaveText('٠')
  const before = await page.evaluate(() => localStorage.getItem('muslim.prayer.minutes.v1'))
  expect(before).toBeNull()
  await fajrRow.getByRole('button', { name: /أخّر الفجر دقيقة/ }).click()
  await fajrRow.getByRole('button', { name: /أخّر الفجر دقيقة/ }).click()
  await expect(fajrRow.locator('output')).toHaveText('+٢')
  // The times shown follow at once (the row under the sheet).
  await expect(fajrAt).not.toHaveText(fajrBefore!)
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('muslim.prayer.minutes.v1')))!)).toEqual({ fajr: 2 })
  // Dhaka's own Maghrib minutes stay; the user's are added to them.
  await page.locator('[data-adjust="maghrib"]').getByRole('button', { name: /قدّم المغرب دقيقة/ }).click()
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('muslim.prayer.minutes.v1')))!)).toEqual({ fajr: 2, maghrib: -1 })
  await page.reload()
  await page.getByRole('button', { name: /طريقة الحساب/ }).click()
  await expect(page.locator('[data-adjust="fajr"] output')).toHaveText('+٢')
  await page.getByRole('button', { name: 'إرجاع الكل إلى الحساب' }).click()
  await expect(page.locator('[data-adjust="fajr"] output')).toHaveText('٠')
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('muslim.prayer.minutes.v1')))!)).toEqual({})
})

test('a country without a known difference: no line; the minutes are still there for anyone', async ({ page }) => {
  await seed(page, RIYADH)
  await openSheet(page)
  await expect(page.locator('#dt-adjust')).toBeVisible()
  await expect(page.locator('[data-adjust-hint]')).toHaveCount(0)
  await expect(page.getByText('قد يختلف جدول مسجدك بدقائق')).toHaveCount(0)
})

test('France in English: the line without Bangladesh’s reason', async ({ page }) => {
  await seed(page, PARIS)
  await openSheet(page, 'en')
  await expect(page.locator('[data-adjust-hint="FR"]')).toContainText('Your mosque’s timetable may differ by a few minutes; adjust each prayer here')
  await expect(page.locator('[data-adjust-reason]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Adjust each prayer’s minutes' }).click()
  await expect(page.locator('#dt-adjust')).toBeFocused()
})
