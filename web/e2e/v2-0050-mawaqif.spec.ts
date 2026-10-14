import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import data from '../../data/mawaqif.json' with { type: 'json' }
import { MAWAQIF } from '../src/v2/daily/mawaqif/strings-mawaqif'

// «أذكار المواقف» (reply 0050) on a preview of next (never the live link), its table reviewed (0050-add1); the tests'
// preview flag (globalThis.__mawaqifPreview) changes nothing now, and one test goes without it. The links imuslim://mawaqif/<situation>?step=<stage> open /mawaqif/… (NativeDevice).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0050-mawaqif.spec.ts --project=mobile --workers=2
// SHOTS=dir saves the three screens in Arabic and English, and the board beside them.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })
const SHOTS = process.env.SHOTS
type Item = { hadith: string; segments: string[]; intro: Record<string, string> }
type Sit = { id: string; name: Record<string, string>; proposed?: boolean; stages: { id: string | null; name?: Record<string, string>; items: Item[] }[] }
const SITS = (data as unknown as { situations: Sit[] }).situations
const join = (segs: string[]) => segs.reduce((acc, x) => (acc ? `${acc}${/[،,.؛:]$/.test(acc) ? ' ' : '، '}${x}` : x), '')
const preview = (page: Page) => page.addInitScript(() => ((globalThis as { __mawaqifPreview?: boolean }).__mawaqifPreview = true))
const shoot = async (page: Page, name: string) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, name) })
}

test('reviewed (0050-add1): the card under «يومك» and the grid with no test flag', async ({ page }) => {
  await page.goto('/?lang=ar')
  await expect(page.getByTestId('home-mawaqif')).toBeVisible()
  await page.goto('/mawaqif?lang=ar')
  await expect(page.locator('.mq-tile')).toHaveCount(SITS.length)
  // An unknown situation goes home.
  await page.goto('/mawaqif/nothing?lang=ar')
  await expect(page).toHaveURL(/\/(\?lang=ar)?$/)
})

test('the grid: «افتحها تلقائيًا» first, then the situations in the table\'s order, the home card opens it', async ({ page }) => {
  await preview(page)
  await page.goto('/?lang=ar')
  await page.getByTestId('home-mawaqif').click()
  await expect(page).toHaveURL(/\/mawaqif(\?|$)/)
  await expect(page.locator('.dt-head h1')).toHaveText(MAWAQIF.ar.title)
  await expect(page.getByTestId('mawaqif-auto')).toContainText(MAWAQIF.ar.autoTitle)
  const tiles = page.locator('.mq-tile')
  await expect(tiles).toHaveCount(SITS.length)
  expect(await tiles.allTextContents()).toEqual(SITS.map((s) => s.name.ar))
  await shoot(page, 'grid-ar.png')
})

test('a situation opened whole: the stages, our line, the words verbatim, «التالي» to the next stage, the whole hadith folded', async ({ page }) => {
  await preview(page)
  const travel = SITS.find((s) => s.id === 'travel')!
  const dua = travel.stages.find((s) => s.id === 'dua')!.items[0]
  await page.goto('/mawaqif/travel?step=dua&lang=ar')
  await expect(page.getByTestId('stage-dua')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.mq-intro')).toHaveText(dua.intro.ar)
  await expect(page.getByTestId('mq-words')).toHaveText(`«${join(dua.segments)}»`)
  await expect(page.locator('.mq-card')).toHaveAttribute('data-hadith', '6003')
  await shoot(page, 'travel-dua-ar.png')
  await page.getByTestId('mq-next').click()
  await expect(page.getByTestId('stage-road')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/step=road/)
  // The whole hadith, loaded when opened, the box's words in it.
  await page.goto('/mawaqif/travel?step=dua&lang=ar')
  await page.locator('.mq-full summary').click()
  await expect(page.locator('.mq-full-text')).toContainText('سَفَر')
})

test('every situation\'s every dhikr: its words as in the table, in its form', async ({ page }) => {
  await preview(page)
  for (const s of SITS) {
    await page.goto(`/mawaqif/${s.id}?lang=ar`)
    const items = s.stages.flatMap((st) => st.items)
    for (let i = 0; i < items.length; i++) {
      const it = items[i] as Item & { kind?: string; quran?: unknown; asides?: boolean[] }
      // The words to say in the gold box; a hadith's own wording of what to do as a quote under «بلفظ الحديث»
      // (0050-add1 أ); the istikhara with the narrator's words in place (ج); a recitation from the Mushaf.
      if (it.kind === 'quran') await expect(page.getByTestId('mq-quran'), `${s.id} ${i}`).toBeVisible()
      else if (it.kind === 'action') {
        await expect(page.getByTestId('mq-wording').locator('blockquote'), `${s.id} ${i}`).toHaveText(`«${join(it.segments)}»`)
        await expect(page.locator('.mq-box')).toHaveCount(0)
        if (it.quran) await expect(page.getByTestId('mq-quran')).toBeVisible()
      } else if (it.asides) {
        await expect(page.getByTestId('mq-words'), `${s.id} ${i}`).toHaveText(`«${it.segments.join(' ')}»`)
        await expect(page.locator('.mq-aside')).toHaveCount(it.asides.filter(Boolean).length)
      } else await expect(page.getByTestId('mq-words'), `${s.id} ${i}`).toHaveText(`«${join(it.segments)}»`)
      if (i < items.length - 1) await page.getByTestId('mq-next').click()
    }
  }
})

test('in English: our line and the names in English, the words in Arabic; and the page of the three ways', async ({ page }) => {
  await preview(page)
  await page.goto('/mawaqif/sleep?lang=en')
  const first = SITS.find((s) => s.id === 'sleep')!.stages[0].items[0]
  await expect(page.locator('.dt-head h1')).toHaveText('Sleep')
  await expect(page.locator('.mq-intro')).toHaveText(first.intro.en)
  await expect(page.getByTestId('mq-words')).toHaveAttribute('lang', 'ar')
  await shoot(page, 'sleep-en.png')
  await page.goto('/mawaqif/auto?lang=ar')
  for (const w of ['voice', 'car', 'nfc']) await expect(page.getByTestId(`way-${w}`)).toBeVisible()
  await expect(page.getByTestId('way-voice')).toContainText('دعاء السفر في مسلم')
  await shoot(page, 'auto-ar.png')
  await page.goto('/mawaqif?lang=en')
  await shoot(page, 'grid-en.png')
})

test('the adhkar page\'s new sections: السفر، النوم والاستيقاظ، الخلاء، الطعام, in the form of 0049', async ({ page }) => {
  await preview(page)
  await page.goto('/today/adhkar?lang=ar&part=morning')
  for (const name of ['السفر', 'النوم والاستيقاظ', 'الخلاء', 'الطعام']) await expect(page.locator('.tool-chip', { hasText: name })).toHaveCount(1)
  await page.locator('.tool-chip', { hasText: 'الخلاء' }).click()
  const card = page.locator('main .tool-card').first()
  await expect(card.locator('.dhikr-intro')).toHaveText(SITS.find((s) => s.id === 'toilet')!.stages[0].items[0].intro.ar)
  await expect(card.locator('.dhikr-box')).toContainText('الخُبُثِ')
  // The hadith folded under it, loaded when opened (0049-add2).
  await card.locator('.dhikr-more').click()
  await expect(card.locator('.dhikr-fold .tool-text')).toBeVisible()
  await shoot(page, 'adhkar-toilet-ar.png')
})
