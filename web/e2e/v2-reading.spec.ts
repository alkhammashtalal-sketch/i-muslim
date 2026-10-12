import { expect, test, type Page } from '@playwright/test'
import { fakeRecitation } from './helpers/fake-recitation'

// Reply 0032 part C (the eight reading additions) and part B's ayah page (c16, c17), on a preview of next:
//   BASE_URL=http://localhost:8813 npx playwright test e2e/v2-reading.spec.ts --project=mobile
// Never the live link. No question is sent to the model; recitations go through the fake (nothing from mp3quran).

const KEY = 'muslim.reading.v1'
const sheet = (page: Page) => page.locator('dialog.sheet[open]').last()

/** V2 rules 4 and 5 on the page: no horizontal scroll, no visible text under 13 px (the ayah-end numbers are
 *  ornament), no visible control smaller than 44 px. */
async function pageCheck(page: Page, scope = 'body') {
  const r = await page.evaluate((sel) => {
    const root = document.querySelector(sel) ?? document.body
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    const small: string[] = []
    const tiny: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height || getComputedStyle(el).visibility === 'hidden') continue
      if (el.closest('.mkp, .ayah-num, svg, .sr-only, [aria-hidden="true"]')) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (own && parseFloat(getComputedStyle(el).fontSize) < 12.9) small.push(`${el.tagName}.${el.className} ${el.textContent!.trim().slice(0, 20)} ${getComputedStyle(el).fontSize}`)
      if (el.matches('button, a[href], [role=tab], [role=switch], select, input') && (box.width < 43.5 || box.height < 43.5)) tiny.push(`${el.tagName}.${el.className} ${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20)} ${Math.round(box.width)}x${Math.round(box.height)}`)
    }
    return { overflow, small, tiny }
  }, scope)
  expect(r.overflow, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(r.small, 'text under 13 px').toEqual([])
  expect(r.tiny, 'targets under 44 px').toEqual([])
}

test.describe('reading additions (0032 C)', () => {
  test.use({ serviceWorkers: 'block' })
  test.beforeEach(async ({ page }) => {
    await page.route(/cdn\.mp3quran\.net/, (r) => r.abort())
  })

  test('C1 index by juz and quarters: first words cut from the ayah text, hizb numbers, the page', async ({ page }) => {
    await page.goto('/quran?lang=ar')
    await page.getByRole('tab', { name: 'الأجزاء والأرباع' }).click()
    const juz1 = page.locator('section.rd-juz').first()
    await expect(juz1.locator('.rd-juz-toggle')).toHaveAttribute('aria-expanded', 'true')
    const rows = juz1.locator('a.rd-quarter')
    await expect(rows).toHaveCount(8)
    await expect(rows.first()).toHaveAttribute('aria-label', /الحزب ١/)
    await expect(rows.nth(1)).toHaveAttribute('aria-label', /ربع الحزب/)
    // The words are the ayah's own: a prefix of its text from D1.
    const p = await (await page.request.get('/api/passage/quran:2:26')).json()
    const shown = (await rows.nth(1).locator('.rd-first [lang=ar]').textContent())!.replace(/ …$/, '')
    expect(p.text.startsWith(shown)).toBe(true)
    await expect(rows.nth(1)).toContainText('صفحة ٥')
    await rows.nth(1).click()
    await expect(page).toHaveURL(/\/quran\/2\/26/)
    await pageCheck(page, 'dialog.sheet[open]')
  })

  test('C1 «continue where you stopped» with its page', async ({ page }) => {
    await page.goto('/quran/2/255?lang=ar')
    await expect(sheet(page).locator('.rd-acts')).toBeVisible()
    await page.goto('/quran?lang=ar')
    await expect(page.locator('.continue-card')).toContainText('تابع من حيث وقفت')
    await expect(page.locator('.continue-card')).toContainText('صفحة ٤٢')
    await page.getByRole('tab', { name: 'الأجزاء والأرباع' }).click()
    await expect(page.locator('section.rd-juz .rd-juz-toggle[aria-expanded=true]')).toContainText('الجزء ٣')
    await pageCheck(page)
  })

  test('C2 bookmarks: on the device only, listed in «محفوظاتي», back to the ayah', async ({ page }) => {
    const sent: string[] = []
    page.on('request', (r) => r.postData() && sent.push(r.postData()!))
    await page.goto('/quran/2/255?lang=ar')
    const mark = sheet(page).getByRole('button', { name: 'علامة' })
    await expect(mark).toHaveAttribute('aria-pressed', 'false')
    await mark.click()
    await expect(mark).toHaveAttribute('aria-pressed', 'true')
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)
    expect(stored.bookmarks).toMatchObject([{ sura: 2, aya: 255 }])
    await page.keyboard.press('Escape')
    await page.goto('/quran/saved?lang=ar')
    await expect(page.getByRole('tab', { name: 'العلامات (١)' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.rd-saved-row')).toHaveCount(1)
    await expect(page.locator('.rd-saved-row')).toContainText('صفحة ٤٢')
    await expect(page.locator('.rd-privacy')).toContainText('على جوالك فقط')
    await pageCheck(page)
    await page.locator('.rd-saved-row a').click()
    await expect(page).toHaveURL(/\/quran\/2\/255/)
    expect(sent.join(' ')).not.toContain('bookmark')
  })

  test('C3 notes: saved on the device, listed, and a note returns to its ayah', async ({ page }) => {
    await page.goto('/quran/2/286?lang=ar')
    await sheet(page).getByRole('button', { name: 'ملاحظة' }).click()
    const note = sheet(page)
    await expect(note.getByRole('heading', { name: 'ملاحظة على الآية' })).toBeVisible()
    await note.getByLabel('ملاحظتك على الآية').fill('أحفظها هذا الأسبوع')
    await note.getByRole('button', { name: 'احفظ الملاحظة' }).click()
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)
    expect(stored.notes[0]).toMatchObject({ sura: 2, aya: 286, text: 'أحفظها هذا الأسبوع' })
    await page.keyboard.press('Escape')
    await page.goto('/quran/saved?lang=ar')
    await page.getByRole('tab', { name: 'الملاحظات (١)' }).click()
    await expect(page.locator('.rd-note-item p')).toHaveText('أحفظها هذا الأسبوع')
    await pageCheck(page)
    await page.locator('.rd-note-item a').click()
    await expect(page).toHaveURL(/\/quran\/2\/286/)
    // Deleting it from the ayah's panel.
    await sheet(page).getByRole('button', { name: 'ملاحظة' }).click()
    await sheet(page).getByRole('button', { name: 'احذف الملاحظة' }).click()
    expect((await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)).notes).toEqual([])
  })

  test('C4 repeat to memorise: the range in the reciter’s own voice, the set number of times', async ({ page }) => {
    await page.unroute(/cdn\.mp3quran\.net/)
    const audio = await fakeRecitation(page)
    await page.goto('/quran/94/5?lang=ar')
    await sheet(page).getByRole('button', { name: 'كرّر' }).click()
    const rep = sheet(page)
    await expect(rep.getByRole('heading', { name: 'تكرار للحفظ' })).toBeVisible()
    await rep.getByRole('tab', { name: 'مجموعة آيات' }).click()
    await expect(rep.getByLabel('من')).toHaveValue('5')
    await expect(rep.getByLabel('إلى')).toHaveValue('8')
    await rep.getByRole('tab', { name: 'الآية الحالية' }).click()
    await rep.getByRole('button', { name: 'أقل' }).click()
    await expect(rep.locator('.rd-count')).toHaveText('٢')
    await rep.getByRole('button', { name: 'بلا مهلة' }).click()
    await pageCheck(page, 'dialog.sheet[open]:last-of-type')
    await rep.getByRole('button', { name: 'ابدأ التكرار' }).click()
    await expect(rep.getByRole('status')).toHaveText('المرة ١ من ٢')
    await expect(rep.getByRole('status')).toHaveText('المرة ٢ من ٢', { timeout: 10_000 })
    // After the second round it stops by itself.
    await expect(rep.getByRole('button', { name: 'ابدأ التكرار' })).toBeVisible({ timeout: 10_000 })
    expect(audio.length).toBeGreaterThan(0)
    expect(audio.every((u) => /cdn\.mp3quran\.net/.test(u))).toBe(true)
  })

  test('C5 my portion: no day counter, the next portion after «done», the missed-day sentence', async ({ page }) => {
    await page.goto('/quran/ward?lang=ar')
    await expect(page.locator('.rd-ward-big')).toHaveText('الجزء ١')
    await expect(page.getByText('إذا فاتك يوم، نكمل من حيث وقفت.')).toBeVisible()
    // Sura names are isolated (U+2068 … U+2069) for either reading direction.
    await expect(page.getByText(/من \u2068?الفاتحة\u2069? ١ إلى \u2068?البقرة\u2069? ١٤١/)).toBeVisible()
    await pageCheck(page)
    await page.getByRole('button', { name: 'أتممت ورد اليوم' }).click()
    await expect(page.locator('.rd-ward-big')).toHaveText('الجزء ٢')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    await page.getByRole('button', { name: '٧ أيام' }).click()
    await expect(page.locator('.rd-ward-big')).toHaveText('الورد ١')
    // The reminder inside the app, on the reader's index.
    await page.getByRole('switch', { name: 'تذكير بالورد' }).click()
    await page.goto('/quran?lang=ar')
    await expect(page.locator('.rd-reminder')).toContainText('ورد اليوم ينتظرك')
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)
    expect(Object.keys(stored.ward).sort()).toEqual(['days', 'done', 'reminder'])
  })

  test('C6 reciters: riwaya under each name, favourites, filter, the choice kept', async ({ page }) => {
    await page.goto('/quran/reciters?lang=ar')
    await expect(page.locator('.rd-reciter').first()).toContainText('حفص عن عاصم')
    const second = page.locator('.rd-reciter').nth(1)
    const star = second.locator('.rd-star')
    await star.click()
    await expect(page.getByRole('heading', { name: 'المفضلة' })).toBeVisible()
    await page.getByRole('group', { name: 'تصفية' }).getByRole('button', { name: 'المفضلة' }).click()
    await expect(page.locator('.rd-reciter')).toHaveCount(1)
    await page.locator('.rd-reciter .rd-reciter-pick').click()
    const read = await page.evaluate(() => localStorage.getItem('imuslim.reciter.v1'))
    expect(read).not.toBeNull()
    await expect(page.locator('.rd-reciter .rd-reciter-pick')).toHaveAttribute('aria-pressed', 'true')
    await pageCheck(page)
  })

  test('C7 share as an image: 1080×1920 or 1080×1080, the source written on it, saved as a file', async ({ page }) => {
    await page.goto('/quran/33/56?lang=ar')
    await sheet(page).getByRole('button', { name: 'صورة' }).click()
    const img = sheet(page).locator('img.rd-share-preview')
    await expect(img).toBeVisible()
    expect(await img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([1080, 1920])
    await sheet(page).getByRole('tab', { name: 'مربع' }).click()
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalHeight)).toBe(1080)
    await sheet(page).getByRole('tab', { name: 'ليل' }).click()
    await expect(sheet(page).getByText('المصدر مكتوب على الصورة دائمًا.')).toBeVisible()
    const download = page.waitForEvent('download')
    await sheet(page).getByRole('button', { name: 'احفظ' }).click()
    expect((await download).suggestedFilename()).toBe('muslim-33-56-square-night.png')
    await pageCheck(page, 'dialog.sheet[open]:last-of-type')
  })

  test('C8 sajda: the mark from the Mushaf text, «place of a prostration of recitation», no ruling', async ({ page }) => {
    await page.goto('/quran/7/206?lang=ar')
    await expect(sheet(page).locator('.rd-ayah-box [lang=ar]').first()).toContainText('۩')
    await expect(sheet(page).locator('.rd-sajda')).toHaveText(/موضع سجدة تلاوة/)
    await expect(sheet(page).locator('.rd-sajda')).not.toContainText(/واجب|سنة|مستحب/)
    await page.goto('/quran/7/205?lang=ar')
    await expect(sheet(page).locator('.rd-acts')).toBeVisible()
    await expect(sheet(page).locator('.rd-sajda')).toHaveCount(0)
  })

  test('c16 ayah page: the ayah with its reference, «listen to the ayah», tafsir [الميسر] [السعدي] [الكل], no star', async ({ page }) => {
    await page.goto('/quran/33/56?lang=ar')
    const s = sheet(page)
    await expect(s.getByRole('heading', { name: 'الآية', exact: true })).toBeVisible()
    await expect(s.locator('.rd-ayah-ref')).toHaveText('الأحزاب · ٥٦ · مدنية · صفحة ٤٢٦')
    await expect(s.getByRole('heading', { name: 'استمع للآية' })).toBeVisible()
    await expect(s.getByRole('heading', { name: 'التفسير' })).toBeVisible()
    const chips = s.getByRole('group', { name: 'مصدر التفسير' }).getByRole('button')
    await expect(chips).toHaveText(['الميسر', 'السعدي', 'الكل'])
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
    await expect(s.getByText('الأنسب')).toHaveCount(0)
    await chips.nth(2).click()
    await expect(s.locator('.rd-all-item')).toHaveCount(2)
    await expect(s.locator('.rd-all-item').nth(1).locator('.rd-tafsir-text')).toHaveClass(/is-collapsed/)
    await expect(s.getByRole('button', { name: 'عن المصدر: نص المصحف' })).toBeVisible()
    await s.getByRole('button', { name: 'عن المصدر: نص المصحف' }).click()
    await expect(s.locator('.rd-source-facts a').first()).toHaveAttribute('href', /quran\.ksu\.edu\.sa/)
    await pageCheck(page, 'dialog.sheet[open]')
  })

  test('c17 no English part in the Arabic interface; the meaning under the ayah elsewhere', async ({ page }) => {
    await page.goto('/quran/2/255?lang=ar')
    await expect(sheet(page).locator('.rd-acts')).toBeVisible()
    await expect(sheet(page).locator('[lang="en"]')).toHaveCount(0)
    await page.goto('/quran/2/255?lang=en')
    const ayahPart = sheet(page).locator('section.rd-section').first()
    await expect(ayahPart.locator('p.translation[lang="en"]')).toContainText('Allah - there is no deity except Him')
  })

  test('the night version of the reader’s pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/quran/ward?lang=ar')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(10, 19, 48)')
    await pageCheck(page)
  })

  test('320 wide and 130% text: no horizontal scroll, sizes kept, on every reader page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const path of ['/quran', '/quran/saved', '/quran/ward', '/quran/reciters']) {
      for (const scale of ['100%', '130%']) {
        await page.goto(`${path}?lang=ar`)
        await page.evaluate((x) => (document.documentElement.style.fontSize = x), scale)
        if (path === '/quran') await page.getByRole('tab', { name: 'الأجزاء والأرباع' }).click()
        await page.waitForTimeout(300)
        await pageCheck(page)
      }
    }
    await page.goto('/quran/33/56?lang=ar')
    await page.evaluate(() => (document.documentElement.style.fontSize = '130%'))
    await expect(sheet(page).locator('.rd-acts')).toBeVisible()
    await pageCheck(page, 'dialog.sheet[open]')
  })
})
