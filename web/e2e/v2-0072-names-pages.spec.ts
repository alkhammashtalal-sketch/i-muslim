import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { DATA, namesRoute, shown } from './names-stub'

// «اسم الله لليوم» in its own interface (add-on 0072-add1): the short card on the home page under «يومك», the name's
// own page (/today/name/<n>) in the approved look with «الاسم السابق / التالي», and the one «أسماء الله» page
// (/today/names): the 96 in the daily card's order with the search, the book's sourced parts kept, and the appendix
// with its notes. Against a server with NAMES_READINGS on (env v11) or a vite server of this branch proxied to it;
// the names routes from this branch's data where the server has none yet (e2e/names-stub.ts, said in the annotations).
//   BASE_URL=http://localhost:8841 npx playwright test v2-0072-names-pages --project=mobile
// Screenshots at 390 in Arabic and English go to SHOTS_DIR (default out/shots/0072-names).
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0072-names')
const EPOCH = Date.parse('2026-10-22T09:00:00Z')
const dayOf = (n: number) => new Date(EPOCH + (n - 1) * 86_400_000)
const HEADING = 'شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء'

/** An element whole at 390: the viewport made tall enough to hold it unscrolled for the picture, then put back. */
async function shoot(page: Page, el: Locator, name: string) {
  const size = page.viewportSize()!
  // A scroll container (the tools' main) by its whole content, not its window.
  const h = await el.evaluate((x) => Math.max(x.getBoundingClientRect().height, x.scrollHeight))
  await page.setViewportSize({ width: size.width, height: Math.ceil(h) + 600 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(SHOTS, { recursive: true })
  await el.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await page.setViewportSize(size)
}

/** A long scrolling screen at 390 in two pictures, its start and its end (the whole list is taller than a browser
 *  can picture at twice the scale): `name` and `name` with «-end». */
async function shootScreen(page: Page, scroller: Locator, name: string) {
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.width, height: 1700 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(SHOTS, { recursive: true })
  await scroller.evaluate((x) => x.scrollTo(0, 0))
  await page.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await scroller.evaluate((x) => x.scrollTo(0, x.scrollHeight))
  await page.waitForTimeout(100)
  await page.screenshot({ path: path.join(SHOTS, name.replace('.png', '-end.png')), animations: 'disabled' })
  await scroller.evaluate((x) => x.scrollTo(0, 0))
  await page.setViewportSize(size)
}

/** Nothing inside `root` scrolls sideways, and it stays in the screen's width. */
async function noSideways(root: Locator, width: number) {
  const over = await root.evaluate((el) =>
    [el, ...el.querySelectorAll('*')]
      .filter((x) => (x as HTMLElement).scrollWidth > (x as HTMLElement).clientWidth + 1 && getComputedStyle(x).overflowX !== 'visible')
      .map((x) => (x as HTMLElement).className || x.tagName),
  )
  expect(over).toEqual([])
  const box = (await root.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5)
}

async function home(page: Page, lang: string, n: number) {
  await namesRoute(page)
  await page.clock.setFixedTime(dayOf(n))
  await page.goto(`/?lang=${lang}&theme=light`)
  const card = page.getByTestId('name-day')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-n', String(n))
  return card
}

async function namePage(page: Page, lang: string, n: number) {
  await namesRoute(page)
  await page.clock.setFixedTime(dayOf(n))
  await page.goto(`/today/name/${n}?lang=${lang}&theme=light`)
  const p = page.getByTestId('name-page')
  await expect(p).toHaveAttribute('data-n', String(n))
  await expect(p.getByTestId('name-day-quoted').locator('.nd-part').first()).toBeVisible()
  return p
}

async function allNames(page: Page, lang: string, opts: { readings?: boolean } = {}) {
  await namesRoute(page, opts)
  await page.goto(`/today/names?lang=${lang}&theme=light`)
  await expect(page.getByTestId('names-list').locator('li')).toHaveCount(96)
}

test.describe('the home card, short', () => {
  test('ar: the name and its ayah from D1, no tafsir and no readings, and it opens the name’s page', async ({ page, request }) => {
    const card = await home(page, 'ar', 2)
    await expect(card).toHaveAttribute('href', '/today/name/2')
    await expect(card.locator('.nd-name')).toHaveText('الحفيظ')
    await expect(card.locator('.nd-title')).toHaveText('اسم من أسماء الله')
    const q = card.locator('[data-part="ayah"]')
    await expect(q).toHaveAttribute('data-id', 'quran:11:57')
    const p = (await (await request.get('/api/passage/quran:11:57')).json()) as { text: string }
    expect(((await q.locator('.nd-ayah').textContent()) ?? '').replace(/ [\s\S]*$/, '')).toBe(p.text.trimEnd().replace(/ [\s\S]*$/, ''))
    expect(((await q.locator('.nd-ayah').textContent()) ?? '').startsWith(p.text.trimEnd())).toBe(true)
    await expect(card.locator('[data-part="tafsir"]')).toHaveCount(0)
    await expect(card.getByTestId('name-day-readings')).toHaveCount(0)
    await expect(card.locator('.nd-more')).toHaveText('المزيد عن هذا الاسم')
    await shoot(page, card, 'home-card-ar-390.png')
    await card.click()
    await expect(page).toHaveURL(/\/today\/name\/2(\?|$)/)
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '2')
  })

  test('en: the name in Arabic, the ayah with its meaning in English, «More about this name»', async ({ page }) => {
    const card = await home(page, 'en', 2)
    await expect(card.locator('.nd-title')).toHaveText('A Name of Allah')
    await expect(card.locator('.nd-name')).toHaveText('الحفيظ')
    await expect(card.locator('.nd-ayah')).toHaveAttribute('lang', 'ar')
    await expect(card.locator('.nd-short-meaning[lang="en"]')).not.toBeEmpty()
    await expect(card.locator('.nd-more')).toHaveText('More about this name')
    await shoot(page, card, 'home-card-en-390.png')
  })

  test('an entry whose evidence is a hadith and that lists no ayah shows its hadith, grade and takhrij as stored', async ({ page, request }) => {
    const n = DATA.entries.find((e) => !e.ayah && !e.meaningAyah && !(e.duas ?? []).some((d) => d.kind === 'ayah'))
    test.skip(!n, 'every entry lists an ayah')
    const card = await home(page, 'ar', n!.n)
    const q = card.locator('[data-part="hadith"]')
    const id = (await q.getAttribute('data-id'))!
    const h = (await (await request.get(`/api/adhkar/hadith/${id}?lang=ar`)).json()) as { text: string; grade: string; attribution: string }
    await expect(q.locator('.nd-hadith')).toHaveText(h.text)
    await expect(q.locator('.nd-ref')).toContainText(h.grade)
  })
})

test.describe('the name’s page', () => {
  test('ar: the approved look, the book’s sheet, «الاسم السابق / التالي» round the order, and «كل الأسماء»', async ({ page }) => {
    const p = await namePage(page, 'ar', 2)
    await expect(page.locator('.dt-head h1')).toHaveText('اسم من أسماء الله')
    await expect(p.locator('h2.nd-name')).toHaveText('الحفيظ')
    // The evidence, al-Saʿdi, then Ibn Kathir folded, then the dua; the readings after them, under their heading.
    const parts = p.locator('[data-testid="name-day-quoted"] > .nd-part')
    await expect(parts.first()).toHaveAttribute('data-id', 'quran:11:57')
    await expect(parts.nth(1)).toHaveAttribute('data-key', 'saadi')
    await expect(parts.nth(2)).toHaveAttribute('data-key', 'katheer')
    await expect(p.getByTestId('name-day-readings').locator('.nd-made-h')).toHaveText(HEADING)
    await expect(p.getByTestId('name-day-readings')).toContainText(shown(DATA.entries[1].readings.easy))
    // The name in «القواعد المثلى»: the one names page's sheet, its ayah from D1 and the book's page.
    await p.getByTestId('name-book').getByRole('button').first().click()
    await expect(page.getByTestId('name-sheet')).toBeVisible()
    await expect(page.getByTestId('name-sheet').locator('.tool-text')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(p.getByTestId('name-prev')).toContainText('الاسم السابق')
    await expect(p.getByTestId('name-prev')).toContainText('الصمد')
    await expect(p.getByTestId('name-next')).toContainText(DATA.entries[2].name)
    await shoot(page, p, 'name-page-ar-390.png')
    await p.getByTestId('name-next').click()
    await expect(page).toHaveURL(/\/today\/name\/3(\?|$)/)
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '3')
    await page.getByTestId('name-prev').click()
    await page.getByTestId('name-prev').click()
    await expect(page).toHaveURL(/\/today\/name\/1(\?|$)/)
    await expect(page.getByTestId('name-prev')).toContainText(DATA.entries[95].name)
    await page.getByTestId('name-all').click()
    await expect(page).toHaveURL(/\/today\/names(\?|$)/)
    await expect(page.getByTestId('names-list').locator('li')).toHaveCount(96)
  })

  test('en: the labels in English, the readings in Arabic under the line, the name in Arabic alone', async ({ page }) => {
    const p = await namePage(page, 'en', 2)
    await expect(page.locator('.dt-head h1')).toHaveText('A Name of Allah')
    await expect(p.locator('h2.nd-name')).toHaveText('الحفيظ')
    await expect(p.getByTestId('name-day-in-arabic')).toHaveText('The explanation is available in Arabic')
    await expect(p.getByTestId('name-day-readings-ar')).toHaveAttribute('lang', 'ar')
    await expect(p.getByTestId('name-book').getByRole('button').first()).toHaveText('This name in al-Qawaʿid al-Muthla')
    await expect(p.getByTestId('name-prev')).toContainText('Previous name')
    await expect(p.getByTestId('name-next')).toContainText('Next name')
    await shoot(page, p, 'name-page-en-390.png')
  })

  test('/today/name: the day’s entry, as the home card', async ({ page }) => {
    await namesRoute(page)
    await page.clock.setFixedTime(dayOf(5))
    await page.goto('/today/name?lang=ar&theme=light')
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', '5')
  })

  test('الستير: not in the book’s list, so no sheet of the book; the switch off: no readings', async ({ page }) => {
    await namesRoute(page, { readings: false })
    await page.goto('/today/name/96?lang=ar&theme=light')
    const p = page.getByTestId('name-page')
    await expect(p.locator('h2.nd-name')).toHaveText('الستير')
    await expect(p.getByTestId('name-book')).toHaveCount(0)
    await expect(p.getByTestId('name-day-readings')).toHaveCount(0)
    await expect(p.getByTestId('name-next')).toContainText('الصمد')
  })
})

test.describe('«أسماء الله», one page', () => {
  test('ar: the book’s parts kept, the 96 in the card’s order, the search, and the appendix with its notes', async ({ page }) => {
    await allNames(page, 'ar')
    await expect(page.locator('.tool-head h1')).toHaveText('الأسماء الحسنى')
    await expect(page.getByTestId('names-order')).toContainText('٩٦')
    // The order is the card's, and each row opens its page.
    const rows = page.getByTestId('names-list').locator('li a')
    expect(await rows.locator('.nm-name').allTextContents()).toEqual(DATA.entries.map((e) => e.name))
    await expect(rows.first()).toHaveAttribute('href', '/today/name/1')
    // The book's reference beside each name it lists; الستير not in it; المتعال as the book writes it «المتعالي».
    await expect(rows.filter({ hasText: 'الستير' }).locator('.nm-ref')).toHaveText('ليس في قائمة القواعد المثلى')
    await expect(rows.filter({ hasText: 'المتعال' }).locator('.nm-ref')).not.toHaveText('')
    // The Sheikh's words on the well-known list, kept.
    await page.getByTestId('why-not-famous').click()
    await expect(page.getByTestId('why-quote')).toContainText('والحديث المروي عنه تعيينها ضعيف')
    // The appendix: six, under the file's heading, each with its note in Arabic.
    const app = page.getByTestId('names-appendix')
    await expect(app.locator('h2')).toHaveText('أسماء مضافة أو مختلف في عدّها')
    await expect(app.locator('li')).toHaveCount(6)
    expect(await app.locator('li .nm-name').allTextContents()).toEqual(DATA.appendix.map((a) => a.name))
    for (const [i, a] of DATA.appendix.entries()) await expect(app.locator('li').nth(i).locator('.nm-note')).toContainText(shown(a.note))
    await expect(app.locator('a.nd-cite[data-cite="quran:22:54"]')).toHaveText('الحج: 54')
    await shootScreen(page, page.locator('main.tool'), 'names-ar-390.png')
    // The search: the order's rows and the appendix alike.
    await page.getByRole('searchbox').fill('الرحمن')
    await expect(rows).toHaveCount(1)
    await expect(app).toHaveCount(0)
    // «الحفي» is in «الحفيظ» too: one row of the order, and الحفي in the appendix.
    await page.getByRole('searchbox').fill('الحفي')
    expect(await rows.locator('.nm-name').allTextContents()).toEqual(['الحفيظ'])
    await expect(app.locator('li')).toHaveCount(1)
    // الحفي is in the book's list: its sheet, as the page had it, with its ayah from D1.
    await app.getByRole('button').click()
    await expect(page.getByTestId('name-sheet')).toBeVisible()
    expect(((await page.getByTestId('name-sheet').locator('.tool-text').textContent()) ?? '').replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '')).toContain('انه كان بي حفيا'.replace('انه', 'إنه'))
    await page.keyboard.press('Escape')
    await page.getByRole('searchbox').fill('الرحمن')
    await rows.first().click()
    await expect(page).toHaveURL(/\/today\/name\/\d+(\?|$)/)
    await expect(page.getByTestId('name-page').locator('h2.nd-name')).toHaveText('الرحمن')
  })

  test('en: the labels in English, the names in Arabic, the notes in Arabic under the line', async ({ page }) => {
    await allNames(page, 'en')
    await expect(page.locator('.tool-head h1')).toHaveText('The Beautiful Names')
    await expect(page.getByTestId('names-order')).toContainText('96')
    const app = page.getByTestId('names-appendix')
    await expect(app.locator('h2')).toHaveText('Names in construct form, or whose counting is disputed')
    await expect(app.locator('.nm-in-ar')).toHaveText('The explanation is available in Arabic')
    await expect(app.locator('.nm-note').first()).toHaveAttribute('lang', 'ar')
    await shootScreen(page, page.locator('main.tool'), 'names-en-390.png')
  })

  test('the switch off: the appendix’s six without notes; a server without the list: the book’s 99 as before', async ({ page }) => {
    await allNames(page, 'ar', { readings: false })
    await expect(page.getByTestId('names-appendix').locator('li')).toHaveCount(6)
    await expect(page.getByTestId('names-appendix').locator('.nm-note')).toHaveCount(0)
    await page.route('**/api/names/list', (r) => r.fulfill({ status: 404, json: { ok: false, error: 'not_found' } }))
    await page.goto('/today/names?lang=ar&theme=light')
    await expect(page.locator('.names-grid button')).toHaveCount(99)
    await expect(page.getByTestId('names-list')).toHaveCount(0)
  })
})

test('320 at 130% text: none of the three scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  // As the fit sweep sets its sizes (e2e/v2-fit-sweep.spec.ts): the root's size, over the app's own step.
  // (Before <html> exists document.documentElement is null, so the size is set as soon as it appears.)
  await page.addInitScript(() => {
    const apply = () => {
      if (!document.documentElement) return false
      document.documentElement.style.setProperty('font-size', '130%', 'important')
      return true
    }
    if (!apply()) {
      const mo = new MutationObserver(() => apply() && mo.disconnect())
      mo.observe(document, { childList: true, subtree: true })
    }
  })
  const card = await home(page, 'ar', 2)
  await noSideways(card, 320)
  await namePage(page, 'ar', 2)
  await noSideways(page.getByTestId('name-page'), 320)
  await allNames(page, 'ar')
  await noSideways(page.locator('main.tool'), 320)
  const fs130 = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  expect(fs130).toBeGreaterThan(20)
})
