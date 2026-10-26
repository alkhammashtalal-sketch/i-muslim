import { expect, test, type Page } from '@playwright/test'

// Add-on 0072-add34 §B4 (relay/w1/0072-times/README.md): Dhaka's automatic rule is Karachi with the Maghrib 3 minutes
// its table prints and the Hanafi Asr; the sheet «طريقة الحساب» says where the country's table differs by its method
// (London's sightings, America's lack of an official table; add-on 0072-add38 §4); and on the web the server's row
// follows the settings the page shows, sent again only when they changed. No push service is reached: the browser's
// push manager and permission are stubbed, /api/push/* answered by route mocks.
const DHAKA = { lat: 23.71, lng: 90.407, timeZone: 'Asia/Dhaka', source: 'city', country: 'BD', name: 'ঢাকা' }
const LONDON = { lat: 51.508, lng: -0.126, timeZone: 'Europe/London', source: 'city', country: 'GB', name: 'London' }
const NYC = { lat: 40.714, lng: -74.006, timeZone: 'America/New_York', source: 'city', country: 'US', name: 'New York City' }

async function setup(page: Page, place: object, bells: string[] = []) {
  const posted: any[] = []
  await page.route('**/api/push/key', (r) => r.fulfill({ json: { publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' } }))
  await page.route('**/api/push/subscribe', (r) => (posted.push(r.request().postDataJSON()), r.fulfill({ json: { ok: true } })))
  await page.route('**/api/push/unsubscribe', (r) => r.fulfill({ json: { ok: true } }))
  await page.addInitScript(
    ({ place, bells }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('muslim.place.v1', JSON.stringify(place))
        if (bells.length) localStorage.setItem('muslim.push.v1', JSON.stringify({ bells, ward: false }))
        sessionStorage.setItem('seeded', '1')
      }
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' } }),
        unsubscribe: async () => true,
      }
      let current: typeof sub | null = bells.length ? sub : null
      const reg = { pushManager: { getSubscription: async () => current, subscribe: async () => (current = sub) } }
      Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(reg) })
      ;(window as any).PushManager ??= function PushManager() {}
      Object.defineProperty(window.Notification, 'permission', { get: () => 'granted' })
      ;(window as any).Notification.requestPermission = async () => 'granted'
    },
    { place, bells },
  )
  return posted
}

test('Dhaka: Karachi under «تلقائي», with the table’s minutes, and no note', async ({ page }) => {
  await setup(page, DHAKA)
  await page.goto('/today/times?lang=ar')
  await page.getByRole('button', { name: /طريقة الحساب: جامعة العلوم الإسلامية بكراتشي/ }).click()
  await expect(page.getByText('لمكانك: جامعة العلوم الإسلامية بكراتشي، مع دقائق الاحتياط في جدول بلدك')).toBeVisible()
  await expect(page.locator('[data-table-note]')).toHaveCount(0)
})

test('London and New York: the sheet says how the country’s table differs, in Arabic and English', async ({ page }) => {
  await setup(page, LONDON)
  await page.goto('/today/times?lang=ar')
  await page.getByRole('button', { name: /طريقة الحساب: لجنة رؤية الهلال/ }).click()
  await expect(page.locator('[data-table-note="observed"]')).toHaveText('جدول بلدك يأخذ الفجر والعشاء من المشاهدة لا من الحساب، فقد يختلفان عنه دقائق')
  await page.evaluate((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), NYC)
  await page.goto('/today/times?lang=en')
  await page.getByRole('button', { name: /Calculation: / }).click()
  await expect(page.locator('[data-table-note="noTable"]')).toContainText('no official timetable')
})

test('web bells: the row is sent again once with the country’s new settings, then only after a change', async ({ page }) => {
  const posted = await setup(page, DHAKA, ['maghrib'])
  await page.goto('/today/times?lang=ar')
  await expect.poll(() => posted.length).toBe(1)
  expect(posted[0]).toMatchObject({ cell: { lat: 23.7, lng: 90.4 }, tz: 'Asia/Dhaka', method: 'Karachi', asr: 'hanafi', adjust: { maghrib: 3 }, prayers: ['maghrib'] })
  expect(JSON.stringify(posted)).not.toContain('23.71')
  // The same settings: nothing sent.
  await page.reload()
  await expect(page.getByRole('button', { name: /طريقة الحساب/ })).toBeVisible()
  await page.waitForTimeout(800)
  expect(posted).toHaveLength(1)
  // A method chosen by hand: sent, without the country's minutes.
  await page.getByRole('button', { name: /طريقة الحساب/ }).click()
  await page.getByRole('radio', { name: 'رابطة العالم الإسلامي' }).check()
  await expect.poll(() => posted.length).toBe(2)
  expect(posted[1]).toMatchObject({ method: 'MuslimWorldLeague', asr: 'hanafi' })
  expect(posted[1].adjust).toBeUndefined()
})
