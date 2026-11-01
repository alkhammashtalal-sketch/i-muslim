import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { DISPLAY } from '../src/v2/reading/display-strings'

// Add-on 0072-add62 §4, agent (ج): «حفص العثماني» (the King Fahd Complex's «KFGQPC HAFS Uthmanic Script» 0.13) as a
// third face in «الخط والحجم»: one option, one tap, the text unchanged. And in WebKit, the iPhone's engine, every one
// of the 6,236 ayat is drawn in the font's own glyphs (no code point falls back to another face), which versions 2.x
// and 3.0 fail on the 1,286 ayat with U+0622. Runs on a plain web build (vite build + vite preview).
//   cd web && BASE_URL=http://localhost:5241 npx playwright test e2e/reader-c-hafs.spec.ts --project=mobile
const QURAN = path.resolve(import.meta.dirname, '../../data/processed/quran.jsonl')
const FONT = path.resolve(import.meta.dirname, '../src/quran/fonts/UthmanicHafs1-Ver13.ttf')
test.skip(!fs.existsSync(QURAN), 'needs data/processed/quran.jsonl (outside git)')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS

type Row = { id: string; kind: string; sura: number; aya: number; page: number; sura_name: string; ref: string; url: string; text: string; text_en?: string; muyassar?: string }
const all: Row[] = fs.existsSync(QURAN) ? fs.readFileSync(QURAN, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row) : []

/** The reader's API for suras 1 and 2, from the data as stored. */
async function readerApi(page: Page) {
  const rows = all.filter((r) => r.sura <= 2)
  await page.route(/\/api\/suras$/, (r) =>
    r.fulfill({ json: [1, 2].map((n) => ({ n, name: rows.find((x) => x.sura === n)!.sura_name, ayat: rows.filter((x) => x.sura === n).length, page: rows.find((x) => x.sura === n)!.page })) }),
  )
  await page.route(/\/api\/sura\/(\d+)/, (r) => {
    const n = Number(new URL(r.request().url()).pathname.split('/').pop())
    const ayat = rows.filter((x) => x.sura === n)
    return r.fulfill({ json: { n, name: ayat[0].sura_name, basmala: null, ayat: ayat.map((a) => ({ aya: a.aya, id: a.id, text: a.text, page: a.page })) } })
  })
  await page.route(/\/api\/passage\/quran:(\d+):(\d+)/, (r) => {
    const [, s, a] = r.request().url().match(/quran:(\d+):(\d+)/)!.map(Number)
    const x = rows.find((y) => y.sura === s && y.aya === a)!
    return r.fulfill({
      json: {
        id: x.id, kind: 'ayah', text: x.text, text_en: x.text_en, ref: x.ref, url: x.url, verified: true,
        tafsir: [{ name: 'التفسير الميسر', text: x.muyassar, ref: x.ref, url: x.url, key: 'muyassar', paragraphs: [x.muyassar] }],
        ayah: { sura: s, aya: a, page: x.page, suraName: x.sura_name, suraAyat: rows.filter((y) => y.sura === s).length },
      },
    })
  })
  await page.route(/\/api\/(explain|mukhtasar|reviewed|asbab|qf)/, (r) => r.fulfill({ status: 404, json: {} }))
}

test('«حفص العثماني»: one tap in «الخط والحجم»; the sura in the Complex\'s font, its text unchanged; saved', async ({ page }) => {
  await readerApi(page)
  await page.goto('/quran/2?lang=ar')
  await expect(page.locator('#a-4')).toBeVisible()
  const text = (await page.locator('.mushaf-text').allInnerTexts()).join('\n')
  await page.getByTestId('open-display').click()
  const sheet = page.locator('dialog.sheet[open]')
  const chip = sheet.getByRole('button', { name: DISPLAY.ar.hafs })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  if (SHOTS) await sheet.screenshot({ path: path.join(SHOTS, 'c-display-hafs-ar.png') })
  await page.keyboard.press('Escape')
  expect(await page.locator('.mushaf-text').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('KFGQPC Hafs')
  await expect.poll(() => page.evaluate(() => document.fonts.check('24px "KFGQPC Hafs"', 'وَبِالْآخِرَةِ'))).toBe(true)
  // Drawn in another face, never changed: the same text, letter for letter, as the source serves it.
  expect((await page.locator('.mushaf-text').allInnerTexts()).join('\n')).toBe(text)
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'c-sura-hafs-ar.png') })
  await page.reload()
  expect(await page.locator('.mushaf-text').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('KFGQPC Hafs')
  // The other languages name it in their own words.
  for (const l of ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const) expect(DISPLAY[l].hafs.length, l).toBeGreaterThan(3)
})

test('WebKit (the iPhone): all 6,236 ayat in the font\'s own glyphs, none falling back to another face', () => {
  test.setTimeout(180_000)
  const helper = path.resolve(import.meta.dirname, 'helpers/webkit-fallback.mjs')
  const out = JSON.parse(execFileSync('node', [helper, FONT, QURAN], { encoding: 'utf8' })) as { ayat: number; fallback: string[] }
  expect(out.ayat).toBe(6236)
  expect(out.fallback).toEqual([])
})
