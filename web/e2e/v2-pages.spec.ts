import { expect, test, type Page } from '@playwright/test'

// Reply 0032 part B, «B-pages»: the home page (c01), the day card (c02, c18) and the hadith page (c03, c07, c17, c19;
// V2 §11 for the weak). Run against a preview of next only: BASE_URL=http://localhost:8812 npx playwright test v2-pages
// Reads only (no question is asked). Hadith ids are HadeethEnc's: 4196 sahih (agreed upon), 65065 weak, 10877 mixed.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')

const SAHIH = '4196'
const WEAK = '65065'
const MIXED = '10877'

/** V2 rules 4 and 5 on what is on screen: no horizontal scroll, no text under 13 px (ayah-end numbers excepted: they
 *  are ornament), no tap target under 44 px, no interactive element inside another. */
async function pageCheck(page: Page) {
  const r = await page.evaluate(() => {
    const out = { hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [] as string[], targets: [] as string[], nested: 0 }
    const visible = (el: Element) => {
      const b = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[aria-hidden="true"], .sr-only, dialog:not([open])')
    }
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el) || el.closest('.mkp, svg')) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (own && parseFloat(getComputedStyle(el).fontSize) < 12.95) out.small.push(`${el.tagName}.${el.className}: ${el.textContent!.trim().slice(0, 30)}`)
    }
    for (const el of document.querySelectorAll('button, a[href], textarea, input, [role="button"]')) {
      if (!visible(el)) continue
      const b = el.getBoundingClientRect()
      if (b.height < 43.5 || b.width < 43.5) out.targets.push(`${el.tagName}.${el.className} ${Math.round(b.width)}x${Math.round(b.height)}`)
      if (el.parentElement?.closest('button, a[href]')) out.nested++
    }
    return out
  })
  expect(r.hscroll, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(r.small, 'text under 13 px').toEqual([])
  expect(r.targets, 'targets under 44 px').toEqual([])
  expect(r.nested, 'interactive inside interactive').toBe(0)
}

test.describe('home (c01)', () => {
  test('c01: «اسأل» first, then the day card, then the sections; the question box is the home card, no bottom composer', async ({ page }) => {
    await page.goto('/?lang=ar&theme=light')
    const ask = page.locator('.ask-card')
    const card = page.locator('article.day-card')
    const tiles = page.locator('.home-sections')
    await expect(ask).toBeVisible()
    await expect(card).toBeVisible()
    const [a, c, t] = await Promise.all([ask, card, tiles].map((l) => l.boundingBox()))
    expect(a!.y).toBeLessThan(c!.y)
    expect(c!.y).toBeLessThan(t!.y)
    // The top of the card shows under «اسأل» in the first screen.
    expect(c!.y).toBeLessThan(page.viewportSize()!.height)
    await expect(page.locator('#q')).toBeVisible()
    await expect(page.locator('.composer')).toHaveCount(0)
    // One filled button in the ask card (V2 rule 4).
    await expect(ask.locator('.ask-now')).toHaveCount(1)
    await expect(page.locator('.home-tile')).toHaveCount(3)
    await expect(page.locator('.footer-marks')).toBeVisible()
    await pageCheck(page)
  })

  test('c01: a draft («ask about this ayah») fills the home box without sending', async ({ page }) => {
    await page.goto('/quran/1/2?lang=ar')
    const sheet = page.locator('dialog[open]')
    await sheet.getByRole('button', { name: 'اسأل عن هذه الآية' }).click()
    await expect(page.locator('#q')).toHaveValue(/ما معنى الآية/)
    await expect(page.locator('.bubble')).toHaveCount(0)
  })
})

test.describe('the day card (c02, c18)', () => {
  test('c02: an article, not a link; the hadith and its badge open the hadith page; no share button on the card (reply 0043 ب)', async ({ page }) => {
    await page.goto('/?lang=ar&theme=light')
    const card = page.locator('article.day-card')
    await expect(card).toBeVisible()
    expect(await card.evaluate((el) => el.closest('a') === null && el.tagName === 'ARTICLE')).toBe(true)
    const today = (await (await page.request.get('/api/today?lang=ar')).json()) as { hadith: { ar: { id: string; grade: string; attribution: string } } | null }
    test.skip(!today.hadith, 'no hadith of the day in this database')
    const zone = card.locator('a.dc-hadith')
    await expect(zone).toHaveAttribute('href', `/hadith/${today.hadith!.ar.id}`)
    // The badge is the grade as HadeethEnc writes it, inside the hadith's link.
    await expect(zone.locator('.grade-badge')).toContainText(today.hadith!.ar.grade)
    await expect(zone).toContainText(today.hadith!.ar.attribution)
    await expect(card.getByRole('button', { name: 'شارك البطاقة' })).toHaveCount(0)
    await expect(card.locator('.dc-share')).toHaveCount(0)
    await zone.click()
    await expect(page).toHaveURL(new RegExp(`/hadith/${today.hadith!.ar.id}`))
    await expect(page.locator('.hd-text')).toBeVisible()
  })

  test('c02: the background is B4 (reply 0043 أ): the frame redrawn at phone resolution, lossless, 1200 × 2164', async ({ page }) => {
    await page.goto('/?lang=ar&theme=light')
    const bg = await page.locator('article.day-card').evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(bg).toContain('/art/card-art-B4.webp')
    const res = await page.request.get('/art/card-art-B4.webp')
    expect(res.status()).toBe(200)
    expect((await res.body()).length).toBe(2138288)
  })

  test('c18: 13 px text, 44 px targets, the Umm al-Qura date in the disc, the Gregorian date in the head', async ({ page }) => {
    await page.goto('/?lang=ar&theme=light')
    const card = page.locator('article.day-card')
    await expect(card.locator('.dc-disc .dc-month')).toBeVisible()
    await expect(card.locator('.dc-year')).toContainText('هـ')
    await expect(card.locator('.dc-date')).toContainText(/أكتوبر|نوفمبر|ديسمبر|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر/)
    await pageCheck(page)
  })

  test('c18 at 130%: nothing scrolls sideways and buttons wrap instead of clipping', async ({ page }) => {
    await page.goto('/?lang=ar&theme=light')
    // The phone's text at 130% (the CSP refuses an injected style sheet; the root style is set through the CSSOM).
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '130%'))
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    // Text that runs out of its button or link (decorative glows outside a card are not text).
    const clipped = await page.evaluate(() => {
      const out: string[] = []
      for (const b of document.querySelectorAll('.v2-home button, .v2-home a')) {
        const box = b.getBoundingClientRect()
        const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent!.trim()) continue
          // A hadith shown in part on the card on purpose (its whole text is on its page) is not a clipped label.
          if (getComputedStyle(n.parentElement!).webkitLineClamp !== 'none') continue
          const range = document.createRange()
          range.selectNodeContents(n)
          const r = range.getBoundingClientRect()
          if (r.width && (r.left < box.left - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1)) out.push(`${b.className}: ${n.textContent!.trim().slice(0, 20)}`)
        }
      }
      return out
    })
    expect(clipped).toEqual([])
  })
})

test.describe('the hadith page (c03, c07, c17, c19; V2 §11)', () => {
  test('c03: one page; the hadith in its frame, the grade and attribution verbatim, each part with its source line', async ({ page }) => {
    const api = (await (await page.request.get(`/api/hadith/${SAHIH}?lang=ar`)).json()) as { ar: { grade: string; attribution: string } }
    await page.goto(`/hadith/${SAHIH}?lang=ar&theme=light`)
    await expect(page.locator('#hd-text .hd-frame .hd-text')).toBeVisible()
    await expect(page.locator('#hd-text .grade-badge')).toContainText(api.ar.grade)
    await expect(page.locator('#hd-text .hd-row').first()).toContainText(api.ar.attribution)
    // No «صحيح» dialog any more: the grade is part of the page.
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    // Every part shows its source line; a press opens «عن المصدر» in the app, with the site's link inside. The quiz's
    // part («تأكد من فهمك», reply 0033 §أ2) arrives after the hadith: count the parts once the page has settled.
    await page.waitForLoadState('networkidle')
    // «من فوائد الحديث» after the quiz has no line of its own on the board (Understand): the quiz's line
    // «موسوعة الأحاديث النبوية المترجمة · فوائد الحديث» names its source.
    const parts = page.locator('.hd-part:not(.hd-benefits)')
    const n = await parts.count()
    expect(n).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < n; i++) await expect(parts.nth(i).locator('.hd-source')).toHaveCount(1)
    await page.locator('#hd-text .hd-source').click()
    const sheet = page.locator('dialog[open]')
    await expect(sheet).toContainText('موسوعة الأحاديث النبوية')
    await expect(sheet.getByRole('link', { name: 'افتح الحديث في موقعه' })).toHaveAttribute('href', `https://hadeethenc.com/ar/browse/hadith/${SAHIH}`)
    // No full chain in HadeethEnc: the folded «السند كاملًا» is absent (rule 3).
    await expect(page.getByText('السند كاملًا، كما في المصدر')).toHaveCount(0)
    await pageCheck(page)
  })

  test('c07: one source for the explanation, so no source buttons', async ({ page }) => {
    await page.goto(`/hadith/${SAHIH}?lang=ar&theme=light`)
    const sharh = page.locator('#hd-sharh')
    await expect(sharh).toBeVisible()
    await expect(sharh.locator('[role="tablist"], [role="tab"], .src-chip, .source-chip')).toHaveCount(0)
    // The benefits: in the explanation, or (with «تأكد من فهمك», reply 0033 §أ2) in the quiz's own folded part after it.
    await expect(page.getByText('من فوائد الحديث').first()).toBeVisible()
  })

  test('c17: the English interface shows the Encyclopedia’s translation under the text; the Arabic one shows no English', async ({ page }) => {
    await page.goto(`/hadith/${SAHIH}?lang=ar&theme=light`)
    await expect(page.locator('.hd-page [lang="en"]')).toHaveCount(0)
    await page.goto(`/hadith/${SAHIH}?lang=en&theme=light`)
    const tr = page.locator('.hd-tr .hd-tr-text')
    await expect(tr).toBeVisible()
    await expect(tr).toHaveAttribute('lang', 'en')
    const textBox = await page.locator('.hd-frame').boundingBox()
    const trBox = await tr.boundingBox()
    expect(trBox!.y).toBeGreaterThan(textBox!.y)
    await pageCheck(page)
  })

  test('c19: the phone on dark keeps the day page (reply 0043-add7), and the Dorar grade hidden until its token (the three states only in a stub build)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`/hadith/${SAHIH}?lang=ar`)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(246, 244, 239)')
    await expect(page.locator('#hd-grade')).toHaveCount(0)
    // The parts that wait for permission or linking are absent, not grey placeholders (rule 3).
    // As part headings: the hadith's own `reference` may cite «بهجة الناظرين شرح رياض الصالحين» as a book, which is data.
    await expect(page.locator('.hd-part-h', { hasText: 'شرح رياض الصالحين' })).toHaveCount(0)
    await expect(page.locator('.hd-part-h', { hasText: 'استمع لشرحه' })).toHaveCount(0)
    await pageCheck(page)
  })

  test('§11: a weak hadith carries the warning badge, its note, and «أحاديث صحيحة في الموضوع نفسه» (sahih only)', async ({ page }) => {
    await page.goto(`/hadith/${WEAK}?lang=ar&theme=light`)
    const badge = page.locator('#hd-text .grade-badge')
    await expect(badge).toHaveClass(/is-weak/)
    await expect(badge).toContainText('ضعيف')
    await expect(page.locator('.hd-weak-note')).toBeVisible()
    const same = page.locator('#hd-same')
    await expect(same.getByRole('heading', { name: 'أحاديث صحيحة في الموضوع نفسه', exact: true })).toBeVisible()
    const n = await same.locator('li').count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) await expect(same.locator('li').nth(i).locator('.grade-badge')).not.toHaveClass(/is-weak/)
    await pageCheck(page)
  })

  test('§11 mixed: the badge is the whole grade, in the warning colour', async ({ page }) => {
    const api = (await (await page.request.get(`/api/hadith/${MIXED}`)).json()) as { ar: { grade: string; class: string } }
    test.skip(api.ar.class !== 'mixed', 'not loaded as mixed in this database')
    await page.goto(`/hadith/${MIXED}?lang=ar&theme=light`)
    const badge = page.locator('#hd-text .grade-badge')
    await expect(badge).toHaveClass(/is-weak/)
    expect((await badge.locator('.grade-text').textContent())?.trim()).toBe(api.ar.grade.trim())
  })

  test('an unknown id says so, with the back button', async ({ page }) => {
    await page.goto('/hadith/9999999?lang=ar')
    await expect(page.getByText('لم نجد هذا الحديث في المصدر.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'رجوع' })).toBeVisible()
  })
})
