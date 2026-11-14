import { expect, test, type Page } from '@playwright/test'
import { ABOUT, ABOUT_FEATURES } from '../src/components/about-strings'

// Reply 0072 §10: «عن التطبيق» names only what works in 1.1 (web/src/components/about-strings.ts), in the ten languages.
// In Arabic and English, at 390 and 320 px: the page renders with its list «ما في التطبيق» (in a browser, without the
// phone app's part), nothing in it runs past the screen's edge, and the English page says al-Mukhtasar is not in
// English. The eight machine-translated languages carry the badge «ترجمة آلية» under the title; Arabic and English do not.
//   BASE_URL=http://localhost:5173 npx playwright test e2e/v2-0072-about.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })

async function openAbout(page: Page, lang: string, width: number) {
  await page.setViewportSize({ width, height: 844 })
  await page.goto(`/?lang=${lang}#about`)
  await expect(page.locator('main#main h1')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

/** Elements inside the page whose box runs past the screen's left or right edge, and the page's horizontal scroll. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector('main#main')!
    const out = [...main.querySelectorAll<HTMLElement>('*')]
      .filter((e) => {
        const r = e.getBoundingClientRect()
        return r.width > 0 && (r.right > window.innerWidth + 0.5 || r.left < -0.5)
      })
      .map((e) => `${e.tagName.toLowerCase()}.${e.className}: ${(e.textContent ?? '').slice(0, 40)}`)
    return { out, scroll: document.documentElement.scrollWidth > window.innerWidth + 1 || main.scrollWidth > main.clientWidth + 1 }
  })

for (const width of [390, 320]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`«عن التطبيق» in ${lang} at ${width} px: what the app offers, whole and within the screen`, async ({ page }) => {
      await openAbout(page, lang, width)
      const a = ABOUT[lang]
      await expect(page.getByRole('heading', { level: 2, name: a.featuresTitle })).toBeVisible()
      const items = page.locator('[data-testid="about-features"] > div')
      // In a browser: every feature but the phone app's own (widgets, local alerts, the Quran inside the app).
      const shown = ABOUT_FEATURES.filter((k) => k !== 'app')
      await expect(items).toHaveCount(shown.length)
      for (const [i, k] of shown.entries()) {
        await expect(items.nth(i).locator('dt')).toHaveText(a.features[k].name)
        await expect(items.nth(i).locator('dd')).toHaveText(a.features[k].text)
      }
      await expect(page.locator('[data-feature="app"]')).toHaveCount(0)
      // Reviewed languages: no machine-translation badge on the page.
      await expect(page.locator('main#main .badge-mt')).toHaveCount(0)
      const text = (await page.locator('main#main').textContent()) ?? ''
      expect(text, 'no exclamation mark').not.toMatch(/[!！¡]/)
      if (lang === 'en') expect(text).toContain('Al-Mukhtasar is not available in English.')
      else expect(text).not.toContain('ولا يتوفر «المختصر»')
      // Every part of the page, scrolled through, stays within the screen.
      const scroller = page.locator('main#main')
      const total = await scroller.evaluate((e) => e.scrollHeight)
      for (let y = 0; y <= total; y += 600) {
        await scroller.evaluate((e, top) => e.scrollTo(0, top), y)
        const o = await overflow(page)
        expect(o.scroll, `${lang} ${width}: horizontal scroll at ${y}`).toBe(false)
        expect(o.out, `${lang} ${width}: past the edge at ${y}`).toEqual([])
      }
    })
  }
}

test('the eight machine-translated languages carry «ترجمة آلية» under the title', async ({ page }) => {
  await openAbout(page, 'ur', 390)
  await expect(page.locator('main#main .about-mt .badge-mt')).toHaveText('مشینی ترجمہ')
  await expect(page.locator('[data-testid="about-features"] > div')).toHaveCount(ABOUT_FEATURES.length - 1)
})
