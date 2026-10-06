import { expect, test } from '@playwright/test'
import create from './fixtures/answer-create.json' with { type: 'json' }
import config from '../src/config/recitation.json' with { type: 'json' }
import { fakeRecitation } from './helpers/fake-recitation'

// Several reciters by name (command 20). Nothing real is fetched from mp3quran: fake-recitation.ts answers every
// request with a local silent file, so the reciter's server in each request shows whose recording was asked for.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/reciters.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })
const [first, second] = config.reciters
const folder = (server: string) => new URL(server).pathname

test('the Mushaf: the reciter by name next to «استمع», changed while reciting from the same ayah, kept on the device', async ({ page }) => {
  const mp3 = await fakeRecitation(page, { timing: () => Array.from({ length: 7 }, (_, i): [number, number, number] => [i + 1, 300 + i * 900, 1200 + i * 900]) })
  await page.goto('/quran/1?lang=ar')
  const select = page.locator('.listen-bar .reciter-select')
  await expect(select).toHaveValue(String(first.read))
  await expect(page.locator('.listen-bar .reciter-select option')).toHaveCount(config.reciters.length)
  await expect(page.locator('.listen-bar .listen-credit a')).toHaveText(`التلاوة بصوت ${first.name.ar} · موقع إم بي ثري قرآن`)
  await page.locator('.listen-bar .listen-main').click()
  await expect(page.locator('#a-2.is-reciting')).toBeVisible({ timeout: 10_000 })
  expect(mp3.some((u) => u.includes(folder(first.server)))).toBe(true)

  await select.selectOption(String(second.read))
  await expect(page.locator('.listen-bar .listen-credit a')).toHaveText(`التلاوة بصوت ${second.name.ar} · موقع إم بي ثري قرآن`)
  await expect.poll(() => mp3.some((u) => u.includes(`${folder(second.server)}001.mp3`))).toBe(true)
  // It goes on (from the ayah that was being recited, not from the start of the sura).
  await expect(page.locator('.listen-bar .listen-main')).toHaveText('إيقاف مؤقت')
  await expect(page.locator('#a-1.is-reciting')).toHaveCount(0)
  await page.locator('.listen-bar .listen-stop').click()

  await page.reload()
  await expect(page.locator('.listen-bar .reciter-select')).toHaveValue(String(second.read))
})

test('the name in the ayah sheet, the answer card and the settings; English names in English', async ({ page }) => {
  await fakeRecitation(page)
  await page.route('**/api/ask', (r) => r.fulfill({ json: create }))
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  await page.goto('/quran/51/56?lang=ar')
  const sheet = page.locator('dialog.sheet[open]')
  await sheet.locator('.frame-listen .listen-main').click()
  await expect(sheet.locator('.listen-credit a')).toHaveText(`التلاوة بصوت ${first.name.ar} · موقع إم بي ثري قرآن`)
  await sheet.locator('.listen-stop').click()
  await page.keyboard.press('Escape')

  await page.goto('/?lang=ar')
  await page.locator('#q').fill('لماذا خلق الله الإنسان؟')
  await page.locator('.composer button.send').click()
  const card = page.locator('.turn').last().locator('article.card')
  await card.locator('.frame-listen .listen-main').click()
  await expect(card.locator('.listen-credit a, ~ .listen-notes .listen-credit a').first()).toBeVisible()
  await expect(page.locator('.turn').last().locator('.listen-credit a')).toHaveText(`التلاوة بصوت ${first.name.ar} · موقع إم بي ثري قرآن`)
  await page.locator('.turn').last().locator('.listen-stop').click()

  await page.goto('/quran/1?lang=en')
  await expect(page.locator('.listen-bar .listen-credit a')).toHaveText(`Recited by ${first.name.en} · mp3quran.net`)
  await expect(page.locator('.listen-bar .reciter-select option').first()).toHaveText(first.name.en!)

  await page.goto('/?lang=ar')
  await page.locator('.topbar-actions button').last().click()
  const settings = page.locator('dialog.sheet[open]')
  await expect(settings.getByLabel('القارئ')).toHaveValue(String(first.read))
})
