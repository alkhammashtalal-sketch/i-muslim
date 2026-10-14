import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { MAWAQIF } from '../src/v2/daily/mawaqif/strings-mawaqif'

// Reply 0060 on a preview of next (never the live link): the home card «أذكار» with the raised hands on gold, apart
// from the tile «الأذكار» (the book on light green) above it: another drawing and another ground. At 375 wide and 135%
// text, in the ten languages, the card whole and its icon's box 44 px. SHOTS=dir saves the two names together after the
// change, in Arabic and English (0060 §4).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0060-icon.spec.ts --workers=2
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

test('the card\'s icon is not the tile\'s: the hands on gold, the book on green', async ({ page }) => {
  await page.goto('/?lang=ar')
  const card = page.getByTestId('home-mawaqif')
  await card.scrollIntoViewIfNeeded()
  const tile = page.locator('.dt-tool', { has: page.locator('.dt-tool-label', { hasText: /^الأذكار$/ }) })
  const look = (sel: ReturnType<typeof page.locator>) =>
    sel.locator('.dt-tool-ic').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, d: [...el.querySelectorAll('path')].map((p) => p.getAttribute('d')).join(' ') }))
  const c = await look(card)
  const t = await look(tile)
  expect(c.bg).toBe('rgba(250, 226, 168, 0.95)')
  expect(t.bg).toBe('rgba(210, 236, 224, 0.95)')
  expect(c.d).not.toBe(t.d)
  expect(c.d).toContain('M7.5 20v-3.2L4.6 13')
  await expect(card.locator('[data-icon="hands"] svg')).toHaveAttribute('width', '22')
})

for (const lang of LANGS) {
  test(`${lang}: at 135% the card whole, its icon 44 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/?lang=${lang}`)
    await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
    const card = page.getByTestId('home-mawaqif')
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('b')).toHaveText(MAWAQIF[lang].title)
    const bad = await card.evaluate((root) => {
      const out: string[] = []
      const W = document.documentElement.clientWidth
      for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
        const r = el.getBoundingClientRect()
        if (r.width && (r.left < -1 || r.right > W + 1)) out.push(`${el.className || el.tagName} ${Math.round(r.left)}–${Math.round(r.right)}`)
      }
      const ic = root.querySelector('.dt-tool-ic')!.getBoundingClientRect()
      if (ic.width < 44 || ic.height < 44) out.push(`icon ${ic.width}×${ic.height}`)
      return out
    })
    expect(bad).toEqual([])
  })
}

test('the two names together after the change (0060 §4), Arabic and English, for the report', async ({ page }) => {
  for (const lang of ['ar', 'en'] as const) {
    await page.setViewportSize({ width: 393, height: 852 })
    await page.goto(`/?lang=${lang}`)
    await page.locator('.dt-today-grid').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('home-mawaqif').locator('[data-icon="hands"]')).toBeVisible()
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true })
      await page.waitForTimeout(800)
      await page.locator('section', { has: page.locator('.dt-today-grid') }).last().screenshot({ path: path.join(SHOTS, `both-names-home-${lang}.png`), animations: 'disabled' })
    }
  }
})
