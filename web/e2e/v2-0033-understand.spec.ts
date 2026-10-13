import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Locator, type Page } from '@playwright/test'
import * as G from '../../scripts/index/hadith-quiz.mjs'
import { readQuiz, type QuizQuestion } from '../../worker/src/hadith-quiz'
import { HADITH } from '../src/v2/hadith/strings'
import { UNDERSTAND } from '../src/v2/hadith/strings-understand'

// Reply 0033 §أ2 «تأكد من فهمك» on a preview of next (never the live link), boards Understand, UnderstandWrong and
// UnderstandN: 5503, 4965, 66269, 6183 and a hadith without benefits (65920), in Arabic, English and Urdu.
// imuslim-next has no `quiz` column until migration 0013 and data/processed/hadith-quiz.sql are applied, so the quiz
// route is stubbed with the generator's own output (scripts/index/hadith-quiz.mjs over data/processed, read back by the
// worker's readQuiz): the page, the hadiths and their benefits are next's.
//   cd web && BASE_URL=http://localhost:8842 npx playwright test e2e/v2-0033-understand.spec.ts --project=mobile
// SHOTS=dir also saves the screenshots of the three boards there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const HADITHS = `${ROOT}data/processed/hadith.jsonl`
const TREE = `${ROOT}data/raw/hadeethenc/categories-list-ar.json`
test.skip(!fs.existsSync(HADITHS) || !fs.existsSync(TREE), 'needs data/processed/hadith.jsonl and the category tree')

const U = UNDERSTAND
const SHOTS = process.env.SHOTS

type Row = { id: string; lang: string; title: string | null; hints: string[]; categories: string[]; class: string; tier: string }
let data: { rows: Map<string, Row>; quizzes: Map<string, unknown> } | null = null
function load() {
  if (data) return data
  const rows: Row[] = fs.readFileSync(HADITHS, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const weak = `${ROOT}data/processed/hadith_weak.jsonl`
  if (fs.existsSync(weak)) rows.push(...fs.readFileSync(weak, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)))
  const { quizzes } = G.buildQuizzes(rows, G.rootFinder(JSON.parse(fs.readFileSync(TREE, 'utf8'))))
  data = { rows: new Map(rows.map((r) => [`${r.id}|${r.lang}`, r])), quizzes }
  return data
}
const hintsOf = (id: string, lang: string): string[] => G.hintsOf(load().rows.get(`${id}|${lang}`) ?? { hints: [] })
/** What GET /api/hadith/:id/quiz answers once the column is loaded: the worker's own reading of the stored quiz. */
function expected(id: string, lang: string): QuizQuestion[] {
  const stored = load().quizzes.get(`${id}|${lang}`)
  return stored ? readQuiz(id, hintsOf(id, lang), JSON.stringify(stored)) : []
}

/** Stubs the quiz route (and only it); returns the (id|lang) of every quiz request the page made. */
async function stubQuiz(page: Page, { empty = false } = {}) {
  const calls: string[] = []
  await page.route(/\/api\/hadith\/\d+\/quiz(\?|$)/, async (route) => {
    const u = new URL(route.request().url())
    const id = u.pathname.split('/')[3]
    const lang = u.searchParams.get('lang') ?? 'ar'
    calls.push(`${id}|${lang}`)
    await route.fulfill({ json: { id, lang, questions: empty ? [] : expected(id, lang) } })
  })
  return calls
}
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  // The whole page, as the boards show it: the app's scrolling column is let out to its full height for the shot.
  await page.evaluate(() => {
    for (const e of document.querySelectorAll<HTMLElement>('.column')) e.style.height = 'auto'
    for (const e of document.querySelectorAll<HTMLElement>('.scroll')) e.style.overflow = 'visible'
  })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: true, animations: 'disabled' })
  await page.evaluate(() => {
    for (const e of document.querySelectorAll<HTMLElement>('.column')) e.style.height = ''
    for (const e of document.querySelectorAll<HTMLElement>('.scroll')) e.style.overflow = ''
  })
}
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

async function open(page: Page, id: string, lang: string, theme = 'light') {
  await page.goto(`/hadith/${id}?lang=${lang}&theme=${theme}`)
  await expect(page.locator('#hd-text')).toBeVisible()
}

/** AA contrast of every text in the quiz and the benefits: the text colour over its composited background. */
async function contrast(page: Page) {
  return page.evaluate(() => {
    type C = [number, number, number, number]
    const parse = (c: string): C | null => {
      let m = c.match(/rgba?\(([^)]+)\)/)
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
        return [p[0], p[1], p[2], p[3] ?? 1]
      }
      m = c.match(/color\(srgb ([^)]+)\)/)
      if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number)
        return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]
      }
      return null
    }
    const over = (t: C, b: C): C => [t[0] * t[3] + b[0] * (1 - t[3]), t[1] * t[3] + b[1] * (1 - t[3]), t[2] * t[3] + b[2] * (1 - t[3]), 1]
    const lum = (c: C) => {
      const f = (v: number) => {
        const x = v / 255
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const bgOf = (el: Element): C => {
      const layers: C[] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      let bg: C = [255, 255, 255, 1]
      for (const l of layers.reverse()) bg = over(l, bg)
      return bg
    }
    const out: string[] = []
    for (const el of document.querySelectorAll('#hd-quiz *, #hd-benefits *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (!own || el.closest(':disabled, svg')) continue
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height) continue
      const bg = bgOf(el)
      const fg = over(parse(getComputedStyle(el).color)!, bg)
      const [a, z] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      const ratio = (a + 0.05) / (z + 0.05)
      if (ratio < 4.5) out.push(`${el.className || el.tagName}: ${ratio.toFixed(2)} «${el.textContent!.trim().slice(0, 30)}»`)
    }
    return out
  })
}
/** No horizontal scroll, every control at least 44 points, no control inside another (V2 rules 4, 5, 7). */
async function fits(page: Page) {
  const r = await page.evaluate(() => {
    const out = { hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, targets: [] as string[], nested: 0 }
    for (const el of document.querySelectorAll('#hd-quiz button, #hd-quiz a[href], #hd-benefits button, #hd-benefits a[href]')) {
      const b = el.getBoundingClientRect()
      if (!b.width) continue
      if (b.height < 43.5 || b.width < 43.5) out.targets.push(`${el.className} ${Math.round(b.width)}x${Math.round(b.height)}`)
      if (el.parentElement?.closest('button, a[href]')) out.nested++
    }
    return out
  })
  expect(r.hscroll, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(r.targets, 'targets under 44').toEqual([])
  expect(r.nested, 'control inside a control').toBe(0)
}

const optionTexts = async (quiz: Locator) => (await quiz.locator('.hd-opt-text').allTextContents()).map(clean)

test.describe('§أ2 «تأكد من فهمك»', () => {
  test('5503 in Arabic: before answering (Understand), a wrong answer (UnderstandWrong), the next question, «انتهيت»', async ({ page }) => {
    const want = expected('5503', 'ar')
    expect(want).toHaveLength(2)
    const hints = hintsOf('5503', 'ar')
    const calls = await stubQuiz(page)
    await open(page, '5503', 'ar')
    const quiz = page.locator('#hd-quiz')
    const ben = page.locator('#hd-benefits')
    await expect(quiz).toBeVisible()
    expect(calls).toEqual(['5503|ar'])

    // After the explanation, then the benefits (as on the board).
    const [sharh, q, b] = await Promise.all(['#hd-sharh', '#hd-quiz', '#hd-benefits'].map((s) => page.locator(s).boundingBox()))
    expect(sharh!.y).toBeLessThan(q!.y)
    expect(q!.y).toBeLessThan(b!.y)
    await expect(quiz.locator('#hd-quiz-h')).toHaveText(U.ar.title)
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ١ من ٢')
    await expect(quiz.locator('.hd-quiz-q')).toHaveText('أيّ هذه الفوائد ذُكرت في شرح هذا الحديث؟')
    const radios = quiz.getByRole('radio')
    await expect(radios).toHaveCount(4)
    // The options in their stored order, each a benefit as stored; the answer is benefit 1.
    expect(await optionTexts(quiz)).toEqual(want[0].options.map((o) => clean(o.text)))
    expect(clean(want[0].options[want[0].answer].text)).toBe(clean(hints[0]))
    // Before answering: nothing chosen, «تحقّق» disabled, the private line, the benefits folded.
    for (const r of await radios.all()) await expect(r).toHaveAttribute('aria-checked', 'false')
    const check = quiz.getByRole('button', { name: U.ar.check })
    await expect(check).toBeDisabled()
    await expect(quiz.locator('.hd-quiz-private')).toHaveText('لا يُحفظ جوابك ولا يُحسب عليك. هو لك وحدك.')
    await expect(quiz.locator('.hd-source')).toContainText('موسوعة الأحاديث النبوية المترجمة · فوائد الحديث')
    await expect(ben.locator('.hd-part-h')).toHaveText(HADITH.ar.benefits)
    await expect(ben.locator('.hd-benefits-hidden')).toHaveText('تظهر بعد أن تجيب، حتى لا ترى الجواب قبل السؤال.')
    await expect(ben.getByRole('button', { name: 'اعرضها الآن' })).toHaveAttribute('aria-expanded', 'false')
    await expect(ben.locator('li')).toHaveCount(0)
    // The benefits are nowhere else on the page, and the explanation is open in full.
    await expect(page.locator('#hd-sharh .hd-hints')).toHaveCount(0)
    await expect(page.locator('#hd-ex')).not.toHaveClass(/is-folded|is-cut/)
    await fits(page)

    // Nothing about the answer leaves the device or is stored: no request, no storage, from here on.
    const requests: string[] = []
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()}`))
    const storage = () => page.evaluate(() => JSON.stringify([Object.entries(localStorage).sort(), Object.entries(sessionStorage).sort()]))
    const before = await storage()

    // A wrong choice, as on the board.
    const wrong = want[0].options.findIndex((_, i) => i !== want[0].answer)
    await radios.nth(wrong).click()
    await expect(radios.nth(wrong)).toHaveAttribute('aria-checked', 'true')
    await expect(check).toBeEnabled()
    await shot(page, 'Understand.png')
    await check.scrollIntoViewIfNeeded()
    const topBefore = (await quiz.boundingBox())!.y
    await check.click()
    // The explanation above folds, and the section stays where the reader was looking.
    await expect(page.locator('#hd-ex')).toHaveClass(/is-folded/)
    expect(Math.abs((await quiz.boundingBox())!.y - topBefore)).toBeLessThanOrEqual(2)

    const w = want[0].options[wrong]
    const link = quiz.locator('.hd-opt.is-wrong a.hd-opt-link')
    await expect(link).toHaveText(`هذه الفائدة من شرح حديث «${w.title}»`)
    await expect(link).toHaveAttribute('href', `/hadith/${w.id}`)
    await expect(quiz.locator('.hd-opt.is-right .hd-opt-note')).toHaveText('فائدة هذا الحديث')
    await expect(quiz.locator('.hd-opt.is-right .hd-opt-text')).toHaveText(clean(hints[0]))
    await expect(radios.nth(wrong)).toBeFocused()
    // The explanation folds with «الشرح كاملًا»; «اقرأ الشرح مرة ثانية»; the benefits open in full, as stored.
    await expect(page.locator('#hd-ex')).toHaveClass(/is-folded/)
    await expect(page.locator('#hd-sharh').getByRole('button', { name: HADITH.ar.showMore })).toBeVisible()
    await expect(quiz.getByRole('button', { name: 'اقرأ الشرح مرة ثانية' })).toBeVisible()
    expect((await ben.locator('li').allTextContents()).map(clean)).toEqual(hints.map(clean))
    await expect(ben.locator('.hd-source')).toContainText('فوائد الحديث')
    await expect(quiz.getByRole('button', { name: 'السؤال التالي' })).toBeVisible()
    // No score and no count of right answers: the only number in the section is «السؤال ١ من ٢».
    for (const part of ['#hd-quiz', '#hd-benefits']) {
      const text = (await page.locator(part).textContent())!.replace('السؤال ١ من ٢', '')
      expect(text, part).not.toMatch(/[٠-٩0-9]/)
    }
    await fits(page)
    await shot(page, 'UnderstandWrong.png')

    // «اقرأ الشرح مرة ثانية» opens the explanation and goes to it.
    await quiz.getByRole('button', { name: 'اقرأ الشرح مرة ثانية' }).click()
    await expect(page.locator('#hd-ex')).not.toHaveClass(/is-folded/)
    await expect(page.locator('#hd-sharh-h')).toBeFocused()
    await expect(page.locator('#hd-sharh-h')).toBeInViewport()

    // The next question: nothing chosen, the benefits folded again; a right answer.
    await quiz.getByRole('button', { name: 'السؤال التالي' }).click()
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ٢ من ٢')
    await expect(quiz.locator('.hd-quiz-q')).toBeFocused()
    expect(await optionTexts(quiz)).toEqual(want[1].options.map((o) => clean(o.text)))
    for (const r of await radios.all()) await expect(r).toHaveAttribute('aria-checked', 'false')
    await expect(ben.locator('li')).toHaveCount(0)
    await radios.nth(want[1].answer).click()
    await quiz.getByRole('button', { name: U.ar.check }).click()
    await expect(quiz.locator('.hd-opt.is-right')).toHaveCount(1)
    await expect(quiz.locator('.hd-opt.is-wrong')).toHaveCount(0)
    await expect(quiz.locator('.hd-opt.is-right .hd-opt-text')).toHaveText(clean(hints[1]))
    // The last question: «انتهيت» folds the section.
    await quiz.getByRole('button', { name: 'انتهيت' }).click()
    const reopen = quiz.getByRole('button', { name: U.ar.title })
    await expect(reopen).toHaveAttribute('aria-expanded', 'false')
    await expect(reopen).toBeFocused()
    await expect(quiz.getByRole('radio')).toHaveCount(0)
    await expect(quiz.locator('.hd-quiz-count')).toHaveCount(0)
    expect(requests, 'no request while answering').toEqual([])
    expect(await storage(), 'nothing stored').toBe(before)
    // Pressing it starts again from the first question, nothing chosen.
    await reopen.click()
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ١ من ٢')
    for (const r of await quiz.getByRole('radio').all()) await expect(r).toHaveAttribute('aria-checked', 'false')
  })

  test('5503 at night (UnderstandN), and AA contrast by day and by night', async ({ page }) => {
    await stubQuiz(page)
    for (const theme of ['dark', 'light']) {
      await open(page, '5503', 'ar', theme)
      const quiz = page.locator('#hd-quiz')
      await expect(quiz).toBeVisible()
      const want = expected('5503', 'ar')[0]
      const wrong = want.options.findIndex((_, i) => i !== want.answer)
      await quiz.getByRole('radio').nth(wrong).click()
      if (theme === 'dark') await shot(page, 'UnderstandN.png')
      expect(await contrast(page), `${theme}, before`).toEqual([])
      await quiz.getByRole('button', { name: U.ar.check }).click()
      await expect(quiz.locator('.hd-opt.is-wrong')).toBeVisible()
      expect(await contrast(page), `${theme}, after`).toEqual([])
    }
  })

  test('5503 in English and Urdu: the reader’s language row, its benefits and the interface sentence', async ({ page }) => {
    await stubQuiz(page)
    for (const lang of ['en', 'ur'] as const) {
      const want = expected('5503', lang)
      expect(want, lang).toHaveLength(2)
      await open(page, '5503', lang)
      const quiz = page.locator('#hd-quiz')
      await expect(quiz.locator('#hd-quiz-h')).toHaveText(U[lang].title)
      await expect(quiz.locator('.hd-quiz-q')).toHaveText(U[lang].question)
      await expect(quiz.locator('.hd-quiz-private')).toHaveText(U[lang].private)
      expect(await optionTexts(quiz)).toEqual(want[0].options.map((o) => clean(o.text)))
      await expect(quiz.locator('.hd-opt-text').first()).toHaveAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr')
      await expect(quiz.locator('.hd-opt-text').first()).toHaveAttribute('lang', lang)
      const wrong = want[0].options.findIndex((_, i) => i !== want[0].answer)
      await quiz.getByRole('radio').nth(wrong).click()
      await quiz.getByRole('button', { name: U[lang].check }).click()
      const w = want[0].options[wrong]
      const [pre, post] = U[lang].fromOther.split('{title}')
      await expect(quiz.locator('a.hd-opt-link')).toHaveText(clean(`${pre}${w.title}${post}`))
      await expect(quiz.locator('.hd-opt.is-right .hd-opt-note')).toHaveText(U[lang].thisHadith)
      expect((await page.locator('#hd-benefits li').allTextContents()).map(clean)).toEqual(hintsOf('5503', lang).map(clean))
      await expect(quiz.locator('.hd-source')).toContainText(`${U[lang].sourceName} · ${U[lang].sourceDetail}`)
      await fits(page)
    }
  })

  test('4965 in Arabic by keyboard: four questions, arrows choose, Enter checks; «انتهيت» after the fourth', async ({ page }) => {
    const want = expected('4965', 'ar')
    expect(want.map((q) => q.n)).toEqual([0, 1, 2, 3])
    await stubQuiz(page)
    await open(page, '4965', 'ar')
    const quiz = page.locator('#hd-quiz')
    const radios = quiz.getByRole('radio')
    for (const [k, q] of want.entries()) {
      await expect(quiz.locator('.hd-quiz-count')).toHaveText(`السؤال ${'١٢٣٤'[k]} من ٤`)
      expect(await optionTexts(quiz)).toEqual(q.options.map((o) => clean(o.text)))
      // One tab stop: the first option; the left arrow is «next» in a right-to-left page, and choosing follows focus.
      await expect(radios.first()).toHaveAttribute('tabindex', '0')
      await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1')
      await radios.first().focus()
      for (let i = 0; i < q.answer; i++) await page.keyboard.press('ArrowLeft')
      if (q.answer === 0) {
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowUp')
      }
      await expect(radios.nth(q.answer)).toHaveAttribute('aria-checked', 'true')
      await expect(radios.nth(q.answer)).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(quiz.getByRole('button', { name: U.ar.check })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(quiz.locator('.hd-opt.is-right')).toHaveCount(1)
      await expect(quiz.locator('.hd-opt.is-wrong')).toHaveCount(0)
      // A checked question cannot be changed.
      await radios.nth((q.answer + 1) % 4).click({ force: true })
      await expect(radios.nth(q.answer)).toHaveAttribute('aria-checked', 'true')
      await quiz.getByRole('button', { name: k === 3 ? 'انتهيت' : 'السؤال التالي' }).click()
    }
    const reopen = quiz.getByRole('button', { name: U.ar.title })
    await expect(reopen).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ١ من ٤')
  })

  test('66269 (one benefit): «السؤال ١ من ١» and «انتهيت» at once; 6183: Arabic only', async ({ page }) => {
    const calls = await stubQuiz(page)
    await open(page, '66269', 'ar')
    const quiz = page.locator('#hd-quiz')
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ١ من ١')
    const want = expected('66269', 'ar')[0]
    expect(clean(want.options[want.answer].text)).toBe('فضل من يكفل يتيمًا، وهو مرافقة النبي صلى الله عليه وسلم في الجنة.')
    await quiz.getByRole('radio').nth(want.answer).click()
    await quiz.getByRole('button', { name: U.ar.check }).click()
    await expect(quiz.getByRole('button', { name: 'انتهيت' })).toBeVisible()
    await expect(quiz.getByRole('button', { name: 'السؤال التالي' })).toHaveCount(0)

    await open(page, '6183', 'ar')
    await expect(quiz.locator('.hd-quiz-count')).toHaveText('السؤال ١ من ٢')
    // In English 6183 has no benefits: no section, and no quiz request.
    calls.length = 0
    await open(page, '6183', 'en')
    await expect(page.locator('#hd-sharh')).toBeVisible()
    await expect(page.locator('#hd-quiz')).toHaveCount(0)
    await expect(page.locator('#hd-benefits')).toHaveCount(0)
    expect(calls).toEqual([])
  })

  test('a hadith without benefits (65920), or weak in Arabic (65065 in English): no section and no request; a quiz with no questions keeps the old layout', async ({ page }) => {
    expect(hintsOf('65920', 'ar')).toEqual([])
    const calls = await stubQuiz(page)
    await open(page, '65920', 'ar')
    await expect(page.locator('h1.hd-title')).toBeVisible()
    await page.waitForTimeout(500)
    await expect(page.locator('#hd-quiz')).toHaveCount(0)
    await expect(page.locator('#hd-benefits')).toHaveCount(0)
    expect(calls).toEqual([])

    // 65065: its Arabic row is weak (the page shows ضعيف) though its English row says «Authentic hadith» and has
    // benefits; it has no quiz in English, the page asks for none, and none of its benefits is a wrong option anywhere.
    expect(hintsOf('65065', 'en').length).toBeGreaterThan(0)
    expect(load().quizzes.has('65065|en')).toBe(false)
    expect([...load().quizzes.values()].some((q) => JSON.stringify(q).includes('"id":"65065"'))).toBe(false)
    await open(page, '65065', 'en')
    await expect(page.locator('h1.hd-title')).toBeVisible()
    await page.waitForTimeout(500)
    await expect(page.locator('#hd-quiz')).toHaveCount(0)
    expect(calls).toEqual([])

    // Before the column is loaded (or with every question dropped): the benefits stay in the explanation, as before.
    await page.unrouteAll()
    await stubQuiz(page, { empty: true })
    await open(page, '4965', 'ar')
    await expect(page.locator('#hd-sharh .hd-hints li')).toHaveCount(4)
    await expect(page.locator('#hd-quiz')).toHaveCount(0)
    await expect(page.locator('#hd-benefits')).toHaveCount(0)
  })

  test('«اعرضها الآن» shows the benefits before answering; the wrong option’s line opens that hadith', async ({ page }) => {
    await stubQuiz(page)
    await open(page, '5503', 'ar')
    const ben = page.locator('#hd-benefits')
    await ben.getByRole('button', { name: 'اعرضها الآن' }).click()
    await expect(ben.locator('li')).toHaveCount(2)
    await expect(ben.locator('.hd-part-h')).toBeFocused()
    const quiz = page.locator('#hd-quiz')
    const want = expected('5503', 'ar')[0]
    const wrong = want.options.findIndex((_, i) => i !== want.answer)
    await quiz.getByRole('radio').nth(wrong).click()
    await quiz.getByRole('button', { name: U.ar.check }).click()
    await quiz.locator('a.hd-opt-link').click()
    await expect(page).toHaveURL(new RegExp(`/hadith/${want.options[wrong].id}(\\?|$)`))
    await expect(page.locator(`[data-hadith="${want.options[wrong].id}"]`)).toBeVisible()
    // The new page starts with its own quiz, nothing chosen.
    await expect(page.locator('#hd-quiz .hd-quiz-count')).toContainText('السؤال ١')
  })

  test('320 wide and 130% text, and reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await stubQuiz(page)
    await open(page, '4965', 'ar')
    await page.evaluate(() => (document.documentElement.style.fontSize = '130%'))
    const quiz = page.locator('#hd-quiz')
    await fits(page)
    const want = expected('4965', 'ar')[0]
    const wrong = want.options.findIndex((_, i) => i !== want.answer)
    await quiz.getByRole('radio').nth(wrong).click()
    await quiz.getByRole('button', { name: U.ar.check }).click()
    await fits(page)
    // Motion ≤ 200 ms, none with reduced motion.
    const ms = await quiz.locator('.hd-opt').first().evaluate((e) => Math.max(...getComputedStyle(e).transitionDuration.split(',').map((x) => parseFloat(x) * 1000)))
    expect(ms).toBeLessThanOrEqual(200)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await quiz.locator('.hd-opt').first().evaluate((e) => getComputedStyle(e).transitionProperty)).toBe('none')
    expect(await page.locator('#hd-benefits ul').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  })
})
