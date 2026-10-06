import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { mockAnswer } from '../src/mock/data'

// Full-screen voice mode (command 18), Chromium with a fake microphone that plays e2e/fixtures/voice-question.wav
// (1 s of silence, «ما أركان الإسلام» spoken by the macOS voice Majed, 3 s of silence, looped).
//   BASE_URL=http://localhost:8787 npx playwright test e2e/voicemode.spec.ts --project=mobile
// /api/transcribe and /api/ask are answered by the test (nothing reaches Whisper, the model or the database), and
// speechSynthesis is replaced by a stand-in that records what would be said. Every microphone stream is recorded so
// the test can check that all its tracks end when the mode closes.

const WAV = path.resolve(import.meta.dirname, 'fixtures/voice-question.wav')
const QUESTION = 'ما أركان الإسلام؟'

test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] },
  permissions: ['microphone'],
})

async function setup(page: Page) {
  const calls = { transcribe: 0, ask: 0 }
  const csp: string[] = []
  page.on('console', (m) => m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text()) && csp.push(m.text()))
  await page.route('**/api/transcribe', async (r) => {
    calls.transcribe++
    expect(r.request().headers()['content-type']).toBe('audio/wav')
    await r.fulfill({ json: { text: QUESTION } })
  })
  await page.route('**/api/ask', async (r) => {
    calls.ask++
    await r.fulfill({ json: mockAnswer('ar') })
  })
  await page.addInitScript(() => {
    const w = window as unknown as { __streams: MediaStream[]; __spoken: string[] }
    w.__streams = []
    w.__spoken = []
    const md = navigator.mediaDevices
    const orig = md.getUserMedia.bind(md)
    md.getUserMedia = async (c) => {
      const s = await orig(c)
      w.__streams.push(s)
      return s
    }
    const voice = { name: 'Majed', lang: 'ar-SA', localService: true, default: true, voiceURI: 'majed' }
    class Utterance {
      text: string
      voice: unknown = null
      lang = ''
      volume = 1
      onend: (() => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    let current: Utterance | null = null
    let timer = 0
    const synth = {
      speak(u: Utterance) {
        if (u.text.trim()) w.__spoken.push(u.text)
        current = u
        timer = window.setTimeout(() => {
          current = null
          u.onend?.()
        }, 250)
      },
      cancel() {
        window.clearTimeout(timer)
        const u = current
        current = null
        u?.onerror?.({ error: 'canceled' })
      },
      getVoices: () => [voice],
      addEventListener() {},
      removeEventListener() {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
  })
  return { calls, csp }
}

const liveTracks = (page: Page) =>
  page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length)

test('without the switch: the voice button is the old conversation toggle, and there is no full-screen mode', async ({ page }) => {
  await setup(page)
  await page.goto('/?lang=ar')
  const btn = page.locator('.voice-toggle')
  await expect(btn).toHaveAttribute('aria-pressed', /true|false/)
  await btn.click()
  await expect(page.locator('dialog.voicemode')).toHaveCount(0)
  await btn.click() // back to how it was
})

test('with ?voicemode=1: listen, hear, send, read, listen again, end with every track stopped', async ({ page }) => {
  const { calls, csp } = await setup(page)
  await page.goto('/?lang=ar&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg).toBeVisible()
  await expect(dlg).toHaveAttribute('data-phase', 'listening')
  await expect(dlg.locator('.vm-status')).toHaveText('أستمع…')
  await expect(dlg.locator('.vm-shamsa')).toBeFocused()

  await expect(dlg.locator('.vm-status')).toHaveText(`سمعت: ${QUESTION}`, { timeout: 15_000 })
  expect(calls.transcribe).toBe(1)
  await expect(dlg).toHaveAttribute('data-phase', /searching|reading|listening/, { timeout: 5_000 })
  await expect.poll(() => calls.ask).toBe(1)
  // The reference line of the answer stays shown, and the reading follows speakable.ts (no ayah text read).
  await expect(dlg.locator('.vm-ref')).toContainText('مطابق للمصدر')
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken.length).toBeGreaterThan(0)
  const ayah = mockAnswer('ar').quotes.find((q) => q.kind === 'ayah')
  if (ayah) expect(spoken.join(' ')).not.toContain(ayah.text.slice(0, 20))
  // After the reading, it listens again on its own.
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 10_000 })
  expect(await liveTracks(page)).toBeGreaterThan(0)

  await dlg.getByRole('button', { name: /إنهاء/ }).click()
  await expect(page.locator('dialog.voicemode')).toHaveCount(0)
  await expect.poll(() => liveTracks(page)).toBe(0)
  // The answer card is in the conversation behind it.
  await expect(page.locator('.turn').last()).toBeVisible()
  expect(csp).toEqual([])
})

test('«إلغاء» under «سمعت» sends nothing; Esc ends the mode', async ({ page }) => {
  const { calls } = await setup(page)
  await page.goto('/?lang=ar&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg.locator('.vm-status')).toHaveText(`سمعت: ${QUESTION}`, { timeout: 15_000 })
  await dlg.getByRole('button', { name: 'إلغاء' }).click()
  await expect(dlg).toHaveAttribute('data-phase', 'listening')
  await page.waitForTimeout(1800)
  expect(calls.ask).toBe(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.voicemode')).toHaveCount(0)
  await expect.poll(() => liveTracks(page)).toBe(0)
})

test('mute stops the microphone; English strings', async ({ page }) => {
  await setup(page)
  await page.goto('/?lang=en&voicemode=1')
  await page.locator('.voice-toggle').click()
  const dlg = page.locator('dialog.voicemode[open]')
  await expect(dlg.locator('.vm-status')).toHaveText('Listening…')
  await dlg.getByRole('button', { name: 'Mute microphone' }).click()
  await expect(dlg.locator('.vm-status')).toHaveText('Microphone muted')
  await expect.poll(() => liveTracks(page)).toBe(0)
  await dlg.getByRole('button', { name: 'Unmute' }).click()
  await expect(dlg.locator('.vm-status')).toHaveText('Listening…')
  await dlg.getByRole('button', { name: /End/ }).click()
  await expect.poll(() => liveTracks(page)).toBe(0)
})
