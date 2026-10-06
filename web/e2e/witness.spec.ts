import { expect, test, type Page } from '@playwright/test'
import kaaba from './fixtures/answer-kaaba.json' with { type: 'json' }
import flag from '../src/config/voice-mode.json' with { type: 'json' }
import { fakeRecitation } from './helpers/fake-recitation'

// Choosing between an answer's sources (command 20). The answer is the live one to «لماذا يعبد المسلمون الكعبة؟»
// (official case off-01: Quraysh 3, al-Baqara 144, al-Ma'ida 97; fixtures/answer-kaaba.json), given by the test.
//   BASE_URL=http://localhost:8787 npx playwright test e2e/witness.spec.ts --project=mobile

test.use({ serviceWorkers: 'block' })

async function ask(page: Page, lang = 'ar') {
  await page.route('**/api/ask', (r) => r.fulfill({ json: { ...kaaba, answer_lang: lang } }))
  await page.route('**/api/explain', (r) => r.fulfill({ status: 404, json: { error: 'not_found' } }))
  await page.goto(`/?lang=${lang}`)
  await page.locator('#q').fill('لماذا يعبد المسلمون الكعبة؟')
  await page.locator('.composer button.send').click()
  return page.locator('.turn').last().locator('article.card')
}

test('a bar of sources: one shown at a time, in the engine order, by click and by keyboard', async ({ page }) => {
  const card = await ask(page)
  const tabs = card.getByRole('tab')
  await expect(tabs).toHaveText(['قريش: ٣', 'البقرة: ١٤٤', 'المائدة: ٩٧'])
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  const panels = card.locator('[role=tabpanel]')
  await expect(panels).toHaveCount(3)
  await expect(card.locator('[role=tabpanel]:visible')).toHaveCount(1)
  await expect(card.locator('[role=tabpanel]:visible .sacred')).toContainText('فَلْيَعْبُدُوا')

  await tabs.nth(1).click()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(card.locator('[role=tabpanel]:visible .sacred')).toContainText('قَدْ نَرَىٰ')
  // Right to left: the left arrow goes to the next source.
  await tabs.nth(1).press('ArrowLeft')
  await expect(tabs.nth(2)).toBeFocused()
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
  await tabs.nth(2).press('Home')
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  const box = await tabs.nth(0).boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
})

test('from the second source: Tafsir al-Saʿdi on request, from D1, with its link; and the Mushaf', async ({ page }) => {
  const card = await ask(page)
  await card.getByRole('tab').nth(1).click()
  const panel = card.locator('[role=tabpanel]:visible')
  await expect(panel.locator('.ayah-extras .tafsir')).toHaveCount(0)
  const saadi = panel.getByRole('button', { name: 'تفسير السعدي' })
  await saadi.click()
  await expect(saadi).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.locator('.ayah-extras .tafsir-text')).not.toBeEmpty({ timeout: 15_000 })
  await expect(panel.locator('.ayah-extras .tafsir a')).toHaveAttribute('href', /quran\.ksu\.edu\.sa/)
  await panel.getByRole('button', { name: 'المعنى بالإنجليزية' }).click()
  await expect(panel.locator('.ayah-extras .translation')).toContainText('We have certainly seen the turning of your face')
  await expect(panel.getByRole('link', { name: 'افتحها في المصحف' })).toHaveAttribute('href', /\/quran\/2\/144/)
})

test('voice conversation reads the first source, then says how many others are on screen; no ayah text', async ({ page }) => {
  test.skip(flag.enabled, 'the old toggle is not shown once the full-screen mode is enabled')
  await fakeRecitation(page)
  await page.addInitScript(() => {
    const w = window as unknown as { __said: string[] }
    w.__said = []
    const voice = { name: 'Majed', lang: 'ar-SA', localService: true, default: true, voiceURI: 'm' }
    class U {
      text: string
      voice: unknown = null
      lang = ''
      onend: (() => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      constructor(t: string) {
        this.text = t
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak(u: U) {
          if (u.text.trim()) w.__said.push(u.text)
          setTimeout(() => u.onend?.(), 100)
        },
        cancel() {},
        getVoices: () => [voice],
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
    })
  })
  await page.goto('/?lang=ar')
  await page.locator('.voice-toggle').click()
  const card = await ask(page)
  await expect(card).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __said: string[] }).__said.join(' ')), { timeout: 20_000 }).toContain('ولديك شاهدان آخران على الشاشة.')
  const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said.join(' '))
  for (const q of kaaba.quotes) expect(said).not.toContain(q.text.split(' ').slice(0, 3).join(' '))
  await page.locator('.voice-toggle').click()
})
