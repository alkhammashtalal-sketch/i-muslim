// «أيقونة التطبيق» in the app's settings (add-ons 0072-add32 §3, 0072-add31 §2 and 0072-add30 §2), as the iPhone app shows it: the
// web app with Capacitor's platform set to «ios» and the AppIcon plugin answered here (as e2e/v2-0072-alerts.spec.ts
// does). The native side (UIApplication.setAlternateIconName and the system's own notice) is the simulator's
// (relay/w1/0072-icon-choice/README.md). On Android and in the browser the section is not there.
//   BASE_URL=http://localhost:5199 ICON_SHOTS=<dir> npx playwright test e2e/v2-0072-app-icon.spec.ts --project mobile
import { expect, test, type Page } from '@playwright/test'
import { STRINGS } from '../src/i18n'
import { APP_ICON_TEXT } from '../src/native/app-icon-strings'
import { pastWelcome } from './past-welcome'

const SHOTS = process.env.ICON_SHOTS ?? ''
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

/** The app on `platform`, with AppIcon answering from `now` (null: the primary); `fail` makes `set` refuse. */
async function asApp(page: Page, platform: 'ios' | 'android', now: string | null, fail = false) {
  await pastWelcome(page)
  await page.addInitScript(
    ({ platform, now, fail }) => {
      const calls: { plugin: string; method: string; options: unknown }[] = []
      const state = { name: now }
      ;(window as unknown as { __calls: typeof calls }).__calls = calls
      const answers: Record<string, Record<string, (o: unknown) => unknown>> = {
        AppIcon: {
          get: () => ({ supported: true, name: state.name }),
          set: (o) => {
            if (fail) throw new Error('refused')
            state.name = (o as { name: string | null }).name
            return { name: state.name }
          },
        },
        AlertSounds: { status: () => ({ ready: {} }), prepare: () => ({ ok: true }), channels: () => ({ ready: {} }) },
        LocalNotifications: { checkPermissions: () => ({ display: 'granted' }), getPending: () => ({ notifications: [] }) },
        WidgetBridge: { read: () => ({ json: null }), write: () => ({}) },
      }
      const w = window as unknown as Record<string, unknown>
      w.CapacitorCustomPlatform = { name: platform, plugins: {} }
      w.Capacitor = {
        PluginHeaders: Object.entries(answers).map(([name, m]) => ({ name, methods: [...Object.keys(m).map((x) => ({ name: x, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }] })),
        nativePromise: async (plugin: string, method: string, options: unknown) => {
          calls.push({ plugin, method, options })
          return answers[plugin]?.[method]?.(options) ?? {}
        },
        nativeCallback: () => 'cb',
      }
    },
    { platform, now, fail },
  )
}
const setCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls: { plugin: string; method: string; options: unknown }[] }).__calls.filter((c) => c.plugin === 'AppIcon' && c.method === 'set').map((c) => c.options))

test.describe('0072-add32 §3: «أيقونة التطبيق», four', () => {
  test('the four, «المورّقة» chosen by default; a tap asks iOS for the alternate and the mark follows', async ({ page }) => {
    await asApp(page, 'ios', null)
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const sec = page.getByTestId('app-icon-settings')
    await expect(sec).toBeVisible()
    await expect(sec.getByRole('heading', { name: 'أيقونة التطبيق' })).toBeVisible()
    const radios = sec.getByRole('radio')
    await expect(radios).toHaveCount(4)
    await expect(radios.nth(0)).toContainText('المورّقة')
    await expect(radios.nth(0)).toContainText('الافتراضية')
    await expect(radios.nth(1)).toContainText('الصافية')
    await expect(radios.nth(2)).toContainText('المؤطّرة')
    await expect(radios.nth(3)).toContainText('العاجية')
    await expect(sec.getByTestId('app-icon-ornate')).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByText('يُظهر جهازك تنبيهًا عند تغييرها.')).toBeVisible()
    // The four thumbnails are loaded.
    for (const id of ['ornate', 'classic', 'framed', 'ivory']) {
      await expect.poll(() => sec.getByTestId(`app-icon-${id}`).locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(192)
    }
    await sec.scrollIntoViewIfNeeded()
    if (SHOTS) await sec.screenshot({ path: `${SHOTS}/settings-icon-ar.png` })
    await sec.getByTestId('app-icon-classic').click()
    await expect(sec.getByTestId('app-icon-classic')).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByTestId('app-icon-ornate')).toHaveAttribute('aria-checked', 'false')
    await sec.getByTestId('app-icon-framed').click()
    await expect(sec.getByTestId('app-icon-framed')).toHaveAttribute('aria-checked', 'true')
    await sec.getByTestId('app-icon-ornate').click()
    await expect(sec.getByTestId('app-icon-ornate')).toHaveAttribute('aria-checked', 'true')
    expect(await setCalls(page)).toEqual([{ name: 'AppIconClassic' }, { name: 'AppIconFramed' }, { name: null }])
  })

  test('the icon on the Home Screen is the one marked when the settings open', async ({ page }) => {
    await asApp(page, 'ios', 'AppIconIvory')
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    await expect(page.getByTestId('app-icon-ivory')).toHaveAttribute('aria-checked', 'true')
  })

  test('a refusal keeps the mark where it was, with a calm line', async ({ page }) => {
    await asApp(page, 'ios', null, true)
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const sec = page.getByTestId('app-icon-settings')
    await sec.getByTestId('app-icon-ivory').click()
    await expect(sec.getByRole('status')).toHaveText('تعذّر تغيير الأيقونة الآن.')
    await expect(sec.getByTestId('app-icon-ornate')).toHaveAttribute('aria-checked', 'true')
  })

  test('the ten languages: the section, the names by their meaning', async ({ page }) => {
    await asApp(page, 'ios', null)
    for (const l of LANGS) {
      const t = APP_ICON_TEXT[l]
      await page.goto(`/?lang=${l}&theme=light`)
      await page.getByRole('button', { name: STRINGS[l].settings }).first().click()
      const sec = page.getByTestId('app-icon-settings')
      await expect(sec, l).toBeVisible()
      await expect(sec.getByRole('heading'), l).toHaveText(t.section)
      for (const id of ['ornate', 'classic', 'framed', 'ivory'] as const) await expect(sec.getByTestId(`app-icon-${id}`), `${l} ${id}`).toContainText(t.names[id])
      if (SHOTS && (l === 'en' || l === 'ur')) {
        await sec.scrollIntoViewIfNeeded()
        await sec.screenshot({ path: `${SHOTS}/settings-icon-${l}.png` })
      }
    }
  })

  test('not on Android', async ({ page }) => {
    await asApp(page, 'android', null)
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    await expect(page.getByTestId('alert-settings')).toBeVisible()
    await expect(page.getByTestId('app-icon-settings')).toHaveCount(0)
    expect(await setCalls(page)).toEqual([])
  })

  test('not in the browser', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    await expect(page.locator('dialog[open]')).toBeVisible()
    await expect(page.getByTestId('app-icon-settings')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'أيقونة التطبيق' })).toHaveCount(0)
  })
})
