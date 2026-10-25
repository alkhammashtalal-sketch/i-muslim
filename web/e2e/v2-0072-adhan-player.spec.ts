// The full adhan inside the app (add-on 0072-add24 §1) on the times page, as the iPhone app shows it (Capacitor's
// platform «ios», the app's plugins answered in the page, as e2e/v2-0072-alerts.spec.ts): five buttons, each its own
// recording from our server, play and stop on the tap only, one at a time, giving way to a listen button; the source
// line under the times. Shots in ALERT_SHOTS when given.
//   BASE_URL=http://localhost:5199 ALERT_SHOTS=<dir> npx playwright test e2e/v2-0072-adhan-player.spec.ts --project mobile
import { expect, test, type Page } from '@playwright/test'

const SHOTS = process.env.ALERT_SHOTS ?? ''
const RIYADH = JSON.stringify({ lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', source: 'city', name: 'الرياض' })

async function asIosApp(page: Page) {
  await page.addInitScript((place) => {
    localStorage.setItem('muslim.place.v1', place)
    const w = window as unknown as Record<string, unknown>
    w.CapacitorCustomPlatform = { name: 'ios', plugins: {} }
    const answers: Record<string, Record<string, () => unknown>> = {
      AlertSounds: { status: () => ({ ready: {} }), prepare: () => ({ ok: true }), channels: () => ({ ready: {} }) },
      LocalNotifications: { checkPermissions: () => ({ display: 'granted' }), getPending: () => ({ notifications: [] }), cancel: () => ({}), schedule: () => ({ notifications: [] }), checkExactNotificationSetting: () => ({ exact_alarm: 'denied' }) },
      WidgetBridge: { read: () => ({ json: null }), write: () => ({}) },
    }
    w.Capacitor = {
      PluginHeaders: Object.entries(answers).map(([name, m]) => ({ name, methods: [...Object.keys(m).map((x) => ({ name: x, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }] })),
      nativePromise: async (plugin: string, method: string) => answers[plugin]?.[method]?.() ?? {},
      nativeCallback: () => 'cb',
    }
    // Every audio element the page makes, to read what it plays.
    const A = window.Audio
    const made: HTMLAudioElement[] = []
    w.__audios = made
    w.Audio = function (src?: string) {
      const a = new A(src)
      made.push(a)
      return a
    } as unknown as typeof Audio
  }, RIYADH)
}

/** The adhan element: what it plays and whether it plays. */
const adhanAudio = (page: Page) =>
  page.evaluate(() => {
    const a = ((window as unknown as { __audios: HTMLAudioElement[] }).__audios ?? []).find((x) => /\/sounds\//.test(x.src))
    return a ? { src: new URL(a.src).pathname, paused: a.paused, time: a.currentTime } : null
  })

test('five prayers, each its own adhan from the server, play and stop on the tap, one at a time', async ({ page }) => {
  await asIosApp(page)
  await page.goto('/today/times')
  for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) await expect(page.getByTestId(`adhan-${p}`)).toBeVisible()
  await expect(page.getByTestId('adhan-sunrise')).toHaveCount(0)
  await expect(page.getByTestId('adhan-source')).toContainText('Adhan Recordings from Doha, Qatar')
  await expect(page.getByTestId('adhan-source')).toContainText('Public Domain Mark 1.0')
  // Nothing plays by itself.
  expect(await adhanAudio(page)).toBeNull()
  if (SHOTS) {
    await page.locator('section.dt-rows').screenshot({ path: `${SHOTS}/times-adhan-ar.png` })
    await page.getByTestId('adhan-source').screenshot({ path: `${SHOTS}/times-adhan-source-ar.png` })
    await page.screenshot({ path: `${SHOTS}/times-page-ar.png`, fullPage: true })
  }

  const asr = page.getByTestId('adhan-asr')
  await expect(asr).toHaveAttribute('aria-label', 'استمع إلى أذان العصر')
  await asr.click()
  await expect(asr).toHaveAttribute('aria-pressed', 'true')
  await expect(asr).toHaveAttribute('aria-label', 'أوقف أذان العصر')
  await expect.poll(async () => (await adhanAudio(page))?.time ?? 0, { timeout: 20_000 }).toBeGreaterThan(0.5)
  expect((await adhanAudio(page))!.src).toBe('/sounds/adhan-full-asr.m4a')
  if (SHOTS) await page.locator('section.dt-rows').screenshot({ path: `${SHOTS}/times-adhan-playing-ar.png` })

  // Fajr while Asr plays: Asr stops, Fajr (the repaired one) plays.
  await page.getByTestId('adhan-fajr').click()
  await expect(asr).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('adhan-fajr')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await adhanAudio(page))?.src).toBe('/sounds/adhan-full-fajr.m4a')
  // The same tap again stops it.
  await page.getByTestId('adhan-fajr').click()
  await expect(page.getByTestId('adhan-fajr')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => (await adhanAudio(page))?.paused ?? true).toBe(true)
})

test('another sound started elsewhere (a listen button, a recitation) stops the adhan', async ({ page }) => {
  await asIosApp(page)
  await page.goto('/today/times')
  await page.getByTestId('adhan-dhuhr').click()
  await expect(page.getByTestId('adhan-dhuhr')).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.dispatchEvent(new Event('recitation-start')))
  await expect(page.getByTestId('adhan-dhuhr')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('adhan-isha').click()
  await expect(page.getByTestId('adhan-isha')).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.dispatchEvent(new Event('listen-start')))
  await expect(page.getByTestId('adhan-isha')).toHaveAttribute('aria-pressed', 'false')
})

test('in a browser (not the app) the times page has no adhan buttons', async ({ page }) => {
  await page.addInitScript((place) => localStorage.setItem('muslim.place.v1', place), RIYADH)
  await page.goto('/today/times')
  await expect(page.locator('.dt-time').first()).toBeVisible()
  await expect(page.getByTestId('adhan-asr')).toHaveCount(0)
})
