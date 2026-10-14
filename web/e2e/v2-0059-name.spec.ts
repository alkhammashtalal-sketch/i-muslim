import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { MAWAQIF } from '../src/v2/daily/mawaqif/strings-mawaqif'

// Reply 0059 on a preview of next (never the live link): «أذكار المواقف» named «أذكار», as its widget, in the ten
// languages. At 375 wide and 135% text, the home card, the page's title and its back button are whole: nothing wider
// than the screen, nothing cut, the back button 44 px or more. SHOTS=dir saves the home where «أذكار» and «الأذكار»
// both show, in Arabic and English (0059 §2).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0059-name.spec.ts --workers=2
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

const cut = ({ root, selectors }: { root: string; selectors: string[] }) => {
  const out: string[] = []
  const W = document.documentElement.clientWidth
  for (const sel of selectors)
    for (const el of document.querySelectorAll<HTMLElement>(`${root} ${sel}`.trim())) {
      const r = el.getBoundingClientRect()
      if (r.width && (r.left < -1 || r.right > W + 1)) out.push(`${sel} ${Math.round(r.left)}–${Math.round(r.right)}`)
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push(`cut ${sel}`)
    }
  return out
}

for (const lang of LANGS) {
  test(`${lang}: «${MAWAQIF[lang].title}» at 135%: the home card, the page title, the back button whole`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?lang=${lang}`)
    await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
    const card = page.getByTestId('home-mawaqif')
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('b')).toHaveText(MAWAQIF[lang].title)
    expect(await page.evaluate(cut, { root: '[data-testid="home-mawaqif"]', selectors: ['b', '.dt-mawaqif-text', '.dt-mawaqif-text span'] })).toEqual([])
    expect(await page.evaluate(cut, { root: '', selectors: ['[data-testid="home-mawaqif"]'] })).toEqual([])
    await page.goto(`/mawaqif?lang=${lang}`)
    await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
    await expect(page.locator('.dt-head h1')).toHaveText(MAWAQIF[lang].title)
    expect(await page.evaluate(cut, { root: '.dt-head', selectors: ['h1', 'button'] })).toEqual([])
    const back = (await page.locator('.dt-head button').boundingBox())!
    expect(back.width).toBeGreaterThanOrEqual(44)
    expect(back.height).toBeGreaterThanOrEqual(44)
  })
}

test('the home where «أذكار» and «الأذكار» both show (0059 §2), Arabic and English, for the report', async ({ page }) => {
  for (const lang of ['ar', 'en'] as const) {
    await page.setViewportSize({ width: 393, height: 852 })
    await page.goto(`/?lang=${lang}`)
    const grid = page.locator('.dt-today-grid')
    await grid.scrollIntoViewIfNeeded()
    await expect(page.getByTestId('home-mawaqif').locator('b')).toHaveText(MAWAQIF[lang].title)
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true })
      await page.waitForTimeout(800)
      // The «يومك» section: the tile «الأذكار» and, under the tiles, the card «أذكار».
      await page.locator('section', { has: page.locator('.dt-today-grid') }).last().screenshot({ path: path.join(SHOTS, `both-names-home-${lang}.png`), animations: 'disabled' })
    }
  }
})
