import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { namesRoute } from './names-stub'

// The name card's sky (add-on 0072-add53, Talal's word of 31 October): the painting's starless lapis drawn once as cover
// (/art/sky-lapis.png, never tiled, so no seam), and over it small sharp gold stars drawn in code (sky-stars.ts), none
// cut at an edge, none on the shamsa, the line or the listen button; no hard-edged box behind the text. Increased
// contrast keeps its behaviour: the sky plain, no stars.
//   npm run build:native && npx vite preview --port <p> & BASE_URL=http://localhost:<p> npx playwright test v2-0072-sky-stars --project=mobile
// Review pictures (SHOTS_DIR): the header on the name's page (the home's card is the same component), by day and by night, Arabic and English, at
// the iPhone 16 Pro Max, the SE and a desktop width; and with BEFORE_SKY=<old sky-stars.png> the same with the old tile.
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? ''
const BEFORE = process.env.BEFORE_SKY ?? ''
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const at = (n: number, hhmm = '10:00') => new Date(Date.parse(`2026-10-22T${hhmm}:00+03:00`) + (n - 1) * 86_400_000)

async function open(page: Page, url: string, n: number, time: string, before = false) {
  await namesRoute(page, { enriched: true })
  await page.addInitScript((place) => {
    localStorage.setItem('muslim.welcome.v1', '1')
    localStorage.setItem('muslim.place.v1', JSON.stringify(place))
  }, RIYADH)
  if (before) {
    // The old sky, for the review's «before»: the 230 × 235 tile at 180 px, no code stars.
    await page.route('**/art/sky-stars.png', (r) => r.fulfill({ body: fs.readFileSync(BEFORE), contentType: 'image/png' }))
  }
  await page.clock.setFixedTime(at(n, time))
  await page.goto(url)
  const card = page.getByTestId('name-day').first()
  await expect(card).toHaveAttribute('data-n', String(n))
  // (By the CSS object model: the page's policy refuses a style element.)
  if (before)
    await card.evaluate((c) => {
      const h = c.querySelector<HTMLElement>('.nc-head')!
      h.style.setProperty('background', "#162d5b url('/art/sky-stars.png') center / 180px", 'important')
      c.querySelector<SVGElement>('.nc-stars')?.style.setProperty('display', 'none', 'important')
    })
  await page.evaluate(() => document.fonts.ready)
  await card.locator('.nc-shamsa-art').evaluate((img: HTMLImageElement) => (img.complete ? null : new Promise((r) => (img.onload = r))))
  await page.waitForTimeout(250)
  return card
}

type Box = { x: number; y: number; w: number; h: number }
/** The header's box, the stars (centre and radius) and the boxes they must keep out of, in the header's own pixels. */
async function geometry(head: Locator) {
  return head.evaluate((h) => {
    const b = h.getBoundingClientRect()
    const rel = (e: Element) => {
      const r = e.getBoundingClientRect()
      return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }
    }
    // Each star's radius from its outline (its first point is the top ray's tip, r above the centre), not from the
    // heart, whose share of the radius is a look that may change (add-on 0072-add55).
    const tips = (h.querySelector('.nc-stars path')?.getAttribute('d') ?? '').split('M').filter(Boolean).map((p) => Number(p.split(/[ L]/)[1]))
    const stars = [...h.querySelectorAll('.nc-stars circle')].map((c, i) => {
      const y = Number(c.getAttribute('cy'))
      return { x: Number(c.getAttribute('cx')), y, r: y - tips[i] }
    })
    const text = [...h.querySelectorAll('.nc-line, .nc-listen')].map(rel).filter((x) => x.w > 0 && x.h > 0)
    return { w: b.width, h: b.height, stars, text, shamsa: rel(h.querySelector('.nc-shamsa')!) }
  })
}

function checkStars(g: Awaited<ReturnType<typeof geometry>>) {
  expect(g.stars.length).toBeGreaterThan(2)
  for (const s of g.stars) {
    // Whole inside, 12 px in from every edge (past the gold frame at 6 + 3 px).
    expect(s.x - s.r).toBeGreaterThanOrEqual(12 - 0.01)
    expect(s.y - s.r).toBeGreaterThanOrEqual(12 - 0.01)
    expect(g.w - s.x - s.r).toBeGreaterThanOrEqual(12 - 0.01)
    expect(g.h - s.y - s.r).toBeGreaterThanOrEqual(12 - 0.01)
    for (const t of g.text as Box[]) {
      const inside = s.x > t.x - s.r && s.x < t.x + t.w + s.r && s.y > t.y - s.r && s.y < t.y + t.h + s.r
      expect(inside, 'a star on the line or the listen button').toBe(false)
    }
    const c = g.shamsa
    const dx = (s.x - (c.x + c.w / 2)) / (c.w / 2 + s.r)
    const dy = (s.y - (c.y + c.h / 2)) / (c.h / 2 + s.r)
    expect(dx * dx + dy * dy, 'a star on the shamsa').toBeGreaterThanOrEqual(1)
  }
}

// The name's page (the home's card is the same component and CSS; on a preview with no server the home shows no card).
const CASES = [
  ['page', '/today/name/2?lang=ar&theme=light', 'ar'],
  ['page-en', '/today/name/2?lang=en&theme=light', 'en'],
] as const

for (const [label, url] of CASES)
  test(`${label}: the painting's lapis once as cover, the stars whole and off the text`, async ({ page }) => {
    const card = await open(page, url, 2, '10:00')
    const head = card.locator('.nc-head')
    const bg = await head.evaluate((h) => {
      const s = getComputedStyle(h)
      return { image: s.backgroundImage, size: s.backgroundSize, repeat: s.backgroundRepeat }
    })
    expect(bg.image).toContain('/art/sky-lapis.png')
    expect(bg.size).toBe('cover')
    expect(bg.repeat).toBe('no-repeat')
    checkStars(await geometry(head))
    // No box with a fill of its own behind the line or the listen button: their backgrounds are see-through.
    const fills = await head.locator('.nc-line, .nc-listen, .nc-line *').evaluateAll((xs) => xs.map((x) => getComputedStyle(x).backgroundColor))
    for (const f of fills) expect(f).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })

test('a wide card (desktop width): the same rules', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const card = await open(page, '/today/name/2?lang=ar&theme=light', 2, '10:00')
  checkStars(await geometry(card.locator('.nc-head')))
})

test('night: the night painting over the same sky, the stars above it', async ({ page }) => {
  const card = await open(page, '/today/name/2?lang=ar&theme=light', 2, '21:30')
  await expect(card).toHaveAttribute('data-night', 'true')
  checkStars(await geometry(card.locator('.nc-head')))
})

test('increased contrast: the sky plain, no stars (as before)', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' })
  const card = await open(page, '/today/name/2?lang=ar&theme=light', 2, '10:00')
  const head = card.locator('.nc-head')
  expect(await head.evaluate((h) => getComputedStyle(h).backgroundImage)).toBe('none')
  await expect(head.locator('.nc-stars')).toBeHidden()
})

// The review pictures (only with SHOTS_DIR).
const SHOTS_CASES = [
  ['promax', 440, 956, 3],
  ['se', 375, 667, 2],
  ['desktop', 1440, 900, 1],
] as const
for (const [dev, width, height, scale] of SHOTS_CASES)
  test.describe(`shots on ${dev}`, () => {
    test.skip(!SHOTS, 'SHOTS_DIR not given')
    test.use({ viewport: { width, height }, deviceScaleFactor: scale })
    for (const when of ['after', 'before'] as const)
      for (const [label, url, time] of [
        ['day', '/today/name/2?lang=ar&theme=light', '10:00'],
        ['night', '/today/name/2?lang=ar&theme=light', '21:30'],
        ['en', '/today/name/2?lang=en&theme=light', '10:00'],
      ] as const)
        test(`${when} ${label}`, async ({ page }) => {
          test.skip(when === 'before' && !BEFORE, 'BEFORE_SKY not given')
          const card = await open(page, url, 2, time, when === 'before')
          const head = card.locator('.nc-head')
          await head.scrollIntoViewIfNeeded()
          fs.mkdirSync(SHOTS, { recursive: true })
          await head.screenshot({ path: path.join(SHOTS, `card-${label}-${dev}-${when}.png`), animations: 'disabled' })
        })
  })
