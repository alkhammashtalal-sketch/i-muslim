import { expect, test } from '@playwright/test'
import split from '../../data/adhkar-split.json' with { type: 'json' }
import { openFolds } from './fold'

// The adhkar after reply 0031-add16 §2, on a preview of next. Never against the live link:
//   BASE_URL=http://localhost:8832 npx playwright test e2e/v2-add16-adhkar.spec.ts --project=mobile
// Each card outside the two lists carries HadeethEnc's own title above the text; a hadith with more than one «…» pair shows no highlight
// until the coordinator's review, and every part once reviewed (3008: the dhikr cut by «قال الراوي», reviewed in reply
// 0031-add17 §1); a hadith with one pair keeps its highlight. After the review 10947 shows both parts and 10948 none.
test.skip(!process.env.BASE_URL || /i-muslim\.alkhammashtalal\.workers\.dev/.test(process.env.BASE_URL), 'only on a preview (BASE_URL), never the live link')
test.use({ serviceWorkers: 'block' })

const plain = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()
type Item = { id: string; title: string; text: string; highlights: string[]; translation?: { lang: string; title: string | null } }

// The two lists (0048-add1 §ب, reviewed in add4 أ): these open «أذكار المساء», where 3008 shows its evening parts. In the
// two lists the words to say come first in a box and no HadeethEnc title is shown (0049 د: in the morning, 3008's
// names the evening); the other sections keep each hadith under its title, verbatim.
test('Arabic: 3008 with its evening parts and no title; 66086 keeps its highlight; every title verbatim in «الصلاة»', async ({ page }) => {
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/301?lang=ar'))
  await page.goto('/today/adhkar?lang=ar&part=evening')
  await openFolds(page)
  const { items } = (await (await api).json()) as { items: Item[] }
  const byId = Object.fromEntries(items.map((x) => [x.id, x]))

  const c3008 = page.locator('[data-hadith="3008"]')
  await expect(c3008).toBeVisible()
  await expect(c3008.locator('h2.tool-title')).toHaveCount(0)
  // The box names the card for screen readers, and sits above the text.
  await expect(c3008).toHaveAttribute('aria-labelledby', 'adhkar-3008')
  await expect(page.locator('#adhkar-3008')).toHaveClass(/dhikr-box/)
  const [bb, xb] = await Promise.all([page.locator('#adhkar-3008').boundingBox(), c3008.locator('.tool-text').boundingBox()])
  expect(bb!.y + bb!.height).toBeLessThanOrEqual(xb!.y)
  // Three «…» pairs, reviewed (add17 §1): the server sends all three; the evening list shows its own two («أمسينا…»).
  expect(byId['3008'].highlights).toHaveLength(3)
  await expect(c3008.locator('mark')).toHaveCount(2)
  expect(plain((await c3008.locator('.tool-text p').textContent())!)).toBe(plain(byId['3008'].text))

  // One «…» pair: the highlight stays, cut from the text.
  const c66086 = page.locator('[data-hadith="66086"]')
  await expect(c66086.locator('mark')).toHaveCount(1)
  expect(plain((await c66086.locator('mark').textContent())!)).toBe('أعوذ بكلمات الله التامات من شر ما خلق')

  // Every card of the list: no title, and its marks the evening's own share of the API's (all or none).
  for (const it of items) {
    const card = page.locator(`[data-hadith="${it.id}"]`)
    if (!(await card.count())) continue // a morning-only dhikr (5508)
    await expect(card.locator('h2.tool-title')).toHaveCount(0)
    const seg = split.items.find((x) => x.id === it.id)?.segments as { evening?: number[] } | undefined
    const own = it.highlights.length ? (seg?.evening ?? []).length : 0
    await expect(card.locator('mark'), it.id).toHaveCount(own)
  }

  // Another section: each hadith under HadeethEnc's title, verbatim, naming its card.
  const prayer = page.waitForResponse((r) => r.url().includes('/api/adhkar/465?lang=ar'))
  await page.locator('.tool-chip', { hasText: 'الصلاة' }).click()
  const p = (await (await prayer).json()) as { items: Item[] }
  for (const it of p.items.filter((x) => x.title)) {
    const t = page.locator(`[data-hadith="${it.id}"] h2.tool-title`)
    await expect(t).toHaveText(it.title)
    await expect(t).toHaveAttribute('lang', 'ar')
    await expect(page.locator(`[data-hadith="${it.id}"]`)).toHaveAttribute('aria-labelledby', `adhkar-${it.id}`)
  }
})

test('English: in «الصلاة» the translation row’s title, or the Arabic title marked Arabic where the encyclopedia has none', async ({ page }) => {
  await page.goto('/today/adhkar?lang=en&part=evening')
  await openFolds(page)
  await expect(page.locator('[data-hadith="3008"] h2.tool-title')).toHaveCount(0)
  await expect(page.locator('[data-hadith="3008"] mark')).toHaveCount(2)
  await expect(page.locator('[data-hadith="66086"] mark')).toHaveCount(1)
  const api = page.waitForResponse((r) => r.url().includes('/api/adhkar/465?lang=en'))
  await page.locator('.tool-chip', { hasText: 'Prayer' }).click()
  const { items } = (await (await api).json()) as { items: Item[] }
  for (const it of items) {
    const t = page.locator(`[data-hadith="${it.id}"] h2.tool-title`)
    if (it.translation?.title) {
      await expect(t).toHaveText(it.translation.title)
      await expect(t).toHaveAttribute('lang', it.translation.lang)
    } else if (it.title) {
      await expect(t).toHaveText(it.title)
      await expect(t).toHaveAttribute('lang', 'ar')
    }
  }
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
