import type { Page } from '@playwright/test'

/** The first-time tip of the answer's sources (V2 c20) shows once per device and dims the page until «فهمت». Tests
 *  that are not about it start as a device that has seen it (e2e/v2-answer.spec.ts tests the tip itself). */
export async function noTip(page: Page) {
  await page.addInitScript(() => {
    try {
      const key = 'muslim.sources.v1'
      const s = JSON.parse(localStorage.getItem(key) ?? '{}')
      if (!s.tipSeen) localStorage.setItem(key, JSON.stringify({ ...s, tipSeen: true }))
    } catch {}
  })
}
