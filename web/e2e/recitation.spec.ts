import { expect, test, type Page } from '@playwright/test'

// Human recitation (command 17): nothing goes to mp3quran before the press, the page and ayah buttons play with the
// ayah lit, pause/resume/stop work, the single ayah stops at its end, no CSP error, offline disables the button.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/recitation.spec.ts --project=mobile
// Real playback (a few seconds of Surat al-Fatiha from the reciter's server); no question is sent to /api/ask.

const MP3 = /mp3quran\.net/

function watch(page: Page) {
  const media: string[] = []
  const csp: string[] = []
  page.on('request', (r) => MP3.test(r.url()) && media.push(r.url()))
  page.on('console', (m) => m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text()) && csp.push(m.text()))
  return { media, csp }
}

test.describe('recitation', () => {
  test.use({ serviceWorkers: 'block' })

  test('sura page: listen, the ayah lights, pause, resume, stop', async ({ page }) => {
    const w = watch(page)
    await page.goto('/quran/1?lang=ar')
    const listen = page.locator('.listen-bar .listen-main')
    await expect(listen).toHaveText('استمع')
    await expect(page.locator('.listen-bar .listen-credit a')).toHaveAttribute('href', 'https://www.mp3quran.net')
    // Loaded, with the timing file fetched from our origin, and still not one request to mp3quran.
    await page.waitForLoadState('networkidle')
    expect(w.media).toEqual([])
    expect(await page.locator('audio').count()).toBe(0)

    await listen.click()
    await expect(page.locator('#a-1.is-reciting')).toBeVisible()
    await expect(listen).toHaveText('إيقاف مؤقت')
    expect(w.media.length).toBeGreaterThan(0)
    expect(w.media.every((u) => u.startsWith('https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/001.mp3'))).toBe(true)
    // Ayah 2 begins at 6.04 s: the light moves on with the recitation.
    await expect(page.locator('#a-2.is-reciting')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.ayah.is-reciting')).toHaveCount(1)

    await listen.click()
    await expect(listen).toHaveText('متابعة')
    await expect(page.locator('.ayah.is-reciting')).toHaveCount(1)
    await listen.click()
    await expect(listen).toHaveText('إيقاف مؤقت')

    await page.locator('.listen-bar .listen-stop').click()
    await expect(listen).toHaveText('استمع')
    await expect(page.locator('.ayah.is-reciting')).toHaveCount(0)
    expect(w.csp).toEqual([])
  })

  test('ayah sheet: listen to the ayah, lit in its frame, stops at its end', async ({ page }) => {
    const w = watch(page)
    await page.goto('/quran/1/2?lang=ar')
    const sheet = page.locator('dialog.sheet[open]')
    const listen = sheet.locator('.frame-listen .listen-main')
    await expect(listen).toHaveText('استمع للآية')
    await page.waitForLoadState('networkidle')
    expect(w.media).toEqual([])

    await listen.click()
    await expect(sheet.locator('.frame.is-reciting')).toBeVisible()
    await expect(sheet.locator('.listen-credit a')).toBeVisible()
    // Ayah 2 lasts 4.1 s; the player ends there on its own, before ayah 3.
    await expect(listen).toHaveText('استمع للآية', { timeout: 15_000 })
    await expect(sheet.locator('.frame.is-reciting')).toHaveCount(0)
    expect(w.csp).toEqual([])
  })

  test('offline: the button is disabled and says why', async ({ page, context }) => {
    await page.goto('/quran/112?lang=ar')
    await expect(page.locator('.listen-bar .listen-main')).toBeEnabled()
    await context.setOffline(true)
    await expect(page.locator('.listen-bar .listen-main')).toBeDisabled()
    await expect(page.locator('.listen-bar .listen-note')).toHaveText('التلاوة تحتاج اتصالًا')
    await context.setOffline(false)
  })

  test('English: the same player in English', async ({ page }) => {
    await page.goto('/quran/112?lang=en')
    await expect(page.locator('.listen-bar .listen-main')).toHaveText('Listen')
    await expect(page.locator('.listen-bar .listen-credit a')).toHaveText('Recitation: mp3quran.net')
  })
})
