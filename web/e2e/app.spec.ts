import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

// Each question counts toward the live daily limit (40 per device), so only the mobile project asks new ones.
const SHOTS = path.resolve(import.meta.dirname, '../../docs/screenshots')
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, `live-${test.info().project.name}-${name}.png`) })

let problems: string[] = []
let offline = false
// Expected only while the browser is offline: failed requests and the service-worker update check.
const OFFLINE_NOISE = /ERR_INTERNET_DISCONNECTED|ServiceWorker|fetching the script/
test.beforeEach(async ({ page }) => {
  problems = []
  offline = false
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
})
test.afterEach(() => {
  const real = offline ? problems.filter((p) => !OFFLINE_NOISE.test(p)) : problems
  expect(real, real.join('\n')).toEqual([])
})

async function ask(page: Page, q: string) {
  await page.locator('#q').fill(q)
  await page.getByRole('button', { name: 'إرسال' }).click()
  await expect(page.getByRole('status').filter({ hasText: /أبحث في المصادر|أتحقق من النص/ }).first()).toBeVisible()
}

test('home page, security headers and installable manifest', async ({ page }) => {
  const res = await page.goto('/')
  const h = res!.headers()
  expect(h['content-security-policy']).toContain("default-src 'self'")
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('no-referrer')
  expect(h['permissions-policy']).toContain('camera=()')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'اسأل عن الإسلام وأركانه وعباداته' })).toBeVisible()
  await expect(page.locator('.chip')).toHaveCount(4)
  await expect(page.getByText('بيانات تجريبية')).toHaveCount(0)
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ display: 'standalone', lang: 'ar', dir: 'rtl' })
  await shot(page, 'home')
})

test('an answered question shows the source text, its reference, al-Muyassar and working links', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'questions are asked on mobile only (daily limit)')
  await page.goto('/')
  await ask(page, 'كيف أتوضأ؟')
  const card = page.locator('article.card').first()
  await expect(card).toBeVisible()
  await expect(card.getByText('المائدة: ٦', { exact: true })).toBeVisible()
  await expect(card.getByText('✓ مطابق للمصدر').first()).toBeVisible()
  await expect(card.locator('.tafsir-excerpt').first()).toContainText('التفسير الميسر')
  // Rule 12 (on_demand, the default): the texts only, no generated sentence, and an «بسّط لي» button per passage.
  await expect(card.locator('.direct')).toHaveCount(0)
  await expect(card.locator('.explanation')).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'بسّط لي' }).first()).toBeVisible()
  const source = card.getByRole('link', { name: 'المصدر الأصلي ↗' }).first()
  await expect(source).toHaveAttribute('href', /^https:\/\/quran\.ksu\.edu\.sa\//)
  await shot(page, 'answer')

  await card.getByRole('button', { name: 'النص كاملًا' }).first().click()
  const sheet = page.locator('dialog[open]')
  await expect(sheet).toContainText('التفسير الميسر')
  await expect(sheet).toContainText('تفسير السعدي')
  await shot(page, 'fulltext')
  await sheet.getByRole('button', { name: 'إغلاق' }).click()

  // The report is intercepted: the test checks what would be sent, without writing a fake report to the database.
  let sent: unknown = null
  await page.route('**/api/report', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await card.getByRole('button', { name: 'إبلاغ عن خطأ' }).click()
  const report = page.locator('dialog[open]')
  await report.getByText('المرجع خاطئ').click()
  await report.getByRole('button', { name: 'إرسال' }).click()
  await expect(report).toContainText('شكرًا لك، وصل بلاغك.')
  expect(sent).toEqual({ passageId: 'quran:5:6', reason: 'wrong_ref' })
  await shot(page, 'report')
})

test('a personal-case question is referred, and an unrelated one gets the apology', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'questions are asked on mobile only (daily limit)')
  await page.goto('/')
  await ask(page, 'هل يجوز لي أن أطلق زوجتي؟')
  await expect(page.getByText('هذا السؤال يحتاج فتوى من جهة مختصة')).toBeVisible()
  await expect(page.getByRole('link', { name: /الرئاسة العامة للبحوث العلمية والإفتاء/ })).toHaveAttribute('href', 'https://www.alifta.gov.sa')
  await ask(page, 'من فاز بكأس العالم لكرة القدم؟')
  await expect(page.getByText('لم أجد نصًا في المصادر المعتمدة يطابق سؤالك، ولا أُنشئ نصوصًا من عندي.')).toBeVisible()
  await shot(page, 'referral-abstain')
})

test('language switch to English and Urdu, and dark mode', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /اللغة/ }).click()
  await page.locator('dialog[open]').getByRole('button', { name: /English/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: 'Ask about Islam, its pillars and its worship' })).toBeVisible()
  await shot(page, 'home-en')
  await page.getByRole('button', { name: /Language/ }).click()
  await page.locator('dialog[open]').getByRole('button', { name: /اردو/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur')
  await shot(page, 'home-ur')
  await page.getByRole('button', { name: 'ترتیبات' }).click()
  await page.locator('dialog[open]').getByRole('radio', { name: 'تاریک' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('dialog[open]').getByRole('button', { name: 'بند کریں' }).click()
  await shot(page, 'home-ur-dark')
})

test('Quran reader: open a sura, tap an ayah, "ask about this ayah" fills the question without sending', async ({ page }) => {
  await page.goto('/quran')
  await page.locator('.sura-row', { hasText: 'الفاتحة' }).first().click()
  await expect(page.locator('.sura-title')).toContainText('الفاتحة')
  await shot(page, 'reader-sura')
  await page.locator('.ayah-num').nth(1).click()
  const sheet = page.locator('dialog[open]')
  await expect(sheet).toContainText('التفسير الميسر')
  await shot(page, 'reader-ayah')
  await sheet.getByRole('button', { name: 'اسأل عن هذه الآية' }).click()
  await expect(page.locator('#q')).toHaveValue(/ما معنى الآية/)
  await expect(page.locator('.bubble')).toHaveCount(0)
})

test('offline banner', async ({ page, context }) => {
  await page.goto('/')
  offline = true
  await context.setOffline(true)
  await expect(page.getByText('أنت غير متصل بالإنترنت')).toBeVisible()
  await shot(page, 'offline')
  await context.setOffline(false)
})
