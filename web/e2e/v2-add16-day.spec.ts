import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// Reply 0031-add16 §1: «آية وحديث اليوم». The ayah comes from data/daily-ayat.json (the Beautiful Names' Quran evidence
// and the ayat beginning with «رَبَّنَا»), one a day: (the Riyadh day − the epoch day) mod N. Shown as on the board
// (CardAfter): the ayah, its reference «sura · number · Makki/Madani», then «التفسير» (the ayah's page, al-Muyassar
// first) and «استمع». The date is stubbed with the page clock; /api/today is stubbed with hadith 6337 (tier 1, «صحيح»,
// under root 3 «العقيدة») because D1's seq is renumbered separately (data/processed/hadith-day.sql).
// Reply 0071 §3 (add-on 0071-add2 §1): the date, «آية اليوم» and «حديث اليوم», three cards. The ayah is never cut or
// clamped (CLAUDE.md §3 rule 4): its card grows with it; checked for every ayah of the list at 390 and 360 px.
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

/** The ayah as its card shows it (reply 0071 §3: the date, «آية اليوم» and «حديث اليوم», three cards). The ayah is never
 *  cut (reply 0031-add16 §1, CLAUDE.md §3 rule 4): no line clamp (which drops the last letters of its last line for its
 *  «…»), not clipped, its text D1's whole (the ayah-end mark after it is ornament); its card grows with it, so `reach`
 *  (its buttons' foot below the card's) is never positive. */
const shown = (page: Page) =>
  page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('article.dc-ayah-card')!
    const a = card.querySelector<HTMLElement>('.dc-ayah')!
    const h = document.querySelector<HTMLElement>('article.dc-hadith-card .dc-hadith-text')
    const end = card.querySelector<HTMLElement>('.dc-pills')!
    return {
      overflow: getComputedStyle(card).overflowY,
      cut: a.hasAttribute('data-cut'),
      clamp: getComputedStyle(a).webkitLineClamp,
      clipped: a.scrollHeight - a.clientHeight,
      text: a.textContent ?? '',
      reach: Math.ceil(end.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom),
      ayahSize: parseFloat(getComputedStyle(a).fontSize),
      hadithSize: h ? parseFloat(getComputedStyle(h).fontSize) : 0,
    }
  })

/** Two frames: the cards settle in a frame after a resize. */
const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

/** Everything the rule requires of the ayah's card for one ayah at the current width. */
function expectWhole(s: Awaited<ReturnType<typeof shown>>, text: string, where: string) {
  expect(s.cut, where).toBe(false)
  expect(s.clamp, where).toBe('none')
  expect(s.clipped, where).toBeLessThanOrEqual(0)
  expect(s.text.startsWith(text.trimEnd()), where).toBe(true)
  expect(s.reach, where).toBeLessThanOrEqual(0)
  expect(s.overflow, where).not.toBe('auto')
  if (s.hadithSize) expect(s.ayahSize, where).toBeGreaterThan(s.hadithSize)
}

/** The home page on the list's day `i`: the ayah's card, and the hadith's card (or none). */
async function open(page: Page, lang: string, i: number, none = false) {
  await stubToday(page, lang, none)
  await page.clock.setFixedTime(dayOf(i))
  await page.goto(`/?lang=${lang}&theme=light`)
  const card = page.locator('article.dc-ayah-card')
  const hadith = page.locator('article.dc-hadith-card')
  await expect(card.locator('.dc-ayah')).toBeVisible()
  if (!none) await expect(hadith.locator('.dc-hadith')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  return { card, hadith }
}

test.describe('the ayah of the day (reply 0031-add16 §1)', () => {
  test('the list is the rule: 67 ayat, «دليل اسم» and «دعاء», one a day from the epoch', () => {
    expect(DAILY.epoch).toBe('2026-10-13')
    expect(DAILY.ayat.length).toBe(67)
    expect(DAILY.ayat.filter((x) => x.sources.includes('دليل اسم')).length).toBe(52)
    expect(DAILY.ayat.filter((x) => x.sources.includes('دعاء')).length).toBe(16)
    expect(indexAt(dayOf(0).getTime())).toBe(0)
    expect(indexAt(dayOf(-1).getTime())).toBe(66)
  })

  test('the cards on a stubbed date: the list ayah, its reference as on the board, «التفسير» then «استمع»; «آية اليوم» and «حديث اليوم» each a card', async ({ page }) => {
    const media: string[] = []
    page.on('request', (r) => /mp3quran\.net/.test(r.url()) && media.push(r.url()))
    const i = at('quran:2:32')
    const { card, hadith } = await open(page, 'ar', i)
    const passage = (await (await page.request.get('/api/passage/quran:2:32')).json()) as { text: string }
    await expect(card.locator('.dc-title')).toHaveText('آية اليوم')
    await expect(hadith.locator('.dc-title')).toHaveText('حديث اليوم')
    const ayah = card.locator('.dc-ayah')
    await expect(ayah).toHaveAttribute('data-ayah', DAILY.ayat[i].id)
    // The text is D1's, verbatim (the ayah-end mark after it is ornament).
    expect(await ayah.textContent()).toContain(passage.text.split(' ').slice(0, 4).join(' '))
    await expect(card.locator('.dc-ref')).toHaveText('البقرة · ٣٢ · مدنية')
    // «التفسير», and the one listen button under the ayah (add-on 0072-add14); nothing from mp3quran before a press.
    await expect(card.locator('.dc-pill')).toHaveText('التفسير')
    await expect(card.locator('.hear-btn')).toHaveText(['استمع'])
    expect(media).toEqual([])
    expectWhole(await shown(page), passage.text, '2:32 at 390')
    // The hadith's grade line inside its own card, and its link to the hadith's page.
    expect(await hadith.evaluate((c) => Math.ceil(c.querySelector('.dc-end')!.getBoundingClientRect().bottom - c.getBoundingClientRect().bottom))).toBeLessThanOrEqual(0)
    await expect(hadith.locator('a.dc-hadith')).toHaveAttribute('href', `/hadith/${HADITH}`)
  })

  test('«التفسير» opens the ayah page with al-Muyassar shown first', async ({ page }) => {
    const { card } = await open(page, 'ar', at('quran:2:32'))
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
    await expect(page.locator('article.dc-ayah-card .dc-ayah')).toHaveAttribute('data-ayah', id)
    await expect(page.locator('article.dc-ayah-card .dc-title')).toHaveText('آية اليوم')
  })

  test('a long ayah (2:255) is shown whole, never cut: its card grows with it, and the hadith keeps a card of its own', async ({ page }) => {
    const { card, hadith } = await open(page, 'ar', at('quran:2:255'))
    const text = await passageText(page, 'quran:2:255')
    const s = await shown(page)
    // D1's whole text on the card, «وَمَا خَلْفَهُمْ» included (a line clamp once showed «خَلْفَهُ…»).
    expectWhole(s, text, '2:255 at 390')
    expect(s.text).toContain('وَمَا خَلْفَهُمْ')
    await expect(hadith.locator('.dc-hadith-text')).toBeVisible()
    await card.locator('a.dc-zone').first().click()
    await expect(page).toHaveURL(/\/quran\/2\/255(\?|$)/)
  })

  test('every ayah of the list, at 390 and 360 px: whole and as stored, never cut, its buttons within its card', async ({ page }) => {
    test.setTimeout(20 * 60_000)
    await stubToday(page, 'ar')
    for (const [i, x] of DAILY.ayat.entries()) {
      const text = await passageText(page, x.id)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.clock.setFixedTime(dayOf(i))
      await page.goto(`/?lang=ar&theme=light`)
      await expect(page.locator('article.dc-ayah-card .dc-ayah')).toHaveAttribute('data-ayah', x.id)
      await expect(page.locator('article.dc-hadith-card .dc-hadith')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await frames(page)
      for (const width of [390, 360]) {
        if (width !== 390) {
          await page.setViewportSize({ width, height: 780 })
          await frames(page)
        }
        expectWhole(await shown(page), text, `${x.ref} at ${width}`)
      }
    }
  })

  test('no hadith today: «آية اليوم» alone, the long ayah whole with its buttons inside its card', async ({ page }) => {
    const { card, hadith } = await open(page, 'ar', at('quran:2:255'), true)
    await expect(card.locator('.dc-title')).toHaveText('آية اليوم')
    await expect(hadith).toHaveCount(0)
    expectWhole(await shown(page), await passageText(page, 'quran:2:255'), '2:255 alone at 390')
  })

  test('English: the titles, the reference and the two buttons in the reader’s language', async ({ page }) => {
    const { card, hadith } = await open(page, 'en', at('quran:2:32'))
    await expect(card.locator('.dc-title')).toHaveText('Ayah of the day')
    await expect(hadith.locator('.dc-title')).toHaveText('Hadith of the day')
    await expect(card.locator('.dc-ref')).toHaveText('Surah 2 · 32 · Madani')
    // Outside Arabic, under the Arabic ayah: «Listen to the ayah» and «Listen to the meaning» (add-on 0072-add14 §4).
    await expect(card.locator('.dc-pill')).toHaveText('Tafsir')
    await expect(card.locator('.hear-btn')).toHaveText(['Listen to the ayah', 'Listen to the meaning'])
  })
})
