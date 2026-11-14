import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { TODAY } from '../src/v2/daily/strings-today'

// The sky with the time of day (add-on 0071-add16), Team B's page tests (relay/w1/0071-market/sky-review/sky-teamB.md):
//   T3 the line and the sky change in the same frame, one write of data-sky;  T4 the fade, none with reduced motion, none
//   on the first paint or a return;  T5 the edges on the page;  T6 the contrast gate (worst pixel, every text over the
//   painting, six states and mid-fade, 390/375/320, 2x and 3x);  T7 the corner dates' layout matrix (four widths, four
//   text sizes, ten languages, the year's longest weekday and date);  T8 the painting untouched outside the sky and in
//   the disc;  T9 the settings that take the layer away;  T12 the accessibility tree the same at every time.
// Riyadh, 22 October 2026: Fajr 04:36, sunrise 05:54, Dhuhr 11:38, Asr 14:54, Maghrib 17:20, Isha 18:50.
//   BASE_URL=http://localhost:8853 [SKY_SHOTS=<dir>] npx playwright test e2e/v2-0071-sky.spec.ts --project=mobile
// bypassCSP: the contrast gates hide the corners and the disc with a style tag of the test's own, which next's CSP (style-src 'self')
// blocks; the page under test is unchanged.
test.use({ serviceWorkers: 'block', timezoneId: 'Asia/Riyadh', bypassCSP: true })
test.skip(({ isMobile }) => !isMobile, 'phone widths: the mobile project')

const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const SIX = [
  ['night', '21:30'],
  ['fajr', '05:05'],
  ['morning', '08:00'],
  ['dhuhr', '12:15'],
  ['asr', '15:45'],
  ['maghrib', '17:40'],
] as const
const at = (hhmm: string, d = 22) => new Date(`2026-10-${d}T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}+03:00`)
const SHOTS = process.env.SKY_SHOTS ?? ''
// Contexts made here (browser.newContext) do not take the config's baseURL.
const BASE = process.env.BASE_URL ?? ''
const HEIGHT: Record<number, number> = { 320: 568, 375: 812, 390: 844, 430: 932 }
const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
/** With the clock paused, animation frames wait too: settle through MessageChannel (React renders through it, and the
 *  clock does not hold it), a few rounds. */
const settle = (page: Page) =>
  page.evaluate(async () => {
    for (let i = 0; i < 4; i++)
      await new Promise<void>((r) => {
        const c = new MessageChannel()
        c.port1.onmessage = () => r()
        c.port2.postMessage(0)
      })
  })

async function setup(page: Page, o: { place?: object | null; prefs?: object } = {}) {
  await page.addInitScript(
    ([place, prefs]) => {
      localStorage.setItem('muslim.welcome.v1', '1')
      if (place) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
      else localStorage.removeItem('muslim.place.v1')
      if (prefs) localStorage.setItem('muslim.prayer.v1', JSON.stringify(prefs))
    },
    [o.place === undefined ? RIYADH : o.place, o.prefs ?? null] as const,
  )
}
async function open(page: Page, lang: string, width = 390, scale = '') {
  await page.setViewportSize({ width, height: HEIGHT[width] ?? 844 })
  await page.goto(`${BASE}/?lang=${lang}&theme=light`)
  await expect(page.locator('.day-date .dc-day')).toBeVisible()
  if (scale) await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
  await page.evaluate(async () => {
    await document.fonts.ready
    for (const u of ['/art/card-date-B4.webp', '/art/sky-lapis-mask.png', '/art/sky-gold-mask.png']) {
      const i = new Image()
      i.src = u
      await i.decode().catch(() => undefined)
    }
  })
  await page.locator('.day-date').evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await frames(page)
  await frames(page)
}
const layers = (page: Page) =>
  page.locator('.day-date .sky-l').evaluateAll((els) =>
    els.map((e) => {
      const cs = getComputedStyle(e)
      return { sky: (e as HTMLElement).dataset.sky, cls: e.className.replace(/sky-l sky-\w+ ?/, ''), anim: cs.animationName, dur: cs.animationDuration, shown: cs.display !== 'none' }
    }),
  )
const pill = (page: Page) => page.locator('.dt-nextline-main').textContent()

// ── Pixels ──
const lumOf = ([r, g, b]: number[]) => {
  const c = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}
const ratio = (a: number[], b: number[]) => (Math.max(lumOf(a), lumOf(b)) + 0.05) / (Math.min(lumOf(a), lumOf(b)) + 0.05)
async function pixels(page: Page, png: Buffer) {
  const d = await page.context().newPage()
  const r = await d.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    return { w: c.width, h: c.height, px: Array.from(g.getImageData(0, 0, c.width, c.height).data) }
  }, png.toString('base64'))
  await d.close()
  return r
}
type Box = { x: number; y: number; width: number; height: number }
/** The worst contrast and the 5th percentile of a colour against every pixel of a box of the page: the device pixels
 *  wholly inside the box (a clip is rounded outwards, which would take in a row of the painting beyond it). */
async function worst(page: Page, box: Box, colour: number[]) {
  const dpr = await page.evaluate(() => devicePixelRatio)
  const x0 = Math.ceil(box.x * dpr) / dpr
  const y0 = Math.ceil(box.y * dpr) / dpr
  const x1 = Math.floor((box.x + box.width) * dpr) / dpr
  const y1 = Math.floor((box.y + box.height) * dpr) / dpr
  const { px } = await pixels(page, await page.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }))
  const rs: number[] = []
  for (let i = 0; i < px.length; i += 4) rs.push(ratio(colour, [px[i], px[i + 1], px[i + 2]]))
  rs.sort((a, b) => a - b)
  return { min: rs[0], p5: rs[Math.floor(rs.length * 0.05)] }
}
/** The corner regions M1 and M2 on both sides (Team B §6), and the shamsa's box, in page pixels. */
async function regions(page: Page) {
  return page.locator('.day-date').evaluate((e) => {
    const c = e.getBoundingClientRect()
    const S = { x: c.left + (83 / 1200) * c.width, y: c.top + (75 / 865) * c.height, w: (1034 / 1200) * c.width, h: (711 / 865) * c.height }
    const out: Record<string, { x: number; y: number; width: number; height: number }> = {}
    for (const [name, bw, bh] of [
      ['M1', 0.246, 0.13],
      ['M2', 0.308, 0.092],
    ] as const) {
      const y1 = S.y + S.h - 0.073 * S.h
      out[`${name}-left`] = { x: S.x + 0.017 * S.w, y: y1 - bh * S.h, width: bw * S.w, height: bh * S.h }
      out[`${name}-right`] = { x: S.x + S.w - 0.017 * S.w - bw * S.w, y: y1 - bh * S.h, width: bw * S.w, height: bh * S.h }
    }
    const r = (246 / 1200) * c.width
    out.shamsa = { x: c.left + (599 / 1200) * c.width - r, y: c.top + (430 / 865) * c.height - r, width: 2 * r, height: 2 * r }
    return out
  })
}
const HIDE_CORNERS = '.day-date .dd-corner { color: transparent !important; text-shadow: none !important; }'
const HIDE_DISC = '.day-date .dc-disc span { color: transparent !important; }'
const CORNER_INK = [0xf4, 0xec, 0xd8]

/** T6 on the page as it is now: the corner regions and texts, and the disc's three texts. */
async function contrastGate(page: Page, label: string) {
  const out: Record<string, { min: number; p5: number }> = {}
  const texts = await page.locator('.day-date .dd-corner').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  const disc: Record<string, Box & { ink: number[] }> = {}
  for (const sel of ['.dc-day', '.dc-month', '.dc-year']) {
    const e = page.locator(`.day-date ${sel}`)
    disc[sel] = { ...(await e.boundingBox())!, ink: await e.evaluate((x) => getComputedStyle(x).color.match(/\d+/g)!.slice(0, 3).map(Number)) }
  }
  const reg = await regions(page)
  const tag = await page.addStyleTag({ content: HIDE_CORNERS + HIDE_DISC })
  await settle(page)
  for (const [k, b] of Object.entries(reg)) if (k !== 'shamsa') out[k] = await worst(page, b, CORNER_INK)
  for (const [i, b] of texts.entries()) out[`text-${i}`] = await worst(page, { x: b.x, y: b.y, width: b.width, height: b.height }, CORNER_INK)
  for (const [sel, b] of Object.entries(disc)) out[sel] = await worst(page, b, b.ink)
  await tag.evaluate((t) => t.remove())
  for (const [k, v] of Object.entries(out)) expect(v.min, `${label} ${k}: the worst pixel`).toBeGreaterThanOrEqual(k === '.dc-day' ? 3 : 4.5)
  return out
}

// ── T3 ──
test('T3: at Asr the line shows Maghrib and the sky turns Asr in the same frame; data-sky is written once', async ({ page }) => {
  await setup(page)
  // The clock runs after install: open a minute early, then hold it a second before the bound.
  await page.clock.install({ time: at('14:53') })
  await open(page, 'ar')
  await page.clock.pauseAt(at('14:53:59'))
  await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'dhuhr')
  expect(await pill(page)).toContain(TODAY.ar.prayers.asr)
  await page.evaluate(() => {
    const w = window as unknown as { skyWrites: { sky: string | undefined; line: string | null }[] }
    w.skyWrites = []
    const card = document.querySelector('.day-date') as HTMLElement
    new MutationObserver(() => w.skyWrites.push({ sky: card.dataset.sky, line: document.querySelector('.dt-nextline-main')!.textContent })).observe(card, { attributes: true, attributeFilter: ['data-sky'] })
  })
  for (let i = 0; i < 20; i++) {
    await page.clock.runFor(100)
    await settle(page)
  }
  const writes = await page.evaluate(() => (window as unknown as { skyWrites: unknown[] }).skyWrites)
  expect(writes).toEqual([{ sky: 'asr', line: expect.stringContaining(TODAY.ar.prayers.maghrib) }])
  // Thirty minutes more: the line's pulse runs, the sky is not written again.
  await page.clock.runFor(30 * 60_000)
  expect(await page.evaluate(() => (window as unknown as { skyWrites: unknown[] }).skyWrites)).toHaveLength(1)
})

// ── T4 ──
test('T4: a bound crossed in view fades in 200 ms; none on the first paint, none on a return', async ({ page }) => {
  await setup(page)
  await page.clock.install({ time: at('17:19') })
  await open(page, 'ar')
  await page.clock.pauseAt(at('17:19:59'))
  // The first paint: no fade.
  expect((await layers(page)).every((l) => l.sky === 'asr' && l.anim === 'none' && l.cls === '')).toBe(true)
  // Just past the bound (the old layers leave 400 ms after it, on the same clock).
  await page.clock.runFor(1100)
  await settle(page)
  const l = await layers(page)
  expect(l.filter((x) => x.cls.includes('is-leaving')).map((x) => [x.sky, x.anim, x.dur])).toEqual(Array(4).fill(['asr', 'sky-out', '0.2s']))
  expect(l.filter((x) => x.cls.includes('is-entering')).map((x) => [x.sky, x.anim, x.dur])).toEqual(Array(4).fill(['maghrib', 'sky-in', '0.2s']))
  await page.clock.runFor(1000)
  await settle(page)
  expect(await layers(page)).toEqual(Array(4).fill({ sky: 'maghrib', cls: '', anim: 'none', dur: '0s', shown: true }))
})

test('T4: with «reduce motion» the sky changes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await setup(page)
  await page.clock.install({ time: at('17:19') })
  await open(page, 'ar')
  await page.clock.pauseAt(at('17:19:58'))
  await page.clock.runFor(3000)
  await settle(page)
  expect((await layers(page)).filter((x) => x.shown)).toEqual(Array(4).fill({ sky: 'maghrib', cls: '', anim: 'none', dur: '0s', shown: true }))
})

// ── T5 ──
test('T5: back after ten hours in the background: morning at once, no fade', async ({ page }) => {
  await setup(page)
  await page.clock.install({ time: at('21:30') })
  await open(page, 'ar')
  await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'night')
  await page.clock.fastForward('10:00:00')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await frames(page)
  await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'morning')
  expect(await layers(page)).toEqual(Array(4).fill({ sky: 'morning', cls: '', anim: 'none', dur: '0s', shown: true }))
  expect(await pill(page)).toContain(TODAY.ar.prayers.dhuhr)
})

test('T5: midnight is no bound; the place’s zone, not the device’s; no place, no sky; a Hanafi Asr', async ({ browser }) => {
  // Midnight: the night stays, nothing is written.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Riyadh' })
    await setup(page)
    await page.clock.install({ time: at('23:59:58') })
    await open(page, 'ar')
    await page.clock.runFor(4000)
    await frames(page)
    await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'night')
    expect((await layers(page)).every((l) => l.cls === '')).toBe(true)
    await page.close()
  }
  // A device in Tokyo, the place in Riyadh: 15:45 in Riyadh is Asr.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo' })
    await setup(page)
    await page.clock.setFixedTime(at('15:45'))
    await open(page, 'ar')
    await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'asr')
    expect(await pill(page)).toContain(TODAY.ar.prayers.maghrib)
    await page.close()
  }
  // No place: no times on the line, no sky.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Riyadh' })
    await setup(page, { place: null })
    await page.clock.setFixedTime(at('15:45'))
    await open(page, 'ar')
    await expect(page.locator('.day-date')).not.toHaveAttribute('data-sky', /.*/)
    expect(await page.locator('.sky-l').count()).toBe(0)
    expect(await page.evaluate(() => document.documentElement.dataset.sky)).toBeUndefined()
    await page.close()
  }
  // A Hanafi Asr (later): at 15:05 still Dhuhr's sky; the setting changed on the page applies at once.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Riyadh' })
    await setup(page)
    await page.clock.setFixedTime(at('15:05'))
    await open(page, 'ar')
    await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'asr')
    await page.evaluate(() => {
      localStorage.setItem('muslim.prayer.v1', JSON.stringify({ method: 'UmmAlQura', asr: 'hanafi' }))
      window.dispatchEvent(new Event('muslim:widgets'))
    })
    await expect(page.locator('.day-date')).toHaveAttribute('data-sky', 'dhuhr')
    expect((await layers(page)).every((l) => l.cls === '')).toBe(true)
    expect(await pill(page)).toContain(TODAY.ar.prayers.asr)
    await page.close()
  }
})

// ── T6 ──
// One test per width and state: the six states in one test (each a new context, the home page and its contrast
// screenshots at up to 3x) passed 60 s on a loaded Mac (add-on 0072-add47 §5); split, each checks the same and keeps
// its own time, and closes its context whatever happens.
for (const [width, dsf] of [
  [390, 2],
  [390, 3],
  [375, 3],
  [320, 2],
  [320, 3],
] as const)
  for (const [state, hhmm] of SIX)
    test(`T6: every text over the painting reads 4.5:1 at its worst pixel, ${state} at ${width} px ${dsf}x`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
      try {
        const page = await ctx.newPage()
        await setup(page)
        await page.clock.setFixedTime(at(hhmm))
        await open(page, 'ar', width)
        await expect(page.locator('.day-date')).toHaveAttribute('data-sky', state)
        const report = { [state]: await contrastGate(page, `${state} ${width}/${dsf}x`) }
        test.info().attach('contrast.json', { body: JSON.stringify(report, null, 1), contentType: 'application/json' })
        if (SHOTS) fs.writeFileSync(path.join(SHOTS, `T6-contrast-${width}-${dsf}x-${state}.json`), JSON.stringify(report, null, 1))
      } finally {
        await ctx.close()
      }
    })

// Each bound crossed in view, the fade frozen at 100 ms of its 200. One test per width and bound: the twelve pages in one
// test (each a new context, the home page and some forty screenshots) passed 60 s on a loaded Mac (add-on 0072-add47
// §5); split, each checks the same and keeps its own time.
const BOUNDS = [
  ['night→fajr', '04:35:59'],
  ['fajr→morning', '05:53:59'],
  ['morning→dhuhr', '11:37:59'],
  ['dhuhr→asr', '14:53:59'],
  ['asr→maghrib', '17:19:59'],
  ['maghrib→night', '18:49:59'],
] as const
for (const [width, dsf] of [
  [390, 2],
  [320, 3],
] as const)
  for (const [label, before] of BOUNDS)
    test(`T6: mid-fade (t = 0.5), ${label}, at ${width} px ${dsf}x`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
      try {
        const page = await ctx.newPage()
        await setup(page)
        await page.clock.install({ time: new Date(at(before).getTime() - 60_000) })
        await open(page, 'ar', width)
        await page.clock.pauseAt(at(before))
        await page.clock.runFor(1100)
        await settle(page)
        expect(await page.locator('.sky-l.is-entering').count(), label).toBe(4)
        await page.evaluate(() => document.getAnimations().forEach((a) => (a.pause(), (a.currentTime = 100))))
        await contrastGate(page, `${label} mid-fade ${width}/${dsf}x`)
        if (SHOTS && width === 390) await page.screenshot({ path: path.join(SHOTS, `T6-midfade-${label.replace('→', '-')}-ar-390.png`) })
      } finally {
        await ctx.close()
      }
    })

// ── T7 ──
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
for (const width of [320, 375, 390, 430])
  test(`T7: the corner dates at ${width} px, four text sizes, ten languages: in their region or both under the card`, async ({ page }) => {
    await setup(page)
    await page.clock.setFixedTime(at('15:45'))
    const seen: string[] = []
    for (const lang of LANGS) {
      await open(page, lang, width)
      for (const scale of ['100%', '115%', '130%', '135%']) {
        await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
        await frames(page)
        await frames(page)
        await page.waitForTimeout(60)
        const mode = await page.locator('.day-date').getAttribute('data-corners')
        seen.push(`${lang} ${scale} ${mode}`)
        const label = `${lang} ${width} ${scale}`
        if (mode === 'under') {
          const r = await page.evaluate(() => {
            const e = document.querySelector('.dd-under') as HTMLElement
            const b = e.getBoundingClientRect()
            const fg = getComputedStyle(e).color
            const bg = getComputedStyle(document.body).backgroundColor
            return { w: b.width, inView: b.left >= -0.5 && b.right <= innerWidth + 0.5, lines: Math.round(b.height / parseFloat(getComputedStyle(e).lineHeight)), fg, bg, corners: document.querySelectorAll('.day-date .dd-corner').length }
          })
          expect(r.corners, label).toBe(0)
          expect(r.inView, label).toBe(true)
          const nums = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number)
          expect(ratio(nums(r.fg), nums(r.bg)), label).toBeGreaterThanOrEqual(4.5)
          continue
        }
        // In the corners: the year's longest weekday and date (either form, as chosen) inside a gold-free box of their
        // side, clear of the shamsa, inside the card.
        const bad = await page.evaluate(
          ({ mode, lang }) => {
            const card = document.querySelector('.day-date') as HTMLElement
            const c = card.getBoundingClientRect()
            const S = { x: c.left + (83 / 1200) * c.width, y: c.top + (75 / 865) * c.height, w: (1034 / 1200) * c.width, h: (711 / 865) * c.height }
            const boxes = (side: 'left' | 'right') =>
              ([
                [0.246, 0.13],
                [0.308, 0.092],
              ] as const).map(([bw, bh]) => {
                const y1 = S.y + S.h - 0.073 * S.h
                const x0 = side === 'left' ? S.x + 0.017 * S.w : S.x + S.w - 0.017 * S.w - bw * S.w
                return { l: x0 - 0.5, r: x0 + bw * S.w + 0.5, t: y1 - bh * S.h - 0.5, b: y1 + 0.5 }
              })
            const locale = lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : `${lang}-u-ca-gregory`
            const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o)
            const weekdays = Array.from({ length: 7 }, (_, i) => f({ weekday: 'long' }).format(new Date(2026, 9, 22 + i, 12)))
            const dates = Array.from({ length: 12 }, (_, m) => f({ day: 'numeric', month: mode === 'short' ? 'short' : 'long', year: 'numeric' }).format(new Date(2026, m, 28, 12)))
            const r = (246 / 1200) * c.width
            const cx = c.left + (599 / 1200) * c.width
            const cy = c.top + (430 / 865) * c.height
            const out: string[] = []
            for (const [sel, list] of [
              ['.dd-start', weekdays],
              ['.dd-end', dates],
            ] as const) {
              const e = card.querySelector(sel) as HTMLElement
              const was = e.textContent
              for (const t of list) {
                e.textContent = t
                const b = e.getBoundingClientRect()
                const side = b.left + b.width / 2 < c.left + c.width / 2 ? 'left' : 'right'
                if (!boxes(side).some((x) => b.left >= x.l && b.right <= x.r && b.top >= x.t && b.bottom <= x.b)) out.push(`${sel} «${t}» out of its region`)
                const nx = Math.max(b.left, Math.min(cx, b.right))
                const ny = Math.max(b.top, Math.min(cy, b.bottom))
                if (Math.hypot(nx - cx, ny - cy) < r) out.push(`${sel} «${t}» over the shamsa`)
                if (e.scrollWidth > e.clientWidth + 1) out.push(`${sel} «${t}» clipped`)
              }
              e.textContent = was
            }
            return out
          },
          { mode, lang },
        )
        expect(bad, label).toEqual([])
      }
    }
    test.info().attach('modes.txt', { body: seen.join('\n'), contentType: 'text/plain' })
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, `T7-modes-${width}.txt`), seen.join('\n'))
  })

// ── T8 ──
test('T8: outside the sky box and inside the disc the painting is as painted, at every state (ar and en, 390 and 320)', async ({ browser }) => {
  test.setTimeout(300_000)
  for (const lang of ['ar', 'en'])
    for (const width of [390, 320])
      for (const [state, hhmm] of SIX) {
        const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
        const page = await ctx.newPage()
        await setup(page)
        await page.clock.setFixedTime(at(hhmm))
        await open(page, lang, width)
        await page.addStyleTag({ content: HIDE_CORNERS + HIDE_DISC })
        await frames(page)
        const box = (await page.locator('.day-date').boundingBox())!
        const withSky = (await page.screenshot({ clip: box })).toString('base64')
        const bare = await page.addStyleTag({ content: '.sky-l { display: none !important; }' })
        await frames(page)
        const without = (await page.screenshot({ clip: box })).toString('base64')
        await bare.evaluate((t) => t.remove())
        // Compared in a page of its own (the pixels stay there): the largest difference outside the sky box and in the disc.
        const d = await page.context().newPage()
        const { maxOut, maxDisc } = await d.evaluate(
          async ([A, B, cssWidth]) => {
            const load = async (b64: string) => {
              const img = new Image()
              img.src = `data:image/png;base64,${b64}`
              await img.decode()
              const c = document.createElement('canvas')
              c.width = img.naturalWidth
              c.height = img.naturalHeight
              const g = c.getContext('2d')!
              g.drawImage(img, 0, 0)
              return { w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data }
            }
            const a = await load(A as string)
            const b = await load(B as string)
            const { w, h } = a
            // The card's own rounded edge (radius 20 px) is anti-aliased a little differently once the card is
            // composited as a group: its band of 1.5 device pixels is not the painting and is left out.
            const R = 20 * (w / (cssWidth as number))
            const edge = (x: number, y: number) => {
              const cx = x < R ? R : x > w - R ? w - R : x + 0.5
              const cy = y < R ? R : y > h - R ? h - R : y + 0.5
              const inCorner = (x < R || x > w - R) && (y < R || y > h - R)
              return x < 1.5 || y < 1.5 || x > w - 2.5 || y > h - 2.5 || (inCorner && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > R - 1.5)
            }
            // The sky box with a band of 1.5 device pixels along its edge, where the layers' edge is anti-aliased.
            const band = (1.5 * 1200) / w
            let maxOut = 0
            let maxDisc = 0
            for (let y = 0; y < h; y++)
              for (let x = 0; x < w; x++) {
                if (edge(x, y)) continue
                const u = ((x + 0.5) / w) * 1200
                const v = ((y + 0.5) / h) * 865
                const inSky = u > 83 - band && u < 1117 + band && v > 75 - band && v < 786 + band
                const inDisc = Math.hypot(u - 599, v - 430) < 184
                if (inSky && !inDisc) continue
                const i = 4 * (y * w + x)
                const dd = Math.max(Math.abs(a.px[i] - b.px[i]), Math.abs(a.px[i + 1] - b.px[i + 1]), Math.abs(a.px[i + 2] - b.px[i + 2]))
                if (inDisc) maxDisc = Math.max(maxDisc, dd)
                else maxOut = Math.max(maxOut, dd)
              }
            return { maxOut, maxDisc }
          },
          [withSky, without, box.width] as const,
        )
        await d.close()
        expect([maxOut, maxDisc], `${state} ${lang} ${width}: outside the sky, in the disc`).toEqual([expect.any(Number), expect.any(Number)])
        expect(maxOut, `${state} ${lang} ${width} outside the sky`).toBeLessThanOrEqual(1)
        expect(maxDisc, `${state} ${lang} ${width} in the disc`).toBeLessThanOrEqual(1)
        await ctx.close()
      }
})

// ── T9 ──
test('T9: no layer with increased contrast or reduced transparency (iOS’s flag); the page’s sky as it was', async ({ page }) => {
  await setup(page)
  await page.clock.setFixedTime(at('12:15'))
  await page.emulateMedia({ contrast: 'more' })
  await open(page, 'ar')
  expect((await layers(page)).every((l) => !l.shown)).toBe(true)
  const sky = () => page.locator('.v2-sky').evaluate((e) => getComputedStyle(e).backgroundImage)
  expect(await sky()).toContain('rgb(159, 192, 232)') // the day sky's own top, #9fc0e8
  await page.emulateMedia({ contrast: 'no-preference' })
  await frames(page)
  expect((await layers(page)).every((l) => l.shown)).toBe(true)
  expect(await sky()).toContain('rgb(166, 204, 242)') // Dhuhr's top, #a6ccf2
  await page.evaluate(() => (document.documentElement.dataset.reduceTransparency = ''))
  await frames(page)
  expect((await layers(page)).every((l) => !l.shown)).toBe(true)
})

// ── T12 ──
test('T12: the card’s accessibility tree is the same at every time (the layer is decoration, no name)', async ({ page }) => {
  await setup(page)
  const trees = new Set<string>()
  for (const [, hhmm] of SIX) {
    await page.clock.setFixedTime(at(hhmm))
    await open(page, 'ar')
    trees.add(await page.locator('.day-date').ariaSnapshot())
  }
  expect([...trees]).toHaveLength(1)
  expect(await page.locator('.sky-l[aria-hidden="true"]').count()).toBe(4)
})

// ── Shots for the record (Chromium; the approval shots are the iOS simulator's) ──
for (const lang of ['ar', 'en'] as const)
  for (const [width, scale] of [
    [390, '100%'],
    [320, '100%'],
    [390, '135%'],
    [320, '135%'],
  ] as const)
    test(`shots: the six states, ${lang} at ${width} px and ${scale}`, async ({ page }) => {
      test.skip(!SHOTS, 'SKY_SHOTS not given')
      fs.mkdirSync(SHOTS, { recursive: true })
      await setup(page)
      for (const [state, hhmm] of SIX) {
        await page.clock.setFixedTime(at(hhmm))
        await open(page, lang, width, scale === '100%' ? '' : scale)
        await expect(page.locator('.day-date')).toHaveAttribute('data-sky', state)
        await page.screenshot({ path: path.join(SHOTS, `chromium-${state}-${lang}-${width}-${scale.replace('%', '')}.png`) })
      }
    })
