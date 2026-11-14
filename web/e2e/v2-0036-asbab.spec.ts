import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { READING } from '../src/v2/reading/strings'

// «سبب النزول» in the ayah panel (reply 0036 §أ; boards AsbabAyah and AsbabAyahN), on a LOCAL preview of next only:
//   cd worker && bash ../scripts/wr.sh dev --remote --env next --port 8862
//   cd web && BASE_URL=http://localhost:8862 npx playwright test e2e/v2-0036-asbab.spec.ts --project=mobile
// SHOTS=dir saves our screens there; COMPARE=dir also writes board | ours side by side (BOARDS: the boards' pictures).
// The texts checked are the Worker's own answer from next's D1, never typed here.
test.skip(!/^http:\/\/localhost:\d+\/?$/.test(process.env.BASE_URL ?? ''), 'a local preview only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const COMPARE = process.env.COMPARE
const BOARDS = process.env.BOARDS ?? path.resolve(import.meta.dirname, '../../out/design-v2/additions/screens')
const ar = READING.ar
const en = READING.en
const sheet = (page: Page) => page.locator('dialog.sheet[open]').last()
const asbab = (page: Page) => sheet(page).locator('section.rd-asbab')
type Pair = { ar: { id: string; text: string; grade: string; attribution: string }; tr?: { text: string; grade: string } }

test.beforeEach(async ({ page }) => {
  await page.route(/cdn\.mp3quran\.net/, (r) => r.abort())
})

/** Opens an ayah's panel and returns the Worker's answer for its «سبب النزول» (or null when the panel asks none). */
async function openAyah(page: Page, sura: number, aya: number, q: string, linked = true) {
  const asked: string[] = []
  page.on('request', (r) => r.url().includes('/api/asbab/') && asked.push(r.url()))
  const res = linked ? page.waitForResponse((r) => r.url().includes(`/api/asbab/${sura}/${aya}`), { timeout: 20_000 }) : Promise.resolve(null)
  await page.goto(`/quran/${sura}/${aya}?${q}`)
  await expect(sheet(page).locator('.rd-acts')).toBeVisible()
  await expect(sheet(page).locator('section.tafsir')).toBeVisible()
  const r = await res
  return { items: r ? ((await r.json()) as { items: Pair[] }).items : null, asked }
}

/** The whole panel in one picture: the viewport grown until the sheet no longer scrolls. */
async function sheetShot(page: Page, file: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const vp = page.viewportSize()!
  for (let i = 0; i < 4; i++) {
    const extra = await page.evaluate(() => {
      const b = document.querySelector('dialog.sheet[open] .sheet-body') as HTMLElement
      return b.scrollHeight - b.clientHeight
    })
    if (extra <= 1) break
    await page.setViewportSize({ width: vp.width, height: page.viewportSize()!.height + extra })
  }
  await page.waitForTimeout(300)
  await sheet(page).screenshot({ path: path.join(SHOTS, file), animations: 'disabled' })
  await page.setViewportSize(vp)
}

/** board | ours, each 390 px wide, into COMPARE/asbab-<board>.png. The board's picture is the 390-wide screen at 3×
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
  await p2.screenshot({ path: path.join(COMPARE, `asbab-${board}.png`), fullPage: true })
  await p2.close()
}

/** V2 rules 4 and 5 inside the section: no text under 13 px, every control 44 px or more. */
async function sizes(page: Page) {
  return asbab(page).evaluate((root) => {
    const small: string[] = []
    const tiny: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height || el.closest('svg, [aria-hidden="true"], [hidden]')) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (own && parseFloat(getComputedStyle(el).fontSize) < 12.9) small.push(`${el.className} ${getComputedStyle(el).fontSize}`)
      if (el.matches('button, a[href]') && (box.width < 43.5 || box.height < 43.5)) tiny.push(`${el.className} ${Math.round(box.width)}x${Math.round(box.height)}`)
    }
    return { small, tiny }
  })
}

test.describe('«سبب النزول» under the ayah (0036 §أ)', () => {
  test('الضحى 3, day: after the tafsir, the line, the hadith from D1 in its gold frame, grade and takhrij, the button, the source', async ({ page }) => {
    const { items } = await openAyah(page, 93, 3, 'lang=ar&theme=light')
    expect(items).toHaveLength(1)
    const h = items![0].ar
    expect(h.id).toBe('65351')
    const s = asbab(page)
    await expect(s).toBeVisible()
    // After the tafsir, before the panel's buttons.
    const order = await sheet(page).evaluate((d) => {
      const all = [...d.querySelectorAll('section.tafsir, section.rd-asbab, .actions')]
      return all.map((x) => (x.matches('.tafsir') ? 'tafsir' : x.matches('.rd-asbab') ? 'asbab' : 'actions'))
    })
    expect(order).toEqual(['tafsir', 'asbab', 'actions'])
    await expect(s.getByRole('heading', { name: ar.asbabHeading })).toBeVisible()
    await expect(s.locator('.rd-asbab-intro')).toHaveText('ما ورد في نزول هذه الآية، بحديث مقبول بدرجته.')
    // The text exactly as the Worker read it from next's D1, the grade in its own words, the takhrij.
    await expect(s.locator('.rd-asbab-frame .rd-asbab-text')).toHaveText(h.text)
    await expect(s.locator('.rd-asbab-frame .rd-asbab-text')).toHaveAttribute('lang', 'ar')
    await expect(s.locator('.grade-badge .grade-text')).toHaveText(h.grade)
    await expect(s.locator('.rd-asbab-attr')).toHaveText(h.attribution)
    await expect(s.getByRole('link', { name: 'شرح الحديث وفوائده' })).toHaveAttribute('href', '/hadith/65351')
    await expect(s.locator('.rd-source')).toHaveText('موسوعة الأحاديث النبوية المترجمة · باب أسباب النزول · الحديث ٦٥٣٥١')
    // One hadith: nothing folded. The review tag of the boards is not in the app; the card keeps its gold frame.
    await expect(s.locator('.rd-asbab-more')).toHaveCount(0)
    await expect(s).not.toContainText('جديد')
    // The board's 1.5px, as this browser draws it (Chrome snaps border widths), compared with a probe of the same width.
    const [mine, board] = await s.evaluate((el) => {
      const probe = document.createElement('div')
      probe.style.border = '1.5px solid'
      document.body.append(probe)
      const w = getComputedStyle(probe).borderTopWidth
      probe.remove()
      return [getComputedStyle(el).borderTopWidth, w]
    })
    expect(mine).toBe(board)
    expect(await s.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(await s.locator('.rd-asbab-frame').evaluate((el) => getComputedStyle(el).borderTopColor))
    expect(await sizes(page)).toEqual({ small: [], tiny: [] })
    await sheetShot(page, 'asbab-AsbabAyah.png')
    await compare(page, 'AsbabAyah', 'asbab-AsbabAyah.png')
    // «شرح الحديث وفوائده» opens the hadith page; back returns to the panel.
    await s.getByRole('link', { name: 'شرح الحديث وفوائده' }).click()
    await expect(page).toHaveURL(/\/hadith\/65351/)
    await expect(page.locator('.hd-text')).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/quran\/93\/3/)
    await expect(asbab(page)).toBeVisible()
  })

  test('the phone on dark keeps the day section (reply 0043-add7)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await openAyah(page, 93, 3, 'lang=ar')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(asbab(page).locator('.rd-asbab-text')).toBeVisible()
  })

  test('an ayah without a link: no section, and nothing is asked', async ({ page }) => {
    const { asked } = await openAyah(page, 93, 1, 'lang=ar&theme=light', false)
    await page.waitForTimeout(1000)
    await expect(sheet(page).locator('section.rd-asbab')).toHaveCount(0)
    await expect(sheet(page)).not.toContainText(ar.asbabHeading)
    expect(asked).toEqual([])
  })

  test('several hadiths: the first shows, the others fold under «أحاديث أخرى في نزولها (n)»; keyboard and screen reader', async ({ page }) => {
    const { items } = await openAyah(page, 5, 93, 'lang=ar&theme=light')
    expect(items!.length).toBe(2)
    const s = asbab(page)
    await expect(s.locator('.rd-asbab-item')).toHaveCount(1)
    await expect(s.locator('.rd-asbab-text').first()).toHaveText(items![0].ar.text)
    const more = s.locator('.rd-asbab-more')
    await expect(more).toHaveText('أحاديث أخرى في نزولها (١)')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    const rest = s.locator(`[id="${await more.getAttribute('aria-controls')}"]`)
    await expect(rest).toBeHidden()
    await more.focus()
    await page.keyboard.press('Enter')
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(rest).toBeVisible()
    await expect(rest.locator('.rd-asbab-text')).toHaveText(items![1].ar.text)
    await expect(rest.locator('.rd-source')).toContainText(`الحديث ${new Intl.NumberFormat('ar-u-nu-arab', { useGrouping: false }).format(Number(items![1].ar.id))}`)
    expect(await sizes(page)).toEqual({ small: [], tiny: [] })
    // Motion at most 200 ms (the chevron).
    const ms = await more.locator('.rd-asbab-chev').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000)
    expect(ms).toBeLessThanOrEqual(200)
    await sheetShot(page, 'asbab-5-93-open.png')
    await page.keyboard.press('Space')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  test('the coordinator’s decisions (reply 0037 §2): الروم 1 and العلق 6 show their hadith; الأحزاب 35 folds the second', async ({ page }) => {
    for (const [s, a, id] of [
      [30, 1, '65334'],
      [96, 6, '10558'],
    ] as const) {
      const { items } = await openAyah(page, s, a, 'lang=ar&theme=light')
      expect(items!.map((x) => x.ar.id), `${s}:${a}`).toEqual([id])
      await expect(asbab(page).locator('.rd-asbab-text')).toHaveText(items![0].ar.text)
    }
    const { items } = await openAyah(page, 33, 35, 'lang=ar&theme=light')
    expect(items!.map((x) => x.ar.id)).toEqual(['65336', '65335'])
    await expect(asbab(page).locator('.rd-asbab-more')).toHaveText('أحاديث أخرى في نزولها (١)')
  })

  test('prefers-reduced-motion: no movement at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openAyah(page, 5, 93, 'lang=ar&theme=light')
    const d = await asbab(page).locator('.rd-asbab-chev').evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(d).toBe('0s')
  })

  test('English: the interface in English, the Arabic text always, the encyclopedia’s translation under it when it has one', async ({ page }) => {
    const { items } = await openAyah(page, 5, 93, 'lang=en&theme=light')
    const s = asbab(page)
    await expect(s.getByRole('heading', { name: en.asbabHeading })).toBeVisible()
    await expect(s.locator('.rd-asbab-intro')).toHaveText(en.asbabIntro)
    await expect(s.locator('.rd-asbab-text').first()).toHaveText(items![0].ar.text)
    if (items![0].tr) {
      await expect(s.locator('.rd-asbab-tr').first()).toHaveText(items![0].tr.text)
      await expect(s.locator('.rd-asbab-tr').first()).toHaveAttribute('lang', 'en')
    }
    await expect(s.getByRole('link', { name: en.asbabExplain })).toBeVisible()
    await sheetShot(page, 'asbab-en-5-93.png')
  })

  test('the source line opens «عن المصدر» for HadeethEnc, with «أبلغ عن خطأ» at its foot', async ({ page }) => {
    await openAyah(page, 93, 3, 'lang=ar&theme=light')
    await asbab(page).locator('.rd-source').click()
    const about = page.locator('dialog.v2-sheet[open]')
    await expect(about.locator('.v2-src-name')).toHaveText('موسوعة الأحاديث النبوية المترجمة')
    await expect(about.locator('a.v2-src-open')).toHaveAttribute('href', 'https://hadeethenc.com/ar/browse/hadith/65351')
    await page.keyboard.press('Escape')
    await expect(about).toHaveCount(0)
  })
})
