import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// «اسم من أسماء الله» (reply 0071 §4.2; add-ons 0071-add1 §2–4, 0071-add2 §2 and 0071-add5 §2) on the home page,
// under «يومك». Runs against a server with NAMES_READINGS on (env v11), whose route /api/names/day sends the readings:
//   BASE_URL=https://i-muslim-v11.… npx playwright test e2e/v2-0071-names-card.spec.ts --project=mobile
// or a vite server of this branch proxied to it (VITE_API_PROXY=https://i-muslim-v11.… npx vite --port 8841). Where
// the server has no /api/names/day yet (404), the route is served here from this branch's data/names-daily.json as the
// Worker sends it with the switch on (worker/src/names-day.ts), and the test says so in its annotations; every other
// text (the ayat, the tafsir, the hadiths, their pages) is the server's.
// The quoted texts come first and are the server's letter for letter; the readings follow under their fixed heading,
// in Arabic in every language, under «الشرح متاح بالعربية» in the reader's language outside Arabic; an ayah or a hadith
// they cite by number is a link to its page (add-on 0071-add5 §2). When the route sends no readings (the switch off,
// mocked here) the card shows the quoted texts alone.
// Screenshots at 390, by day, go to SHOTS_DIR (default out/shots/0071-names).
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0071-names')
const HEADING = 'شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء'
// The rotation's first day (data/names-daily.json): entry 1, الصمد; entry n falls on the (n − 1)th day after it.
const EPOCH = Date.parse('2026-10-22T09:00:00Z')
const dayOf = (n: number) => new Date(EPOCH + (n - 1) * 86_400_000)

type Readings = { meaning: string; easy: string; deep: string[] }
type Day = { entry: { n: number; name: string; quranOnly: boolean }; readings?: Readings }
const DATA = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/names-daily.json'), 'utf8')) as {
  epoch: string
  entries: (Day['entry'] & { readings: Readings })[]
}
/** A reading as the card shows it: each link {{words|id}} as its words. */
const shown = (t: string) => t.replace(/\{\{([^{}|]+)\|[^{}|]+\}\}/g, '$1')

/** /api/names/day from the server under test, or, where it has none yet, from this branch's data with the switch on;
 *  `readings: false` takes them out, as the switch off does. */
async function namesRoute(page: Page, { readings = true } = {}) {
  await page.route('**/api/names/day**', async (route) => {
    const res = await route.fetch()
    let body: (Day & Record<string, unknown>) | null = null
    if (res.status() === 404) {
      test.info().annotations.push({ type: 'stub', description: '/api/names/day from data/names-daily.json of this branch (the server has no route yet)' })
      const day = new URL(route.request().url()).searchParams.get('day')!
      const n = DATA.entries.length
      const d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${DATA.epoch}T00:00:00Z`)) / 86_400_000)
      const index = ((d % n) + n) % n
      const { readings: rd, ...entry } = DATA.entries[index]
      body = { day, index, count: n, entry, readings: rd }
    } else if (res.ok()) body = (await res.json()) as Day & Record<string, unknown>
    if (!body) return route.fulfill({ response: res })
    if (!readings) delete body.readings
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(body) })
  })
}

async function open(page: Page, lang: string, n: number, opts: { readings?: boolean } = {}) {
  await namesRoute(page, opts)
  await page.clock.setFixedTime(dayOf(n))
  const day = page.waitForResponse((r) => r.url().includes('/api/names/day') && r.status() === 200)
  await page.goto(`/?lang=${lang}&theme=light`)
  const body = (await (await day).json()) as Day
  const card = page.getByTestId('name-day')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-n', String(n))
  return { card, body }
}

/** The whole card at 390: the page scrolls inside the app's frame under a fixed head and bar, so the viewport is made
 *  tall enough to hold the card unscrolled for the picture, then put back. */
async function shoot(page: Page, card: ReturnType<Page['getByTestId']>, name: string) {
  const size = page.viewportSize()!
  const h = await card.evaluate((el) => el.getBoundingClientRect().height)
  await page.setViewportSize({ width: size.width, height: Math.ceil(h) + 2400 })
  await page.evaluate(() => document.fonts.ready)
  fs.mkdirSync(SHOTS, { recursive: true })
  await card.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await page.setViewportSize(size)
}

/** An ayah part's text without its end marker: the passage's text as served. */
const ayahText = (s: string) => s.replace(/ [\s\S]*$/, '')

test('ar: the quoted texts first, letter for letter, then the readings under their heading', async ({ page, request }) => {
  const { card, body } = await open(page, 'ar', 1)
  expect(body.entry.name).toBe('الصمد')
  await expect(card.locator('.nd-name')).toHaveText('الصمد')
  await expect(card.locator('.nd-title')).toHaveText('اسم من أسماء الله')
  // The evidence (al-Ikhlas 2), its tafsir by al-Saʿdi and Ibn Kathir, then the dua (al-Qasas 24).
  const parts = card.locator('[data-testid="name-day-quoted"] > .nd-part')
  await expect(parts.first()).toHaveAttribute('data-id', 'quran:112:2')
  await expect(card.locator('.nd-part[data-key="saadi"]')).toBeVisible()
  await expect(card.locator('.nd-part[data-key="katheer"]')).toBeVisible()
  await expect(card.locator('.nd-part[data-part="ayah"]').last()).toHaveAttribute('data-id', 'quran:28:24')
  for (const id of ['quran:112:2', 'quran:28:24']) {
    const p = (await (await request.get(`/api/passage/${id}`)).json()) as { text: string }
    expect(ayahText((await card.locator(`.nd-part[data-id="${id}"] .nd-ayah`).textContent()) ?? '')).toBe(p.text.trimEnd())
  }
  const katheer = (await (await request.get('/api/passage/quran:112:2?with=katheer')).json()) as { tafsir: { key: string; paragraphs: string[] }[] }
  await expect(card.locator('.nd-part[data-key="katheer"] .nd-tafsir').first()).toHaveText(katheer.tafsir.find((t) => t.key === 'katheer')!.paragraphs[0])

  // The readings, as the server sent them, after every quoted part, with the exact heading.
  expect(body.readings, 'the server under test must have NAMES_READINGS on').toBeTruthy()
  const made = card.getByTestId('name-day-readings')
  await expect(made).toBeVisible()
  await expect(made.locator('.nd-made-h')).toHaveText(HEADING)
  await expect(made).toHaveAttribute('lang', 'ar')
  await expect(made.getByTestId('name-day-in-arabic')).toHaveCount(0)
  await expect(made).toContainText(shown(body.readings!.easy))
  for (const p of body.readings!.deep) await expect(made).toContainText(shown(p))
  const after = await page.evaluate(() => {
    const q = document.querySelector('[data-testid="name-day-quoted"]')!
    const m = document.querySelector('[data-testid="name-day-readings"]')!
    return !!(q.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) && q.getBoundingClientRect().bottom <= m.getBoundingClientRect().top
  })
  expect(after).toBe(true)
  await shoot(page, card, 'app-ar-390.png')
})

test('ar: the route sends no readings (the switch off): the quoted texts alone', async ({ page }) => {
  const { card, body } = await open(page, 'ar', 1, { readings: false })
  expect(body.readings).toBeUndefined()
  await expect(card.locator('[data-testid="name-day-quoted"] > .nd-part').first()).toBeVisible()
  await expect(card.getByTestId('name-day-readings')).toHaveCount(0)
  await expect(card).not.toContainText(HEADING)
})

test('ar: an entry with no HadeethEnc hadith as evidence shows its Quranic evidence alone (الحكم)', async ({ page }) => {
  const { card, body } = await open(page, 'ar', 84)
  expect(body.entry).toMatchObject({ name: 'الحكم', quranOnly: true })
  await expect(card.locator('.nd-part[data-part="hadith"]')).toHaveCount(0)
  await expect(card.locator('.nd-part[data-part="ayah"]')).toHaveCount(1)
  await expect(card.locator('.nd-part[data-part="ayah"]')).toHaveAttribute('data-id', 'quran:7:89')
  await expect(card.locator('.nd-part[data-part="ayah"] .nd-label')).toHaveText('دعاء من القرآن')
  await expect(card.locator('.nd-part[data-key="saadi"]')).toBeVisible()
  await shoot(page, card, 'app-ar-390-quran-only.png')
})

test('ar: a hadith as evidence, with its grade and attribution as stored (الجميل)', async ({ page, request }) => {
  const { card } = await open(page, 'ar', 82)
  const part = card.locator('.nd-part[data-part="hadith"]').first()
  await expect(part).toHaveAttribute('data-id', '6209')
  const h = (await (await request.get('/api/adhkar/hadith/6209?lang=ar')).json()) as { text: string; grade: string; attribution: string }
  await expect(part.locator('.tool-text p')).toHaveText(h.text)
  await expect(part.locator('.tool-badge')).toHaveText(h.grade)
  await expect(part.locator('.tool-meta')).toContainText(h.attribution)
  await shoot(page, card, 'app-ar-390-hadith.png')
})

test('ar at 320 and the largest text size: nothing in the card scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.addInitScript(() => document.documentElement.setAttribute('data-font', 'lg'))
  const { card } = await open(page, 'ar', 1)
  await expect(card.getByTestId('name-day-readings')).toBeVisible()
  const over = await card.evaluate((el) =>
    [el, ...el.querySelectorAll('*')].filter((x) => (x as HTMLElement).scrollWidth > (x as HTMLElement).clientWidth + 1 && getComputedStyle(x).overflowX !== 'visible').length,
  )
  expect(over).toBe(0)
  const box = (await card.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
})

test('en: the Arabic texts with the meaning in English, then «The explanation is available in Arabic» and the readings in Arabic', async ({ page }) => {
  const { card, body } = await open(page, 'en', 1)
  await expect(card.locator('.nd-title')).toHaveText('A Name of Allah')
  // The name in Arabic alone: no source of ours gives it in Latin letters.
  await expect(card.locator('.nd-name')).toHaveText('الصمد')
  expect(await card.locator('.nd-name').textContent()).not.toMatch(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/)
  await expect(card.locator('.nd-head > *')).toHaveCount(2)
  const evidence = card.locator('.nd-part[data-id="quran:112:2"]')
  await expect(evidence.locator('.nd-label')).toHaveText('Evidence')
  await expect(evidence.locator('.nd-ayah')).toHaveAttribute('lang', 'ar')
  await expect(evidence.locator('.translation[lang="en"]')).toBeVisible()
  // The readings: sent for English too, shown in Arabic under the line in English.
  expect(body.readings, 'the readings reach every language while the switch is on').toBeTruthy()
  const made = card.getByTestId('name-day-readings')
  await expect(made.locator('.nd-made-h')).toHaveText('An educational explanation prepared by the app, not quoted from the scholars')
  const line = made.getByTestId('name-day-in-arabic')
  await expect(line).toHaveText('The explanation is available in Arabic')
  await expect(line).toHaveAttribute('lang', 'en')
  const ar = made.getByTestId('name-day-readings-ar')
  await expect(ar).toHaveAttribute('lang', 'ar')
  await expect(ar).toHaveAttribute('dir', 'rtl')
  await expect(ar).toContainText(shown(body.readings!.meaning))
  for (const p of body.readings!.deep) await expect(ar).toContainText(shown(p))
  const order = await made.evaluate((el) => {
    const l = el.querySelector('[data-testid="name-day-in-arabic"]')!
    const a = el.querySelector('[data-testid="name-day-readings-ar"]')!
    return l.getBoundingClientRect().bottom <= a.getBoundingClientRect().top
  })
  expect(order).toBe(true)
  await shoot(page, card, 'app-en-390.png')
})

test('the readings in the other eight languages: the line in that language, the readings in Arabic', async ({ page }) => {
  const LINE: Record<string, string> = {
    ur: 'وضاحت عربی میں دستیاب ہے',
    id: 'Penjelasan tersedia dalam bahasa Arab',
    ms: 'Penerangan tersedia dalam bahasa Arab',
    tr: 'Açıklama Arapça olarak mevcuttur',
    fr: 'L’explication est disponible en arabe',
    es: 'La explicación está disponible en árabe',
    bn: 'ব্যাখ্যাটি আরবিতে পাওয়া যায়',
    hi: 'व्याख्या अरबी में उपलब्ध है',
  }
  await namesRoute(page)
  await page.clock.setFixedTime(dayOf(1))
  for (const [lang, line] of Object.entries(LINE)) {
    await page.goto(`/?lang=${lang}&theme=light`)
    const made = page.getByTestId('name-day').getByTestId('name-day-readings')
    await expect(made.getByTestId('name-day-in-arabic'), lang).toHaveText(line)
    await expect(made.getByTestId('name-day-readings-ar')).toHaveAttribute('lang', 'ar')
    await expect(made.getByTestId('name-day-readings-ar')).toContainText(shown(DATA.entries[0].readings.easy))
  }
})

test('ar: an ayah the readings cite by number is a link to its page in the reader (الحفيظ: هود 57)', async ({ page, request }) => {
  const { card, body } = await open(page, 'ar', 2)
  expect(body.entry.name).toBe('الحفيظ')
  const made = card.getByTestId('name-day-readings')
  const link = made.locator('a.nd-cite[data-cite="quran:11:57"]')
  await expect(link).toHaveText('هود 57')
  await expect(link).toHaveAttribute('href', '/quran/11/57')
  await expect(made.locator('a.nd-cite[data-cite="quran:12:64"]')).toHaveText('يوسف 64')
  // The reading's own words around it, letter for letter.
  await expect(made).toContainText('إثبات الاسم من هود 57. وفي تفسير يوسف 64 يبين السعدي')
  await shoot(page, card, 'app-ar-390-links.png')
  await link.click()
  await expect(page).toHaveURL(/\/quran\/11\/57(\?|$)/)
  const p = (await (await request.get('/api/passage/quran:11:57')).json()) as { text: string }
  await expect(page.locator('#a-57')).toBeVisible()
  await expect(page.locator('#a-57')).toContainText(p.text.trim().split(' ').slice(0, 3).join(' '))
})

test('en: the same links in the Arabic readings, under the line in English (الحفيظ)', async ({ page }) => {
  const { card } = await open(page, 'en', 2)
  const made = card.getByTestId('name-day-readings')
  await expect(made.getByTestId('name-day-in-arabic')).toHaveText('The explanation is available in Arabic')
  const link = made.getByTestId('name-day-readings-ar').locator('a.nd-cite[data-cite="quran:11:57"]')
  await expect(link).toHaveText('هود 57')
  await shoot(page, card, 'app-en-390-links.png')
  await link.click()
  await expect(page).toHaveURL(/\/quran\/11\/57(\?|$)/)
  await expect(page.locator('#a-57')).toBeVisible()
})

test('ar: a hadith the readings cite by number, matched to HadeethEnc, is a link to its page (الأول: صحيح مسلم 2713)', async ({ page, request }) => {
  const { card, body } = await open(page, 'ar', 15)
  expect(body.entry.name).toBe('الأول')
  const link = card.getByTestId('name-day-readings').locator('a.nd-cite[data-cite="hadith:6335"]')
  await expect(link).toHaveText('صحيح مسلم 2713')
  await expect(link).toHaveAttribute('href', '/hadith/6335')
  await link.click()
  await expect(page).toHaveURL(/\/hadith\/6335(\?|$)/)
  const h = (await (await request.get('/api/hadith/6335?lang=ar')).json()) as { ar: { attribution: string; grade: string } }
  await expect(page.locator('.hd-text')).toBeVisible()
  await expect(page.locator('.hd-page')).toContainText(h.ar.attribution)
  await expect(page.locator('.hd-page')).toContainText(h.ar.grade)
})

test('ar: what did not match is not in the readings, and no number is left outside a link (الستير، الآخر)', async ({ page }) => {
  for (const n of [96, 16]) {
    const { card } = await open(page, 'ar', n)
    const made = card.getByTestId('name-day-readings')
    await expect(made).toBeVisible()
    const text = (await made.locator('[data-testid="name-day-readings-ar"]').textContent()) ?? ''
    const linked = (await made.locator('a.nd-cite').allTextContents()).join(' ')
    expect(text.replace(/[^\d]/g, '')).toBe(linked.replace(/[^\d]/g, ''))
    await expect(made).not.toContainText(/2590|2441|مسلم 2713/)
  }
})
