import { expect, test, type Page, type Route } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }

// «اسأل»'s queue seen from the app (add-ons 0071-add3 §1 and 0071-add4; worker/src/queue.ts, web/src/api/client.ts).
// The server is stubbed here, so no question reaches the model: /api/ask answers «in review» with an id, and
// /api/ask/job/:id says «in review» until the test lets the answer through (the fixture answer-kaaba.json).
//   - The two lines, each only while its work runs: «نبحث في المصادر الموثوقة…» while the request runs (the search is in
//     it), then «نراجع النصوص المطابقة…» once the server says the texts are in review; then the answer.
//   - Nothing about waiting: no place in line, no time, no «الضغط عالٍ», no button to try again.
//   - The app closed while its question is in review: opened again, the question and its line are back, and the answer
//     comes by the id.
//   - A poll that fails (no connection) is tried again in silence.
//   BASE_URL=http://localhost:8831 npx playwright test v2-0071-queue --project=mobile
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const JOB = '0f0f0f0f-1111-4222-8333-444455556666'
const Q = 'لماذا يعبد المسلمون الكعبة؟'

/** The stub: the request held `askMs`, then «in review»; the job «in review» until `release()`, then the answer. */
async function stub(page: Page, o: { askMs?: number; failPolls?: number } = {}) {
  const state = { released: false, polls: 0, failed: 0 }
  await page.route('**/api/ask', async (r: Route) => {
    await new Promise((ok) => setTimeout(ok, o.askMs ?? 1200))
    await r.fulfill({ json: { type: 'pending', id: JOB, stage: 'review' } })
  })
  await page.route(`**/api/ask/job/${JOB}*`, async (r: Route) => {
    state.polls++
    if (state.failed < (o.failPolls ?? 0)) {
      state.failed++
      return r.abort('internetdisconnected')
    }
    // A short wait, as the server's poll waits for the answer.
    await new Promise((ok) => setTimeout(ok, 300))
    await r.fulfill({ json: state.released ? { ...kaaba, answer_lang: 'ar' } : { type: 'pending', id: JOB, stage: 'review' } })
  })
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  return {
    state,
    release: () => {
      state.released = true
    },
  }
}

const WAITING_WORDS = /ترتيبك|ثانية|دقيقة|الضغط|أعد المحاولة|جرّب|position|seconds|minute|try again|retry/i

async function ask(page: Page) {
  await page.goto('/?lang=ar&theme=light')
  await page.locator('#q:visible').fill(Q)
  await page.locator('button.send:visible').click()
  return page.locator('.turn').last()
}

test('the two lines in order, each while its work runs, then the answer; nothing about waiting', async ({ page }) => {
  const s = await stub(page)
  const turn = await ask(page)
  const line = turn.locator('.loading[role=status]')
  await expect(line).toHaveText('نبحث في المصادر الموثوقة…')
  await expect(line).toHaveText('نراجع النصوص المطابقة…', { timeout: 5_000 })
  // It stays on the review line while the server says so (no timer moves it on).
  await page.waitForTimeout(2_500)
  await expect(line).toHaveText('نراجع النصوص المطابقة…')
  expect(await turn.innerText()).not.toMatch(WAITING_WORDS)
  await expect(turn.getByRole('button')).toHaveCount(0)
  s.release()
  await expect(turn.locator('article.card .v2-tbox').first()).toBeVisible({ timeout: 25_000 })
  await expect(line).toHaveCount(0)
  // Its id is no longer kept once the answer came.
  expect(await page.evaluate(() => localStorage.getItem('ask.pending'))).toBeNull()
})

test('the box stays free while a question is in review: another may be asked', async ({ page }) => {
  await stub(page, { askMs: 300 })
  await ask(page)
  await expect(page.locator('.turn').last().locator('.loading')).toHaveText('نراجع النصوص المطابقة…', { timeout: 5_000 })
  await expect(page.locator('#q:visible')).toBeEnabled()
})

test('closed while in review: opened again, the question and its line are back, and the answer comes by its id', async ({ context, page }) => {
  const s = await stub(page, { askMs: 300 })
  const turn = await ask(page)
  await expect(turn.locator('.loading')).toHaveText('نراجع النصوص المطابقة…', { timeout: 5_000 })
  const kept = JSON.parse((await page.evaluate(() => localStorage.getItem('ask.pending'))) ?? '[]') as { id: string; q: string }[]
  expect(kept.map((x) => [x.id, x.q])).toEqual([[JOB, Q]])
  await page.close()
  // The answer is made while the app is closed.
  s.release()
  const again = await context.newPage()
  await stub(again).then((t) => t.release())
  await again.goto('/?lang=ar&theme=light')
  const back = again.locator('.turn').last()
  await expect(back).toContainText(Q)
  await expect(back.locator('article.card .v2-tbox').first()).toBeVisible({ timeout: 25_000 })
  expect(await again.evaluate(() => localStorage.getItem('ask.pending'))).toBeNull()
})

test('a poll that fails (no connection) is tried again in silence, with no button', async ({ page }) => {
  const s = await stub(page, { askMs: 300, failPolls: 2 })
  const turn = await ask(page)
  await expect(turn.locator('.loading')).toHaveText('نراجع النصوص المطابقة…', { timeout: 5_000 })
  await expect.poll(() => s.state.failed, { timeout: 15_000 }).toBe(2)
  await expect(turn.locator('.loading')).toHaveText('نراجع النصوص المطابقة…')
  await expect(turn.getByRole('button')).toHaveCount(0)
  s.release()
  await expect(turn.locator('article.card .v2-tbox').first()).toBeVisible({ timeout: 30_000 })
})

test('English: the same two lines in the reader’s language', async ({ page }) => {
  await stub(page)
  await page.goto('/?lang=en&theme=light')
  await page.locator('#q:visible').fill('Why do Muslims face the Kaaba?')
  await page.locator('button.send:visible').click()
  const line = page.locator('.turn').last().locator('.loading')
  await expect(line).toHaveText('Searching the trusted sources…')
  await expect(line).toHaveText('Reviewing the matching texts…', { timeout: 5_000 })
})
