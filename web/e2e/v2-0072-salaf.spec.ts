import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import data from '../../data/salaf-daily.json' with { type: 'json' }

// «من أقوال السلف» on the home page (reply 0072 item 11; add-on 0072-add4): one card a day by the Riyadh date, under
// «يومك» after «اسم من أسماء الله», in the Arabic interface only. By a fixed clock: day 0 (1 January 2026) is a
// «يُروى عن» card (1, عمر بن الخطاب), day 5 a «قال» card (8, طلق بن حبيب), day 21 the gloss (23), day 10 «المَلِك»
// (13). The source line «الكتاب» لمؤلفه، ج…، ص… (add-on 0072-add7 §3.4). At 390 and 320, at 100% and 135% text: the card whole and nothing of it cut; the link a 44 px target opening
// outside; the English interface without the card. The card needs no server: its words are data/salaf-daily.json's.
//   npx vite preview --port 4193 && BASE_URL=http://127.0.0.1:4193 npx playwright test e2e/v2-0072-salaf.spec.ts --project=mobile
// SHOTS=<dir> also saves the card at 390 (ar, by day and with the phone on dark: the app is day only, reply 0043-add7)
// and the English home without it.
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')

type Card = (typeof data.cards)[number]
const SHOTS = process.env.SHOTS ?? ''
const HEIGHT: Record<number, number> = { 390: 844, 320: 568 }
/** Noon in Riyadh, `d` days after the rotation's epoch. */
const dayAt = (d: number) => new Date(Date.parse(`${data.epoch}T09:00:00Z`) + d * 86_400_000)
const cardOf = (n: number) => data.cards.find((c) => c.n === n) as Card

async function open(page: Page, lang: string, width: number, day: number, scale?: string, dark = false) {
  await page.setViewportSize({ width, height: HEIGHT[width] ?? 844 })
  if (dark) await page.emulateMedia({ colorScheme: 'dark' })
  if (scale) await page.addInitScript((x) => document.addEventListener('DOMContentLoaded', () => document.documentElement.style.setProperty('font-size', x, 'important')), scale)
  await page.clock.setFixedTime(dayAt(day))
  await page.goto(`/?lang=${lang}${dark ? '' : '&theme=light'}`)
  await expect(page.locator('.dt-today')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

/** Every element of the card inside the card, and no text wider or taller than its box. */
async function cutOf(page: Page) {
  return page.getByTestId('salaf-day').evaluate((card) => {
    const out: string[] = []
    const box = card.getBoundingClientRect()
    if (box.left < -0.5 || box.right > window.innerWidth + 0.5) out.push(`card out of the screen ${box.left}–${box.right}`)
    for (const el of card.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect()
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5) out.push(`${el.className || el.tagName} out of the card`)
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') out.push(`${el.className || el.tagName} wider than its box`)
      if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY === 'hidden') out.push(`${el.className || el.tagName} cut at the bottom`)
    }
    return out
  })
}

async function shoot(page: Page, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const card = page.getByTestId('salaf-day')
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.width, height: 2600 })
  await card.scrollIntoViewIfNeeded()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await card.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await page.setViewportSize(size)
}

async function checkCard(page: Page, c: Card) {
  const card = page.getByTestId('salaf-day')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-n', String(c.n))
  await expect(card.locator('.sl-title')).toHaveText('من أقوال السلف')
  await expect(card.locator('.sl-topic')).toHaveText(c.topic)
  await expect(card.locator('.sl-text')).toHaveText(c.text)
  await expect(card.locator('.sl-sayer')).toHaveText(`${c.attribution === 'yurwa' ? 'يُروى عن' : 'قال'} ${c.sayer}`)
  // The book with its author, then the volume and page (add-on 0072-add7 §3.4), then the link.
  await expect(card.locator('.sl-source')).toHaveText(`«${c.book_title}» ${c.author_by}، ${c.vol_page.replace(' - ', '، ')}`)
  const link = card.locator('a.sl-link')
  await expect(link).toHaveAttribute('href', c.url)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  const lb = (await link.boundingBox())!
  expect(lb.height).toBeGreaterThanOrEqual(44)
  // The saying in the text face and the page's text ink; no motion.
  const st = await card.locator('.sl-text').evaluate((el) => {
    const s = getComputedStyle(el)
    const root = getComputedStyle(document.documentElement)
    return { font: s.fontFamily, color: s.color, ink: root.getPropertyValue('--text').trim(), anim: getComputedStyle(el.closest('section')!).animationName, tr: getComputedStyle(el.closest('section')!).transitionDuration }
  })
  expect(st.font).toContain('Amiri')
  expect(st.color).toBe('rgb(29, 25, 20)')
  expect(st.ink).toBe('#1d1914')
  expect(st.anim).toBe('none')
  expect(st.tr).toBe('0s')
  // Under «يومك», after «اسم من أسماء الله» when that card is there.
  const order = await page.evaluate(() => {
    const t = document.querySelector('.dt-today')!
    const s = document.querySelector('[data-testid="salaf-day"]')!
    const n = document.querySelector('[data-testid="name-day"]')
    const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    return { underToday: after(t, s), afterName: n ? after(n, s) : true }
  })
  expect(order).toEqual({ underToday: true, afterName: true })
}

for (const width of [390, 320]) {
  test(`ar at ${width}: a «يُروى عن» day (1 January, card 1)`, async ({ page }) => {
    await open(page, 'ar', width, 0)
    await checkCard(page, cardOf(1))
    await expect(page.getByTestId('salaf-day').locator('.sl-source')).toHaveText('«الزهد» للإمام أحمد بن حنبل، ص99')
    expect(await cutOf(page)).toEqual([])
    if (width === 390) await shoot(page, 'yurwa-1-390-day.png')
  })

  test(`ar at ${width}: a «قال» day (6 January, card 8)`, async ({ page }) => {
    await open(page, 'ar', width, 5)
    await checkCard(page, cardOf(8))
    expect(await cutOf(page)).toEqual([])
    if (width === 390) await shoot(page, 'qala-8-390-day.png')
    // The card in its place on the home page, down to its end.
    if (width === 390 && SHOTS) {
      const end = await page.getByTestId('salaf-day').evaluate((el) => el.getBoundingClientRect().bottom + (document.querySelector('.scroll')?.scrollTop ?? 0))
      await page.setViewportSize({ width, height: Math.ceil(end) + 200 })
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      await page.screenshot({ path: path.join(SHOTS, 'ar-home-390-day.png'), clip: { x: 0, y: 0, width, height: Math.ceil(end) + 14 } })
    }
  })

  test(`ar at ${width}: the gloss lighter (card 23) and «المَلِك» (card 13)`, async ({ page }) => {
    await open(page, 'ar', width, 21)
    await checkCard(page, cardOf(23))
    const gloss = page.getByTestId('salaf-day').locator('.sl-gloss')
    await expect(gloss).toHaveText('-يعني: كتبه-')
    expect(await gloss.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(107, 97, 83)')
    if (width === 390) await shoot(page, 'gloss-23-390-day.png')
    await page.clock.setFixedTime(dayAt(10))
    await page.reload()
    await checkCard(page, cardOf(13))
    expect(await cutOf(page)).toEqual([])
    if (width === 390) await shoot(page, 'malik-13-390-day.png')
  })

  for (const scale of ['130%', '135%'])
    test(`ar at ${width}, text ${scale}: the longest saying whole (card 11)`, async ({ page }) => {
      await open(page, 'ar', width, 8, scale)
      expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe(scale)
      await checkCard(page, cardOf(11))
      expect(await cutOf(page)).toEqual([])
    })

  test(`en at ${width}: the home page without the card`, async ({ page }) => {
    await open(page, 'en', width, 5)
    await expect(page.locator('.dt-today h2')).toBeVisible()
    await expect(page.getByTestId('salaf-day')).toHaveCount(0)
    await expect(page.locator('.sl-card')).toHaveCount(0)
    await expect(page.getByText('من أقوال السلف')).toHaveCount(0)
    if (width === 390 && SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true })
      const end = await page.locator('.dt-today').evaluate((el) => el.getBoundingClientRect().bottom + (document.querySelector('.scroll')?.scrollTop ?? 0))
      await page.setViewportSize({ width, height: Math.ceil(end) + 400 })
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      await page.screenshot({ path: path.join(SHOTS, 'en-home-390-hidden.png'), fullPage: false })
    }
  })
}

test('ar at 390 with the phone on dark: the same day look (the app is day only, reply 0043-add7)', async ({ page }) => {
  await open(page, 'ar', 390, 5, undefined, true)
  await checkCard(page, cardOf(8))
  expect(await cutOf(page)).toEqual([])
  await shoot(page, 'qala-8-390-dark.png')
  await page.clock.setFixedTime(dayAt(0))
  await page.reload()
  await checkCard(page, cardOf(1))
  await shoot(page, 'yurwa-1-390-dark.png')
})
