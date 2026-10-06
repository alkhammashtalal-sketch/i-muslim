import { expect, test } from '@playwright/test'

// «تحقّق بنفسك» (/verify, command 17): reached from the About page (not the welcome page), twelve cases each with a
// text result badge, «جرّبها الآن» puts the question in the chat box and sends nothing, Arabic and English.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/verify.spec.ts

test.describe('verify page', () => {
  test.use({ serviceWorkers: 'block' })

  test('About leads to /verify; the welcome page does not', async ({ page }) => {
    await page.goto('/?lang=ar')
    await expect(page.getByRole('link', { name: 'للمحكّمين: تحقّق بنفسك' })).toHaveCount(0)
    await page.goto('/#about')
    await page.getByRole('link', { name: 'للمحكّمين: تحقّق بنفسك' }).click()
    await expect(page).toHaveURL(/\/verify(\?|$)/)
    await expect(page.locator('main h1')).toHaveText('تحقّق بنفسك')
  })

  test('twelve cases, each with its result as text; try it fills the box without sending', async ({ page }) => {
    const asks: string[] = []
    page.on('request', (r) => r.url().includes('/api/ask') && asks.push(r.url()))
    await page.goto('/verify?lang=ar')
    await expect(page.getByText('حالات الاختبار الرسمية من الحزمة العلمية للتحدي، وإجابة التطبيق على كل منها، ونتيجة القياس الحي.')).toBeVisible()
    const cases = page.locator('.verify-case')
    await expect(cases).toHaveCount(12)
    for (let i = 0; i < 12; i++) await expect(cases.nth(i).locator('.verify-result .badge')).toHaveText(/^(ناجح|راسب|يدوي)$/)
    await expect(page.getByRole('heading', { name: 'الحالة ١', exact: true })).toBeVisible()

    const q = (await cases.nth(1).locator('.verify-q').textContent())!.trim()
    await cases.nth(1).getByRole('button', { name: 'جرّبها الآن' }).click()
    await expect(page).toHaveURL(/\/(\?|$)/)
    await expect(page.locator('.composer textarea')).toHaveValue(q)
    await expect(page.locator('.composer textarea')).toBeFocused()
    await page.waitForTimeout(500)
    expect(asks).toEqual([])
  })

  test('mock data shows the sample-data notice; English', async ({ page }) => {
    await page.goto('/verify?lang=en')
    await expect(page.locator('main h1')).toHaveText('Check it yourself')
    await expect(page.locator('.verify-case')).toHaveCount(12)
    // The data file says whether it came from a mock run; the notice follows it.
    const mock = (await import('../src/verify/data.json', { with: { type: 'json' } })).default.mock
    await expect(page.locator('.verify-demo')).toHaveCount(mock ? 1 : 0)
    await expect(page.getByRole('button', { name: 'Try it now' }).first()).toBeVisible()
  })
})
