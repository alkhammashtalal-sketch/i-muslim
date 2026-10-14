import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { openFolds } from './fold'
import { TOOLS } from '../src/v2/daily/strings-tools'

// «أذكار الصباح» and «أذكار المساء» (0048-add1 §ب, reviewed in add4 أ) on a preview of next (never the live link): two
// chips in place of one, the list the time asks for (Fajr to Asr the morning, by the computed times), the night's
// adhkar at the end of the evening under «من أذكار الليل», each list counting on its own, a link that names its list.
//   cd web && BASE_URL=… npx playwright test e2e/v2-0048-adhkar.spec.ts --project=mobile --workers=2
// SHOTS=dir saves both lists there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const at = async (page: Page, iso: string) => {
  await page.clock.setFixedTime(new Date(iso))
  await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
}
const chip = (page: Page, name: string) => page.locator('.tool-chip', { hasText: name })

test('two chips first; at 06:30 in Riyadh the morning list, at 16:30 the evening one', async ({ page }) => {
  await at(page, '2026-10-14T03:30:00Z') // 06:30 Riyadh: after Fajr, before Asr
  await page.goto('/today/adhkar?lang=ar')
  await openFolds(page)
  const chips = page.locator('.tool-chip')
  await expect(chips).toHaveCount(9)
  await expect(chips.nth(0)).toHaveText(TOOLS.ar.cat.morning)
  await expect(chips.nth(1)).toHaveText(TOOLS.ar.cat.evening)
  await expect(chip(page, TOOLS.ar.cat.morning)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-hadith="5508"]')).toBeVisible() // morning only
  await expect(page.locator('[data-hadith="66086"]')).toHaveCount(0) // evening only
  await expect(page.locator('[data-hadith="3008"] .tool-text mark')).toHaveCount(3) // its morning box is built from all three (0049-add1)
  await expect(page.getByTestId('night-adhkar')).toHaveCount(0)
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true })
    await page.screenshot({ path: path.join(SHOTS, 'morning-ar.png'), fullPage: true })
  }
})

test('the evening list: its own wording, the night\'s adhkar last under «من أذكار الليل»', async ({ page }) => {
  await at(page, '2026-10-14T13:30:00Z') // 16:30 Riyadh: after Asr
  await page.goto('/today/adhkar?lang=ar')
  await openFolds(page)
  await expect(chip(page, TOOLS.ar.cat.evening)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-hadith="5508"]')).toHaveCount(0)
  await expect(page.locator('[data-hadith="3008"] .tool-text mark')).toHaveCount(2)
  const head = page.getByTestId('night-adhkar')
  await expect(head).toHaveCount(1)
  await expect(head).toHaveText(TOOLS.ar.nightAdhkar)
  // The heading, then 6274, then 65260, the last cards of the list.
  const order = await page.locator('main [data-testid="night-adhkar"], main .tool-card').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.hadith ?? 'head'))
  expect(order.slice(-3)).toEqual(['head', '6274', '65260'])
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'evening-ar.png'), fullPage: true })
})

test('each list counts on its own; a link names its list (the widget\'s ?part=)', async ({ page }) => {
  await at(page, '2026-10-14T03:30:00Z')
  await page.goto('/today/adhkar?lang=ar&part=morning')
  const c = page.getByTestId('count-6093')
  await expect(c).toHaveText('٠/٣')
  await c.click()
  await expect(c).toHaveText('١/٣')
  await chip(page, TOOLS.ar.cat.evening).click()
  await expect(page.getByTestId('count-6093')).toHaveText('٠/٣')
  await page.goto('/today/adhkar?lang=ar&part=morning')
  await expect(page.getByTestId('count-6093')).toHaveText('١/٣')
  await page.goto('/today/adhkar?lang=en&part=evening')
  await expect(chip(page, TOOLS.en.cat.evening)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('night-adhkar')).toHaveText(TOOLS.en.nightAdhkar)
})
