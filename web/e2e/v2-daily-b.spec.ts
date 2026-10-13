import { expect, test, type Page } from '@playwright/test'

// The daily tools of reply 0032 D-5, D-6, D-8, D-10 and D-11 (adhkar, tasbih, the Beautiful Names, the page view and
// word meanings) on a preview of next. Never against the live link:
//   BASE_URL=http://localhost:8815 npx playwright test e2e/v2-daily-b.spec.ts --project=mobile
test.skip(!process.env.BASE_URL || /i-muslim\.alkhammashtalal\.workers\.dev/.test(process.env.BASE_URL), 'only on a preview (BASE_URL), never the live link')
test.use({ serviceWorkers: 'block' })

/** V2 rules 4 and 5: no horizontal scroll, readable text ≥ 13 px, every control ≥ 44 px high and wide. */
async function pageCheck(page: Page) {
  const r = await page.evaluate(() => {
    const out = { scroll: document.documentElement.scrollWidth - window.innerWidth, small: [] as string[], tiny: [] as string[] }
    const main = document.querySelector('main') ?? document.body
    for (const el of main.querySelectorAll<HTMLElement>('*')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      const box = el.getBoundingClientRect()
      if (own && box.width && parseFloat(getComputedStyle(el).fontSize) < 13) out.small.push(`${el.tagName}.${el.className}: ${el.textContent!.slice(0, 20)}`)
    }
    for (const el of main.querySelectorAll<HTMLElement>('button, input, [role="tab"], [role="switch"]')) {
      const box = el.getBoundingClientRect()
      if (box.width && (box.height < 44 || box.width < 44)) out.tiny.push(`${el.tagName}.${el.className} ${Math.round(box.width)}×${Math.round(box.height)}`)
    }
    return out
  })
  expect(r.scroll, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(r.small, 'text under 13 px').toEqual([])
  expect(r.tiny, 'controls under 44 px').toEqual([])
}

const plain = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/\s+/g, ' ')

test('adhkar: eight sections; each hadith whole, its highlight verbatim, a counter only where stated', async ({ page }) => {
  await page.goto('/today/adhkar?lang=ar')
  await expect(page.locator('.tool-chip')).toHaveCount(8)
  const card = page.locator('[data-hadith="66086"]')
  await expect(card).toBeVisible()
  const text = plain((await card.locator('.tool-text p').textContent())!)
  const mark = plain((await card.locator('mark').first().textContent())!)
  expect(text).toContain(mark)
  expect(mark).toBe('أعوذ بكلمات الله التامات من شر ما خلق')
  // A hadith with no stated number has no counter.
  await expect(page.locator('[data-hadith="5503"] .tool-count')).toHaveCount(0)
  const counter = page.getByTestId('count-66086')
  await expect(counter).toHaveText('٠/٣')
  await counter.click()
  await counter.click()
  await expect(counter).toHaveText('٢/٣')
  await page.reload()
  await expect(page.getByTestId('count-66086')).toHaveText('٢/٣')
  await pageCheck(page)
  await page.locator('.tool-chip').nth(1).click()
  await expect(page.locator('[data-hadith="10947"]')).toBeVisible()
  // Reviewed by the coordinator (reply 0031-add17 §1): both parts, the istighfar in al-Awza'i's answer included.
  await expect(page.locator('[data-hadith="10947"] mark')).toHaveCount(2)
})

test('adhkar in English: the encyclopedia translation under the Arabic, the grade as in the source', async ({ page }) => {
  await page.goto('/today/adhkar?lang=en')
  const card = page.locator('[data-hadith="5503"]')
  await expect(card.locator('.tool-tr')).toContainText('Allah')
  await expect(card.locator('.tool-badge')).toHaveText('صحيح')
  await pageCheck(page)
})

test('tasbih: words cut from the hadiths, any tap counts, the limit restarts, after the prayer moves on by itself', async ({ page }) => {
  await page.goto('/today/tasbih?lang=ar')
  const chips = page.locator('[role="group"] .tool-chip')
  await expect(chips).toHaveCount(6)
  await expect(chips.first()).toHaveText(/سُبْحَانَ اللهِ|سبحان الله/)
  const ring = page.getByTestId('tasbih-ring')
  await ring.click()
  await page.locator('.tasbih-word').click() // anywhere on the screen
  await expect(ring).toContainText('٢')
  // After the prayer: 33, 33, 33, then the hundredth once.
  await page.getByTestId('after-prayer').click()
  for (let i = 0; i < 33; i++) await ring.click()
  await expect(page.locator('.tasbih-steps > span[aria-current="step"]')).toContainText('حَمِدَ')
  for (let i = 0; i < 66; i++) await ring.click()
  await expect(page.locator('.tasbih-steps > span[aria-current="step"]')).toContainText('تَمَامَ')
  await ring.click()
  await ring.click()
  await expect(page.getByTestId('after-prayer')).toHaveText('تمّ')
  await expect(page.getByTestId('tasbih-total')).toContainText('١٠٢')
  await pageCheck(page)
})

test('names: 99 from the book, search, the sheet with the ayah and al-Muyassar, and the Sheikh’s words', async ({ page }) => {
  await page.goto('/today/names?lang=ar')
  await expect(page.locator('.names-grid button')).toHaveCount(99)
  await page.getByTestId('why-not-famous').click()
  await expect(page.getByTestId('why-quote')).toContainText('والحديث المروي عنه تعيينها ضعيف')
  await expect(page.getByTestId('why-quote').locator('a')).toHaveAttribute('href', 'https://shamela.ws/book/8874/18')
  await page.getByRole('searchbox').fill('الرحمن')
  await expect(page.locator('.names-grid button')).toHaveCount(1)
  await page.locator('.names-grid button').first().click()
  const sheet = page.getByTestId('name-sheet')
  await expect(sheet.locator('.tool-text')).toBeVisible()
  expect(plain((await sheet.locator('.tool-text').textContent())!)).toContain('هو الرحمن الرحيم')
  await expect(sheet.locator('.tool-tafsir')).not.toBeEmpty()
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox').fill('الجميل')
  await page.locator('.names-grid button').first().click()
  await expect(page.getByTestId('name-sheet').locator('mark')).toContainText('جميل')
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox').fill('')
  await pageCheck(page)
})

test('page view: «صفحة» shows the ayat by page, with the line-division note', async ({ page }) => {
  await page.goto('/quran/2?lang=ar')
  await page.getByRole('radio', { name: 'صفحة' }).click()
  await expect(page.locator('.mushaf section').first()).toBeVisible()
  await expect(page.getByTestId('lines-pending')).toHaveText('تقسيم الأسطر ينتظر مصدره')
  await page.getByRole('radio', { name: 'آيات' }).click()
  await expect(page.getByTestId('lines-pending')).toHaveCount(0)
})

test('word meanings: hidden while its source is off; shown only with the test sample', async ({ page }) => {
  await page.goto('/today/words?lang=ar')
  await expect(page.getByTestId('words')).toHaveCount(0)
  await page.addInitScript(() => {
    ;(window as unknown as { __wordMeaningsTest: unknown }).__wordMeaningsTest = {
      ref: 'TEST · 1',
      words: [
        { ar: 'كلمة', meaning: 'test one' },
        { ar: 'أخرى', meaning: 'test two' },
      ],
    }
  })
  await page.reload()
  await expect(page.getByTestId('words')).toContainText('test two')
})
