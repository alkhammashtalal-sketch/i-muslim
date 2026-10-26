import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import { check } from './fit-check'

// Reply 0045 ج (Talal: «بعض اللغوات كذا كأنها مقصوصة … مع اني استعمل ايفون برو ماكس»): every screen, sheet and the
// settings, in the ten languages, at 375, 393, 430 and 440 wide, with the text at 100%, 115%, 135%, 165% and 200% (the
// app follows the phone's text size through rem, up to 200% for Apple's «Larger Text» label: add-on 0072-add34 §ب3). Each screen loads at each text size from the start, as on a phone set that way
// (the day card fits its text when it loads); the width then changes on the same page, and each state is checked.
// An error is:
//   - text wider than its box: a line of the element's own text runs past the element's edge (measured on the text
//     itself, so a decoration that overflows on purpose does not count), where the box does not scroll on purpose;
//   - text cut with an ellipsis (text-overflow);
//   - text cut at the bottom by a box that hides its overflow;
//   - an element out of its card or sheet, or out of the screen;
//   - a control cut by an ancestor that hides its overflow.
// Cut on purpose, and so not errors (each one shown whole one press away):
//   - the day card's hadith (.dc-hadith-text): a part of it, the whole text on its page (DayCard.tsx, board B4);
//   - a long explanation on the hadith page (.hd-ex.is-cut): folded under «الشرح كاملًا» (HadithPage.tsx, LONG).
//   FIT_SHOTS=dir also saves a picture of each finding's element.
//   SWEEP_LANGS=ar,en narrows the languages (the full sweep is the default); FIT_SCALES=200% narrows the text sizes.
//   FIT_SWEEP=1 BASE_URL=… npx playwright test e2e/v2-fit-sweep.spec.ts --project=mobile --workers=2   (before each build)
test.use({ serviceWorkers: 'block' })
test.describe.configure({ mode: 'parallel' })
const LANGS = (process.env.SWEEP_LANGS ?? 'ar,en,ur,id,ms,tr,fr,es,bn,hi').split(',')
const WIDTHS = [375, 393, 430, 440]
const SCALES = (process.env.FIT_SCALES ?? '100%,115%,135%,165%,200%').split(',')
const RIYADH = {
  lat: 24.6877,
  lng: 46.7219,
  timeZone: 'Asia/Riyadh',
  name: 'الرياض',
  source: 'city',
}
const SHOTS = process.env.FIT_SHOTS

type Screen = {
  name: string
  url: string
  open?: (page: Page) => Promise<void>
}
const SCREENS: Screen[] = [
  { name: 'home', url: '/' },
  {
    name: 'settings',
    url: '/',
    open: async (p) => p.locator('header .v2-actions button[aria-haspopup="dialog"]').last().click(),
  },
  {
    name: 'starter-sheet',
    url: '/',
    open: async (p) =>
      p
        .locator('.home-starter, [class*="starter"] button, button:has-text("ابدأ")')
        .first()
        .click({ timeout: 3000 })
        .catch(() => {}),
  },
  {
    name: 'answer',
    url: '/',
    open: async (p) => {
      await p.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
      await p.locator('button.send:visible').click()
      await p.locator('.turn article.card .v2-tbox').first().waitFor({ timeout: 15000 })
    },
  },
  { name: 'language', url: '/language' },
  { name: 'library', url: '/quran' },
  { name: 'sura', url: '/quran/2' },
  { name: 'ayah', url: '/quran/2/255' },
  { name: 'reciters', url: '/quran/reciters' },
  { name: 'ward', url: '/quran/ward' },
  { name: 'saved', url: '/quran/saved' },
  { name: 'hadith', url: '/hadith/5503' },
  { name: 'today', url: '/today' },
  { name: 'times', url: '/today/times' },
  { name: 'qibla', url: '/today/qibla' },
  { name: 'adhkar', url: '/today/adhkar' },
  // 0049-add2: the two lists folded (above) and open, every card at once.
  {
    name: 'adhkar-open',
    url: '/today/adhkar?part=morning',
    open: async (p) => {
      const closed = p.locator('.dhikr-more[aria-expanded="false"]')
      await p.locator('.dhikr-more').first().waitFor({ timeout: 8000 })
      for (let n = await closed.count(); n > 0; n = await closed.count()) await closed.first().evaluate((b) => (b as HTMLButtonElement).click())
    },
  },
  { name: 'adhkar-evening', url: '/today/adhkar?part=evening' },
  // 0050: «أذكار المواقف» (shown here with the tests' preview of the draft table) and the adhkar page's new section.
  { name: 'mawaqif', url: '/mawaqif' },
  { name: 'mawaqif-travel', url: '/mawaqif/travel?step=dua' },
  { name: 'mawaqif-sleep', url: '/mawaqif/sleep' },
  { name: 'mawaqif-auto', url: '/mawaqif/auto' },
  { name: 'adhkar-travel', url: '/today/adhkar?part=travel' },
  { name: 'tasbih', url: '/today/tasbih' },
  { name: 'calendar', url: '/today/calendar' },
  { name: 'mosques', url: '/today/mosques' },
  { name: 'names', url: '/today/names' },
  { name: 'goals', url: '/today/goals' },
  { name: 'sources', url: '/sources' },
  { name: 'about', url: '/#about' },
  { name: 'starter', url: '/start/salah' },
]

for (const lang of LANGS) {
  test(`fit (0045 ج): ${lang}, every screen at 375–440 wide and 100–200% text`, async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'one project: the widths are set here')
    // About 40 minutes for the ten languages: run before each build (FIT_SWEEP=1), not in every full run (reply 0043-add4).
    test.skip(!process.env.FIT_SWEEP, 'FIT_SWEEP=1 runs the sweep')
    test.setTimeout(1_800_000)
    await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
    // «أذكار المواقف» is a draft until reviewed (0050): the sweep sees it through the tests' preview flag.
    await page.addInitScript(() => ((globalThis as { __mawaqifPreview?: boolean }).__mawaqifPreview = true))
    await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
    await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
    await page.route('**/api/mosques**', (r) =>
      r.fulfill({
        json: {
          cell: '24.69,46.72',
          mosques: [
            {
              id: 'node/1',
              name: 'جامع الإمام تركي بن عبدالله',
              lat: 24.6312,
              lng: 46.7135,
            },
            {
              id: 'node/2',
              name: null,
              street: 'طريق الملك فهد',
              lat: 24.69,
              lng: 46.723,
            },
          ],
          attribution: { text: '© OpenStreetMap contributors' },
        },
      }),
    )
    const found: string[] = []
    const seen = new Set<string>()
    // The text size from the start of each load, as on a phone set that way.
    // (Before the page's <html> exists document.documentElement is null, so the size is set as soon as it appears.)
    await page.addInitScript(() => {
      const x = sessionStorage.getItem('fit.scale')
      const apply = () => {
        if (!document.documentElement) return false
        document.documentElement.style.setProperty('font-size', x, 'important')
        return true
      }
      if (x && !apply()) {
        const mo = new MutationObserver(() => apply() && mo.disconnect())
        mo.observe(document, { childList: true, subtree: true })
      }
    })
    await page.goto('/sources?lang=' + lang).catch(() => {})
    try {
      // FIT_SCREENS=a,b runs those screens only (a change to a few pages; the whole sweep before a build).
      for (const s of SCREENS.filter((x) => !process.env.FIT_SCREENS || process.env.FIT_SCREENS.split(',').includes(x.name)))
        for (const scale of SCALES) {
          await page.setViewportSize({ width: 393, height: 852 })
          await page.evaluate((x) => sessionStorage.setItem('fit.scale', x), scale)
          // A new document each time (fit=…): the same address with a #hash would only move within the page, and keep
          // the size of the load before.
          const q = `lang=${lang}&fit=${scale.replace('%', '')}`
          await page
            .goto(s.url.includes('#') ? s.url.replace('#', `?${q}#`) : `${s.url}${s.url.includes('?') ? '&' : '?'}${q}`, { waitUntil: 'networkidle' })
            .catch(() => {})
          await page.evaluate(() => document.fonts.ready)
          expect(await page.evaluate(() => document.documentElement.style.fontSize), `${s.name}: the text size applied`).toBe(scale)
          if (s.open) await s.open(page).catch(() => {})
          await page.waitForTimeout(400)
          for (const w of WIDTHS) {
            await page.setViewportSize({ width: w, height: 900 })
            await page.waitForTimeout(120)
            for (const f of await page.evaluate(check)) {
              found.push(`${s.name} ${w} ${scale}: ${f}`)
              // One picture per distinct finding (the same element across widths and sizes counts once).
              const key = `${s.name}|${f.replace(/-?\d+(\.\d+)?/g, '#')}`
              if (SHOTS && !seen.has(key)) {
                seen.add(key)
                await page
                  .screenshot({
                    path: path.join(SHOTS, `${lang}-${s.name}-${w}-${scale.replace('%', '')}-${seen.size}.png`),
                  })
                  .catch(() => {})
              }
            }
          }
        }
    } finally {
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, `findings-${lang}.txt`), found.join('\n'))
    }
    expect(found, found.slice(0, 40).join('\n')).toEqual([])
  })
}
