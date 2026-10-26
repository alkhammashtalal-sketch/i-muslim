import { expect, test, type Page } from '@playwright/test'
import { RAMADAN } from '../src/v2/daily/ramadan/strings-ramadan'
import { TODAY } from '../src/v2/daily/strings-today'

// «رمضان» (add-ons 0072-add26 §4, 0072-add34 §ب8): the page at /today/ramadan and its card on the home, in the three
// states of the year by the fake clock: before Sha'ban (no card), in Sha'ban (the countdown to Ramadan), in Ramadan
// (the day, the countdown to iftar, today's row). The place is Riyadh; the month's table is the app's own times with no
// «إمساك» anywhere, and Ibn Baz 11916 under it as stored. Inside the iPhone app (Capacitor's bridge stood in for, as in
// v2-0062-calendar.spec.ts) the Lock Screen button hands the countdown to the FastingCountdown plugin.
//   BASE_URL=http://localhost:5191 npx playwright test e2e/v2-0072-ramadan.spec.ts --project=mobile

test.use({ serviceWorkers: 'block', timezoneId: 'Asia/Riyadh' })
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city', country: 'SA' }

async function at(page: Page, time: string, o: { place?: boolean } = {}) {
  await page.clock.setFixedTime(new Date(time))
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort())
  await page.route('**/config/hijri.json', (r) => r.fulfill({ json: { offset: 0 } }))
  if (o.place !== false) await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
}

type Rec = { plugin: string; method: string; options: Record<string, unknown> }
async function asIphone(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    const calls: Rec[] = []
    w.__calls = calls
    w.CapacitorCustomPlatform = { name: 'ios' }
    const method = { name: '*', rtype: 'promise' }
    w.Capacitor = {
      PluginHeaders: { find: () => ({ name: '*', methods: { find: () => method } }) },
      nativePromise: async (plugin: string, m: string, options: Record<string, unknown>) => {
        calls.push({ plugin, method: m, options })
        if (plugin === 'FastingCountdown' && m === 'available') return { supported: true, enabled: true }
        if (plugin === 'FastingCountdown' && m === 'active') return { active: false }
        if (plugin === 'FastingCountdown' && m === 'start') return { ok: true }
        if (m === 'addListener') return 'cb'
        return {}
      },
      nativeCallback: () => 'cb',
    }
  })
}

const noImsak = async (page: Page) => expect(await page.locator('main').innerText()).not.toMatch(/[إا]مساك/)

test('before Sha’ban (25 October 2026): no card on the home; the page counts the days to 1 Ramadan 1448', async ({ page }) => {
  await at(page, '2026-10-25T10:00:00+03:00')
  await page.goto('/?lang=ar')
  await expect(page.locator('.day-date')).toBeVisible()
  await expect(page.locator('[data-testid=home-ramadan]')).toHaveCount(0)
  await page.goto('/today/ramadan?lang=ar')
  await expect(page.locator('[data-testid=ramadan-head]')).toHaveAttribute('data-phase', 'before')
  await expect(page.locator('[data-testid=ramadan-head] h2')).toHaveText('رمضان ١٤٤٨')
  await expect(page.getByText('أول أيامه: الاثنين، ٨ فبراير ٢٠٢٧')).toBeVisible()
  await expect(page.getByText(TODAY.ar.courtLine)).toBeVisible()
  await noImsak(page)
})

test('in Sha’ban (20 January 2027): the card, then the page with its countdown, the table and fatwa 11916', async ({ page }) => {
  await at(page, '2027-01-20T10:00:00+03:00')
  await page.goto('/?lang=ar')
  const card = page.locator('[data-testid=home-ramadan]')
  await expect(card).toHaveAttribute('data-phase', 'shaban')
  await expect(card).toContainText('يبقى على رمضان ١٩ يومًا')
  await card.click()
  await expect(page).toHaveURL(/\/today\/ramadan/)
  await expect(page.locator('[data-testid=ramadan-until]')).toHaveText('يبقى على رمضان ١٩ يومًا')
  const table = page.locator('[data-testid=ramadan-table]')
  await expect(table.locator('tbody tr')).toHaveCount(29)
  await expect(table.locator('thead')).toContainText(RAMADAN.ar.fajrSub)
  await expect(table.locator('thead')).toContainText(RAMADAN.ar.colFast)
  const first = table.locator('tbody tr').first()
  await expect(first.locator('td').nth(1)).toHaveText(/٥:١٢/)
  await expect(first.locator('td').nth(5)).toHaveText(/٥:٤٣/)
  await expect(first.locator('td').nth(7)).toHaveText('١٢:٣١')
  const f = page.locator('[data-testid=ramadan-fatwa]')
  await expect(f.locator('h3')).toHaveText('حكم الإمساكيات التي توزع في شهر رمضان')
  await expect(f).toContainText('لا أعلم لهذا التفصيل أصلًا، بل الذي دل عليه الكتاب والسنة أن الإمساك يكون بطلوع الفجر')
  await expect(f.locator('ol li')).toHaveCount(3)
  await expect(f.getByRole('link', { name: TODAY.ar.openFatwa })).toHaveAttribute('href', /^https:\/\/binbaz\.org\.sa\/fatwas\/11916\//)
  await expect(page.locator('[data-testid=ramadan-countdown]')).toHaveCount(0)
  // The page itself: no «إمساك» outside the fatwa's own words.
  const ours = await page.locator('main').evaluate((m) => {
    const c = m.cloneNode(true) as HTMLElement
    c.querySelector('[data-fatwa]')?.remove()
    return c.innerText
  })
  expect(ours).not.toMatch(/[إا]مساك/)
  // Nothing wider than the phone: the table scrolls inside its card.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('in Ramadan (3 Ramadan, 10 February 2027, 10:00): the day, the countdown to iftar and today’s row', async ({ page }) => {
  await at(page, '2027-02-10T10:00:00+03:00')
  await page.goto('/?lang=ar')
  const card = page.locator('[data-testid=home-ramadan]')
  await expect(card).toHaveAttribute('data-phase', 'ramadan')
  await expect(card).toContainText('اليوم ٣ من رمضان')
  await expect(card).toContainText('الإفطار ٥:٤٤')
  await page.goto('/today/ramadan?lang=ar')
  await expect(page.locator('[data-testid=ramadan-day]')).toHaveText('اليوم ٣ من رمضان')
  const c = page.locator('[data-testid=ramadan-countdown]')
  await expect(c).toHaveAttribute('data-kind', 'iftar')
  await expect(c).toContainText(RAMADAN.ar.leftIftar)
  await expect(c).toContainText('٧ ساعات و٤٤ دقيقة')
  const today = page.locator('[data-testid=ramadan-table] tbody tr[aria-current=date]')
  await expect(today).toHaveCount(1)
  await expect(today.locator('th')).toHaveText('٣')
  // No Lock Screen button in the browser.
  await expect(page.locator('[data-testid=ramadan-lock]')).toHaveCount(0)
})

test('in Ramadan before Fajr: the countdown to the Fajr adhan', async ({ page }) => {
  await at(page, '2027-02-10T03:30:00+03:00')
  await page.goto('/today/ramadan?lang=ar')
  const c = page.locator('[data-testid=ramadan-countdown]')
  await expect(c).toHaveAttribute('data-kind', 'suhoor')
  await expect(c).toContainText(RAMADAN.ar.leftFajr)
})

test('without a place: the page asks for the city, and still counts the days', async ({ page }) => {
  await at(page, '2027-01-20T10:00:00+03:00', { place: false })
  await page.goto('/today/ramadan?lang=ar')
  await expect(page.locator('[data-testid=ramadan-until]')).toBeVisible()
  await expect(page.getByText(TODAY.ar.setCity)).toBeVisible()
  await expect(page.locator('[data-testid=ramadan-table]')).toHaveCount(0)
})

test('English: the strings, the fatwa kept in Arabic with its line', async ({ page }) => {
  await at(page, '2027-02-10T10:00:00+03:00')
  await page.goto('/today/ramadan?lang=en')
  await expect(page.locator('[data-testid=ramadan-day]')).toHaveText('Day 3 of Ramadan')
  await expect(page.getByText(RAMADAN.en.arabicOnly)).toBeVisible()
  await expect(page.locator('[data-fatwa=11916] h3')).toHaveAttribute('lang', 'ar')
})

test('iPhone app: «اعرض العدّاد على شاشة القفل» hands the iftar countdown to the plugin', async ({ page }) => {
  await asIphone(page)
  await at(page, '2027-02-10T10:00:00+03:00')
  await page.goto('/today/ramadan?lang=ar')
  const lock = page.locator('[data-testid=ramadan-lock]')
  await expect(lock).toBeVisible()
  await lock.getByRole('button', { name: RAMADAN.ar.lockStart }).click()
  await expect(lock.getByText(RAMADAN.ar.lockOn)).toBeVisible()
  const start = await page.evaluate(() => (window as unknown as { __calls: Rec[] }).__calls.find((c) => c.plugin === 'FastingCountdown' && c.method === 'start')?.options)
  expect(start).toMatchObject({ kind: 'iftar', title: 'يبقى على الإفطار', locale: 'ar@numbers=arab', rtl: true, stop: RAMADAN.ar.lockEnd })
  expect(Math.abs((start!.target as number) - new Date('2027-02-10T17:44:00+03:00').getTime())).toBeLessThan(60_000)
  expect(String(start!.at)).toContain('المغرب')
})

test('iPhone app, more than eight hours before iftar: the button waits, with its line', async ({ page }) => {
  await asIphone(page)
  await at(page, '2027-02-10T06:00:00+03:00')
  await page.goto('/today/ramadan?lang=ar')
  const lock = page.locator('[data-testid=ramadan-lock]')
  await expect(lock.getByRole('button', { name: RAMADAN.ar.lockStart })).toBeDisabled()
  await expect(lock.getByText(RAMADAN.ar.lockLater)).toBeVisible()
})

test('the fasting adhkar all year (0072-add38 §1): the section in the adhkar page, reached from the Ramadan page', async ({ page }) => {
  await at(page, '2026-10-25T10:00:00+03:00')
  await page.goto('/today/ramadan?lang=ar')
  await page.locator('[data-testid=ramadan-adhkar]').click()
  await expect(page).toHaveURL(/\/today\/adhkar\?.*part=fasting/)
  await expect(page.getByRole('button', { name: 'الصيام', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const heads = page.locator('.tool-subhead')
  await expect(heads).toHaveText(['إذا دُعيت إلى طعام', 'إذا سابّك أحد', 'عند الإفطار', 'دعاء الضيف لأهل الطعام', 'من سنن الصيام'])
  await expect(page.getByText('إني صائم', { exact: false }).first()).toBeVisible()
  // The two of the Sunnah are the hadith's wording, not a box of words to say.
  await expect(page.locator('[data-testid=mq-wording]')).toHaveCount(2)
})

test('«رؤية الهلال» (6177): the box ends at «ربي وربك الله», the takhrij line under it as written', async ({ page }) => {
  await at(page, '2026-10-25T10:00:00+03:00')
  await page.goto('/mawaqif/crescent?lang=ar')
  const bare = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  expect(bare(await page.locator('[data-testid=mq-words]').innerText())).toBe('«اللهم أهله علينا بالأمن والإيمان، والسلامة والإسلام، ربي وربك الله»')
  await expect(page.locator('[data-testid=mq-note]')).toHaveText('وليس عندهم لفظة: "هلال رشد وخير"، وجاءت عند ابن ابي شيبة بسند مرسل')
})
