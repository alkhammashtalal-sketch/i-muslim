import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { SHORTCUT_IDS } from '../src/v2/daily/shortcuts/model'
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
test('off by default: the grid of eight, no quick-access buttons', async ({ page }) => {
  await setup(page)
  await page.goto(`${BASE}/?lang=ar&theme=light`)
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

// ---------- T1
for (const look of ['emoji', 'line'] as const)
  test(`look «${look}»: twelve buttons, «ﷲ» in gold for the Names`, async ({ page }) => {
    await setup(page)
    await open(page, `shortcuts=${look}`)
    await expect(tiles(page)).toHaveCount(SHORTCUT_IDS.length)
    expect(await ids(page)).toEqual([...SHORTCUT_IDS])
    const names = page.locator('.sc-tile[data-id="names"]')
    await expect(names.locator('.sc-allah')).toHaveText('ﷲ')
    await expect(names.locator('.sc-emoji, svg')).toHaveCount(0)
    expect(await names.locator('.sc-allah').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(148, 113, 44)')
    if (look === 'emoji') {
      await expect(page.locator('.sc-tile .sc-emoji')).toHaveCount(11)
      await expect(page.locator('.sc-tile svg')).toHaveCount(0)
      await expect(page.locator('.sc-tile[data-id="prayerLesson"] .sc-emoji')).toHaveText('🕌')
    } else {
      await expect(page.locator('.sc-tile .sc-emoji')).toHaveCount(0)
      await expect(page.locator('.sc-tile svg')).toHaveCount(11)
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
            return [...document.querySelectorAll<HTMLElement>('.sc-label, .sc-head h2, .sc-arrange, .sc-allah')].map((e) => ({
              k: e.className || e.tagName,
              fg: rgba(getComputedStyle(e).color).slice(0, 3),
              bg: behind(e),
              large: parseFloat(getComputedStyle(e).fontSize) >= 24,
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
                await page.evaluate(() => document.fonts.load('25px "Noto Color Emoji"', '🕌💧📿🤲📖🧭🕰️📅💬📍🎯'))
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
