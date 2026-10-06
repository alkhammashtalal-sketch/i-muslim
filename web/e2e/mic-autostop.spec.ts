import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import ar from '../src/i18n/ar'
import en from '../src/i18n/en'
import { MIC } from '../src/voice/mic-strings'

// The microphone button stops by itself (reply 0035): after 3 s of silence the recording ends, is transcribed and
// put in the question box, and nothing is sent; with nothing said in the first 8 s it is dropped unsent («لم أسمع
// جيدًا»); the stop button still works. The microphone is closed afterwards every time. Chrome's fake microphone
// plays voice-question.wav in a loop (1 s of silence, speech to 2.7 s, then 3 s of silence); for silence only, the
// page gets a silent Web Audio stream instead. Transcription is faked; nothing goes to /api/ask.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/mic-autostop.spec.ts --project=mobile   (SHOTS=1: screenshots)

const fixture = (f: string) => path.resolve(import.meta.dirname, 'fixtures', f)
const TEXT = 'Why do Muslims worship the Kaaba?'

test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fixture('voice-question.wav')}`] },
  permissions: ['microphone'],
})

async function setup(page: Page, silent = false) {
  const calls = { transcribe: 0, ask: 0 }
  await page.route('**/api/transcribe', (r) => {
    calls.transcribe++
    return r.fulfill({ json: { text: TEXT } })
  })
  await page.route('**/api/ask', (r) => {
    calls.ask++
    return r.fulfill({ status: 500, json: { error: 'server' } })
  })
  await page.addInitScript((silent) => {
    const w = window as unknown as { __streams: MediaStream[] }
    w.__streams = []
    const md = navigator.mediaDevices
    const orig = md.getUserMedia.bind(md)
    md.getUserMedia = async (c) => {
      const s = silent ? new AudioContext().createMediaStreamDestination().stream : await orig(c)
      w.__streams.push(s)
      return s
    }
  }, silent)
  return calls
}
const micClosed = (page: Page) =>
  page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')))

test.describe('speech, then silence', () => {
  for (const [lang, t] of [['ar', ar], ['en', en]] as const) {
    test(`${lang}: it stops by itself after the silence, fills the question box, sends nothing`, async ({ page }) => {
      const calls = await setup(page)
      await page.goto(`/?lang=${lang}`)
      const mic = page.locator('.mic-btn')
      await mic.click()
      await expect(mic).toHaveAttribute('aria-pressed', 'true')
      const status = page.locator('.mic-status')
      await expect(status).toContainText(t.voiceListening)
      await expect(status.locator('.mic-hint')).toHaveText(MIC[lang].voiceAutoStop, { timeout: 3000 })
      if (process.env.SHOTS) await page.screenshot({ path: path.resolve(import.meta.dirname, `../../docs/screenshots/mic-autostop/${lang}-recording.png`) })
      // No press on stop: the box fills by itself once the speech has ended.
      await expect(page.locator('#q')).toHaveValue(TEXT, { timeout: 15_000 })
      await expect(mic).toHaveAttribute('aria-pressed', 'false')
      expect(calls).toEqual({ transcribe: 1, ask: 0 })
      expect(await micClosed(page)).toBe(true)
      await page.waitForTimeout(800)
      expect(calls.ask).toBe(0)
    })
  }

  test('the stop button still stops it at once', async ({ page }) => {
    const calls = await setup(page)
    await page.goto('/?lang=ar')
    const mic = page.locator('.mic-btn')
    await mic.click()
    await page.waitForTimeout(2000)
    await mic.click()
    await expect(page.locator('#q')).toHaveValue(TEXT, { timeout: 5000 })
    expect(calls).toEqual({ transcribe: 1, ask: 0 })
    expect(await micClosed(page)).toBe(true)
  })
})

test.describe('silence only', () => {
  test('nothing said for 8 s: dropped unsent, «I did not hear that clearly», the microphone closed', async ({ page }) => {
    const calls = await setup(page, true)
    await page.goto('/?lang=ar')
    const mic = page.locator('.mic-btn')
    await mic.click()
    await expect(mic).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(6500)
    await expect(mic).toHaveAttribute('aria-pressed', 'true') // still listening before 8 s
    await expect(page.locator('.mic-status')).toHaveText(ar.voiceUnclear, { timeout: 4000 })
    await expect(mic).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('#q')).toHaveValue('')
    expect(calls).toEqual({ transcribe: 0, ask: 0 })
    expect(await micClosed(page)).toBe(true)
  })
})
