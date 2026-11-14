import { expect, test, type Page } from '@playwright/test'

// Prayer bells and the portion reminder (reply 0032 part E). No real push service is reached: the browser's push
// manager and permission are stubbed, and /api/push/* answered by route mocks. The exact position set on the device
// must never leave it; only the 0.1° cell does.
const EXACT = { lat: 24.6877, lng: 46.7219 }

async function setup(page: Page, opts: { key: boolean; permission?: 'granted' | 'denied' }) {
  const posted: { url: string; body: any }[] = []
  await page.route('**/api/push/key', (r) => (opts.key ? r.fulfill({ json: { publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' } }) : r.fulfill({ status: 404, json: { ok: false } })))
  await page.route('**/api/push/subscribe', (r) => (posted.push({ url: 'subscribe', body: r.request().postDataJSON() }), r.fulfill({ json: { ok: true } })))
  await page.route('**/api/push/unsubscribe', (r) => (posted.push({ url: 'unsubscribe', body: r.request().postDataJSON() }), r.fulfill({ json: { ok: true } })))
  await page.addInitScript(
    ({ exact, permission }) => {
      localStorage.setItem('muslim.place.v1', JSON.stringify({ ...exact, timeZone: 'Asia/Riyadh', source: 'gps' }))
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' } }),
        unsubscribe: async () => true,
      }
      let current: typeof sub | null = null
      const reg = { pushManager: { getSubscription: async () => current, subscribe: async () => (current = sub) } }
      Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(reg) })
      ;(window as any).PushManager ??= function PushManager() {}
      ;(window as any).Notification.requestPermission = async () => permission
    },
    { exact: EXACT, permission: opts.permission ?? 'granted' },
  )
  return posted
}

test('push: no bells while the server has no key', async ({ page }) => {
  await setup(page, { key: false })
  await page.goto('/today/times?lang=ar')
  await expect(page.getByText('الفجر').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'تنبيه الفجر' })).toHaveCount(0)
})

test('push: a bell sends only the 0.1° cell, the zone and the settings; the last one off deletes the row', async ({ page }) => {
  const posted = await setup(page, { key: true })
  await page.goto('/today/times?lang=ar')
  const bell = page.getByRole('button', { name: 'تنبيه الفجر' })
  await expect(bell).toHaveAttribute('aria-pressed', 'false')
  await bell.click()
  await expect(bell).toHaveAttribute('aria-pressed', 'true')
  const sub = posted.find((p) => p.url === 'subscribe')!.body
  expect(sub.cell).toEqual({ lat: 24.7, lng: 46.7 })
  expect(sub).toMatchObject({ tz: 'Asia/Riyadh', prayers: ['fajr'], ward: null, lang: 'ar' })
  const raw = JSON.stringify(posted)
  expect(raw).not.toContain('24.6877')
  expect(raw).not.toContain('46.7219')
  await bell.click()
  await expect(bell).toHaveAttribute('aria-pressed', 'false')
  expect(posted.at(-1)!.url).toBe('unsubscribe')
})

test('push: refused permission says how to allow it, and nothing is sent', async ({ page }) => {
  const posted = await setup(page, { key: true, permission: 'denied' })
  await page.goto('/today/times?lang=ar')
  await page.getByRole('button', { name: 'تنبيه العصر' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'الإشعارات محجوبة' })).toBeVisible()
  expect(posted).toHaveLength(0)
})

test('push: the portion reminder becomes «every day after Isha»', async ({ page }) => {
  const posted = await setup(page, { key: true })
  await page.goto('/quran/ward?lang=ar')
  await expect(page.getByText('كل يوم بعد العشاء')).toBeVisible()
  const sw = page.getByRole('switch', { name: 'تذكير بالورد' })
  if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click()
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  const sub = posted.filter((p) => p.url === 'subscribe').at(-1)!.body
  expect(sub.ward).toBe('after_isha')
  expect(sub.cell).toEqual({ lat: 24.7, lng: 46.7 })
})
