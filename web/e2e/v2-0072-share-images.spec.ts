import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import salaf from '../../data/salaf-daily.json' with { type: 'json' }
import { DATA, namesRoute } from './names-stub'

// Add-on 0072-add10 §3: the share images of «اسم الله لليوم» and «من أقوال السلف», on the ayah's share sheet, and the
// widgets' links that open them directly: imuslim://today/name/<n>/share → /today/name/<n>/share, and
// imuslim://today/salaf/<n>/share → /today/salaf/<n>/share. Each image in its four forms (story 1080×1920 and square
// 1080×1080, by day and by night). The names routes from this branch's data where the server has none yet
// (e2e/names-stub.ts); with `readings: false` as on next, where NAMES_READINGS is off: the image never carries them.
//   BASE_URL=http://localhost:5173 npx playwright test v2-0072-share-images --project=mobile
// IMAGES=<dir> saves the images (name-<n>-<shape>-<look>.png, salaf-<n>-…).
test.use({ serviceWorkers: 'block' })
const IMAGES = process.env.IMAGES ?? ''
const NAMES_EPOCH = Date.parse(`${DATA.epoch}T09:00:00Z`)
const nameDay = (n: number) => new Date(NAMES_EPOCH + (n - 1) * 86_400_000)
const salafDay = (n: number) => {
  const k = salaf.cards.findIndex((c) => c.n === n)
  return new Date(Date.parse(`${salaf.epoch}T09:00:00Z`) + k * 86_400_000)
}

/** The image now in the sheet, as a PNG, with its size. */
async function current(page: Page, id: string) {
  const img = page.getByTestId(id)
  await expect(img).toBeVisible()
  return img.evaluate((x: HTMLImageElement) => ({ src: x.src, w: x.naturalWidth, h: x.naturalHeight, shape: x.dataset.shape, look: x.dataset.look }))
}

async function fourForms(page: Page, id: string, base: string) {
  const sheet = page.getByRole('dialog')
  const got: Record<string, { w: number; h: number }> = {}
  for (const shape of ['story', 'square'] as const) {
    await sheet.getByRole('tab', { name: shape === 'story' ? 'قصة' : 'مربع' }).or(sheet.getByRole('button', { name: shape === 'story' ? 'قصة' : 'مربع' })).first().click()
    for (const look of ['day', 'night'] as const) {
      await sheet.getByRole('tab', { name: look === 'day' ? 'نهار' : 'ليل' }).or(sheet.getByRole('button', { name: look === 'day' ? 'نهار' : 'ليل' })).first().click()
      await expect(page.getByTestId(id)).toHaveAttribute('data-shape', shape)
      await expect(page.getByTestId(id)).toHaveAttribute('data-look', look)
      const x = await current(page, id)
      got[`${shape}-${look}`] = { w: x.w, h: x.h }
      if (IMAGES) {
        fs.mkdirSync(IMAGES, { recursive: true })
        fs.writeFileSync(path.join(IMAGES, `${base}-${shape}-${look}.png`), Buffer.from(x.src.split(',')[1], 'base64'))
      }
    }
  }
  expect(got).toEqual({ 'story-day': { w: 1080, h: 1920 }, 'story-night': { w: 1080, h: 1920 }, 'square-day': { w: 1080, h: 1080 }, 'square-night': { w: 1080, h: 1080 } })
}

test.describe('«اسم الله لليوم» as an image', () => {
  for (const readings of [true, false]) {
    test(`the widget's link opens the image directly, in its four forms (readings ${readings ? 'on, as v11' : 'off, as next'})`, async ({ page }) => {
      const n = 2 // الحفيظ, its evidence an ayah
      await namesRoute(page, { readings })
      await page.clock.setFixedTime(nameDay(n))
      await page.goto(`/today/name/${n}/share?lang=ar&theme=light`)
      await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', String(n))
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog')).toContainText('شارك الاسم صورة')
      await fourForms(page, 'name-share-image', `name-${n}${readings ? '' : '-next'}`)
      // Closing it leaves the name's page at its own address.
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL(new RegExp(`/today/name/${n}(\\?|$)`))
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })
  }

  test('the name’s page has «شارك», which opens the same sheet', async ({ page }) => {
    await namesRoute(page)
    await page.clock.setFixedTime(nameDay(1))
    await page.goto('/today/name/1?lang=ar&theme=light')
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '1')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByTestId('name-share').click()
    const x = await current(page, 'name-share-image')
    expect([x.w, x.h]).toEqual([1080, 1920])
  })

  test('an entry with no ayah shares its hadith; a pair of names fits the shamsa (story and square)', async ({ page }) => {
    const pair = DATA.entries.find((e) => e.name.includes(' ') && !e.ayah)!
    await namesRoute(page)
    await page.clock.setFixedTime(nameDay(pair.n))
    await page.goto(`/today/name/${pair.n}/share?lang=ar&theme=light`)
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', String(pair.n))
    await fourForms(page, 'name-share-image', `name-${pair.n}`)
  })

  test('in English the image is the same Arabic one; the sheet speaks English', async ({ page }) => {
    await namesRoute(page)
    await page.clock.setFixedTime(nameDay(2))
    await page.goto('/today/name/2/share?lang=en&theme=light')
    await expect(page.getByRole('dialog')).toContainText('Share the name as an image')
    const x = await current(page, 'name-share-image')
    expect([x.w, x.h]).toEqual([1080, 1920])
    if (IMAGES) fs.writeFileSync(path.join(IMAGES, 'name-2-story-day-en-sheet.png'), await page.getByRole('dialog').screenshot())
  })
})

test.describe('«من أقوال السلف» as an image', () => {
  for (const n of [1, 8, 23]) {
    test(`the widget's link /today/salaf/${n}/share opens the saying with its image, in its four forms`, async ({ page }) => {
      await page.clock.setFixedTime(salafDay(n))
      await page.goto(`/today/salaf/${n}/share?lang=ar&theme=light`)
      await expect(page.getByTestId('salaf-page').getByTestId('salaf-day')).toHaveAttribute('data-n', String(n))
      await expect(page.getByRole('dialog')).toContainText('شارك القول صورة')
      await fourForms(page, 'salaf-share-image', `salaf-${n}`)
    })
  }

  test('the home card has «شارك»', async ({ page }) => {
    await page.clock.setFixedTime(salafDay(8))
    await page.goto('/?lang=ar&theme=light')
    const card = page.getByTestId('salaf-day')
    await expect(card).toHaveAttribute('data-n', '8')
    const btn = card.getByTestId('salaf-share')
    expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await btn.click()
    const x = await current(page, 'salaf-share-image')
    expect([x.w, x.h]).toEqual([1080, 1920])
  })
})

// Add-on 0072-add23 §4.6–§4.7: the image's Hijri date takes the user's offset from the settings (with the global one),
// and outside Arabic the saying stays Arabic with «النص بالعربية» above it, in the interface's language.
test.describe('add-on 0072-add23 §4', () => {
  test('the image’s Hijri date follows the user’s offset', async ({ page }) => {
    await page.route('**/config/hijri.json', (r) => r.fulfill({ json: { offset: 0 } }))
    await page.clock.setFixedTime(salafDay(8))
    const src: string[] = []
    for (const k of [0, 1]) {
      await page.goto('/?lang=ar&theme=light')
      await page.evaluate((v) => localStorage.setItem('muslim.hijri.offset.v1', String(v)), k)
      await page.goto(`/today/salaf/8/share?lang=ar&theme=light`)
      src.push((await current(page, 'salaf-share-image')).src)
      if (IMAGES) fs.writeFileSync(path.join(IMAGES, `salaf-8-story-day-offset${k}.png`), Buffer.from(src.at(-1)!.split(',')[1], 'base64'))
    }
    expect(src[0]).not.toBe(src[1])
  })

  test('in English the saying stays Arabic, «Text in Arabic» above it, on the page and in the image', async ({ page }) => {
    await page.clock.setFixedTime(salafDay(8))
    await page.goto('/today/salaf/8/share?lang=en&theme=light')
    await expect(page.getByTestId('salaf-in-arabic')).toHaveText('Text in Arabic')
    await expect(page.getByTestId('salaf-page').getByTestId('salaf-day')).toHaveAttribute('lang', 'ar')
    const x = await current(page, 'salaf-share-image')
    expect([x.w, x.h]).toEqual([1080, 1920])
    if (IMAGES) fs.writeFileSync(path.join(IMAGES, 'salaf-8-story-day-en.png'), Buffer.from(x.src.split(',')[1], 'base64'))
    await page.goto('/today/salaf/8/share?lang=ar&theme=light')
    await expect(page.getByTestId('salaf-page')).toBeVisible()
    await expect(page.getByTestId('salaf-in-arabic')).toHaveCount(0)
  })

  test('in English the name’s image carries «Text in Arabic» above its evidence', async ({ page }) => {
    await namesRoute(page)
    await page.clock.setFixedTime(nameDay(2))
    await page.goto('/today/name/2/share?lang=en&theme=light')
    const en = await current(page, 'name-share-image')
    if (IMAGES) fs.writeFileSync(path.join(IMAGES, 'name-2-story-day-en.png'), Buffer.from(en.src.split(',')[1], 'base64'))
    await page.goto('/today/name/2/share?lang=ar&theme=light')
    const ar = await current(page, 'name-share-image')
    expect(en.src).not.toBe(ar.src)
  })
})
