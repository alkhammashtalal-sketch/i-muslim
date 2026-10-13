import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import registry from '../../data/sources.json' with { type: 'json' }
import { TODAY } from '../src/v2/daily/strings-today'
import { SOURCES_UI } from '../src/v2/sources/strings'

// «المصادر والشكر» and «أبلغ عن خطأ» (reply 0033 §أ3; boards Sources and SourcesN), on a preview of next (never the
// live link). next lacks migration 0014 until the orchestrator applies it, so the status route answers «no check yet»
// there; the tests that need a check or a pending update stub it, and every report is intercepted (nothing written).
//   cd web && BASE_URL=http://localhost:8843 npx playwright test e2e/v2-0033-sources.spec.ts --project=mobile
// SHOTS=dir saves the page (day, night) and the sheets there; COMPARE=dir also writes board|ours side by side.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const COMPARE = process.env.COMPARE
const BOARDS = process.env.BOARDS ?? path.resolve(import.meta.dirname, '../../out/design-v2/three/screens')
const ar = SOURCES_UI.ar
const en = SOURCES_UI.en
type Src = { id: string; group: string; langs?: string[] }
const SOURCES = registry.sources as Src[]

const CHECKED = { checked_at: '2026-11-01', pending: [], meaning: null, mukhtasar: null }
async function stubStatus(page: Page, body: unknown = CHECKED) {
  await page.route('**/api/sources/status*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }))
}
async function catchReports(page: Page) {
  const sent: unknown[] = []
  await page.route('**/api/report', async (r) => {
    sent.push(r.request().postDataJSON())
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return sent
}
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => {
    const scroller = document.querySelector('.dt-screen') as HTMLElement
    return document.documentElement.scrollWidth <= innerWidth && scroller.scrollWidth <= scroller.clientWidth
  })

/** The whole screen in one picture: the viewport grown to the scrolling area's height. */
async function fullShot(page: Page, file: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const h = await page.evaluate(() => {
    const el = document.querySelector('.dt-screen') as HTMLElement
    return Math.ceil(el.scrollHeight + el.getBoundingClientRect().top)
  })
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.width, height: h })
  await page.waitForTimeout(250)
  const bottom = await page.evaluate(() => Math.ceil(document.querySelector('.dt-main')!.getBoundingClientRect().bottom))
  await page.screenshot({ path: path.join(SHOTS, file), animations: 'disabled', clip: { x: 0, y: 0, width: vp.width, height: Math.min(h, bottom) } })
  await page.setViewportSize(vp)
}

/** board | ours, each 390 px wide, written to COMPARE/<board>.png. The board's picture is the 390-wide screen at 3×
 *  with a 28-point margin all round (1338 = 3 × (390 + 2 × 28)), so it is shown at 446 points, cropped by 28. */
async function compare(page: Page, board: string, ours: string) {
  if (!SHOTS || !COMPARE) return
  fs.mkdirSync(COMPARE, { recursive: true })
  const b64 = (f: string) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`
  const p2 = await page.context().newPage()
  await p2.setViewportSize({ width: 820, height: 800 })
  await p2.setContent(
    `<body style="margin:0;background:#ddd;display:flex;gap:16px;align-items:flex-start;padding:8px;font:14px sans-serif">` +
      `<figure style="margin:0;width:390px"><figcaption>board ${board}</figcaption><div style="width:390px;overflow:hidden"><img style="display:block;width:446px;margin:-28px 0 -28px -28px" src="${b64(path.join(BOARDS, `${board}.png`))}"></div></figure>` +
      `<figure style="margin:0;width:390px"><figcaption>ours</figcaption><img style="width:390px" src="${b64(path.join(SHOTS, ours))}"></figure></body>`,
  )
  await p2.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))
  await p2.screenshot({ path: path.join(COMPARE, `${board}.png`), fullPage: true })
  await p2.close()
}

test.describe('the page', () => {
  test('ar, day: every registry source in its group, counts from the data, the last check from the Worker, the du\'a', async ({ page }) => {
    await stubStatus(page)
    await page.goto('/sources?lang=ar&theme=light')
    await expect(page.getByRole('heading', { level: 1, name: ar.title })).toBeVisible()
    await expect(page.locator('.sr-intro')).toHaveText(ar.intro)
    // The groups in the board's order, each with exactly its registry sources.
    const groups = page.locator('section.sr-group')
    await expect(groups).toHaveCount(registry.groups.length)
    for (const [i, g] of registry.groups.entries()) {
      await expect(groups.nth(i).locator('h2')).toHaveText(g.name.ar)
      const ids = await groups.nth(i).locator('.sr-row').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.source))
      expect(ids).toEqual(SOURCES.filter((s) => s.group === g.id).map((s) => s.id))
    }
    // Counts come from the data: QuranEnc's languages (27), not a number written by hand.
    const qe = SOURCES.find((s) => s.id === 'quranenc')!.langs!.length
    const arNum = (n: number) => new Intl.NumberFormat('ar-u-nu-arab').format(n)
    await expect(page.locator('[data-source=quranenc] .sr-row-sub')).toContainText(`لـ${arNum(qe)} لغة`)
    await expect(page.locator('[data-source=hadeethenc] .sr-row-meta')).toHaveText('v1.7.0')
    await expect(page.locator('[data-source=ksu] .sr-row-meta')).toHaveText('٥ أكتوبر ٢٠٢٦')
    await expect(page.locator('[data-source=adhan] .sr-row-sub')).toContainText('رخصة MIT')
    await expect(page.locator('[data-source=osm] .sr-row-sub')).toContainText('© OpenStreetMap contributors')
    await expect(page.locator('.sr-follow')).toContainText('آخر فحص: ١ نوفمبر ٢٠٢٦.')
    await expect(page.locator('.sr-dua')).toHaveText('جزى الله القائمين على هذه المصادر خير الجزاء، فلولا عملهم ما كان هذا التطبيق.')
    // One filled button on the page (V2 rule 4), every row and button a 44-point target.
    await expect(page.locator('.sr-btn-primary')).toHaveCount(1)
    for (const h of await page.locator('.sr-row, .sr-btn, .dt-head button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44)
    expect(await noHorizontalScroll(page)).toBe(true)
    await fullShot(page, 'Sources.png')
    await compare(page, 'Sources', 'Sources.png')
  })

  test('night: the same page from the night tokens', async ({ page }) => {
    await stubStatus(page)
    await page.goto('/sources?lang=ar&theme=dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(10, 19, 48)')
    await expect(page.locator('.sr-dua')).toBeVisible()
    await fullShot(page, 'SourcesN.png')
    await compare(page, 'SourcesN', 'SourcesN.png')
  })

  test('without a check yet (next before the first of the month): no «آخر فحص», nothing invented', async ({ page }) => {
    await page.goto('/sources?lang=ar&theme=light')
    await expect(page.locator('.sr-follow')).toContainText(ar.followBody)
    // The preview's D1 has no source_checks table yet, or no row in it.
    await expect(page.locator('.sr-checked')).toHaveCount(0)
  })

  test('320 px and 130 % text: no horizontal scroll, rows grow', async ({ page }) => {
    await stubStatus(page)
    await page.setViewportSize({ width: 320, height: 700 })
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '130%'))
    })
    await page.goto('/sources?lang=ar&theme=light')
    await expect(page.locator('[data-source=ksu]')).toBeVisible()
    expect(await noHorizontalScroll(page)).toBe(true)
    // At 320 the date sits under the row's line, the chevron stays at the end.
    const [text, meta] = await Promise.all([page.locator('[data-source=ksu] .sr-row-text').boundingBox(), page.locator('[data-source=ksu] .sr-row-meta').boundingBox()])
    expect(meta!.y).toBeGreaterThanOrEqual(text!.y + text!.height - 1)
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'Sources-320-130.png'), animations: 'disabled' })
  })
})

test.describe('the sheets', () => {
  test('a row opens its facts; outside links have no opener and no Referer; keyboard and Escape', async ({ page }) => {
    await stubStatus(page)
    await page.goto('/sources?lang=ar&theme=light')
    const row = page.locator('[data-source=hadeethenc]')
    await row.focus()
    await page.keyboard.press('Enter')
    const sheet = page.locator('dialog.v2-sheet[open]')
    await expect(sheet.locator('.v2-src-name')).toHaveText('موسوعة الأحاديث النبوية المترجمة')
    const label = (l: string) => sheet.locator('.v2-src-row', { has: page.locator('dt', { hasText: new RegExp(`^${l}$`) }) })
    await expect(label(ar.rowTake).locator('dd')).toHaveText('نص الحديث ودرجته ومخرّجه، وشرحه وفوائده، وترجماتها')
    await expect(label(ar.rowVersion).locator('dd')).toHaveText('v1.7.0')
    await expect(label(ar.rowFetched).locator('dd')).toHaveText('١٢ أكتوبر ٢٠٢٦')
    await expect(label(ar.rowTerms).locator('dd')).toContainText('بشروطهم السبعة')
    for (const a of await sheet.locator('a[href^="https://"]').all()) {
      await expect(a).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(a).toHaveAttribute('referrerpolicy', 'no-referrer')
      await expect(a).toHaveAttribute('target', '_blank')
    }
    await expect(sheet.getByRole('link', { name: ar.openSite })).toHaveAttribute('href', 'https://hadeethenc.com/')
    if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'Sources-sheet-hadeethenc.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(row).toBeFocused()
  })

  test('QuranEnc: the version of the reader\'s language translation, from D1 (fr), and an update waiting', async ({ page }) => {
    // Unstubbed first: the preview's own D1 answers with the French translation's version.
    const live = (await (await page.request.get('/api/sources/status?lang=fr')).json()) as { meaning: { key: string; version: string; translator: string } | null }
    expect(live.meaning?.key).toBe('french_rashid')
    await stubStatus(page, { ...CHECKED, pending: [{ source: 'quranenc', key: 'french_rashid', lang: 'fr', ours: live.meaning!.version, theirs: '9.9.9' }], meaning: live.meaning })
    await page.goto('/sources?lang=fr&theme=light')
    const fr = SOURCES_UI.fr
    await expect(page.locator('[data-source=quranenc] .sr-badge')).toHaveText(fr.pending)
    await page.locator('[data-source=quranenc]').click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    const dd = (l: string) => sheet.locator('.v2-src-row', { has: page.locator('dt', { hasText: new RegExp(`^${l}$`) }) }).locator('dd')
    await expect(dd(fr.rowVersion)).toContainText(`français : ${live.meaning!.version}`)
    await expect(dd(fr.rowVersion)).toContainText(fr.pendingVersion.replace('{v}', '9.9.9'))
    await expect(dd(fr.rowPrepared)).toContainText(live.meaning!.translator)
    await expect(dd(fr.rowChecked)).toHaveText('1 novembre 2026')
    if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'Sources-sheet-quranenc-fr.png'), animations: 'disabled' })
  })

  test('Arabic reader: QuranEnc says each translation has its version (no Arabic translation of the meanings)', async ({ page }) => {
    await stubStatus(page)
    await page.goto('/sources?lang=ar&theme=light')
    await page.locator('[data-source=quranenc]').click()
    await expect(page.locator('dialog.v2-sheet[open]')).toContainText(ar.versionEach)
  })
})

test.describe('«أبلغ عن خطأ»', () => {
  test('from the sources page: no place; the type first; the note and its line; the server gets kind and note only', async ({ page }) => {
    await stubStatus(page)
    const sent = await catchReports(page)
    await page.goto('/sources?lang=ar&theme=light')
    await page.getByRole('button', { name: ar.report }).click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    await expect(sheet.getByRole('heading', { name: ar.reportTitle })).toBeVisible()
    await expect(sheet.locator('.sr-where')).toHaveCount(0)
    const send = sheet.getByRole('button', { name: ar.send })
    await expect(send).toBeDisabled()
    await expect(sheet.getByRole('group', { name: ar.typeLegend }).getByRole('radio')).toHaveCount(4)
    await expect(sheet.getByText(ar.noteHint)).toBeVisible()
    await sheet.getByRole('radio', { name: ar.typeTranslation }).check()
    await expect(send).toBeEnabled()
    const note = sheet.getByRole('textbox', { name: ar.noteLabel })
    await expect(note).toHaveAttribute('maxlength', '500')
    await note.fill('كلمة في الترجمة الفرنسية')
    if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'Report-sources.png'), animations: 'disabled' })
    await send.click()
    await expect(sheet.getByRole('status')).toHaveText(ar.sent)
    expect(sent).toEqual([{ kind: 'translation', note: 'كلمة في الترجمة الفرنسية' }])
  })

  test('from the hadith page (en): the hadith number, the language, the source and its version', async ({ page }) => {
    const sent = await catchReports(page)
    await page.goto('/hadith/5503?lang=en&theme=light')
    await page.locator('#hd-text .hd-source').click()
    const outer = page.locator('dialog[open]').first()
    await outer.getByRole('button', { name: en.report }).click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    const where = sheet.locator('.sr-where')
    await expect(where).toContainText('No. 5503')
    await expect(where).toContainText('English')
    await expect(where).toContainText('Encyclopedia of Translated Prophetic Hadiths')
    const version = (await where.locator('.sr-ver').textContent())!
    expect(version).toMatch(/^v\d+\.\d+\.\d+$/)
    await sheet.getByRole('radio', { name: en.typeText }).check()
    if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'Report-hadith-en.png'), animations: 'disabled' })
    await sheet.getByRole('button', { name: en.send }).click()
    await expect(sheet.getByRole('status')).toHaveText(en.sent)
    expect(sent).toEqual([{ kind: 'text', loc: { type: 'hadith', id: '5503', lang: 'en', source: 'hadeethenc', version } }])
  })

  test('from the ayah sheet (ar): the ayah, Arabic, the Electronic Mushaf; and «كل المصادر والشكر» leads to the page', async ({ page }) => {
    await stubStatus(page)
    const sent = await catchReports(page)
    await page.goto('/quran/2/255?lang=ar&theme=light')
    await page.locator('dialog.sheet[open] .rd-source').first().click()
    const about = page.locator('dialog.v2-sheet[open]')
    await expect(about.locator('.sr-foot')).toBeVisible()
    if (SHOTS) await about.screenshot({ path: path.join(SHOTS, 'AboutSource-ayah-foot.png'), animations: 'disabled' })
    await about.getByRole('button', { name: ar.report }).click()
    const sheet = page.locator('dialog.v2-sheet[open]').last()
    const where = sheet.locator('.sr-where')
    await expect(where).toContainText('البقرة ٢٥٥')
    await expect(where).toContainText('العربية')
    await expect(where).toContainText('المصحف الإلكتروني')
    await sheet.getByRole('radio', { name: ar.typeText }).check()
    await sheet.getByRole('button', { name: ar.send }).click()
    await expect(sheet.getByRole('status')).toHaveText(ar.sent)
    expect(sent).toEqual([{ kind: 'text', loc: { type: 'ayah', id: '2:255', lang: 'ar', source: 'ksu' } }])
    // Escape closes the report alone; «عن المصدر» stays, and so does the ayah sheet under it.
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(2)
    await about.getByRole('link', { name: ar.allSources }).click()
    await expect(page).toHaveURL(/\/sources/)
    await expect(page.getByRole('heading', { level: 1, name: ar.title })).toBeVisible()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
  })

  test('the daily limit reached says so kindly', async ({ page }) => {
    await stubStatus(page)
    await page.route('**/api/report', (r) => r.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false,"error":"rate_limited"}' }))
    await page.goto('/sources?lang=ar&theme=light')
    await page.getByRole('button', { name: ar.report }).click()
    const sheet = page.locator('dialog.v2-sheet[open]')
    await sheet.getByRole('radio', { name: ar.typeOther }).check()
    await sheet.getByRole('button', { name: ar.send }).click()
    await expect(sheet.getByRole('status')).toHaveText(ar.limited)
  })
})

test('the settings lead to the page, and back returns', async ({ page }) => {
  await stubStatus(page)
  await page.goto('/?lang=ar&theme=light')
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: ar.title }).click()
  await expect(page).toHaveURL(/\/sources/)
  await expect(page.getByRole('heading', { level: 1, name: ar.title })).toBeVisible()
  await page.getByRole('button', { name: TODAY.ar.back }).click()
  await expect(page).not.toHaveURL(/\/sources/)
})
