import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import ar from '../src/i18n/ar'
import en from '../src/i18n/en'
import hi from '../src/i18n/hi'
import id from '../src/i18n/id'
import tr from '../src/i18n/tr'
import ur from '../src/i18n/ur'
import { fakeRecitation } from './helpers/fake-recitation'

// The meaning of an ayah in the reader's language (command 22): in ur, id, ms, tr, fr, es and bn, the human translation
// from the Ayat archive (ayah_translations in D1) replaces the English meaning shown by default, labelled with its
// translator, and Sahih International opens on request; Hindi and English as before; Arabic unchanged. The ayah sheet
// reads the real API (/api/passage/…?ml=); the answer card and the voice use the Kaaba answer with its real meanings.
//   BASE_URL=http://localhost:8789 npx playwright test e2e/meaning.spec.ts --project=mobile

const SHOTS = path.resolve(import.meta.dirname, '../../docs/screenshots')
const WAV = path.resolve(import.meta.dirname, 'fixtures/voice-question.wav')
test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] },
  permissions: ['microphone'],
})

const sheetOf = (page: Page) => page.locator('dialog.sheet[open]')

test('ur: 2:255 in the ayah sheet shows the Urdu meaning by Jalandhry, and the English on request', async ({ page }) => {
  await page.goto('/quran/2/255?lang=ur')
  const sheet = sheetOf(page)
  const block = sheet.locator('.meaning-block')
  await expect(block).toBeVisible()
  await expect(block.locator('.section-label').first()).toContainText(ur.meaningMine)
  await expect(block.locator('.section-label').first()).toContainText('جالندربرى')
  const text = block.locator('p.translation[lang="ur"]')
  await expect(text).toHaveAttribute('dir', 'rtl')
  await expect(text).toContainText('زندہ ہمیشہ رہنے والا')
  // No English until asked for.
  await expect(sheet.locator('p.translation[lang="en"]')).toHaveCount(0)
  await block.scrollIntoViewIfNeeded()
  if (test.info().project.name === 'mobile') await page.screenshot({ path: path.join(SHOTS, 'meaning-sheet-ur-390.png') })
  await sheet.getByRole('button', { name: ur.meaningEnButton }).click()
  await expect(sheet.locator('p.translation[lang="en"]')).toContainText('Allah - there is no deity except Him')
})

for (const [lang, t, word] of [['id', id, 'Allah'], ['tr', tr, 'Allah']] as const) {
  test(`${lang}: 2:255 in its own language, labelled with the translator`, async ({ page }) => {
    await page.goto(`/quran/2/255?lang=${lang}`)
    const block = sheetOf(page).locator('.meaning-block')
    await expect(block.locator(`p.translation[lang="${lang}"]`)).toContainText(word)
    await expect(block.locator('.section-label').first()).toContainText(t.meaningMine)
    // Indonesian: the source names the language, not a translator, so the credit is the archive (reply 0025).
    if (lang === 'id') {
      await expect(block.locator('.section-label').first()).toContainText(id.meaningArchive)
      await expect(block.locator('.section-label').first()).not.toContainText('Bahasa Indonesia')
    } else await expect(block.locator('.section-label').first()).toContainText('Diyanet Isleri')
    await expect(block.getByRole('button', { name: t.meaningEnButton })).toBeVisible()
    await block.scrollIntoViewIfNeeded()
    if (test.info().project.name === 'mobile') await page.screenshot({ path: path.join(SHOTS, `meaning-sheet-${lang}-390.png`) })
  })
}

test('hi: no translation in Hindi, the English meaning as before', async ({ page }) => {
  await page.goto('/quran/2/255?lang=hi')
  const sheet = sheetOf(page)
  await expect(sheet.locator('p.translation[lang="en"]')).toContainText('Allah - there is no deity except Him')
  await expect(sheet.locator('.meaning-block')).toHaveCount(0)
  expect(hi.meaningMine).toBeTruthy()
})

// No English meaning anywhere in the Arabic interface (Talal, 6 October 19:00: «معناها بالانجليزي هذا لازم تشيله»).
test('ar: the ayah sheet has al-Muyassar and no English meaning, not even on request', async ({ page }) => {
  const asked: string[] = []
  page.on('request', (r) => r.url().includes('/api/') && asked.push(r.url()))
  await page.goto('/quran/2/255?lang=ar')
  const sheet = sheetOf(page)
  await expect(sheet.locator('#muyassar-h')).toBeVisible()
  await expect(sheet.locator('.meaning-block')).toHaveCount(0)
  await expect(sheet.locator('[lang="en"]')).toHaveCount(0)
  await expect(sheet.getByRole('button', { name: ar.englishMeaning })).toHaveCount(0)
  expect(asked.some((u) => u.includes('ml='))).toBe(false)
})

test('ar: the answer card, its other sources and «the full text» show no English meaning', async ({ page }) => {
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: 'ar' } }))
  await page.goto('/?lang=ar')
  await page.locator('#q').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('.composer button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  await expect(card).toBeVisible()
  await expect(card.locator('[lang="en"]')).toHaveCount(0)
  await expect(card.getByRole('button', { name: ar.englishMeaning })).toHaveCount(0)
  await card.getByRole('tab').nth(1).click()
  await expect(card.locator('[role=tabpanel]:visible [lang="en"]')).toHaveCount(0)
  await expect(card.getByRole('button', { name: ar.englishMeaning })).toHaveCount(0)
  await card.getByRole('button', { name: ar.fullText }).first().click()
  const full = sheetOf(page)
  await expect(full.locator('.section-label').first()).toBeVisible()
  await expect(full.locator('[lang="en"]')).toHaveCount(0)
})

test('ar: the surah read ayah by ayah has no English meaning', async ({ page }) => {
  await page.goto('/quran/112?lang=ar')
  await page.getByRole('radio', { name: ar.modeAyah }).click()
  await expect(page.locator('.ayah-list li').first()).toBeVisible()
  await expect(page.locator('.ayah-list [lang="en"]')).toHaveCount(0)
})

test('en: the English meaning stays, in the ayah sheet and the surah', async ({ page }) => {
  await page.goto('/quran/2/255?lang=en')
  await expect(sheetOf(page).locator('p.translation[lang="en"]')).toContainText('Allah - there is no deity except Him')
  await page.goto('/quran/112?lang=en')
  await page.getByRole('radio', { name: en.modeAyah }).click()
  await expect(page.locator('.ayah-list p.translation[lang="en"]')).toHaveCount(4)
})

test('the surah view in Urdu: each ayah with its Urdu meaning, the translator named once', async ({ page }) => {
  await page.goto('/quran/112?lang=ur')
  await expect(page.locator('.meaning-credit')).toContainText('جالندربرى')
  await expect(page.locator('.ayah-list p.translation[lang="ur"]')).toHaveCount(4)
})

// The answer card and the voice: the Kaaba answer as the server now builds it, each ayah with its meaning read from
// the API (/api/passage/…?ml=), so no model is called.
type M = { lang: string; text: string; translator: string }
async function mockAsk(page: Page, lang: 'ur' | 'tr'): Promise<M[]> {
  const meanings: M[] = []
  for (const q of kaaba.quotes) meanings.push((await (await page.request.get(`/api/passage/${encodeURIComponent(q.id)}?ml=${lang}`)).json()).meaning)
  const quotes = kaaba.quotes.map((q, i) => ({ ...q, meaning: meanings[i] }))
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, quotes, answer_lang: lang } }))
  await page.route('**/explain/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }))
  return meanings
}

test('ur: the answer card shows the meaning in Urdu, the English on request, and «how was it found» says where it comes from', async ({ page }) => {
  const [m] = await mockAsk(page, 'ur')
  expect(m.translator).toBe('جالندربرى')
  await page.goto('/?lang=ur')
  await page.locator('#q').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('.composer button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  const block = card.locator('.meaning-block').first()
  await expect(block.locator('p.translation[lang="ur"]')).toHaveText(m.text)
  await expect(card.locator('p.translation[lang="en"]')).toHaveCount(0)
  await block.scrollIntoViewIfNeeded()
  if (test.info().project.name === 'mobile') await page.screenshot({ path: path.join(SHOTS, 'meaning-card-ur-390.png') })
  await block.getByRole('button', { name: ur.meaningEnButton }).click()
  await expect(block.locator('p.translation[lang="en"]')).toHaveText(kaaba.quotes[0].text_en!)
  await page.locator('.how-found-link').last().click()
  await expect(page.locator('dialog.sheet[open] .how-found-facts')).toContainText(ur.howFoundMeanings)
})

test('voice (tr): the translator\'s line, then the Turkish meaning in a Turkish voice, and no English', async ({ page }) => {
  const [m] = await mockAsk(page, 'tr')
  expect(m.translator).toBe('Diyanet Isleri')
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { text: 'Müslümanlar neden Kâbe\'ye ibadet eder?' } }))
  await fakeRecitation(page)
  await page.addInitScript(() => {
    const w = window as unknown as { __said: { text: string; lang: string }[] }
    w.__said = []
    const voices = [{ name: 'Yelda', lang: 'tr-TR', localService: true, default: true, voiceURI: 'y' }, { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 's' }, { name: 'Majed', lang: 'ar-SA', localService: true, default: false, voiceURI: 'm' }]
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
  await page.goto('/?lang=tr&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg).toHaveAttribute('data-phase', 'reading', { timeout: 20_000 })
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 20_000 })
  const said = await page.evaluate(() => (window as unknown as { __said: { text: string; lang: string }[] }).__said)
  const texts = said.map((s) => s.text)
  // The device voice says one sentence at a time: the meaning starts right after its line.
  const i = texts.findIndex((x) => m.text.startsWith(x.trim()) && x.trim().length > 0)
  expect(i).toBeGreaterThan(0)
  expect(said[i].lang).toMatch(/^tr/)
  expect(texts[i - 1]).toBe(tr.speakMeaningMine.replace('{translator}', 'Diyanet Isleri'))
  expect(texts).not.toContain(kaaba.quotes[0].text_en)
})
