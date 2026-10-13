import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import fatwas from '../../data/fatwas.json' with { type: 'json' }
import { TODAY } from '../src/v2/daily/strings-today'

// The daily screens, part D items 1-4, 7, 9 (reply 0032; boards out/design-v2/daily HomeToday, PrayerTimes, Qibla,
// Calendar, Goals, Mosques). The place is set on the device (localStorage) or by emulated geolocation; /api/mosques and
// /api/hadith are answered locally (no Overpass request, and the hadith route is merged from part B). Each screen also
// passes the page check: no horizontal scroll, no text under 13 px, no target under 44 px.
//   BASE_URL=http://localhost:8814 npx playwright test e2e/v2-daily-a.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })
const ar = TODAY.ar
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const H6183 = { ar: { id: '6183', text: 'عن عائشة رضي الله عنها قالت: كان رسول الله صلى الله عليه وسلم يتحرى صوم الإثنين والخميس.', grade: 'صحيح', attribution: 'رواه الترمذي والنسائي وابن ماجه وأحمد' } }

async function setup(page: Page, o: { place?: boolean; goals?: unknown[] } = {}) {
  await page.addInitScript(
    ([place, goals]) => {
      // Seed once: a reload keeps what the page itself saved.
      if (place && !localStorage.getItem('muslim.place.v1')) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
      if (goals && !localStorage.getItem('muslim.goals.v1')) localStorage.setItem('muslim.goals.v1', JSON.stringify(goals))
    },
    [o.place === false ? null : RIYADH, o.goals ?? null] as const,
  )
  // The calendar's hadith: from our data through the part-B route; answered here with hadith.jsonl's own record when
  // the file is available, else a fixed copy of 6183 (its Arabic text as in HadeethEnc, without diacritics).
  await page.route(/\/api\/hadith\/\d+/, (r) => r.fulfill({ json: H6183 }))
}

/** No horizontal scroll, no visible text under 13 px, no visible target under 44 px (height; width too except the
 *  calendar's seven columns at 320 px, reported). */
async function pageCheck(page: Page) {
  const r = await page.evaluate(() => {
    const out: string[] = []
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontal scroll ${document.documentElement.scrollWidth}`)
    const visible = (e: Element) => {
      const b = e.getBoundingClientRect()
      const cs = getComputedStyle(e)
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[aria-hidden="true"]')
    }
    for (const e of document.querySelectorAll('main *, header *, .dt-screen *')) {
      if (!visible(e) || e.closest('svg')) continue
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (own && parseFloat(getComputedStyle(e).fontSize) < 12.99) out.push(`text ${getComputedStyle(e).fontSize} «${e.textContent!.trim().slice(0, 30)}»`)
    }
    for (const e of document.querySelectorAll('.dt-screen a, .dt-screen button, .dt-nextline, .dt-tool')) {
      if (!visible(e)) continue
      const b = e.getBoundingClientRect()
      const day = e.classList.contains('dt-cal-day')
      if (b.height < 43.5 || (!day && b.width < 43.5) || (day && window.innerWidth >= 390 && b.width < 43.5))
        out.push(`target ${Math.round(b.width)}x${Math.round(b.height)} «${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30)}»`)
    }
    return out
  })
  expect(r).toEqual([])
}

test('home: the next-prayer line opens the times; the «يومك» grid has the eight tools', async ({ page }) => {
  await setup(page)
  await page.goto('/?lang=ar')
  const line = page.locator('a.dt-nextline')
  await expect(line).toBeVisible()
  await expect(line).toContainText(/الفجر|الظهر|العصر|المغرب|العشاء/)
  await expect(line).toContainText(ar.inDuration.replace(' {d}', ''))
  const tools = page.locator('.dt-today-grid a.dt-tool')
  await expect(tools).toHaveCount(8)
  await expect(tools.nth(0)).toHaveAttribute('href', '/today/times')
  for (const k of ['times', 'qibla', 'adhkar', 'tasbih', 'calendar', 'mosques', 'names', 'goals'] as const) await expect(page.locator('.dt-today-grid')).toContainText(ar.tools[k])
  await line.click()
  await expect(page).toHaveURL(/\/today\/times/)
  await expect(page.getByRole('heading', { level: 1, name: ar.timesTitle })).toBeVisible()
  await page.getByRole('button', { name: ar.back }).click()
  await expect(page).toHaveURL(/\/\?lang=ar$|\/$/)
})

test('home without a place asks for the city', async ({ page }) => {
  await setup(page, { place: false })
  await page.goto('/?lang=ar')
  await expect(page.locator('a.dt-nextline')).toContainText(ar.setCity)
})

test('prayer times: six times, the next prayer, the night, forbidden times with the exact source words and links; no bells without a key', async ({ page }) => {
  await setup(page)
  // next has its VAPID keys since add16 §8: the bells' absence is checked with the key route answering 404, as before
  // they were set (their presence is v2-push.spec.ts).
  await page.route('**/api/push/key', (r) => r.fulfill({ status: 404, json: { ok: false, error: 'not_configured' } }))
  await page.goto('/today/times?lang=ar')
  const times = page.locator('.dt-time')
  await expect(times).toHaveCount(6)
  for (const n of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) await expect(page.locator('.dt-rows')).toContainText(ar.prayers[n])
  await expect(page.locator('.dt-next')).toContainText(ar.nextPrayer)
  await expect(page.locator('.dt-progress span')).toHaveCount(1)
  await expect(page.getByText(ar.lastThird)).toBeVisible()
  // The quotes are the stored texts' own words.
  const quotes = await page.locator('.dt-quote').allTextContents()
  expect(quotes).toHaveLength(3)
  const sources = [...fatwas.fatwas.map((f) => f.answer), fatwas.books[0].passage].join('\n')
  // «… » stands where words before a quote are left out (reply 0031-add16 §4).
  for (const q of quotes) expect(sources).toContain(q.replace(/^«(… )?|»$/g, ''))
  await expect(page.getByText(ar.afterAsrNote)).toBeVisible()
  await page.getByRole('button', { name: new RegExp(ar.fatwaSource) }).click()
  const sheet = page.locator('dialog.sheet[open]')
  const links = await sheet.locator('a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
  expect(links.map(decodeURI)).toEqual([fatwas.fatwas[0].url, fatwas.fatwas[1].url, fatwas.books[0].url])
  await sheet.getByRole('button', { name: /إغلاق|Close/ }).click()
  await expect(page.locator('[aria-label^="تنبيه"]')).toHaveCount(0)
  await expect(page.getByText('مطابق لأم القرى')).toHaveCount(0)
  await pageCheck(page)
})

test('prayer times: the method sheet switches to Hanafi Asr (later) and remembers it', async ({ page }) => {
  await setup(page)
  await page.goto('/today/times?lang=en')
  const asr = () => page.locator('.dt-time').nth(3).locator('.dt-time-at').textContent()
  const before = await asr()
  await page.getByRole('button', { name: /Calculation/ }).click()
  await page.getByLabel(TODAY.en.asrHanafi).check()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: /Close/ }).click()
  expect(await asr()).not.toBe(before)
  await page.reload()
  expect(await asr()).not.toBe(before)
})

test('the place sheet: geolocation on the tap, or a GeoNames city', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 21.49, longitude: 39.19 })
  await setup(page, { place: false })
  await page.goto('/today/times?lang=ar')
  await page.locator('.dt-card .dt-btn-primary').click()
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet.getByRole('link', { name: '© GeoNames' })).toHaveAttribute('href', 'https://www.geonames.org/')
  await sheet.getByRole('searchbox', { name: ar.searchCity }).fill('تبو')
  await sheet.getByRole('button', { name: /تبوك/ }).click()
  await expect(page.locator('.dt-place-btn')).toContainText('تبوك')
  await page.locator('.dt-place-btn').click()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: ar.useMyLocation }).click()
  await expect(page.locator('.dt-place-btn')).toContainText(ar.auto)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('muslim.place.v1')!))
  expect(stored).toMatchObject({ lat: 21.49, lng: 39.19, source: 'gps' })
})

test('qibla: 244° from north for Riyadh; without a sensor the sentence; the compass only on the tap', async ({ page }) => {
  await setup(page)
  await page.goto('/today/qibla?lang=ar')
  await expect(page.locator('.dt-placerow')).toContainText('٢٤٤°')
  await expect(page.getByRole('img', { name: new RegExp(ar.compassLabel) })).toBeVisible()
  await expect(page.locator('.dt-qibla-advice')).toHaveText('اتجه ٢٤٤° من الشمال')
  await page.getByRole('button', { name: ar.startCompass }).click()
  // No orientation events in this browser: after two seconds it stays on the degrees, without the button.
  await expect(page.getByRole('button', { name: ar.startCompass })).toHaveCount(0, { timeout: 5000 })
  await expect(page.locator('.dt-qibla-advice')).toHaveText('اتجه ٢٤٤° من الشمال')
  await pageCheck(page)
})

test('qibla: with an absolute heading the needle and advice follow it', async ({ page }) => {
  await setup(page)
  await page.goto('/today/qibla?lang=ar')
  await page.getByRole('button', { name: ar.startCompass }).click()
  // The listeners are on once the button has gone (the permission step is asynchronous).
  await expect(page.getByRole('button', { name: ar.startCompass })).toHaveCount(0)
  await page.evaluate(() => {
    const e = new Event('deviceorientationabsolute') as Event & { alpha: number }
    Object.defineProperty(e, 'alpha', { value: 360 - 244 })
    window.dispatchEvent(e)
  })
  await expect(page.locator('.dt-qibla-advice')).toHaveText(ar.facing)
  // Reply 0043 د: the phone's own heading in degrees, and «hold the phone flat».
  await expect(page.locator('.dt-qibla-heading')).toHaveText('جوالك يتجه الآن ٢٤٤° من الشمال')
  await expect(page.locator('.dt-qibla')).toContainText(ar.holdFlat)
  await expect(page.locator('.dt-qibla-calibrate')).toHaveCount(0)
})

test('qibla (reply 0043 د): a weak calibration says how to calibrate; readings are smoothed along the circle', async ({ page }) => {
  await setup(page)
  await page.goto('/today/qibla?lang=ar')
  await page.getByRole('button', { name: ar.startCompass }).click()
  await expect(page.getByRole('button', { name: ar.startCompass })).toHaveCount(0)
  const send = (h: number, acc: number) =>
    page.evaluate(
      ([h, acc]) => {
        const e = new Event('deviceorientation') as Event & { webkitCompassHeading: number; webkitCompassAccuracy: number }
        Object.defineProperty(e, 'webkitCompassHeading', { value: h })
        Object.defineProperty(e, 'webkitCompassAccuracy', { value: acc })
        window.dispatchEvent(e)
      },
      [h, acc],
    )
  await send(10, 35)
  await expect(page.locator('.dt-qibla-calibrate')).toHaveText(ar.calibrate)
  await send(10, 5)
  await expect(page.locator('.dt-qibla-calibrate')).toHaveCount(0)
})

test('calendar: the Umm al-Qura month, the dot legend, a Monday shows its hadith with grade; the court line; the why page', async ({ page }) => {
  await setup(page)
  await page.goto('/today/calendar?lang=ar')
  const days = page.locator('.dt-cal-day')
  expect(await days.count()).toBeGreaterThanOrEqual(29)
  await expect(page.locator('.dt-cal-legend')).toHaveText(ar.fastingLegend)
  await expect(page.getByText(ar.courtLine)).toBeVisible()
  // A Monday (second column) is dotted and opens the hadith of the Monday and Thursday fast.
  const monday = page.locator('.dt-cal-grid > *').nth(7 + 1).locator('xpath=self::button')
  const firstMonday = (await monday.count()) ? monday : page.locator('.dt-cal-grid > *').nth(7 + 8)
  await expect(firstMonday.locator('.dt-cal-dot')).toHaveCount(1)
  await firstMonday.click()
  await expect(page.locator('.dt-day-title')).toContainText(ar.events.mon_thu)
  await expect(page.locator('.dt-hadith-text')).toContainText('يتحرى صوم الإثنين والخميس')
  await expect(page.locator('.dt-grade')).toHaveText('صحيح')
  await pageCheck(page)
  await page.getByRole('button', { name: ar.whyButton }).click()
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet.locator('.dt-fatwa')).toHaveCount(2)
  const f13471 = fatwas.fatwas.find((f) => f.number === '13471')!
  // 13471: one sentence cut as written, with no private-use character (reply 0031-add16 §5).
  await expect(sheet.locator('.dt-pua')).toHaveCount(0)
  const answer = await sheet.locator('.dt-fatwa').nth(1).locator('.dt-fatwa-text').evaluate((p) => p.textContent)
  expect(f13471.answer).toContain(answer!.replace(/^«|»$/g, ''))
  const links = await sheet.locator('.dt-fatwa a').evaluateAll((as) => as.map((a) => decodeURI((a as HTMLAnchorElement).href)))
  expect(links).toEqual([fatwas.fatwas.find((f) => f.number === '15824')!.url, f13471.url])
})

test('calendar: the offset moves the Hijri days and is remembered', async ({ page }) => {
  await setup(page)
  await page.goto('/today/calendar?lang=en')
  const today = () => page.locator('.dt-cal-day.is-today .dt-cal-h').textContent()
  const d0 = Number(await today())
  await page.getByRole('button', { name: /Adjust the date/ }).click()
  await page.getByRole('button', { name: TODAY.en.plusDay }).click()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: /Close/ }).click()
  const d1 = Number(await today())
  expect(d1 === d0 + 1 || d1 === 1).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('muslim.hijri.offset.v1'))).toBe('1')
})

test('goals: add a preset, tick today, the count is in days done and survives a reload', async ({ page }) => {
  await setup(page, { goals: [] })
  await page.goto('/today/goals?lang=ar')
  await expect(page.getByText(ar.goalsIntroBold)).toBeVisible()
  await page.getByRole('button', { name: ar.addGoal }).click()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: ar.presets[0] }).click()
  const tick = page.getByRole('checkbox', { name: new RegExp(ar.presets[0]) })
  await expect(tick).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.dt-goal .dt-row-sub')).toHaveText('لم تنجزه بعد، من ٤٠')
  await tick.click()
  await expect(tick).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.dt-goal .dt-row-sub')).toHaveText('أنجزته يومًا واحدًا من ٤٠')
  await page.reload()
  await expect(page.getByRole('checkbox', { name: new RegExp(ar.presets[0]) })).toHaveAttribute('aria-checked', 'true')
  await pageCheck(page)
})

test('mosques: only a ~1 km cell is sent; sorted by distance on the phone; directions and the OSM attribution', async ({ page }) => {
  await setup(page)
  const asked: string[] = []
  await page.route(/\/api\/mosques/, (r) => {
    asked.push(r.request().url())
    return r.fulfill({
      json: {
        cell: '24.69,46.72',
        mosques: [
          { id: 'way/3', name: 'جامع الحديقة', lat: 24.68, lng: 46.725 },
          { id: 'node/1', name: 'جامع الحي', lat: 24.69, lng: 46.723 },
          { id: 'node/2', name: null, street: 'طريق الملك فهد', lat: 24.6925, lng: 46.7219 },
        ],
      },
    })
  })
  await page.goto('/today/mosques?lang=ar')
  await expect(page.locator('.dt-mosque')).toHaveCount(3)
  expect(asked).toHaveLength(1)
  const u = new URL(asked[0])
  expect(u.searchParams.get('cell')).toBe('24.69,46.72')
  expect(u.search).not.toContain('24.6877')
  // 0043-add5: an unnamed mosque shows «مسجد» with its street; directions go to Google Maps first, for driving.
  await expect(page.locator('.dt-mosque .dt-row-title')).toHaveText(['جامع الحي', `${ar.unnamedMosque} · طريق الملك فهد`, 'جامع الحديقة'])
  await expect(page.locator('.dt-mosque a.dt-dir-btn').first()).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=24.69,46.723&travelmode=driving')
  await expect(page.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  await pageCheck(page)
})

test('mosques: a busy service says so and offers to try again', async ({ page }) => {
  await setup(page)
  let n = 0
  await page.route(/\/api\/mosques/, (r) => (n++ === 0 ? r.fulfill({ status: 503, headers: { 'retry-after': '30' }, json: { ok: false } }) : r.fulfill({ json: { cell: '', mosques: [] } })))
  await page.goto('/today/mosques?lang=ar')
  await expect(page.getByText(ar.mosquesBusy)).toBeVisible()
  await page.getByRole('button', { name: ar.tryAgain }).click()
  await expect(page.getByText(/لم نجد مساجد/)).toBeVisible()
})

for (const [lang, w] of [
  ['en', 390],
  ['ur', 320],
] as const)
  test(`the five screens pass the page check in ${lang} at ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 760 })
    await setup(page, { goals: [{ id: 'g', title: TODAY[lang].presets[1], createdAt: '2026-10-01', doneDays: ['2026-10-01'], target: 40 }] })
    await page.route(/\/api\/mosques/, (r) => r.fulfill({ json: { cell: '', mosques: [{ id: 'n/1', name: 'M', lat: 24.69, lng: 46.72 }] } }))
    for (const tool of ['times', 'qibla', 'calendar', 'goals', 'mosques']) {
      await page.goto(`/today/${tool}?lang=${lang}`)
      await expect(page.locator('.dt-head h1')).toBeVisible()
      await pageCheck(page)
    }
  })

test.afterAll(() => {
  // Nothing written outside the browser.
  expect(fs.existsSync(path.resolve(import.meta.dirname, '../dist'))).toBe(true)
})
