import { expect, test, type Page } from '@playwright/test'
import { WELCOME } from '../src/v2/welcome/strings'

// Talal's direct order of 1 November 10:00: «صفحة الترحيب: أرجعها مثل نموذج البناء 17 الذي اعتمدته، بزر «ابدأ» وزر اختيار
// اللغة. وإذا اختار المستخدم اللغة أو ضغط «ابدأ» يُحفظ ذلك في طبقة التخزين وiCloud، ولا تظهر له الترحيب مرة ثانية».
// The shape (the page with «ابدأ» and the language button, nothing else to press) and the saving: a language picked or
// «ابدأ», then the app opened again, and no welcome. Its pixels are the visual lock's (v2-0072-first-screen-lock.spec.ts).
// Run on the app's own build (npm run build:native, then vite preview): BASE_URL=http://localhost:<port>.
// The «iPhone app» tests run that build as the iPhone app over a small stand-in for the native side (installed before
// the page loads): Preferences (the storage layer, src/storage/device.ts) and the iCloud key-value store (CloudStore,
// src/storage/cloud.ts), each kept in sessionStorage so that it outlives a reload and a cleared localStorage, as
// UserDefaults and iCloud outlive the web view's storage.
test.skip(({ isMobile }) => !isMobile, 'phone-sized only')
test.use({ serviceWorkers: 'block', storageState: { cookies: [], origins: [] } })

const KEY = 'muslim.welcome.v1'
const quiet = (page: Page) => page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)|\/api\//, (r) => r.abort())
const welcome = (page: Page) => page.getByTestId('welcome')
const home = (page: Page) => page.locator('#q')

/** The page's own controls: the language button and «ابدأ», and nothing else. */
async function shape(page: Page, lang: 'ar' | 'en') {
  await expect(welcome(page)).toBeVisible()
  await expect(welcome(page)).toHaveAttribute('data-mode', 'first')
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
  await page.getByTestId('welcome-lang').click()
  await expect(page).toHaveURL(/\/language/)
  await page.getByRole('button', { name: /English/ }).first().click()
}

test.describe('the welcome page as in build 17', () => {
  test.beforeEach(({ page }) => quiet(page))
  for (const lang of ['ar', 'en'] as const)
    test(`the first run (${lang}): the painting, the language button and «ابدأ»`, async ({ page }) => {
      await page.goto(`/?lang=${lang}`)
      await shape(page, lang)
    })

  test('a language picked from it: back to the welcome in that language, as in build 17, and recorded', async ({ page }) => {
    await page.goto('/?lang=ar')
    await pickEnglish(page)
    await shape(page, 'en')
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('1')
  })
})

test.describe('saved: the welcome never again', () => {
  test.beforeEach(({ page }) => quiet(page))
  test('a language picked, then the app opened again: «يومك», no welcome', async ({ page }) => {
    await page.goto('/?lang=ar')
    await pickEnglish(page)
    await expect(welcome(page)).toBeVisible()
    await page.goto('/')
    await expect(home(page)).toBeVisible()
    await expect(welcome(page)).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('the picker opened and left without a choice: not recorded, the welcome again', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-lang').click()
    await expect(page).toHaveURL(/\/language/)
    await page.goBack()
    await expect(welcome(page)).toBeVisible()
    await page.reload()
    await expect(welcome(page)).toBeVisible()
  })

  test('«ابدأ», then the app opened again: «يومك», no welcome', async ({ page }) => {
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-start').click()
    await expect(welcome(page)).toHaveCount(0)
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

test.describe('the iPhone app: in the storage layer and in iCloud', () => {
  test.beforeEach(({ page }) => quiet(page))

  test('the app\'s storage (Preferences) and iCloud empty: the welcome, as a first run', async ({ page }) => {
    await asIphoneApp(page, {})
    await page.goto('/?lang=ar')
    await shape(page, 'ar')
  })

  test('a language picked: in Preferences at once; localStorage then cleared (the web view\'s storage reclaimed): no welcome', async ({ page }) => {
    await asIphoneApp(page, {})
    await page.goto('/?lang=ar')
    await expect(welcome(page)).toBeVisible()
    await pickEnglish(page)
    await expect(welcome(page)).toBeVisible()
    await expect.poll(async () => (await native(page, 'fake.prefs'))[KEY]).toBe('1')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await expect(home(page)).toBeVisible()
    await expect(welcome(page)).toHaveCount(0)
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('1') // the copy written again from Preferences
  })

  test('«ابدأ» on a phone that has reached its iCloud: in Preferences and, a moment later, in iCloud', async ({ page }) => {
    await asIphoneApp(page, { icloud: { 'muslim.sources.v1': entry(2, '{"pins":{}}') } })
    await page.goto('/?lang=ar')
    await page.getByTestId('welcome-start').click()
    await expect(welcome(page)).toHaveCount(0)
    await expect.poll(async () => (await native(page, 'fake.prefs'))[KEY]).toBe('1')
    await expect.poll(async () => JSON.parse((await native(page, 'fake.icloud'))[KEY] ?? 'null')?.v, { timeout: 5000 }).toBe('1')
  })

  test('a reinstall (Preferences and localStorage empty) whose iCloud says done: «يومك» at once, no welcome', async ({ page }) => {
    await asIphoneApp(page, { icloud: { [KEY]: entry(3, '1') } })
    const t0 = Date.now()
    await page.goto('/?lang=ar')
    await expect(home(page)).toBeVisible({ timeout: 2000 })
    expect(Date.now() - t0).toBeLessThan(2500)
    await expect(welcome(page)).toHaveCount(0)
  })

  test('Preferences says done and iCloud has nothing: no welcome', async ({ page }) => {
    await asIphoneApp(page, { prefs: { [KEY]: '1' } })
    await page.goto('/?lang=ar')
    await expect(home(page)).toBeVisible()
    await expect(welcome(page)).toHaveCount(0)
  })
})
