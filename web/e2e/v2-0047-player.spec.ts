import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import config from '../src/config/recitation.json' with { type: 'json' }
import { PLAYER } from '../src/v2/reading/player-strings'
import { fakeRecitation } from './helpers/fake-recitation'

// «تُتلى الآن» (reply 0047 §4, board RepeatAfter) on a preview of next (never the live link): from the sura page,
// «خيارات التلاوة» and «تغيير القارئ» under «استمع»; in the sheet the reciter and «تغيير القارئ», the sura, the ayah
// being recited as stored, «الآية ٥ من ٨» over a bar, the previous and next ayah, and the four options: the repeat,
// the speed, what follows the sura, the sleep timer. Nothing real is fetched from mp3quran (fake-recitation.ts).
//   cd web && BASE_URL=http://localhost:8796 npx playwright test e2e/v2-0047-player.spec.ts --project=mobile --workers=2
// SHOTS=dir saves the sheet (ar, en, and Arabic at 135%) there.
test.skip(!process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never the live link')
test.use({ serviceWorkers: 'block' })

const SHOTS = process.env.SHOTS
const ar = PLAYER.ar
const en = PLAYER.en
const [first] = config.reciters
const qatami = config.reciters.find((r) => r.read === 86)!
// Ayah i of a sura from (i-1)·step to i·step milliseconds.
const steps = (n: number, step: number) => Array.from({ length: n }, (_, i): [number, number, number] => [i + 1, i * step, (i + 1) * step])
// The fake recording is 8 seconds of silence: ayat 1 and 2 three seconds each, the six others in the last two.
const SHORT8: [number, number, number][] = [[1, 0, 3000], [2, 3000, 6000], ...Array.from({ length: 6 }, (_, i): [number, number, number] => [i + 3, 6000 + i * 250, 6250 + i * 250])]
/** The playback rates set on any audio element, in order. */
const watchRates = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __rates: number[] }
    w.__rates = []
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate')!
    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
      configurable: true,
      get() {
        return d.get!.call(this)
      },
      set(v: number) {
        w.__rates.push(v)
        d.set!.call(this, v)
      },
    })
  })
const openPlayer = async (page: Page, label = ar.open) => {
  await page.locator('.listen-bar').getByRole('button', { name: label }).click()
  const sheet = page.getByTestId('now-playing')
  await expect(sheet).toBeVisible()
  return sheet
}

test('الشرح: «الآية ١ من ٨», the reciter and his line, the sura, the ayah as stored, next and previous', async ({ page }) => {
  await fakeRecitation(page, { timing: () => SHORT8 })
  await page.goto('/quran/94?lang=ar')
  const sura = await (await page.request.get('/api/sura/94')).json()
  const bar = page.locator('.listen-bar')
  await expect(bar.getByRole('button', { name: ar.open })).toBeVisible()
  await expect(bar.getByRole('button', { name: ar.changeReciter })).toBeVisible()
  // Idle: the sheet's own title, the first ayah, «الآية ١ من ٨».
  let sheet = await openPlayer(page)
  await expect(page.locator('dialog.sheet[open] h2, dialog.sheet[open] .sheet-title').first()).toHaveText(ar.title)
  await expect(sheet.locator('.np-name')).toHaveText(first.name.ar)
  await expect(sheet.locator('.np-sub')).toHaveText(`حفص عن عاصم · مرتل · ${ar.changeReciter}`)
  await expect(sheet.locator('.cartouche')).toHaveText('سورة الشرح')
  expect((await sheet.locator('.np-ayah').textContent())!.startsWith(sura.ayat[0].text.trimEnd())).toBe(true)
  expect((await sheet.locator('.np-ayah-next').textContent())!.startsWith(sura.ayat[1].text.trimEnd())).toBe(true)
  await expect(sheet.locator('.np-seg')).toHaveCount(8)
  await expect(sheet.getByTestId('np-ayah-of')).toHaveText('الآية ١ من ٨')
  await expect(sheet.getByRole('button', { name: ar.prevAyah })).toBeDisabled()
  await expect(sheet.getByRole('button', { name: ar.nextAyah })).toBeDisabled()
  // Playing from the sheet: «تُتلى الآن», then the next ayah, then back.
  await sheet.locator('.np-main').click()
  await expect(page.locator('dialog.sheet[open] h2, dialog.sheet[open] .sheet-title').first()).toHaveText(ar.nowPlaying)
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'إيقاف مؤقت')
  // Each step plays from the ayah's start; a pause right after holds it there (the fake sura lasts 7.5 seconds).
  await sheet.getByRole('button', { name: ar.nextAyah }).click()
  await sheet.locator('.np-main').click()
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'متابعة')
  await expect(sheet.getByTestId('np-ayah-of')).toHaveText('الآية ٢ من ٨')
  await expect(sheet.locator('.np-seg.is-done')).toHaveCount(2)
  expect((await sheet.locator('.np-ayah').textContent())!.startsWith(sura.ayat[1].text.trimEnd())).toBe(true)
  await sheet.getByRole('button', { name: ar.prevAyah }).click()
  await sheet.locator('.np-main').click()
  await expect(sheet.getByTestId('np-ayah-of')).toHaveText('الآية ١ من ٨')
  // Filled from the right in Arabic, as on the board.
  const [a, b] = await sheet.locator('.np-seg').evaluateAll((els) => [els[0].getBoundingClientRect().x, els[1].getBoundingClientRect().x])
  expect(a).toBeGreaterThan(b)
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true })
    await sheet.locator('.rd-avatar').scrollIntoViewIfNeeded()
    await page.locator('dialog.sheet[open]').screenshot({ path: path.join(SHOTS, 'player-ar.png'), animations: 'disabled' })
    // The whole screen at 390 × 844, beside the board (scripts in out/v2-shots/0047/player: compare.png).
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(250)
    await sheet.locator('.rd-avatar').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(SHOTS, 'player-ar-390.png'), animations: 'disabled' })
  }
  // The bar under «استمع» says it too.
  await page.keyboard.press('Escape')
  await expect(bar.locator('.listen-now')).toHaveText('الآية ١ من ٨')
  // A press on the ayah opens its tafsir (the ayah sheet), and the player closes.
  sheet = await openPlayer(page)
  await sheet.locator('.np-ayah').click()
  await expect(page.getByTestId('now-playing')).toBeHidden()
  await expect(page).toHaveURL(/\/quran\/94\/1/)
})

test('the speed: عادية → ١٫٢٥× → ١٫٥× → ٠٫٧٥× → عادية, at once on the audio, kept on the device', async ({ page }) => {
  await watchRates(page)
  await fakeRecitation(page, { timing: () => steps(8, 20_000) })
  await page.goto('/quran/94?lang=ar')
  const sheet = await openPlayer(page)
  const speed = sheet.getByTestId('np-speed')
  await expect(speed.locator('.np-tile-value')).toHaveText('عادية')
  await sheet.locator('.np-main').click()
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'إيقاف مؤقت')
  for (const [text, rate] of [
    ['١٫٢٥×', 1.25],
    ['١٫٥×', 1.5],
    ['٠٫٧٥×', 0.75],
  ] as const) {
    await speed.click()
    await expect(speed.locator('.np-tile-value')).toHaveText(text)
    expect(await page.evaluate(() => (window as unknown as { __rates: number[] }).__rates.at(-1))).toBe(rate)
  }
  await expect(speed).toHaveAttribute('aria-label', `${ar.speed}: ٠٫٧٥×. ${ar.tapToChange}`)
  await page.reload()
  await expect((await openPlayer(page)).getByTestId('np-speed').locator('.np-tile-value')).toHaveText('٠٫٧٥×')
})

test('the sleep timer: 15 minutes later the recitation pauses, and the timer is off again', async ({ page }) => {
  await page.clock.install()
  await fakeRecitation(page, { timing: () => steps(8, 20_000) })
  await page.goto('/quran/94?lang=ar')
  const sheet = await openPlayer(page)
  const sleep = sheet.getByTestId('np-sleep')
  await expect(sleep.locator('.np-tile-value')).toHaveText(ar.sleepOff)
  await sleep.click()
  await expect(sleep.locator('.np-tile-value')).toHaveText('١٥ دقيقة')
  await sleep.click()
  await expect(sleep.locator('.np-tile-value')).toHaveText('٣٠ دقيقة')
  await sleep.click()
  await sleep.click()
  await sleep.click()
  await expect(sleep.locator('.np-tile-value')).toHaveText('١٥ دقيقة')
  await sheet.locator('.np-main').click()
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'إيقاف مؤقت')
  await page.clock.fastForward('14:00')
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'إيقاف مؤقت')
  await page.clock.fastForward('01:05')
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'متابعة')
  await expect(sleep.locator('.np-tile-value')).toHaveText(ar.sleepOff)
})

test('after the sura: «التالية تلقائيًا» goes on to the next sura and its page; «توقف» stays', async ({ page }) => {
  await fakeRecitation(page, { timing: (s) => steps(s === 112 ? 4 : 5, 400) })
  await page.goto('/quran/112?lang=ar')
  const sheet = await openPlayer(page)
  await expect(sheet.getByTestId('np-after').locator('.np-tile-value')).toHaveText(ar.afterNext)
  await page.keyboard.press('Escape')
  await page.locator('.listen-bar .listen-main').click()
  await expect(page).toHaveURL(/\/quran\/113(\?|$)/, { timeout: 10_000 })
  await expect(page.locator('.listen-bar .listen-now')).toHaveText(/^الآية [١-٥] من ٥$/)
  await page.locator('.listen-bar .listen-stop').click()

  await page.goto('/quran/112?lang=ar')
  const again = await openPlayer(page)
  await again.getByTestId('np-after').click()
  await expect(again.getByTestId('np-after').locator('.np-tile-value')).toHaveText(ar.afterStop)
  await page.keyboard.press('Escape')
  await page.locator('.listen-bar .listen-main').click()
  await expect(page.locator('.listen-bar .listen-main')).toHaveText('استمع', { timeout: 10_000 })
  await expect(page).toHaveURL(/\/quran\/112(\?|$)/)
  // Kept on the device.
  await page.reload()
  await expect((await openPlayer(page)).getByTestId('np-after').locator('.np-tile-value')).toHaveText(ar.afterStop)
})

test('«تغيير القارئ» in the sheet: the reciters with their photos; the recitation goes on in the new voice', async ({ page }) => {
  const mp3 = await fakeRecitation(page, { timing: () => steps(8, 20_000) })
  await page.goto('/quran/94?lang=ar')
  const sheet = await openPlayer(page)
  await sheet.locator('.np-main').click()
  await sheet.getByRole('button', { name: ar.changeReciter }).click()
  const picker = page.locator('dialog.sheet[open]', { has: page.locator('.np-picker') })
  await expect(picker.locator('.np-pick')).toHaveCount(config.reciters.length)
  await expect(picker.locator('.np-pick .rd-avatar img')).toHaveCount(2)
  await picker.locator('.np-pick', { hasText: qatami.name.ar }).click()
  await expect(sheet.locator('.np-name')).toHaveText(qatami.name.ar)
  await expect(sheet.locator('.rd-avatar.is-large img')).toHaveCount(1)
  await expect.poll(() => mp3.some((u) => u.includes('nasser-qatami'))).toBe(true)
  await expect(sheet.locator('.np-main')).toHaveAttribute('aria-label', 'إيقاف مؤقت')
})

test('«تكرار الآية» opens «تكرار للحفظ» for the ayah on', async ({ page }) => {
  await fakeRecitation(page, { timing: () => steps(8, 20_000) })
  await page.goto('/quran/94?lang=ar')
  const sheet = await openPlayer(page)
  await expect(sheet.getByTestId('np-repeat').locator('.np-tile-value')).toHaveText(ar.repeatOff)
  await sheet.getByTestId('np-repeat').click()
  await expect(page.getByRole('dialog', { name: 'تكرار للحفظ' })).toBeVisible()
})

test('English, and at 135% text: nothing wider than the sheet, every control 44 px or more', async ({ page }) => {
  await fakeRecitation(page, { timing: () => steps(8, 20_000) })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/quran/94?lang=en')
  let sheet = await openPlayer(page, en.open)
  await expect(sheet.getByTestId('np-ayah-of')).toHaveText('Verse 1 of 8')
  await expect(sheet.getByTestId('np-speed').locator('.np-tile-value')).toHaveText(en.speedNormal)
  if (SHOTS) await page.locator('dialog.sheet[open]').screenshot({ path: path.join(SHOTS, 'player-en.png'), animations: 'disabled' })
  await page.keyboard.press('Escape')
  for (const lang of ['ar', 'en'] as const) {
    await page.goto(`/quran/94?lang=${lang}`)
    await page.evaluate(() => (document.documentElement.style.fontSize = '135%'))
    sheet = await openPlayer(page, PLAYER[lang].open)
    const bad = await sheet.evaluate((root) => {
      const box = root.getBoundingClientRect()
      const out: string[] = []
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        const r = el.getBoundingClientRect()
        if (r.width && (r.left < box.left - 1 || r.right > box.right + 1)) out.push(`${el.className || el.tagName} ${Math.round(r.left)}–${Math.round(r.right)}`)
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'hidden') out.push(`cut ${el.className}`)
      }
      for (const b of root.querySelectorAll<HTMLElement>('button')) if (b.getBoundingClientRect().height < 44 && !b.classList.contains('np-link') && !b.classList.contains('np-ayah')) out.push(`small ${b.className}`)
      return out
    })
    expect(bad, `${lang} at 135%`).toEqual([])
    if (SHOTS && lang === 'ar') await page.locator('dialog.sheet[open]').screenshot({ path: path.join(SHOTS, 'player-ar-135.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
  }
})
