import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import create from './fixtures/answer-create.json' with { type: 'json' }
import pillars from '../src/mock/answer-pillars.json' with { type: 'json' }
import { fakeRecitation } from './helpers/fake-recitation'

// The ayah in voice conversation heard in a recorded human recitation (command 19).
//   BASE_URL=http://localhost:8787 npx playwright test e2e/voicerecite.spec.ts --project=mobile
// Chromium with a fake microphone (fixtures/voice-question.wav). Nothing real is fetched from mp3quran: every
// request to it gets fixtures/silence-8s.mp3, and the timing files are replaced, so the order and the exact start
// and end of each recitation can be checked. /api/transcribe, /api/ask and /api/explain are answered by the test with
// the live link's own answers (fixtures/answer-*.json). speechSynthesis is a stand-in that logs what would be said.

const WAV = path.resolve(import.meta.dirname, 'fixtures/voice-question.wav')
type Log = { t: 'say' | 'playing' | 'pause'; text?: string; at?: number }

test.use({
  serviceWorkers: 'block',
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] },
  permissions: ['microphone'],
})

async function setup(page: Page, o: { answer: object; timing: (sura: number) => [number, number, number][]; audio?: 'ok' | 'missing' }) {
  await page.route('**/api/transcribe', (r) => r.fulfill({ json: { text: 'لماذا خلق الله الإنسان؟' } }))
  await page.route('**/api/ask', (r) => r.fulfill({ json: o.answer }))
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  const mp3 = await fakeRecitation(page, { timing: o.timing, audio: o.audio })
  await page.addInitScript(() => {
    const w = window as unknown as { __log: Log[] }
    w.__log = []
    const watched = new WeakSet<HTMLMediaElement>()
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!watched.has(this)) {
        watched.add(this)
        this.addEventListener('playing', () => /mp3quran/.test(this.currentSrc) && w.__log.push({ t: 'playing', at: this.currentTime }))
        this.addEventListener('pause', () => /mp3quran/.test(this.currentSrc) && w.__log.push({ t: 'pause', at: this.currentTime }))
      }
      return play.call(this)
    }
    const voice = { name: 'Majed', lang: 'ar-SA', localService: true, default: true, voiceURI: 'majed' }
    class Utterance {
      text: string
      voice: unknown = null
      lang = ''
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
        if (u.text.trim()) w.__log.push({ t: 'say', text: u.text })
        current = u
        timer = window.setTimeout(() => {
          current = null
          u.onend?.()
        }, 150)
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
  return { mp3, log: () => page.evaluate(() => (window as unknown as { __log: Log[] }).__log) }
}

const open = async (page: Page) => {
  await page.goto('/?lang=ar&voicemode=1')
  await page.locator('.voice-toggle').click()
  return page.locator('dialog.voicemode[open]')
}

test('ayah by its id: the line, then the recitation from start_time to end_time exactly, then the reading goes on', async ({ page }) => {
  // al-Dhariyat 56 recited from 2.0 s to 4.5 s of the (silent) recording.
  const { mp3, log } = await setup(page, { answer: create, timing: () => Array.from({ length: 60 }, (_, i) => [i + 1, 2000, 4500]) })
  const dlg = await open(page)
  await expect(dlg.locator('.vm-recite')).toContainText('تلاوة مسجّلة', { timeout: 20_000 })
  await expect(dlg.locator('.vm-recite')).toContainText('الذاريات: ٥٦')
  await expect(dlg.locator('.vm-credit')).toHaveAttribute('href', 'https://www.mp3quran.net')
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 15_000 })
  const l = await log()
  const intro = l.findIndex((x) => x.t === 'say' && x.text === 'نستمع إلى الآية ٥٦ من سورة الذاريات.')
  const playing = l.findIndex((x) => x.t === 'playing')
  const pause = l.findIndex((x) => x.t === 'pause')
  // The next line is said only after the recitation (its 'pause' event may be logged a moment after that line).
  const after = l.findIndex((x, i) => i > playing && x.t === 'say')
  expect(intro).toBeGreaterThanOrEqual(0)
  expect(playing).toBeGreaterThan(intro)
  expect(pause).toBeGreaterThan(playing)
  expect(after).toBeGreaterThan(playing)
  expect(l[after].text).toBe('النص الكامل أمامك على الشاشة.')
  expect(l[playing].at).toBeCloseTo(2.0, 0)
  expect(Math.abs(l[pause].at! - 4.5)).toBeLessThan(0.35)
  // The ayah was heard only in the recording: not one of its words went to the machine voice.
  const said = l.filter((x) => x.t === 'say').map((x) => x.text).join(' ')
  expect(said).not.toContain('خلقت الجن')
  expect(said).not.toContain('آية كريمة تراها على الشاشة')
  expect(mp3.every((u) => u.startsWith('https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/051.mp3'))).toBe(true)
})

test('touching the shamsa stops the recitation and listens', async ({ page }) => {
  await setup(page, { answer: create, timing: () => Array.from({ length: 60 }, (_, i) => [i + 1, 500, 7500]) })
  const dlg = await open(page)
  await expect(dlg.locator('.vm-recite')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(700)
  await dlg.locator('.vm-shamsa').click()
  await expect(dlg).toHaveAttribute('data-phase', 'listening')
  await expect(dlg.locator('.vm-recite')).toHaveCount(0)
})

test('a creed passage: only ayat matched with D1 are recited, three ayat at most, then «وبقية الآيات على الشاشة»', async ({ page }) => {
  // usul:005 quotes Al Imran 18, al-Zukhruf 26–28, Al Imran 64, al-Tawba 128 and al-Bayyina 5, each followed by its
  // reference; all five match D1. 3:18 (one ayah) and 43:26–28 (three, not cut) are recited; then the limit.
  const { log } = await setup(page, { answer: pillars, timing: () => Array.from({ length: 300 }, (_, i) => [i + 1, 500, 1200]) })
  const dlg = await open(page)
  await expect(dlg).toHaveAttribute('data-phase', 'reading', { timeout: 20_000 })
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 25_000 })
  const l = await log()
  const said = l.filter((x) => x.t === 'say').map((x) => x.text!)
  expect(l.filter((x) => x.t === 'playing')).toHaveLength(2)
  expect(said).toContain('نستمع إلى الآية ١٨ من سورة آل عمران.')
  expect(said).toContain('نستمع إلى الآيات ٢٦–٢٨ من سورة الزخرف.')
  expect(said.filter((x) => x === 'وبقية الآيات على الشاشة.')).toHaveLength(1)
  expect(said.join(' ')).not.toContain('نستمع إلى الآية ١٢٨')
  expect(said.join(' ')).not.toContain('نستمع إلى الآية ٥ ')
})

test('the recording does not come: the old fixed line, and the reading goes on', async ({ page }) => {
  const { log } = await setup(page, { answer: create, audio: 'missing', timing: () => Array.from({ length: 60 }, (_, i) => [i + 1, 2000, 4500]) })
  const dlg = await open(page)
  await expect(dlg).toHaveAttribute('data-phase', 'reading', { timeout: 20_000 })
  await expect(dlg).toHaveAttribute('data-phase', 'listening', { timeout: 15_000 })
  const said = (await log()).filter((x) => x.t === 'say').map((x) => x.text!)
  expect(said).toContain('آية كريمة تراها على الشاشة.')
})

test('typing, voice conversation off: nothing is asked of mp3quran', async ({ page }) => {
  const { mp3 } = await setup(page, { answer: create, timing: () => [[56, 2000, 4500]] })
  await page.goto('/?lang=ar')
  await page.locator('#q').fill('لماذا خلق الله الإنسان؟')
  await page.locator('.composer button.send').click()
  await expect(page.locator('.turn').last().locator('article.card')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(mp3).toEqual([])
})

test('the old voice conversation (no ?voicemode=1) follows the same rule', async ({ page }) => {
  const { log } = await setup(page, { answer: create, timing: () => Array.from({ length: 60 }, (_, i) => [i + 1, 2000, 3000]) })
  await page.goto('/?lang=ar')
  const toggle = page.locator('.voice-toggle')
  await toggle.click() // the press that turns conversation on (and unlocks audio)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#q').fill('لماذا خلق الله الإنسان؟')
  await page.locator('.composer button.send').click()
  await expect.poll(async () => (await log()).some((x) => x.t === 'playing'), { timeout: 20_000 }).toBe(true)
  const l = await log()
  expect(l.findIndex((x) => x.t === 'say' && x.text === 'نستمع إلى الآية ٥٦ من سورة الذاريات.')).toBeLessThan(l.findIndex((x) => x.t === 'playing'))
  await toggle.click() // off again, as it was
})
