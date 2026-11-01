import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import config from '../src/config/recitation.json' with { type: 'json' }
import { DISPLAY } from '../src/v2/reading/display-strings'
import { fakeRecitation } from './helpers/fake-recitation'
import { check } from './fit-check'

// Add-on 0072-add60, agent (ب): §5 «الخط والحجم» in the reader, §6 the larger list of reciters, its search, the star,
// and «من سورة … إلى سورة …». Runs on a plain web build (vite build + vite preview): the reader's API is answered
// here from data/processed/quran.jsonl (the ayah text as stored, never typed), so the spec needs that file; nothing
// real is fetched from mp3quran (the local silent file).
//   cd web && BASE_URL=http://localhost:5241 npx playwright test e2e/quran-reader-add60.spec.ts --project=mobile
const QURAN = path.resolve(import.meta.dirname, '../../data/processed/quran.jsonl')
test.skip(!fs.existsSync(QURAN), 'needs data/processed/quran.jsonl (outside git)')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS
const SILENCE = fs.readFileSync(path.resolve(import.meta.dirname, 'fixtures/silence-8s.mp3'))

type Row = { id: string; kind: string; sura: number; aya: number; page: number; sura_name: string; ref: string; url: string; url_en?: string; text: string; text_en?: string; muyassar?: string }
const rows: Row[] = fs.existsSync(QURAN)
  ? fs.readFileSync(QURAN, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row).filter((r) => r.kind === 'ayah' && r.sura <= 2)
  : []

/** The reader's API for suras 1 and 2, from the data as stored. */
async function readerApi(page: Page) {
  await page.route(/\/api\/suras$/, (r) =>
    r.fulfill({ json: [1, 2].map((n) => ({ n, name: rows.find((x) => x.sura === n)!.sura_name, ayat: rows.filter((x) => x.sura === n).length, page: rows.find((x) => x.sura === n)!.page })) }),
  )
  await page.route(/\/api\/sura\/(\d+)/, (r) => {
    const u = new URL(r.request().url())
    const n = Number(u.pathname.split('/').pop())
    const ayat = rows.filter((x) => x.sura === n)
    if (!ayat.length) return r.fulfill({ status: 404, json: {} })
    const en = u.searchParams.get('en') === '1'
    return r.fulfill({ json: { n, name: ayat[0].sura_name, basmala: null, ayat: ayat.map((a) => ({ aya: a.aya, id: a.id, text: a.text, page: a.page, ...(en ? { text_en: a.text_en } : {}) })) } })
  })
  await page.route(/\/api\/passage\/quran:(\d+):(\d+)/, (r) => {
    const [, s, a] = r.request().url().match(/quran:(\d+):(\d+)/)!.map(Number)
    const x = rows.find((y) => y.sura === s && y.aya === a)
    if (!x) return r.fulfill({ status: 404, json: {} })
    return r.fulfill({
      json: {
        id: x.id, kind: 'ayah', text: x.text, text_en: x.text_en, ref: x.ref, url: x.url, verified: true,
        tafsir: [{ name: 'التفسير الميسر', text: x.muyassar, ref: x.ref, url: x.url, key: 'muyassar', paragraphs: [x.muyassar] }],
        ayah: { sura: s, aya: a, page: x.page, suraName: x.sura_name, suraAyat: rows.filter((y) => y.sura === s).length, urlEn: x.url_en },
      },
    })
  })
  await page.route(/\/api\/(explain|mukhtasar|reviewed|asbab|qf)/, (r) => r.fulfill({ status: 404, json: {} }))
}
const px = (page: Page, sel: string, prop = 'font-size') => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test('§5 the Quranic text larger, Amiri Quran, Western digits; saved, and the text itself unchanged', async ({ page }) => {
  await readerApi(page)
  await page.goto('/quran/1?lang=ar')
  await expect(page.locator('#a-2')).toBeVisible()
  const text = await page.locator('.mushaf-text').innerText()
  const before = parseFloat(await px(page, '.mushaf-text'))
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'sura-before-ar.png') })
  await page.getByTestId('open-display').click()
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet.getByTestId('reader-display')).toBeVisible()
  await expect(sheet.getByTestId('display-preview')).toBeVisible()
  await sheet.getByTestId('rdd-quran-plus').click()
  await sheet.getByTestId('rdd-quran-plus').click()
  await expect(sheet.getByTestId('rdd-quran-value')).toHaveText(/١٣٠٪/)
  await sheet.getByRole('button', { name: DISPLAY.ar.amiriQuran }).click()
  await sheet.getByRole('button', { name: new RegExp(DISPLAY.ar.digitsLatn) }).click()
  if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'display-sheet-ar.png') })
  await page.keyboard.press('Escape')
  await expect.poll(async () => parseFloat(await px(page, '.mushaf-text')) / before).toBeCloseTo(1.3, 2)
  expect(await px(page, '.mushaf-text', 'font-family')).toContain('Amiri Quran Text')
  await expect(page.locator('#a-2 .mkp-n')).toHaveText('2')
  // Drawn larger, never changed.
  expect(await page.locator('.mushaf-text').innerText()).toBe(text.replace('١', '1').replace('٢', '2').replace('٣', '3').replace('٤', '4').replace('٥', '5').replace('٦', '6').replace('٧', '7'))
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'sura-after-ar.png') })
  await page.reload()
  await expect(page.locator('#a-2 .mkp-n')).toHaveText('2')
  await expect.poll(async () => parseFloat(await px(page, '.mushaf-text')) / before).toBeCloseTo(1.3, 2)
  // Reset: back as it was.
  await page.getByTestId('open-display').click()
  await page.locator('dialog.sheet[open]').getByTestId('display-reset').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('#a-2 .mkp-n')).toHaveText('٢')
  expect(parseFloat(await px(page, '.mushaf-text'))).toBeCloseTo(before, 1)
})

test('§5 the translation and the tafsir each on its own size, from the index’s shortcut, in English', async ({ page }) => {
  await readerApi(page)
  await page.goto('/quran?lang=en')
  await page.locator('.rd-shortcut', { hasText: DISPLAY.en.open }).click()
  await expect(page).toHaveURL(/\/quran\/display/)
  const preview = page.getByTestId('display-preview')
  await expect(preview.locator('.translation')).toBeVisible()
  const t0 = parseFloat(await px(page, '[data-testid="display-preview"] .translation'))
  const f0 = parseFloat(await px(page, '[data-testid="display-preview"] .rd-tafsir-text'))
  const q0 = parseFloat(await px(page, '[data-testid="display-preview"] .sacred-reader'))
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'display-page-before-en.png'), fullPage: true })
  for (let i = 0; i < 2; i++) await page.getByTestId('rdd-trans-plus').click()
  await page.getByTestId('rdd-tafsir-minus').click()
  await expect(page.getByTestId('rdd-tafsir-minus')).toHaveAttribute('aria-disabled', 'true')
  await page.getByTestId('rdd-tafsir-minus').click() // at its end: nothing changes, the focus stays
  await expect(page.getByTestId('rdd-tafsir-minus')).toBeFocused()
  await expect(page.getByTestId('rdd-tafsir-value')).toHaveText('90%')
  await expect(page.getByTestId('rdd-trans-value')).toHaveText('130%')
  expect(parseFloat(await px(page, '[data-testid="display-preview"] .translation')) / t0).toBeCloseTo(1.3, 2)
  expect(parseFloat(await px(page, '[data-testid="display-preview"] .rd-tafsir-text')) / f0).toBeCloseTo(0.9, 2)
  expect(parseFloat(await px(page, '[data-testid="display-preview"] .sacred-reader'))).toBeCloseTo(q0, 1)
  // Keyboard: the steppers are buttons, reached and pressed from the keyboard, each with its own label.
  await page.getByTestId('rdd-quran-plus').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('rdd-quran-value')).toHaveText('115%')
  await expect(page.getByTestId('rdd-quran-plus')).toHaveAttribute('aria-label', 'Larger Quran text size')
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'display-page-after-en.png'), fullPage: true })
  // On the ayah's sheet: the translation and the tafsir in their sizes.
  await page.goto('/quran/1/2?lang=en')
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet.locator('.translation').first()).toBeVisible()
  expect(parseFloat(await px(page, 'dialog.sheet[open] .translation')) / t0).toBeCloseTo(1.3, 2)
  expect(parseFloat(await px(page, 'dialog.sheet[open] .rd-tafsir-text')) / f0).toBeCloseTo(0.9, 2)
})

test('§6 the reciters: the larger list, the search, the star first in the player’s list', async ({ page }) => {
  await readerApi(page)
  await fakeRecitation(page)
  await page.goto('/quran/reciters?lang=ar')
  await expect(page.locator('.rd-reciter')).toHaveCount(config.reciters.length)
  const last = config.reciters[config.reciters.length - 1]
  await page.locator('#reciter-q').fill(last.name.ar.split(' ').slice(-1)[0])
  await expect(page.locator('.rd-reciter', { hasText: last.name.ar })).toBeVisible()
  await page.locator('.rd-reciter', { hasText: last.name.ar }).locator('.rd-star').click()
  await page.locator('#reciter-q').fill('')
  await expect(page.locator('#rec-fav')).toBeVisible()
  await expect(page.locator('section[aria-labelledby="rec-fav"] .rd-reciter')).toHaveCount(1)
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'reciters-ar.png') })
  // The player's list on the sura page: the favourite first, and a search.
  await page.goto('/quran/1?lang=ar')
  await page.locator('.listen-bar .listen-reciter').click()
  const picker = page.locator('dialog.sheet[open]', { has: page.locator('.np-picker') })
  await expect(picker.locator('.np-pick').first()).toContainText(last.name.ar)
  await picker.locator('#np-reciter-q').fill(config.reciters[1].name.ar)
  await expect(picker.locator('.np-pick')).toHaveCount(1)
})

test('§6 «من سورة … إلى سورة …»: the size first, asked, then downloaded sura by sura', async ({ page }) => {
  await readerApi(page)
  await fakeRecitation(page)
  await page.route(/cdn\.mp3quran\.net/, (r) =>
    r.fulfill({ status: 200, contentType: 'audio/mpeg', headers: { 'access-control-allow-origin': '*', 'content-length': String(SILENCE.length) }, body: SILENCE }),
  )
  await page.goto('/quran/reciters?lang=ar')
  const box = page.getByTestId('mushaf-download')
  // Folded under its button, above the long list.
  await expect(page.getByTestId('range-from')).toHaveCount(0)
  await page.getByTestId('range-open').click()
  await expect(page.getByTestId('range-open')).toHaveAttribute('aria-expanded', 'true')
  await page.getByTestId('range-from').selectOption('1')
  await page.getByTestId('range-to').selectOption('2')
  await expect(page.getByTestId('range-size')).toContainText('٢ سورة، نحو')
  if (SHOTS) await box.screenshot({ path: path.join(SHOTS, 'range-ar.png') })
  await page.getByTestId('range-ask').click()
  await expect(box).toContainText('تُنزَّل السور من')
  await page.getByTestId('range-start').click()
  await expect(page.getByTestId('range-done')).toBeVisible({ timeout: 20_000 })
  await page.goto('/quran/downloads?lang=ar')
  await expect(page.locator('[data-testid^="downloads-"]').filter({ has: page.locator('.rd-row') }).first()).toContainText('٢ سورة')
})

// The fit check of reply 0045 ج (e2e/fit-check.ts) on what this add-on adds, in the ten languages, at 375 and 440 wide,
// (and 320), with the text at 100% and 200%: the index's four shortcuts, «الخط والحجم» as a page and as a sheet, and the reciters'
// download card with its range open.
for (const lang of ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']) {
  test(`fit: ${lang}, the font and sizes, the shortcuts and the range at 375–440 wide and 100–200% text`, async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'one project: the widths are set here')
    test.setTimeout(240_000)
    await readerApi(page)
    await fakeRecitation(page)
    await page.addInitScript(() => {
      const x = sessionStorage.getItem('fit.scale')
      const apply = () => {
        if (!document.documentElement) return false
        document.documentElement.style.setProperty('font-size', x, 'important')
        return true
      }
      if (x && !apply()) {
        const mo = new MutationObserver(() => apply() && mo.disconnect())
        mo.observe(document, { childList: true, subtree: true })
      }
    })
    await page.goto(`/quran?lang=${lang}`)
    const found: string[] = []
    const screens: { name: string; url: string; open?: () => Promise<unknown> }[] = [
      { name: 'library', url: '/quran' },
      { name: 'display', url: '/quran/display' },
      { name: 'sheet', url: '/quran/1', open: () => page.getByTestId('open-display').click() },
      { name: 'reciters', url: '/quran/reciters', open: () => page.getByTestId('range-open').click() },
    ]
    for (const s of screens)
      for (const scale of ['100%', '200%']) {
        await page.setViewportSize({ width: 393, height: 852 })
        await page.evaluate((x) => sessionStorage.setItem('fit.scale', x), scale)
        await page.goto(`${s.url}?lang=${lang}&fit=${scale.replace('%', '')}`)
        await page.evaluate(() => document.fonts.ready)
        if (s.open) await s.open()
        await page.waitForTimeout(400)
        for (const w of [320, 375, 440]) {
          await page.setViewportSize({ width: w, height: 900 })
          await page.waitForTimeout(120)
          for (const f of await page.evaluate(check)) found.push(`${s.name} ${w} ${scale}: ${f}`)
        }
      }
    expect(found, found.slice(0, 40).join('\n')).toEqual([])
  })
}
