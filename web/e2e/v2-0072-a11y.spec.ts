import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import { check } from './fit-check'

// Accessibility of the common tasks (add-on 0072-add34 §ب3, Apple's Accessibility Nutrition Labels; the report and the
// labels to declare in relay/w1/0072-a11y/README.md). In Arabic and English, on each common task's screen:
//   A1 every control a screen reader reaches has a name, and every aria-labelledby/-describedby names ids that exist
//      (VoiceOver: «concise, accurate labels»; the text-size group had none: its id had a space);
//   A2 text on a plain background reads 4.5:1 (3:1 when large), computed from the styles (the painted sky and the date
//      card are measured on their pixels by e2e/v2-0071-sky.spec.ts);
//   A3 with reduced motion, nothing moves after the page settles (no animation running, none that repeats);
//   A4 the calendar is a plain grid of buttons, each named with its weekday, and «fasting» when it has the dot;
//   A5 at 200% text (Apple's «Larger Text»; the phone's Text Size reaches it at AX3, src/text-size.ts) nothing is cut,
//      wider than its box, or off the screen, with the checks of the fit sweep (e2e/fit-check.ts), at 375 and 430.
// The whole sweep at every width and in the ten languages: FIT_SWEEP=1 e2e/v2-fit-sweep.spec.ts (100%–200%).
//   BASE_URL=http://localhost:<port> npx playwright test e2e/v2-0072-a11y.spec.ts --project=mobile
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.use({ serviceWorkers: 'block' })

const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
type Screen = { name: string; url: string; ready: string; open?: (p: Page) => Promise<void> }
const SCREENS: Screen[] = [
  { name: 'today', url: '/', ready: '.day-date' },
  {
    name: 'settings',
    url: '/',
    ready: '.day-date',
    open: async (p) => {
      await p.locator('header .v2-actions button[aria-haspopup="dialog"]').last().click()
      await p.locator('dialog[open] .segmented').waitFor()
    },
  },
  {
    name: 'answer',
    url: '/',
    ready: '#q',
    open: async (p) => {
      await p.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
      await p.locator('button.send:visible').click()
      await p.locator('.turn article.card .v2-tbox').first().waitFor({ timeout: 15000 })
    },
  },
  { name: 'library', url: '/quran', ready: 'main' },
  { name: 'sura', url: '/quran/2', ready: '.ayah-num' },
  {
    name: 'ayah-sheet',
    url: '/quran/2',
    ready: '.ayah-num',
    open: async (p) => {
      await p.locator('.ayah-num').nth(4).click()
      await p.locator('dialog.sheet[open]').waitFor()
    },
  },
  { name: 'times', url: '/today/times', ready: '.dt-time' },
  { name: 'adhkar', url: '/today/adhkar?part=morning', ready: 'main' },
  { name: 'tasbih', url: '/today/tasbih', ready: 'main' },
  { name: 'calendar', url: '/today/calendar', ready: '.dt-cal-day' },
  { name: 'starter', url: '/start/salah', ready: '.ss-ask' },
  { name: 'share', url: '/today/name/2/share', ready: 'dialog[open]' },
]

async function load(page: Page, s: Screen, lang: string) {
  await page.addInitScript(
    ([p, l]) => {
      localStorage.setItem('muslim.place.v1', JSON.stringify(p))
      localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang: l, content: l, fontSize: 'md', simple: false }))
    },
    [RIYADH, lang] as const,
  )
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  await page.goto(`${s.url}${s.url.includes('?') ? '&' : '?'}lang=${lang}`)
  await page.locator(s.ready).first().waitFor({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  if (s.open) await s.open(page)
  await page.waitForTimeout(500)
}

/** A1, in the page: controls without a name, and aria references to ids that are not there. */
function names(): string[] {
  const out: string[] = []
  const root = document.querySelector('dialog[open]') ?? document.body
  const hidden = (e: Element) => {
    for (let a: Element | null = e; a; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden' || a.getAttribute('aria-hidden') === 'true' || (a as HTMLElement).inert) return true
    }
    return false
  }
  const short = (e: Element) => `${e.tagName.toLowerCase()}.${typeof e.className === 'string' ? e.className.split(/\s+/)[0] : ''} ${e.outerHTML.slice(0, 90)}`
  for (const e of root.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
    for (const attr of ['aria-labelledby', 'aria-describedby']) {
      const v = e.getAttribute(attr)
      if (v === null) continue
      for (const id of v.split(/\s+/).filter(Boolean)) if (!document.getElementById(id)) out.push(`${attr} → missing #${id}: ${short(e)}`)
    }
  }
  const sel = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="link"], [role="switch"], [role="radio"], [role="tab"], [role="checkbox"], [role="slider"], [role="img"], img:not([alt=""])'
  for (const e of root.querySelectorAll(sel)) {
    if (hidden(e)) continue
    const r = e.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const by = (e.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .join('')
    const lbl = (e as HTMLInputElement).labels ? [...((e as HTMLInputElement).labels ?? [])].map((l) => l.textContent?.trim()).join('') : ''
    const imgAlt = [...e.querySelectorAll('img[alt]')].map((i) => i.getAttribute('alt')).join('')
    const name = [e.getAttribute('aria-label'), by, lbl, e.textContent?.trim(), e.getAttribute('title'), e.getAttribute('alt'), imgAlt, (e as HTMLInputElement).placeholder].find((x) => x && x.trim())
    if (!name) out.push(`no name: ${short(e)}`)
  }
  return out
}

/** A2, in the page: the contrast of each text against the first opaque background behind it, where that is a plain colour. */
function contrast(): string[] {
  const out: string[] = []
  const rgba = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number)
  const lum = (c: number[]) => {
    const v = c.slice(0, 3).map((x) => {
      x /= 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  const over = (fg: number[], bg: number[]) => {
    const a = fg[3] ?? 1
    return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a))
  }
  const root = document.querySelector('dialog[open]') ?? document.body
  for (const e of root.querySelectorAll('*')) {
    if (e.closest('svg, .sr-only, canvas')) continue
    if (![...e.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent ?? ''))) continue
    const r = e.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const cs = getComputedStyle(e)
    if (cs.visibility === 'hidden' || e.closest('[aria-hidden="true"]')) continue
    // The background: the first ancestor with an opaque colour; a picture or gradient on the way leaves it to the pixel specs.
    let bg: number[] | null = null
    let opacity = 1
    let painted = false
    for (let a: Element | null = e; a; a = a.parentElement) {
      const acs = getComputedStyle(a)
      opacity *= parseFloat(acs.opacity)
      if (acs.backgroundImage !== 'none' || acs.backdropFilter !== 'none') {
        painted = true
        break
      }
      const c = rgba(acs.backgroundColor)
      if ((c[3] ?? 1) >= 0.99) {
        bg = c
        break
      }
      if ((c[3] ?? 1) > 0 && a === document.documentElement) bg = c
    }
    if (painted || opacity < 0.1) continue
    bg ??= [255, 255, 255]
    const fg = rgba(cs.color)
    if (opacity < 1) fg[3] = (fg[3] ?? 1) * opacity
    const f = over(fg, bg)
    const ratio = (Math.max(lum(f), lum(bg)) + 0.05) / (Math.min(lum(f), lum(bg)) + 0.05)
    const px = parseFloat(cs.fontSize)
    const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700)
    if (ratio < (large ? 3 : 4.5) - 0.005)
      out.push(`${ratio.toFixed(2)} ${cs.color} on rgb(${bg.slice(0, 3).join(',')}) ${e.tagName.toLowerCase()}.${typeof e.className === 'string' ? e.className.split(/\s+/)[0] : ''} «${(e.textContent ?? '').trim().slice(0, 30)}»`)
  }
  return out
}

for (const lang of ['ar', 'en'])
  test.describe(`a11y ${lang}`, () => {
    test.skip(({ isMobile }) => !isMobile, 'one phone: the screens are the same')
    for (const s of SCREENS)
      test(`A1–A2 ${s.name}: names, references and contrast`, async ({ page }) => {
        await load(page, s, lang)
        expect(await page.evaluate(names), 'A1').toEqual([])
        expect(await page.evaluate(contrast), 'A2').toEqual([])
      })

    test('A3: with reduced motion nothing keeps moving', async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: new URL(process.env.BASE_URL!).origin, localStorage: [{ name: 'muslim.welcome.v1', value: '1' }] }] } })
      const page = await ctx.newPage()
      for (const s of SCREENS) {
        await load(page, s, lang)
        await page.waitForTimeout(400)
        const moving = await page.evaluate(() =>
          document
            .getAnimations()
            .filter((a) => a.playState === 'running' && ((a.effect?.getComputedTiming().iterations ?? 1) === Infinity || (a as CSSAnimation).animationName))
            .map((a) => `${(a as CSSAnimation).animationName ?? 'js'} on ${((a.effect as KeyframeEffect | null)?.target as Element | null)?.className}`),
        )
        expect(moving, `${s.name}: running animations`).toEqual([])
      }
      await ctx.close()
    })

    test('A4: the calendar is a grid of named buttons, with the weekday and the fasting days', async ({ page }) => {
      await load(page, SCREENS.find((x) => x.name === 'calendar')!, lang)
      await expect(page.locator('[role="grid"], [role="columnheader"]')).toHaveCount(0)
      const labels = await page.locator('.dt-cal-day').evaluateAll((els) => els.map((e) => [e.getAttribute('aria-label') ?? '', e.querySelector('.dt-cal-dot') ? 1 : 0] as const))
      expect(labels.length).toBeGreaterThanOrEqual(28)
      const week = lang === 'ar' ? /^(الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)، / : /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), /
      for (const [l] of labels) expect(l).toMatch(week)
      const fasting = lang === 'ar' ? 'أيام يُستحب صيامها' : 'Days on which fasting is recommended'
      for (const [l, dot] of labels) expect(l.endsWith(fasting), l).toBe(dot === 1)
      expect(labels.some(([, dot]) => dot === 1)).toBe(true)
    })

    test('A5: at 200% text nothing is cut or off the screen, at 375 and 430 wide', async ({ page }) => {
      test.setTimeout(240_000)
      await page.addInitScript(() => {
        const apply = () => (document.documentElement ? (document.documentElement.style.setProperty('font-size', '200%', 'important'), true) : false)
        if (!apply()) {
          const mo = new MutationObserver(() => apply() && mo.disconnect())
          mo.observe(document, { childList: true, subtree: true })
        }
      })
      const found: string[] = []
      for (const s of SCREENS) {
        await page.setViewportSize({ width: 390, height: 844 })
        await load(page, s, lang)
        for (const w of [375, 430]) {
          await page.setViewportSize({ width: w, height: 900 })
          await page.waitForTimeout(150)
          for (const f of await page.evaluate(check)) found.push(`${s.name} ${w}: ${f}`)
        }
      }
      expect(found, found.slice(0, 30).join('\n')).toEqual([])
    })
  })
