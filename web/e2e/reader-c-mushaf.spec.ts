import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { DISPLAY } from '../src/v2/reading/display-strings'

// Add-on 0072-add65 §1–§2, agent (ج): «صفحة» shows the King Fahd Complex's Uthmanic text of the chosen mushaf, Hafs by
// default, each ayah's words exactly as in the data file, in the Complex's font, with its source line; the mushaf is one
// choice in «الخط والحجم», with its size; the ayah's tap is as it was. Runs on a plain web build (vite build + preview).
//   cd web && BASE_URL=http://localhost:5241 npx playwright test e2e/reader-c-mushaf.spec.ts --project=mobile
const QURAN = path.resolve(import.meta.dirname, '../../data/processed/quran.jsonl')
const UTH = path.resolve(import.meta.dirname, '../public/uthmani')
test.skip(!fs.existsSync(QURAN) || !fs.existsSync(path.join(UTH, 'hafs.json')), 'needs data/processed/quran.jsonl and the Uthmanic layer (built from data/raw, outside git)')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS

type Row = { id: string; kind: string; sura: number; aya: number; page: number; sura_name: string; ref: string; url: string; text: string; text_en?: string; muyassar?: string }
const rows: Row[] = fs.existsSync(QURAN) ? fs.readFileSync(QURAN, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row).filter((r) => r.sura <= 2) : []
type U = { suras: { sura: number; basmala?: string; ayat: { aya: number; words: string[] }[] }[] }
const uth = (key: string) => JSON.parse(fs.readFileSync(path.join(UTH, `${key}.json`), 'utf8')) as U

async function readerApi(page: Page) {
  await page.route(/\/api\/suras$/, (r) =>
    r.fulfill({ json: [1, 2].map((n) => ({ n, name: rows.find((x) => x.sura === n)!.sura_name, ayat: rows.filter((x) => x.sura === n).length, page: rows.find((x) => x.sura === n)!.page })) }),
  )
  await page.route(/\/api\/sura\/(\d+)/, (r) => {
    const n = Number(new URL(r.request().url()).pathname.split('/').pop())
    const ayat = rows.filter((x) => x.sura === n)
    return r.fulfill({ json: { n, name: ayat[0].sura_name, basmala: n === 1 ? null : 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', ayat: ayat.map((a) => ({ aya: a.aya, id: a.id, text: a.text, page: a.page })) } })
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
/** An ayah span's text without its marker (the marker's digits and the no-break space before it). */
const words = (page: Page, aya: number) => page.locator(`#a-${aya}`).evaluate((el) => {
  const c = el.cloneNode(true) as HTMLElement
  c.querySelectorAll('.ayah-num').forEach((n) => n.remove())
  return (c.textContent ?? '').replace(/ /g, ' ').trim()
})

test('«صفحة»: the Complex\'s Hafs, each ayah\'s words as in the data, in its font, with its source; the tap opens the ayah as before', async ({ page }) => {
  await readerApi(page)
  await page.addInitScript(() => localStorage.getItem('imuslim.reader.v1') || localStorage.setItem('imuslim.reader.v1', JSON.stringify({ mode: 'mushaf' })))
  await page.goto('/quran/2?lang=ar')
  const hafs = uth('hafs').suras[1]
  await expect(page.locator('.mushaf[data-mushaf=hafs]')).toBeVisible()
  for (const aya of [1, 2, 4, 26, 255 > hafs.ayat.length ? 7 : 255]) expect(await words(page, aya), `2:${aya}`).toBe(hafs.ayat[aya - 1].words.join(' '))
  await expect(page.locator('.basmala')).toHaveText(hafs.basmala!)
  expect(await page.locator('.mushaf .mushaf-text').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Mushaf Uthmani hafs')
  expect(await page.locator('.basmala').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Mushaf Uthmani hafs')
  await expect.poll(() => page.evaluate(() => document.fonts.check('24px "Mushaf Uthmani hafs"', 'ٱلۡحَمۡدُ'))).toBe(true)
  await expect(page.getByTestId('mushaf-source')).toHaveText('رواية حفص عن عاصم الكوفي، الخط الحاسوبي للمجمع، الإصدار ٣٫٠، مجمع الملك فهد لطباعة المصحف الشريف')
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'c-page-hafs-ar.png') })
  // The tap: the ayah's sheet, as it was (add66 defines anything more).
  await page.locator('#a-4').click()
  await expect(page.locator('dialog.sheet[open]')).toBeVisible()
  await expect(page.locator('dialog.sheet[open] .sacred-reader')).toContainText(rows.find((r) => r.sura === 2 && r.aya === 4)!.text.split(' ')[0])
})

test('«المصحف في صفحة»: one choice with each riwaya, its edition and size; Warsh by its own count; saved', async ({ page }) => {
  await readerApi(page)
  await page.addInitScript(() => localStorage.getItem('imuslim.reader.v1') || localStorage.setItem('imuslim.reader.v1', JSON.stringify({ mode: 'mushaf' })))
  await page.goto('/quran/2?lang=ar')
  await expect(page.locator('.mushaf[data-mushaf=hafs]')).toBeVisible()
  await page.getByTestId('open-display').click()
  const sheet = page.locator('dialog.sheet[open]')
  const group = sheet.getByRole('radiogroup', { name: DISPLAY.ar.mushafHeading })
  await expect(group.getByRole('radio')).toHaveCount(7)
  await expect(group.getByRole('radio', { checked: true })).toContainText('رواية حفص عن عاصم الكوفي')
  await expect(sheet.getByTestId('mushaf-warsh')).toContainText(/الحجم [٠-٩]/)
  if (SHOTS) await sheet.locator('section[aria-labelledby="rdd-mushaf-h"]').screenshot({ path: path.join(SHOTS, 'c-mushaf-choice-ar.png') })
  await sheet.getByTestId('mushaf-warsh').click()
  await expect(sheet.getByTestId('mushaf-warsh')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  const warsh = uth('warsh').suras[1]
  await expect(page.locator('.mushaf[data-mushaf=warsh] .ayah-own')).toHaveCount(warsh.ayat.length)
  const first = await page.locator('.mushaf[data-mushaf=warsh] .ayah-own').first().evaluate((el) => {
    const c = el.cloneNode(true) as HTMLElement
    c.querySelectorAll('.mkp, svg').forEach((n) => n.remove())
    return (c.textContent ?? '').replace(/ /g, ' ').replace(/[٠-٩0-9]/g, '').trim()
  })
  expect(first).toBe(warsh.ayat[0].words.join(' '))
  await expect.poll(() => page.evaluate(() => document.fonts.check('24px "Mushaf Uthmani warsh"', '\u0870\u06ec'))).toBe(true)
  expect(await page.locator('.mushaf .mushaf-text').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Mushaf Uthmani warsh')
  await expect(page.getByTestId('mushaf-source')).toContainText('رواية ورش عن نافع المدني')
  await expect(page.getByTestId('mushaf-source')).toContainText(DISPLAY.ar.mushafOwnCount)
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'c-page-warsh-ar.png') })
  await page.reload()
  await expect(page.locator('.mushaf[data-mushaf=warsh]')).toBeVisible()
  // English names it in Latin letters, with the edition and size.
  await page.goto('/quran/2?lang=en')
  await page.getByTestId('open-display').click()
  await expect(page.locator('dialog.sheet[open]').getByTestId('mushaf-hafs')).toContainText('Hafs from Asim')
})
