import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import fatwas from '../../data/fatwas.json' with { type: 'json' }
import { TODAY } from '../src/v2/daily/strings-today'
import { HADITH } from '../src/v2/hadith/strings'
import { READING } from '../src/v2/reading/strings'

// Reply 0031-add16 §3, §4, §5, §7 on a preview of next (never the live link):
//   §3 the hadith page shows two references, «كل المراجع» opens the rest (4196 «من صام رمضان»);
//   §4 before the zawal: Dhuhr −20 minutes → Dhuhr, both sheikhs' quotes, the fixed line under them; after sunrise
//      «… بعد طلوع الشمس إلى أن ترتفع قيد رمح»;
//   §5 «لماذا لا نعرض بعض المناسبات؟»: from 13471 one sentence and its link, no private-use character;
//   §7 the portion reminder «كل يوم بعد العشاء بنصف ساعة» (push stubbed, as in v2-push.spec.ts).
//   cd web && BASE_URL=http://localhost:8833 npx playwright test e2e/v2-add16-pages.spec.ts --project=mobile
// SHOTS=dir also saves the screenshots of these screens there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const shot = async (page: Page, name: string, el?: ReturnType<Page['locator']>) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  if (el) await el.screenshot({ path: `${SHOTS}/${name}`, animations: 'disabled' })
  else await page.screenshot({ path: `${SHOTS}/${name}`, animations: 'disabled' })
}
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const PUA = /[-]/u
const f13471 = fatwas.fatwas.find((f) => f.number === '13471')!
const f15824 = fatwas.fatwas.find((f) => f.number === '15824')!

async function withPlace(page: Page) {
  await page.addInitScript((place) => {
    if (!localStorage.getItem('muslim.place.v1')) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
  }, RIYADH)
}

/** «من ١١:١٩ ص إلى ١١:٣٩ ص» → minutes of the day of each time, whatever the digits. */
const minutesIn = (s: string) =>
  [...s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).matchAll(/(\d{1,2}):(\d{2})/g)].map(
    (m) => Number(m[1]) * 60 + Number(m[2]),
  )

test.describe('§3 the hadith page references', () => {
  test('4196: two references shown, «كل المراجع» reveals the rest as written; keyboard and reduced motion', async ({ page }) => {
    const api = (await (await page.request.get('/api/hadith/4196?lang=ar')).json()) as { ar: { reference: string } }
    const lines = api.ar.reference.split(/\r?\n/).filter((l) => l.trim())
    expect(lines.length).toBeGreaterThan(2)
    await page.goto('/hadith/4196?lang=ar&theme=light')
    const row = page.locator('#hd-text .hd-row', { has: page.locator('.hd-ref') })
    await expect(row.locator('.hd-row-k')).toHaveText(HADITH.ar.references)
    const refs = row.locator('.hd-ref')
    await expect(refs.filter({ visible: true })).toHaveCount(2)
    expect(await refs.filter({ visible: true }).allTextContents()).toEqual(lines.slice(0, 2))
    const btn = page.getByRole('button', { name: HADITH.ar.allReferences })
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await expect(btn).toHaveAttribute('aria-controls', 'hd-refs-rest')
    await expect(page.locator('#hd-refs-rest')).toBeHidden()
    await shot(page, 'hadith-4196-ar.png', page.locator('#hd-text'))
    // The motion is short (≤ 200 ms).
    const ms = await page.locator('#hd-refs-rest').evaluate((e) => parseFloat(getComputedStyle(e).animationDuration) * 1000)
    expect(ms).toBeLessThanOrEqual(200)
    await btn.click()
    await expect(btn).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#hd-refs-rest')).toBeVisible()
    await expect(refs.filter({ visible: true })).toHaveCount(lines.length)
    // Every line exactly as stored, in order, nothing added.
    expect((await refs.allTextContents()).join('\n')).toBe(lines.join('\n'))
    await shot(page, 'hadith-4196-ar-open.png', page.locator('#hd-text'))
    // Keyboard: focus and Enter / Space close and open it.
    await btn.focus()
    await page.keyboard.press('Enter')
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#hd-refs-rest')).toBeHidden()
    await page.keyboard.press('Space')
    await expect(btn).toHaveAttribute('aria-expanded', 'true')
    // Reduced motion: no animation.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('#hd-refs-rest').evaluate((e) => getComputedStyle(e).animationName)).toBe('none')
  })

  test('a hadith with one or two reference lines has no disclosure', async ({ page }) => {
    // 4196 with its reference cut to two lines, through the same page.
    await page.route(/\/api\/hadith\/4196(\?|$)/, async (r) => {
      const res = await r.fetch()
      const body = await res.json()
      body.ar.reference = body.ar.reference.split('\n').slice(0, 2).join('\n')
      await r.fulfill({ response: res, json: body })
    })
    await page.goto('/hadith/4196?lang=ar&theme=light')
    await expect(page.locator('#hd-text .hd-ref')).toHaveCount(2)
    await expect(page.getByRole('button', { name: HADITH.ar.allReferences })).toHaveCount(0)
    await expect(page.locator('#hd-refs-rest')).toHaveCount(0)
  })
})

test.describe('§4 forbidden times', () => {
  for (const lang of ['ar', 'en'] as const) {
    test(`${lang}: before the zawal is Dhuhr −20 minutes to Dhuhr, both quotes, the fixed line; after sunrise begins with «…»`, async ({ page }) => {
      const s = TODAY[lang]
      await withPlace(page)
      await page.goto(`/today/times?lang=${lang}&theme=light`)
      const dhuhr = minutesIn((await page.locator('.dt-time').nth(2).locator('.dt-time-at').textContent())!)[0]
      const card = page.locator('section.dt-card', { has: page.getByRole('heading', { name: s.forbiddenTitle }) })
      const zawal = card.locator('.dt-row', { hasText: s.beforeZawal })
      const [from, to] = minutesIn((await zawal.locator('.dt-row-value').textContent())!)
      expect(to).toBe(dhuhr)
      expect(to - from).toBe(20)
      // Both estimates, as written, then our line.
      const quotes = await zawal.locator('.dt-quote').allTextContents()
      expect(quotes).toEqual([`«والوقت ليس بالطويل يقارب ربع ساعة أو ثلث ساعة»`, `«${fatwas.books[0].passage}»`])
      expect(quotes[1]).toContain('نحو عشر دقائق')
      await expect(zawal.locator('.dt-quote-note')).toHaveText(s.zawalEstimates)
      if (lang === 'ar') expect(s.zawalEstimates).toBe('اختلف تقدير الشيخين للمدة، والوقت المعروض يشمل التقديرين.')
      // The line follows the two quotes.
      const [q2, note] = await Promise.all([zawal.locator('.dt-quote').nth(1).boundingBox(), zawal.locator('.dt-quote-note').boundingBox()])
      expect(note!.y).toBeGreaterThan(q2!.y)
      const sunrise = card.locator('.dt-row', { hasText: s.afterSunrise })
      await expect(sunrise.locator('.dt-quote')).toHaveText('«… بعد طلوع الشمس إلى أن ترتفع قيد رمح»')
      const f10693 = fatwas.fatwas.find((f) => f.number === '10693')!
      expect(f10693.answer).toContain('بعد طلوع الشمس إلى أن ترتفع قيد رمح')
      await expect(card).not.toContainText('الثاني:')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
      await card.scrollIntoViewIfNeeded()
      await shot(page, `forbidden-${lang}.png`, card)
    })
  }
})

test.describe('§5 the calendar «why not»', () => {
  test('13471: its title, one sentence and «الفتوى كاملة في موقع الشيخ»; 15824 in full; no private-use character', async ({ page }) => {
    await page.goto('/today/calendar?lang=ar&theme=light')
    await page.getByRole('button', { name: TODAY.ar.whyButton }).click()
    const sheet = page.locator('dialog.sheet[open]')
    await expect(sheet.locator('.dt-body').first()).toHaveText(TODAY.ar.whyIntro.replace('{days}', TODAY.ar.notMarkedDays))
    const m = sheet.locator('article[data-fatwa="13471"]')
    await expect(m.locator('h3')).toHaveText(f13471.title)
    await expect(m.locator('.dt-fatwa-text')).toHaveCount(1)
    await expect(m.locator('.dt-fatwa-text')).toHaveText('«الاحتفال بالموالد ليس بمشروع، بل هو من البدع»')
    expect(f13471.answer).toContain('الاحتفال بالموالد ليس بمشروع، بل هو من البدع')
    // Neither its question nor the rest of its answer.
    await expect(m).not.toContainText(f13471.question.slice(0, 30))
    await expect(m).not.toContainText('ولم يثبت')
    const link = m.getByRole('link', { name: TODAY.ar.fatwaFull })
    await expect(link).toHaveText('الفتوى كاملة في موقع الشيخ')
    expect(decodeURI((await link.getAttribute('href'))!)).toBe(f13471.url)
    // No private-use character anywhere in the sheet, drawn or hidden.
    const text = await sheet.evaluate((d) => d.textContent ?? '')
    expect(text).not.toMatch(PUA)
    await expect(sheet.locator('.dt-pua')).toHaveCount(0)
    // 15824 stays in full.
    const full = sheet.locator('.dt-fatwa').first()
    expect(await full.locator('.dt-fatwa-text').nth(1).evaluate((p) => p.textContent)).toBe(f15824.answer)
    await m.scrollIntoViewIfNeeded()
    await shot(page, 'calendar-why-ar.png')
  })
})

test.describe('§7 the portion reminder', () => {
  async function stubPush(page: Page, place: boolean) {
    await page.route('**/api/push/key', (r) => r.fulfill({ json: { publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' } }))
    await page.route('**/api/push/subscribe', (r) => r.fulfill({ json: { ok: true } }))
    await page.route('**/api/push/unsubscribe', (r) => r.fulfill({ json: { ok: true } }))
    await page.addInitScript(
      ({ place }) => {
        if (place) localStorage.setItem('muslim.place.v1', JSON.stringify(place))
        const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: {} }), unsubscribe: async () => true }
        let current: typeof sub | null = null
        const reg = { pushManager: { getSubscription: async () => current, subscribe: async () => (current = sub) } }
        Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(reg) })
        ;(window as unknown as { PushManager: unknown }).PushManager ??= function PushManager() {}
        ;(window as unknown as { Notification: { requestPermission: () => Promise<string> } }).Notification.requestPermission = async () => 'granted'
      },
      { place: place ? RIYADH : null },
    )
  }

  test('ar: «كل يوم بعد العشاء بنصف ساعة»; without a place, the line says the half hour too', async ({ page }) => {
    await stubPush(page, true)
    await page.goto('/quran/ward?lang=ar&theme=light')
    await expect(page.getByText(READING.ar.wardReminderPush, { exact: true })).toBeVisible()
    expect(READING.ar.wardReminderPush).toBe('كل يوم بعد العشاء بنصف ساعة')
    await page.getByText(READING.ar.wardReminderPush, { exact: true }).scrollIntoViewIfNeeded()
    await shot(page, 'ward-ar.png')
  })

  test('ar without a place: the reminder asks for the city and says «بعد عشائها بنصف ساعة»', async ({ page }) => {
    await stubPush(page, false)
    await page.goto('/quran/ward?lang=ar&theme=light')
    // Notifications are available (the push line shows), so the switch goes through the push path.
    await expect(page.getByText(READING.ar.wardReminderPush, { exact: true })).toBeVisible()
    const sw = page.getByRole('switch', { name: READING.ar.wardReminder })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.click()
    await expect(page.getByRole('status').filter({ hasText: READING.ar.wardReminderNoPlace })).toBeVisible()
    expect(READING.ar.wardReminderNoPlace).toContain('بعد عشائها بنصف ساعة')
  })

  test('en: «Every day, half an hour after Isha»', async ({ page }) => {
    await stubPush(page, true)
    await page.goto('/quran/ward?lang=en&theme=light')
    await expect(page.getByText(READING.en.wardReminderPush, { exact: true })).toBeVisible()
  })
})
