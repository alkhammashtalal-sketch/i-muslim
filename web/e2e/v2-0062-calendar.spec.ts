import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { DEVCAL } from '../src/v2/daily/strings-devcal'
import { TODAY } from '../src/v2/daily/strings-today'
import { pastWelcome } from './past-welcome'

// «أضف إلى تقويم الجهاز» on the calendar page (reply 0062 §2–§4; reply 0072 item 14). In the browser the page offers
// nothing of it (there is no phone calendar); inside the app it is the iPhone's DeviceCalendar plugin or Android's
// AndroidCalendar, answered here by a stand-in of Capacitor's native bridge (window.Capacitor before the page loads:
// the platform, the plugins' headers and nativePromise), which records what the page hands to the phone. The real
// plugins ran in the iOS simulator (relay/w1/0072-calendar/README.md).
// The clock is Saturday 24 October 2026 in Riyadh (13 Jumada I 1448). The sheets at 390 and 320 px, 135% text, in the
// ten languages: nothing cut, nothing wider than the sheet.
//   BASE_URL=http://localhost:5191 [CAL_SHOTS=dir] npx playwright test e2e/v2-0062-calendar.spec.ts --project=mobile

test.use({ serviceWorkers: 'block', timezoneId: 'Asia/Riyadh' })
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
// The shots: out/shots/0072-calendar (git-ignored), or CAL_SHOTS (for the report, relay/w1/0072-calendar/pw).
const SHOTS_DIR = process.env.CAL_SHOTS ?? path.resolve(import.meta.dirname, '../../out/shots/0072-calendar')
const NOW = new Date('2026-10-24T12:00:00+03:00')
const H = { ar: { id: '6183', text: 'نص', grade: 'صحيح', attribution: '' } }

type Rec = { plugin: string; method: string; options: unknown }

/** Capacitor's native bridge as the app's web view has it, for one platform; `deny` answers the iPhone's add as a
 *  refused permission. */
async function asApp(page: Page, platform: 'ios' | 'android', o: { deny?: boolean; scale?: string } = {}) {
  await pastWelcome(page)
  await page.addInitScript(
    ({ platform, deny, scale }) => {
      const w = window as unknown as Record<string, unknown>
      const calls: Rec[] = []
      w.__calls = calls
      w.CapacitorCustomPlatform = { name: platform }
      const method = { name: '*', rtype: 'promise' }
      w.Capacitor = {
        PluginHeaders: { find: () => ({ name: '*', methods: { find: () => method } }) },
        nativePromise: async (plugin: string, m: string, options: Record<string, unknown>) => {
          calls.push({ plugin, method: m, options })
          if (plugin === 'DeviceCalendar' && m === 'available') return { available: true }
          if (plugin === 'DeviceCalendar' && m === 'add') return deny ? { added: 0, denied: true } : { added: (options.events as unknown[]).length }
          if (plugin === 'AndroidCalendar' && m === 'insert') return { opened: true }
          if (m === 'addListener') return 'cb'
          return {}
        },
        nativeCallback: () => 'cb',
      }
      if (scale) {
        const apply = () => (document.documentElement ? (document.documentElement.style.setProperty('font-size', scale, 'important'), true) : false)
        if (!apply()) {
          const mo = new MutationObserver(() => apply() && mo.disconnect())
          mo.observe(document, { childList: true, subtree: true })
        }
      }
    },
    { platform, deny: !!o.deny, scale: o.scale ?? '' },
  )
}

async function setup(page: Page) {
  await page.clock.setFixedTime(NOW)
  await page.route(/\/api\/hadith\/\d+/, (r) => r.fulfill({ json: H }))
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { __calls: Rec[] }).__calls.filter((c) => /Calendar$/.test(c.plugin) && c.method !== 'available'))
const sheet = (page: Page) => page.locator('dialog.sheet[open]')

/** Nothing in the sheet is wider than it, and no label, choice or button has its text cut. */
async function fits(page: Page) {
  return sheet(page).evaluate((d) => {
    const bad: string[] = []
    if (d.scrollWidth > d.clientWidth + 1) bad.push(`sheet ${d.scrollWidth} > ${d.clientWidth}`)
    const box = d.getBoundingClientRect()
    for (const el of d.querySelectorAll<HTMLElement>('label, legend, button, p, .dt-choice span, input')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') bad.push(`cut: ${el.tagName} ${el.textContent?.slice(0, 30)}`)
      if (r.left < box.left - 1 || r.right > box.right + 1) bad.push(`out: ${el.tagName} ${el.textContent?.slice(0, 30)}`)
    }
    for (const el of d.querySelectorAll<HTMLElement>('button, .dt-choice')) if (el.getBoundingClientRect().height < 44) bad.push(`target: ${el.textContent?.slice(0, 30)}`)
    return bad
  })
}

test('the browser: nothing of the phone’s calendar is offered', async ({ page }) => {
  await setup(page)
  await page.goto('/today/calendar?lang=ar')
  await expect(page.locator('.dt-cal-day').first()).toBeVisible()
  await expect(page.getByText(TODAY.ar.courtLine)).toBeVisible()
  await expect(page.locator('[data-devcal]')).toHaveCount(0)
  await expect(page.getByText(DEVCAL.ar.hint)).toHaveCount(0)
})

test('iPhone: a day with its title, its time and a reminder a day before; the Hijri date in the notes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await asApp(page, 'ios')
  await setup(page)
  await page.goto('/today/calendar?lang=ar')
  const d = DEVCAL.ar
  await expect(page.getByText(d.hint)).toBeVisible()
  await expect(page.getByRole('button', { name: d.addOccasions })).toBeVisible()
  await page.getByRole('button', { name: d.addDay, exact: true }).click()
  const s = sheet(page)
  await expect(s.locator('.dt-devcal-hijri')).toHaveText('السبت، ١٣ جمادى الأولى ١٤٤٨ هـ')
  await expect(s.locator('.dt-devcal-day .dt-muted')).toHaveText('٢٤ أكتوبر ٢٠٢٦')
  const add = s.getByRole('button', { name: d.add, exact: true })
  await expect(add).toBeDisabled()
  await s.getByLabel(d.eventTitle).fill('زيارة الوالدين')
  await s.getByLabel(d.atTime).check()
  await s.locator('input[type=time]').fill('17:30')
  await s.getByLabel(d.remDayBefore).check()
  await expect(s.getByText(d.onDevice)).toBeVisible()
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS_DIR, 'ios-day-sheet-ar-390.png') })
  await add.click()
  await expect(s.locator('.dt-devcal-result')).toHaveText(d.added)
  expect(await calls(page)).toEqual([
    {
      plugin: 'DeviceCalendar',
      method: 'add',
      options: { events: [{ title: 'زيارة الوالدين', notes: 'السبت، ١٣ جمادى الأولى ١٤٤٨ هـ', start: { y: 2026, m: 10, d: 24 }, end: { y: 2026, m: 10, d: 24 }, allDay: false, time: { h: 17, min: 30 }, alarms: [-86400] }] },
    },
  ])
  expect(errors).toEqual([])
})

test('iPhone: the occasions for three years, all day, a reminder a day before; the user’s offset moves them', async ({ page }) => {
  await asApp(page, 'ios')
  await setup(page)
  await page.addInitScript(() => localStorage.setItem('muslim.hijri.offset.v1', '1'))
  await page.goto('/today/calendar?lang=en')
  const d = DEVCAL.en
  await page.getByRole('button', { name: d.addOccasions }).click()
  const s = sheet(page)
  await expect(s.locator('.dt-devcal-occ')).toHaveCount(12)
  await expect(s.getByText(d.willAdd.zero!)).toBeVisible()
  await s.locator('input[value=ramadan]').check()
  await s.locator('input[value=eid_fitr]').check()
  await s.getByLabel(d.remDayBefore).check()
  await expect(s.getByText('6 events will be added')).toBeVisible()
  // With +1 the page's Ramadan begins a day earlier: Sunday 7 February 2027.
  await expect(s.locator('.dt-devcal-occ').first()).toContainText('February 7, 2027')
  await page.screenshot({ path: path.join(SHOTS_DIR, 'ios-occasions-sheet-en-390.png') })
  await s.getByRole('button', { name: d.add, exact: true }).click()
  await expect(s.locator('.dt-devcal-result')).toHaveText('6 events added to your phone’s calendar.')
  const [c] = await calls(page)
  const ev = (c.options as { events: { title: string; start: unknown; end: unknown; allDay: boolean; alarms: number[]; notes: string }[] }).events
  expect(ev.map((e) => [e.title, e.start, e.end])).toEqual([
    ['Ramadan', { y: 2027, m: 2, d: 7 }, { y: 2027, m: 3, d: 7 }],
    ['Eid al-Fitr', { y: 2027, m: 3, d: 8 }, { y: 2027, m: 3, d: 8 }],
    ['Ramadan', { y: 2028, m: 1, d: 27 }, { y: 2028, m: 2, d: 24 }],
    ['Eid al-Fitr', { y: 2028, m: 2, d: 25 }, { y: 2028, m: 2, d: 25 }],
    ['Ramadan', { y: 2029, m: 1, d: 15 }, { y: 2029, m: 2, d: 12 }],
    ['Eid al-Fitr', { y: 2029, m: 2, d: 13 }, { y: 2029, m: 2, d: 13 }],
  ])
  for (const e of ev) expect(e).toMatchObject({ allDay: true, alarms: [-54000] })
  expect(ev[0].notes).toBe(`Ramadan 1, 1448 AH – Ramadan 29, 1448 AH\n${TODAY.en.courtLine}`)
})

test('iPhone: a refused permission is a calm line, no error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && /Calendar/.test(m.text()) && errors.push(m.text()))
  await asApp(page, 'ios', { deny: true })
  await setup(page)
  await page.goto('/today/calendar?lang=ar')
  await page.getByRole('button', { name: DEVCAL.ar.addDay, exact: true }).click()
  await sheet(page).getByLabel(DEVCAL.ar.eventTitle).fill('موعد')
  await sheet(page).getByRole('button', { name: DEVCAL.ar.add, exact: true }).click()
  await expect(sheet(page).locator('.dt-devcal-result')).toHaveText(DEVCAL.ar.denied)
  await expect(sheet(page).locator('.dt-devcal-result')).toHaveAttribute('data-result', 'denied')
  await page.screenshot({ path: path.join(SHOTS_DIR, 'ios-denied-ar-390.png') })
  expect(errors).toEqual([])
})

test('Android: a day through the calendar app’s own screen; no occasions list, no hint, no reminder choice', async ({ page }) => {
  await asApp(page, 'android')
  await setup(page)
  await page.goto('/today/calendar?lang=ar')
  await expect(page.getByRole('button', { name: DEVCAL.ar.addDay, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: DEVCAL.ar.addOccasions })).toHaveCount(0)
  await expect(page.getByText(DEVCAL.ar.hint)).toHaveCount(0)
  await page.getByRole('button', { name: DEVCAL.ar.addDay, exact: true }).click()
  const s = sheet(page)
  await expect(s.getByText(DEVCAL.ar.reminder, { exact: true })).toHaveCount(0)
  await expect(s.getByText(DEVCAL.ar.androidReminder)).toBeVisible()
  await s.getByLabel(DEVCAL.ar.eventTitle).fill('زيارة')
  await s.getByRole('button', { name: DEVCAL.ar.add, exact: true }).click()
  await expect(s.locator('.dt-devcal-result')).toHaveText(DEVCAL.ar.opened)
  const [c] = await calls(page)
  expect(c).toEqual({ plugin: 'AndroidCalendar', method: 'insert', options: { title: 'زيارة', notes: 'السبت، ١٣ جمادى الأولى ١٤٤٨ هـ', allDay: true, begin: Date.UTC(2026, 9, 24), end: Date.UTC(2026, 9, 25) } })
})

for (const width of [390, 320]) {
  test(`the sheets fit at ${width} px with 135% text, in the ten languages`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width, height: 844 })
    await asApp(page, 'ios', { scale: '135%' })
    await setup(page)
    const found: string[] = []
    for (const lang of LANGS) {
      const d = DEVCAL[lang]
      await page.goto(`/today/calendar?lang=${lang}`)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${lang} page`).toBe(true)
      await page.locator('[data-devcal=day]').click()
      await sheet(page).getByLabel(d.atTime).check()
      for (const f of await fits(page)) found.push(`${lang} ${width} day: ${f}`)
      if (width === 320) await page.screenshot({ path: path.join(SHOTS_DIR, `fit-day-${lang}-320-135.png`) })
      await page.keyboard.press('Escape')
      await page.locator('[data-devcal=occasions]').click()
      await sheet(page).locator('.dt-devcal-occ input').first().check()
      for (const f of await fits(page)) found.push(`${lang} ${width} occasions: ${f}`)
      if (width === 320) await page.screenshot({ path: path.join(SHOTS_DIR, `fit-occasions-${lang}-320-135.png`) })
      await page.keyboard.press('Escape')
      // The hint on the page.
      const hint = page.locator('.dt-devcal-hint')
      expect(await hint.evaluate((p) => p.scrollWidth <= p.clientWidth + 1), `${lang} hint`).toBe(true)
    }
    expect(found).toEqual([])
  })
}
