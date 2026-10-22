import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

// Reply 0071 §5: Tafsir Ibn Kathir in the ayah's panel, a third choice beside al-Muyassar and al-Saʿdi, asked for only
// when chosen (its entries are long), its text as the server holds it (tafsir_books), with its source line.
// Needs a server with Ibn Kathir loaded (env v11): BASE_URL=https://i-muslim-v11.… npx playwright test e2e/v2-0071-katheer.spec.ts --project=mobile
test.use({ serviceWorkers: 'block' })
const SHOTS = path.resolve(import.meta.dirname, '../../out/shots/0071')

for (const [lang, chip, source] of [
  ['ar', 'ابن كثير', 'تفسير ابن كثير'],
  ['en', 'Ibn Kathir', 'Tafsir Ibn Kathir'],
] as const) {
  test(`${lang}: «${chip}» opens Ibn Kathir on 2:255, asked for only then`, async ({ page }) => {
    const asked: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('with=katheer')) asked.push(r.url())
    })
    await page.goto(`/quran/2/255?lang=${lang}`)
    const sheet = page.locator('dialog.sheet[open]')
    await expect(sheet.locator('.sacred')).toBeVisible()
    const chips = sheet.locator('.rd-chips .rd-chip')
    await expect(chips).toHaveCount(4)
    expect(asked).toEqual([])
    await chips.filter({ hasText: chip }).click()
    const text = sheet.locator('#katheer-text')
    await expect(text).toBeVisible()
    // The first words of his entry for Ayat al-Kursi, as the Ayat project's file holds them.
    await expect(text).toContainText('هذه آية الكرسي ولها شأن عظيم')
    await expect(sheet.locator('.rd-source', { hasText: source })).toBeVisible()
    expect(asked).toHaveLength(1)
    fs.mkdirSync(SHOTS, { recursive: true })
    await sheet.locator('.tafsir').screenshot({ path: path.join(SHOTS, `katheer-${lang}.png`) })
  })
}
