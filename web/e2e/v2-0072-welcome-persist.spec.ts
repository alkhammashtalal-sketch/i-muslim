import { expect, test, type Page } from '@playwright/test'
import { WELCOME } from '../src/v2/welcome/strings'

// The welcome page as Talal wants it (1 November 12:31, add-on 0072-add62 §1, correcting his 10:00 order): «صفحة الترحيب
// أصلًا مفترض فيها زر الترجمة. لازم في كل مرة الواحد يفتحها يشوف الصفحة، ويقدر يضغط ابدأ أو يختار اللغة حقته… بالتصميم
// اللي احنا معتمدينه من قبل. ويكون واضح برضو في زر الخيارات جوّا التطبيق، إذا الواحد يبغى يغير لغته».
// - The shape: build 17's page with its two buttons, «ابدأ» and the language button, nothing else to press. Its pixels
//   are the visual lock's (v2-0072-first-screen-lock.spec.ts).
// - The app shows it on every launch on its home; «ابدأ» enters; the language button opens the ten languages.
// - The language chosen is kept (the storage layer and iCloud), and the page comes in it the next time.
// - «اللغة» first in Settings, and changing it there works.
// Run on the app's own build (npm run build:native, then vite preview): BASE_URL=http://localhost:<port>.
// «As the app» is the installed web app (display-mode: standalone), which the app's code treats as the iOS/Android app.
// The «iPhone app» tests run that build as the iPhone app over a small stand-in for the native side (installed before
// the page loads): Preferences (the storage layer, src/storage/device.ts) and the iCloud key-value store (CloudStore,
// src/storage/cloud.ts), kept in sessionStorage so that they outlive a reload and a cleared localStorage, as UserDefaults
// and iCloud outlive the web view's storage.
test.skip(({ isMobile }) => !isMobile, 'phone-sized only')
test.use({ serviceWorkers: 'block', storageState: { cookies: [], origins: [] } })

const SETTINGS = 'imuslim.settings.v1'
const quiet = (page: Page) => page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)|\/api\//, (r) => r.abort())
const welcome = (page: Page) => page.getByTestId('welcome')
const home = (page: Page) => page.locator('#q')

/** The page's own controls: the language button and «ابدأ», and nothing else; the painting and the two marks. */
async function shape(page: Page, lang: 'ar' | 'en') {
  await expect(welcome(page)).toBeVisible()
  await expect(page.getByTestId('welcome-start')).toBeVisible()
  await expect(page.getByTestId('welcome-start')).toHaveText(WELCOME[lang].start)
  await expect(page.getByTestId('welcome-lang')).toBeVisible()
  await expect(page.getByTestId('welcome-lang')).toContainText(lang === 'ar' ? 'العربية' : 'English')
  await expect(welcome(page).locator('button')).toHaveCount(2)
  await expect(welcome(page).locator('img.wl-paint')).toHaveAttribute('src', '/art/welcome-B4.webp')
  await expect(page.locator('.wl-mark-i')).toBeVisible()
  await expect(page.locator('.wl-mark-palm')).toBeVisible()
}

async function pickEnglish(page: Page) {
  await expect(page).toHaveURL(/\/language/)
  // the ten languages are listed
  for (const name of ['العربية', 'English', 'اردو', 'Indonesia', 'Melayu', 'Türkçe', 'Français', 'Español', 'বাংলা', 'हिन्दी'])
    await expect(page.getByRole('button', { name: new RegExp(name) }).first()).toBeVisible()
  await page.getByRole('button', { name: /English/ }).first().click()
}

/** Opened as the installed app (the iOS/Android app's code path for the welcome). */
const asApp = (page: Page) =>
  page.addInitScript(() => {
    const mm = window.matchMedia.bind(window)
    window.matchMedia = (q: string) =>
      q === '(display-mode: standalone)'
        ? ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } as MediaQueryList)
        : mm(q)
  })

test.describe('the welcome page as in build 17', () => {
  test.beforeEach(({ page }) => quiet(page))
  for (const lang of ['ar', 'en'] as const)
    test(`the first run (${lang}): the painting, the language button and «ابدأ»`, async ({ page }) => {
      await page.goto(`/?lang=${lang}`)
      await shape(page, lang)
    })

  test('the language button opens the ten languages; a choice comes back to the page in that language', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-lang').click()
    await pickEnglish(page)
    await shape(page, 'en')
  })
})

test.describe('the app: the welcome on every launch', () => {
  test.beforeEach(async ({ page }) => {
    await quiet(page)
    await asApp(page)
  })

  test('every launch shows it, «ابدأ» enters «يومك» each time', async ({ page }) => {
    await page.goto('/?lang=ar')
    for (let launch = 1; launch <= 3; launch++) {
      await shape(page, 'ar')
      await page.getByTestId('welcome-start').click()
      await expect(welcome(page)).toHaveCount(0)
      await expect(home(page)).toBeVisible()
      await page.reload()
    }
  })

  test('the language chosen on it is kept: the next launch shows the page, and «يومك», in that language', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-lang').click()
    await pickEnglish(page)
    await shape(page, 'en')
    expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), SETTINGS)) ?? '{}')).toMatchObject({ lang: 'en', content: 'en' })
    await page.goto('/')
    await shape(page, 'en')
    await page.getByTestId('welcome-start').click()
    await expect(home(page)).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('the picker left without a choice: the page as it was', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-lang').click()
    await expect(page).toHaveURL(/\/language/)
    await page.goBack()
    await shape(page, 'ar')
  })

  test('opened on another page (a widget\'s or a link\'s) after the first run: that page at once', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('muslim.welcome.v1', '1'))
    await page.goto('/today/adhkar?lang=ar&part=morning')
    await expect(page.locator('.tool-chip').first()).toBeVisible()
    await expect(welcome(page)).toHaveCount(0)
  })
})

test.describe('«اللغة» in Settings', () => {
  test.beforeEach(async ({ page }) => {
    await quiet(page)
    await asApp(page)
  })
  test('the first row of Settings; changing the language there works, and the next launch\'s welcome is in it', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-start').click()
    await page.getByRole('button', { name: 'الإعدادات' }).first().click()
    const dialog = page.getByRole('dialog')
    const row = dialog.getByTestId('settings-language')
    await expect(row).toBeVisible()
    await expect(row).toContainText('اللغة')
    await expect(row).toContainText('العربية')
    // first in the list: its section is the sheet's first
    await expect(dialog.locator('.v2-set-section').first().getByTestId('settings-language')).toHaveCount(1)
    const box = (await row.boundingBox())!
    expect(box.y + box.height).toBeLessThan(page.viewportSize()!.height) // seen without scrolling
    await row.click()
    await pickEnglish(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.goto('/')
    await shape(page, 'en')
  })
})

test.describe('in a browser tab (not the app): the first visit only, as before', () => {
  test.beforeEach(({ page }) => quiet(page))
  test('«ابدأ», then the page loaded again: «يومك»', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-start').click()
    await page.reload()
    await expect(home(page)).toBeVisible()
    await expect(welcome(page)).toHaveCount(0)
  })
})

type Native = { prefs?: Record<string, string>; icloud?: Record<string, string> }
/** The iPhone app's native side for these tests: Preferences and CloudStore, kept in sessionStorage. */
async function asIphoneApp(page: Page, seed: Native) {
  await page.addInitScript((seed: Native) => {
    const ss = window.sessionStorage
    if (!ss.getItem('fake.seeded')) {
      ss.setItem('fake.prefs', JSON.stringify(seed.prefs ?? {}))
      ss.setItem('fake.icloud', JSON.stringify(seed.icloud ?? {}))
      ss.setItem('fake.seeded', '1')
    }
    const get = (k: string) => JSON.parse(ss.getItem(k) ?? '{}') as Record<string, string>
    const put = (k: string, o: Record<string, string>) => ss.setItem(k, JSON.stringify(o))
    const methods = (names: string[], cb: string[] = []) => [...names.map((name) => ({ name, rtype: 'promise' })), ...cb.map((name) => ({ name, rtype: 'callback' }))]
    const w = window as unknown as Record<string, unknown>
    w.CapacitorCustomPlatform = { name: 'ios', plugins: {} }
    let id = 0
    w.Capacitor = {
      PluginHeaders: [
        { name: 'Preferences', methods: methods(['get', 'set', 'remove', 'keys', 'clear']) },
        { name: 'CloudStore', methods: methods(['available', 'getAll', 'set'], ['addListener']) },
      ],
      nativeCallback: () => String(++id),
      nativePromise: async (plugin: string, method: string, o: Record<string, string> = {}) => {
        if (plugin === 'Preferences') {
          const p = get('fake.prefs')
          if (method === 'get') return { value: p[o.key] ?? null }
          if (method === 'set') return void put('fake.prefs', { ...p, [o.key]: o.value })
          if (method === 'remove') return void (delete p[o.key], put('fake.prefs', p))
          if (method === 'keys') return { keys: Object.keys(p) }
          return undefined
        }
        if (plugin === 'CloudStore') {
          const c = get('fake.icloud')
          if (method === 'available') return { available: true }
          if (method === 'getAll') return { values: c }
          if (method === 'set') return put('fake.icloud', { ...c, [o.key]: o.value }), { ok: true }
        }
        return undefined
      },
    }
  }, seed)
}
const native = (page: Page, which: 'fake.prefs' | 'fake.icloud') => page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) ?? '{}') as Record<string, string>, which)
/** iCloud's form of a value (src/storage/cloud.ts Entry). */
const entry = (c: number, v: string) => JSON.stringify({ c, t: c, d: 'other', v, x: {}, a: {} })
const cloudValue = async (page: Page, key: string) => JSON.parse(JSON.parse((await native(page, 'fake.icloud'))[key] ?? 'null')?.v ?? 'null')

test.describe('the iPhone app: the language in the storage layer and in iCloud', () => {
  // Only the app's own build loads the storage layer and iCloud before the first view (main-native.tsx); a web build
  // (main.tsx) has neither, and its page carries no CSP meta: skipped there.
  test.beforeEach(async ({ page, request }) => {
    test.skip(!/http-equiv="Content-Security-Policy"/.test(await (await request.get('/')).text()), 'the native build only (npm run build:native)')
    await quiet(page)
  })

  test('the welcome on every launch, even with «ابدأ» pressed before (Preferences says so)', async ({ page }) => {
    await asIphoneApp(page, { prefs: { 'muslim.welcome.v1': '1' } })
    await page.goto('/')
    await shape(page, 'ar')
    await page.getByTestId('welcome-start').click()
    await expect(home(page)).toBeVisible()
    await page.reload()
    await shape(page, 'ar')
  })

  test('a language picked: in Preferences at once and in iCloud a moment later; with the web view\'s storage reclaimed the next welcome is still in it', async ({ page }) => {
    await asIphoneApp(page, { icloud: { 'muslim.sources.v1': entry(2, '{"pins":{}}') } })
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-lang').click()
    await pickEnglish(page)
    await shape(page, 'en')
    await expect.poll(async () => JSON.parse((await native(page, 'fake.prefs'))[SETTINGS] ?? '{}').content).toBe('en')
    await expect.poll(async () => (await cloudValue(page, SETTINGS))?.content, { timeout: 5000 }).toBe('en')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await shape(page, 'en')
  })

  test('a reinstall (Preferences and localStorage empty) whose iCloud holds the language: the welcome in it', async ({ page }) => {
    await asIphoneApp(page, { icloud: { [SETTINGS]: entry(3, '{"lang":"en","content":"en"}'), 'muslim.welcome.v1': entry(3, '1') } })
    await page.goto('/')
    await expect(page.getByTestId('welcome-start')).toBeVisible({ timeout: 2000 })
    await shape(page, 'en')
  })
})
