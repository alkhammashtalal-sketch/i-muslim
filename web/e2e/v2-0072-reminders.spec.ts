// Add-on 0072-add30 §5 in the app's own page, as the iPhone app shows it (the way of e2e/v2-0072-alerts.spec.ts: the
// web app with Capacitor's platform set to «ios» and the native plugins answered here): the four optional reminders in
// «التنبيهات» under the adhkar reminders, off by default, on from a tap; what the app hands to the system (the 64 shared
// with everything); the page each one opens, with its hadith from the app's own copy (no network); and, with
// REMINDER_SHOTS, the shots of the settings, the pages and each notification's banner.
// Run on the app's own build (npm run build:native, then vite preview):
//   BASE_URL=http://localhost:<port> REMINDER_SHOTS=<dir> npx playwright test e2e/v2-0072-reminders.spec.ts --project mobile
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { pastWelcome } from './past-welcome'

const SHOTS = process.env.REMINDER_SHOTS ?? ''
// The hadiths are behind REMINDER_VIRTUE (web/src/native/reminders.ts), on since their approval (add-on 0072-add48).
// REMINDER_VIRTUE=0 here only for a build made with the flag turned off again.
const VIRTUE = process.env.REMINDER_VIRTUE !== '0'
/** An element; `null` the screen as the reader sees it; nothing the whole page. */
const shot = async (page: Page, name: string, el?: ReturnType<Page['locator']> | null) => {
  if (!SHOTS) return
  if (el) await el.screenshot({ path: `${SHOTS}/${name}.png` })
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: el === undefined })
}
// Thursday 19 November 2026, 10:00 in Riyadh: Friday tomorrow, 13 Jumada al-Ula 1448 on Monday 23 November.
const DAY = new Date('2026-11-19T10:00:00+03:00')
type Sched = { id: number; title: string; body: string; extra: { kind: string; url: string }; schedule: { at: string | Date } }
type Call = { plugin: string; method: string; options: { notifications?: Sched[] } }

async function asIosApp(page: Page, lang = 'ar') {
  await pastWelcome(page)
  await page.clock.install({ time: DAY })
  // Nothing leaves the page: the hadiths come from the app's own copy (dist/offline), as on a phone with no network.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort())
  await page.route('**/api/**', (r) => r.abort())
  await page.addInitScript(() => {
    localStorage.setItem('muslim.welcome.v1', '1')
    localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', source: 'city', name: 'الرياض' }))
    const calls: Call[] = []
    ;(window as unknown as { __calls: Call[] }).__calls = calls
    const perm = { display: 'prompt' }
    const answers: Record<string, Record<string, (o: unknown) => unknown>> = {
      AlertSounds: { status: () => ({ ready: {} }), prepare: () => ({ ok: true }), channels: () => ({ ready: {} }) },
      TasbihSession: { available: () => ({ supported: true, enabled: true }), active: () => ({ active: false }) },
      LocalNotifications: {
        checkPermissions: () => ({ display: localStorage.getItem('test.perm') ?? perm.display }),
        requestPermissions: () => (localStorage.setItem('test.perm', 'granted'), { display: 'granted' }),
        getPending: () => ({ notifications: [] }),
        cancel: () => ({}),
        schedule: (o) => ({ notifications: (o as { notifications: { id: number }[] }).notifications.map((n) => ({ id: n.id })) }),
        checkExactNotificationSetting: () => ({ exact_alarm: 'denied' }),
      },
      WidgetBridge: { read: () => ({ json: null }), write: () => ({}) },
    }
    const w = window as unknown as Record<string, unknown>
    w.CapacitorCustomPlatform = { name: 'ios', plugins: {} }
    w.Capacitor = {
      PluginHeaders: Object.entries(answers).map(([name, m]) => ({ name, methods: [...Object.keys(m).map((x) => ({ name: x, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }] })),
      nativePromise: async (plugin: string, method: string, options: unknown) => {
        calls.push({ plugin, method, options } as Call)
        return answers[plugin]?.[method]?.(options) ?? {}
      },
      nativeCallback: () => 'cb',
    }
  })
  return lang
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { __calls: Call[] }).__calls)
const lastSchedule = async (page: Page) => (await calls(page)).filter((c) => c.plugin === 'LocalNotifications' && c.method === 'schedule').pop()?.options.notifications ?? []

async function openSettings(page: Page, lang: 'ar' | 'en') {
  await page.goto(`/?lang=${lang}`)
  await page.getByRole('button', { name: lang === 'ar' ? 'الإعدادات' : 'Settings' }).first().click()
  const sec = page.getByTestId('alert-settings')
  await expect(sec).toBeVisible()
  return sec
}

const SWITCHES = {
  ar: ['تذكير يوم الجمعة', 'تذكير صيام الأيام البيض', 'تذكير صيام الاثنين والخميس', 'تذكير اسم الله لليوم'],
  en: ['Friday reminder', 'Reminder to fast the White Days', 'Reminder to fast Monday and Thursday', 'Reminder of the Name of Allah for today'],
}

test.describe('0072-add30 §5: the optional reminders in the settings', () => {
  test('off by default, under the adhkar reminders, and no permission asked by opening the page', async ({ page }) => {
    await asIosApp(page)
    const sec = await openSettings(page, 'ar')
    const labels = await sec.locator('.row-label').allTextContents()
    expect(labels.indexOf('تذكير أذكار المساء')).toBeLessThan(labels.indexOf('تذكير يوم الجمعة'))
    for (const name of SWITCHES.ar) await expect(sec.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false')
    await expect(sec.getByText('يوم الجمعة بعد الشروق بـ٦٠ دقيقة: سورة الكهف، والإكثار من الصلاة على النبي ﷺ')).toBeVisible()
    await expect(sec.getByTestId('alert-fast-note')).toHaveText('ولا تذكير بصيام التطوع في رمضان، ولا في يومي العيد وأيام التشريق')
    expect((await calls(page)).filter((c) => c.method === 'requestPermissions')).toHaveLength(0)
    await sec.getByRole('switch', { name: SWITCHES.ar[0] }).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await shot(page, 'settings-off-ar', null)
  })

  test('each on from a tap (the permission asked once), its minutes, and the plan within the 64', async ({ page }) => {
    await asIosApp(page)
    const sec = await openSettings(page, 'ar')
    for (const name of SWITCHES.ar) {
      await sec.getByRole('switch', { name }).click()
      await expect(sec.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'true')
    }
    expect((await calls(page)).filter((c) => c.method === 'requestPermissions')).toHaveLength(1)
    // The Friday's minutes: 15 instead of 60.
    const friday = sec.locator('.v2-set-group', { has: page.getByRole('switch', { name: SWITCHES.ar[0] }) })
    await friday.getByRole('radio', { name: '١٥ د' }).click()
    await expect(sec.getByText('يوم الجمعة بعد الشروق بـ١٥ دقيقة: سورة الكهف، والإكثار من الصلاة على النبي ﷺ')).toBeVisible()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('muslim.extraReminders.v1') ?? '{}').fridayMin)).toBe(15)
    await sec.getByRole('switch', { name: SWITCHES.ar[1] }).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await shot(page, 'settings-on-ar', null)
    await shot(page, 'settings-on-ar-section', sec)
    const ns = await lastSchedule(page)
    expect(ns.length).toBeLessThanOrEqual(64)
    const kinds = new Set(ns.map((n) => n.extra.kind))
    for (const k of ['friday', 'fastBid', 'fastMonThu', 'nameDay']) expect(kinds.has(k), k).toBe(true)
    const fr = ns.find((n) => n.extra.kind === 'friday')!
    expect(fr).toMatchObject({ title: 'يوم الجمعة', extra: { url: '/today/reminder/friday' }, sound: 'default' })
    // The quote as data/reminders.json holds it (a verbatim part of HadeethEnc's text, worker/test/reminders-0072.test.ts).
    const data = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/reminders.json'), 'utf8'))
    expect(fr.body.split('\n')).toEqual(['سورة الكهف، والإكثار من الصلاة على النبي ﷺ', ...(VIRTUE ? [`«${data.hadiths.friday.quote.ar}»`, 'صحيح · رواه مسلم'] : [])])
    // The evening before the 13th (Sunday 22 November): the White Days alone, not also Monday.
    const sunday = ns.filter((n) => new Date(n.schedule.at).toISOString().startsWith('2026-11-22') && n.extra.kind.startsWith('fast'))
    expect(sunday.map((n) => n.extra.kind)).toEqual(['fastBid'])
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'scheduled-ar.json'), JSON.stringify(ns, null, 1))
  })

  test('in English, and the plan in English after a launch', async ({ page }) => {
    await asIosApp(page, 'en')
    await page.addInitScript(() => {
      localStorage.setItem('test.perm', 'granted')
      localStorage.setItem('muslim.extraReminders.v1', JSON.stringify({ friday: true, fastBid: true, fastMonThu: true, nameDay: true, fridayMin: 60, fastBidMin: 30, fastMonThuMin: 30, nameDayMin: 30 }))
    })
    const sec = await openSettings(page, 'en')
    for (const name of SWITCHES.en) await expect(sec.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'true')
    await sec.getByRole('switch', { name: SWITCHES.en[1] }).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await shot(page, 'settings-on-en', null)
    await expect.poll(async () => (await lastSchedule(page)).length).toBeGreaterThan(0)
    const ns = await lastSchedule(page)
    const bid = ns.find((n) => n.extra.kind === 'fastBid')!
    expect(bid.title).toBe('Fasting the White Days')
    expect(bid.body.split('\n')).toHaveLength(VIRTUE ? 4 : 1)
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'scheduled-en.json'), JSON.stringify(ns, null, 1))
  })
})

test.describe('0072-add30 §5: the page each reminder opens', () => {
  for (const [kind, lang, grade] of [
    ['friday', 'ar', 'صحيح'],
    ['fastBid', 'ar', 'حديث أبي ذر حسن.'],
    ['fastMonThu', 'ar', 'صحيح'],
    ['nameDay', 'ar', 'صحيح'],
    ['fastBid', 'en', 'حديث أبي ذر حسن.'],
    ['nameDay', 'en', 'صحيح'],
  ] as const)
    test(`${kind} (${lang}): the hadith whole from the app's copy, its grade as written, the link to HadeethEnc`, async ({ page }) => {
      // The hadith comes from the app's own copy with no network: only the native build has it (dist/offline).
      const copy = await page.request.get('/offline/manifest.json').catch(() => null)
      test.skip(VIRTUE && !(copy?.ok() && (copy.headers()['content-type'] ?? '').includes('json')), 'needs the native build (npm run build:native): the hadith is read from its offline copy')
      await asIosApp(page, lang)
      await page.goto(`/today/reminder/${kind}?lang=${lang}`)
      const card = page.getByTestId('reminder-page')
      await expect(card.locator('.tool-btn')).toBeVisible()
      if (!VIRTUE) {
        // Before the approval: the line and the way on, no hadith.
        await expect(card.getByTestId('reminder-hadith')).toHaveCount(0)
        if (kind === 'nameDay') await expect(card.getByTestId('reminder-name')).toHaveText('الحميد')
        await shot(page, `page-${kind}-${lang}`)
        return
      }
      await expect(card.getByTestId('reminder-hadith')).toBeVisible({ timeout: 30_000 })
      await expect(card.locator('.tool-badge')).toContainText(grade)
      // 19 November 2026 is the 29th day from the names file's epoch (22 October): its 29th entry.
      if (kind === 'nameDay') await expect(card.getByTestId('reminder-name')).toHaveText('الحميد')
      await shot(page, `page-${kind}-${lang}`)
      await card.locator('.tool-source').click()
      await expect(page.locator(`a[href="https://hadeethenc.com/${lang}/browse/hadith/${{ friday: '65928', fastBid: '10108', fastMonThu: '5908', nameDay: '64673' }[kind]}"]`)).toBeVisible()
    })
})

test.describe('0072-add30 §5: each notification as the Lock Screen shows it (imitated, as the alerts spec’s banners)', () => {
  test.skip(!SHOTS, 'shots only')
  test('banners from what the app scheduled', async ({ page }) => {
    const icon = fs.readFileSync(path.resolve(import.meta.dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon.png')).toString('base64')
    for (const lang of ['ar', 'en'] as const) {
      const ns = JSON.parse(fs.readFileSync(path.join(SHOTS, `scheduled-${lang}.json`), 'utf8')) as Sched[]
      const picks: [string, Sched | undefined][] = [
        ['friday', ns.find((n) => n.extra.kind === 'friday')],
        ['fastBid', ns.find((n) => n.extra.kind === 'fastBid')],
        ['fastMon', ns.find((n) => n.extra.kind === 'fastMonThu' && /الاثنين|Monday/.test(n.title))],
        ['fastThu', ns.find((n) => n.extra.kind === 'fastMonThu' && /الخميس|Thursday/.test(n.title))],
        ['nameDay', ns.find((n) => n.extra.kind === 'nameDay')],
      ]
      for (const [name, n] of picks) {
        expect(n, `${lang} ${name}`).toBeTruthy()
        const rtl = lang === 'ar'
        const t = new Date(n!.schedule.at)
        const clock = new Intl.DateTimeFormat(rtl ? 'ar-SA-u-nu-arab' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }).format(t)
        await page.setViewportSize({ width: 430, height: 932 })
        await page.setContent(`<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
          body{margin:0;width:430px;height:932px;background:linear-gradient(180deg,#1E3A6B,#3A5D8F 55%,#C9A24A);font-family:-apple-system,'SF Pro Text','IBM Plex Sans Arabic',system-ui,sans-serif;overflow:hidden}
          .clock{color:rgba(255,255,255,.95);font:700 96px/1 -apple-system,system-ui,sans-serif;text-align:center;margin-top:96px}
          .b{position:absolute;left:10px;right:10px;bottom:140px;background:rgba(255,255,255,.86);border-radius:22px;padding:14px;display:flex;gap:12px;align-items:flex-start;color:#000}
          .b img{width:38px;height:38px;border-radius:9px;flex:none}
          .h{display:flex;justify-content:space-between;gap:8px;font-weight:600;font-size:15px}
          .h span{font-weight:400;font-size:13px;opacity:.6}
          .t{font-size:15px;line-height:1.35;margin-top:2px}.t div{unicode-bidi:plaintext;text-align:start}
        </style></head><body><div class="clock">${clock}</div><div class="b"><img src="data:image/png;base64,${icon}"><div style="flex:1"><div class="h">${n!.title}<span>${rtl ? 'الآن' : 'now'}</span></div><div class="t"></div></div></div></body></html>`)
        // Each line takes its direction from its own first letter, as iOS lays out a notification's paragraphs.
        await page.locator('.t').evaluate((el, body) => {
          for (const line of body.split('\n')) {
            const d = document.createElement('div')
            d.dir = 'auto'
            d.textContent = line
            el.append(d)
          }
        }, n!.body)
        await page.screenshot({ path: `${SHOTS}/notify-${name}-${lang}.png` })
      }
    }
  })
})
