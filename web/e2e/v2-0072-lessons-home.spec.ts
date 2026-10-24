import { expect, test } from '@playwright/test'
import { lessonHere } from './lesson-helpers'

// The «علّمني» lessons (add-on 0072) are lazy chunks: the home page loads none of them (no three.js, no lesson data),
// and an unknown lesson goes home. The starting path's «الصلاة» and «الطهارة» offer their lesson once it is here.
//   npx vite preview --port 8794 && BASE_URL=http://localhost:8794 npx playwright test e2e/v2-0072-lessons-home.spec.ts --project=mobile
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')

test('the home page loads no lesson chunk', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script' || r.resourceType() === 'stylesheet') scripts.push(new URL(r.url()).pathname)
  })
  await page.goto('/?theme=light')
  await expect(page.locator('.dt-today')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(scripts.length).toBeGreaterThan(0)
  expect(scripts.filter((s) => /\/assets\/lesson-|three/.test(s))).toEqual([])
})

test('an unknown lesson goes home', async ({ page }) => {
  await page.goto('/today/lesson/nothing?theme=light')
  await expect(page).toHaveURL(/\/\?|\/$/)
})

for (const [id, step, title] of [
  ['prayer', 'salah', 'علّمني الصلاة'],
  ['wudu', 'taharah', 'علّمني الوضوء'],
] as const) {
  test(`the starting path's «${step}» ${lessonHere(id) ? 'opens' : 'has no card for'} the ${id} lesson`, async ({ page }) => {
    await page.goto(`/start/${step}?lang=ar&theme=light`)
    await expect(page.locator('.ss-ask')).toBeVisible()
    const card = page.getByTestId('starter-lesson')
    if (!lessonHere(id)) return expect(card).toHaveCount(0)
    await expect(card.getByRole('link', { name: title })).toBeVisible()
    await card.getByRole('link', { name: title }).click()
    await expect(page).toHaveURL(new RegExp(`/today/lesson/${id}`))
    await expect(page.locator(`#lsn-${id}`)).toBeAttached({ timeout: 20_000 })
    // back returns to the step, inside the app
    await page.locator('.dt-head .v2-icon-btn').click()
    await expect(page).toHaveURL(new RegExp(`/start/${step}`))
  })
}
