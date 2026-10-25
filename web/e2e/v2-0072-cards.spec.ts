import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Download, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import arkan from './fixtures/answer-hadith-arkan.json' with { type: 'json' }
import salaf from '../../data/salaf-daily.json' with { type: 'json' }
import { DATA, namesRoute } from './names-stub'

// Add-on 0072-add30 §1, «اصنع كروت»: the button under the ayah and its tafsir, the answer of «اسأل», the name's card
// and page, the salaf saying, each lesson step and «الدرس كله»; the builder (sections kept or left out and moved, the
// size, the style), every card in the preview, and «احفظ الكل» giving one PNG a card at the size chosen.
//   BASE_URL=http://localhost:5173 npx playwright test v2-0072-cards --project=mobile
// SHOTS=<dir> saves every card of each size × style (and a contact sheet of each), and the builder at 390.
test.use({ serviceWorkers: 'block' })
test.skip(({ isMobile }) => !isMobile, 'the builder is checked on the phone')
const SHOTS = process.env.SHOTS ?? ''
// Every size × design (nine) of a set, each drawn at full size, and with SHOTS saved: longer than the default minute.
test.describe.configure({ timeout: SHOTS ? 600_000 : 180_000 })
const SIZE = { post: [1080, 1440], story: [1080, 1920], square: [1080, 1080] } as const
const SHAPE_AR = { post: 'منشور ٣:٤', story: 'قصة', square: 'مربع' } as const
const STYLE_AR = { manuscript: 'المخطوطة', paper: 'الورق', geometry: 'الهندسة' } as const
const SHAPE_EN = { post: 'Post 3:4', story: 'Story', square: 'Square' } as const
const STYLE_EN = { manuscript: 'Manuscript', paper: 'Paper', geometry: 'Geometry' } as const

async function builder(page: Page) {
  const sheet = page.getByTestId('cards-sheet')
  await expect(sheet).toBeVisible()
  await expect(page.getByTestId('cards-preview')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  return sheet
}

/** «احفظ الكل»: the downloads, one a card, each a PNG of the chosen size. */
async function saveAll(page: Page, shape: keyof typeof SIZE) {
  const n = Number(await page.getByTestId('cards-preview').getAttribute('data-count'))
  const got: Download[] = []
  const on = (d: Download) => void got.push(d)
  page.on('download', on)
  await page.getByTestId('cards-save').click()
  await expect.poll(() => got.length, { timeout: 30_000 }).toBe(n)
  page.off('download', on)
  const files: Buffer[] = []
  for (const d of got) files.push(fs.readFileSync((await d.path())!))
  for (const f of files) {
    expect(f.subarray(1, 4).toString()).toBe('PNG')
    expect([f.readUInt32BE(16), f.readUInt32BE(20)]).toEqual(SIZE[shape])
  }
  return { n, files, names: got.map((d) => d.suggestedFilename()) }
}

/** Every size × style: the preview's cards and the files; with SHOTS, the files and one contact sheet each. */
async function allForms(page: Page, base: string, lang: 'ar' | 'en' = 'ar') {
  const sheet = await builder(page)
  const shapes = lang === 'ar' ? SHAPE_AR : SHAPE_EN
  const styles = lang === 'ar' ? STYLE_AR : STYLE_EN
  for (const shape of ['post', 'story', 'square'] as const) {
    await sheet.getByRole('tab', { name: shapes[shape], exact: true }).click()
    for (const style of ['manuscript', 'paper', 'geometry'] as const) {
      await sheet.getByRole('radio', { name: styles[style], exact: true }).click()
      await expect(sheet.getByRole('radio', { name: styles[style], exact: true })).toHaveAttribute('aria-checked', 'true')
      // Each design's choice shows its cover.
      await expect(page.getByTestId('cards-styles').locator('img')).toHaveCount(3)
      const strip = page.getByTestId('cards-preview')
      await expect(strip).toHaveAttribute('data-shape', shape)
      await expect(strip).toHaveAttribute('data-style', style)
      await expect(strip).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
      const n = Number(await strip.getAttribute('data-count'))
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(20)
      await expect(strip.locator('img')).toHaveCount(n)
      // Drawn at the base size, except a card one text has alone (an ayah, one sentence or clause): never squeezed to fit more.
      const scaled = await strip.locator('img').evaluateAll((xs) => xs.map((x) => [Number(x.getAttribute('data-scale')), x.getAttribute('data-single')] as const))
      for (const [k, one] of scaled) if (k < 1) expect(one, `a card drawn at ${k} carries more than one text`).toBe('true')
      if (!SHOTS) continue
      const { files } = await saveAll(page, shape)
      const dir = path.join(SHOTS, base)
      fs.mkdirSync(dir, { recursive: true })
      fs.mkdirSync(path.join(SHOTS, 'compare'), { recursive: true })
      files.forEach((f, i) => fs.writeFileSync(path.join(dir, `${shape}-${style}-${String(i + 1).padStart(2, '0')}.png`), f))
      fs.writeFileSync(path.join(SHOTS, `${base}-${shape}-${style}.png`), await contact(page, files, SIZE[shape]))
      if (shape === 'post') fs.writeFileSync(path.join(SHOTS, 'compare', `${base}-${style}.png`), await contact(page, files, SIZE[shape]))
    }
  }
}

/** The cards side by side, a quarter of their size, in a new page's canvas (no image tool on this Mac). */
async function contact(page: Page, files: Buffer[], [w, h]: readonly [number, number]) {
  const p = await page.context().newPage()
  await p.setContent('<html><body></body></html>')
  const png = await p.evaluate(
    async ({ srcs, w, h }) => {
      const k = 0.25
      const cols = Math.min(5, srcs.length)
      const rows = Math.ceil(srcs.length / cols)
      const c = document.createElement('canvas')
      c.width = cols * (w * k + 16) + 16
      c.height = rows * (h * k + 16) + 16
      const x = c.getContext('2d')!
      x.fillStyle = '#d9d4c7'
      x.fillRect(0, 0, c.width, c.height)
      for (let i = 0; i < srcs.length; i++) {
        const img = new Image()
        img.src = srcs[i]
        await img.decode()
        x.drawImage(img, 16 + (i % cols) * (w * k + 16), 16 + Math.floor(i / cols) * (h * k + 16), w * k, h * k)
      }
      return c.toDataURL('image/png').split(',')[1]
    },
    { srcs: files.map((f) => `data:image/png;base64,${f.toString('base64')}`), w, h },
  )
  await p.close()
  return Buffer.from(png, 'base64')
}

async function shotSheet(page: Page, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `builder-${name}.png`) })
}

test.describe('the ayah and its tafsir', () => {
  for (const lang of ['ar', 'en'] as const) {
    test(`«اصنع كروت» on the ayah panel: sections, size, style, and the files (${lang}, a long tafsir)`, async ({ page }) => {
      await page.goto(`/quran/2/255?lang=${lang}&theme=light`)
      const panel = page.locator('dialog.sheet[open]')
      await expect(panel.locator('[data-ayah="quran:2:255"]')).toBeVisible()
      await panel.getByTestId('make-cards').click()
      const sheet = await builder(page)
      // The ayah, al-Muyassar and al-Saʿdi, in that order, each kept.
      const rows = sheet.locator('.cd-row')
      await expect(rows).toHaveCount(3)
      await expect(rows.locator('input:checked')).toHaveCount(3)
      await shotSheet(page, `ayah-${lang}`)
      const before = Number(await page.getByTestId('cards-preview').getAttribute('data-count'))
      // Leaving al-Saʿdi out takes its cards out; moving al-Muyassar up puts it first.
      await rows.nth(2).locator('input').uncheck()
      await expect.poll(async () => Number(await page.getByTestId('cards-preview').getAttribute('data-count'))).toBeLessThan(before)
      await rows.nth(2).locator('input').check()
      await rows.nth(1).locator('.cd-move').first().click()
      await expect(sheet.locator('.cd-row').first()).toHaveAttribute('data-section', 'muyassar')
      await sheet.locator('.cd-row').nth(1).locator('.cd-move').first().click()
      await expect(sheet.locator('.cd-row').first()).toHaveAttribute('data-section', 'ayah')
      await allForms(page, `ayah-255-${lang}`, lang)
      const { n, names } = await saveAll(page, 'square')
      expect(names[0]).toMatch(/^muslim-cards-2-255-square-geometry-01\.png$/)
      expect(names).toHaveLength(n)
    })
  }

  test('«المخطوطة» first; the last design chosen is kept for the next set', async ({ page }) => {
    await page.goto('/quran/112/1?lang=ar&theme=light')
    const panel = page.locator('dialog.sheet[open]')
    await panel.getByTestId('make-cards').click()
    let sheet = await builder(page)
    await expect(sheet.getByRole('radio', { name: 'المخطوطة', exact: true })).toHaveAttribute('aria-checked', 'true')
    await sheet.getByRole('radio', { name: 'الورق', exact: true }).click()
    await expect(page.getByTestId('cards-preview')).toHaveAttribute('data-style', 'paper')
    await page.reload()
    await page.locator('dialog.sheet[open]').getByTestId('make-cards').click()
    sheet = await builder(page)
    await expect(sheet.getByRole('radio', { name: 'الورق', exact: true })).toHaveAttribute('aria-checked', 'true')
  })

  test('a short ayah (al-Ikhlas 1), English: its meaning under it', async ({ page }) => {
    await page.goto('/quran/112/1?lang=en&theme=light')
    const panel = page.locator('dialog.sheet[open]')
    await panel.getByTestId('make-cards').click()
    await allForms(page, 'ayah-112-1-en', 'en')
  })
})

test.describe('«من أقوال السلف»', () => {
  test('a short saying: one section, the cover, the saying, the closing card', async ({ page }) => {
    const c = salaf.cards[0]
    await page.goto(`/today/salaf/${c.n}/share?lang=ar&theme=light`)
    await page.keyboard.press('Escape')
    await page.getByTestId('salaf-cards').click()
    const sheet = await builder(page)
    await expect(sheet.locator('.cd-row')).toHaveCount(1)
    await expect(page.getByTestId('cards-preview')).toHaveAttribute('data-count', '3')
    await allForms(page, `salaf-${c.n}-ar`)
  })
})

test.describe('«اسم من أسماء الله»', () => {
  test('the name’s page: its sections in the card’s order, the cover with the shamsa', async ({ page }) => {
    await namesRoute(page)
    const n = 2
    await page.clock.setFixedTime(new Date(Date.parse(`${DATA.epoch}T09:00:00Z`) + (n - 1) * 86_400_000))
    await page.goto(`/today/name/${n}?lang=ar&theme=light`)
    await expect(page.getByTestId('name-page')).toHaveAttribute('data-n', String(n))
    await page.getByTestId('name-cards').click()
    const sheet = await builder(page)
    const ids = await sheet.locator('.cd-row').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-section')))
    expect(ids[0]).toBe('evidence')
    expect(ids).toContain('heart')
    await shotSheet(page, 'name-ar')
    await allForms(page, `name-${n}-ar`)
  })
})

test.describe('«اسأل»', () => {
  for (const lang of ['ar', 'en'] as const)
    test(`the answer: each text with its source, its tafsir (${lang})`, async ({ page }) => {
      await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
      await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
      await page.goto(`/?lang=${lang}`)
      await page.locator('#q:visible').fill('لماذا يعبد المسلمون الكعبة؟')
      await page.locator('button.send:visible').click()
      const card = page.locator('.turn').last().locator('article.card')
      await expect(card.getByTestId('make-cards')).toBeVisible({ timeout: 15_000 })
      await card.getByTestId('make-cards').click()
      const sheet = await builder(page)
      expect(await sheet.locator('.cd-row').count()).toBeGreaterThanOrEqual(kaaba.quotes.length)
      await shotSheet(page, `answer-${lang}`)
      if (lang === 'ar') await allForms(page, 'answer-kaaba-ar')
    })
})

test.describe('a hadith (the answer to a question on the pillars)', () => {
  test('the hadith in the large face, its grade and takhrij, its source', async ({ page }) => {
    await page.route('**/api/ask', (r) => r.fulfill({ json: { ...arkan, answer_lang: 'ar' } }))
    await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
    await page.goto('/?lang=ar')
    await page.locator('#q:visible').fill('ما أركان الإسلام؟')
    await page.locator('button.send:visible').click()
    const card = page.locator('.turn').last().locator('article.card')
    await expect(card.getByTestId('make-cards')).toBeVisible({ timeout: 15_000 })
    await card.getByTestId('make-cards').click()
    await allForms(page, 'hadith-arkan-ar')
  })
})

test.describe('the lessons', () => {
  test('a step of «علّمني الوضوء», then the whole lesson', async ({ page }) => {
    // The texts from the server under test (the helpers' openLesson applies the production CSP, which the dev server's
    // inline preamble does not pass): the step once ready and every text in.
    await page.goto('/today/lesson/wudu?lang=ar&theme=light&step=2&still=1')
    await expect(page.locator('#lsn-wudu[data-ready="1"]')).toBeAttached({ timeout: 20_000 })
    await expect(page.locator('#lsn-wudu .lsn-pending')).toHaveCount(0, { timeout: 20_000 })
    const step = page.locator('#lsn-wudu article.card')
    await step.getByTestId('lesson-cards').click()
    let sheet = await builder(page)
    expect(await sheet.locator('.cd-row').count()).toBeGreaterThanOrEqual(2)
    await shotSheet(page, 'lesson-step-ar')
    await allForms(page, 'lesson-wudu-step2-ar')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('cards-sheet')).toBeHidden()
    await step.getByTestId('lesson-cards-all').click()
    sheet = await builder(page)
    // One section a step; the sections kept by default stay within 20 cards.
    await expect(sheet.locator('.cd-row')).toHaveCount(14)
    expect(Number(await page.getByTestId('cards-preview').getAttribute('data-count'))).toBeLessThanOrEqual(20)
    await shotSheet(page, 'lesson-all-ar')
    // Every section kept: more than one post holds, and the buttons wait for fewer.
    for (const box of await sheet.locator('.cd-row input:not(:checked)').all()) await box.check()
    await expect(page.getByTestId('cards-over')).toBeVisible()
    await expect(page.getByTestId('cards-save')).toBeDisabled()
    // The step on the page is as it was.
    await page.keyboard.press('Escape')
    await expect(step.locator('h1')).toBeVisible()
    await expect(page).toHaveURL(/step=2/)
  })
})
