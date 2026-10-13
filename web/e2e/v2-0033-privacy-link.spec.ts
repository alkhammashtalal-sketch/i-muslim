import { expect, test } from '@playwright/test'
import { STRINGS } from '../src/i18n'
import { SITE_LINKS } from '../src/v2/site/strings'

// «سياسة الخصوصية» in the settings (reply 0033 §ج; Apple guideline 5.1.1): a plain link to the site's page in the
// interface language (Arabic, or English for every other language), opened outside the app with no opener and no
// referrer. On a local preview only; the site is stubbed, so nothing is fetched from it.
//   cd web && BASE_URL=http://localhost:8852 npx playwright test e2e/v2-0033-privacy-link.spec.ts --project=mobile
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SITE = 'https://i-muslim-site.alkhammashtalal.workers.dev'
const CASES = [
  { lang: 'ar', page: `${SITE}/privacy` },
  { lang: 'en', page: `${SITE}/en/privacy` },
  { lang: 'fr', page: `${SITE}/en/privacy` },
  { lang: 'ur', page: `${SITE}/en/privacy` },
] as const

for (const c of CASES) {
  test(`${c.lang}: the settings open ${c.page.replace(SITE, '')} in a new browsing context`, async ({ page, context }) => {
    const opened: string[] = []
    await context.route(`${SITE}/**`, (r) => {
      opened.push(r.request().url())
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>stub</title>' })
    })
    await page.goto(`/?lang=${c.lang}&theme=light`)
    await page.getByRole('button', { name: STRINGS[c.lang].settings }).click()
    const link = page.locator('dialog[open]').getByRole('link', { name: SITE_LINKS[c.lang].privacy })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', c.page)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const [popup] = await Promise.all([context.waitForEvent('page'), link.click()])
    await popup.waitForLoadState()
    expect(popup.url()).toBe(c.page)
    expect(opened).toEqual([c.page])
    // No opener and no referrer reach the site.
    expect(await popup.evaluate(() => [window.opener, document.referrer])).toEqual([null, ''])
  })
}
