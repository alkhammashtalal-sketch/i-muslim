import { expect, test, type Page } from '@playwright/test'

// Reply 0045 ب (Talal: «شيله من تحت وحطه فوق في بين كلمة مسلم وبين الزر اللي في اليسار»): the language button sits in
// the header between «مسلم» and the settings, the language by its own name, short where it is long, never with an
// ellipsis; it opens the picker; the link at the bottom of the home page is gone. No overlap and nothing cut at 375,
// 393, 430 and 440 wide, in the ten interface languages and with the longest content names.
test.use({ serviceWorkers: 'block' })
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const WIDTHS = [375, 393, 430, 440]
const SELF: Record<string, string> = { ar: 'العربية', en: 'English', ur: 'اردو', id: 'Indonesia', ms: 'Melayu', tr: 'Türkçe', fr: 'Français', es: 'Español', bn: 'বাংলা', hi: 'हिन्दी' }

async function layout(page: Page) {
  return page.evaluate(() => {
    const box = (s: string) => {
      const r = document.querySelector(s)!.getBoundingClientRect()
      return { l: r.left, r: r.right, t: r.top, b: r.bottom }
    }
    const pill = document.querySelector('header .v2-lang-pill') as HTMLElement
    return { brand: box('header .v2-brand'), pill: box('header .v2-lang-pill'), actions: box('header .v2-actions'), vw: window.innerWidth, wide: pill.scrollWidth > pill.clientWidth + 1, ellipsis: getComputedStyle(pill).textOverflow === 'ellipsis' }
  })
}
const apart = (a: { l: number; r: number }, b: { l: number; r: number }) => a.r <= b.l + 0.5 || b.r <= a.l + 0.5

test('the language button: between «مسلم» and the settings, its own name, no overlap at 375–440 in ten languages', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'the widths are set here')
  for (const lang of LANGS) {
    await page.goto(`/?lang=${lang}`)
    await expect(page.locator('header .v2-lang-pill')).toHaveText(SELF[lang])
    await expect(page.locator('.home-links .lang-link')).toHaveCount(0)
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 })
      const l = await layout(page)
      expect(apart(l.brand, l.pill) && apart(l.pill, l.actions), `${lang} ${w}: overlap`).toBe(true)
      expect(l.pill.l >= 0 && l.pill.r <= l.vw && l.actions.l >= 0 && l.actions.r <= l.vw, `${lang} ${w}: off screen`).toBe(true)
      expect([l.wide, l.ellipsis], `${lang} ${w}: cut`).toEqual([false, false])
      // In the middle: the button's centre is between the other two, in both directions.
      const mid = (l.pill.l + l.pill.r) / 2
      expect(mid > Math.min(l.brand.r, l.actions.r) && mid < Math.max(l.brand.l, l.actions.l), `${lang} ${w}: not between`).toBe(true)
    }
  }
})

test('the longest content names fit too, and the button opens the picker', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'the widths are set here')
  for (const [content, name] of [['ku', 'کوردی'], ['vi', 'Tiếng Việt'], ['az', 'Azərbaycan'], ['ug', 'ئۇيغۇرچە'], ['as', 'অসমীয়া']] as const) {
    await page.addInitScript((c) => localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang: 'en', content: c })), content)
    await page.goto('/')
    await expect(page.locator('header .v2-lang-pill')).toHaveText(name)
    for (const w of [375, 440]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
      const l = await layout(page)
      expect(apart(l.brand, l.pill) && apart(l.pill, l.actions) && !l.wide, `${content} ${w} at 135%`).toBe(true)
    }
  }
  await page.locator('header .v2-lang-pill').click()
  await expect(page).toHaveURL(/\/language/)
})
