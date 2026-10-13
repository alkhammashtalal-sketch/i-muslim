import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LANG_PICKER } from '../src/v2/lang/strings'

// The language picker of reply 0033 §أ1 (boards LangPicker, LangSearch, LangNotFound, LangPickerN) on a preview of
// next, never the live link. /api/lang-request is answered by a route mock (next has no migration 0012 yet); the
// meanings and HadeethEnc are read from next as served.
//   cd web && BASE_URL=http://localhost:8841 npx playwright test e2e/v2-0033-lang.spec.ts --project=mobile
// SHOTS=dir saves our screens; COMPARE=dir with BOARDS=dir also writes board|ours side by side.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.skip(({ isMobile }) => !isMobile, 'mobile project only')
test.use({ serviceWorkers: 'block' })

const AR = LANG_PICKER.ar
const SHOTS = process.env.SHOTS
const COMPARE = process.env.COMPARE
const BOARDS = process.env.BOARDS

async function shot(page: Page, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const file = path.join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, animations: 'disabled' })
  if (!COMPARE || !BOARDS) return
  const board = path.join(BOARDS, `${name}.png`)
  if (!fs.existsSync(board)) return
  fs.mkdirSync(COMPARE, { recursive: true })
  const b64 = (f: string) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`
  const p = await page.context().newPage()
  await p.setViewportSize({ width: 900, height: 1200 })
  await p.setContent(
    `<body style="margin:0;background:#e9e4d8;display:flex;gap:24px;align-items:flex-start;padding:16px;font:14px sans-serif">
      <figure style="margin:0"><figcaption>board · ${name}</figcaption><img src="${b64(board)}" style="width:420px"></figure>
      <figure style="margin:0"><figcaption>ours</figcaption><img src="${b64(file)}" style="width:420px"></figure></body>`,
  )
  await p.screenshot({ path: path.join(COMPARE, `${name}.png`), fullPage: true })
  await p.close()
}

/** «آخر ما اخترت»: a previous choice on the device, as after choosing English once and coming back to Arabic. */
async function withPrevious(page: Page, prev = 'en') {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('muslim.lang.v1')) localStorage.setItem('muslim.lang.v1', JSON.stringify({ prev: p }))
  }, prev)
}
async function openFromSettings(page: Page, query = '?lang=ar&theme=light') {
  await page.goto(`/${query}`)
  await page.getByRole('button', { name: 'الإعدادات' }).click()
  await page.locator('dialog[open] .v2-set-row', { hasText: 'اللغة' }).click()
  await expect(page).toHaveURL(/\/language/)
  await expect(page.getByRole('heading', { level: 1, name: AR.title })).toBeVisible()
}
const rowOf = (page: Page, name: string | RegExp) => page.locator('.lp-row', { has: page.locator('.lp-name', { hasText: name }) })
const search = (page: Page) => page.getByRole('searchbox', { name: AR.searchLabel })

/** V2 rules 4 and 5 on the screen: no horizontal scroll, text ≥ 13 px, targets ≥ 44 px, nothing interactive nested. */
async function pageCheck(page: Page) {
  const r = await page.evaluate(() => {
    const out = { hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [] as string[], targets: [] as string[], nested: 0 }
    const main = document.querySelector('main')!
    for (const el of main.querySelectorAll<HTMLElement>('*')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (own && el.getBoundingClientRect().width && !el.closest('.sr-only') && parseFloat(getComputedStyle(el).fontSize) < 12.95) out.small.push(`${el.tagName}.${el.className}: ${el.textContent!.slice(0, 20)}`)
    }
    for (const el of [...main.querySelectorAll<HTMLElement>('button, a[href], input'), ...document.querySelectorAll<HTMLElement>('.dt-head button')]) {
      const b = el.getBoundingClientRect()
      if (b.width && (b.height < 43.5 || b.width < 43.5)) out.targets.push(`${el.tagName}.${el.className} ${Math.round(b.width)}x${Math.round(b.height)}`)
      if (el.parentElement?.closest('button, a[href]')) out.nested++
    }
    return out
  })
  expect(r.hscroll, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(r.small, 'text under 13 px').toEqual([])
  expect(r.targets, 'targets under 44 px').toEqual([])
  expect(r.nested, 'interactive inside interactive').toBe(0)
}

/** WCAG AA (4.5:1) for the picker's small texts, against their composited background. */
async function contrastCheck(page: Page) {
  const bad = await page.evaluate(() => {
    // rgb()/rgba() in 0–255, or color(srgb r g b / a) in 0–1 (what color-mix() computes to).
    const rgb = (c: string) => {
      const n = (c.replace(/^color\(srgb/, '').match(/[\d.]+/g) ?? []).map(Number)
      return c.startsWith('color(srgb') ? [...n.slice(0, 3).map((v) => v * 255), ...n.slice(3)] : n
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const mix = (top: number[], bottom: number[]) => {
      const a = top[3] ?? 1
      return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a))
    }
    const bgOf = (el: Element | null): number[] => {
      const chain: number[][] = []
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor)
        if (c.length >= 3 && (c[3] ?? 1) > 0) chain.push(c)
        if (c.length >= 3 && (c[3] ?? 1) === 1) break
      }
      return chain.reverse().reduce((acc, c) => mix(c, acc), [255, 255, 255])
    }
    const out: string[] = []
    for (const el of document.querySelectorAll('.lp-name, .lp-sub, .lp-count, .lp-badge, .lp-note p, .lp-head h2, .lp-h2, .lp-legend-row span:last-child, .lp-nf-body, .lp-nf-title, .lp-request, .dt-head h1')) {
      const fg = rgb(getComputedStyle(el).color)
      const bg = bgOf(el)
      const L1 = lum(mix(fg, bg))
      const L2 = lum(bg)
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      if (ratio < 4.5) out.push(`${el.className || el.tagName} ${ratio.toFixed(2)}`)
    }
    return out
  })
  expect(bad, 'contrast under 4.5:1').toEqual([])
}

test.describe('the list (LangPicker, LangPickerN)', () => {
  test('from the settings: the device language and the last choice above, every served language with its badge, the count from the list', async ({ page }) => {
    await withPrevious(page)
    await page.setViewportSize({ width: 390, height: 1160 })
    await openFromSettings(page)
    const top = page.locator('.lp-card').first()
    await expect(top.locator('.lp-row')).toHaveCount(2)
    await expect(top.locator('.lp-row').nth(0)).toContainText('العربية')
    await expect(top.locator('.lp-row').nth(0)).toContainText(AR.deviceLang)
    await expect(top.locator('.lp-row').nth(0)).toHaveAttribute('aria-pressed', 'true')
    await expect(top.locator('.lp-row').nth(1)).toContainText('English')
    await expect(top.locator('.lp-row').nth(1)).toContainText(AR.lastChosen)
    await expect(page.locator('.lp-head h2')).toHaveText(AR.allLangs)
    await expect(page.locator('.lp-count')).toHaveText('٣١ لغة')
    const all = page.locator('.lp-card').nth(1).locator('.lp-row')
    await expect(all).toHaveCount(31)
    // Ordered by the Arabic name with the browser's Intl.Collator('ar'); line 2 hidden where it equals line 1
    // (Arabic); the two corrections.
    const firstSubs = await all.locator('.lp-sub').allTextContents()
    expect(firstSubs).toEqual(await page.evaluate((x) => [...x].sort(new Intl.Collator('ar').compare), firstSubs))
    expect(firstSubs.slice(0, 2)).toEqual(['الأذربيجانية', 'الأردية'])
    expect(firstSubs).toContain('الملايوية')
    await expect(rowOf(page, 'العربية').last().locator('.lp-sub')).toHaveCount(0)
    // Badges from the data: Arabic and Bengali complete, English, Urdu and Malay without a translated tafsir, Persian none.
    await expect(rowOf(page, 'العربية').last().locator('.lp-badge')).toHaveText(AR.badgeFull)
    await expect(rowOf(page, 'বাংলা').locator('.lp-badge')).toHaveText(AR.badgeFull)
    await expect(rowOf(page, 'English').last().locator('.lp-badge')).toHaveText(AR.badgeNoTafsir)
    await expect(rowOf(page, 'اردو').locator('.lp-badge')).toHaveText(AR.badgeNoTafsir)
    await expect(rowOf(page, 'Melayu').locator('.lp-badge')).toHaveText(AR.badgeNoTafsir)
    await expect(rowOf(page, 'فارسی').locator('.lp-badge')).toHaveCount(0)
    // Every name in its own script, whatever locale data the browser has (Assamese, Uyghur, Pashto).
    for (const [own, ar] of [['অসমীয়া', 'الأسامية'], ['ئۇيغۇرچە', 'الأويغورية'], ['پښتو', 'البشتو']]) await expect(rowOf(page, own).locator('.lp-sub')).toHaveText(ar)
    // The legend as on the board; the board's last note in a true form: «وبقية اللغات مترجمة آليًا» is not true of the
    // 21 languages without an interface, so the eight machine-translated ones are named, and English for the rest.
    await expect(page.locator('.lp-legend')).toContainText(AR.legendFull)
    await expect(page.locator('.lp-legend')).toContainText(AR.legendNoTafsir)
    await expect(page.getByText('وبقية اللغات مترجمة آليًا')).toHaveCount(0)
    await expect(page.locator('.lp-note')).toHaveText(AR.uiNote)
    await expect(page.locator('.lp-note')).toContainText('مترجمة آليًا')
    await expect(page.locator('.lp-note')).toContainText('أما الآيات والأحاديث فلا تُترجم آليًا أبدًا.')
    await shot(page, 'LangPicker')
    await pageCheck(page)
    await contrastCheck(page)
    await page.locator('.lp-note').scrollIntoViewIfNeeded()
    await shot(page, 'LangPicker-end')
  })

  test('night (LangPickerN), and the welcome page’s way in', async ({ page }) => {
    await withPrevious(page)
    await page.setViewportSize({ width: 390, height: 1160 })
    await page.goto('/?lang=ar&theme=dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const link = page.locator('.lang-link')
    await expect(link).toContainText('العربية')
    if (SHOTS) {
      await page.locator('.home-links').screenshot({ path: path.join(SHOTS, 'Welcome-language-link-night.png'), animations: 'disabled' })
    }
    await link.click()
    await expect(page).toHaveURL(/\/language/)
    await expect(page.locator('.lp-row').first()).toBeVisible()
    await shot(page, 'LangPickerN')
    await contrastCheck(page)
    // Back returns to the welcome page.
    await page.getByRole('button', { name: 'رجوع' }).click()
    await expect(page).not.toHaveURL(/\/language/)
    await expect(page.locator('.lang-link')).toBeVisible()
  })

  test('320 px and text at 130%: nothing scrolls sideways; reduced motion: no transition', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/language?lang=ar&theme=light')
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '130%'))
    await expect(page.locator('.lp-row').first()).toBeVisible()
    await pageCheck(page)
    await shot(page, 'LangPicker-320-130pct')
    await search(page).fill('Hmong')
    await expect(page.locator('.lp-request')).toBeVisible()
    await pageCheck(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('.lp-request').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(parseFloat(await page.locator('.lp-request').evaluate((e) => getComputedStyle(e).transitionDuration)) * 1000).toBeLessThanOrEqual(200)
  })
})

test.describe('search (LangSearch)', () => {
  test('«عربي»: the closest result first, its matching word highlighted, line 2 «Arabic · ar», the hint', async ({ page }) => {
    await page.goto('/language?lang=ar&theme=light')
    await search(page).fill('عربي')
    await expect(page.locator('.lp-h2').first()).toHaveText(AR.closest)
    const first = page.locator('.lp-card').first().locator('.lp-row')
    await expect(first).toHaveCount(1)
    await expect(first.locator('mark')).toHaveText('العربية')
    await expect(first.locator('.lp-sub')).toHaveText('Arabic · ar')
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.lp-row')).toHaveCount(1) // «صربي» is not offered for a word found as written
    await expect(page.locator('.lp-note')).toContainText('ونتحمّل الأخطاء الإملائية')
    await expect(page.getByRole('button', { name: AR.clear })).toBeVisible()
    await shot(page, 'LangSearch')
    await pageCheck(page)
    await contrastCheck(page)
  })

  for (const [q, name] of [
    ['انقليزي', 'English'],
    ['Farsi', 'فارسی'],
    ['اردو', 'اردو'],
    ['ar', 'العربية'],
    ['Tagalog', 'Filipino'],
    ['Englsh', 'English'],
  ] as const) {
    test(`«${q}» → ${name}`, async ({ page }) => {
      await page.goto('/language?lang=ar&theme=light')
      await search(page).fill(q)
      await expect(page.locator('.lp-card').first().locator('.lp-row .lp-name')).toHaveText(name)
    })
  }

  test('clearing the search brings the list back; the keyboard reaches a result and chooses it', async ({ page }) => {
    await page.goto('/language?lang=ar&theme=light')
    await search(page).fill('تركي')
    await page.getByRole('button', { name: AR.clear }).click()
    await expect(search(page)).toBeFocused()
    await expect(page.locator('.lp-count')).toBeVisible()
    await page.keyboard.type('تركي')
    await page.keyboard.press('Tab') // the clear button
    await page.keyboard.press('Tab') // the closest result
    await expect(page.locator('.lp-row').first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })
})

test.describe('a language not served (LangNotFound)', () => {
  test('«Hmong»: the word in «», a request with the normalised text only, sent once, then thanks', async ({ page }) => {
    const posted: unknown[] = []
    await page.route('**/api/lang-request', (r) => {
      posted.push(r.request().postDataJSON())
      return r.fulfill({ json: { ok: true } })
    })
    await page.goto('/language?lang=ar&theme=light')
    await search(page).fill('Hmong')
    await expect(page.locator('.lp-nf-title')).toHaveText('ما لقينا «Hmong» بين لغاتنا الحين')
    await expect(page.locator('.lp-nf-body')).toHaveText(AR.notFoundBody)
    await expect(page.locator('.lp-note')).toContainText(AR.requestPrivacy)
    await expect(page.locator('.lp-h2')).toHaveText(AR.untilThen)
    await expect(page.locator('.lp-row .lp-name')).toHaveText('English')
    await shot(page, 'LangNotFound')
    await pageCheck(page)
    await contrastCheck(page)
    await page.getByRole('button', { name: AR.request }).click()
    await expect(page.getByText(AR.requestSent)).toBeVisible()
    expect(posted).toEqual([{ text: 'hmong' }])
    // The same request is never sent twice from this device.
    await page.getByRole('button', { name: AR.clear }).click()
    await search(page).fill('HMONG')
    await expect(page.getByText(AR.requestSent)).toBeVisible()
    await expect(page.getByRole('button', { name: AR.request })).toHaveCount(0)
    await page.reload()
    await search(page).fill('hmong')
    await expect(page.getByText(AR.requestSent)).toBeVisible()
    expect(posted).toHaveLength(1)
  })

  test('«ألباني»: its «أل» is not the article; found only by a slip («اسباني»), it can still be requested', async ({ page }) => {
    const posted: unknown[] = []
    await page.route('**/api/lang-request', (r) => {
      posted.push(r.request().postDataJSON())
      return r.fulfill({ json: { ok: true } })
    })
    await page.goto('/language?lang=ar&theme=light')
    await search(page).fill('ألباني')
    await expect(page.locator('.lp-h2').first()).toHaveText(AR.closest)
    await expect(page.locator('.lp-row .lp-name', { hasText: '日本語' })).toHaveCount(0)
    await expect(page.locator('.lp-nf-slip .lp-nf-title')).toHaveText('إن لم تجد «ألباني» بينها فاطلبها.')
    await shot(page, 'LangSearch-slip-request')
    await pageCheck(page)
    await contrastCheck(page)
    await page.getByRole('button', { name: AR.request }).click()
    await expect(page.getByText(AR.requestSent)).toBeVisible()
    // «ألمانية» and «الألمانية» are one request text; «ألماني» is its own word, not «ماني».
    await page.getByRole('button', { name: AR.clear }).click()
    await search(page).fill('الألمانية')
    await expect(page.locator('.lp-nf-title')).toHaveText('ما لقينا «الألمانية» بين لغاتنا الحين')
    await page.getByRole('button', { name: AR.request }).click()
    await expect(page.getByText(AR.requestSent)).toBeVisible()
    await page.getByRole('button', { name: AR.clear }).click()
    await search(page).fill('ألمانية')
    await expect(page.getByText(AR.requestSent)).toBeVisible() // the same text: already sent from this device
    expect(posted).toEqual([{ text: 'الباني' }, { text: 'المانيه' }])
  })

  test('over the daily limit the server says 429 and the page says so; a name with digits cannot be requested', async ({ page }) => {
    await page.route('**/api/lang-request', (r) => r.fulfill({ status: 429, json: { ok: false, error: 'rate_limited' } }))
    await page.goto('/language?lang=ar&theme=light')
    await search(page).fill('Yoruba')
    await page.getByRole('button', { name: AR.request }).click()
    await expect(page.getByText(AR.requestLimited)).toBeVisible()
    await expect(page.getByRole('button', { name: AR.request })).toBeVisible() // not recorded as sent
    await page.getByRole('button', { name: AR.clear }).click()
    await search(page).fill('x1')
    await expect(page.locator('.lp-nf-msg')).toHaveText(AR.requestLetters)
    await expect(page.getByRole('button', { name: AR.request })).toHaveCount(0)
  })
})

test.describe('content language (decision 2)', () => {
  test('Persian: English buttons, the meanings asked and shown in Persian right to left, HadeethEnc in Arabic alone', async ({ page }) => {
    await page.goto('/language?lang=ar&theme=light')
    await rowOf(page, 'فارسی').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('imuslim.settings.v1') ?? '{}'))
    expect(stored).toMatchObject({ lang: 'en', content: 'fa' })
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('muslim.lang.v1') ?? '{}').prev)).toBe('ar')
    // The welcome link and the settings row name the content language.
    await expect(page.locator('.lang-link')).toContainText('فارسی')
    // The reader asks for the Persian meaning and shows it right to left.
    const sura = page.waitForRequest((r) => /\/api\/sura\/1\?/.test(r.url()))
    await page.goto('/quran/1')
    expect(new URL((await sura).url()).searchParams.get('ml')).toBe('fa')
    const tr = page.locator('.translation[lang="fa"]').first()
    await expect(tr).toBeVisible()
    await expect(tr).toHaveAttribute('dir', 'rtl')
    expect((await tr.textContent())!.trim().length).toBeGreaterThan(5)
    // The hadith page asks HadeethEnc in Persian, which it does not have: the Arabic alone.
    const had = page.waitForRequest((r) => /\/api\/hadith\/4196\?/.test(r.url()))
    await page.goto('/hadith/4196')
    expect(new URL((await had).url()).searchParams.get('lang')).toBe('fa')
    await expect(page.locator('.hd-text')).toBeVisible()
    await expect(page.locator('.hd-tr-text')).toHaveCount(0)
    // Back in the picker: Persian is checked; the device's Arabic above; the previous choice is the device's, so once.
    await page.goto('/language')
    await expect(rowOf(page, 'فارسی')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.lp-card').first().locator('.lp-row')).toHaveCount(1)
    // English interface: line 2 in English, ordered by the English names.
    await expect(page.getByRole('heading', { level: 1, name: 'Language' })).toBeVisible()
    await expect(rowOf(page, 'فارسی').locator('.lp-sub')).toHaveText('Persian')
    await shot(page, 'LangPicker-en-fa')
  })

  test('Urdu: one of the ten sets both, right to left; the picker says its buttons are machine-translated', async ({ page }) => {
    await page.goto('/language?lang=ar&theme=light')
    await rowOf(page, 'اردو').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('imuslim.settings.v1') ?? '{}'))).toMatchObject({ lang: 'ur', content: 'ur' })
    // CLAUDE.md §4: the eight interface languages other than Arabic and English are marked machine translation.
    await page.goto('/language')
    await expect(page.locator('.lp-note')).toHaveText(LANG_PICKER.ur.uiNote)
    await expect(page.locator('.lp-note')).toContainText('مشینی ترجمہ')
  })
})
