import { expect, type Page } from '@playwright/test'

/** The adhkar's two lists fold each hadith under its dhikr (0049-add2): open them all, as a reader would one by one. */
export async function openFolds(page: Page) {
  await expect(page.locator('main .tool-card').first()).toBeVisible()
  const closed = page.locator('.dhikr-more[aria-expanded="false"]')
  for (let n = await closed.count(); n > 0; n = await closed.count()) await closed.first().click()
}
