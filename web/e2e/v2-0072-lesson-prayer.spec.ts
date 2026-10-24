import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import data from '../src/lessons/prayer-data.json' with { type: 'json' }
import bundled from '../src/lessons/prayer/prayers-batch-1.json' with { type: 'json' }
import { buildSteps } from '../src/lessons/prayer/prayers.js'
import { canvasDrawn, HAVE_DATA, lessonHere, noSideScroll, openLesson as open, pageErrors, rowText, SHOTS, shotWhole, textsAreTheRows, TRANSLIT } from './lesson-helpers'

// «علّمني الصلاة» in the app (add-on 0072; review page relay/w1/0071-prayer) at /today/lesson/prayer, each prayer
// step by step (add-on 0072-add13; review page relay/w1/0072-prayers/batch-1): the choice of a prayer with today's
// times; each of the five prayers walked through by «التالي», every step's title, map position and texts, at 390 and
// 320, in Arabic and English; «تدرّب معي»; our server's later batches; and, on the prayers' steps, what the approved
// lesson's tests held: the close-ups (the feet, the seven places, the hand) drawn, a disputed box, the sunnah.com
// reference, the links to the app's qibla and adhkar (and the wudu lesson once it is here), al-Fatiha's
// transliteration from our server's QF route (and nothing when it does not answer), reduced motion, a device without
// WebGL, a machine-translated interface; no console errors, and no request outside the page except our QF route (the
// app's CSP applied; mp3quran is asked only on «استمع»).
//   npx vite preview --port 8794 && BASE_URL=http://localhost:8794 npx playwright test e2e/v2-0072-lesson-prayer.spec.ts --project=mobile
// SHOTS=<dir> also saves a few steps at 390.
test.use({ serviceWorkers: 'block' })
test.skip(/workers\.dev/.test(process.env.BASE_URL ?? ''), 'previews only, never a deployed link')
test.skip(!HAVE_DATA, 'the texts come from our server by id: answered here from data/processed, outside git')

type Def = Parameters<typeof buildSteps>[0]
type Step = { key: string; title: { ar: string; en: string }; at: { r: number | null; pos: string; sit?: number } }
const SET = bundled as unknown as Parameters<typeof buildSteps>[1] & { prayers: Def[]; words: Record<string, { ar: string; en: string }> }
const PRAYERS = SET.prayers
const steps = (id: string) => buildSteps(PRAYERS.find((p) => p.id === id)!, SET, data.steps) as unknown as Step[]
const RIYADH = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', source: 'city' as const }

// the lesson opened with our server's hadith and ayah routes answered from data/processed (lesson-helpers.ts)
const openLesson = (page: Page, o: Parameters<typeof open>[2] = {}) => open(page, 'prayer', { data, prayer: 'fajr', ...o })
const go = (page: Page, prayer: string, n: number, lang = 'ar') => page.goto(`/today/lesson/prayer?lang=${lang}&theme=light&still=1&prayer=${prayer}&step=${n}`)

const step = (id: string, key: string, r?: number) => steps(id).findIndex((s) => s.key === key && (r == null || s.at.r === r)) + 1
const title = (id: string, n: number, lang: 'ar' | 'en') => steps(id)[n - 1].title[lang]
const AR = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
const posOf = (p: Def, s: Step, lang: 'ar' | 'en') => {
  const name = SET.words[s.at.pos][lang]
  if (!s.at.r) return name
  return lang === 'ar' ? `الركعة ${AR(s.at.r)} من ${AR(p.rakat)} · ${name}` : `Rakah ${s.at.r} of ${p.rakat} · ${name}`
}

test('the lesson opens with «أي صلاة تريد أن تتعلم؟»: a card for each prayer, its rakahs, recitation and time today', async ({ page }) => {
  const w = await openLesson(page, { prayer: undefined, step: 0, place: RIYADH })
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText('أي صلاة تريد أن تتعلم؟')
  const cards = page.locator('#lsn-prayer .pm-card')
  await expect(cards.locator('.pm-name')).toHaveText(['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'])
  await expect(cards.nth(0).locator('.pm-meta')).toHaveText(['ركعتان', 'جهر'])
  await expect(cards.nth(3).locator('.pm-meta')).toHaveText(['ثلاث ركعات', 'جهر في الأوليين، وسرّ في الثالثة'])
  // the times as the prayer-times screen gives them (Eastern Arabic digits, the place's zone)
  await expect(cards.locator('.pm-time bdi')).toHaveCount(5)
  for (const t of await cards.locator('.pm-time bdi').allTextContents()) expect(t).toMatch(/^[٠-٩]{1,2}:[٠-٩]{2}/)
  await expect(page.locator('#lsn-prayer .pm-note a[href="/today/times"]')).toBeVisible()
  await noSideScroll(page)
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayers-choose-ar.png'))
  await cards.nth(1).click()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText('قبل أن نبدأ')
  await expect(page).toHaveURL(/prayer=dhuhr/)
  await expect(page.locator('#lsn-prayer .pm-r')).toHaveCount(4)
  await expect(page.locator('#lsn-prayer .pm-t')).toHaveCount(2)
  await expect(page.locator('#lsn-prayer .intro-text')).toContainText('صلاة الظهر ركعةً ركعة')
  await page.locator('#lsn-prayer .pm-other').click()
  await expect(page.locator('#lsn-prayer .pm-card')).toHaveCount(5)
  await expect(page).not.toHaveURL(/prayer=/)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('without a saved place: the cards without times, and the way to the prayer-times screen', async ({ page }) => {
  await openLesson(page, { prayer: undefined, step: 0 })
  await expect(page.locator('#lsn-prayer .pm-time')).toHaveCount(0)
  await expect(page.locator('#lsn-prayer .pm-note')).toContainText('حدّد مكانك في شاشة المواقيت')
  await page.locator('#lsn-prayer .pm-note a[href="/today/times"]').click()
  await expect(page).toHaveURL(/\/today\/times/)
})

// each prayer walked through by «التالي»: every step's title and its place on the map, its texts the rows' own bytes,
// nothing wider than the screen
for (const p of PRAYERS) {
  for (const width of [390, 320]) {
    for (const lang of ['ar', 'en'] as const) {
      test(`${p.id} ${lang} ${width}: every step in order, its map position and its texts`, async ({ page }) => {
        test.setTimeout(240_000)
        const w = await openLesson(page, { prayer: p.id, lang, width })
        const list = steps(p.id)
        let texts = 0
        for (let i = 0; i < list.length; i++) {
          if (i) {
            await page.locator('#lsn-prayer .stepper .btn.primary').click()
            await expect(page).toHaveURL(new RegExp(`step=${i + 1}(&|$)`))
          }
          await expect(page.locator('#lsn-prayer .card h1')).toHaveText(list[i].title[lang])
          await expect(page.locator('#lsn-prayer .pm-pos')).toHaveText(posOf(p, list[i], lang))
          await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0)
          await noSideScroll(page)
          texts += await textsAreTheRows(page, 'prayer')
        }
        await expect(page.locator('#lsn-prayer .stepper .btn.primary')).toBeDisabled()
        expect(texts).toBeGreaterThan(list.length)
        expect(pageErrors(w)).toEqual([])
        expect(w.outside).toEqual([])
      })
    }
  }
}

test('the map: a dot opens its rakah, a mark its tashahhud; the sittings said in the step', async ({ page }) => {
  await openLesson(page, { prayer: 'isha' })
  await page.locator('#lsn-prayer .pm-r').nth(2).click()
  await expect(page.locator('#lsn-prayer .pm-pos')).toHaveText('الركعة ٣ من ٤ · القيام')
  await expect(page.locator('#lsn-prayer .pm-r[aria-current="step"]')).toHaveAttribute('aria-label', 'الركعة ٣')
  await expect(page.locator('#lsn-prayer .pm-cue-text')).toHaveText('قم إلى الثالثة مكبّرًا رافعًا يديك')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayers-isha-stand3-ar.png'))
  await page.locator('#lsn-prayer .pm-t').first().click()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText('التشهد الأول')
  await expect(page.locator('#lsn-prayer .pm-cue-text')).toHaveText('بعد السجدة الثانية من الركعة الثانية لا تقم، بل اجلس للتشهد الأول')
  await page.locator('#lsn-prayer .pm-t').last().click()
  await expect(page.locator('#lsn-prayer .pm-cue-text')).toContainText('اجلس للتشهد الأخير متورّكًا')
  await go(page, 'isha', step('isha', 'fatiha', 4))
  await expect(page.locator('#lsn-prayer[data-ready="1"] .pm-cue-text')).toHaveText('الفاتحة وحدها، سرًّا')
  await expect(page.locator('#lsn-prayer .pm-pos')).toHaveText('الركعة ٤ من ٤ · الفاتحة')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayers-isha-fatiha4-ar.png'))
})

test('«تدرّب معي», «للتدرّب قبل الصلاة»: what is said in large type, part after part; it moves on and pauses', async ({ page }) => {
  const w = await openLesson(page, { prayer: 'maghrib', still: false })
  const btn = page.locator('#lsn-prayer .pm-practice-btn')
  await expect(btn).toContainText('تدرّب معي')
  await expect(btn).toContainText('للتدرّب قبل الصلاة')
  await expect(page.locator('#lsn-prayer')).not.toContainText('صلِّ معي')
  await btn.click()
  await expect(page.locator('#lsn-prayer .pm-pr-label')).toHaveText('للتدرّب قبل الصلاة')
  await expect(page.locator('#lsn-prayer .pm-pos')).toHaveText('الركعة ١ من ٣ · تكبيرة الإحرام')
  const big = page.locator('#lsn-prayer .pm-big')
  await expect(big).toBeVisible()
  expect(parseFloat(await big.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(28)
  expect(await textsAreTheRows(page, 'prayer')).toBeGreaterThan(0)
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayers-practice-ar.png'))
  const kicker = page.locator('#lsn-prayer .pm-practice-card .kicker')
  const first = await kicker.textContent()
  await page.locator('#lsn-prayer .pm-play').click()
  await expect(kicker).not.toHaveText(first!, { timeout: 8000 })
  await page.locator('#lsn-prayer .pm-play').click()
  const paused = await kicker.textContent()
  await page.waitForTimeout(5000)
  await expect(kicker).toHaveText(paused!)
  // every part's text is the reviewed one; by the buttons through al-Fatiha's ayat
  let parts = 0
  for (let i = 0; i < 6; i++) {
    await page.locator('#lsn-prayer .pm-controls .btn').last().click()
    await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0)
    parts += await textsAreTheRows(page, 'prayer') // (Ibn Baz's wording before al-Fatiha is held by the worker test)
  }
  expect(parts).toBeGreaterThan(3)
  await page.locator('#lsn-prayer .pm-end .btn').click()
  await expect(page.locator('#lsn-prayer .stepper')).toBeVisible()
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('our server’s later batches: a valid set adds its prayers to the cards; a broken one leaves the five', async ({ page }) => {
  const duha = { id: 'duha', batch: 2, time: null, rakat: 2, name: { ar: 'الضحى', en: 'Duha' }, recite: { ar: 'سرّ', en: 'quiet' }, rakahs: ['sirr', 'sirr'], seq: PRAYERS[0].seq }
  await openLesson(page, { prayer: undefined, step: 0, prayers: { v: 1, batch: 2, words: {}, prayers: [duha] } })
  await expect(page.locator('#lsn-prayer .pm-card .pm-name')).toHaveText(['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء', 'الضحى'])
  await page.goto('about:blank')
  await openLesson(page, { prayer: undefined, step: 0, prayers: { v: 1, prayers: [{ ...duha, seq: [{ k: 'nosuch', r: 1 }] }] } })
  await page.waitForTimeout(500)
  await expect(page.locator('#lsn-prayer .pm-card')).toHaveCount(5)
})

test('the close-ups: the feet, the seven places with their numbers, and the hand in the tashahhud', async ({ page }) => {
  const w = await openLesson(page, { step: step('fajr', 'sujud1', 1) })
  expect(await canvasDrawn(page, '#lsn-prayer .stage canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .feet-h', { hasText: 'القدمان عن قرب' })).toBeVisible()
  expect(await canvasDrawn(page, '#lsn-prayer .view-feet canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .feet-h', { hasText: 'مواضع السجود السبعة' })).toBeVisible()
  expect(await canvasDrawn(page, '#lsn-prayer .view-seven canvas')).toBe(true)
  await expect(page.locator('#lsn-prayer .view-seven .num-tag')).toHaveText(['١', '٢', '٣', '٤', '٥', '٦', '٧'])
  await expect(page.locator('#lsn-prayer .view-feet .qibla-tag')).toHaveText('القبلة')
  // the sunnah.com row: its reference and link, no text
  await expect(page.locator('#lsn-prayer .ev-item.sunnah a[href="https://sunnah.com/abudawud:734"]')).toBeVisible()
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-08-sujud-ar.png'))
  await go(page, 'fajr', step('fajr', 'tashahhud'))
  await expect(page.locator('#lsn-prayer[data-ready="1"] .feet-h', { hasText: 'اليد اليمنى في التشهد' })).toBeVisible()
  await page.waitForTimeout(400)
  expect(await canvasDrawn(page, '#lsn-prayer .view-hand canvas')).toBe(true)
  // a disputed matter: the fixed sentence and the referral (the last tashahhud of Fajr has two: the index finger, and
  // where the tawarruk is)
  await expect(page.locator('#lsn-prayer .khilaf .topic')).toHaveText(['تحريك السبابة', 'موضع التورّك'])
  const box = page.locator('#lsn-prayer .khilaf').first()
  await expect(box.locator('.fixed')).toHaveText('هذه المسألة فيها أكثر من قول عند أهل العلم')
  await expect(box.locator('a.referral')).toHaveAttribute('href', 'https://www.alifta.gov.sa')
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-13-tashahhud-ar.png'))
  // a four-rakah prayer's last sitting: the tawarruk, its feet close-up
  await go(page, 'dhuhr', step('dhuhr', 'ibrahimiyya'))
  await expect(page.locator('#lsn-prayer[data-ready="1"] .feet-line')).not.toHaveCount(0)
  await page.waitForTimeout(400)
  expect(await canvasDrawn(page, '#lsn-prayer .view-feet canvas')).toBe(true)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('al-Fatiha: its transliteration as our server gives it, under each ayah; mp3quran not asked before «استمع»', async ({ page }) => {
  const w = await openLesson(page, { step: step('fajr', 'fatiha', 1) })
  const lines = page.locator('#lsn-prayer .ayah .translit .tl-text')
  await expect(lines).toHaveText(TRANSLIT.ayat.map((a) => a.text))
  await expect(page.locator('#lsn-prayer a[href="https://quran.foundation"]').first()).toBeVisible()
  expect(w.qf).toHaveLength(1)
  expect(new URL(w.qf[0]).pathname).toBe('/api/qf/translit/1')
  // the ayat are the stored text, the tafsir al-Muyassar of the selected one
  await expect(page.locator('#lsn-prayer .ayah [data-field="text"]').first()).toHaveText(rowText('quran:1:1', 'ar', 'text', null, null, null)!)
  await expect(page.locator('#lsn-prayer .tafsir [data-field="muyassar"]')).toHaveText(rowText('quran:1:1', 'ar', 'muyassar', null, null, null)!)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('al-Fatiha when our server does not answer the QF route: no transliteration and no QF line', async ({ page }) => {
  const w = await openLesson(page, { step: step('fajr', 'fatiha', 1), qf: 'none' })
  await expect(page.locator('#lsn-prayer .ayah').first()).toBeVisible()
  await page.waitForTimeout(600)
  await expect(page.locator('#lsn-prayer .translit')).toHaveCount(0)
  await expect(page.locator('#lsn-prayer a[href="https://quran.foundation"]')).toHaveCount(0)
  // the shot without the stub's lines: on our servers the transliteration is Quran Foundation's own
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-04-fatiha-ar.png'))
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('the links: the app’s qibla and adhkar screens, and the wudu lesson once it is here', async ({ page }) => {
  await openLesson(page, { step: 1 })
  const wudu = page.locator('#lsn-prayer .links a.app-link[href="/today/lesson/wudu"]')
  await expect(wudu).toHaveCount(lessonHere('wudu') ? 1 : 0)
  if (lessonHere('wudu')) await expect(wudu).toHaveText('درس الوضوء')
  await page.locator('#lsn-prayer .links a.app-link[href="/today/qibla"]').click()
  await expect(page).toHaveURL(/\/today\/qibla(\?(?!.*(step|prayer)=)|$)/)
  await go(page, 'fajr', step('fajr', 'after'))
  await page.locator('#lsn-prayer[data-ready="1"] .links a.app-link[href="/today/adhkar"]').click()
  await expect(page).toHaveURL(/\/today\/adhkar/)
  if (!lessonHere('wudu')) return
  await go(page, 'fajr', 1)
  await page.locator('#lsn-prayer[data-ready="1"] .links a.app-link[href="/today/lesson/wudu"]').click()
  await expect(page.locator('#lsn-wudu .card h1')).toHaveText('قبل أن نبدأ', { timeout: 20_000 })
})

test('English: the step in English, the Arabic text always shown', async ({ page }) => {
  const n = step('fajr', 'sujud1', 1)
  const w = await openLesson(page, { lang: 'en', step: n })
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title('fajr', n, 'en'))
  await expect(page.locator('#lsn-prayer .say-box .dhikr[lang="ar"]')).toBeVisible()
  await expect(page.locator('#lsn-prayer .view-seven .num-tag')).toHaveText(['1', '2', '3', '4', '5', '6', '7'])
  if (SHOTS) await shotWhole(page, path.join(SHOTS, 'prayer-08-sujud-en.png'))
  expect(pageErrors(w)).toEqual([])
})

test('reduced motion: the figure stands in the pose at once and stays still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const w = await openLesson(page, { step: step('fajr', 'ruku', 1), still: false })
  await page.locator('#lsn-prayer .stepper .btn.primary').click()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title('fajr', step('fajr', 'itidal', 1), 'ar'))
  await page.waitForTimeout(400)
  const a = await page.locator('#lsn-prayer .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  await page.waitForTimeout(900)
  const b = await page.locator('#lsn-prayer .stage canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  expect(a).toBe(b)
  expect(pageErrors(w)).toEqual([])
})

test('no WebGL on the device: the steps with their texts, without the figure, and nothing alarming', async ({ page }) => {
  const n = step('fajr', 'sujud1', 1)
  const w = await openLesson(page, { step: n, noGL: true })
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title('fajr', n, 'ar'))
  await expect(page.locator('#lsn-prayer .stage')).toBeHidden()
  await expect(page.locator('#lsn-prayer .feet-view').first()).toBeHidden()
  await expect(page.locator('#lsn-prayer .feet .legend')).toBeVisible()
  await expect(page.locator('#lsn-prayer')).not.toContainText('تعذّر')
  expect(pageErrors(w)).toEqual([])
})

test('a machine-translated interface (French): its frame words, the English content, the Arabic text', async ({ page }) => {
  const n = step('fajr', 'fatiha', 1)
  const w = await openLesson(page, { lang: 'fr', step: n })
  await expect(page.locator('#lsn-prayer .content-note')).toContainText('traduction automatique')
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText(title('fajr', n, 'en'))
  await expect(page.locator('#lsn-prayer .stepper .btn.primary')).toHaveText('Suivant')
  await expect(page.locator('#lsn-prayer .card h2').first()).toHaveText('Ce que vous faites')
  await expect(page.locator('#lsn-prayer .pm-practice-btn')).toContainText('Entraînez-vous avec moi')
  await expect(page.locator('#lsn-prayer .ayah [data-field="text_en"]').first()).toHaveText(rowText('quran:1:1', 'en', 'text_en', null, null, null)!)
  await noSideScroll(page)
  await page.locator('#lsn-prayer .pm-other').click()
  await expect(page.locator('#lsn-prayer .card h1')).toHaveText('Quelle prière voulez-vous apprendre ?')
  expect(pageErrors(w)).toEqual([])
})

test('our server does not answer: each step keeps its references and links, and shows no text (never a stale copy)', async ({ page }) => {
  const w = await openLesson(page, { step: step('fajr', 'sujud1', 1), texts: 'none' })
  await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0)
  await expect(page.locator('#lsn-prayer [data-ref^="hadith:"][data-field]')).toHaveCount(0)
  // the HadeethEnc source line, its number and its link stay
  await expect(page.locator('#lsn-prayer a[href="https://hadeethenc.com/ar/browse/hadith/10925"]').first()).toBeVisible()
  await go(page, 'fajr', step('fajr', 'fatiha', 1))
  await expect(page.locator('#lsn-prayer[data-ready="1"] .tafsir a[href^="https://quran.ksu.edu.sa/tafseer/muyassar/"]')).toBeVisible()
  await expect(page.locator('#lsn-prayer .ayah')).toHaveCount(0)
  await noSideScroll(page)
  expect(w.texts.length).toBeGreaterThan(0)
  expect(pageErrors(w)).toEqual([])
  expect(w.outside).toEqual([])
})

test('while the texts come: a calm empty line in their place, then the texts', async ({ page }) => {
  await openLesson(page, { step: step('fajr', 'takbir'), texts: 'slow' })
  await expect(page.locator('#lsn-prayer .lsn-pending').first()).toBeVisible()
  await expect(page.locator('#lsn-prayer .lsn-pending')).toHaveCount(0, { timeout: 15_000 })
  expect(await textsAreTheRows(page, 'prayer')).toBeGreaterThan(0)
})
