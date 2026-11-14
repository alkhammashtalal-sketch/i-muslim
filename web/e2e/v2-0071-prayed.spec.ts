import { expect, test, type Page } from '@playwright/test'
import { TODAY } from '../src/v2/daily/strings-today'

// «صليت» in «أهدافي» (add-on 0071-add13 §5): a mark per prayer of the day, the days all five were marked (never a
// streak), the card hidden and brought back with its count, the log's day from Fajr to Fajr at the place, nothing
// sent, and the page check (no horizontal scroll, no text under 13 px, no target under 44 px) in three languages.
//   BASE_URL=http://localhost:8853 npx playwright test e2e/v2-0071-prayed.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })
const ar = TODAY.ar
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const KEY = 'muslim.prayed.v1'

async function setup(page: Page, at: string, prayed?: unknown) {
  await page.clock.setFixedTime(new Date(at))
  await page.addInitScript(
    ([place, log, key]) => {
      if (!localStorage.getItem('muslim.place.v1')) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
      if (log && !localStorage.getItem(key as string)) localStorage.setItem(key as string, JSON.stringify(log))
    },
    [RIYADH, prayed ?? null, KEY] as const,
  )
}
const tick = (page: Page, prayer: keyof typeof ar.prayers) => page.getByRole('checkbox', { name: `صلّيت ${ar.prayers[prayer]}` })
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY)

test('the five marks count a day once all five are in, survive a reload, and send nothing', async ({ page }) => {
  await setup(page, '2026-10-22T21:00:00+03:00')
  await page.goto('/today/goals?lang=ar')
  const card = page.locator('section.dt-prayed')
  await expect(card.getByRole('heading', { name: ar.prayedTitle })).toBeVisible()
  await expect(card.getByRole('checkbox')).toHaveCount(5)
  await expect(card.locator('.dt-prayed-count')).toHaveText(ar.prayedNone)
  const sent: string[] = []
  page.on('request', (r) => {
    if (r.method() !== 'GET' || new URL(r.url()).pathname.startsWith('/api/')) sent.push(`${r.method()} ${r.url()}`)
  })
  for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib'] as const) await tick(page, p).click()
  await expect(tick(page, 'maghrib')).toHaveAttribute('aria-checked', 'true')
  await expect(card.locator('.dt-prayed-count')).toHaveText(ar.prayedNone)
  await tick(page, 'isha').click()
  await expect(tick(page, 'isha')).toHaveAttribute('aria-checked', 'true')
  await expect(card.locator('.dt-prayed-count')).toHaveText('صلّيت الخمس كاملة في يوم واحد')
  expect(await stored(page)).toEqual({ full: ['2026-10-22'], day: '2026-10-22', prayed: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] })
  // An unmark corrects the day; marking again restores it.
  await tick(page, 'asr').click()
  await expect(card.locator('.dt-prayed-count')).toHaveText(ar.prayedNone)
  await tick(page, 'asr').click()
  expect(sent).toEqual([])
  await page.reload()
  for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) await expect(tick(page, p)).toHaveAttribute('aria-checked', 'true')
  // No red anywhere in the card, and no badge.
  const reds = await card.evaluate((c) =>
    [...c.querySelectorAll('*')].filter((e) => {
      const m = getComputedStyle(e).color.match(/\d+/g)!.map(Number)
      return m[0] > 150 && m[0] > 2 * m[1] && m[0] > 2 * m[2]
    }).length,
  )
  expect(reds).toBe(0)
})

test('the next day starts empty after Fajr; the days already counted stay', async ({ page }) => {
  await setup(page, '2026-10-23T06:30:00+03:00', { full: ['2026-10-20', '2026-10-22'], day: '2026-10-22', prayed: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] })
  await page.goto('/today/goals?lang=ar')
  for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) await expect(tick(page, p)).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.dt-prayed-count')).toHaveText('صلّيت الخمس كاملة في يومين')
  await tick(page, 'fajr').click()
  expect(await stored(page)).toEqual({ full: ['2026-10-20', '2026-10-22'], day: '2026-10-23', prayed: ['fajr'] })
})

test('Isha marked after midnight, before Fajr, completes the day before', async ({ page }) => {
  await setup(page, '2026-10-23T00:40:00+03:00', { full: [], day: '2026-10-22', prayed: ['fajr', 'dhuhr', 'asr', 'maghrib'] })
  await page.goto('/today/goals?lang=ar')
  await expect(tick(page, 'maghrib')).toHaveAttribute('aria-checked', 'true')
  await tick(page, 'isha').click()
  await expect(page.locator('.dt-prayed-count')).toHaveText('صلّيت الخمس كاملة في يوم واحد')
  expect((await stored(page)).full).toEqual(['2026-10-22'])
})

test('hidden from «عدّل الأهداف» and brought back from «أضف هدفًا», its count kept', async ({ page }) => {
  await setup(page, '2026-10-22T13:00:00+03:00', { full: ['2026-10-01', '2026-10-02', '2026-10-03'], day: '2026-10-22', prayed: ['fajr'] })
  await page.goto('/today/goals?lang=ar')
  await expect(page.locator('.dt-prayed-count')).toHaveText('صلّيت الخمس كاملة في ٣ أيام')
  await page.getByRole('button', { name: ar.editGoals }).click()
  await page.getByRole('button', { name: `أخفِ: ${ar.prayedTitle}` }).click()
  await expect(page.locator('section.dt-prayed')).toHaveCount(0)
  expect((await stored(page)).hidden).toBe(true)
  await page.reload()
  await expect(page.locator('section.dt-prayed')).toHaveCount(0)
  await page.getByRole('button', { name: ar.addGoal }).click()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: ar.prayedTitle }).click()
  await expect(page.locator('.dt-prayed-count')).toHaveText('صلّيت الخمس كاملة في ٣ أيام')
  await expect(tick(page, 'fajr')).toHaveAttribute('aria-checked', 'true')
  expect((await stored(page)).hidden).toBeUndefined()
})

for (const [lang, w] of [
  ['ar', 390],
  ['en', 390],
  ['ur', 320],
  ['bn', 320],
] as const)
  test(`the card passes the page check in ${lang} at ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 760 })
    await setup(page, '2026-10-22T13:00:00+03:00', { full: ['2026-10-01'], day: '2026-10-22', prayed: ['fajr', 'dhuhr'] })
    await page.goto(`/today/goals?lang=${lang}`)
    const s = TODAY[lang]
    await expect(page.locator('.dt-prayed h2')).toHaveText(s.prayedTitle)
    await expect(page.getByRole('checkbox', { name: s.prayedOne.replace('{prayer}', s.prayers.fajr) })).toHaveAttribute('aria-checked', 'true')
    const r = await page.evaluate(() => {
      const out: string[] = []
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontal scroll ${document.documentElement.scrollWidth}`)
      for (const e of document.querySelectorAll('.dt-prayed *')) {
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
        if (own && parseFloat(getComputedStyle(e).fontSize) < 12.99) out.push(`text ${getComputedStyle(e).fontSize}`)
        const b = e.getBoundingClientRect()
        if (e.tagName === 'BUTTON' && (b.width < 43.5 || b.height < 43.5)) out.push(`target ${Math.round(b.width)}x${Math.round(b.height)}`)
        // A label inside its button: nothing spills out of the card.
        const c = document.querySelector('.dt-prayed')!.getBoundingClientRect()
        if (b.left < c.left - 0.5 || b.right > c.right + 0.5) out.push(`outside the card «${e.textContent}»`)
      }
      // The five in one row at 390 px.
      const tops = new Set([...document.querySelectorAll('.dt-prayed-tick')].map((e) => Math.round(e.getBoundingClientRect().top)))
      if (window.innerWidth >= 390 && tops.size !== 1) out.push(`rows ${tops.size}`)
      return out
    })
    expect(r).toEqual([])
  })
