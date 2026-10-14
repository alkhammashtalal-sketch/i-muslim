import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import config from '../src/config/recitation.json' with { type: 'json' }
import { SOURCES_UI } from '../src/v2/sources/strings'
import { fakeRecitation } from './helpers/fake-recitation'

// Reply 0047 on a preview of next (never the live link):
//   §1 the reciters' photos: Nasser Alqatami and Abdulrahman Alsudais in a circle on «القرّاء», in the ayah's listening
//      section and in the settings' reciter row (now a row with the photo and an arrow that opens «القرّاء», no
//      select); the four others keep the initial; the credit word for word on «المصادر والشكر» with the licence link.
//   §3 «حسب إعداد الجوال»: the root size is the phone's Text Size, read from -apple-system-body, within 100%–135%.
//      Chromium has no such style, so the probe is answered here as WebKit on an iPhone would (17 px at the default).
//   cd web && BASE_URL=http://localhost:8796 npx playwright test e2e/v2-0047.spec.ts --project=mobile --workers=2
// SHOTS=dir saves the reciters page, the ayah's listening section, the settings and the sources rows there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const shot = async (page: Page, name: string, el?: ReturnType<Page['locator']>) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await (el ?? page).screenshot({ path: path.join(SHOTS, `${name}.png`), animations: 'disabled' })
}
const PHOTOS = [86, 54, 123, 5, 92] // 0054-add1: Abdulbasit (53) keeps his initial
const byRead = (read: number) => config.reciters.find((r) => r.read === read)!

test.describe('§1 the reciters\' photos', () => {
  test('«القرّاء»: a photo for Alqatami and Alsudais, filling a 48 px circle; the initial for the four others', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1100 })
    await page.goto('/quran/reciters?lang=ar')
    await expect(page.locator('.rd-reciter')).toHaveCount(config.reciters.length)
    for (const r of config.reciters) {
      const avatar = page.locator('.rd-reciter', { hasText: r.name.ar }).locator('.rd-avatar')
      if (PHOTOS.includes(r.read)) {
        const img = avatar.locator('img')
        await expect(img).toHaveCount(1)
        await expect(img).toHaveAttribute('alt', '')
        // 0054 أ1: cut out on white, 336 px for the 112 px circle at 3×.
        await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(336)
        const box = await avatar.boundingBox()
        expect(Math.round(box!.width)).toBe(48)
        expect(Math.round(box!.height)).toBe(48)
        expect(await avatar.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('999px')
      } else {
        await expect(avatar.locator('img')).toHaveCount(0)
        await expect(avatar).toHaveText(r.name.ar.trim().charAt(0))
      }
      // 0054 أ4: the photo and the initial alike, a white circle of the same size and hairline.
      expect(await avatar.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).borderTopWidth, el.getBoundingClientRect().width])).toEqual(['rgb(255, 255, 255)', '1px', 48])
      await expect(avatar).toHaveAttribute('aria-hidden', 'true')
    }
    await shot(page, 'reciters-ar')
  })

  test('the ayah\'s listening section shows the chosen reciter\'s photo, or his initial', async ({ page }) => {
    await fakeRecitation(page)
    await page.goto('/quran/51/56?lang=ar')
    const sheet = page.locator('dialog.sheet[open]')
    const avatar = sheet.locator('.rd-listen .rd-avatar')
    await expect(avatar.locator('img')).toHaveCount(PHOTOS.includes(config.reciters[0].read) ? 1 : 0)
    await shot(page, 'listen-ar', sheet.locator('.rd-listen'))
    // Abdulbasit Abdulsamad has no photo that shows his face (0054-add1): the initial.
    await page.evaluate(() => localStorage.setItem('imuslim.reciter.v1', '53'))
    await page.reload()
    await expect(page.locator('dialog.sheet[open] .rd-listen .rd-avatar')).toHaveText('ع')
    await expect(page.locator('dialog.sheet[open] .rd-listen .rd-avatar img')).toHaveCount(0)
  })

  test('the settings: the reciter is a row with his photo, his name and an arrow, no select; it opens «القرّاء», and back returns', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.locator('header').getByRole('button', { name: 'الإعدادات' }).click()
    const settings = page.locator('dialog.sheet[open]')
    const row = settings.getByTestId('set-reciter')
    await expect(settings.locator('select')).toHaveCount(0)
    await expect(row).toContainText('القارئ')
    await expect(row).toContainText(byRead(54).name.ar)
    await expect(row.locator('.rd-avatar img')).toHaveCount(1)
    await expect(row.locator('.v2-set-end svg')).toHaveCount(1)
    expect(Math.round((await row.boundingBox())!.height)).toBeGreaterThanOrEqual(44)
    await shot(page, 'settings-reciter-ar', row)
    await row.click()
    await expect(page).toHaveURL(/\/quran\/reciters/)
    await expect(page.locator('dialog.sheet[open]')).toHaveCount(0)
    // Choose Alqatami there; the row then carries his photo.
    await page.locator('.rd-reciter', { hasText: byRead(86).name.ar }).locator('.rd-reciter-pick').click()
    await page.locator('.rd-page .rd-head .rd-icon-btn').first().click()
    await expect(page).toHaveURL(/\/\?lang=ar$|\/$/)
    await page.locator('header').getByRole('button', { name: 'الإعدادات' }).click()
    await expect(page.locator('dialog.sheet[open]').getByTestId('set-reciter')).toContainText(byRead(86).name.ar)
    await expect(page.locator('dialog.sheet[open]').getByTestId('set-reciter').locator('.rd-avatar img')).toHaveCount(1)
  })

  test('English: the row and the reciters page in English, the photos the same', async ({ page }) => {
    await page.goto('/?lang=en')
    await page.locator('header').getByRole('button', { name: 'Settings' }).click()
    const row = page.locator('dialog.sheet[open]').getByTestId('set-reciter')
    await expect(row).toContainText(byRead(54).name.en!)
    await expect(row.locator('.rd-avatar img')).toHaveCount(1)
    await shot(page, 'settings-reciter-en', row)
  })

  test('«المصادر والشكر»: each photo has its row with the credit word for word, and its sheet the licence link', async ({ page }) => {
    await page.route('**/api/sources/status*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ checked_at: null, pending: [], meaning: null, mukhtasar: null }) }))
    await page.goto('/sources?lang=ar')
    const q = page.locator('[data-source=photo-alqatami]')
    const s = page.locator('[data-source=photo-alsudais]')
    await expect(q.locator('.sr-row-name')).toHaveText('صورة الشيخ ناصر القطامي')
    await expect(q.locator('.sr-row-sub')).toHaveText('أيمن ذو الغنى، CC BY-SA 4.0، عبر ويكيميديا كومنز')
    await expect(s.locator('.sr-row-sub')).toHaveText("Prime Minister's Office (GODL-India)")
    await shot(page, 'sources-photos-ar', page.locator('.sr-group', { has: q }))
    await q.click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    const label = (l: string) => sheet.locator('.v2-src-row', { has: page.locator('dt', { hasText: new RegExp(`^${l}$`) }) })
    await expect(label(SOURCES_UI.ar.rowCredit).locator('dd')).toHaveText('أيمن ذو الغنى، CC BY-SA 4.0، عبر ويكيميديا كومنز')
    await expect(label(SOURCES_UI.ar.rowTake).locator('dd')).toHaveText('صورته في صفحة القرّاء وقسم الاستماع والإعدادات، مقصوصة إلى الرأس والكتفين ومفرّغة على خلفية بيضاء')
    await expect(label(SOURCES_UI.ar.rowLicence).getByRole('link', { name: SOURCES_UI.ar.licenceLink })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/')
    await expect(sheet.getByRole('link', { name: SOURCES_UI.ar.openSite })).toHaveAttribute('href', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    await shot(page, 'sources-sheet-alqatami-ar', sheet)
    await page.keyboard.press('Escape')
    await s.click()
    await expect(label(SOURCES_UI.ar.rowLicence).getByRole('link', { name: SOURCES_UI.ar.licenceLink })).toHaveAttribute('href', 'https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf')
    await expect(label(SOURCES_UI.ar.rowCredit).locator('dd')).toHaveText("Prime Minister's Office (GODL-India)")
  })
})

/** Answers the -apple-system-body probe as WebKit on an iPhone does, with the size in window.__bodyPx. */
async function phoneTextSize(page: Page, px: number) {
  await page.addInitScript((initial) => {
    const w = window as unknown as { __bodyPx: number }
    w.__bodyPx = initial
    const supports = CSS.supports.bind(CSS) as (a: string, b?: string) => boolean
    CSS.supports = ((a: string, b?: string) => (a === 'font' && b === '-apple-system-body') || supports(a, b)) as typeof CSS.supports
    const gcs = window.getComputedStyle.bind(window)
    window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
      const style = gcs(el, pseudo)
      if (el instanceof HTMLElement && el.dataset.textProbe !== undefined) return { ...style, fontSize: `${w.__bodyPx}px` } as CSSStyleDeclaration
      return style
    }) as typeof window.getComputedStyle
  }, px)
}
const rootPx = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
const setFont = (page: Page, fontSize: 'sm' | 'md' | 'lg') =>
  page.addInitScript((f) => {
    const k = 'imuslim.settings.v1'
    const s = JSON.parse(localStorage.getItem(k) ?? '{}')
    localStorage.setItem(k, JSON.stringify({ ...s, fontSize: f }))
  }, fontSize)

test.describe('§3 «حسب إعداد الجوال» is the phone\'s Text Size', () => {
  for (const [px, want] of [
    [17, 16], // the default: 100%
    [14, 16], // smaller than the default: not below 100%
    [19, 16 * (19 / 17)], // xLarge
    [23, 16 * 1.35], // xxxLarge: 135%
    [33, 16 * 1.35], // an accessibility size: held at 135%
  ] as const)
    test(`body ${px} px → root ${want.toFixed(2)} px`, async ({ page }) => {
      await phoneTextSize(page, px)
      await page.goto('/?lang=ar')
      await expect.poll(() => rootPx(page)).toBeCloseTo(want, 1)
    })

  test('read again when the app comes back to the front', async ({ page }) => {
    await phoneTextSize(page, 17)
    await page.goto('/?lang=ar')
    await expect.poll(() => rootPx(page)).toBeCloseTo(16, 1)
    await page.evaluate(() => {
      ;(window as unknown as { __bodyPx: number }).__bodyPx = 21
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect.poll(() => rootPx(page)).toBeCloseTo(16 * (21 / 17), 1)
  })

  test('«صغير» and «كبير» stay fixed steps, whatever the phone says', async ({ page }) => {
    await phoneTextSize(page, 23)
    await setFont(page, 'lg')
    await page.goto('/?lang=ar')
    await expect.poll(() => rootPx(page)).toBeCloseTo(19, 1)
    await setFont(page, 'sm')
    await page.goto('/?lang=en')
    await expect.poll(() => rootPx(page)).toBeCloseTo(15, 1)
  })

  test('a browser without the system style keeps its own root size (100%)', async ({ page }) => {
    await page.goto('/?lang=ar')
    await expect.poll(() => rootPx(page)).toBeCloseTo(16, 1)
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--phone-scale'))).toBe('1')
  })
})
