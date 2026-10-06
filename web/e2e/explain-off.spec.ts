import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import { fakeRecitation } from './helpers/fake-recitation'

// The app with «بسّط لي» switched off (reply 0031: READER_EXPLAIN off / EXPLAIN_MODE tafsir_only, signalled by
// GET /api/explain → 404 or { enabled: false }), and still unbroken with it on. Test answers only (no question to
// the live link, nothing to mp3quran).
//   BASE_URL=http://localhost:8787 npx playwright test e2e/explain-off.spec.ts --project=mobile

const WAV = path.resolve(import.meta.dirname, 'fixtures/voice-question.wav')
test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] },
  permissions: ['microphone'],
})

async function setup(page: Page, on: boolean, lang = 'ar') {
  const posted: string[] = []
  await page.route('**/api/explain', (r) => {
    if (r.request().method() === 'GET') return on ? r.fulfill({ json: { enabled: true, mode: 'live' } }) : r.fulfill({ status: 404, json: { error: 'not_found' } })
    posted.push(r.request().postData() ?? '')
    return r.fulfill({ json: { text: 'A sample machine explanation.', fromCache: false, mock: false, source: { name: 'al-Muyassar', url: 'https://quran.ksu.edu.sa/' } } })
  })
  // No reviewed translation of al-Muyassar here (command 21 has its own spec, e2e/reviewed.spec.ts).
  await page.route('**/explain/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }))
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { text: 'Why do Muslims worship the Kaaba?' } }))
  await fakeRecitation(page)
  return posted
}

const askCard = async (page: Page, lang = 'ar') => {
  await page.goto(`/?lang=${lang}`)
  await page.locator('#q').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('.composer button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  await expect(card).toBeVisible()
  return card
}

for (const lang of ['ar', 'en', 'ur']) {
  test(`off (${lang}): no explain button on the card, under a source, or in the ayah sheet; the rest is there`, async ({ page }) => {
    await setup(page, false, lang)
    const card = await askCard(page, lang)
    await expect(card.getByRole('tab')).toHaveCount(3)
    await expect(card.locator('.tafsir-excerpt').first()).toBeVisible()
    await page.waitForTimeout(500)
    await expect(card.locator('button.explain-btn')).toHaveCount(0)
    await card.getByRole('tab').nth(1).click()
    await expect(card.locator('[role=tabpanel]:visible button.explain-btn')).toHaveCount(0)
    // «How was this answer found?»: no line about a generated explanation.
    await card.locator('.how-found-link').click()
    await expect(page.locator('dialog[open] .how-found-facts li')).toHaveCount(2)
    await page.keyboard.press('Escape')

    await page.goto(`/quran/2/255?lang=${lang}`)
    const sheet = page.locator('dialog.sheet[open]')
    await expect(sheet.locator('.sacred')).toBeVisible()
    await page.waitForTimeout(500)
    await expect(sheet.locator('button.explain-btn')).toHaveCount(0)
    await expect(sheet.locator('.tafsir').first()).toBeVisible()
  })
}

test('off: voice conversation in French says the reference and the closing line, no English and nothing «machine»; asks for no explanation', async ({ page }) => {
  const posted = await setup(page, false, 'fr')
  await page.addInitScript(() => {
    const w = window as unknown as { __said: string[] }
    w.__said = []
    const voices = [{ name: 'Thomas', lang: 'fr-FR', localService: true, default: true, voiceURI: 't' }, { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 's' }, { name: 'Majed', lang: 'ar-SA', localService: true, default: false, voiceURI: 'm' }]
    class U {
      text: string
      voice: unknown = null
      lang = ''
      onend: (() => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      constructor(t: string) {
        this.text = t
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: (u: U) => { if (u.text.trim()) w.__said.push(u.text); setTimeout(() => u.onend?.(), 80) }, cancel() {}, getVoices: () => voices, addEventListener() {}, removeEventListener() {} },
      configurable: true,
    })
  })
  await page.goto('/?lang=fr&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg).toHaveAttribute('data-phase', 'reading', { timeout: 20_000 })
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 20_000 })
  const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said)
  expect(said.join(' ')).not.toMatch(/explication automatique|Machine|machine/i)
  expect(said).not.toContain(kaaba.quotes[0].text_en)
  expect(posted).toEqual([])
  await dlg.getByRole('button', { name: /Terminer/ }).click()
})

test('on: the explain button is there and works, as before', async ({ page }) => {
  const posted = await setup(page, true, 'en')
  const card = await askCard(page, 'en')
  const btn = card.locator('[role=tabpanel]:visible button.explain-btn')
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(card.locator('[role=tabpanel]:visible .explain-box')).toContainText('A sample machine explanation.')
  expect(posted.length).toBe(1)
  await page.goto('/quran/2/255?lang=en')
  await expect(page.locator('dialog.sheet[open] button.explain-btn')).toBeVisible()
})
