import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// Reply 0031-add16 §1: «آية وحديث اليوم». The ayah comes from data/daily-ayat.json (the Beautiful Names' Quran evidence
// and the ayat beginning with «رَبَّنَا»), one a day: (the Riyadh day − the epoch day) mod N. Shown as on the board
// (CardAfter): the ayah, its reference «sura · number · Makki/Madani», then «التفسير» (the ayah's page, al-Muyassar
// first) and «استمع». The date is stubbed with the page clock; /api/today is stubbed with hadith 6337 (tier 1, «صحيح»,
// under root 3 «العقيدة») because D1's seq is renumbered separately (data/processed/hadith-day.sql).
// The ayah is never cut or clamped (CLAUDE.md §3 rule 4): when the paper is short the hadith gives up lines, both take
// a smaller size, and then the paper scrolls; checked for every ayah of the list at 390 and 360 px.
// Previews only: BASE_URL=http://localhost:8831 npx playwright test v2-add16-day --project=mobile
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')

type Entry = { id: string; sura: number; aya: number; ref: string; sources: string[] }
const DAILY = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/daily-ayat.json'), 'utf8')) as { epoch: string; ayat: Entry[] }
const DAY = 86_400_000
const EPOCH = Date.parse(`${DAILY.epoch}T00:00:00Z`) / DAY
/** Noon in Riyadh (09:00 UTC) on the list's day `i`. */
const dayOf = (i: number) => new Date((EPOCH + i) * DAY + 9 * 3600_000)
const indexAt = (t: number) => {
  const n = DAILY.ayat.length
  const d = Math.floor((t + 3 * 3600_000) / DAY) - EPOCH
  return ((d % n) + n) % n
}
const at = (id: string) => DAILY.ayat.findIndex((x) => x.id === id)
const HADITH = '6337'

/** Stub /api/today with hadith 6337 in the page's language (or none), as the server sends it. */
async function stubToday(page: Page, lang: string, none = false) {
  const h = none ? null : await (await page.request.get(`/api/hadith/${HADITH}?lang=${lang}`)).json()
  await page.route('**/api/today*', (r) => r.fulfill({ json: { day: '2026-10-13', hadith: h } }))
}

/** D1's text of an ayah, as /api/passage serves it. */
const passageText = async (page: Page, id: string) => ((await (await page.request.get(`/api/passage/${id}`)).json()) as { text: string }).text

/** The ayah as the card shows it, and whether everything on the paper can be reached. The ayah is never cut (reply
 *  0031-add16 §1, CLAUDE.md §3 rule 4): no line clamp (which drops the last letters of its last line for its «…»), not
 *  clipped, its text D1's whole (the ayah-end mark after it is ornament). `reach`: the last thing on the paper (the
 *  hadith's grade line, or the buttons when the ayah is alone) below the paper's foot, the paper scrolled to its end
 *  when, and only when, it scrolls. */
const shown = (page: Page) =>
  page.evaluate(() => {
    const p = document.querySelector<HTMLElement>('.dc-paper')!
    const a = document.querySelector<HTMLElement>('.dc-ayah')!
    const h = document.querySelector<HTMLElement>('.dc-hadith-text')
    const end = document.querySelector<HTMLElement>('.dc-end') ?? document.querySelector<HTMLElement>('.dc-pills')!
    const fit = p.dataset.fit ?? ''
    const top = p.scrollTop
    if (fit.includes('scroll')) p.scrollTop = p.scrollHeight
    const reach = Math.ceil(end.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom)
    p.scrollTop = top
    return {
      fit,
      paperOverflow: getComputedStyle(p).overflowY,
      cut: a.hasAttribute('data-cut'),
      clamp: getComputedStyle(a).webkitLineClamp,
      clipped: a.scrollHeight - a.clientHeight,
      text: a.textContent ?? '',
      reach,
      ayahSize: parseFloat(getComputedStyle(a).fontSize),
      hadithSize: h ? parseFloat(getComputedStyle(h).fontSize) : 0,
    }
  })

/** Two frames: the card refits in a frame after a resize. */
const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

/** Everything the rule requires of the card for one ayah at the current width. */
function expectWhole(s: Awaited<ReturnType<typeof shown>>, text: string, where: string) {
  expect(s.cut, where).toBe(false)
  expect(s.clamp, where).toBe('none')
  expect(s.clipped, where).toBeLessThanOrEqual(0)
  expect(s.text.startsWith(text.trimEnd()), where).toBe(true)
  expect(s.reach, where).toBeLessThanOrEqual(0)
  expect(s.paperOverflow, where).toBe(s.fit.includes('scroll') ? 'auto' : 'hidden')
  if (s.hadithSize) expect(s.ayahSize, where).toBeGreaterThan(s.hadithSize)
}

async function open(page: Page, lang: string, i: number, none = false) {
  await stubToday(page, lang, none)
  await page.clock.setFixedTime(dayOf(i))
  await page.goto(`/?lang=${lang}&theme=light`)
  const card = page.locator('article.day-card')
  await expect(card.locator('.dc-ayah')).toBeVisible()
  if (!none) await expect(card.locator('.dc-hadith')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  return card
}

/** Bottom of an element relative to the card's paper (≤ 0: inside it). */
const below = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const p = document.querySelector('.dc-paper')!.getBoundingClientRect()
    return document.querySelector(s)!.getBoundingClientRect().bottom - p.bottom
  }, sel)

test.describe('the ayah of the day (reply 0031-add16 §1)', () => {
  test('the list is the rule: 67 ayat, «دليل اسم» and «دعاء», one a day from the epoch', () => {
    expect(DAILY.epoch).toBe('2026-10-13')
    expect(DAILY.ayat.length).toBe(67)
    expect(DAILY.ayat.filter((x) => x.sources.includes('دليل اسم')).length).toBe(52)
    expect(DAILY.ayat.filter((x) => x.sources.includes('دعاء')).length).toBe(16)
    expect(indexAt(dayOf(0).getTime())).toBe(0)
    expect(indexAt(dayOf(-1).getTime())).toBe(66)
  })

  test('the card on a stubbed date: the list ayah, its reference as on the board, «التفسير» then «استمع», the title «آية وحديث اليوم»', async ({ page }) => {
    const media: string[] = []
    page.on('request', (r) => /mp3quran\.net/.test(r.url()) && media.push(r.url()))
    const i = at('quran:2:32')
    const card = await open(page, 'ar', i)
    const passage = (await (await page.request.get('/api/passage/quran:2:32')).json()) as { text: string }
    await expect(card.locator('.dc-title')).toHaveText('آية وحديث اليوم')
    const ayah = card.locator('.dc-ayah')
    await expect(ayah).toHaveAttribute('data-ayah', DAILY.ayat[i].id)
    // The text is D1's, verbatim (the ayah-end mark after it is ornament).
    expect(await ayah.textContent()).toContain(passage.text.split(' ').slice(0, 4).join(' '))
    await expect(card.locator('.dc-ref')).toHaveText('البقرة · ٣٢ · مدنية')
    // «التفسير» then «استمع», in this order, as on the board; nothing from mp3quran before a press.
    const pills = card.locator('.dc-pills button')
    await expect(pills).toHaveCount(2)
    await expect(pills.nth(0)).toHaveText('التفسير')
    await expect(pills.nth(1)).toHaveText('استمع')
    expect(media).toEqual([])
    // A short ayah: whole, at the board's size, and the hadith's grade line inside the paper.
    const s = await shown(page)
    expectWhole(s, passage.text, '2:32 at 390')
    expect(s.fit).toBe('')
    expect(await below(page, '.dc-end')).toBeLessThanOrEqual(0)
    await expect(card.locator('a.dc-hadith')).toHaveAttribute('href', `/hadith/${HADITH}`)
  })

  test('«التفسير» opens the ayah page with al-Muyassar shown first', async ({ page }) => {
    const card = await open(page, 'ar', at('quran:2:32'))
    const passage = (await (await page.request.get('/api/passage/quran:2:32')).json()) as { tafsir: { key: string; text: string }[] }
    const muyassar = passage.tafsir.find((x) => x.key === 'muyassar')!.text
    await card.getByRole('button', { name: 'التفسير' }).click()
    await expect(page).toHaveURL(/\/quran\/2\/32(\?|$)/)
    const sheet = page.locator('dialog[open]')
    await expect(sheet.locator('#muyassar-text')).toBeVisible()
    await expect(sheet.locator('#muyassar-text')).toContainText(muyassar.split(' ').slice(0, 6).join(' '))
    await expect(sheet.getByRole('button', { name: 'الميسر', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('the real date: the card shows the list entry for today in Riyadh', async ({ page }) => {
    await stubToday(page, 'ar')
    await page.goto('/?lang=ar&theme=light')
    const id = DAILY.ayat[indexAt(Date.now())].id
    await expect(page.locator('article.day-card .dc-ayah')).toHaveAttribute('data-ayah', id)
    await expect(page.locator('article.day-card .dc-title')).toHaveText('آية وحديث اليوم')
  })

  test('a long ayah (2:255) is shown whole, never cut: the smaller size, the hadith at two lines, then the paper scrolls', async ({ page }) => {
    const card = await open(page, 'ar', at('quran:2:255'))
    const text = await passageText(page, 'quran:2:255')
    await expect(card.locator('.dc-title')).toHaveText('آية وحديث اليوم')
    const s = await shown(page)
    // D1's whole text on the card, «وَمَا خَلْفَهُمْ» included (a line clamp once showed «خَلْفَهُ…»).
    expectWhole(s, text, '2:255 at 390')
    expect(s.text).toContain('وَمَا خَلْفَهُمْ')
    // At 390 px the smaller size and the hadith at two lines are not enough: the paper scrolls rather than cut.
    expect(s.fit).toBe('small scroll')
    expect(await card.locator('.dc-hadith-text').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))).toBe(2)
    await card.locator('a.dc-zone').first().click()
    await expect(page).toHaveURL(/\/quran\/2\/255(\?|$)/)
  })

  test('every ayah of the list, at 390 and 360 px: whole and as stored, never cut, the grade line within reach', async ({ page }) => {
    test.setTimeout(20 * 60_000)
    await stubToday(page, 'ar')
    const count: Record<string, Record<string, number>> = { 390: {}, 360: {} }
    for (const [i, x] of DAILY.ayat.entries()) {
      const text = await passageText(page, x.id)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.clock.setFixedTime(dayOf(i))
      await page.goto(`/?lang=ar&theme=light`)
      await expect(page.locator('article.day-card .dc-ayah')).toHaveAttribute('data-ayah', x.id)
      await expect(page.locator('article.day-card .dc-hadith')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await frames(page)
      for (const width of [390, 360]) {
        if (width !== 390) {
          await page.setViewportSize({ width, height: 780 })
          await frames(page)
        }
        const s = await shown(page)
        expectWhole(s, text, `${x.ref} at ${width}`)
        count[width][s.fit || 'board size'] = (count[width][s.fit || 'board size'] ?? 0) + 1
      }
    }
    // For the report: how many days each width needs the smaller size or the scrolling paper.
    console.log(`daily card fit over ${DAILY.ayat.length} ayat: ${JSON.stringify(count)}`)
  })

  test('no hadith today: «آية اليوم» alone, the long ayah with its buttons inside the paper', async ({ page }) => {
    const card = await open(page, 'ar', at('quran:2:255'), true)
    await expect(card.locator('.dc-title')).toHaveText('آية اليوم')
    await expect(card.locator('.dc-hadith')).toHaveCount(0)
    expect(await below(page, '.dc-pills')).toBeLessThanOrEqual(0)
    expectWhole(await shown(page), await passageText(page, 'quran:2:255'), '2:255 alone at 390')
  })

  test('English: the title, the reference and the two buttons in the reader’s language', async ({ page }) => {
    const card = await open(page, 'en', at('quran:2:32'))
    await expect(card.locator('.dc-title')).toHaveText('Ayah and hadith of the day')
    await expect(card.locator('.dc-ref')).toHaveText('Surah 2 · 32 · Madani')
    const pills = card.locator('.dc-pills button')
    await expect(pills.nth(0)).toHaveText('Tafsir')
    await expect(pills.nth(1)).toHaveText('Listen')
  })
})
