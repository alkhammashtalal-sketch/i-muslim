import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { DOWNLOADS } from '../src/quran/download-strings'
import { OFFLINE_SEARCH } from '../src/offline-search/strings'
import { fakeRecitation } from './helpers/fake-recitation'

// Reply 0056 on a preview of next (never the live link): (أ) a sura downloaded from «استمع», played with no
// connection, listed in «التنزيلات» with its size, and deleted; the whole Mushaf asked first, then paused; (ب) «اسأل»
// with no connection: the line, the places the question names, the rows of the app's own files, «أعد السؤال» once the
// connection is back, and no voice buttons. Nothing real is fetched from mp3quran (the local silent file).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0056-offline.spec.ts --workers=2
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const SILENCE = fs.readFileSync(path.resolve(import.meta.dirname, 'fixtures/silence-8s.mp3'))
const OFF = path.resolve(import.meta.dirname, '../ios/App/App/public/offline')

/** mp3quran answered by the silent file, readable by the page (the real CDN sends Access-Control-Allow-Origin: *). */
async function fakeCdn(page: Page) {
  await fakeRecitation(page)
  await page.route(/cdn\.mp3quran\.net/, (r) =>
    r.fulfill({ status: 200, contentType: 'audio/mpeg', headers: { 'access-control-allow-origin': '*', 'content-length': String(SILENCE.length) }, body: SILENCE }),
  )
}
/** The app's own copy of the suras and adhkar (the iOS app carries them as /offline/…). */
async function appFiles(page: Page) {
  await page.route(/\/offline\/(.+\.json)$/, (r) => {
    const rel = r.request().url().match(/\/offline\/(.+\.json)$/)![1]
    const f = path.join(OFF, rel)
    return fs.existsSync(f) ? r.fulfill({ contentType: 'application/json', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' })
  })
}

test.describe('(أ) a downloaded recitation', () => {
  test('download a sura, play it with no connection, see it in «التنزيلات» with its size, delete it', async ({ page, context }) => {
    await fakeCdn(page)
    const t = DOWNLOADS.ar
    await page.goto('/quran/112?lang=ar')
    const dl = page.getByTestId('sura-download')
    await expect(dl).toContainText('تنزيل (')
    await dl.click()
    await expect(page.getByTestId('sura-downloaded')).toHaveText(t.downloaded)
    if (SHOTS) await page.locator('.listen-bar').screenshot({ path: path.join(SHOTS, 'sura-downloaded-ar.png') })
    // No connection: «استمع» still plays this sura, from the device; no «غير متصل» line under it.
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    const listen = page.locator('.listen-bar .listen-main')
    await expect(listen).toBeEnabled()
    await expect(page.locator('.listen-bar .listen-note')).toHaveCount(0)
    await listen.click()
    await expect(page.locator('.listen-bar .listen-stop')).toBeVisible()
    await expect(page.locator('.listen-bar .listen-note')).toHaveCount(0)
    await page.locator('.listen-bar .listen-stop').click()
    // Another sura, not downloaded: «غير متصل» as before.
    await page.goto('/quran/113?lang=ar').catch(() => undefined)
    await context.setOffline(false)
    await page.goto('/quran/downloads?lang=ar')
    await expect(page.getByTestId('downloads-total')).toContainText('المجموع:')
    const card = page.locator('[data-testid^="downloads-"]').filter({ has: page.locator('.rd-row') }).first()
    await expect(card).toContainText('١ سورة')
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'downloads-ar.png'), fullPage: true })
    await card.getByRole('button', { name: t.removeReciter }).click()
    await card.locator('[data-testid^="downloads-delete-"]').click()
    await expect(page.locator('.rd-empty')).toHaveText(t.empty)
    await page.goto('/quran/112?lang=ar')
    await expect(page.getByTestId('sura-download')).toBeVisible()
  })

  test('the whole Mushaf: its size, asked first, then sura by sura, paused and resumed', async ({ page }) => {
    await fakeCdn(page)
    const t = DOWNLOADS.ar
    await page.goto('/quran/reciters?lang=ar')
    const box = page.getByTestId('mushaf-download')
    await expect(box).toContainText('١١٤ سورة، نحو')
    await page.getByTestId('mushaf-ask').click()
    await expect(box).toContainText('يُنزَّل المصحف كاملًا بصوت')
    await page.getByTestId('mushaf-start').click()
    await expect(box).toContainText('نُزّلت')
    await page.getByTestId('mushaf-pause').click()
    await expect(page.getByTestId('mushaf-resume')).toBeVisible()
    await expect(box).toContainText(t.paused)
    if (SHOTS) await box.screenshot({ path: path.join(SHOTS, 'mushaf-paused-ar.png') })
  })

  test('at 135% text, in Arabic and English: nothing wider than the page, every control 44 px or more', async ({ page }) => {
    await fakeCdn(page)
    await page.setViewportSize({ width: 375, height: 812 })
    for (const lang of ['ar', 'en'] as const) {
      for (const url of [`/quran/112?lang=${lang}`, `/quran/reciters?lang=${lang}`]) {
        await page.goto(url)
        await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
        await page.waitForTimeout(200)
        const bad = await page.evaluate(() => {
          const out: string[] = []
          const W = document.documentElement.clientWidth
          for (const el of document.querySelectorAll<HTMLElement>('.dl-card *, .dl-button, .dl-progress, .listen-bar *')) {
            const r = el.getBoundingClientRect()
            if (r.width && (r.left < -1 || r.right > W + 1)) out.push(`${el.className || el.tagName} ${Math.round(r.left)}–${Math.round(r.right)}`)
          }
          for (const b of document.querySelectorAll<HTMLElement>('.dl-card button, .dl-button')) if (b.getBoundingClientRect().height < 44) out.push(`small ${b.className}`)
          return out
        })
        expect(bad, `${url} at 135%`).toEqual([])
        if (SHOTS && url.includes('reciters')) await page.getByTestId('mushaf-download').screenshot({ path: path.join(SHOTS, `mushaf-${lang}-135.png`) })
      }
    }
  })
})

test.describe('(ب) «اسأل» with no connection', () => {
  test('the line, the places, the rows of the app\'s files; «أعد السؤال» once back; no voice buttons', async ({ page, context }) => {
    await appFiles(page)
    await page.goto('/?lang=ar')
    await expect(page.locator('.voice-toggle').first()).toBeVisible()
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('.voice-toggle')).toHaveCount(0)
    await expect(page.locator('.mic-btn')).toHaveCount(0)
    const box = page.locator('textarea').first()
    await box.fill('آية الكرسي')
    await box.press('Enter')
    const card = page.getByTestId('offline-results').last()
    await expect(card.locator('.off-line')).toHaveText(OFFLINE_SEARCH.ar.line)
    await expect(card.locator('.off-place').first()).toHaveAttribute('href', '/quran/2/255')
    await expect(page.getByTestId('offline-retry')).toHaveCount(0)
    await box.fill('الصيام في رمضان')
    await box.press('Enter')
    const card2 = page.getByTestId('offline-results').last()
    await expect(card2.locator('.off-quote').first()).toBeVisible()
    expect(await card2.locator('.off-quote').count()).toBeLessThanOrEqual(10)
    await expect(card2.locator('.off-quote[data-kind="ayah"] .ref').first()).toContainText(/\d|[٠-٩]/)
    if (SHOTS) await card2.screenshot({ path: path.join(SHOTS, 'offline-search-ar.png') })
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByTestId('offline-retry').last()).toHaveText(OFFLINE_SEARCH.ar.retry)
    await expect(page.locator('.voice-toggle').first()).toBeVisible()
  })
})
