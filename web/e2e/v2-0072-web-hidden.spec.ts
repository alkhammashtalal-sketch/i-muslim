// Add-on 0072-add61 §2: what cannot work in a browser is not shown on the web at all, not even as a disabled button:
// the widgets, the Fajr alarm, the Lock Screen counters (the prayer's, Ramadan's and the tasbih session), Siri and
// Shortcuts («افتحها تلقائيًا» of «أذكار المواقف»), the app icon, and iCloud (the backup's «بياناتك»). Each is behind
// isNative() or platform() === 'ios' in web/src, so the iPhone app keeps every one of them unchanged (CLAUDE.md §14.3).
//
// Part 1 loads the web build in a plain browser and walks every screen that holds one of them in the app: the
// settings, «يومك», the prayer times, Ramadan, the tasbih, the situations' adhkar, «عن التطبيق», and the cards sheet.
// Part 2 is the same pages with Capacitor's platform set to «ios» and the plugins answered here (as
// v2-0072-alerts.spec.ts and v2-0072-alarm-live.spec.ts do): each of them is still there.
//   cd web && npm run build && npx vite preview --port 5241 --strictPort   (the API read from next, GET only)
//   BASE_URL=http://localhost:5241 npx playwright test e2e/v2-0072-web-hidden.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { DATA, fromData } from './names-stub'
import { ABOUT } from '../src/components/about-strings'

test.use({ serviceWorkers: 'block', timezoneId: 'Asia/Riyadh' })
test.describe.configure({ timeout: 120_000 })

const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city', country: 'SA' }
/** 13 Ramadan 1448 at 10:00 in Riyadh (as v2-0072-ramadan.spec.ts): the Ramadan page and its Lock Screen button. */
const IN_RAMADAN = '2027-02-10T10:00:00+03:00'

/** The six, as the interface names them, in Arabic and English (the strings of web/src/native, about-strings.ts,
 *  strings-mawaqif.ts and strings-ramadan.ts). None may be read anywhere on the web. */
const WORDS = {
  // «سيري» as a word (not inside another, e.g. «تيسيري» in a day's text): no Arabic letter on either side.
  ar: /ويدجت|الودجت|منبّه الفجر|منبه الفجر|شاشة القفل|(?<![\u0621-\u064A])(ل|ب)?سيري(?![\u0621-\u064A])|«الاختصارات»|أيقونة التطبيق|آي كلاود|iCloud|افتحها تلقائيًا/,
  en: /widget|Fajr alarm|Lock Screen|Siri|Shortcuts|App icon|app’s icon|iCloud|Open it by itself|Open them automatically/i,
}
/** The sections and buttons of the six (their data-testid in web/src). */
const IDS = ['alert-settings', 'alarm-settings', 'app-icon-settings', 'backup-settings', 'lock-countdown', 'lock-countdown-btn', 'tasbih-lock', 'tasbih-lock-start', 'ramadan-lock', 'mawaqif-auto', 'way-voice', 'open-shortcuts']

/** The app's server for this build's API (a vite preview has none): reads only, never the frozen live link. */
const API = 'https://i-muslim-next.alkhammashtalal.workers.dev'

async function setup(page: Page, o: { time?: string } = {}) {
  if (o.time) await page.clock.setFixedTime(new Date(o.time))
  // The page's /api requests (the tasbih's hadith texts, the name's evidence) answered by next, as the web app on next
  // gets them; anything else leaving the page is refused.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort())
  await page.route('**/api/**', async (r) => {
    const u = new URL(r.request().url())
    if (r.request().method() !== 'GET') return r.abort()
    const res = await r.fetch({ url: API + u.pathname + u.search }).catch(() => null)
    return res ? r.fulfill({ response: res }) : r.abort()
  })
  await page.route('**/config/hijri.json', (r) => r.fulfill({ json: { offset: 0 } }))
  await page.addInitScript((p) => localStorage.setItem('muslim.place.v1', JSON.stringify(p)), RIYADH)
}

/** The iPhone app's plugins, answered in the page: every one says «supported» and «enabled». */
async function asIosApp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    const answers: Record<string, Record<string, unknown>> = {
      AlertSounds: { status: { ready: {} }, prepare: { ok: true }, channels: { ready: {} } },
      TasbihSession: { available: { supported: true, enabled: true }, active: { active: false } },
      FajrAlarm: { available: { supported: true, auth: 'notDetermined', on: false, scheduled: 0 } },
      PrayerCountdown: { available: { supported: true, enabled: true, active: false, fasting: false } },
      FastingCountdown: { available: { supported: true, enabled: true }, active: { active: false } },
      AppIcon: { get: { supported: true, name: null } },
      LocalNotifications: { checkPermissions: { display: 'granted' }, getPending: { notifications: [] }, checkExactNotificationSetting: { exact_alarm: 'denied' } },
      WidgetBridge: { read: { json: null } },
    }
    const method = { name: '*', rtype: 'promise' }
    w.CapacitorCustomPlatform = { name: 'ios', plugins: {} }
    w.Capacitor = {
      PluginHeaders: { find: () => ({ name: '*', methods: { find: () => method } }) },
      nativePromise: async (plugin: string, m: string) => (m === 'addListener' ? 'cb' : (answers[plugin]?.[m] ?? {})),
      nativeCallback: () => 'cb',
    }
  })
}

/** What a reader can see on the page now: its text (with every <details> open) and the test ids present. */
async function seen(page: Page) {
  await page.waitForTimeout(600) // the plugins' answers (none on the web) and the lazy sections
  return page.evaluate((ids) => {
    for (const d of document.querySelectorAll('details')) d.open = true
    return { text: document.body.innerText, ids: ids.filter((id) => document.querySelector(`[data-testid="${id}"]`)) }
  }, IDS)
}

async function openSettings(page: Page, lang: 'ar' | 'en') {
  await page.locator('header').getByRole('button', { name: lang === 'ar' ? 'الإعدادات' : 'Settings' }).first().click()
  await expect(page.locator('dialog.sheet[open]')).toBeVisible()
}

for (const lang of ['ar', 'en'] as const) {
  test.describe(`in a browser (${lang}): none of the six`, () => {
    test('the settings, «يومك», the times, the tasbih and «عن التطبيق»', async ({ page }) => {
      await setup(page)
      const check = async (where: string) => {
        const s = await seen(page)
        expect(s.ids, where).toEqual([])
        expect(s.text, where).not.toMatch(WORDS[lang])
      }
      await page.goto(`/?lang=${lang}`)
      await expect(page.locator('main')).toBeVisible()
      await check('home')
      await openSettings(page, lang)
      await check('settings')
      // No disabled control is left in the settings in their place either.
      expect(await page.locator('dialog.sheet[open] button[disabled]').count(), 'disabled buttons in the settings').toBe(0)
      await page.goto(`/today/times?lang=${lang}`)
      await expect(page.locator('.dt-time').first()).toBeVisible()
      await check('times')
      await page.goto(`/today/tasbih?lang=${lang}`)
      await expect(page.getByTestId('after-prayer')).toBeVisible()
      await check('tasbih')
      await page.goto(`/?lang=${lang}#about`)
      // «عن التطبيق» itself is open (its features' title), so the check reads it and not an empty page.
      await expect(page.locator('#about-features-h')).toHaveText(ABOUT[lang].featuresTitle)
      await check('about')
    })

    test('Ramadan: the countdown without its Lock Screen button', async ({ page }) => {
      await setup(page, { time: IN_RAMADAN })
      await page.goto(`/today/ramadan?lang=${lang}`)
      await expect(page.getByTestId('ramadan-countdown')).toBeVisible()
      const s = await seen(page)
      expect(s.ids).toEqual([])
      expect(s.text).not.toMatch(WORDS[lang])
    })

    test('«أذكار المواقف»: no «افتحها تلقائيًا», and its old address opens the grid', async ({ page }) => {
      await setup(page)
      await page.goto(`/mawaqif?lang=${lang}`)
      await expect(page.locator('.mq-tile').first()).toBeVisible()
      let s = await seen(page)
      expect(s.ids).toEqual([])
      expect(s.text).not.toMatch(WORDS[lang])
      await page.goto(`/mawaqif/auto?lang=${lang}`)
      await expect(page).toHaveURL(new RegExp(`/mawaqif\\?lang=${lang}$`))
      await expect(page.locator('.mq-tile').first()).toBeVisible()
      s = await seen(page)
      expect(s.ids).toEqual([])
      expect(s.text).not.toMatch(WORDS[lang])
    })

    test('the cards: the name of the day’s page and its cards sheet', async ({ page }) => {
      // The names answered from this branch's data/names-daily.json (names-stub.ts fromData), on the day whose name is
      // the second; registered after setup's, so it is asked first.
      await page.clock.setFixedTime(new Date(Date.parse(`${DATA.epoch}T09:00:00Z`) + 86_400_000))
      await setup(page)
      await page.route('**/api/names/**', (r) => {
        const x = fromData(new URL(r.request().url()))
        return r.fulfill({ status: x.status, json: x.body })
      })
      await page.goto(`/today/name/2?lang=${lang}`)
      await expect(page.getByTestId('name-page')).toBeVisible()
      expect((await seen(page)).text).not.toMatch(WORDS[lang])
      await page.getByTestId('name-cards').click()
      await expect(page.getByTestId('cards-sheet')).toBeVisible()
      const s = await seen(page)
      expect(s.ids).toEqual([])
      expect(s.text).not.toMatch(WORDS[lang])
    })
  })
}

test.describe('in the iPhone app (Capacitor «ios», plugins answered here): all of them still there', () => {
  test('the settings: «التنبيهات», «منبّه الفجر», «أيقونة التطبيق», «بياناتك»', async ({ page }) => {
    await asIosApp(page)
    await setup(page)
    await page.goto('/?lang=ar')
    await openSettings(page, 'ar')
    for (const id of ['alert-settings', 'alarm-settings', 'app-icon-settings', 'backup-settings']) await expect(page.getByTestId(id), id).toBeAttached()
  })

  test('the Lock Screen: the prayer times, Ramadan and the tasbih', async ({ page }) => {
    await asIosApp(page)
    await setup(page, { time: IN_RAMADAN })
    await page.goto('/today/times?lang=ar')
    await expect(page.getByTestId('lock-countdown-btn')).toHaveText('اعرض العدّ على شاشة القفل')
    await page.goto('/today/ramadan?lang=ar')
    await expect(page.getByTestId('ramadan-lock')).toBeVisible()
    await page.goto('/today/tasbih?lang=ar')
    await expect(page.getByTestId('tasbih-lock')).toBeVisible()
  })

  test('«أذكار المواقف»: «افتحها تلقائيًا» and its page with Siri and «الاختصارات»', async ({ page }) => {
    await asIosApp(page)
    await setup(page)
    await page.goto('/mawaqif?lang=ar')
    await expect(page.getByTestId('mawaqif-auto')).toBeVisible()
    await page.getByTestId('mawaqif-auto').click()
    await expect(page).toHaveURL(/\/mawaqif\/auto/)
    for (const w of ['voice', 'car', 'nfc']) await expect(page.getByTestId(`way-${w}`)).toBeVisible()
    await expect(page.getByTestId('open-shortcuts')).toBeVisible()
  })
})
