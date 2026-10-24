import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { normalizeArabic } from '../../worker/src/lib/normalize'
import data from '../src/lessons/wudu-data.json' with { type: 'json' }
import { HAVE_DATA, openLesson } from './lesson-helpers'
import { fakeRecitation } from './helpers/fake-recitation'
import { noTip } from './helpers/no-tip'

// The listen button under each text (add-on 0072-add14), on the screens it was placed in first: «آية اليوم» and the
// name of the day on the home page, the «اسأل» answer, the ayah's panel, and a step of «علّمني الوضوء». The device's
// speechSynthesis is replaced by a recorder (every text that reaches speak() is kept), and the reciter's server by a
// silent file (helpers/fake-recitation.ts). After each test: not one recorded text holds an ayah of D1 (any whole ayah
// of four words or more, from data/processed/quran.jsonl), nor four words in a row of an ayah or an Arabic hadith shown
// on that screen (by their ids, D1's own texts). Against a vite preview of this branch, every /api route answered here
// from data/processed (outside git: skipped without it):
//   npx vite preview --port 8796 && BASE_URL=http://localhost:8796 npx playwright test e2e/v2-0072-listen.spec.ts --project=mobile
// SHOTS=<dir> saves the shots of the add-on (the four places, ar/en, 16 Pro Max and SE).
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.skip(!HAVE_DATA, 'the texts are D1’s: answered here from data/processed, outside git')

const SHOTS = process.env.SHOTS ?? ''
const SIZES = { promax: { width: 440, height: 956 }, se: { width: 375, height: 667 } } as const
const PROCESSED = path.resolve(import.meta.dirname, '../../data/processed')
const FIXTURES = path.resolve(import.meta.dirname, 'fixtures')
// 22 October 2026, noon in Riyadh: the name of the day is entry 1 (الصمد, its evidence 112:2).
const DAY = new Date('2026-10-22T09:00:00Z')

// ---- D1's texts (data/processed) ----
type Ayah = { id: string; sura: number; aya: number; page: number; sura_name: string; ref: string; url: string; url_en?: string; text: string; text_en?: string; muyassar?: string }
let QURAN: Map<string, Ayah> | null = null
function quran() {
  if (QURAN) return QURAN
  QURAN = new Map()
  if (!HAVE_DATA) return QURAN
  for (const l of fs.readFileSync(path.join(PROCESSED, 'quran.jsonl'), 'utf8').split('\n')) if (l.trim()) {
    const r = JSON.parse(l) as Ayah
    QURAN.set(r.id, r)
  }
  return QURAN
}
const AYAT = (() => {
  const s: Record<number, number> = {}
  for (const r of quran().values()) s[r.sura] = Math.max(s[r.sura] ?? 0, r.aya)
  return s
})()
const passage = (r: Ayah) => ({
  id: r.id,
  kind: 'ayah',
  text: r.text,
  text_en: r.text_en,
  ref: r.ref,
  url: r.url,
  verified: true,
  tafsir: r.muyassar ? [{ key: 'muyassar', name: 'التفسير الميسر', text: r.muyassar, paragraphs: [r.muyassar], ref: r.ref, url: r.url }] : [],
  ayah: { sura: r.sura, aya: r.aya, page: r.page, suraName: r.sura_name, suraAyat: AYAT[r.sura], urlEn: r.url_en },
})
/** HadeethEnc rows by id and language, read once for the ids asked. */
const HADITH = new Map<string, Record<string, unknown>>()
function hadithRows(ids: string[]) {
  const want = new Set(ids.filter((id) => !HADITH.has(`${id}:ar`)))
  if (!want.size) return
  const text = fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8')
  let at = 0
  while (at < text.length) {
    let nl = text.indexOf('\n', at)
    if (nl < 0) nl = text.length
    const m = text.slice(at, Math.min(nl, at + 120)).match(/"lang": ?"(ar|en)".*?"id": ?"(\d+)"/)
    if (m && want.has(m[2])) HADITH.set(`${m[2]}:${m[1]}`, JSON.parse(text.slice(at, nl)))
    at = nl + 1
  }
}
const hadithOut = (r: Record<string, unknown>) => ({
  id: r.id, lang: r.lang, title: r.title, text: r.hadeeth, intro: r.hadeeth_intro, attribution: r.attribution, grade: r.grade, explanation: r.explanation,
  hints: [], words: [], reference: r.reference, categories: r.categories, class: r.class, tier: r.tier, version: r.version, mawquf: !!r.mawquf,
  url: `https://hadeethenc.com/${r.lang}/browse/hadith/${r.id}`,
})

// ---- the oracle, independent of web/src/listen ----
const words = (s: string) => normalizeArabic(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
/** Every whole ayah of four words or more, folded: none may be inside a spoken text. */
const WHOLE = (() => [...quran().values()].map((r) => ({ id: r.id, w: ` ${words(r.text).join(' ')} ` })).filter((x) => x.w.trim().split(' ').length >= 4))()
function sharedRun(output: string, sacred: string, n = 4): string | null {
  const out = ` ${words(output).join(' ')} `
  const w = words(sacred)
  if (w.length < n) return w.length && out.includes(` ${w.join(' ')} `) ? w.join(' ') : null
  for (let i = 0; i + n <= w.length; i++) if (out.includes(` ${w.slice(i, i + n).join(' ')} `)) return w.slice(i, i + n).join(' ')
  return null
}

// ---- the device: a recorder in place of speechSynthesis ----
type Spoken = { text: string; lang: string }
async function recorder(page: Page, voices: string[] = ['ar-SA', 'en-US'], holdMs = 6000) {
  await page.addInitScript(
    ({ voices, holdMs }) => {
      const w = window as unknown as { __spoken: Spoken[]; __cancels: number }
      w.__spoken = []
      w.__cancels = 0
      type U = { text: string; lang: string; voice: { lang: string } | null; onstart?: () => void; onend?: () => void; onerror?: (e: { error: string }) => void }
      let current: U | null = null
      const list = voices.map((lang, i) => ({ name: `Voice ${lang}`, lang, voiceURI: `v${i}`, localService: true, default: i === 0 }))
      const synth = {
        get speaking() {
          return !!current
        },
        pending: false,
        paused: false,
        getVoices: () => list,
        speak(u: U) {
          w.__spoken.push({ text: u.text, lang: u.voice?.lang ?? u.lang })
          // the voice conversation's silent unlock is not a text
          if (!u.text.trim()) return
          current = u
          setTimeout(() => current === u && u.onstart?.(), 20)
          setTimeout(() => {
            if (current !== u) return
            current = null
            u.onend?.()
          }, holdMs)
        },
        cancel() {
          w.__cancels++
          const c = current
          current = null
          c?.onerror?.({ error: 'interrupted' })
        },
        pause() {},
        resume() {},
        addEventListener() {},
        removeEventListener() {},
        onvoiceschanged: null,
      }
      class Utterance {
        text: string
        lang = ''
        voice: { lang: string } | null = null
        volume = 1
        rate = 1
        pitch = 1
        constructor(t = '') {
          this.text = t
        }
      }
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    },
    { voices, holdMs },
  )
}
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken.filter((x) => x.text.trim()))
const cancels = (page: Page) => page.evaluate(() => (window as unknown as { __cancels: number }).__cancels)

/** Our server's routes, as the Worker answers them, from data/processed; anything else: 404. */
async function server(page: Page, { answer = 'answer-create.json' } = {}) {
  await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ status: 404, json: { ok: false, error: 'not_found' } }))
  await page.route('**/api/passage/*', (r) => {
    const id = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop()!)
    const a = quran().get(id)
    return a ? r.fulfill({ json: passage(a) }) : r.fulfill({ status: 404, json: { ok: false } })
  })
  await page.route('**/api/today*', (r) => r.fulfill({ json: { day: '2026-10-22', hadith: null } }))
  await page.route('**/api/explain/status', (r) => r.fulfill({ json: { enabled: false } }))
  await page.route('**/api/ask', (r) => r.fulfill({ json: JSON.parse(fs.readFileSync(path.join(FIXTURES, answer), 'utf8')) }))
  await page.route('**/api/hadith/*', (r) => {
    const u = new URL(r.request().url())
    const id = u.pathname.split('/').pop()!
    const l = u.searchParams.get('lang') ?? 'ar'
    hadithRows([id])
    const ar = HADITH.get(`${id}:ar`)
    const tr = l !== 'ar' ? HADITH.get(`${id}:${l}`) : undefined
    return ar ? r.fulfill({ json: { ar: hadithOut(ar), ...(tr ? { tr: hadithOut(tr) } : {}) } }) : r.fulfill({ status: 404, json: { ok: false } })
  })
  // The name of the day as worker/src/names-day.ts sends it (data/names-daily.json), without the readings.
  const names = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/names-daily.json'), 'utf8')) as { epoch: string; entries: Record<string, unknown>[] }
  await page.route('**/api/names/day*', (r) => {
    const day = new URL(r.request().url()).searchParams.get('day')!
    const n = names.entries.length
    const d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${names.epoch}T00:00:00Z`)) / 86_400_000)
    const index = ((d % n) + n) % n
    const { readings: _r, ...entry } = names.entries[index] as Record<string, unknown> & { readings?: unknown }
    return r.fulfill({ json: { day, index, count: n, entry } })
  })
}

/** The ayat and Arabic hadith on the screen, by their ids, as D1 holds them (and the hadith's Arabic as shown). */
async function sacredOnScreen(page: Page): Promise<{ ayat: string[]; hadith: string[] }> {
  const got = await page.evaluate(() => {
    const ids = new Set<string>()
    for (const el of document.querySelectorAll<HTMLElement>('[data-ayah], [data-id^="quran:"], [data-ref^="quran:"]')) {
      const id = el.dataset.ayah ?? el.dataset.id ?? el.dataset.ref
      if (id && /^quran:\d+:\d+$/.test(id)) ids.add(id)
    }
    const hadith = [...document.querySelectorAll<HTMLElement>('.sacred, [data-ref^="hadith:"][data-lang="ar"]')].map((e) => e.textContent ?? '')
    return { ids: [...ids], hadith }
  })
  return { ayat: got.ids.map((id) => quran().get(id)?.text ?? '').filter(Boolean), hadith: got.hadith }
}

/** The add-on's property, on this screen: nothing of the Quran, nor of an Arabic hadith shown, was spoken. */
async function nothingSacredSpoken(page: Page, extra: { ayat?: string[]; hadith?: string[] } = {}) {
  const said = await spoken(page)
  const screen = await sacredOnScreen(page)
  const ayat = [...screen.ayat, ...(extra.ayat ?? [])]
  const hadith = [...screen.hadith, ...(extra.hadith ?? [])]
  for (const s of said) {
    const w = ` ${words(s.text).join(' ')} `
    for (const a of WHOLE) expect(w.includes(a.w), `a whole ayah (${a.id}) in «${s.text}»`).toBe(false)
    for (const a of ayat) expect(sharedRun(s.text, a), `«${s.text}» repeats an ayah on the screen`).toBeNull()
    for (const h of hadith) expect(sharedRun(s.text, h), `«${s.text}» repeats an Arabic hadith on the screen`).toBeNull()
  }
  return said
}

/** The screen as the reader sees it, with `el` near its top (a lesson's card is taller than the screen). */
async function screenShot(page: Page, el: ReturnType<Page['locator']>, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await el.evaluate((e) => e.scrollIntoView({ block: 'start' }))
  await page.evaluate(() => document.querySelector('.dt-screen')?.scrollBy?.(0, -72))
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), animations: 'disabled' })
}

async function shot(page: Page, el: ReturnType<Page['locator']>, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  // The floating bar of the home stays out of the card's picture.
  // (by the CSSOM: the lesson pages run under the app's CSP, which refuses a style tag)
  await page.evaluate(() => document.querySelectorAll<HTMLElement>('.v2-nav').forEach((e) => (e.style.visibility = 'hidden')))
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(250)
  await el.screenshot({ path: path.join(SHOTS, `${name}.png`), animations: 'disabled' })
}

test.beforeEach(async ({ page }) => {
  await noTip(page)
  await page.clock.setFixedTime(DAY)
})

for (const lang of ['ar', 'en'] as const) {
  for (const [size, vp] of Object.entries(SIZES)) {
    test(`${lang} ${size}: «آية اليوم» and the name of the day: the recitation only, and the meaning in the device voice`, async ({ page }) => {
      await page.setViewportSize(vp)
      await recorder(page)
      const media = await fakeRecitation(page)
      await server(page)
      await page.goto(`/?lang=${lang}&theme=light`)
      const card = page.locator('article.dc-ayah-card')
      await expect(card).toBeVisible()
      const id = await card.locator('.dc-ayah').getAttribute('data-ayah')
      const a = quran().get(id!)!
      const btns = card.locator('.hear-btn')
      // Arabic: one button, «استمع». Outside Arabic: «استمع للآية» and «استمع للمعنى» (§4).
      await expect(btns).toHaveCount(lang === 'ar' ? 1 : 2)
      await expect(btns.first()).toHaveText(lang === 'ar' ? 'استمع' : 'Listen to the ayah')
      expect(media).toEqual([])
      await shot(page, card, `ayah-of-day-${lang}-${size}`)
      // The ayah: the reciter's recording, never a device voice.
      await btns.first().click()
      await expect(btns.first()).toHaveAttribute('aria-pressed', 'true')
      await expect(btns.first().locator('.hear-wave')).toBeVisible()
      await expect.poll(() => media.length).toBeGreaterThan(0)
      expect(await spoken(page)).toEqual([])
      await shot(page, card, `ayah-of-day-${lang}-${size}-playing`)
      await btns.first().click()
      await expect(btns.first()).toHaveAttribute('aria-pressed', 'false')
      if (lang === 'en') {
        // The meaning: Sahih International in the English voice; pressing it ended nothing else (the recitation is off).
        await btns.nth(1).click()
        await expect(btns.nth(1)).toHaveAttribute('aria-pressed', 'true')
        const said = await spoken(page)
        // Its first sentence is being said (the recorder holds each one for a while), as it is in D1.
        expect(said.length).toBeGreaterThan(0)
        expect(a.text_en!.replace(/\s+/g, ' ').trim().startsWith(said.map((x) => x.text).join(' ').replace(/\s+/g, ' '))).toBe(true)
        expect(said.every((x) => x.lang === 'en-US')).toBe(true)
        // One sound at a time: the recitation pressed ends the device voice.
        const c = await cancels(page)
        await btns.first().click()
        await expect(btns.nth(1)).toHaveAttribute('aria-pressed', 'false')
        expect(await cancels(page)).toBeGreaterThan(c)
        await btns.first().click()
      }
      // The name of the day: «استمع» under the name, by the recitation of its evidence ayah (112:2 for الصمد).
      const name = page.getByTestId('name-day')
      await expect(name).toBeVisible()
      const nb = page.locator('.nd-name-listen .hear-btn')
      await expect(nb).toHaveCount(1)
      await expect(nb).toHaveText(lang === 'ar' ? 'استمع' : 'Listen')
      const before = media.length
      await nb.click()
      await expect(nb).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => media.length).toBeGreaterThan(before)
      await shot(page, page.locator('.nd-short-wrap'), `name-card-${lang}-${size}`)
      await nb.click()
      // No hadith, ayah or Quranic text reached the device voice on this screen.
      await nothingSacredSpoken(page)
    })

    test(`${lang} ${size}: the «اسأل» answer: the ayah recited, its meaning and tafsir and the answer in the device voice`, async ({ page }) => {
      await page.setViewportSize(vp)
      await recorder(page)
      const media = await fakeRecitation(page)
      await server(page)
      await page.goto(`/?lang=${lang}&theme=light`)
      await page.locator('#q').fill(lang === 'ar' ? 'لماذا خلق الله الإنسان؟' : 'Why did Allah create mankind?')
      await page.locator('button.send').click()
      const card = page.locator('.turn').last().locator('article.card')
      await expect(card).toBeVisible()
      const frameRow = card.locator('.frame-listen-row .hear-btn')
      await expect(frameRow.first()).toBeVisible()
      await expect(frameRow).toHaveCount(lang === 'ar' ? 1 : 2)
      await shot(page, card, `answer-${lang}-${size}`)
      await frameRow.first().click()
      await expect(frameRow.first()).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => media.length).toBeGreaterThan(0)
      expect(await spoken(page)).toEqual([])
      await shot(page, card, `answer-${lang}-${size}-playing`)
      // Every device-voice button on the card, in turn: each starts its own text and ends the one before.
      const speakBtns = card.locator('.hear-btn:not(.frame-listen-row .hear-btn)')
      const n = await speakBtns.count()
      for (let i = 0; i < n; i++) await speakBtns.nth(i).click()
      if (lang === 'en') {
        await frameRow.nth(1).click()
        expect((await spoken(page)).some((x) => x.lang === 'en-US')).toBe(true)
      }
      await nothingSacredSpoken(page)
    })

    test(`${lang} ${size}: a step of «علّمني الوضوء»: «ماذا تفعل» in the device voice, the ayah recited`, async ({ page }) => {
      await page.setViewportSize(vp)
      await recorder(page)
      const media = await fakeRecitation(page)
      await openLesson(page, 'wudu', { lang, width: vp.width, step: 1, data })
      await page.setViewportSize(vp)
      const root = page.locator('#lsn-wudu')
      const doBtn = root.locator('.do-text + .lsn-listen .hear-btn')
      await expect(doBtn).toBeVisible()
      await doBtn.click()
      await expect(doBtn).toHaveAttribute('aria-pressed', 'true')
      const said = await spoken(page)
      const doText = data.steps[0].do[lang]
      expect(said.length).toBeGreaterThan(0)
      expect(doText.replace(/\s+/g, ' ').trim().startsWith(said.map((x) => x.text).join(' ').replace(/\s+/g, ' '))).toBe(true)
      expect(said.every((x) => x.lang === (lang === 'ar' ? 'ar-SA' : 'en-US'))).toBe(true)
      await screenShot(page, root.locator('h1').first(), `lesson-step-${lang}-${size}`)
      await screenShot(page, root.locator('.quran-ev').first(), `lesson-ayah-${lang}-${size}`)
      // The evidence ayah (5:6): the reciter's recording; the device voice stops.
      const ayahBtn = root.locator('.quran-ev .lsn-listen .hear-btn').first()
      await ayahBtn.click()
      await expect(doBtn).toHaveAttribute('aria-pressed', 'false')
      await expect.poll(() => media.length).toBeGreaterThan(0)
      // Leaving the step stops what it played.
      await root.locator('nav.stepper .btn.primary').click()
      await expect(root.locator('.hear-btn[aria-pressed="true"]')).toHaveCount(0)
      await nothingSacredSpoken(page, { ayat: [quran().get('quran:5:6')!.text] })
    })
  }
}

test('the ayah’s panel: al-Muyassar in the Arabic voice only when it repeats no words of its ayah; the meaning in English', async ({ page }) => {
  await recorder(page)
  await fakeRecitation(page)
  await server(page)
  await page.route('**/api/suras', (r) => r.fulfill({ json: [{ n: 2, name: 'البقرة', ayat: 286, page: 2 }, { n: 112, name: 'الإخلاص', ayat: 4, page: 604 }] }))
  await page.route('**/api/sura/*', (r) => {
    const n = Number(new URL(r.request().url()).pathname.split('/').pop())
    const ayat = [...quran().values()].filter((x) => x.sura === n).map((x) => ({ aya: x.aya, id: x.id, text: x.text, page: x.page, text_en: x.text_en }))
    return r.fulfill({ json: { n, name: ayat.length ? quran().get(`quran:${n}:1`)!.sura_name : '', basmala: null, ayat } })
  })
  for (const [lang, id] of [['ar', 'quran:2:32'], ['en', 'quran:2:32'], ['ar', 'quran:2:255']] as const) {
    const [, s, a] = id.split(':')
    await page.goto(`/quran/${s}/${a}?lang=${lang}&theme=light`)
    const sheet = page.locator('dialog.sheet[open]')
    await expect(sheet.locator('.rd-ayah-listen .hear-btn').first()).toBeVisible()
    const tafsirBtn = sheet.locator('#muyassar-h .hear-btn')
    const muyassar = quran().get(id)!.muyassar!
    if ((await tafsirBtn.count()) > 0) {
      await tafsirBtn.click()
      const said = (await spoken(page)).filter((x) => x.lang === 'ar-SA')
      expect(said.length).toBeGreaterThan(0)
      expect(sharedRun(said.map((x) => x.text).join(' '), quran().get(id)!.text)).toBeNull()
    } else {
      // Not offered: al-Muyassar repeats four words of its ayah (the rule of command 12).
      expect(sharedRun(muyassar, quran().get(id)!.text)).not.toBeNull()
    }
    if (lang === 'en') {
      await sheet.locator('.rd-ayah-listen .hear-btn').nth(1).click()
      expect((await spoken(page)).some((x) => x.lang === 'en-US' && x.text.length > 3)).toBe(true)
    }
    await nothingSacredSpoken(page)
    await page.keyboard.press('Escape')
  }
})

test('no voice for the language: no button, and once «Install a voice for English in Settings»', async ({ page }) => {
  await recorder(page, ['ar-SA'])
  await fakeRecitation(page)
  await server(page)
  await page.goto('/?lang=en&theme=light')
  const card = page.locator('article.dc-ayah-card')
  await expect(card.locator('.hear-btn')).toHaveCount(1) // the recitation only
  await expect(page.locator('.hear-missing')).toHaveCount(1)
  await expect(page.locator('.hear-missing')).toHaveText('Install a voice for English in Settings')
  // The answer's English texts have no button either, and the line is not said again.
  await page.locator('#q').fill('Why did Allah create mankind?')
  await page.locator('button.send').click()
  const card2 = page.locator('.turn').last().locator('article.card')
  await expect(card2.locator('.frame-listen-row .hear-btn')).toHaveCount(1)
  await expect(card2.locator('.hear-missing')).toHaveCount(0)
  expect(await spoken(page)).toEqual([])
})

test('the Arabic hadith of an answer has no button; its English translation is heard, never its Arabic', async ({ page }) => {
  await recorder(page)
  await fakeRecitation(page)
  await server(page, { answer: 'answer-hadith-arkan.json' })
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'answer-hadith-arkan.json'), 'utf8')) as { quotes: { id: string; kind: string; text: string }[] }
  const hadith = fixture.quotes.filter((q) => q.kind === 'hadith').map((q) => q.text)
  await page.goto('/?lang=en&theme=light')
  await page.locator('#q').fill('What are the pillars of Islam?')
  await page.locator('button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  await expect(card.locator('.hd-ans')).toBeVisible()
  // No button right under the Arabic text (the frame has none for a hadith).
  await expect(card.locator('.frame-listen-row')).toHaveCount(0)
  const tr = card.locator('.hd-ans .section .hear-btn')
  if ((await tr.count()) > 0) {
    await tr.click()
    const said = await spoken(page)
    expect(said.length).toBeGreaterThan(0)
    expect(said.every((x) => x.lang === 'en-US')).toBe(true)
  }
  await nothingSacredSpoken(page, { hadith })
})
