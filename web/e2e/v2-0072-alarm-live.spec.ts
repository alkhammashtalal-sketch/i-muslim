// Add-on 0072-add34 §ب6 «منبّه الفجر» and §ب7 «اعرض العدّ على شاشة القفل», in the app's own page as the iPhone app shows
// it: the web app with Capacitor's platform set to «ios» (CapacitorCustomPlatform) and the app's native plugins
// answered here (as e2e/v2-0072-alerts.spec.ts does), so the settings and the times page show as in the app. The native
// sides are the Xcode build's (FajrAlarm.swift, PrayerCountdown.swift). Shots in ALARM_SHOTS when it is given.
//   BASE_URL=http://localhost:5199 ALARM_SHOTS=<dir> npx playwright test e2e/v2-0072-alarm-live.spec.ts --project mobile
import { expect, test, type Page } from '@playwright/test'

const SHOTS = process.env.ALARM_SHOTS ?? ''
const shot = async (name: string, el: ReturnType<Page['locator']>) => {
  if (SHOTS) await el.screenshot({ path: `${SHOTS}/${name}.png` })
}
type Calls = { plugin: string; method: string; options: Record<string, unknown> }[]
const calls = (page: Page) => page.evaluate(() => (window as unknown as { __calls: Calls }).__calls)

/** The iPhone app's plugins, answered in the page. `alarm`: what FajrAlarm says (iOS 26 or not, the system's answer). */
async function asIosApp(page: Page, o: { alarmSupported?: boolean; auth?: string; enable?: Record<string, unknown>; countdown?: Record<string, unknown>; fasting?: boolean } = {}) {
  await page.addInitScript((o) => {
    const calls: { plugin: string; method: string; options: unknown }[] = []
    ;(window as unknown as { __calls: typeof calls }).__calls = calls
    let on = false
    const answers: Record<string, Record<string, (x: unknown) => unknown>> = {
      AlertSounds: { status: () => ({ ready: {} }), prepare: () => ({ ok: true }), channels: () => ({ ready: {} }) },
      TasbihSession: { available: () => ({ supported: true, enabled: true }), active: () => ({ active: false }), start: () => ({ ok: true }), end: () => ({}) },
      FajrAlarm: {
        available: () => ({ supported: o.alarmSupported !== false, auth: o.auth ?? 'notDetermined', on, scheduled: on ? 14 : 0 }),
        enable: () => {
          const r = o.enable ?? { ok: true, scheduled: 14 }
          on = r.ok === true
          return r
        },
        disable: () => {
          on = false
          return { scheduled: 0 }
        },
        setSound: () => ({ scheduled: 14 }),
      },
      PrayerCountdown: {
        available: () => ({ supported: true, enabled: true, active: false, fasting: o.fasting === true }),
        start: () => o.countdown ?? { ok: true, prayer: 'العصر', at: Date.now() + 3600_000, text: '٣:٠٦ م' },
        end: () => ({}),
      },
      LocalNotifications: {
        checkPermissions: () => ({ display: 'granted' }),
        requestPermissions: () => ({ display: 'granted' }),
        getPending: () => ({ notifications: [] }),
        cancel: () => ({}),
        schedule: (x) => ({ notifications: (x as { notifications: { id: number }[] }).notifications.map((n) => ({ id: n.id })) }),
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
    localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', source: 'city', name: 'الرياض' }))
  }, o)
}

const APPROVED = {
  v: 1,
  sounds: [
    {
      id: 'adhan-fajr-short',
      approved: true,
      files: { ios: { path: '/sounds/adhan-fajr-short-test.caf', sha256: 'a'.repeat(64), bytes: 1000, seconds: 20 } },
      credit: { source: 'Adhan Recordings from Doha, Qatar', url: 'https://archive.org/details/adhan.recordings.from.doha.qatar', license: 'Public Domain Mark 1.0' },
    },
  ],
}

async function settings(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'الإعدادات' }).first().click()
  return page.getByTestId('alarm-settings')
}

test.describe('0072-add34 §ب6: «منبّه الفجر» in the app’s settings', () => {
  test('off by default; one tap asks the system and sets the days ahead; the usual alarm sound only while the server offers no adhan', async ({ page }) => {
    await asIosApp(page)
    await page.route('**/sounds/manifest.json', (r) => r.fulfill({ json: { v: 1, sounds: [] } }))
    const sec = await settings(page)
    await expect(sec).toBeVisible()
    const sw = sec.getByRole('switch', { name: 'منبّه الفجر' })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await expect(sec.getByText('يرنّ وقت الفجر كل يوم، ولو كان الجوال صامتًا أو في وضع التركيز.')).toBeVisible()
    // Nothing is asked of the system before the tap.
    expect((await calls(page)).filter((c) => c.plugin === 'FajrAlarm' && c.method !== 'available')).toEqual([])
    await sec.scrollIntoViewIfNeeded()
    await shot('settings-alarm-off-ar', sec)
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByText('مضبوط للأيام الـ١٤ القادمة، ويتجدد وحده.')).toBeVisible()
    const en = (await calls(page)).filter((c) => c.plugin === 'FajrAlarm' && c.method === 'enable')
    expect(en).toHaveLength(1)
    expect(en[0].options).toEqual({ sound: null, stop: 'إيقاف' })
    await expect(sec.getByRole('radio', { name: 'صوت المنبّه المعتاد' })).toHaveAttribute('aria-checked', 'true')
    await expect(sec.getByRole('radio', { name: 'الأذان مرة' })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('muslim.fajrAlarm.v1'))).toBe('{"on":true,"sound":"default"}')
    await shot('settings-alarm-on-ar', sec)
    // Off again: the alarms cancelled.
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    expect((await calls(page)).some((c) => c.plugin === 'FajrAlarm' && c.method === 'disable')).toBe(true)
  })

  test('«الأذان مرة» once the server offers the short Fajr adhan approved: downloaded and verified first, then given by its file name', async ({ page }) => {
    await asIosApp(page, { auth: 'authorized' })
    await page.route('**/sounds/manifest.json', (r) => r.fulfill({ json: APPROVED }))
    const sec = await settings(page)
    await sec.getByRole('switch', { name: 'منبّه الفجر' }).click()
    await expect(sec.getByRole('radio', { name: 'الأذان مرة' })).toBeVisible()
    await sec.getByRole('radio', { name: 'الأذان مرة' }).click()
    await expect(sec.getByText('يُسمع أذان الفجر مرة واحدة ولا يتكرر.')).toBeVisible()
    await sec.scrollIntoViewIfNeeded()
    await shot('settings-alarm-adhan-ar', sec)
    const c = await calls(page)
    expect(c.some((x) => x.plugin === 'AlertSounds' && x.method === 'prepare' && /^muslim-adhan-fajr-short-[0-9a-f]{12}\.caf$/.test(String(x.options.name)))).toBe(true)
  })

  test('the system said no: a calm line, and the switch stays off', async ({ page }) => {
    await asIosApp(page, { auth: 'denied', enable: { ok: false, error: 'denied', scheduled: 0 } })
    await page.route('**/sounds/manifest.json', (r) => r.fulfill({ json: { v: 1, sounds: [] } }))
    const sec = await settings(page)
    await sec.getByRole('switch', { name: 'منبّه الفجر' }).click()
    await expect(sec.getByRole('status')).toHaveText('لم يُسمح للتطبيق بالمنبّهات. يمكنك السماح بها من إعدادات الجوال.')
    await expect(sec.getByRole('switch', { name: 'منبّه الفجر' })).toHaveAttribute('aria-checked', 'false')
    await sec.scrollIntoViewIfNeeded()
    await shot('settings-alarm-denied-ar', sec)
  })

  test('before iOS 26: no alarm in the settings (the Fajr bell stays what the phone has)', async ({ page }) => {
    await asIosApp(page, { alarmSupported: false })
    await page.goto('/')
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    await expect(page.getByTestId('alert-settings')).toBeVisible()
    await expect(page.getByTestId('alarm-settings')).toHaveCount(0)
  })
})

test.describe('0072-add34 §ب7: «اعرض العدّ على شاشة القفل» on the times page', () => {
  test('writes the widgets’ times, then starts the countdown; the button then hides it', async ({ page }) => {
    await asIosApp(page)
    await page.goto('/today/times')
    const box = page.getByTestId('lock-countdown')
    await expect(box).toBeVisible({ timeout: 30_000 })
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/times-countdown-ar.png` })
    const before = (await calls(page)).length
    await box.getByRole('button', { name: 'اعرض العدّ على شاشة القفل' }).click()
    await expect(box.getByRole('status')).toHaveText('العدّ إلى العصر على شاشة القفل الآن.')
    await expect(box.getByRole('button', { name: 'أخفِ العدّ' })).toBeVisible()
    // After the tap: the widgets' times are written first, then the countdown starts from them (other writes of the
    // app's own may come later).
    const c = (await calls(page)).slice(before).filter((x) => (x.plugin === 'WidgetBridge' && x.method === 'write') || (x.plugin === 'PrayerCountdown' && x.method === 'start'))
    const first = c.map((x) => x.plugin).indexOf('PrayerCountdown')
    expect(first).toBeGreaterThan(0)
    expect(c.slice(0, first).some((x) => x.plugin === 'WidgetBridge')).toBe(true)
    await shot('times-countdown-on-ar', box)
    await box.getByRole('button', { name: 'أخفِ العدّ' }).click()
    await expect(box.getByRole('button', { name: 'اعرض العدّ على شاشة القفل' })).toBeVisible()
  })

  test('more than twelve hours to the next prayer: says so, and starts nothing', async ({ page }) => {
    await asIosApp(page, { countdown: { ok: false, error: 'tooFar', prayer: 'الفجر' } })
    await page.goto('/today/times')
    const box = page.getByTestId('lock-countdown')
    await box.getByRole('button', { name: 'اعرض العدّ على شاشة القفل' }).click()
    await expect(box.getByRole('status')).toHaveText('الصلاة القادمة بعد أكثر من اثنتي عشرة ساعة، فاعرض العدّ لاحقًا.')
  })

  test('Ramadan’s countdown on the Lock Screen: one countdown at a time, the page says this one takes its place', async ({ page }) => {
    await asIosApp(page, { fasting: true })
    await page.goto('/today/times')
    const box = page.getByTestId('lock-countdown')
    await expect(box).toBeVisible({ timeout: 30_000 })
    await expect(box.getByTestId('lock-countdown-ramadan')).toHaveText('عدّاد رمضان على شاشة القفل الآن، وعدّ الصلاة يحلّ محلّه إن عرضته.')
    await shot('times-countdown-ramadan-ar', box)
    await box.getByRole('button', { name: 'اعرض العدّ على شاشة القفل' }).click()
    await expect(box.getByRole('status')).toHaveText('العدّ إلى العصر على شاشة القفل الآن.')
    await expect(box.getByTestId('lock-countdown-ramadan')).toHaveCount(0)
    // The page never ends Ramadan's itself: the native start does, once this one is shown (PrayerPlan.endAfterStart).
    expect((await calls(page)).some((c) => c.plugin === 'FastingCountdown' && c.method === 'end')).toBe(false)
  })
})
