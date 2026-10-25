// Add-ons 0072-add18 §1–2 and 0072-add19 §3 in the app's own page, as the iPhone app shows it: the web app with
// Capacitor's platform set to «ios» (CapacitorCustomPlatform) and the app's native plugins answered here (Capacitor's
// PluginHeaders and nativePromise), so the settings' «التنبيهات» and the tasbih page's «اعرضها على شاشة القفل» show as
// in the app. The native sides themselves are the Xcode and Gradle builds'. Shots in ALERT_SHOTS when it is given.
//   BASE_URL=http://localhost:5199 ALERT_SHOTS=<dir> npx playwright test e2e/v2-0072-alerts.spec.ts --project mobile
import { expect, test, type Page } from '@playwright/test'

const SHOTS = process.env.ALERT_SHOTS ?? ''
const shot = async (page: Page, name: string, el?: ReturnType<Page['locator']>) => {
  if (!SHOTS) return
  if (el) await el.screenshot({ path: `${SHOTS}/${name}.png` })
  else await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

/** The app's native plugins, answered in the page; every call is kept in window.__calls. */
async function asIosApp(page: Page) {
  await page.addInitScript(() => {
    const calls: { plugin: string; method: string; options: unknown }[] = []
    ;(window as unknown as { __calls: typeof calls }).__calls = calls
    const answers: Record<string, Record<string, (o: unknown) => unknown>> = {
      AlertSounds: { status: () => ({ ready: {} }), prepare: () => ({ ok: true }), channels: () => ({ ready: {} }) },
      TasbihSession: { available: () => ({ supported: true, enabled: true }), active: () => ({ active: false }), start: () => ({ ok: true }), end: () => ({}) },
      LocalNotifications: {
        checkPermissions: () => ({ display: 'granted' }),
        requestPermissions: () => ({ display: 'granted' }),
        getPending: () => ({ notifications: [] }),
        cancel: () => ({}),
        schedule: (o) => ({ notifications: (o as { notifications: { id: number }[] }).notifications.map((n) => ({ id: n.id })) }),
        checkExactNotificationSetting: () => ({ exact_alarm: 'denied' }),
      },
      WidgetBridge: { read: () => ({ json: null }), write: () => ({}) },
    }
    const w = window as unknown as Record<string, unknown>
    w.CapacitorCustomPlatform = { name: 'ios', plugins: {} }
    w.Capacitor = {
      PluginHeaders: Object.entries(answers).map(([name, m]) => ({ name, methods: [...Object.keys(m).map((x) => ({ name: x, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }] })),
      nativePromise: async (plugin: string, method: string, options: unknown) => {
        calls.push({ plugin, method, options })
        return answers[plugin]?.[method]?.(options) ?? {}
      },
      nativeCallback: () => 'cb',
    }
  })
}

test.describe('0072-add18: «التنبيهات» in the app’s settings', () => {
  test('the prayer sound: system and calm tone; the adhan hidden while the server offers none', async ({ page }) => {
    await asIosApp(page)
    await page.route('**/sounds/manifest.json', (r) => r.fulfill({ json: { v: 1, sounds: [] } }))
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const sec = page.getByTestId('alert-settings')
    await expect(sec).toBeVisible()
    await expect(sec.getByRole('radio', { name: 'صوت النظام' })).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByRole('radio', { name: 'نغمة هادئة' })).toBeVisible()
    await expect(sec.getByRole('radio', { name: 'مطلع الأذان' })).toHaveCount(0)
    await expect(sec.getByRole('switch', { name: 'تذكير أذكار الصباح' })).toHaveAttribute('aria-checked', 'false')
    await expect(sec.getByRole('switch', { name: 'تذكير أذكار المساء' })).toHaveAttribute('aria-checked', 'false')
    await sec.scrollIntoViewIfNeeded()
    await shot(page, 'settings-ar', sec)
    await sec.getByRole('radio', { name: 'نغمة هادئة' }).click()
    await expect(sec.getByRole('radio', { name: 'نغمة هادئة' })).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('muslim.alertSound.v1'))).toBe('{"prayer":"calm"}')
  })

  test('the morning reminder: on from a tap, its minutes, and the plan carries it with the calm tone', async ({ page }) => {
    await asIosApp(page)
    await page.addInitScript(() => {
      localStorage.setItem('muslim.alertSound.v1', '{"prayer":"calm"}')
      localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', source: 'city', name: 'الرياض' }))
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const sec = page.getByTestId('alert-settings')
    await sec.getByRole('switch', { name: 'تذكير أذكار الصباح' }).click()
    await expect(sec.getByRole('switch', { name: 'تذكير أذكار الصباح' })).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByText('بعد الشروق بـ١٥ دقيقة')).toBeVisible()
    await sec.getByRole('radio', { name: '٣٠ د' }).click()
    await expect(sec.getByText('بعد الشروق بـ٣٠ دقيقة')).toBeVisible()
    await sec.scrollIntoViewIfNeeded()
    await shot(page, 'settings-morning-on-ar', sec)
    const scheduled = await page.evaluate(() =>
      (window as unknown as { __calls: { plugin: string; method: string; options: { notifications?: { body: string; sound?: string; extra: { kind: string } }[] } }[] }).__calls
        .filter((c) => c.plugin === 'LocalNotifications' && c.method === 'schedule')
        .pop(),
    )
    const ns = scheduled?.options.notifications ?? []
    const m = ns.filter((n) => n.extra.kind === 'adhkarMorning')
    expect(m.length).toBeGreaterThan(20)
    expect(m[0]).toMatchObject({ body: 'أذكار الصباح', sound: 'muslim-calm.caf' })
  })

  test('the server’s own manifest (approved, add-on 0072-add24 §1) offers the adhan, with «يُسمع عند دخول وقت الصلاة فقط»', async ({ page }) => {
    await asIosApp(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const sec = page.getByTestId('alert-settings')
    await expect(sec.getByRole('radio', { name: 'مطلع الأذان' })).toBeVisible()
    await expect(sec.getByText('يُسمع عند دخول وقت الصلاة فقط')).toBeVisible()
    await sec.scrollIntoViewIfNeeded()
    await shot(page, 'settings-adhan-ar', sec)
    // Choosing it downloads the clip from the server, by the manifest's name and hash (the plugin answers here).
    await sec.getByRole('radio', { name: 'مطلع الأذان' }).click()
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __calls: { plugin: string; method: string; options: { id?: string; name?: string } }[] }).__calls
            .filter((c) => c.plugin === 'AlertSounds' && c.method === 'prepare')
            .map((c) => c.options.name),
        ),
      )
      .toEqual(expect.arrayContaining([expect.stringMatching(/^muslim-adhan-short-[0-9a-f]{12}\.caf$/)]))
  })

})

test.describe('0072-add19 §3: «اعرضها على شاشة القفل» on the tasbih page', () => {
  test('starts the session with the steps of hadith 10948, each word from its text', async ({ page }) => {
    await asIosApp(page)
    await page.goto('/today/tasbih')
    const lock = page.getByTestId('tasbih-lock')
    await expect(lock).toBeVisible({ timeout: 30_000 })
    await lock.scrollIntoViewIfNeeded()
    await shot(page, 'tasbih-page-lock-ar', page.locator('section.tool-card', { has: lock }))
    await page.getByTestId('tasbih-lock-start').click()
    await expect(lock.getByRole('status')).toHaveText('الجلسة على شاشة القفل')
    const start = await page.evaluate(() =>
      (window as unknown as { __calls: { plugin: string; method: string; options: { steps: { zikr: string; target: number }[]; source: string } }[] }).__calls.find(
        (c) => c.plugin === 'TasbihSession' && c.method === 'start',
      ),
    )
    expect(start!.options.steps.map((s) => s.target)).toEqual([33, 33, 33, 1])
    expect(start!.options.source).toContain('موسوعة الأحاديث النبوية')
  })
})
