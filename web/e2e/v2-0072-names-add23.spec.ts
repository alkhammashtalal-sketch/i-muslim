import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { NAME_CARD } from '../src/v2/daily/names/strings-name-card'
import { NAME_DAY } from '../src/v2/daily/names/strings-name-day'
import { ENRICHED, namesRoute } from './names-stub'

// Add-on 0072-add23 on the luxury name card (the web: NameCard, NamePage, NameOfDay; not the widgets or the share image):
// - §1 الشافي: Ibn Baz's two sentences from «حكم التداوي من الأمراض» last in «معنى الاسم», «قال ابن باز», the book
//   «فتاوى نور على الدرب» and the fatwa's link with its title (needs the batch with them: NAMES_ENRICHED_FILE).
// - §4.4 no «·» beside Arabic-Indic digits in an Arabic context of the card: the card's star («هود ✦ ٥٧»).
// - §4.5 the volume and page in Arabic-Indic digits in the Arabic interface («ج١، ص٢١٩–٢٢٠»), Western elsewhere.
// - §4.6 the header's Hijri date takes the user's offset (Settings → the calendar, muslim.hijri.offset.v1) and the global one.
// - §4.7 outside Arabic: the quotes in Arabic under «the text is in Arabic» in the reader's language, never translated;
//   «أثره في قلبك» in Arabic under «the explanation is available in Arabic».
//   VITE_API_PROXY=https://i-muslim-v11.… npx vite --port 8853 &
//   NAMES_ENRICHED_FILE=…/names-enriched.json BASE_URL=http://localhost:8853 npx playwright test v2-0072-names-add23 --project=mobile
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0072-names-add23')
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const at = (n: number, hhmm = '10:00') => new Date(Date.parse(`2026-10-22T${hhmm}:00+03:00`) + (n - 1) * 86_400_000)
const IBN_BAZ = 'https://binbaz.org.sa/fatwas/8104/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%AA%D8%AF%D8%A7%D9%88%D9%8A-%D9%85%D9%86-%D8%A7%D9%84%D8%A7%D9%85%D8%B1%D8%A7%D8%B6'
const LANGS = ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

async function namePage(page: Page, n: number, lang = 'ar', o: { time?: string; offset?: number; home?: boolean } = {}) {
  await namesRoute(page, { enriched: true })
  await page.addInitScript(
    ([place, offset]) => {
      localStorage.setItem('muslim.welcome.v1', '1')
      localStorage.setItem('muslim.place.v1', JSON.stringify(place))
      if (offset != null) localStorage.setItem('muslim.hijri.offset.v1', JSON.stringify(offset))
    },
    [RIYADH, o.offset ?? null] as const,
  )
  await page.clock.setFixedTime(at(n, o.time))
  await page.goto(o.home ? `/?lang=${lang}&theme=light` : `/today/name/${n}?lang=${lang}&theme=light`)
  const card = o.home ? page.getByTestId('name-day') : page.getByTestId('name-page').getByTestId('name-day')
  await expect(card).toHaveAttribute('data-n', String(n))
  await expect(card.locator('.nc-sec').first()).toBeVisible()
  return card
}

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

test('§1 الشافي: Ibn Baz’s two sentences last in «معنى الاسم», with the fatwa’s link with its title', async ({ page }) => {
  test.skip(((ENRICHED?.['4'] as { meaning?: unknown[] } | undefined)?.meaning?.length ?? 0) < 4, 'the batch with Ibn Baz (NAMES_ENRICHED_FILE)')
  const card = await namePage(page, 4)
  const qs = card.locator('[data-sec="meaning"] [data-part="quote"]')
  await expect(qs).toHaveCount(4)
  for (const [i, text] of [
    [2, 'الصواب في التداوي أنه مستحب ومشروع'],
    [3, 'تعاطي الأسباب لا ينافي التوكل، بل هو من التوكل'],
  ] as const) {
    const q = qs.nth(i)
    await expect(q.locator('.nc-quote-text')).toHaveText(text)
    await expect(q.locator('.nc-sayer')).toHaveText('قال ابن باز')
    await expect(q.locator('.nc-context')).toHaveText('من فتوى «حكم التداوي من الأمراض»')
    await expect(q.locator('.nc-src > span').first()).toHaveText('«فتاوى نور على الدرب» لعبد العزيز بن باز')
    await expect(q.locator('.nc-src a')).toHaveAttribute('href', IBN_BAZ)
    await expect(q.locator('.nc-src a')).toHaveText('موقع ابن باز')
  }
})

test('§4.4–4.5 Arabic: no «·» beside an Arabic-Indic digit anywhere in the card; the star instead; the volume and page in Arabic-Indic digits', async ({ page }) => {
  for (const n of [9, 4, 15]) {
    const card = await namePage(page, n)
    const text = await card.evaluate((x) => (x as HTMLElement).innerText)
    expect(text, `entry ${n}`).not.toMatch(/[٠-٩]\s*·|·\s*[٠-٩]/)
    // The source lines of the quotes: Arabic-Indic digits, no Western one, the star before the site.
    for (const src of await card.locator('[data-part="quote"] .nc-src').all()) {
      const t = await src.innerText()
      expect(t).not.toMatch(/[0-9]/)
      await expect(src.locator('[data-sep="star"]')).toHaveCount(1)
    }
    if (n !== 4) await expect(card.locator('[data-part="ayah"] .nd-ref [data-sep="star"]').first()).toBeVisible()
  }
  const c4 = await namePage(page, 4)
  await expect(c4.locator('[data-sec="meaning"] [data-part="quote"]').nth(1).locator('.nc-src')).toContainText(/ج١، ص٢١٩⁠–⁠٢٢٠/)
  // The hadith's source line beside its number: the star.
  await expect(c4.locator('[data-part="hadith"] .tool-source')).toContainText('✦')
  await expect(c4.locator('[data-part="hadith"] .tool-source')).not.toContainText('·')
})

test('§4.5 outside Arabic: the quotes’ volume and page as sent, Western digits; the ayah’s place with « · »', async ({ page }) => {
  const card = await namePage(page, 4, 'en')
  await expect(card.locator('[data-sec="meaning"] [data-part="quote"]').nth(1).locator('.nc-src')).toContainText(/ج1، ص219⁠–⁠220/)
  const c9 = await namePage(page, 9, 'en')
  await expect(c9.locator('[data-part="ayah"] .nd-ref').first()).toContainText(' · ')
})

test('§4.6 the header’s Hijri date takes the user’s offset (and the global one), on the page and at home', async ({ page, request }) => {
  const g = Math.trunc(Number(((await (await request.get('/config/hijri.json')).json().catch(() => ({}))) as { offset?: number }).offset)) || 0
  const expected = (k: number) =>
    new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' }).format(new Date(Date.parse('2026-10-25T12:00:00+03:00') + k * 86_400_000))
  for (const offset of [0, 1, -1]) {
    for (const home of [false, true]) {
      const card = await namePage(page, 4, 'ar', { offset, home })
      await expect(card.getByTestId('name-line'), `offset ${offset}${home ? ' home' : ''}`).toContainText(expected(offset + g))
    }
  }
})

test('§4.7 outside Arabic, ten languages: the quotes in Arabic under «the text is in Arabic», «أثره في قلبك» in Arabic under its line', async ({ page }) => {
  const ar = await namePage(page, 5)
  const arQuote = await ar.locator('[data-sec="meaning"] .nc-quote-text').first().innerText()
  const arHeart = await ar.getByTestId('name-day-readings-ar').innerText()
  for (const lang of LANGS) {
    const card = await namePage(page, 5, lang)
    for (const sec of ['meaning', 'salaf']) {
      const s = card.locator(`[data-sec="${sec}"]`)
      await expect(s.locator('.nc-note'), `${lang} ${sec}`).toHaveText(NAME_CARD[lang].quoteInArabic)
      await expect(s.locator('.nc-note')).toHaveAttribute('lang', lang)
      for (const f of await s.locator('[data-part="quote"]').all()) await expect(f).toHaveAttribute('lang', 'ar')
    }
    await expect(card.locator('[data-sec="meaning"] .nc-quote-text').first()).toHaveText(arQuote)
    const rd = card.getByTestId('name-day-readings')
    await expect(rd.getByTestId('name-day-in-arabic'), lang).toHaveText(NAME_DAY[lang].inArabic)
    await expect(rd.getByTestId('name-day-readings-ar')).toHaveText(arHeart)
    await expect(rd.getByTestId('name-day-readings-ar')).toHaveAttribute('lang', 'ar')
  }
})

test.describe('shots at 390 (add-on 0072-add23)', () => {
  for (const [n, name, lang, look] of [
    [4, 'shafi', 'ar', 'day'],
    [4, 'shafi', 'ar', 'night'],
    [4, 'shafi', 'en', 'day'],
    [9, 'qarib', 'ar', 'day'],
    [5, 'wakil', 'fr', 'day'],
    [15, 'awwal', 'ur', 'night'],
  ] as const)
    test(`shot: ${n} ${name} ${lang} ${look}`, async ({ page }) => {
      const card = await namePage(page, n, lang, { time: look === 'night' ? '21:30' : '10:00' })
      await expect(card.getByTestId('name-foot')).toBeVisible()
      await shoot(page, card, `${String(n).padStart(2, '0')}-${name}-${lang}-${look}-390.png`)
    })
})
