import { expect, test } from '@playwright/test'

// The adhkar after reply 0031-add16 §2, on a preview of next. Never against the live link:
//   BASE_URL=http://localhost:8832 npx playwright test e2e/v2-add16-adhkar.spec.ts --project=mobile
// Each card carries HadeethEnc's own title above the text; a hadith with more than one «…» pair (3008: the dhikr cut
// by «قال الراوي») shows no highlight until the coordinator's review; a hadith with one pair keeps its highlight.
test.skip(!process.env.BASE_URL || /i-muslim\.alkhammashtalal\.workers\.dev/.test(process.env.BASE_URL), 'only on a preview (BASE_URL), never the live link')
test.use({ serviceWorkers: 'block' })

const plain = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()
type Item = { id: string; title: string; text: string; highlights: string[]; translation?: { lang: string; title: string | null } }

test('Arabic: 3008 under its title with no highlight; 66086 keeps its highlight; every title is the encyclopedia’s', async ({ page }) => {
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/301?lang=ar'))
  await page.goto('/today/adhkar?lang=ar')
  const { items } = (await (await api).json()) as { items: Item[] }
  const byId = Object.fromEntries(items.map((x) => [x.id, x]))

  const c3008 = page.locator('[data-hadith="3008"]')
  await expect(c3008).toBeVisible()
  const t3008 = c3008.locator('h2.tool-title')
  await expect(t3008).toHaveAttribute('lang', 'ar')
  await expect(t3008).toHaveText(byId['3008'].title)
  expect(plain(byId['3008'].title)).toContain('أمسينا وأمسى الملك لله')
  // The title sits above the text, and names the card for screen readers.
  const [tb, xb] = await Promise.all([t3008.boundingBox(), c3008.locator('.tool-text').boundingBox()])
  expect(tb!.y + tb!.height).toBeLessThanOrEqual(xb!.y)
  await expect(c3008).toHaveAttribute('aria-labelledby', 'adhkar-3008')
  // Three «…» pairs, not reviewed: no highlight at all, the whole text as stored.
  expect(byId['3008'].highlights).toEqual([])
  await expect(c3008.locator('mark')).toHaveCount(0)
  expect(plain((await c3008.locator('.tool-text p').textContent())!)).toBe(plain(byId['3008'].text))

  // One «…» pair: the highlight stays, cut from the text.
  const c66086 = page.locator('[data-hadith="66086"]')
  await expect(c66086.locator('mark')).toHaveCount(1)
  expect(plain((await c66086.locator('mark').textContent())!)).toBe('أعوذ بكلمات الله التامات من شر ما خلق')
  await expect(c66086.locator('h2.tool-title')).toHaveText(byId['66086'].title)

  // Every card of the section: its title verbatim, and no highlight in a hadith with more than one «…» pair.
  for (const it of items) {
    const card = page.locator(`[data-hadith="${it.id}"]`)
    await expect(card.locator('h2.tool-title')).toHaveText(it.title)
    const pairs = (it.text.match(/«/g) ?? []).length
    if (pairs > 1) await expect(card.locator('mark'), it.id).toHaveCount(0)
  }
})

test('English: the translation row’s title, or the Arabic title marked Arabic where the encyclopedia has none', async ({ page }) => {
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/301?lang=en'))
  await page.goto('/today/adhkar?lang=en')
  const { items } = (await (await api).json()) as { items: Item[] }
  for (const it of items) {
    const t = page.locator(`[data-hadith="${it.id}"] h2.tool-title`)
    if (it.translation?.title) {
      await expect(t).toHaveText(it.translation.title)
      await expect(t).toHaveAttribute('lang', it.translation.lang)
    } else {
      await expect(t).toHaveText(it.title)
      await expect(t).toHaveAttribute('lang', 'ar')
    }
  }
  await expect(page.locator('[data-hadith="3008"] h2.tool-title')).toContainText('evening')
  await expect(page.locator('[data-hadith="3008"] mark')).toHaveCount(0)
  await expect(page.locator('[data-hadith="66086"] mark')).toHaveCount(1)
})
