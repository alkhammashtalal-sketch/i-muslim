import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { WELCOMED } from '../playwright.config'

// Reply 0071 §3, a prototype for Talal's word: the day's three cards on the home page, in this order: the date (B4's
// sky and shamsa cut at the painting's own gold separator, its own bottom frame closed under it), «آية اليوم», «حديث
// اليوم». Screenshots of the first screen and of the page down to the end of the day's card(s), in Arabic and English
// at 390 and 320 px, from either layout (SHOT=before on the unchanged build, SHOT=after on this one); then the checks
// of the three cards (the new layout only). The clock is noon in Riyadh on 22 October 2026: the ayah of the day is
// 2:255 (data/daily-ayat.json), the hadith of the day comes from the API the preview reads (v11, never next or live).
//   VITE_API_PROXY=https://i-muslim-v11.alkhammashtalal.workers.dev npx vite preview --port 4182
//   BASE_URL=http://127.0.0.1:4182 SHOTS=<dir> SHOT=after npx playwright test e2e/v2-0071-cards.spec.ts --project=mobile
test.use({ serviceWorkers: 'block' })
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')

const NOON = new Date('2026-10-22T09:00:00Z')
const AYAH = 'quran:2:255'
const SHOTS = process.env.SHOTS ?? ''
const SHOT = process.env.SHOT ?? 'after'
const HEIGHT: Record<number, number> = { 390: 844, 320: 568 }

const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

async function open(page: Page, lang: string, width: number) {
  await page.setViewportSize({ width, height: HEIGHT[width] ?? 844 })
  await page.clock.setFixedTime(NOON)
  await page.goto(`/?lang=${lang}&theme=light`)
  // Either layout: the one card (before) or the three (after).
  await expect(page.locator('.dc-ayah')).toBeVisible()
  await expect(page.locator('.dc-hadith')).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
    // The paintings, so that a screenshot does not catch them on their way.
    for (const u of ['/art/card-art-B4.webp', '/art/card-date-B4.webp']) {
      const i = new Image()
      i.src = u
      await i.decode().catch(() => undefined)
    }
  })
  await frames(page)
}

/** The page down to the end of the day's last card: the page scrolls inside .scroll, so the viewport is made as tall
 *  as that, and the shot is cut at the card's end. */
async function shootDown(page: Page, file: string) {
  const w = page.viewportSize()!.width
  const end = () => page.locator('.dc-hadith-card, article.day-card').last().evaluate((el) => el.getBoundingClientRect().bottom + document.querySelector('.scroll')!.scrollTop)
  await page.setViewportSize({ width: w, height: Math.ceil(await end()) + 200 })
  await frames(page)
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: Math.ceil(await end()) + 14 } })
  await page.setViewportSize({ width: w, height: HEIGHT[w] ?? 844 })
}

for (const lang of ['ar', 'en'] as const) {
  for (const width of [390, 320]) {
    test(`${SHOT}: the home page's first screen and the day's card(s), ${lang} at ${width} px`, async ({ page }) => {
      test.skip(!SHOTS, 'SHOTS not given')
      fs.mkdirSync(SHOTS, { recursive: true })
      await open(page, lang, width)
      await page.screenshot({ path: path.join(SHOTS, `${SHOT}-${lang}-${width}.png`) })
      await shootDown(page, path.join(SHOTS, `${SHOT}-${lang}-${width}-full.png`))
    })
  }
}

// ---------- The new layout's checks ----------

/** WCAG contrast of every text in the cards against what is under it (the paper, composed with any translucent
 *  background on the way), and the size that makes it large text. */
const contrasts = (page: Page) =>
  page.evaluate(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const [r, g, b, a = '1'] = m[1].split(/[ ,/]+/).filter(Boolean)
      return [Number(r), Number(g), Number(b), Number(a)]
    }
    const lin = (v: number) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const over = (top: number[], under: number[]) => [0, 1, 2].map((k) => top[k] * top[3] + under[k] * (1 - top[3])).concat(1)
    const under = (el: Element): number[] => {
      const layers: number[][] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      let bg = [255, 255, 255, 1]
      for (const l of layers.reverse()) bg = over(l, bg)
      return bg
    }
    const out: { text: string; ratio: number; need: number }[] = []
    for (const card of document.querySelectorAll('.dc-card')) {
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? '').trim()
        const el = n.parentElement
        if (!text || !el || !el.getClientRects().length) continue
        const cs = getComputedStyle(el)
        const fg = parse(cs.color)!
        const bg = under(el)
        const f = over(fg, bg)
        const [hi, lo] = [lum(f), lum(bg)].sort((x, y) => y - x)
        const size = parseFloat(cs.fontSize)
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
        out.push({ text: text.slice(0, 24), ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100, need: large ? 3 : 4.5 })
      }
    }
    return out
  })

/** The corner texts of the date card against the sky under them: the painting drawn on a canvas, the text's box mapped
 *  into its pixels; the contrast against the brightest pixel and against the 95th percentile. */
const skyContrast = (page: Page) =>
  page.evaluate(async () => {
    const card = document.querySelector<HTMLElement>('.day-date')!
    const img = new Image()
    img.src = '/art/card-date-B4.webp'
    await img.decode()
    const cv = document.createElement('canvas')
    cv.width = img.naturalWidth
    cv.height = img.naturalHeight
    const g = cv.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0)
    const c = card.getBoundingClientRect()
    const lin = (v: number) => {
      const x = v / 255
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    }
    const lum = (r: number, gg: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b)
    return [...card.querySelectorAll<HTMLElement>('.dd-corner')].map((el) => {
      const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g)!.map(Number)
      const fg = lum(m[0], m[1], m[2])
      // The glyphs' own box (a Range), not the element's line box.
      const range = document.createRange()
      range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      const sx = img.naturalWidth / c.width
      const sy = img.naturalHeight / c.height
      const x0 = Math.floor((r.left - c.left) * sx)
      const y0 = Math.floor((r.top - c.top) * sy)
      const w = Math.ceil(r.width * sx)
      const h = Math.ceil(r.height * sy)
      const px = g.getImageData(x0, y0, w, h).data
      const ls: number[] = []
      for (let k = 0; k < px.length; k += 4) ls.push(lum(px[k], px[k + 1], px[k + 2]))
      ls.sort((a, b) => a - b)
      const ratio = (bg: number) => Math.round(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)) * 100) / 100
      return { text: el.textContent, box: [x0, y0, w, h], worst: ratio(ls[ls.length - 1]), p95: ratio(ls[Math.floor(ls.length * 0.95)]), median: ratio(ls[Math.floor(ls.length / 2)]) }
    })
  })

test.describe('reply 0071 §3: the day in three cards (the prototype)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'ar', 390)
    test.skip((await page.locator('.day-date').count()) === 0, 'the unchanged layout')
  })

  test('three cards in this order: the date, «آية اليوم», «حديث اليوم»; then the daily grid and the sections', async ({ page }) => {
    const boxes = await page.evaluate(() =>
      ['.ask-card', '.day-date', '.dc-ayah-card', '.dc-hadith-card', '.home-sections'].map((q) => document.querySelector(q)?.getBoundingClientRect().top ?? NaN),
    )
    for (let k = 1; k < boxes.length; k++) expect(boxes[k], `order ${k}`).toBeGreaterThan(boxes[k - 1])
    await expect(page.locator('.dc-ayah-card .dc-title')).toHaveText('آية اليوم')
    await expect(page.locator('.dc-hadith-card .dc-title')).toHaveText('حديث اليوم')
    await expect(page.locator('article.day-card')).toHaveCount(0)
    // Each card is an article named by its title (the date card by its date).
    await expect(page.getByRole('article', { name: 'آية اليوم' })).toBeVisible()
    await expect(page.getByRole('article', { name: 'حديث اليوم' })).toBeVisible()
    await expect(page.locator('.day-date')).toHaveAttribute('aria-label', /^التاريخ، الخميس · .+هـ · ٢٢ أكتوبر ٢٠٢٦$/)
  })

  test('the date card: B4 cut at its own separator, lossless 1200 × 865, at its own aspect ratio; the Hijri date on the shamsa, the Gregorian in the corners', async ({ page }) => {
    const card = page.locator('.day-date')
    expect(await card.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('/art/card-date-B4.webp')
    const res = await page.request.get('/art/card-date-B4.webp')
    const body = await res.body()
    // RIFF … WEBP, and the lossless bitstream (VP8L), not the lossy one (VP8 ).
    expect(body.subarray(0, 4).toString('latin1')).toBe('RIFF')
    expect(body.subarray(8, 12).toString('latin1')).toBe('WEBP')
    expect(body.includes(Buffer.from('VP8L'))).toBe(true)
    expect(body.includes(Buffer.from('VP8 '))).toBe(false)
    const size = await page.evaluate(async () => {
      const i = new Image()
      i.src = '/art/card-date-B4.webp'
      await i.decode()
      const b = document.querySelector('.day-date')!.getBoundingClientRect()
      return { w: i.naturalWidth, h: i.naturalHeight, ratio: b.width / b.height }
    })
    expect([size.w, size.h]).toEqual([1200, 865])
    expect(Math.abs(size.ratio - 1200 / 865)).toBeLessThan(0.01)
    await expect(card.locator('.dc-disc .dc-month')).toBeVisible()
    await expect(card.locator('.dc-year')).toContainText('هـ')
    await expect(card.locator('.dd-start')).toHaveText('الخميس')
    await expect(card.locator('.dd-end')).toHaveText('٢٢ أكتوبر ٢٠٢٦')
  })

  test('the ayah card: the ayah whole, the largest text in its card; its links and its two buttons as before', async ({ page }) => {
    const want = ((await (await page.request.get(`/api/passage/${AYAH}`)).json()) as { text: string }).text
    const card = page.locator('.dc-ayah-card')
    const r = await card.evaluate((el) => {
      const a = el.querySelector<HTMLElement>('.dc-ayah')!
      const others = [...el.querySelectorAll<HTMLElement>('.dc-title, .dc-ref, .dc-pill-in')].map((e) => parseFloat(getComputedStyle(e).fontSize))
      return {
        clamp: getComputedStyle(a).webkitLineClamp,
        clipped: a.scrollHeight - a.clientHeight,
        cardClipped: el.scrollHeight - el.clientHeight,
        text: a.textContent ?? '',
        size: parseFloat(getComputedStyle(a).fontSize),
        others,
      }
    })
    expect(r.clamp).toBe('none')
    expect(r.clipped).toBeLessThanOrEqual(0)
    expect(r.cardClipped).toBeLessThanOrEqual(0)
    expect(r.text.startsWith(want.trimEnd())).toBe(true)
    for (const o of r.others) expect(r.size).toBeGreaterThan(o)
    await expect(card.locator('.dc-ref')).toHaveText('البقرة · ٢٥٥ · مدنية')
    await expect(card.locator('a.dc-zone')).toHaveAttribute('href', '/quran/2/255')
    await expect(card.locator('.dc-pills button')).toHaveText(['استمع', 'التفسير'])
  })

  test('the hadith card: its grade badge and attribution as before, its link to the hadith page', async ({ page }) => {
    const today = (await (await page.request.get('/api/today?lang=ar')).json()) as { hadith: { ar: { id: string; grade: string; attribution: string } } | null }
    test.skip(!today.hadith, 'no hadith of the day in this database')
    const zone = page.locator('.dc-hadith-card a.dc-hadith')
    await expect(zone).toHaveAttribute('href', `/hadith/${today.hadith!.ar.id}`)
    await expect(zone.locator('.grade-badge')).toContainText(today.hadith!.ar.grade)
    await expect(zone).toContainText(today.hadith!.ar.attribution)
  })

  test('AA contrast for every text: the paper cards, and the corner dates against the sky under them', async ({ page }) => {
    const low = (await contrasts(page)).filter((x) => x.ratio < x.need)
    expect(low).toEqual([])
    const sky = await skyContrast(page)
    console.log('sky', JSON.stringify(sky))
    for (const s of sky) expect(s.p95, `${s.text}`).toBeGreaterThanOrEqual(4.5)
  })

  // Add-on 0071-add16 §5 (Team B §6): the corner dates stay in the sky's gold-free corners while the year's longest
  // weekday and date fit there (the long form, else the short one), else both go on one line under the card; the full
  // matrix of widths, text sizes and languages is e2e/v2-0071-sky.spec.ts T7.
  test('the Gregorian date on one line: the long form in Arabic at 390, the short one in English; under the card at 320', async ({ page }) => {
    const lines = () => page.locator('.dd-end').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
    await expect(page.locator('.day-date')).toHaveAttribute('data-corners', 'long')
    expect(await lines()).toBe(1)
    await open(page, 'en', 390)
    await expect(page.locator('.day-date')).toHaveAttribute('data-corners', 'short')
    await expect(page.locator('.dd-end')).toHaveText('Oct 22, 2026')
    expect(await lines()).toBe(1)
    await open(page, 'en', 320)
    await expect(page.locator('.day-date')).toHaveAttribute('data-corners', 'under')
    await expect(page.locator('.dd-corner')).toHaveCount(0)
    await expect(page.locator('.dd-under')).toHaveText('Thursday · October 22, 2026')
  })

  test('320 px, and 130% text: nothing scrolls sideways; the corner dates are in the sky or on one line under the card', async ({ page }) => {
    for (const [lang, scale] of [['ar', '100%'], ['ar', '130%'], ['en', '100%'], ['en', '130%']]) {
      await open(page, lang, 320)
      await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
      await frames(page)
      await frames(page)
      const r = await page.evaluate(() => {
        const c = document.querySelector('.day-date')!.getBoundingClientRect()
        // The sky inside the frame, in the card's box: x 84–1116 and y 76–786 of the 1200 × 865 image.
        const sky = { l: c.left + (84 / 1200) * c.width, r: c.left + (1116 / 1200) * c.width, t: c.top + (76 / 865) * c.height, b: c.top + (786 / 865) * c.height }
        const corners = [...document.querySelectorAll<HTMLElement>('.day-date .dd-corner')].map((el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          const b = range.getBoundingClientRect()
          return b.left >= sky.l - 0.5 && b.right <= sky.r + 0.5 && b.top >= sky.t - 0.5 && b.bottom <= sky.b + 0.5
        })
        const under = document.querySelector<HTMLElement>('.dd-under')
        const u = under?.getBoundingClientRect()
        const s = document.querySelector<HTMLElement>('.scroll')!
        return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, scroll: s.scrollWidth - s.clientWidth, corners, under: u ? u.left >= 0 && u.right <= innerWidth && u.top >= c.bottom : null }
      })
      expect(r.page, `${lang} ${scale}`).toBeLessThanOrEqual(0)
      expect(r.scroll, `${lang} ${scale}`).toBeLessThanOrEqual(0)
      if (r.under === null) expect(r.corners, `${lang} ${scale}`).toEqual([true, true])
      else expect([r.corners, r.under], `${lang} ${scale}`).toEqual([[], true])
    }
  })

  test('a card whose text did not arrive is not shown; the date card stays', async ({ page }) => {
    await page.route('**/api/today*', (r) => r.abort())
    await page.goto('/?lang=ar&theme=light')
    await expect(page.locator('.dc-ayah-card')).toBeVisible()
    await expect(page.locator('.dc-hadith-card')).toHaveCount(0)
    await expect(page.locator('.day-date')).toBeVisible()
    await page.unroute('**/api/today*')
    await page.route('**/api/passage/**', (r) => r.abort())
    await page.goto('/?lang=en&theme=light')
    await expect(page.locator('.dc-hadith-card')).toBeVisible()
    await expect(page.locator('.dc-ayah-card')).toHaveCount(0)
    await expect(page.locator('.day-date')).toBeVisible()
  })

  test('a phone set to dark: the cards keep the painting\'s paper colours (the app is day-only, reply 0043-add7)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await open(page, 'ar', 390)
    const bg = await page.evaluate(() => ['.dc-ayah-card', '.dc-hadith-card'].map((q) => getComputedStyle(document.querySelector(q)!).backgroundColor))
    expect(bg).toEqual(['rgb(238, 229, 207)', 'rgb(238, 229, 207)'])
  })

  test('the ayah close up (two lines never touch): a 4× shot of the ayah at 390 and 320 px', async ({ browser }) => {
    test.skip(!SHOTS, 'SHOTS not given')
    for (const width of [390, 320]) {
      const ctx = await browser.newContext({ deviceScaleFactor: 4, viewport: { width, height: HEIGHT[width] }, storageState: WELCOMED, serviceWorkers: 'block', locale: 'ar' })
      const page = await ctx.newPage()
      await open(page, 'ar', width)
      // A viewport tall enough that the floating tab bar is below the ayah.
      await page.setViewportSize({ width, height: 1800 })
      await frames(page)
      await page.locator('.dc-ayah-card .dc-ayah').screenshot({ path: path.join(SHOTS, `check-ayah-${width}.png`) })
      await ctx.close()
    }
  })
})
