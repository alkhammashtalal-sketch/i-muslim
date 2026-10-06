import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import ar from '../src/i18n/ar'
import en from '../src/i18n/en'
import fr from '../src/i18n/fr'
import ur from '../src/i18n/ur'
import { REVIEWED } from '../src/trust/reviewed-strings'
import flag from '../src/config/voice-mode.json' with { type: 'json' }
import { fakeRecitation } from './helpers/fake-recitation'

// «اشرح لي بلغتي» from the reviewed translation of al-Muyassar (command 21): static files at
// /explain/{lang}/{S}_{A}.json, published only for what passed review. A file (200) shows the button outside Arabic,
// in the ayah sheet and under an ayah source on the card; no file (404) shows none; Arabic never asks. The voice
// reads the translation after the English meaning, under its label, only when the file exists. No model is called.
// Test sentences only (not a real translation); the published files are checked in the screenshots.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/reviewed.spec.ts --project=mobile

const WAV = path.resolve(import.meta.dirname, 'fixtures/voice-question.wav')
test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] },
  permissions: ['microphone'],
})

const T = { ar, en, ur, fr } as const
type L = keyof typeof T
const SAMPLE: Record<L, string[]> = {
  ar: ['جملة اختبار.'],
  en: ['First test sentence.', 'Second test sentence.'],
  ur: ['پہلا آزمائشی جملہ۔', 'دوسرا آزمائشی جملہ۔'],
  fr: ['Première phrase de test.', 'Deuxième phrase de test.'],
}

/** `published`: the files that exist, as "en/106_3". Returns the files asked for and the explanations posted. */
async function setup(page: Page, lang: L, published: string[]) {
  const asked: string[] = []
  const posted: string[] = []
  await page.route('**/explain/**', (r) => {
    const m = new URL(r.request().url()).pathname.match(/^\/explain\/([a-z]{2})\/(\d+)_(\d+)\.json$/)
    if (!m) return r.continue()
    const key = `${m[1]}/${m[2]}_${m[3]}`
    asked.push(key)
    if (!published.includes(key)) return r.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
    const sentences = SAMPLE[m[1] as L]
    return r.fulfill({
      json: { id: `quran:${m[2]}:${m[3]}`, lang: m[1], text: sentences.join(' '), sentences, label: 'reviewed-mt', reviewed_at: '2026-10-06', reviewer: 'independent model review' },
    })
  })
  // «بسّط لي» stays off (READER_EXPLAIN false): the status says so, and nothing may be posted.
  await page.route('**/api/explain', (r) => {
    if (r.request().method() !== 'GET') posted.push(r.request().postData() ?? '')
    return r.fulfill({ status: 404, json: { error: 'not_found' } })
  })
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { text: 'Why do Muslims worship the Kaaba?' } }))
  await fakeRecitation(page)
  return { asked, posted }
}

const askCard = async (page: Page, lang: L) => {
  await page.goto(`/?lang=${lang}`)
  await page.locator('#q').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('.composer button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  await expect(card).toBeVisible()
  return card
}

for (const lang of ['en', 'ur'] as const) {
  const t = T[lang]
  const dir = lang === 'ur' ? 'rtl' : 'ltr'

  test(`${lang}, file published: the button in the ayah sheet opens the labelled translation`, async ({ page }) => {
    const { asked, posted } = await setup(page, lang, [`${lang}/2_255`])
    await page.goto(`/quran/2/255?lang=${lang}`)
    const sheet = page.locator('dialog.sheet[open]')
    const btn = sheet.getByRole('button', { name: t.explainMine })
    await expect(btn).toBeVisible()
    expect(asked).toContain(`${lang}/2_255`)
    await btn.click()
    const box = sheet.locator('.explain-box')
    await expect(box).toContainText(t.reviewedTitle)
    await expect(box).toContainText(t.reviewedTag)
    const text = box.locator('p.explanation')
    await expect(text).toHaveText(SAMPLE[lang].join(' '))
    await expect(text).toHaveAttribute('lang', lang)
    await expect(text).toHaveAttribute('dir', dir)
    // The source: al-Muyassar's own link, the same one under the Arabic tafsir above.
    const muyassar = await sheet.locator('.tafsir').first().locator('a').first().getAttribute('href')
    await expect(box.locator('a.text-link')).toHaveAttribute('href', muyassar!)
    expect(posted).toEqual([])
  })

  test(`${lang}, file published: under the ayah source on the card, and «how was it found» says so`, async ({ page }) => {
    const { posted } = await setup(page, lang, [`${lang}/106_3`])
    const card = await askCard(page, lang)
    const panel = card.locator('[role=tabpanel]:visible')
    await panel.getByRole('button', { name: t.explainMine }).click()
    await expect(panel.locator('.explain-box p.explanation')).toHaveText(SAMPLE[lang].join(' '))
    await expect(panel.locator('.explain-box')).toContainText(t.reviewedTag)
    // The second source (2:144) has no file: no button there.
    await card.getByRole('tab').nth(1).click()
    await expect(card.locator('[role=tabpanel]:visible .ayah-extras')).toBeVisible()
    await expect(card.locator('[role=tabpanel]:visible').getByRole('button', { name: t.explainMine })).toHaveCount(0)
    await card.locator('.how-found-link').click()
    const facts = page.locator('dialog[open] .how-found-facts li')
    await expect(facts).toHaveCount(3)
    await expect(facts.nth(1)).toHaveText(REVIEWED[lang].howFound)
    await page.keyboard.press('Escape')
    expect(posted).toEqual([])
  })

  test(`${lang}, no file (404): no button in the sheet or on the card, and no line in «how was it found»`, async ({ page }) => {
    const { asked } = await setup(page, lang, [])
    await page.goto(`/quran/2/255?lang=${lang}`)
    const sheet = page.locator('dialog.sheet[open]')
    await expect(sheet.locator('.tafsir').first()).toBeVisible()
    await expect.poll(() => asked.includes(`${lang}/2_255`)).toBe(true)
    await page.waitForTimeout(300)
    await expect(sheet.getByRole('button', { name: t.explainMine })).toHaveCount(0)
    await expect(sheet.locator('.explain-box')).toHaveCount(0)

    const card = await askCard(page, lang)
    await expect.poll(() => asked.includes(`${lang}/106_3`)).toBe(true)
    await page.waitForTimeout(300)
    await expect(card.getByRole('button', { name: t.explainMine })).toHaveCount(0)
    await card.locator('.how-found-link').click()
    await expect(page.locator('dialog[open] .how-found-facts li')).toHaveCount(2)
  })
}

test('ar: never asks for a file and never shows the button, even where one would exist', async ({ page }) => {
  const { asked } = await setup(page, 'ar', ['ar/2_255', 'ar/106_3'])
  await page.goto('/quran/2/255?lang=ar')
  const sheet = page.locator('dialog.sheet[open]')
  await expect(sheet.locator('.tafsir').first()).toBeVisible()
  await page.waitForTimeout(500)
  await expect(sheet.locator('button.explain-btn')).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: ar.explainMine })).toHaveCount(0)
  const card = await askCard(page, 'ar')
  await page.waitForTimeout(500)
  await expect(card.locator('button.explain-btn')).toHaveCount(0)
  expect(asked).toEqual([])
})

/** A device voice that records what it says, in order (French, English and Arabic voices). */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __said: { text: string; lang: string }[] }
    w.__said = []
    const voices = [{ name: 'Thomas', lang: 'fr-FR', localService: true, default: true, voiceURI: 't' }, { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 's' }, { name: 'Majed', lang: 'ar-SA', localService: true, default: false, voiceURI: 'm' }]
    class U {
      text: string
      voice: { lang: string } | null = null
      lang = ''
      onend: (() => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      constructor(t: string) {
        this.text = t
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: (u: U) => { if (u.text.trim()) w.__said.push({ text: u.text, lang: u.voice?.lang ?? u.lang }); setTimeout(() => u.onend?.(), 80) }, cancel() {}, getVoices: () => voices, addEventListener() {}, removeEventListener() {} },
      configurable: true,
    })
  })
}
const saidSoFar = (page: Page) => page.evaluate(() => (window as unknown as { __said: { text: string; lang: string }[] }).__said)

/** Voice mode in French: what the device voice said, in order. */
async function voiceFr(page: Page) {
  await fakeSpeech(page)
  await page.goto('/?lang=fr&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg).toHaveAttribute('data-phase', 'reading', { timeout: 20_000 })
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 20_000 })
  const said = await saidSoFar(page)
  await dlg.getByRole('button', { name: /Terminer/ }).click()
  return said
}

test('voice (fr), file published: the English meaning, then the label, then the French translation in a French voice', async ({ page }) => {
  const { posted } = await setup(page, 'fr', ['fr/106_3'])
  const said = await voiceFr(page)
  const texts = said.map((s) => s.text)
  const meaning = texts.indexOf(kaaba.quotes[0].text_en!)
  const label = texts.indexOf(fr.speakMachineMuyassar)
  expect(meaning).toBeGreaterThan(-1)
  expect(label).toBeGreaterThan(meaning)
  // The translation right after its label, sentence by sentence (the speaker says one sentence at a time).
  const body = said.slice(label + 1, label + 1 + SAMPLE.fr.length)
  expect(body.map((s) => s.text)).toEqual(SAMPLE.fr)
  for (const s of body) expect(s.lang).toMatch(/^fr/)
  expect(fr.speakMachineMuyassar).toMatch(/traduction automatique.*relecture indépendante/)
  expect(posted).toEqual([])
})

test('voice (fr), no file: as before — the reference and the closing line, no English, nothing «machine»', async ({ page }) => {
  const { posted } = await setup(page, 'fr', [])
  const said = await voiceFr(page)
  const all = said.map((s) => s.text).join(' ')
  expect(all).not.toMatch(/traduction automatique|explication automatique|Machine/i)
  expect(said.map((s) => s.text)).not.toContain(kaaba.quotes[0].text_en)
  expect(posted).toEqual([])
})

test('the other voice conversation (no ?voicemode=1, fr): the same reading, through the same startReading', async ({ page }) => {
  test.skip(flag.enabled, 'the full-screen mode is enabled for everyone: the old toggle is no longer shown')
  await setup(page, 'fr', ['fr/106_3'])
  await fakeSpeech(page)
  await page.goto('/?lang=fr')
  const toggle = page.locator('.voice-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#q').fill('Pourquoi les musulmans adorent-ils la Kaaba ?')
  await page.locator('.composer button.send').click()
  await expect.poll(async () => (await saidSoFar(page)).map((x) => x.text), { timeout: 20_000 }).toContain(SAMPLE.fr[1])
  const texts = (await saidSoFar(page)).map((x) => x.text)
  expect(texts.indexOf(fr.speakMachineMuyassar)).toBeGreaterThan(texts.indexOf(kaaba.quotes[0].text_en!))
  expect(texts.indexOf(SAMPLE.fr[0])).toBe(texts.indexOf(fr.speakMachineMuyassar) + 1)
  await toggle.click()
})
