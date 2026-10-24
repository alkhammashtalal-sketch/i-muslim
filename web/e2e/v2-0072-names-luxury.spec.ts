import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { DATA, ENRICHED, PLACEHOLDER_MEANINGS, PLACEHOLDER_SALAF, shown } from './names-stub'
import { namesRoute } from './names-stub'

// The luxury name card (add-on 0072-add11 §1): one design for the home («يومك») and the name's page.
// - The header: the painting's sky and gold frame, the name in the shamsa, «اسم الله لليوم · <n> من 96 · <Hijri>».
// - The sections in order, present-only: الدليل، معنى الاسم عند العلماء، من أقوال السلف في الاسم، أثره في قلبك، ادعُ الله
//   به، تفسير الآية (folded). The two new sections come from the server (§2, another branch): here they are the
//   placeholders of e2e/names-stub.ts (their words say so), and without them the sections are absent.
// - On the home: the header, the evidence, the first meaning quote and one saying, then «أكمل القراءة» opens the rest in
//   place, no navigation. The footer: «شارك» (/today/name/<n>/share), previous and next, «كل الأسماء», the book.
// - Night (Isha to Fajr in Riyadh): the night painting. Outside Arabic: add-on 0071-add5 §2.3.
// - AA contrast for every text in the card, nothing sideways at 320 with 135% text, motion ≤ 200 ms and none with reduced
//   motion, labels for screen readers, no exclamation mark.
// Against a vite server of this branch proxied to a server with NAMES_READINGS on (env v11):
//   VITE_API_PROXY=https://i-muslim-v11.… npx vite --port 8853 & BASE_URL=http://localhost:8853 npx playwright test v2-0072-names-luxury --project=mobile
// Screenshots (SHOTS_DIR, default out/shots/0072-names-card): home closed and open, the page, by day and by night, on
// the iPhone 16 Pro Max (440 × 956) and SE (375 × 667), in Arabic and English.
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(import.meta.dirname, '../../out/shots/0072-names-card')
const HEADING = 'شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء'
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
/** Entry n's day (the rotation's epoch 2026-10-22), at a Riyadh time: 10:00 is the morning, 21:30 the night. */
const at = (n: number, hhmm = '10:00') => new Date(Date.parse(`2026-10-22T${hhmm}:00+03:00`) + (n - 1) * 86_400_000)
const ORDER = ['evidence', 'meaning', 'salaf', 'heart', 'dua', 'tafsir']
/** The shots on «الوكيل» (25 October's batch, 26 October's name) when the reviewed batch is given, else «الحفيظ». */
const SHOT_N = ENRICHED?.['5'] ? 5 : 2
const DEVICES = { promax: { width: 440, height: 956 }, se: { width: 375, height: 667 } } as const

async function setup(page: Page, o: { n: number; time?: string; enriched?: boolean; heart?: boolean; place?: boolean } = { n: 2 }) {
  await namesRoute(page, { enriched: o.enriched ?? true, heart: o.heart ?? false })
  await page.addInitScript((place) => {
    localStorage.setItem('muslim.welcome.v1', '1')
    if (place) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
  }, o.place === false ? null : RIYADH)
  await page.clock.setFixedTime(at(o.n, o.time))
}

async function home(page: Page, lang: string, o: Parameters<typeof setup>[1]) {
  await setup(page, o)
  await page.goto(`/?lang=${lang}&theme=light`)
  const card = page.getByTestId('name-day')
  await expect(card).toHaveAttribute('data-n', String(o.n))
  await expect(card).toHaveAttribute('data-mode', 'home')
  await expect(card.locator('.nc-sec').first()).toBeVisible()
  return card
}

async function namePage(page: Page, lang: string, o: Parameters<typeof setup>[1]) {
  await setup(page, o)
  await page.goto(`/today/name/${o.n}?lang=${lang}&theme=light`)
  const card = page.getByTestId('name-page').getByTestId('name-day')
  await expect(card).toHaveAttribute('data-n', String(o.n))
  await expect(card.locator('.nc-sec').first()).toBeVisible()
  return card
}

const sections = (card: Locator) => card.locator('.nc-sec').evaluateAll((xs) => xs.map((x) => (x as HTMLElement).dataset.sec))

/** The fonts and the shamsa's picture loaded, the name fitted. */
async function settled(page: Page, card: Locator) {
  await page.evaluate(() => document.fonts.ready)
  await card.locator('.nc-shamsa-art').evaluate((img: HTMLImageElement) => (img.complete ? null : new Promise((r) => (img.onload = r))))
  await page.waitForTimeout(150)
}

async function shoot(page: Page, card: Locator, name: string) {
  const size = page.viewportSize()!
  await settled(page, card)
  const h = await card.evaluate((x) => x.getBoundingClientRect().height)
  await page.setViewportSize({ width: size.width, height: Math.max(size.height, Math.ceil(h) + 400) })
  await settled(page, card)
  // The app's fixed bars (the tab bar, the screen's head) out of the card's picture, then back.
  const hidden = await card.evaluate((c) => {
    const els = [...document.querySelectorAll<HTMLElement>('body *')].filter((x) => !c.contains(x) && !x.contains(c) && ['fixed', 'sticky'].includes(getComputedStyle(x).position))
    els.forEach((x) => (x.dataset.shotHidden = x.style.visibility || '-', (x.style.visibility = 'hidden')))
    return els.length
  })
  fs.mkdirSync(SHOTS, { recursive: true })
  await card.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' })
  if (hidden)
    await page.evaluate(() =>
      document.querySelectorAll<HTMLElement>('[data-shot-hidden]').forEach((x) => {
        x.style.visibility = x.dataset.shotHidden === '-' ? '' : x.dataset.shotHidden!
        delete x.dataset.shotHidden
      }),
    )
  await page.setViewportSize(size)
}

/** Nothing inside `root` scrolls sideways, and it stays in the screen's width. */
async function noSideways(root: Locator, width: number) {
  const over = await root.evaluate((el) =>
    [el, ...el.querySelectorAll('*')]
      .filter((x) => (x as HTMLElement).scrollWidth > (x as HTMLElement).clientWidth + 1 && getComputedStyle(x).overflowX !== 'visible')
      .map((x) => (x as HTMLElement).className || x.tagName),
  )
  expect(over).toEqual([])
  const box = (await root.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5)
  // The name inside the disc: its ink within the disc's box.
  const disc = await root.locator('.nc-disc').boundingBox()
  const name = await root.locator('.nc-name').boundingBox()
  expect(name!.width).toBeLessThanOrEqual(disc!.width + 0.5)
  expect(name!.height).toBeLessThanOrEqual(disc!.height + 0.5)
}

/** Every text in the card against its ground, WCAG AA (4.5:1; 3:1 for 18.66 px bold or 24 px and up). The ground is the
 *  nearest painted background; the name's is the shamsa's disc, its darkest pixel in the picture. */
async function contrast(card: Locator) {
  return card.evaluate(async (root) => {
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
      return (x + 0.05) / (y + 0.05)
    }
    // rgb()/rgba(), or color(srgb r g b / a) in 0–1 (what color-mix() computes to).
    const rgba = (s: string) => {
      const n = (s.match(/[\d.]+/g) ?? []).map(Number)
      return s.startsWith('color(') ? [n[0] * 255, n[1] * 255, n[2] * 255, ...(n.length > 3 ? [n[3]] : [])] : n
    }
    const over = (top: number[], under: number[]) => {
      const a = top[3] ?? 1
      return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a))
    }
    // The disc's darkest pixel, from the picture itself.
    const img = root.querySelector<HTMLImageElement>('.nc-shamsa-art')!
    const cv = document.createElement('canvas')
    cv.width = 660
    cv.height = 660
    const ctx = cv.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(230, 230, 200, 200).data
    let disc = [255, 255, 255]
    for (let i = 0; i < px.length; i += 4) {
      const dx = ((i / 4) % 200) - 100
      const dy = Math.floor(i / 4 / 200) - 100
      if (dx * dx + dy * dy > 120 * 120) continue
      const c = [px[i], px[i + 1], px[i + 2]]
      if (lum(c) < lum(disc)) disc = c
    }
    const ground = (el: Element): number[] => {
      const layers: number[][] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = rgba(getComputedStyle(e).backgroundColor)
        if (c.length >= 3 && (c[3] ?? 1) > 0) {
          layers.push(c)
          if ((c[3] ?? 1) >= 1) break
        }
      }
      return layers.reduceRight((under, top) => over(top, under), [255, 255, 255])
    }
    const bad: string[] = []
    let n = 0
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const own = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent!.trim())
      if (!own) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || (el as HTMLElement).offsetParent === null) continue
      const fg = rgba(cs.color)
      const bg = el.closest('.nc-name') ? disc : ground(el)
      const r = ratio(over(fg, bg), bg)
      const size = parseFloat(cs.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
      n++
      if (r < (large ? 3 : 4.5)) bad.push(`${(el as HTMLElement).className || el.tagName} ${r.toFixed(2)} «${el.textContent!.trim().slice(0, 24)}»`)
    }
    return { n, bad }
  })
}

test.describe('the home: the card opens in place', () => {
  test('ar: header, evidence, the first meaning, one saying, then «أكمل القراءة» shows the rest here', async ({ page, request }) => {
    const card = await home(page, 'ar', { n: 2 })
    // The header: the name in the shamsa, the line under it.
    await expect(card.locator('h2.nc-name')).toHaveText('الحفيظ')
    await expect(card.getByTestId('name-line')).toContainText('اسم الله لليوم، ٢ من ٩٦، ')
    await expect(card.getByTestId('name-line')).toContainText('هـ')
    await expect(card.locator('.nc-shamsa-art')).toHaveAttribute('alt', '')
    await expect(card).toHaveAttribute('aria-label', 'اسم الله لليوم: الحفيظ')
    // Closed: the evidence from D1, one meaning quote, one saying; nothing else.
    expect(await sections(card)).toEqual(['evidence', 'meaning', 'salaf'])
    const q = card.locator('[data-sec="evidence"] [data-part="ayah"]')
    await expect(q).toHaveAttribute('data-id', 'quran:11:57')
    const p = (await (await request.get('/api/passage/quran:11:57')).json()) as { text: string }
    expect(((await q.locator('.nd-ayah').textContent()) ?? '').startsWith(p.text.trimEnd())).toBe(true)
    await expect(card.locator('[data-sec="meaning"] .nc-quote')).toHaveCount(1)
    await expect(card.locator('[data-sec="meaning"] .nc-quote-text')).toHaveText(PLACEHOLDER_MEANINGS[0].text)
    await expect(card.locator('[data-sec="meaning"] .nc-sayer')).toHaveText(`قال ${PLACEHOLDER_MEANINGS[0].by}`)
    await expect(card.locator('[data-sec="meaning"] .nc-src')).toContainText('«(اسم الكتاب)» ل(المؤلف)، ج1، ص1 · المكتبة الشاملة')
    // The ayah the scholar explains, inside the quote's frame above his words, a link to it in the reader.
    await expect(card.locator('[data-sec="meaning"] .nc-quote-box .nc-context a')).toHaveAttribute('href', '/quran/11/57')
    await expect(card.locator('[data-sec="salaf"] .nc-quote')).toHaveCount(1)
    await expect(card.getByTestId('name-day-readings')).toHaveCount(0)
    await expect(card.getByTestId('name-foot')).toHaveCount(0)
    // The two places for the listen button, empty.
    await expect(card.locator('[data-listen-slot="name"]')).toBeAttached()
    await expect(card.locator('[data-listen-slot="evidence"]')).toHaveAttribute('data-id', 'quran:11:57')
    const more = card.getByTestId('name-more')
    await expect(more).toHaveText('أكمل القراءة')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await expect(more).toBeEnabled()
    await shoot(page, card, 'check-home-closed-ar-390.png')
    // Open: in place, the URL unchanged, all six in order, the focus on the first new head.
    await more.click()
    await expect(page).toHaveURL(/\/\?lang=ar/)
    await expect(card).toHaveAttribute('data-open', 'true')
    expect(await sections(card)).toEqual(ORDER)
    await expect(card.locator('[data-sec="meaning"] .nc-quote')).toHaveCount(2)
    await expect(card.locator('[data-sec="salaf"] .nc-sayer').nth(1)).toHaveText(`يُروى عن ${PLACEHOLDER_SALAF[1].by}`)
    await expect(page.locator(':focus')).toHaveText(/أثره في قلبك/)
    await expect(card.getByTestId('name-day-readings').locator('.nd-made-h')).toHaveText(HEADING)
    await expect(card.getByTestId('name-day-readings')).toContainText(shown(DATA.entries[1].readings.easy))
    // The tafsir folded: al-Saʿdi, then Ibn Kathir.
    const folds = card.locator('[data-sec="tafsir"] details')
    await expect(folds).toHaveCount(2)
    await expect(folds.nth(0)).toHaveAttribute('data-key', 'saadi')
    await expect(folds.nth(1)).toHaveAttribute('data-key', 'katheer')
    for (const f of await folds.all()) expect(await f.evaluate((d: HTMLDetailsElement) => d.open)).toBe(false)
    await expect(card.locator('[data-sec="dua"] [data-part="ayah"]')).toHaveAttribute('data-id', 'quran:3:8')
    // The footer.
    await expect(card.getByTestId('name-share')).toHaveAttribute('href', '/today/name/2/share')
    await expect(card.getByTestId('name-prev')).toContainText('الصمد')
    await expect(card.getByTestId('name-next')).toContainText(DATA.entries[2].name)
    await expect(card.getByTestId('name-all')).toHaveAttribute('href', '/today/names')
    await expect(card.getByTestId('name-book')).toHaveCount(1)
    await shoot(page, card, 'check-home-open-ar-390.png')
  })

  test('today’s content only (no meanings or sayings from the server yet): those two sections are absent, never filled', async ({ page }) => {
    const card = await home(page, 'ar', { n: 2, enriched: false })
    expect(await sections(card)).toEqual(['evidence'])
    await card.getByTestId('name-more').click()
    expect(await sections(card)).toEqual(['evidence', 'heart', 'dua', 'tafsir'])
    await expect(card.locator('.nc-quote')).toHaveCount(0)
  })

  test('a hadith as the evidence, with its grade and takhrij (الشافي)', async ({ page, request }) => {
    const card = await home(page, 'ar', { n: 4, enriched: false })
    const h = card.locator('[data-sec="evidence"] [data-part="hadith"]')
    const id = (await h.getAttribute('data-id'))!
    const got = (await (await request.get(`/api/adhkar/hadith/${id}?lang=ar`)).json()) as { text: string; grade: string; attribution: string }
    await expect(h.locator('.tool-text')).toHaveText(got.text)
    await expect(h.locator('.tool-meta')).toContainText(got.grade)
    await expect(card.locator('[data-listen-slot="evidence"]')).toHaveAttribute('data-id', `hadith:${id}`)
  })

  test('an entry whose only Quranic text is a dua leads with it (الحكم)', async ({ page }) => {
    const card = await home(page, 'ar', { n: 84, enriched: false })
    expect(await sections(card)).toEqual(['dua'])
    await expect(card.locator('[data-sec="dua"] [data-part="ayah"]')).toHaveAttribute('data-id', 'quran:7:89')
  })

  test('the «أثره في قلبك» rewrite takes the readings’ place under the same heading when the server sends it', async ({ page }) => {
    const card = await namePage(page, 'ar', { n: 2, heart: true })
    const rd = card.getByTestId('name-day-readings')
    await expect(rd.locator('.nd-made-h')).toHaveText(HEADING)
    await expect(rd).toContainText('[نص تجريبي لشكل «أثره في قلبك»')
    await expect(rd).not.toContainText('قراءة ميسرة:')
  })
})

test('the content branch’s reviewed batch (الوكيل): three meanings, the saying with how it is carried, the context line, «أثره في قلبك»', async ({ page }) => {
  test.skip(!ENRICHED?.['5'], 'NAMES_ENRICHED_FILE: data/names-enriched.json of the content branch')
  const e = ENRICHED!['5'] as { meaning: { text: string; by: string; context?: string }[]; salaf: { text: string; via?: string }[]; heart: string }
  const card = await namePage(page, 'ar', { n: 5 })
  expect(await sections(card)).toEqual(ORDER)
  await expect(card.locator('[data-sec="meaning"] .nc-quote-text')).toHaveText(e.meaning.map((q) => q.text))
  await expect(card.locator('[data-sec="meaning"] .nc-sayer').first()).toHaveText(`قال ${e.meaning[0].by}`)
  await expect(card.locator('[data-sec="meaning"] .nc-src').first()).toContainText('«جامع البيان عن تأويل آي القرآن» لابن جرير الطبري، ج20، ص241 · المكتبة الشاملة')
  await expect(card.locator('[data-sec="meaning"] .nc-quote').first().locator('.nc-context')).toHaveText(e.meaning[0].context!)
  await expect(card.locator('[data-sec="salaf"] .nc-quote-text')).toHaveText(e.salaf[0].text)
  await expect(card.locator('[data-sec="salaf"] .nc-via')).toHaveText(e.salaf[0].via!)
  const rd = card.getByTestId('name-day-readings')
  await expect(rd.locator('.nd-made-h')).toHaveText(HEADING)
  await expect(rd.getByTestId('name-day-readings-ar')).toHaveText(shown(e.heart))
  await expect(rd).not.toContainText('قراءة ميسرة:')
  await shoot(page, card, 'check-page-ar-batch1-5.png')
  // A prophet's words in the ayah (الشافي: «وإذا مرضت فهو يشفين»): the context line against the scholar's words.
  test.skip(!ENRICHED?.['4'], 'no entry 4')
  const c4 = await namePage(page, 'ar', { n: 4 })
  const q4 = c4.locator('[data-sec="meaning"] .nc-quote').first()
  await expect(q4.locator('.nc-quote-box > .nc-context + .nc-quote-text')).toBeVisible()
  await shoot(page, c4, 'check-page-ar-batch1-4.png')
})

test.describe('the name’s page: the same card, open whole', () => {
  test('ar: the six sections in order, the footer, and another name without a date', async ({ page }) => {
    const card = await namePage(page, 'ar', { n: 2 })
    expect(await sections(card)).toEqual(ORDER)
    await expect(card.getByTestId('name-more')).toHaveCount(0)
    await expect(card.getByTestId('name-line')).toContainText('اسم الله لليوم، ٢ من ٩٦، ')
    await card.getByTestId('name-book').click()
    await expect(page.getByTestId('name-sheet')).toBeVisible()
    await page.keyboard.press('Escape')
    await card.getByTestId('name-next').click()
    await expect(page).toHaveURL(/\/today\/name\/3(\?|$)/)
    const next = page.getByTestId('name-page').getByTestId('name-day')
    await expect(next).toHaveAttribute('data-n', '3')
    await expect(next.getByTestId('name-line')).toHaveText('اسم من أسماء الله، ٣ من ٩٦')
  })

  test('en: the name in Arabic, the line in English, the meaning of the ayah, the quotes and the readings in Arabic under their lines', async ({ page }) => {
    const card = await namePage(page, 'en', { n: 2 })
    await expect(card.locator('.nc-name')).toHaveAttribute('lang', 'ar')
    await expect(card.getByTestId('name-line')).toContainText('Allah’s Name for today, 2 of 96, ')
    await expect(card.locator('[data-sec="evidence"] .nc-h')).toHaveText('The evidence')
    await expect(card.locator('[data-sec="evidence"] .translation[lang="en"]')).not.toBeEmpty()
    await expect(card.locator('[data-sec="meaning"] .nc-note')).toHaveText('The text is in Arabic, as in its source')
    await expect(card.locator('[data-sec="meaning"] .nc-quote').first()).toHaveAttribute('lang', 'ar')
    await expect(card.getByTestId('name-day-in-arabic')).toHaveText('The explanation is available in Arabic')
    await expect(card.getByTestId('name-day-readings-ar')).toHaveAttribute('lang', 'ar')
    await expect(card.getByTestId('name-share')).toHaveText('Share')
  })
})

test('night (Isha to Fajr in Riyadh): the night painting; by day the day one', async ({ page }) => {
  const card = await home(page, 'ar', { n: 2, time: '21:30' })
  await expect(card).toHaveAttribute('data-night', 'true')
  // The night's tone over the field, and the same over the shamsa's outer sky.
  const night = await card.locator('.nc-head').evaluate((x) => [getComputedStyle(x, '::before').mixBlendMode, getComputedStyle(x.querySelector('.nc-shamsa')!, '::after').mixBlendMode])
  expect(night).toEqual(['multiply', 'multiply'])
  await page.clock.setFixedTime(at(2, '10:00'))
  await page.reload()
  await expect(page.getByTestId('name-day')).not.toHaveAttribute('data-night', 'true')
})

test('AA contrast for every text, by day and by night, home open and the page, ar and en', async ({ page }) => {
  for (const [lang, time] of [
    ['ar', '10:00'],
    ['ar', '21:30'],
    ['en', '10:00'],
    ['en', '21:30'],
  ] as const) {
    const card = await home(page, lang, { n: 2, time })
    await card.getByTestId('name-more').click()
    await card.locator('[data-sec="tafsir"] details').first().evaluate((d: HTMLDetailsElement) => (d.open = true))
    await settled(page, card)
    const r = await contrast(card)
    expect(r.n).toBeGreaterThan(20)
    expect(r.bad, `${lang} ${time}`).toEqual([])
  }
})

test('320 at 135% text: nothing sideways, the name inside its disc (home open, the page; ar and en; and the longest names)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.addInitScript(() => {
    const apply = () => {
      if (!document.documentElement) return false
      document.documentElement.style.setProperty('font-size', '135%', 'important')
      return true
    }
    if (!apply()) {
      const mo = new MutationObserver(() => apply() && mo.disconnect())
      mo.observe(document, { childList: true, subtree: true })
    }
  })
  for (const lang of ['ar', 'en']) {
    const card = await home(page, lang, { n: 2 })
    await card.getByTestId('name-more').click()
    await settled(page, card)
    await noSideways(card, 320)
    await noSideways(await namePage(page, lang, { n: 2 }), 320)
  }
  // The longest names, and the two pairs on two lines.
  const long = [...DATA.entries].sort((a, b) => b.name.length - a.name.length).slice(0, 4)
  for (const e of long) {
    const card = await namePage(page, 'ar', { n: e.n, enriched: false })
    await settled(page, card)
    await noSideways(card, 320)
  }
})

test('motion: the chevron’s turn within 200 ms, none with reduced motion; labels; no exclamation mark', async ({ page, browser }) => {
  const card = await namePage(page, 'ar', { n: 2 })
  const durs = await card.evaluate((el) =>
    [el, ...el.querySelectorAll('*')].flatMap((x) => {
      const cs = getComputedStyle(x)
      return [...cs.transitionDuration.split(','), ...cs.animationDuration.split(',')].map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000))
    }),
  )
  expect(Math.max(...durs)).toBeLessThanOrEqual(200)
  expect(await card.innerText()).not.toMatch(/[!！]/)
  // Screen readers: the card named, each section by its head, the folds' names.
  await expect(card).toHaveAttribute('aria-label', 'اسم الله لليوم: الحفيظ')
  for (const s of await card.locator('.nc-sec').all()) {
    const id = await s.getAttribute('aria-labelledby')
    await expect(s.locator(`[id="${id}"]`)).not.toBeEmpty()
  }
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const p2 = await ctx.newPage()
  await setup(p2, { n: 2 })
  await p2.goto(`${process.env.BASE_URL}/today/name/2?lang=ar&theme=light`)
  const c2 = p2.getByTestId('name-day')
  await expect(c2.locator('.nc-down').first()).toBeAttached()
  expect(await c2.locator('.nc-down').first().evaluate((x) => getComputedStyle(x).transitionDuration)).toBe('0s')
  await ctx.close()
})

// The screenshots for the review (add-on 0072-add11 §4): home closed and open, the page; day and night; 16 Pro Max and
// SE; Arabic and English. The meaning and Salaf sections show the placeholders (their words say so).
for (const [dev, size] of Object.entries(DEVICES)) {
  for (const lang of ['ar', 'en']) {
    for (const [look, time] of [
      ['day', '10:00'],
      ['night', '21:30'],
    ] as const) {
      test(`shots: ${dev} ${lang} ${look}`, async ({ page }) => {
        await page.setViewportSize(size)
        const card = await home(page, lang, { n: SHOT_N, time })
        await shoot(page, card, `home-closed-${lang}-${look}-${dev}.png`)
        // The home as the reader sees it on the screen, the card at the top of the view.
        await card.evaluate((x) => x.scrollIntoView({ block: 'start' }))
        await settled(page, card)
        fs.mkdirSync(SHOTS, { recursive: true })
        await page.screenshot({ path: path.join(SHOTS, `screen-home-${lang}-${look}-${dev}.png`), animations: 'disabled' })
        await card.getByTestId('name-more').click()
        await shoot(page, card, `home-open-${lang}-${look}-${dev}.png`)
        const pg = await namePage(page, lang, { n: SHOT_N, time })
        await shoot(page, pg, `page-${lang}-${look}-${dev}.png`)
      })
    }
  }
}
