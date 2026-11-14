import { expect, test } from '@playwright/test'

// The queue's close-and-reopen check on the real server (add-on 0071-add4 §5): run with LIVE_QUEUE=1 during the night's
// load test (eval/queue-load.mjs), so the question waits its turn on v11. A preview proxied to v11 only:
//   LIVE_QUEUE=1 Q='…' BASE_URL=http://localhost:8831 npx playwright test v2-0071-queue-live --project=mobile
// The question (Q) must need the model and not be in v11's cache; the test asks it, sees it in review, closes the app,
// opens it again and waits for its answer by the id kept on the device.
test.skip(!process.env.LIVE_QUEUE || !process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'the night’s live check, on a preview proxied to v11')
test.use({ serviceWorkers: 'block' })

test('closed while in review on the real queue: opened again, its answer comes by its id', async ({ context, page }) => {
  test.setTimeout(20 * 60_000)
  const q = process.env.Q ?? 'ما الحكمة من الصيام كما يبينها القرآن؟'
  await page.goto('/?lang=ar&theme=light')
  await page.locator('#q:visible').fill(q)
  await page.locator('button.send:visible').click()
  const line = page.locator('.turn').last().locator('.loading')
  await expect(line).toHaveText('نراجع النصوص المطابقة…', { timeout: 60_000 })
  const kept = JSON.parse((await page.evaluate(() => localStorage.getItem('ask.pending'))) ?? '[]') as { id: string; q: string }[]
  expect(kept.map((x) => x.q)).toEqual([q])
  console.log(`in review: ${kept[0].id} at ${new Date().toISOString()}`)
  await page.close()
  await new Promise((ok) => setTimeout(ok, 10_000))
  const again = await context.newPage()
  await again.goto('/?lang=ar&theme=light')
  const back = again.locator('.turn').last()
  await expect(back).toContainText(q)
  await expect(back.locator('article.card')).toBeVisible({ timeout: 18 * 60_000 })
  console.log(`answered after reopening at ${new Date().toISOString()}: ${await back.locator('article.card').getAttribute('class')}`)
  expect(await again.evaluate(() => localStorage.getItem('ask.pending'))).toBeNull()
})
