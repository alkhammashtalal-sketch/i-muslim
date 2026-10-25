import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ENRICHED, namesRoute } from './names-stub'

// Add-on 0072-add16: the luxury name card shows what the server now sends for batch 1 (data/names-enriched.json, served
// while NAMES_ENRICHED is on; here through e2e/names-stub.ts with NAMES_ENRICHED_FILE set to that file):
// - `meaningHadith` (الأول، الآخر، الظاهر): the HadeethEnc hadith «أنت الأول فليس قبلك شيء…», first in «معنى الاسم» under
//   «من السنة في معنى الاسم», its text read by the id from /api/adhkar/hadith (the server under test), its grade and
//   takhrij as written, the HadeethEnc source line; outside Arabic HadeethEnc's own translation, never a machine one.
// - `contextRequired`: the context line with the quote, «في التعبد باسمه الأول/الآخر» on the quotes of worship, last.
// - `origin` (الوكيل 5-s1): «وأصله في البخاري (4563، 4564)» under the sayer, its link to HadeethEnc.
// - Two printed pages (الشافي 4-m2): «ج1، ص219–220».
// - Without the fields (NAMES_ENRICHED off, as on next): none of it, and nothing else changes.
// Against a vite server of this branch proxied to a server that has the hadiths and the ayat (env v11):
//   VITE_API_PROXY=https://i-muslim-v11.… npx vite --port 8853 &
//   NAMES_ENRICHED_FILE=../data/names-enriched.json BASE_URL=http://localhost:8853 npx playwright test v2-0072-names-add16 --project=mobile
// Shots (SHOTS_DIR) at 390: the page of الأول، الآخر، الظاهر، القريب، الشافي, ar and en, by day and by night.
test.use({ serviceWorkers: 'block' })
test.skip(!ENRICHED?.['15'], 'NAMES_ENRICHED_FILE: the reviewed batch is needed')
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0072-names-add16')
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const at = (n: number, hhmm = '10:00') => new Date(Date.parse(`2026-10-22T${hhmm}:00+03:00`) + (n - 1) * 86_400_000)

async function setup(page: Page, n: number, o: { time?: string; enriched?: boolean } = {}) {
  await namesRoute(page, { enriched: o.enriched ?? true })
  await page.addInitScript((place) => {
    localStorage.setItem('muslim.welcome.v1', '1')
    localStorage.setItem('muslim.place.v1', JSON.stringify(place))
  }, RIYADH)
  await page.clock.setFixedTime(at(n, o.time))
}

async function namePage(page: Page, n: number, lang = 'ar', o: { time?: string; enriched?: boolean } = {}) {
  await setup(page, n, o)
  await page.goto(`/today/name/${n}?lang=${lang}&theme=light`)
  const card = page.getByTestId('name-page').getByTestId('name-day')
  await expect(card).toHaveAttribute('data-n', String(n))
  await expect(card.locator('.nc-sec').first()).toBeVisible()
  return card
}

const meaning = (card: Locator) => card.locator('[data-sec="meaning"]')

async function shoot(page: Page, card: Locator, name: string) {
  const size = page.viewportSize()!
  await page.evaluate(() => document.fonts.ready)
  await card.locator('.nc-shamsa-art').evaluate((img: HTMLImageElement) => (img.complete ? null : new Promise((r) => (img.onload = r))))
  const h = await card.evaluate((x) => x.getBoundingClientRect().height)
  await page.setViewportSize({ width: size.width, height: Math.max(size.height, Math.ceil(h) + 400) })
  await page.waitForTimeout(200)
  await card.evaluate((c) => {
    for (const x of document.querySelectorAll<HTMLElement>('body *'))
      if (!c.contains(x) && !x.contains(c) && ['fixed', 'sticky'].includes(getComputedStyle(x).position)) x.style.visibility = 'hidden'
  })
  fs.mkdirSync(SHOTS, { recursive: true })
  await card.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  await page.setViewportSize(size)
}

test.describe('the fields present (the reviewed batch)', () => {
  for (const [n, name, worship] of [
    [15, 'الأول', 'في التعبد باسمه الأول'],
    [16, 'الآخر', 'في التعبد باسمه الآخر'],
    [17, 'الظاهر', null],
  ] as const) {
    test(`${name}: the hadith first in «معنى الاسم», by its id, its grade and takhrij as written${worship ? ', the quote of worship last with its line' : ''}`, async ({ page, request }) => {
      const card = await namePage(page, n)
      const sec = meaning(card)
      const items = sec.locator(':scope > [data-part]')
      const first = items.first()
      await expect(first).toHaveAttribute('data-part', 'meaning-hadith')
      await expect(first).toHaveAttribute('data-id', '6335')
      await expect(first.locator('.nc-label')).toHaveText('من السنة في معنى الاسم')
      // The text letter for letter as the server under test has it.
      const h = (await (await request.get('/api/adhkar/hadith/6335?lang=ar')).json()) as { text: string; grade: string; attribution: string }
      await expect(first.locator('.tool-text p')).toHaveText(h.text)
      expect(h.text).toContain(`أنت ${name}`)
      await expect(first.locator('.tool-badge')).toHaveText('صحيح')
      await expect(first.locator('.tool-meta .tool-muted')).toHaveText('رواه مسلم')
      // The source line: HadeethEnc and the hadith's number; its sheet opens the page there.
      await expect(first.locator('.tool-source')).toContainText('موسوعة الأحاديث النبوية المترجمة')
      await expect(first.locator('.tool-source')).toContainText('الحديث')
      const quotes = sec.locator('[data-part="quote"]')
      expect(await quotes.count()).toBe(n === 17 ? 2 : 3)
      if (worship) {
        const last = quotes.last()
        await expect(last).toHaveAttribute('data-context', 'required')
        await expect(last.locator('.nc-context')).toHaveText(worship)
      }
    })
  }

  test('الأول on its day at home: the hadith is the first meaning shown before «أكمل القراءة»', async ({ page }) => {
    await setup(page, 15)
    await page.goto('/?lang=ar&theme=light')
    const card = page.getByTestId('name-day')
    await expect(card).toHaveAttribute('data-n', '15')
    const items = meaning(card).locator(':scope > [data-part]')
    await expect(items).toHaveCount(1)
    await expect(items.first()).toHaveAttribute('data-part', 'meaning-hadith')
    await card.getByTestId('name-more').click()
    await expect(meaning(card).locator(':scope > [data-part]')).toHaveCount(4)
  })

  test('the nine required context lines, each with its quote (الجبار، الأكرم، الإله، الأول، الآخر)', async ({ page }) => {
    const want: Record<number, number> = { 7: 2, 13: 1, 14: 1, 15: 1, 16: 1 }
    for (const [n, k] of Object.entries(want)) {
      const card = await namePage(page, Number(n))
      const req = card.locator('[data-part="quote"][data-context="required"]')
      await expect(req, `entry ${n}`).toHaveCount(k)
      for (let i = 0; i < k; i++) await expect(req.nth(i).locator('.nc-context')).not.toBeEmpty()
    }
  })

  test('الوكيل: the saying of Ibn Abbas in quotation marks, and «وأصله في البخاري (4563، 4564)» under it, linked to HadeethEnc', async ({ page }) => {
    const card = await namePage(page, 5)
    const s = card.locator('[data-sec="salaf"] [data-part="quote"]').first()
    await expect(s.locator('.nc-quote-text')).toContainText(': «حسبنا الله ونعم الوكيل»')
    const o = s.locator('[data-part="origin"]')
    await expect(o).toContainText('وأصله في البخاري (4563، 4564)')
    await expect(o.locator('a')).toHaveAttribute('href', 'https://hadeethenc.com/ar/browse/hadith/65287')
    await expect(o.locator('a')).toHaveText('موسوعة الأحاديث')
  })

  test('الشافي: the two printed pages «ج1، ص219–220», and الأعلى the Quran’s braces in the scholar’s words as sent', async ({ page }) => {
    const card = await namePage(page, 4)
    const src = meaning(card).locator('[data-part="quote"]').nth(1).locator('.nc-src')
    await expect(src).toContainText(/ج1، ص219\u2060–\u2060220/)
    // The two pages on one line: the dash's two sides at the same height.
    const oneLine = await src.locator('span').first().evaluate((el) => {
      const t = el.firstChild as Text
      const i = t.data.indexOf('–')
      const r = document.createRange()
      r.setStart(t, i - 1)
      r.setEnd(t, i + 2)
      return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size
    })
    expect(oneLine).toBe(1)
    const c12 = await namePage(page, 12)
    await expect(meaning(c12).locator('.nc-quote-text').first()).toContainText('﴿على العرش استوى﴾، وعلى الملك احتوى.')
  })

  test('en: the hadith with HadeethEnc’s English, never a machine translation; the quotes in Arabic under their line', async ({ page, request }) => {
    const card = await namePage(page, 15, 'en')
    const first = meaning(card).locator('[data-part="meaning-hadith"]')
    await expect(first.locator('.nc-label')).toHaveText('From the Sunnah on the meaning of the name')
    const h = (await (await request.get('/api/adhkar/hadith/6335?lang=en')).json()) as { translation?: { text: string } }
    expect(h.translation?.text).toBeTruthy()
    await expect(first.locator('.tool-tr')).toContainText(h.translation!.text.slice(0, 60))
    await expect(first.locator('.tool-text p')).toHaveAttribute('lang', 'ar')
  })
})

test('the fields absent (NAMES_ENRICHED off, as on next): no hadith on the meaning, no origin, no meaning section; the rest as before', async ({ page }) => {
  for (const n of [15, 5, 4]) {
    const card = await namePage(page, n, 'ar', { enriched: false })
    await expect(card.locator('[data-part="meaning-hadith"]')).toHaveCount(0)
    await expect(card.locator('[data-part="origin"]')).toHaveCount(0)
    await expect(card.locator('[data-sec="meaning"]')).toHaveCount(0)
    await expect(card.locator('[data-sec="evidence"]')).toHaveCount(1)
  }
})

test.describe('shots at 390 (add-on 0072-add16)', () => {
  for (const [n, name] of [
    [15, 'awwal'],
    [16, 'akhir'],
    [17, 'zahir'],
    [9, 'qarib'],
    [4, 'shafi'],
  ] as const)
    for (const lang of ['ar', 'en'])
      for (const [look, time] of [
        ['day', '10:00'],
        ['night', '21:30'],
      ] as const)
        test(`shot: ${n} ${name} ${lang} ${look}`, async ({ page }) => {
          const card = await namePage(page, n, lang, { time })
          if (look === 'night') await expect(card).toHaveAttribute('data-night', 'true')
          else await expect(card).not.toHaveAttribute('data-night', 'true')
          await expect(card.getByTestId('name-foot')).toBeVisible()
          await shoot(page, card, `${String(n).padStart(2, '0')}-${name}-${lang}-${look}-390.png`)
        })
})
