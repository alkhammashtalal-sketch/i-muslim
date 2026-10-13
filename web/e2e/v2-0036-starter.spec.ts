import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import categories from '../../worker/src/config/hadith-categories.json' with { type: 'json' }
import fixture from '../../worker/test/fixtures/starter-stories.json' with { type: 'json' }
import { buildStories, type StoryRow } from '../../worker/src/starter-rules'
import stories from '../../data/starter-stories.json' with { type: 'json' }
import { STRINGS } from '../src/i18n'
import { ANSWER } from '../src/v2/answer/strings'

// A step of the starting path as a page, and «قصص من السنة» (reply 0036 part ب; boards StarterSalah, StarterSalahN),
// on a LOCAL preview of next only (never the live link):
//   cd worker && bash ../scripts/wr.sh dev --remote --env next --port 8861
//   cd web && BASE_URL=http://localhost:8861 npx playwright test e2e/v2-0036-starter.spec.ts --project=mobile
// data/starter-stories.json names no stories yet (Talal writes it), so the preview's own route answers none and the
// steps show no card. The prayer step's card is built from the test fixture (worker/test/fixtures/starter-stories.json):
// its route is answered here by the Worker's own rules (worker/src/starter-rules.ts) applied to the rows the preview
// serves from D1 for those ids (/api/hadith/:id), so every title, grade and takhrij on the screen is D1's.
// SHOTS=dir saves our screens; COMPARE=dir with BOARDS=dir also writes board | ours side by side.
test.skip(!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(process.env.BASE_URL ?? ''), 'a local preview only (BASE_URL=http://localhost:…), never the live link')
test.skip(({ isMobile }) => !isMobile, 'mobile project only')
test.use({ serviceWorkers: 'block' })
// A fixture route may still be reading D1's rows when a test ends.
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: 'ignoreErrors' }))

const AR = STRINGS.ar
const EN = STRINGS.en
const TITLES = (categories as { titles: Record<string, string> }).titles
const ENTRY = fixture.steps.salah
const SHOTS = process.env.SHOTS
const COMPARE = process.env.COMPARE
const BOARDS = process.env.BOARDS
// The board's own texts (out/design-v2/additions/boards/StarterSalah.dc.html), for the Arabic screen.
const BOARD = {
  where: 'مسار البداية · الخطوة ٦ من ١٠',
  q: 'لماذا يصلي المسلمون؟',
  lead: 'اسأل، ويجيبك «مسلم» من مصادره بنصّها ومرجعها.',
  ask: 'اسأل هذا السؤال',
  storiesTitle: 'قصص من السنة',
  intro: 'مواقف حقيقية من حياة النبي ﷺ وأصحابه في الصلاة، كل قصة بنصها ودرجتها وشرحها. اضغط أي قصة تقرأها.',
  done: 'أنهيت هذه الخطوة',
  next: 'الخطوة التالية: الطهارة',
}

async function shot(page: Page, name: string, board?: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  const file = path.join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, animations: 'disabled' })
  if (!COMPARE || !BOARDS || !board) return
  const src = path.join(BOARDS, `${board}.png`)
  if (!fs.existsSync(src)) return
  fs.mkdirSync(COMPARE, { recursive: true })
  const b64 = (f: string) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`
  const p = await page.context().newPage()
  await p.setViewportSize({ width: 900, height: 1200 })
  // The board's picture is its 390 px screen at 3x inside a margin (1338 px wide): 446 px shows it at our scale.
  await p.setContent(
    `<body style="margin:0;background:#e9e4d8;display:flex;gap:24px;align-items:flex-start;padding:16px;font:600 14px sans-serif">
      <figure style="margin:0"><figcaption style="margin-bottom:8px">Board · ${board}</figcaption><img src="${b64(src)}" style="width:446px;display:block"></figure>
      <figure style="margin:0;padding-top:${Math.round(85 / 3)}px"><figcaption style="margin-bottom:8px">Ours · ${name}</figcaption><img src="${b64(file)}" style="width:390px;display:block;border-radius:28px"></figure></body>`,
  )
  await p.screenshot({ path: path.join(COMPARE, `${name}.png`), fullPage: true })
  await p.close()
}

type Api = { ar: StoryRow & { categories: string[] }; tr?: StoryRow & { categories: string[] } }
/** The prayer step's card from the fixture: the preview's D1 rows by id, through the Worker's own rules. */
async function withFixture(page: Page) {
  const served: string[] = []
  await page.route(/\/api\/starter\/salah\/stories(\?|$)/, async (route) => {
    const lang = new URL(route.request().url()).searchParams.get('lang') ?? 'ar'
    const pairs = []
    for (const id of ENTRY.stories) {
      const r = await page.request.get(`/api/hadith/${id}?lang=${lang}`)
      const p = r.ok() ? ((await r.json()) as Api) : null
      pairs.push({ ar: p?.ar, tr: lang === 'ar' ? undefined : p?.tr })
    }
    const body = buildStories('salah', ENTRY, pairs, TITLES)
    served.push(lang)
    await route.fulfill({ json: body, headers: { 'cache-control': 'no-store' } })
  })
  return served
}
const rowsOf = async (page: Page, lang: string) =>
  Promise.all(ENTRY.stories.map(async (id) => (await (await page.request.get(`/api/hadith/${id}?lang=${lang}`)).json()) as Api))

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

/** WCAG AA (4.5:1) for every text of the page, against its composited background. */
async function contrastCheck(page: Page) {
  const bad = await page.evaluate(() => {
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
    const sel =
      '.dt-head h1, .ss-where, .ss-q, .ss-lead, .ss-ask-btn, .ss-stories-h, .ss-stories-intro, .ss-num, .ss-story-title, .ss-meta, .ss-grade, .v2-srcline-text, .v2-srcline-name, .ss-done, .ss-next'
    for (const el of document.querySelectorAll(sel)) {
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

const card = (page: Page) => page.locator('.ss-stories')

test.describe('the prayer step (StarterSalah, StarterSalahN)', () => {
  test('Arabic, day: the board\'s order and texts; the stories from D1 by the fixture\'s ids; no «جديد» tag', async ({ page }) => {
    const served = await withFixture(page)
    await page.setViewportSize({ width: 390, height: 1120 })
    await page.goto('/start/salah?lang=ar&theme=light')
    await expect(page.getByRole('heading', { level: 1, name: 'الصلاة' })).toBeVisible()
    await expect(page.locator('.ss-where')).toHaveText(BOARD.where)
    await expect(page.locator('.ss-q')).toHaveText(BOARD.q)
    await expect(page.locator('.ss-lead')).toHaveText(BOARD.lead)
    await expect(page.getByRole('button', { name: BOARD.ask })).toBeVisible()
    await expect(card(page).getByRole('heading', { level: 2 })).toHaveText(BOARD.storiesTitle)
    await expect(page.locator('.ss-stories-intro')).toHaveText(BOARD.intro)
    await expect(page.getByRole('button', { name: BOARD.done })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.ss-next')).toHaveText(BOARD.next)
    // The board's order: where, the question card, the stories, «أنهيت», the next step.
    const order = await page.locator('.dt-main > *').evaluateAll((els) => els.map((e) => e.className.split(' ').find((c) => c.startsWith('ss-'))))
    expect(order).toEqual(['ss-where', 'ss-ask', 'ss-stories', 'ss-end'])
    // The review's dashed «جديد» tag is not drawn; the card keeps its gold frame.
    await expect(page.getByText('جديد', { exact: true })).toHaveCount(0)
    expect(await card(page).evaluate((e) => getComputedStyle(e).borderTopColor)).toBe('rgb(201, 162, 74)')
    // Each row: HadeethEnc's title, grade and takhrij exactly as D1 serves them, numbered, in the fixture's order.
    const api = await rowsOf(page, 'ar')
    const rows = card(page).locator('.ss-story')
    await expect(rows).toHaveCount(ENTRY.stories.length)
    for (const [i, h] of api.entries()) {
      const row = rows.nth(i)
      await expect(row.locator('.ss-num')).toHaveText(new Intl.NumberFormat('ar-u-nu-arab').format(i + 1))
      await expect(row.locator('.ss-story-title')).toHaveText(h.ar.title!)
      await expect(row.locator('.ss-story-title')).toHaveAttribute('lang', 'ar')
      await expect(row.locator('.ss-grade')).toHaveText(h.ar.grade!)
      await expect(row.locator('.ss-meta')).toContainText(h.ar.attribution!)
      await expect(row.getByRole('link')).toHaveAttribute('href', `/hadith/${h.ar.id}`)
    }
    // The source line: the source's name and the step's chapters, by HadeethEnc's own titles.
    const src = card(page).locator('.v2-srcline')
    await expect(src.locator('.v2-srcline-name')).toHaveText(ANSWER.ar.srcHadith)
    for (const c of ENTRY.chapters) await expect(src).toContainText(`«${TITLES[c]}»`)
    await expect(src).toContainText('أبواب «')
    expect(served).toEqual(['ar'])
    await pageCheck(page)
    await contrastCheck(page)
    await shot(page, 'StarterSalah', 'StarterSalah')
    // «عن المصدر» opens from the source line.
    await src.click()
    await expect(page.locator('dialog[open]')).toContainText(ANSWER.ar.srcHadith)
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
  })

  test('night (StarterSalahN): the same page, AA contrast', async ({ page }) => {
    await withFixture(page)
    await page.setViewportSize({ width: 390, height: 1120 })
    await page.goto('/start/salah?lang=ar&theme=dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(card(page).locator('.ss-story')).toHaveCount(ENTRY.stories.length)
    await contrastCheck(page)
    await shot(page, 'StarterSalahN', 'StarterSalahN')
  })

  test('a story opens its hadith page, its explanation in the content language; back returns to the step', async ({ page }) => {
    await withFixture(page)
    await page.goto('/start/salah?lang=en&theme=light')
    const first = card(page).locator('.ss-story').first()
    await first.getByRole('link').click()
    await expect(page).toHaveURL(/\/hadith\/3185/)
    await expect(page.locator('[data-hadith="3185"]')).toBeVisible()
    const api = (await (await page.request.get('/api/hadith/3185?lang=en')).json()) as { tr: { explanation: string } }
    await expect(page.locator('#hd-ex')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#hd-ex')).toContainText(api.tr.explanation.trim().slice(0, 40))
    await page.goBack()
    await expect(page).toHaveURL(/\/start\/salah/)
    await expect(card(page).locator('.ss-story')).toHaveCount(ENTRY.stories.length)
  })

  test('English: titles from the English rows, the one HadeethEnc has only in Arabic stays Arabic; grade with its wording', async ({ page }) => {
    const served = await withFixture(page)
    await page.setViewportSize({ width: 390, height: 1120 })
    await page.goto('/start/salah?lang=en&theme=light')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prayer (salah)')
    await expect(page.locator('.ss-where')).toHaveText('Starting path · Step 6 of 10')
    await expect(page.locator('.ss-stories-intro')).toHaveText(EN.storiesIntro.replace('{topic}', 'about prayer'))
    const api = await rowsOf(page, 'en')
    const rows = card(page).locator('.ss-story')
    for (const [i, h] of api.entries()) {
      const title = rows.nth(i).locator('.ss-story-title')
      if (h.tr?.title) {
        await expect(title).toHaveText(h.tr.title)
        await expect(title).toHaveAttribute('lang', 'en')
      } else {
        await expect(title).toHaveText(h.ar.title!)
        await expect(title).toHaveAttribute('lang', 'ar')
      }
      await expect(rows.nth(i).locator('.ss-grade')).toContainText(h.ar.grade!)
      if (h.tr?.grade && h.tr.grade !== h.ar.grade) await expect(rows.nth(i).locator('.ss-grade')).toContainText(`(${h.tr.grade})`)
    }
    // 66313 «حديث الإسراء والمعراج» has no English row on HadeethEnc.
    expect(api.find((h) => h.ar.id === '66313')?.tr).toBeUndefined()
    await expect(card(page).locator('.v2-srcline')).toContainText(`${EN.storiesChapters.split('{')[0]}«`)
    expect(served).toEqual(['en'])
    await pageCheck(page)
    await shot(page, 'StarterSalah-en')
  })

  test('320 px and text at 130%: nothing scrolls sideways', async ({ page }) => {
    await withFixture(page)
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/start/salah?lang=ar&theme=light')
    await expect(card(page).locator('.ss-story')).toHaveCount(ENTRY.stories.length)
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '130%'))
    await pageCheck(page)
    await shot(page, 'StarterSalah-320-130pct')
  })
})

test.describe('without stories', () => {
  test('Talal\'s file (reply 0037 §1): the preview\'s own route serves each step\'s stories from D1 in the file\'s order, with the computed chapters', async ({ page }) => {
    const file = stories as { steps: Record<string, { stories: string[]; chapters: string[] }> }
    for (const step of ['salah', 'taharah']) {
      const r = await page.request.get(`/api/starter/${step}/stories?lang=ar`)
      expect(r.status()).toBe(200)
      const body = (await r.json()) as { stories: { id: string; title: string }[]; chapters: { id: string }[] }
      expect(body.stories.map((x) => x.id)).toEqual(file.steps[step].stories)
      for (const x of body.stories) expect(x.title.length).toBeGreaterThan(0)
      expect(body.chapters.map((c) => c.id)).toEqual(file.steps[step].chapters)
    }
  })

  test('a step answered with no stories shows no card', async ({ page }) => {
    await page.route(/\/api\/starter\/salah\/stories(\?|$)/, (route) => route.fulfill({ json: { step: 'salah', stories: [], chapters: [] } }))
    const answered = page.waitForResponse(/\/api\/starter\/salah\/stories/, { timeout: 15000 }).catch(() => undefined)
    await page.goto('/start/salah?lang=ar&theme=light')
    await expect(page.locator('.ss-q')).toHaveText(BOARD.q)
    await answered
    await expect(card(page)).toHaveCount(0)
    // The order without the card: where, the question card, «أنهيت» and the next step.
    expect(await page.locator('.dt-main > *').count()).toBe(3)
  })

  test('the next step opens its page (no card), back returns; the last step says it is the last', async ({ page }) => {
    await withFixture(page)
    await page.route(/\/api\/starter\/taharah\/stories(\?|$)/, (route) => route.fulfill({ json: { step: 'taharah', stories: [], chapters: [] } }))
    await page.goto('/start/salah?lang=ar&theme=light')
    await page.locator('a.ss-next').click()
    await expect(page).toHaveURL(/\/start\/taharah/)
    await expect(page.getByRole('heading', { level: 1, name: 'الطهارة' })).toBeVisible()
    await expect(page.locator('.ss-where')).toHaveText('مسار البداية · الخطوة ٧ من ١٠')
    await expect(page.locator('.ss-q')).toHaveText('كيف أتوضأ؟')
    await expect(card(page)).toHaveCount(0)
    await shot(page, 'StarterTaharah-no-stories')
    await page.getByRole('button', { name: 'رجوع' }).click()
    await expect(page).toHaveURL(/\/start\/salah/)
    await page.goto('/start/hajj?lang=ar&theme=light')
    await expect(page.locator('.ss-where')).toHaveText('مسار البداية · الخطوة ١٠ من ١٠')
    await expect(page.locator('p.ss-next')).toHaveText(AR.starterLast)
    await expect(page.locator('a.ss-next')).toHaveCount(0)
  })
})

test.describe('the path\'s behaviour, kept', () => {
  test('the list opens the step\'s page; «اسأل هذا السؤال» sends the question to the conversation; read and finished stay on the device', async ({ page }) => {
    const asked: string[] = []
    await page.route('**/api/ask', async (r) => {
      asked.push((r.request().postDataJSON() as { q: string }).q)
      await r.fulfill({ json: { type: 'abstain', message: 'لم أجد نصًا في المصادر المعتمدة يطابق سؤالك، ولا أُنشئ نصوصًا من عندي.', link: 'https://www.alifta.gov.sa' } })
    })
    await page.goto('/?lang=ar&theme=light')
    await page.locator('.home-tile.is-starter').click()
    const sheet = page.locator('dialog[open]')
    await expect(sheet).toContainText(AR.starterIntro)
    await sheet.locator('.starter-step').nth(5).click()
    await expect(page).toHaveURL(/\/start\/salah/)
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    // «أنهيت هذه الخطوة»: pressed and kept on the device (localStorage), pressed again to undo; keyboard works.
    const done = page.getByRole('button', { name: AR.starterDone })
    await done.focus()
    await page.keyboard.press('Enter')
    await expect(done).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('imuslim.starter.v1') ?? '{}'))).toMatchObject({ done: ['salah'] })
    await page.reload()
    await expect(page.getByRole('button', { name: AR.starterDone })).toHaveAttribute('aria-pressed', 'true')
    // The motion is short and stops under reduced motion.
    expect(parseFloat(await done.evaluate((e) => getComputedStyle(e).transitionDuration)) * 1000).toBeLessThanOrEqual(200)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await done.evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: AR.starterDone }).click()
    await expect(page.getByRole('button', { name: AR.starterDone })).toHaveAttribute('aria-pressed', 'false')
    // «اسأل هذا السؤال»: the question goes to the conversation through /api/ask, as from the list before.
    await page.getByRole('button', { name: AR.starterAsk }).click()
    await expect(page).toHaveURL(/localhost:\d+\/(\?|$)/)
    await expect(page.locator('.turn .bubble').first()).toContainText('لماذا يصلي المسلمون؟')
    expect(asked).toEqual(['لماذا يصلي المسلمون؟'])
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('imuslim.starter.v1') ?? '{}'))).toMatchObject({ read: ['salah'] })
  })
})
