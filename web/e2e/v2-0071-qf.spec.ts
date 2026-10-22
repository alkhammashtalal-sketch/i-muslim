import { expect, test } from '@playwright/test'

// Ibn Kathir abridged in English from Quran Foundation (add-on 0071-add14; worker/src/qf.ts): a choice of the ayah's
// panel in the English interface only, offered once the server answers (v11 has the keys; elsewhere 404, no choice),
// its text as given with «Quran Foundation» on its source line. The QF route is stubbed here.
//   BASE_URL=http://localhost:8831 npx playwright test v2-0071-qf --project=mobile
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const BODY = {
  id: 'quran:1:2',
  covers: ['1:2'],
  blocks: [
    { type: 'h', text: 'The Meaning of Al-Hamd' },
    { type: 'p', text: 'Abu Jafar bin Jarir said, "The meaning of' },
    { type: 'p', text: 'الْحَمْدُ للَّهِ' },
  ],
  resource: { id: 169, name: 'Ibn Kathir (Abridged)' },
  source: { name: 'Quran Foundation', url: 'https://quran.foundation' },
}

async function openAyah(page: import('@playwright/test').Page, lang: string, qf: 'ok' | 'none') {
  const asked: string[] = []
  await page.route('**/api/qf/katheer-en/**', (r) => {
    asked.push(r.request().url())
    return qf === 'ok' ? r.fulfill({ json: BODY }) : r.fulfill({ status: 404, json: { ok: false, error: 'not_configured' } })
  })
  await page.goto(`/quran/1/2?lang=${lang}&theme=light`)
  const sheet = page.locator('dialog[open]')
  await expect(sheet.locator('#muyassar-text')).toBeVisible({ timeout: 15_000 })
  return { sheet, asked }
}

test('English: «Ibn Kathir (English)» is a choice; its headings and paragraphs as given, «Quran Foundation» on its line', async ({ page }) => {
  const { sheet } = await openAyah(page, 'en', 'ok')
  const chip = sheet.getByRole('button', { name: 'Ibn Kathir (English)' })
  await expect(chip).toBeVisible()
  await chip.click()
  const text = sheet.locator('#katheer-en-text')
  await expect(text).toHaveAttribute('lang', 'en')
  await expect(text.locator('h5')).toHaveText('The Meaning of Al-Hamd')
  await expect(text.locator('p').nth(1)).toHaveText('الْحَمْدُ للَّهِ')
  await expect(text.locator('p').nth(1)).toHaveAttribute('dir', 'auto')
  await expect(sheet.locator('.rd-source', { hasText: 'Quran Foundation' })).toContainText('Ibn Kathir (Abridged)')
  await expect(sheet.getByRole('button', { name: /Read more|Show more/ }).last()).toBeVisible()
})

test('Arabic: no English choice, and nothing asked of Quran Foundation', async ({ page }) => {
  const { sheet, asked } = await openAyah(page, 'ar', 'ok')
  await page.waitForTimeout(800)
  await expect(sheet.getByRole('button', { name: /English|بالإنجليزية/ })).toHaveCount(0)
  expect(asked).toEqual([])
})

test('a server without the keys (404): no English choice', async ({ page }) => {
  const { sheet } = await openAyah(page, 'en', 'none')
  await page.waitForTimeout(800)
  await expect(sheet.getByRole('button', { name: 'Ibn Kathir (English)' })).toHaveCount(0)
})
