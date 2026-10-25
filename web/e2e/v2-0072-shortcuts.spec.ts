import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { SHORTCUT_IDS, SHORTCUTS_ON } from '../src/v2/daily/shortcuts/model'
import { SHORTCUTS } from '../src/v2/daily/shortcuts/strings-shortcuts'
import { TODAY } from '../src/v2/daily/strings-today'

// Quick-access buttons in «يومك» (add-on 0072-add13 §3), on a preview (never a deployed link). Both looks from one build
// by the address (?shortcuts=emoji|line, ?shortcutsAt=times|cards); without them the grid of eight stays.
//   T1 both looks: twelve buttons, «ﷲ» for the Names in both, emoji only in (a), line drawings only in (b)
//   T2 each button opens its page (and «اسأل» focuses the question box)
//   T3 reorder: by drag on the handle, by the arrow buttons, by the arrow keys; announced; kept after a reload; reset
//   T4 390 and 320 wide, Arabic and English, 100% and 135% text: nothing wider than the screen, nothing cut, every
//      target 44 px, AA contrast for the labels, the title and the arrange button
//   T5 the two places, and off by default
//   T6 «ﷲ» inside its well, 14% on every side, at every width and text size (add-on 0072-add15)
// SHOTS=dir saves both looks on iPhone 16 Pro Max (440×956 @3) and SE (375×667 @2), day and night, in both places;
// NOTO=1 adds the emoji look as Android draws it (Noto Color Emoji, Google Fonts, for the shot only).
//   npx vite preview --port 8795 && BASE_URL=http://localhost:8795 npx playwright test e2e/v2-0072-shortcuts.spec.ts --project=mobile
test.use({ serviceWorkers: 'block', timezoneId: 'Asia/Riyadh' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.skip(({ isMobile }) => !isMobile, 'phone widths: the mobile project')

const SHOTS = process.env.SHOTS ?? ''
const BASE = process.env.BASE_URL ?? ''
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const ORDER_KEY = 'muslim.shortcuts.order.v1'

async function setup(page: Page, o: { order?: string[] } = {}) {
  await page.addInitScript(
    ([place, key, order]) => {
      localStorage.setItem('muslim.welcome.v1', '1')
      localStorage.setItem('muslim.place.v1', JSON.stringify(place))
      if (order && !sessionStorage.getItem('sc-seeded')) {
        localStorage.setItem(key as string, JSON.stringify(order))
        sessionStorage.setItem('sc-seeded', '1')
      }
    },
    [RIYADH, ORDER_KEY, o.order ?? null] as const,
  )
}
const open = async (page: Page, q: string, lang = 'ar') => {
  await page.goto(`${BASE}/?lang=${lang}&theme=light&${q}`)
  await expect(page.getByTestId('shortcuts')).toBeVisible()
}
const tiles = (page: Page) => page.locator('[data-testid="shortcuts"] .sc-tile')
const ids = (page: Page) => tiles(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-id')))
const rowIds = (page: Page) => page.locator('.sc-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')))

// ---------- T5
test('by default as SHORTCUTS_ON says (off until Talal has seen the fix: the grid of eight); ?shortcuts=off the eight', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE}/?lang=ar&theme=light`)
  if (SHORTCUTS_ON) {
    await expect(page.getByTestId('shortcuts')).toHaveAttribute('data-look', 'emoji')
    await expect(page.locator('.dt-today-grid')).toHaveCount(0)
  } else {
    await expect(page.locator('.dt-today-grid a.dt-tool')).toHaveCount(8)
    await expect(page.getByTestId('shortcuts')).toHaveCount(0)
  }
  await page.goto(`${BASE}/?lang=ar&theme=light&shortcuts=off`)
  await expect(page.locator('.dt-today-grid a.dt-tool')).toHaveCount(8)
  await expect(page.getByTestId('shortcuts')).toHaveCount(0)
})

for (const [at, before] of [
  ['times', '#q'],
  ['cards', '.day-cards, .day-date'],
] as const)
  test(`the place «${at}»: the grid stands ${at === 'times' ? 'under the next-prayer line, above «اسأل»' : 'under «اسأل», above the day’s cards'}`, async ({ page }) => {
    await setup(page)
    await open(page, `shortcuts=line&shortcutsAt=${at}`)
    const grid = (await page.getByTestId('shortcuts').boundingBox())!
    const line = (await page.locator('.dt-nextline').boundingBox())!
    const next = (await page.locator(before).first().boundingBox())!
    expect(grid.y).toBeGreaterThan(line.y)
    if (at === 'times') expect(grid.y + grid.height).toBeLessThanOrEqual(next.y)
    else {
      expect(grid.y).toBeGreaterThan((await page.locator('#q').boundingBox())!.y)
      expect(grid.y + grid.height).toBeLessThanOrEqual(next.y + 1)
    }
    // the grid of eight is gone; «أذكار المواقف» keeps its card if shown
    await expect(page.locator('.dt-today-grid')).toHaveCount(0)
  })

test('the place «date» (add-on 0072-add28 §3, the default): the blue date card in its place under «اسأل», the grid right under it, above «آية اليوم»', async ({ page }) => {
  await setup(page)
  await open(page, 'shortcuts=emoji')
  const q = (await page.locator('#q').boundingBox())!
  const date = (await page.locator('.day-date').boundingBox())!
  const grid = (await page.getByTestId('shortcuts').boundingBox())!
  expect(date.y).toBeGreaterThan(q.y)
  expect(grid.y).toBeGreaterThanOrEqual(date.y + date.height - 1)
  const ayah = page.locator('.dc-ayah-card')
  if (await ayah.count()) expect(grid.y + grid.height).toBeLessThanOrEqual((await ayah.boundingBox())!.y + 1)
})

// ---------- T1
for (const look of ['emoji', 'line'] as const)
  test(`look «${look}»: twelve buttons, «ﷲ» in gold for the Names`, async ({ page }) => {
    await setup(page)
    await open(page, `shortcuts=${look}`)
    await expect(tiles(page)).toHaveCount(SHORTCUT_IDS.length)
    expect(await ids(page)).toEqual([...SHORTCUT_IDS])
    const names = page.locator('.sc-tile[data-id="names"]')
    // Amiri's own outline of «ﷲ» as a path, in the shamsa's dark gold (add-on 0072-add15)
    await expect(names.locator('svg.sc-allah')).toHaveAttribute('data-char', 'U+FDF2')
    await expect(names.locator('svg.sc-allah path')).toHaveCount(1)
    await expect(names.locator('.sc-emoji, svg:not(.sc-allah)')).toHaveCount(0)
    expect(await names.locator('.sc-allah').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(140, 109, 42)')
    if (look === 'emoji') {
      await expect(page.locator('.sc-tile .sc-emoji')).toHaveCount(11)
      await expect(page.locator('.sc-tile svg:not(.sc-allah)')).toHaveCount(0)
      await expect(page.locator('.sc-tile[data-id="prayerLesson"] .sc-emoji')).toHaveText('🕌')
    } else {
      await expect(page.locator('.sc-tile .sc-emoji')).toHaveCount(0)
      await expect(page.locator('.sc-tile svg:not(.sc-allah)')).toHaveCount(11)
      expect(await page.locator('.sc-tile[data-id="qibla"] svg').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(148, 113, 44)')
    }
    // the marks are hidden from screen readers: each button's name is its label
    for (const id of SHORTCUT_IDS) await expect(page.locator(`.sc-tile[data-id="${id}"] .sc-ic`)).toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByRole('link', { name: 'علّمني الصلاة' })).toBeVisible()
    await expect(page.getByRole('button', { name: SHORTCUTS.ar.ask, exact: true })).toBeVisible()
  })

// ---------- T2
test('each button opens its page; «اسأل» focuses the question box', async ({ page }) => {
  await setup(page)
  const want: Record<string, RegExp> = {
    prayerLesson: /\/today\/lesson\/prayer/,
    wuduLesson: /\/today\/lesson\/wudu/,
    names: /\/today\/names/,
    tasbih: /\/today\/tasbih/,
    adhkar: /\/today\/adhkar/,
    quran: /\/quran\?/,
    qibla: /\/today\/qibla/,
    times: /\/today\/times/,
    calendar: /\/today\/calendar/,
    mosques: /\/today\/mosques/,
    goals: /\/today\/goals/,
  }
  for (const [id, url] of Object.entries(want)) {
    await open(page, 'shortcuts=emoji')
    await page.locator(`.sc-tile[data-id="${id}"]`).click()
    await expect(page, id).toHaveURL(url)
    // the address's switch goes along, so «back» finds the same look
    expect(page.url()).toContain('shortcuts=emoji')
  }
  await open(page, 'shortcuts=emoji')
  await page.locator('.sc-tile[data-id="ask"]').click()
  await expect(page.locator('#q')).toBeFocused()
})

// ---------- T3
test('reorder by the arrow buttons and the arrow keys, announced, kept after a reload, and reset', async ({ page }) => {
  await setup(page)
  await open(page, 'shortcuts=line')
  await page.getByTestId('shortcuts-arrange').click()
  await expect(page.getByTestId('shortcuts-arrange')).toHaveText(SHORTCUTS.ar.done)
  await expect(page.locator('.sc-row')).toHaveCount(12)
  // «اسأل» up by one with its arrow button
  await page.getByRole('button', { name: 'قدّم «اسأل»' }).click()
  expect((await rowIds(page)).slice(-2)).toEqual(['ask', 'goals'])
  await expect(page.getByTestId('shortcuts-live')).toHaveText('«اسأل»: 11 من 12')
  // the first row's «earlier» is disabled; moving the second up hands the focus to its «later»
  await expect(page.getByRole('button', { name: 'قدّم «علّمني الصلاة»' })).toBeDisabled()
  await page.getByRole('button', { name: 'قدّم «الوضوء»' }).click()
  expect((await rowIds(page)).slice(0, 2)).toEqual(['wuduLesson', 'prayerLesson'])
  await expect(page.getByRole('button', { name: 'أخّر «الوضوء»' })).toBeFocused()
  // keyboard: the handle and the arrow keys
  const handle = page.getByRole('button', { name: /^ترتيب «القبلة»/ })
  await handle.focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(handle).toBeFocused()
  expect((await rowIds(page)).indexOf('qibla')).toBe(4)
  await expect(page.getByTestId('shortcuts-live')).toHaveText('«القبلة»: 5 من 12')
  await page.keyboard.press('Home')
  expect((await rowIds(page))[0]).toBe('qibla')
  // done: the grid in the new order, kept after a reload
  await page.getByTestId('shortcuts-arrange').click()
  const order = await ids(page)
  expect(order.slice(0, 3)).toEqual(['qibla', 'wuduLesson', 'prayerLesson'])
  await page.reload()
  await expect(page.getByTestId('shortcuts')).toBeVisible()
  expect(await ids(page)).toEqual(order)
  // reset
  await page.getByTestId('shortcuts-arrange').click()
  await page.getByRole('button', { name: SHORTCUTS.ar.reset }).click()
  expect(await rowIds(page)).toEqual([...SHORTCUT_IDS])
  await expect(page.getByTestId('shortcuts-live')).toHaveText(SHORTCUTS.ar.resetDone)
  expect(await page.evaluate((k) => localStorage.getItem(k), ORDER_KEY)).toBeNull()
})

for (const kind of ['mouse', 'touch'] as const)
  test(`reorder by dragging the handle (${kind})`, async ({ page }) => {
    await setup(page)
    await open(page, 'shortcuts=emoji')
    await page.getByTestId('shortcuts-arrange').click()
    // The grid stands under the date card (add-on 0072-add28 §3): the list's first rows brought on screen before the drag.
    await page.locator('.sc-row[data-id="prayerLesson"]').evaluate((e) => e.scrollIntoView({ block: 'start' }))
    const from = (await page.locator('.sc-row[data-id="tasbih"] .sc-handle').boundingBox())!
    const to = (await page.locator('.sc-row[data-id="prayerLesson"]').boundingBox())!
    const x = from.x + from.width / 2
    const y0 = from.y + from.height / 2
    const y1 = to.y + 4
    if (kind === 'mouse') {
      await page.mouse.move(x, y0)
      await page.mouse.down()
      for (let k = 1; k <= 12; k++) await page.mouse.move(x, y0 + ((y1 - y0) * k) / 12)
      await expect(page.locator('.sc-row.is-drag')).toHaveCount(1)
      await page.mouse.up()
    } else {
      // a finger: pointer events of type touch through CDP
      const cdp = await page.context().newCDPSession(page)
      const tp = (type: string, yy: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] })
      await tp('touchStart', y0)
      for (let k = 1; k <= 12; k++) await tp('touchMove', y0 + ((y1 - y0) * k) / 12)
      await tp('touchEnd', y1)
    }
    await expect(page.locator('.sc-row.is-drag')).toHaveCount(0)
    expect((await rowIds(page))[0]).toBe('tasbih')
    await expect(page.getByTestId('shortcuts-live')).toHaveText('«المسبحة»: 1 من 12')
    // the dragged row is back in the flow (no offset left)
    expect(await page.locator('.sc-row[data-id="tasbih"]').evaluate((e) => (e as HTMLElement).style.transform)).toBe('')
    await page.getByTestId('shortcuts-arrange').click()
    expect((await ids(page))[0]).toBe('tasbih')
  })

// ---------- T4
const lum = (rgb: number[]) => {
  const c = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

for (const width of [390, 320])
  for (const lang of ['ar', 'en'] as const)
    for (const scale of ['100%', '135%'])
      for (const look of ['emoji', 'line'] as const)
        test(`${width} px, ${lang}, ${scale}, «${look}»: whole, 44 px targets, AA`, async ({ page }) => {
          await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
          await setup(page)
          await open(page, `shortcuts=${look}`, lang)
          await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
          await page.waitForTimeout(200)
          const check = () =>
            page.evaluate(() => {
              const out: string[] = []
              const W = document.documentElement.clientWidth
              if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways ${document.documentElement.scrollWidth}`)
              for (const el of document.querySelectorAll<HTMLElement>('[data-testid="shortcuts"] *')) {
                const r = el.getBoundingClientRect()
                if (!r.width) continue
                if (r.left < -1 || r.right > W + 1) out.push(`${el.className} ${Math.round(r.left)}–${Math.round(r.right)}`)
                if (el.scrollWidth > el.clientWidth + 1 && /sc-label|sc-row-label|sc-tile|sc-row|sc-hint/.test(String(el.className))) out.push(`cut ${el.className}`)
              }
              // a label wider than its tile
              for (const t of document.querySelectorAll<HTMLElement>('.sc-tile')) {
                const l = t.querySelector('.sc-label')!.getBoundingClientRect()
                const b = t.getBoundingClientRect()
                if (l.left < b.left - 1 || l.right > b.right + 1 || l.bottom > b.bottom + 1) out.push(`label out of ${t.dataset.id}`)
              }
              return out
            })
          const targets = (sel: string) =>
            page.locator(sel).evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute('data-id') ?? e.className, Math.round(r.width), Math.round(r.height)] as const }))
          expect(await check()).toEqual([])
          for (const [n, w, h] of await targets('.sc-tile, .sc-arrange')) {
            expect(w, String(n)).toBeGreaterThanOrEqual(44)
            expect(h, String(n)).toBeGreaterThanOrEqual(44)
          }
          // contrast: each text's colour over the colour behind it, alpha composited up the tree
          const pairs = await page.evaluate(() => {
            const rgba = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number)
            const behind = (el: Element | null): number[] => {
              const stack: number[][] = []
              for (let e = el; e; e = e.parentElement) {
                const c = rgba(getComputedStyle(e).backgroundColor)
                if (c.length >= 3 && (c[3] ?? 1) > 0) {
                  stack.push(c)
                  if ((c[3] ?? 1) >= 1) break
                }
              }
              let out = [246, 244, 239] // --bg
              for (const c of stack.reverse()) {
                const a = c[3] ?? 1
                out = out.map((v, k) => v * (1 - a) + c[k] * a)
              }
              return out
            }
            // «ﷲ» is a graphic now (an outline, not text): 3:1, like large text
            return [...document.querySelectorAll<Element>('.sc-label, .sc-head h2, .sc-arrange, .sc-allah')].map((e) => ({
              k: e.getAttribute('class') || e.tagName,
              fg: rgba(getComputedStyle(e).color).slice(0, 3),
              bg: behind(e),
              large: e.classList.contains('sc-allah') || parseFloat(getComputedStyle(e).fontSize) >= 24,
            }))
          })
          for (const p of pairs) expect(ratio(p.fg, p.bg), `${p.k} ${p.fg} on ${p.bg.map(Math.round)}`).toBeGreaterThanOrEqual(p.large ? 3 : 4.5)
          // the arrange list too
          await page.getByTestId('shortcuts-arrange').click()
          await expect(page.locator('.sc-row')).toHaveCount(12)
          expect(await check()).toEqual([])
          for (const [n, w, h] of await targets('.sc-handle, .sc-move, .sc-arrange')) {
            expect(w, String(n)).toBeGreaterThanOrEqual(44)
            expect(h, String(n)).toBeGreaterThanOrEqual(44)
          }
          await expect(page.getByRole('button', { name: lang === 'ar' ? 'أخّر «اسأل»' : 'Move Ask later' })).toBeDisabled()
          await expect(page.locator('.sc-head h2')).toHaveText(TODAY[lang].todayTitle)
        })

// The title and «ترتيب» over what is really behind them (the sky's foot under the next-prayer line): measured on the
// pixels, the text's darkest against the commonest background, in both places, day and night.
async function pixelRatio(page: Page, sel: string) {
  const png = (await page.locator(sel).screenshot({ animations: 'disabled' })).toString('base64')
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const L = (r: number, gg: number, b: number) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b)
    }
    const ls: number[] = []
    const freq = new Map<string, number>()
    for (let i = 0; i < d.length; i += 4) {
      ls.push(L(d[i], d[i + 1], d[i + 2]))
      const k = `${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`
      freq.set(k, (freq.get(k) ?? 0) + 1)
    }
    ls.sort((a, b) => a - b)
    const text = ls[Math.floor(ls.length * 0.005)]
    const bgKey = [...freq].sort((a, b) => b[1] - a[1])[0][0].split(',').map((v) => Number(v) * 8 + 4)
    const bg = L(bgKey[0], bgKey[1], bgKey[2])
    return (Math.max(bg, text) + 0.05) / (Math.min(bg, text) + 0.05)
  }, png)
}
for (const at of ['times', 'cards'] as const)
  for (const [when, iso] of [
    ['day', '2026-10-22T08:00:00+03:00'],
    ['night', '2026-10-22T21:30:00+03:00'],
  ] as const)
    test(`AA on the pixels: «يومك» and «ترتيب», place «${at}», ${when}`, async ({ page }) => {
      await page.clock.install({ time: new Date(iso) })
      await setup(page)
      await open(page, `shortcuts=line&shortcutsAt=${at}`)
      await page.waitForTimeout(600)
      for (const sel of ['.sc-head h2', '.sc-arrange']) expect(await pixelRatio(page, sel), sel).toBeGreaterThanOrEqual(4.5)
    })

// ---------- T6 «ﷲ» inside its well (add-on 0072-add15): Amiri's outline, every side at least 14% of the well, on the
// geometry and on the pixels, at the phones' widths (16 Pro Max, SE, two Android widths, 320) and at every text size up
// to the largest (135%: the phone's largest Text Size, the root's cap; src/text-size.ts). The mark keeps one size.
const WELLS = [
  ['16promax', 440, 956, 3],
  ['se', 375, 667, 2],
  ['android-412', 412, 915, 2.625],
  ['android-360', 360, 780, 3],
  ['320', 320, 568, 2],
] as const
const MIN = 0.14

/** The well's own pixels: the bounds of what differs from the well's cream, inside its rounded shape less a 3 CSS px
 *  band (its 1 px ring, anti-aliased, and the screenshot's subpixel offset), as fractions of the well. The band is far
 *  narrower than the 14% (6.2 px) asked, so it cannot hide the mark's ink. */
async function inkInWell(page: Page, well: import('@playwright/test').Locator) {
  const png = (await well.screenshot({ animations: 'disabled' })).toString('base64')
  const shape = await well.evaluate((el) => ({ w: el.getBoundingClientRect().width, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) }))
  return page.evaluate(async ([b64, shape]) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const at = (x: number, y: number) => [d[(y * c.width + x) * 4], d[(y * c.width + x) * 4 + 1], d[(y * c.width + x) * 4 + 2]]
    const bg = at(Math.floor(c.width / 2), 2 + Math.floor(c.height * 0.06)) // the cream, above the mark
    const k = c.width / shape.w
    const inset = 3 * k
    const r = Math.max(0, shape.r * k - inset)
    // inside the well's rounded rectangle, 3 CSS px in from its edge (the ring and the corners' page background out)
    const inside = (x: number, y: number) => {
      const [px, py] = [x + 0.5, y + 0.5]
      if (px < inset || py < inset || px > c.width - inset || py > c.height - inset) return false
      const cx = Math.min(Math.max(px, inset + r), c.width - inset - r)
      const cy = Math.min(Math.max(py, inset + r), c.height - inset - r)
      return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
    }
    let [x0, y0, x1, y1] = [c.width, c.height, -1, -1]
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        if (!inside(x, y)) continue
        const p = at(x, y)
        if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) < 24) continue
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x + 1)
        y1 = Math.max(y1, y + 1)
      }
    return { left: x0 / c.width, top: y0 / c.height, right: 1 - x1 / c.width, bottom: 1 - y1 / c.height, any: x1 > 0 }
  }, [png, shape] as const)
}

for (const [dev, w, h, dpr] of WELLS)
  test(`«ﷲ» inside its well with 14% on every side: ${dev}, every text size`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, locale: 'ar', serviceWorkers: 'block' })
    const page = await ctx.newPage()
    await setup(page)
    await open(page, 'shortcuts=emoji')
    const well = page.locator('.sc-tile[data-id="names"] .sc-ic')
    let size: number[] | null = null
    for (const scale of ['93.75%', '100%', '118.75%', '135%']) {
      await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), scale)
      await well.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(150)
      const geo = await well.evaluate((el) => {
        const b = el.getBoundingClientRect()
        const r = el.querySelector('svg.sc-allah')!.getBoundingClientRect()
        const p = el.querySelector('svg.sc-allah path')!.getBoundingClientRect()
        const m = (q: DOMRect) => [(q.left - b.left) / b.width, (q.top - b.top) / b.height, (b.right - q.right) / b.width, (b.bottom - q.bottom) / b.height]
        return { well: [b.width, b.height], mark: [r.width, r.height], drawn: m(r), fill: m(p) }
      })
      // the well and the mark keep their size whatever the text size
      expect(geo.well, scale).toEqual([44, 44])
      size ??= geo.mark
      expect(geo.mark.map((v) => Math.round(v * 100)), scale).toEqual(size.map((v) => Math.round(v * 100)))
      // the drawn box (outline and its stroke) keeps the margin; the outline's own bounds sit inside it
      for (const v of geo.drawn) expect(v, `${scale} drawn ${geo.drawn}`).toBeGreaterThanOrEqual(MIN)
      geo.fill.forEach((v, k) => expect(v, `${scale} fill ${geo.fill}`).toBeGreaterThanOrEqual(geo.drawn[k] - 1e-6))
      // and on the pixels, anti-aliasing included
      const ink = await inkInWell(page, well)
      expect(ink.any).toBe(true)
      for (const k of ['left', 'top', 'right', 'bottom'] as const) expect(ink[k], `${scale} pixels ${k} ${JSON.stringify(ink)}`).toBeGreaterThanOrEqual(MIN)
      // the pixels found are the mark's: within 1.5 px of its drawn box on every side
      ;(['left', 'top', 'right', 'bottom'] as const).forEach((k, i) => expect(Math.abs(ink[k] - geo.drawn[i]) * 44, `${scale} ${k} pixels vs geometry`).toBeLessThan(1.5))
    }
    // the arrange list's smaller well (38 px) too
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '135%'))
    await page.getByTestId('shortcuts-arrange').click()
    const row = page.locator('.sc-row[data-id="names"] .sc-ic')
    await row.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(150)
    const ink = await inkInWell(page, row)
    for (const k of ['left', 'top', 'right', 'bottom'] as const) expect(ink[k], `list ${k} ${JSON.stringify(ink)}`).toBeGreaterThanOrEqual(MIN)
    await ctx.close()
  })

// ---------- shots
const DEVICES = [
  ['16promax', 440, 956, 3],
  ['se', 375, 667, 2],
] as const
const TIMES = [
  ['day', '2026-10-22T08:00:00+03:00'],
  ['night', '2026-10-22T21:30:00+03:00'],
] as const

test.describe('shots', () => {
  test.skip(!SHOTS, 'SHOTS=dir')
  for (const [dev, w, h, dpr] of DEVICES)
    for (const [when, iso] of TIMES)
      test(`both looks, both places, ${dev}, ${when}`, async ({ browser }) => {
        test.setTimeout(240_000)
        fs.mkdirSync(SHOTS, { recursive: true })
        const looks = process.env.NOTO ? (['emoji', 'line', 'emoji-android'] as const) : (['emoji', 'line'] as const)
        for (const lang of ['ar', 'en'] as const)
          for (const at of ['times', 'cards'] as const)
            for (const look of looks) {
              if (lang === 'en' && (at === 'times' || look === 'emoji-android')) continue
              const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, locale: lang, timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
              const page = await ctx.newPage()
              await page.clock.install({ time: new Date(iso) })
              await setup(page)
              await page.goto(`${BASE}/?lang=${lang}&theme=light&shortcuts=${look === 'emoji-android' ? 'emoji' : look}&shortcutsAt=${at}`)
              await expect(page.getByTestId('shortcuts')).toBeVisible()
              if (look === 'emoji-android') {
                await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block' })
                await page.addStyleTag({ content: `.sc-emoji{font-family:'Noto Color Emoji',sans-serif!important}` })
                await page.evaluate(() => document.fonts.load('25px "Noto Color Emoji"', '🕌💧📿🤲📖🧭🕰️🌙💬📍🎯'))
              }
              await page.evaluate(() => document.fonts.ready)
              await page.waitForTimeout(900)
              const name = `${at}-${look}-${lang}-${dev}-${when}`
              // the first screen as the phone shows it
              await page.screenshot({ path: path.join(SHOTS, `${name}.png`), animations: 'disabled' })
              // scrolled to the grid, with the date card's sky under it (the only part of the page that turns with the
              // night: the app is day-only, reply 0043-add7)
              if (lang === 'ar' && look !== 'emoji-android') {
                await page.getByTestId('shortcuts').evaluate((el) => el.scrollIntoView({ block: 'start' }))
                await page.locator('.scroll').evaluate((el) => el.scrollBy(0, -12))
                await page.waitForTimeout(500)
                await page.screenshot({ path: path.join(SHOTS, `scrolled-${name}.png`), animations: 'disabled' })
                await page.locator('.scroll').evaluate((el) => el.scrollTo(0, 0))
                await page.waitForTimeout(200)
              }
              if (at === 'cards' && when === 'day') {
                await page.getByTestId('shortcuts').screenshot({ path: path.join(SHOTS, `grid-${look}-${lang}-${dev}.png`), animations: 'disabled' })
                if (look !== 'emoji-android') {
                  await page.getByTestId('shortcuts-arrange').click()
                  await page.waitForTimeout(300)
                  await page.getByTestId('shortcuts').screenshot({ path: path.join(SHOTS, `arrange-${look}-${lang}-${dev}.png`), animations: 'disabled' })
                }
              }
              await ctx.close()
            }
      })
})

// FIX=dir: the shots of the «ﷲ» fix (add-on 0072-add15): the grid as Android draws it (Noto Color Emoji, Google Fonts,
// for the shot only) at two widths and at the largest text size; the «ﷲ» tile beside an emoji tile, enlarged (×6), in
// Apple Color Emoji (this Mac's) and in Noto; 📅 🗓️ 🌙 in Noto; and each well's ink weight beside the emoji's (weights.json).
const FIX = process.env.FIX ?? ''
const NOTO_SET = '🕌💧📿🤲📖🧭🕰️📅🗓️🌙💬📍🎯'
async function noto(page: Page) {
  await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block' })
  await page.addStyleTag({ content: `.sc-emoji,.nt{font-family:'Noto Color Emoji',sans-serif!important}` })
  await page.evaluate((s) => document.fonts.load('25px "Noto Color Emoji"', s), NOTO_SET)
}
test.describe('fix shots', () => {
  test.skip(!FIX, 'FIX=dir')
  test('the grid on Android, the close-ups, the weights', async ({ browser }) => {
    test.setTimeout(300_000)
    fs.mkdirSync(FIX, { recursive: true })
    const shot = async (o: { w: number; h: number; dpr: number; android: boolean; scale?: string }, f: (page: Page) => Promise<void>) => {
      const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.dpr, isMobile: true, hasTouch: true, locale: 'ar', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
      const page = await ctx.newPage()
      await page.clock.install({ time: new Date('2026-10-22T08:00:00+03:00') })
      await setup(page)
      await open(page, 'shortcuts=emoji')
      if (o.android) await noto(page)
      if (o.scale) await page.evaluate((s) => document.documentElement.style.setProperty('font-size', s), o.scale)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(700)
      await f(page)
      await ctx.close()
    }
    for (const [name, w, h, dpr, scale] of [
      ['android-412', 412, 915, 2.625, ''],
      ['android-360', 360, 780, 3, ''],
      ['android-412-135', 412, 915, 2.625, '135%'],
    ] as const)
      await shot({ w, h, dpr, android: true, scale }, (page) => page.getByTestId('shortcuts').screenshot({ path: path.join(FIX, `grid-${name}.png`), animations: 'disabled' }))
    // the close-ups: «ﷲ» and its neighbour «المسبحة», and «الوضوء» on its other side
    for (const android of [false, true])
      await shot({ w: 440, h: 956, dpr: 6, android }, async (page) => {
        const a = (await page.locator('.sc-tile[data-id="tasbih"]').boundingBox())!
        const b = (await page.locator('.sc-tile[data-id="wuduLesson"]').boundingBox())!
        const pad = 6
        await page.screenshot({ path: path.join(FIX, `closeup-allah-${android ? 'android-noto' : 'apple'}.png`), animations: 'disabled', clip: { x: a.x - pad, y: a.y - pad, width: b.x + b.width - a.x + 2 * pad, height: a.height + 2 * pad } })
      })
    // 📅 🗓️ 🌙 in Noto, as Android draws them
    {
      const ctx = await browser.newContext({ viewport: { width: 420, height: 300 }, deviceScaleFactor: 3 })
      const page = await ctx.newPage()
      await page.setContent(`<!doctype html><meta charset=utf-8><body style="margin:16px;background:#faf7f0;font:14px sans-serif;color:#2a1e14"><div style="display:flex;gap:20px;justify-content:center;text-align:center">${['📅', '🗓️', '🌙'].map((e) => `<div><div class="nt" style="font-size:110px;line-height:1.15">${e}</div>${[...e].map((c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase()).join(' ')}</div>`).join('')}</div><p style="text-align:center">Noto Color Emoji, 25 px: <span class="nt" style="font-size:25px">📅 🗓️ 🌙</span></p>`)
      await noto(page)
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(FIX, 'calendar-emoji-android-noto.png') })
      await ctx.close()
    }
    // each well's ink weight: the sum over its pixels of their distance from the cream (0..1), in CSS px²
    const weights: Record<string, Record<string, number>> = {}
    for (const android of [false, true])
      await shot({ w: 440, h: 956, dpr: 3, android }, async (page) => {
        const out: Record<string, number> = {}
        for (const id of SHORTCUT_IDS) {
          const png = (await page.locator(`.sc-tile[data-id="${id}"] .sc-ic`).screenshot({ animations: 'disabled' })).toString('base64')
          out[id] = await page.evaluate(async (b64) => {
            const img = new Image()
            img.src = `data:image/png;base64,${b64}`
            await img.decode()
            const c = document.createElement('canvas')
            ;[c.width, c.height] = [img.width, img.height]
            const g = c.getContext('2d')!
            g.drawImage(img, 0, 0)
            const d = g.getImageData(0, 0, c.width, c.height).data
            const bg = [250, 247, 240]
            const ring = Math.ceil(c.width / 44) * 2
            let sum = 0
            for (let y = ring; y < c.height - ring; y++)
              for (let x = ring; x < c.width - ring; x++) {
                const i = (y * c.width + x) * 4
                sum += (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2])) / 765
              }
            return Math.round((sum / (c.width / 44) ** 2) * 10) / 10
          }, png)
        }
        weights[android ? 'noto' : 'apple'] = out
      })
    fs.writeFileSync(path.join(FIX, 'weights.json'), JSON.stringify(weights, null, 2))
  })
})
