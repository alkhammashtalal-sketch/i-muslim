import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import arkan from './fixtures/answer-hadith-arkan.json' with { type: 'json' }
import long from './fixtures/answer-hadith-long.json' with { type: 'json' }
import grade from './fixtures/grade-tabassum.json' with { type: 'json' }
import { ANSWER } from '../src/v2/answer/strings'
import { HADITH } from '../src/v2/hadith/strings'

// Reply 0048: a hadith in an answer, and the answer to «هل حديث كذا صحيح؟», on a preview of next (never the live link).
// The answers are next's own (out/v2-shots/0048/answers, HADITH_RETRIEVAL on for those requests only), served here by
// a route; the hadith's translation and explanation come from next's D1 through GET /api/hadith/:id.
//   cd web && BASE_URL=http://localhost:8797 npx playwright test e2e/v2-0048-hadith.spec.ts --project=mobile --workers=2
// SHOTS=dir saves the cards there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS

async function ask(page: Page, body: unknown, lang = 'ar', q = 'ما أركان الإسلام؟') {
  await page.route('**/api/ask', (r) => r.fulfill({ json: body }))
  await page.goto(`/?lang=${lang}`)
  await page.locator('#q').fill(q)
  await page.locator('button.send').click()
}
const shot = async (page: Page, name: string, el: ReturnType<Page['locator']>) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await el.screenshot({ path: path.join(SHOTS, `${name}.png`), animations: 'disabled' })
}

test('the hadith in an answer: its text as stored, its grade as a badge, its takhrij, its page; no «بسّط لي» on it', async ({ page }) => {
  await ask(page, arkan)
  const hadith = arkan.quotes.find((q) => q.kind === 'hadith')!
  const section = page.locator('.v2-quote', { has: page.locator(`[data-hadith="${hadith.hadith!.id}"]`) })
  await expect(section.locator('.sacred')).toHaveText(hadith.text)
  const box = section.locator('.hd-ans')
  await expect(box.locator('.grade-badge .grade-text')).toHaveText(hadith.grade!)
  // The takhrij once: under the text as its reference (rule 1), not again in the box.
  await expect(section.locator('.quote-meta .ref')).toHaveText(hadith.hadith!.attribution!)
  await expect(box.locator('.hd-ans-attr')).toHaveCount(0)
  await expect(page.locator('.v2-ayat-seg [role=tab]').first()).toHaveText(`${HADITH.ar.hadith} · ${hadith.ref}`)
  // HadeethEnc's explanation, as stored, on a press (Arabic content: the Arabic row's).
  await box.getByRole('button', { name: HADITH.ar.explanation }).click()
  await expect(box.locator('.hd-ans-ex-text')).not.toBeEmpty()
  // No generated explanation on a hadith (reply 0048), and the small grade line is not repeated above the frame.
  await expect(section.locator('.explain-btn')).toHaveCount(0)
  await expect(section.locator(':scope > .small')).toHaveCount(0)
  await shot(page, 'answer-hadith-ar', page.locator('article.card').last())
  // The source order: the hadith before the creed book.
  const kinds = await page.locator('.v2-quote').evaluateAll((els) => els.map((e) => (e.querySelector('[data-hadith]') ? 'hadith' : 'other')))
  expect(kinds[0]).toBe('hadith')
  await box.getByRole('link', { name: ANSWER.ar.hadithPage }).click()
  await expect(page).toHaveURL(new RegExp(`/hadith/${hadith.hadith!.id}`))
})

test('English: HadeethEnc\'s English translation under the Arabic text, and its grade beside the Arabic one', async ({ page }) => {
  await ask(page, arkan, 'en', 'What are the pillars of Islam?')
  const box = page.locator('.hd-ans').first()
  await expect(box.locator('.translation')).toHaveAttribute('lang', 'en')
  await expect(box.locator('.translation')).not.toBeEmpty()
  await expect(page.locator('.v2-quote .sacred').first()).toHaveAttribute('lang', 'ar')
  await shot(page, 'answer-hadith-en', page.locator('article.card').last())
})

test('a long hadith folds under «النص كاملًا», whole one press away', async ({ page }) => {
  await ask(page, long)
  const text = page.locator('.hd-ans-text')
  await expect(text).toHaveClass(/is-folded/)
  await expect(text).toHaveText(long.quotes[0].text) // the whole text is in the page, folded by its height only
  const more = page.locator('.hd-ans-more')
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await more.click()
  await expect(text).not.toHaveClass(/is-folded/)
  await expect(more).toHaveAttribute('aria-expanded', 'true')
})

test('«هل حديث كذا صحيح؟»: the fixed line, the hadith as stored, its badge and takhrij, its page here and on HadeethEnc', async ({ page }) => {
  await ask(page, grade, 'ar', 'هل حديث "تبسمك في وجه أخيك صدقة" صحيح؟')
  const card = page.getByTestId('grade-card')
  await expect(card.locator('.hd-grade-line')).toHaveText('درجته في موسوعة الأحاديث النبوية: حسن')
  await expect(card.locator('.hd-ans-text')).toHaveText(grade.hadith!.text)
  await expect(card.locator('.grade-badge .grade-text')).toHaveText('حسن')
  await expect(card.getByRole('link', { name: ANSWER.ar.openHadith })).toHaveAttribute('href', grade.hadith!.url)
  await expect(card.getByRole('link', { name: ANSWER.ar.openHadith })).toHaveAttribute('rel', /noopener/)
  await expect(card.getByRole('link', { name: ANSWER.ar.hadithPage })).toHaveAttribute('href', `/hadith/${grade.hadith!.id}`)
  await shot(page, 'grade-ar', card)
})

test('at 135% text, 375 wide: nothing in the hadith box wider than the card, its controls 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '135%')))
  await ask(page, arkan)
  const box = page.locator('.hd-ans').first()
  await box.waitFor()
  const bad = await box.evaluate((root) => {
    const card = root.closest('article')!.getBoundingClientRect()
    const out: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect()
      if (r.width && (r.left < card.left - 1 || r.right > card.right + 1)) out.push(`${el.className} ${Math.round(r.left)}–${Math.round(r.right)}`)
    }
    for (const b of root.querySelectorAll<HTMLElement>('a, button')) if (b.getBoundingClientRect().height < 44) out.push(`small ${b.className}`)
    return out
  })
  expect(bad).toEqual([])
})
