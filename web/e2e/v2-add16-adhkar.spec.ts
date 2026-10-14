import { expect, test } from '@playwright/test'
import split from '../../data/adhkar-split.json' with { type: 'json' }

// The adhkar after reply 0031-add16 §2, on a preview of next. Never against the live link:
//   BASE_URL=http://localhost:8832 npx playwright test e2e/v2-add16-adhkar.spec.ts --project=mobile
// Each card carries HadeethEnc's own title above the text; a hadith with more than one «…» pair shows no highlight
// until the coordinator's review, and every part once reviewed (3008: the dhikr cut by «قال الراوي», reviewed in reply
// 0031-add17 §1); a hadith with one pair keeps its highlight. After the review 10947 shows both parts and 10948 none.
test.skip(!process.env.BASE_URL || /i-muslim\.alkhammashtalal\.workers\.dev/.test(process.env.BASE_URL), 'only on a preview (BASE_URL), never the live link')
test.use({ serviceWorkers: 'block' })

const plain = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()
type Item = { id: string; title: string; text: string; highlights: string[]; translation?: { lang: string; title: string | null } }

// The two lists (0048-add1 §ب, reviewed in add4 أ): these open «أذكار المساء», where 3008 shows its evening parts.
test('Arabic: 3008 under its title with its evening parts; 66086 keeps its highlight; every title is the encyclopedia’s', async ({ page }) => {
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/301?lang=ar'))
  await page.goto('/today/adhkar?lang=ar&part=evening')
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
  // Three «…» pairs, reviewed (add17 §1): the server sends all three; the evening list shows its own two («أمسينا…»).
  expect(byId['3008'].highlights).toHaveLength(3)
  await expect(c3008.locator('mark')).toHaveCount(2)
  expect(plain((await c3008.locator('.tool-text p').textContent())!)).toBe(plain(byId['3008'].text))

  // One «…» pair: the highlight stays, cut from the text.
  const c66086 = page.locator('[data-hadith="66086"]')
  await expect(c66086.locator('mark')).toHaveCount(1)
  expect(plain((await c66086.locator('mark').textContent())!)).toBe('أعوذ بكلمات الله التامات من شر ما خلق')
  await expect(c66086.locator('h2.tool-title')).toHaveText(byId['66086'].title)

  // Every card of the list: its title verbatim, and its marks the evening's own share of the API's (all or none).
  for (const it of items) {
    const card = page.locator(`[data-hadith="${it.id}"]`)
    if (!(await card.count())) continue // a morning-only dhikr (5508)
    await expect(card.locator('h2.tool-title')).toHaveText(it.title)
    const seg = split.items.find((x) => x.id === it.id)?.segments as { evening?: number[] } | undefined
    const own = it.highlights.length ? (seg?.evening ?? []).length : 0
    await expect(card.locator('mark'), it.id).toHaveCount(own)
  }
})

test('English: the translation row’s title, or the Arabic title marked Arabic where the encyclopedia has none', async ({ page }) => {
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/301?lang=en'))
  await page.goto('/today/adhkar?lang=en&part=evening')
  const { items } = (await (await api).json()) as { items: Item[] }
  for (const it of items) {
    const t = page.locator(`[data-hadith="${it.id}"] h2.tool-title`)
    if (!(await t.count())) continue // not in the evening list
    if (it.translation?.title) {
      await expect(t).toHaveText(it.translation.title)
      await expect(t).toHaveAttribute('lang', it.translation.lang)
    } else {
      await expect(t).toHaveText(it.title)
      await expect(t).toHaveAttribute('lang', 'ar')
    }
  }
  await expect(page.locator('[data-hadith="3008"] h2.tool-title')).toContainText('evening')
  await expect(page.locator('[data-hadith="3008"] mark')).toHaveCount(2)
  await expect(page.locator('[data-hadith="66086"] mark')).toHaveCount(1)
})

test('Prayer adhkar after the review (add17 §1): 10947 both parts, the istighfar after the «…» included; 10948 none', async ({ page }) => {
  await page.goto('/today/adhkar?lang=ar')
  await expect(page.locator('.tool-chip')).toHaveCount(9) // «أذكار الصباح» and «أذكار المساء» in place of one (0048-add4)
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/465?lang=ar'))
  await page.locator('.tool-chip').nth(2).click()
  const { items } = (await (await api).json()) as { items: Item[] }
  const byId = Object.fromEntries(items.map((x) => [x.id, x]))
  for (const [id, marks] of [['10947', 2], ['10948', 0]] as const) {
    const card = page.locator(`[data-hadith="${id}"]`)
    await expect(card, id).toBeVisible()
    expect((byId[id].text.match(/«/g) ?? []).length, id).toBe(1)
    expect(byId[id].highlights, id).toHaveLength(marks)
    await expect(card.locator('mark'), id).toHaveCount(marks)
    expect(plain((await card.locator('.tool-text p').textContent())!)).toBe(plain(byId[id].text))
    await expect(card.locator('h2.tool-title')).toHaveText(byId[id].title)
  }
})
