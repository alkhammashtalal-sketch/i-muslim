import { expect, test, type Page } from '@playwright/test'

// Add-on 0072-add34 §B4 (relay/w1/0072-times/README.md): Dhaka's automatic rule is Karachi with the Maghrib 3 minutes
// its table prints and the Hanafi Asr; the sheet «طريقة الحساب» says where the country's table differs by its method
// (London's sightings, America's lack of an official table; add-on 0072-add38 §4); and on the web the server's row
// follows the settings the page shows, sent again only when they changed. No push service is reached: the browser's
// push manager and permission are stubbed, /api/push/* answered by route mocks.
const DHAKA = { lat: 23.71, lng: 90.407, timeZone: 'Asia/Dhaka', source: 'city', country: 'BD', name: 'ঢাকা' }
const LONDON = { lat: 51.508, lng: -0.126, timeZone: 'Europe/London', source: 'city', country: 'GB', name: 'London' }
const NYC = { lat: 40.714, lng: -74.006, timeZone: 'America/New_York', source: 'city', country: 'US', name: 'New York City' }

async function setup(page: Page, place: object, bells: string[] = [], holdFirst = false) {
  const posted: any[] = []
  await page.route('**/api/push/key', (r) => r.fulfill({ json: { publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' } }))
  await page.route('**/api/push/subscribe', (r) => (posted.push(r.request().postDataJSON()), r.fulfill({ json: { ok: true } })))
  await page.route('**/api/push/unsubscribe', (r) => r.fulfill({ json: { ok: true } }))
  await page.addInitScript(
    ({ place, bells, holdFirst }) => {
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
      // holdFirst: the page's first look at the subscription waits until the test lets it go (a tap in between).
      let held = holdFirst ? new Promise<void>((r) => ((window as any).__release = r)) : null
      const reg = {
        pushManager: {
          getSubscription: async () => {
            const h = held
            held = null
            if (h) await h
            return current
          },
          subscribe: async () => (current = sub),
        },
      }
      Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(reg) })
      ;(window as any).PushManager ??= function PushManager() {}
      Object.defineProperty(window.Notification, 'permission', { get: () => 'granted' })
      ;(window as any).Notification.requestPermission = async () => 'granted'
    },
    { place, bells, holdFirst },
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
  await expect(page.locator('[data-table-note="observed"]')).toHaveText('جدول لندن الموحّد يأخذ الفجر والعشاء من المشاهدة لا من الحساب، فقد يختلف جدول مسجدك عنه دقائق')
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

test('web bells: a tap while the page is still sending keeps the tap’s bells (the resend reads them after its waits)', async ({ page }) => {
  const posted = await setup(page, DHAKA, ['maghrib'], true)
  await page.goto('/today/times?lang=ar')
  const fajr = page.getByRole('button', { name: 'تنبيه الفجر' })
  await fajr.click()
  await expect(fajr).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => posted.length).toBe(1)
  await page.evaluate(() => (window as any).__release?.())
  await page.waitForTimeout(800)
  expect(posted).toHaveLength(1)
  expect([...posted[0].prayers].sort()).toEqual(['fajr', 'maghrib'])
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('muslim.push.v1')!).bells.sort())).toEqual(['fajr', 'maghrib'])
})

// Add-on 0072-add67 §1: on Friday (the place's own date) the Dhuhr row is «الجمعة» with «الفرض ٢ ✦ ٤ بعدها» under it,
// read «الجمعة، …، الفرض ركعتان، أربع ركعات بعدها»; the other days keep «الظهر» and its line. The sheet of sources
// has «الجمعة» with 65764 and 3062 in their text. SHOTS=dir saves the four shots of relay/w1/0072-review-queue/add67.html.
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', source: 'city', country: 'SA', name: 'الرياض' }
for (const [day, iso, friday] of [
  ['Friday', '2026-10-30T06:30:00Z', true],
  ['Saturday', '2026-10-31T06:30:00Z', false],
] as const)
  for (const lang of ['ar', 'en'] as const)
    test(`the sunnahs’ line on a ${day} in ${lang} (add67 §1)`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(iso))
      await setup(page, RIYADH)
      await page.goto(`/today/times?lang=${lang}`)
      const name = page.locator('[data-row-name="dhuhr"]')
      const line = page.locator('[data-sunan="dhuhr"]')
      const want = {
        ar: friday ? ['الجمعة', 'الفرض ٢ ✦ ٤ بعدها'] : ['الظهر', '٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها'],
        en: friday ? ['Jumuah', 'Fard 2 · 4 after'] : ['Dhuhr', '4 before · Fard 4 · 2 after'],
      }[lang]
      await expect(line).toHaveText(want[1])
      // At 09:30 in Riyadh Dhuhr is next: the next-prayer card names it as its row does.
      await expect(page.locator('.dt-next-name')).toHaveText(want[0])
      await expect(name).toHaveText(want.join(''))
      await expect(line.locator('.dt-sunan-fard')).toHaveText(friday ? (lang === 'ar' ? 'الفرض ٢' : 'Fard 2') : lang === 'ar' ? 'الفرض ٤' : 'Fard 4')
      // No «قبلها» on Friday.
      expect((await line.locator('.dt-sunan-side').allTextContents()).includes(lang === 'ar' ? '٤ قبلها' : '4 before')).toBe(!friday)
      // The reader hears the row's words after the time.
      const row = page.locator('.dt-time', { has: name })
      const spoken = (await row.locator('.sr-only').textContent())!
      expect(spoken).toBe(
        lang === 'ar'
          ? friday ? '، الفرض ركعتان، أربع ركعات بعدها' : '، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها'
          : friday ? ', fard two, four rakahs after' : ', four rakahs before, fard four, two rakahs after',
      )
      // The other rows as any day.
      await expect(page.locator('[data-sunan="fajr"]')).toHaveText(lang === 'ar' ? '٢ قبلها ✦ الفرض ٢' : '2 before · Fard 2')
      if (process.env.SHOTS) await row.screenshot({ path: `${process.env.SHOTS}/times-${lang}-${friday ? 'fri' : 'sat'}.png` })
      if (process.env.SHOTS) await page.locator('.dt-rows').screenshot({ path: `${process.env.SHOTS}/times-rows-${lang}-${friday ? 'fri' : 'sat'}.png` })
      // The sheet: «الجمعة» and its two hadiths, the Arabic text always.
      await page.getByTestId('sunan-source').click()
      const fri = page.locator('.dt-sunan-friday')
      await expect(page.locator('.dt-sunan-friday-h')).toHaveText(lang === 'ar' ? 'الجمعة' : 'Jumuah')
      await expect(fri.locator('li')).toHaveCount(2)
      await expect(fri.locator('[data-hadith="65764"] p[lang="ar"]')).toContainText('إذا صليتم بعد الجمعة')
      await expect(fri.locator('[data-hadith="65764"] p.dt-sunan-own')).toHaveCount(0)
      await expect(fri.locator('[data-hadith="3062"] p[lang="ar"]')).toContainText('بَعْدَ الْجُمُعَةِ رَكْعَتَيْنِ')
      await expect(fri.locator('[data-hadith="3062"] p.dt-sunan-own')).toHaveCount(lang === 'ar' ? 0 : 1)
      if (process.env.SHOTS && friday) {
        await page.locator('.dt-sunan-friday-h').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${process.env.SHOTS}/times-sheet-${lang}.png` })
      }
    })
