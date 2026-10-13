import { expect, test, type Locator, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }

// The answer screen of the second version (reply 0032 B; docs/V2_UI_SPEC.md §5-10): one test per modification
// (c04-c06, c08-c15, c18, c20, c21), and the page checks (no horizontal scroll, no text under 13 px, no target under
// 44 px). The answer is the fixture (fixtures/answer-kaaba.json), so no question reaches the model; the tafsir texts
// come from the preview's D1 through /api/passage.
//   BASE_URL=http://localhost:8811 npx playwright test e2e/v2-answer.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })
test.skip(({ isMobile }) => !isMobile, 'the answer screen is checked on the phone')

const STORE = 'muslim.sources.v1'

async function ask(page: Page, o: { lang?: string; tipSeen?: boolean; fresh?: boolean } = {}) {
  const lang = o.lang ?? 'ar'
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  if (o.fresh !== false)
    await page.addInitScript(
      ([key, seen]) => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem(key as string, JSON.stringify({ tipSeen: seen }))
          sessionStorage.setItem('seeded', '1')
        }
      },
      [STORE, o.tipSeen ?? true],
    )
  await page.goto(`/?lang=${lang}`)
  return again(page)
}
async function again(page: Page) {
  // On the home page the question box is the «اسأل» card (part B pages); in a conversation it is the composer.
  await page.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('button.send:visible').click()
  const card = page.locator('.turn').last().locator('article.card')
  await expect(card.locator('.v2-tbox').first()).toBeVisible()
  await expect(card.locator('.v2-chips').first()).toBeVisible({ timeout: 15_000 })
  return card
}
const chips = (card: Locator) => card.locator('[role=tabpanel]:visible .v2-chips button')
const box = async (l: Locator) => (await l.boundingBox())!

test('c04: the source buttons sit above the tafsir, under the ayah, not above it', async ({ page }) => {
  const card = await ask(page)
  const panel = card.locator('[role=tabpanel]:visible')
  const frame = await box(panel.locator('.frame'))
  const row = await box(panel.locator('.v2-chips'))
  const text = await box(panel.locator('.v2-tafsir-text'))
  expect(row.y).toBeGreaterThan(frame.y + frame.height)
  expect(text.y).toBeGreaterThan(row.y)
  await expect(panel.locator('.v2-tbox .v2-tbox-title')).toHaveText('التفسير')
})

test('c05: «الكل» is the last button in the same row; «الأنسب» first with a star', async ({ page }) => {
  const card = await ask(page)
  const c = chips(card)
  await expect(c).toHaveCount(3)
  await expect(c.last()).toHaveText('الكل')
  await expect(c.first()).toContainText('الأنسب')
  await expect(c.first().locator('svg')).toHaveCount(1)
  expect(Math.abs((await box(c.first())).y - (await box(c.last())).y)).toBeLessThan(2)
  await expect(c.first()).toHaveAttribute('aria-pressed', 'true')
})

test('c06: short names on the buttons, the full name in the source line', async ({ page }) => {
  const card = await ask(page)
  const c = chips(card)
  await expect(c.nth(0)).toHaveText(/^الميسر/)
  await expect(c.nth(1)).toHaveText('السعدي')
  await expect(card.locator('[role=tabpanel]:visible .v2-tbox .v2-srcline-name')).toHaveText('التفسير الميسر')
})

test('c07 (one source, no buttons): an ayah whose al-Saʿdi entry is empty shows al-Muyassar alone', async ({ page }) => {
  await page.route('**/api/passage/**', async (r) => {
    const res = await r.fetch()
    const j = await res.json()
    j.tafsir = (j.tafsir ?? []).map((x: { key: string }) => (x.key === 'saadi' ? { ...x, empty: true } : x))
    await r.fulfill({ json: j })
  })
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: 'ar' } }))
  await page.goto('/?lang=ar')
  // On the home page the question box is the «اسأل» card (part B pages); in a conversation it is the composer.
  await page.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('button.send:visible').click()
  const panel = page.locator('.turn').last().locator('[role=tabpanel]:visible')
  await expect(panel.locator('.v2-tafsir-text')).toBeVisible()
  await page.waitForTimeout(1200)
  await expect(panel.locator('.v2-chips')).toHaveCount(0)
})

test('c08: «للاستزادة» is a line of its own at the end, to the fatwa body, not a source button', async ({ page }) => {
  const card = await ask(page)
  const more = card.locator('.v2-more')
  await expect(more).toContainText('للاستزادة: فتاوى في الموضوع')
  await expect(more).toContainText('الرئاسة العامة للبحوث العلمية والإفتاء')
  await expect(more).toHaveAttribute('href', /alifta\.gov\.sa/)
  await expect(chips(card).filter({ hasText: 'للاستزادة' })).toHaveCount(0)
  expect((await box(more)).height).toBeGreaterThanOrEqual(44)
})

test('c09: a light source line under each part; tapping it opens «عن المصدر» with documented rows and the link', async ({ page }) => {
  const card = await ask(page)
  const panel = card.locator('[role=tabpanel]:visible')
  await expect(panel.locator('.v2-srcline').first()).toContainText('نص المصحف · المصحف الإلكتروني')
  await expect(panel.locator('.v2-srcline a')).toHaveCount(0)
  await panel.locator('.v2-tbox .v2-srcline').click()
  const sheet = page.locator('dialog.v2-sheet[open]')
  await expect(sheet.getByRole('heading', { name: 'عن المصدر' })).toBeVisible()
  await expect(sheet.locator('.v2-src-name')).toHaveText('التفسير الميسر')
  await expect(sheet.locator('.v2-src-row')).toHaveText([
    'إعدادنخبة من العلماء',
    'إصدارمجمع الملك فهد لطباعة المصحف الشريف، المدينة المنورة',
    'وصلنا عبرالمصحف الإلكتروني بجامعة الملك سعود',
    'كيف نعرضهكما هو في المصدر، بلا تعديل',
  ])
  await expect(sheet.getByRole('link', { name: 'افتح التفسير في موقعه' })).toHaveAttribute('href', /quran\.ksu\.edu\.sa/)
  await page.keyboard.press('Escape')
  // The Mushaf text: its own rows, and the original site in the sheet.
  await panel.locator('.v2-srcline').first().click()
  await expect(sheet.locator('.v2-src-name')).toHaveText('نص المصحف')
  await expect(sheet.getByRole('link', { name: 'افتح المصحف في موقعه' })).toHaveAttribute('href', /quran\.ksu\.edu\.sa/)
})

test('c10: no heading repeats the source name above the explanation', async ({ page }) => {
  const card = await ask(page)
  const tbox = card.locator('[role=tabpanel]:visible .v2-tbox')
  await expect(tbox.locator('.v2-tbox-title')).toHaveText('التفسير')
  await expect(tbox.getByText('التفسير الميسر', { exact: true })).toHaveCount(1) // the source line only
})

test('c11: «الكل» numbered, the first whole with «الأنسب», the others three lines with «اقرأ المزيد»', async ({ page }) => {
  const card = await ask(page)
  await chips(card).last().click()
  const items = card.locator('[role=tabpanel]:visible .v2-all-item')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0).locator('.v2-all-num')).toHaveText('١')
  await expect(items.nth(0)).toContainText('الأنسب')
  await expect(items.nth(1).locator('.v2-tafsir-text')).toHaveClass(/is-clamped/)
  const clamped = (await box(items.nth(1).locator('.v2-tafsir-text'))).height
  await items.nth(1).getByRole('button', { name: 'اقرأ المزيد' }).click()
  await expect(items.nth(1).locator('.v2-tafsir-text')).not.toHaveClass(/is-clamped/)
  expect((await box(items.nth(1).locator('.v2-tafsir-text'))).height).toBeGreaterThan(clamped)
  await expect(items.locator('.v2-srcline')).toHaveCount(2)
})

test('c12: the approved answer stays (level, verified, the text from the server) with the sources added', async ({ page }) => {
  const card = await ask(page)
  await expect(card.locator('.v2-ans-head .v2-pill').first()).toContainText('المستوى')
  await expect(card.locator('.v2-ans-head')).toContainText('مطابق للمصدر')
  await expect(card.getByRole('tab')).toHaveText(['قريش: ٣', 'البقرة: ١٤٤', 'المائدة: ٩٧'])
  await expect(card.locator('[role=tabpanel]:visible .sacred')).toContainText('فَلْيَعْبُدُوا')
  await expect(card.locator('[role=tabpanel]:visible .quote-meta .ref')).toHaveText('قريش: ٣')
  // al-Muyassar shown is the server's own text for the ayah.
  await expect(card.locator('[role=tabpanel]:visible .v2-tafsir-text')).toContainText(kaaba.quotes[0].tafsirExcerpt!.slice(0, 20))
})

test('c13: pinning per type in Settings, saved on the device; the pinned source comes first with a pin', async ({ page }) => {
  await ask(page)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  const settings = page.locator('dialog.sheet[open]')
  await expect(settings.getByRole('heading', { name: 'مصادر الإجابة' })).toBeVisible()
  await expect(settings.getByRole('heading', { name: 'القراءة' })).toBeVisible()
  await expect(settings.getByRole('heading', { name: 'التلاوة' })).toBeVisible()
  await settings.getByRole('button', { name: /تفسير الآيات/ }).click()
  const pin = page.locator('dialog.v2-sheet[open]')
  await pin.getByRole('radio', { name: /تفسير السعدي/ }).click()
  await expect(pin.getByRole('radio', { name: /تفسير السعدي/ })).toHaveAttribute('aria-checked', 'true')
  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), STORE))!).pins.tafsir).toBe('saadi')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(settings.getByRole('button', { name: /شرح الأحاديث/ })).toHaveCount(0)
  const card = await again(page)
  const c = chips(card)
  await expect(c.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await expect(c.nth(1).locator('.v2-pinmark')).toBeVisible()
  await expect(c.nth(0)).toContainText('الأنسب')
})

test('c14: choosing the same non-best source in two answers suggests pinning it once; «لا» stops it', async ({ page }) => {
  let card = await ask(page)
  await chips(card).nth(1).click()
  await expect(card.locator('.v2-suggest')).toHaveCount(0)
  card = await again(page)
  await chips(card).nth(1).click()
  const sug = card.locator('[role=tabpanel]:visible .v2-suggest')
  await expect(sug).toContainText('تبغى السعدي أول دائمًا؟')
  await sug.getByRole('button', { name: 'لا' }).click()
  await expect(card.locator('.v2-suggest')).toHaveCount(0)
  card = await again(page)
  await chips(card).nth(1).click()
  await expect(card.locator('.v2-suggest')).toHaveCount(0)
})

test('c15: the pin sheet is one list, rows of 56, saved at once without «حفظ», with the note under it', async ({ page }) => {
  await ask(page)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.locator('dialog.sheet[open]').getByRole('button', { name: /تفسير الآيات/ }).click()
  const pin = page.locator('dialog.v2-sheet[open]')
  await expect(pin.getByRole('heading', { name: 'مصدر التفسير' })).toBeVisible()
  const rows = pin.getByRole('radio')
  await expect(rows).toHaveCount(4)
  for (let i = 0; i < 4; i++) expect((await box(rows.nth(i))).height).toBeGreaterThanOrEqual(56)
  await expect(rows.first()).toHaveAttribute('aria-checked', 'true')
  await expect(pin.getByRole('button', { name: /حفظ/ })).toHaveCount(0)
  await expect(pin).toContainText('ينحفظ اختيارك على طول. ولشرح الأحاديث اختيار مستقل في الإعدادات.')
  await rows.last().click()
  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), STORE))!).pins.tafsir).toBe('all')
})

test('c18: text of 13 or more, targets of 44 or more, and at most one filled button on the card', async ({ page }) => {
  const card = await ask(page)
  const filled = await card.locator('.v2-ans-card button, .v2-ans-card a').evaluateAll((els) => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    const toRgb = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
    }
    return els.filter((e) => (e as HTMLElement).offsetParent && getComputedStyle(e).backgroundColor === toRgb(primary)).length
  })
  expect(filled).toBeLessThanOrEqual(1)
  await pageChecks(page)
})

test('c20: the first-time tip shows once on the first answer with several sources, and never again', async ({ page }) => {
  const card = await ask(page, { tipSeen: false })
  const tip = card.locator('.v2-tip')
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('مصادر الشرح')
  await expect(tip).toContainText('يطلع هذا مرة وحدة')
  await expect(card.locator('.v2-chips.is-spot')).toBeVisible()
  await tip.getByRole('button', { name: 'فهمت' }).click()
  await expect(tip).toHaveCount(0)
  await page.reload()
  const next = await again(page)
  await page.waitForTimeout(500)
  await expect(next.locator('.v2-tip')).toHaveCount(0)
})

test('c21: at 130% text the page still fits: buttons wrap, nothing is cut, no horizontal scroll', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '130%'))
  })
  const card = await ask(page)
  await chips(card).last().click()
  await pageChecks(page, 1.3)
  for (const b of await chips(card).all()) {
    const r = await box(b)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width).toBeLessThanOrEqual(390)
  }
})

test('the phone on dark: the answer and its sheets keep the day tokens (reply 0043-add7)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const card = await ask(page)
  const bg = await card.locator('.v2-ans-card').evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
  await card.locator('[role=tabpanel]:visible .v2-tbox .v2-srcline').click()
  const sheetBg = await page.locator('dialog.v2-sheet[open]').evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(sheetBg).toBe('rgb(255, 255, 255)')
})

/** No horizontal scroll; no readable text under 13 px (× scale); no button or link under 44 px in the conversation. */
async function pageChecks(page: Page, scale = 1) {
  const r = await page.evaluate((s) => {
    const doc = document.documentElement
    const scroll = document.querySelector('.scroll') as HTMLElement
    const small: string[] = []
    const tiny: string[] = []
    const root = document.querySelector('.turns') as HTMLElement
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!
      if (!n.textContent!.trim() || !el.offsetParent || el.closest('svg, .mkp, .ayah-num, .v2-all-num, .sr-only, [aria-hidden="true"]')) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs < 13 * s - 0.01) small.push(`${fs}px «${n.textContent!.trim().slice(0, 30)}»`)
    }
    for (const el of root.querySelectorAll('button, a')) {
      const h = el as HTMLElement
      if (!h.offsetParent || h.closest('.cite')) continue
      const b = h.getBoundingClientRect()
      if (b.height < 43.5 || b.width < 43.5) tiny.push(`${Math.round(b.width)}x${Math.round(b.height)} «${h.textContent!.trim().slice(0, 30)}»`)
    }
    return { hscroll: doc.scrollWidth > doc.clientWidth || scroll.scrollWidth > scroll.clientWidth, small, tiny }
  }, scale)
  expect(r.hscroll).toBe(false)
  expect(r.small).toEqual([])
  expect(r.tiny).toEqual([])
}
