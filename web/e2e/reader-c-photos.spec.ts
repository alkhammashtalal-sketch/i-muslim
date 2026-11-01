import path from 'node:path'
import { expect, test } from '@playwright/test'
import config from '../src/config/recitation.json' with { type: 'json' }
import sources from '../../data/sources.json' with { type: 'json' }
import { SOURCES_UI } from '../src/v2/sources/strings'
import { fakeRecitation } from './helpers/fake-recitation'

// Add-on 0072-add62 §3, agent (ج): a photo for every reciter that has a licensed one on Wikimedia Commons, credited
// word for word on «المصادر والشكر»; the others keep the initial. Runs on a plain web build (vite build + vite preview).
//   cd web && BASE_URL=http://localhost:5241 npx playwright test e2e/reader-c-photos.spec.ts --project=mobile
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS

/** The reads with a photo, by Talal's decisions (the first six) and from Commons (add-on 0072-add62 §3). */
const WITH_PHOTO = [86, 54, 123, 5, 92, 53, 9, 13, 30, 38, 39, 43, 55, 221, 258]
const NEW_ROWS = ['photo-nauina', 'photo-alzain', 'photo-alghamdi', 'photo-taher', 'photo-abdulhakam', 'photo-albudair', 'photo-alahmad', 'photo-alkurdi', 'photo-soufi']
type Src = { id: string; name: Record<string, string>; credit: Record<string, string>; licence: { url: string }; site: string }
const byId = (id: string) => (sources.sources as unknown as Src[]).find((s) => s.id === id)!

test('the reciters page: a photo for each reciter who has one, drawn in full; the initial for the rest', async ({ page }) => {
  await fakeRecitation(page)
  await page.goto('/quran/reciters?lang=ar')
  await expect(page.locator('.rd-reciter')).toHaveCount(config.reciters.length)
  const photos = page.locator('.rd-reciter .rd-avatar.has-photo')
  await expect(photos).toHaveCount(WITH_PHOTO.length)
  const reads = await photos.evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.photo)))
  expect(reads.sort((a, b) => a - b)).toEqual([...WITH_PHOTO].sort((a, b) => a - b))
  // Each image loaded at its full 336 px (no broken file), and hidden from screen readers (the name is beside it).
  for (const img of await photos.locator('img').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(336)
  }
  await expect(page.locator('.rd-reciter .rd-avatar[aria-hidden="true"]')).toHaveCount(config.reciters.length)
  // A reciter without a licensed photo keeps the initial of his name.
  const none = config.reciters.find((r) => !WITH_PHOTO.includes(r.read))!
  await expect(page.locator('.rd-reciter', { hasText: none.name.ar }).locator('.rd-avatar')).toHaveText(none.name.ar.trim().charAt(0))
  if (SHOTS) {
    const row = page.locator('.rd-reciter', { hasText: 'سعد الغامدي' })
    await row.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(SHOTS, 'c-reciters-ar.png') })
  }
})

for (const lang of ['ar', 'en'] as const) {
  test(`«المصادر والشكر» (${lang}): each new photo has its row, its author's credit word for word, and its sheet the licence and the file`, async ({ page }) => {
    await page.route('**/api/sources/status*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ checked_at: null, pending: [], meaning: null, mukhtasar: null }) }))
    await page.goto(`/sources?lang=${lang}`)
    for (const id of NEW_ROWS) {
      const row = page.locator(`[data-source=${id}]`)
      await expect(row.locator('.sr-row-name'), id).toHaveText(byId(id).name[lang])
      await expect(row.locator('.sr-row-sub'), id).toHaveText(byId(id).credit[lang])
    }
    const first = page.locator('[data-source=photo-nauina]')
    if (SHOTS) await page.locator('.sr-group', { has: first }).screenshot({ path: path.join(SHOTS, `c-sources-photos-${lang}.png`) })
    await page.locator('[data-source=photo-alghamdi]').click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    const label = (l: string) => sheet.locator('.v2-src-row', { has: page.locator('dt', { hasText: new RegExp(`^${l}$`) }) })
    await expect(label(SOURCES_UI[lang].rowCredit).locator('dd')).toHaveText(byId('photo-alghamdi').credit[lang])
    await expect(label(SOURCES_UI[lang].rowLicence).getByRole('link', { name: SOURCES_UI[lang].licenceLink })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/')
    await expect(sheet.getByRole('link', { name: SOURCES_UI[lang].openSite })).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Saad_al_Ghamdi.jpg')
    if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, `c-sources-sheet-${lang}.png`) })
  })
}
