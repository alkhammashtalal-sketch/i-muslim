// Add-on 0072-add26 §3 and §5: the app's line and the QR code at the foot of the share images, and the rules of the
// rating request (web/src/native/review-rules.ts): the three moments, the 120-day cap, the 7/5 rule and every «never».
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALERT_TAP_MS,
  ASK_TROUBLE_MS,
  daysBetween,
  EMPTY_REVIEW,
  inPrayerWindow,
  localDay,
  noteDay,
  parseReview,
  PRAYER_AFTER_MS,
  PRAYER_BEFORE_MS,
  REVIEW_CAP_MS,
  REVIEW_KEY,
  reviewDecision,
  sevenFive,
  type ReviewContext,
  type ReviewState,
} from '../../web/src/native/review-rules'
import { APP_STORE_URL, PLAY_STORE_URL, storeLink } from '../../web/src/native/share-text'
import { storeQrBox } from '../../web/src/v2/reading/share-image'
import { qrModules, qrSide } from '../../web/src/v2/reading/store-qr'
import { APP_NAME_ON_IMAGE, storeMark } from '../../web/src/v2/reading/store-mark'

const ROOT = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const DAY = 86_400_000
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('§3 the foot of the share images', () => {
  it('the line in the ten languages: «مسلم» ✦ App Store in Arabic, «·» elsewhere, never the letter i before the name', () => {
    expect(storeMark('ar', false)).toEqual({ line: '«مسلم» ✦ App Store', rtl: true, url: 'https://apps.apple.com/app/id6822315551' })
    expect(storeMark('en', false).line).toBe('Muslim · App Store')
    expect(storeMark('ur', false)).toMatchObject({ line: 'مسلم · App Store', rtl: true })
    expect(storeMark('hi', false).line).toBe('मुस्लिम · App Store')
    expect(storeMark('bn', false).line).toBe('মুসলিম · App Store')
    for (const l of LANGS) {
      const m = storeMark(l, false)
      expect(m.line.startsWith(APP_NAME_ON_IMAGE[l])).toBe(true)
      expect(m.line).not.toMatch(/i\s*(Muslim|مسلم)|iMuslim/)
      expect(m.rtl).toBe(l === 'ar' || l === 'ur')
      expect(m.url).toBe(APP_STORE_URL)
    }
    // an unknown language: the Arabic line
    expect(storeMark('xx', false).line).toBe('«مسلم» ✦ App Store')
  })

  it('Android: the App Store link until a Google Play link exists, then Google Play', () => {
    expect(PLAY_STORE_URL).toBeNull()
    expect(storeLink(true)).toEqual({ url: APP_STORE_URL, store: 'App Store' })
    expect(storeMark('ar', true).line).toBe('«مسلم» ✦ App Store')
    const play = 'https://play.google.com/store/apps/details?id=com.alkhammashtalal.imuslim'
    expect(storeLink(true, play)).toEqual({ url: play, store: 'Google Play' })
    expect(storeLink(false, play)).toEqual({ url: APP_STORE_URL, store: 'App Store' })
  })

  it('the QR code: version 3 (29 modules) for the App Store link, inside the frame with its quiet zone, by day and night', () => {
    const rows = qrModules(APP_STORE_URL)
    expect(rows.length).toBe(29)
    expect(rows.every((r) => r.length === 29)).toBe(true)
    expect(qrSide(APP_STORE_URL, 5)).toBe(145)
    // one module, importable by any picture (the closing card of add-on 0072-add30 §1)
    expect(read('web/src/v2/reading/store-qr.ts')).toMatch(/export function drawQr\(ctx: CanvasRenderingContext2D, url: string, s: QrStyle\)/)
    expect(read('web/src/v2/reading/share-image.ts')).not.toMatch(/from 'lean-qr'/)
    // the three finder patterns' dark corners
    for (const [x, y] of [[0, 0], [28, 0], [0, 28]]) expect(rows[y][x]).toBe(true)
    for (const [story, H] of [[true, 1920], [false, 1080]] as const) {
      const b = storeQrBox(H, story)
      // four modules of quiet zone, then the inner rule of the frame (56 px from the edge)
      expect(b.x - 4 * b.m).toBeGreaterThanOrEqual(56 + 8)
      expect(b.y + b.size + 4 * b.m).toBeLessThanOrEqual(H - 56 - 8)
    }
    const img = read('web/src/v2/reading/share-image.ts')
    // every image draws the foot; «مسلم» alone is gone from them
    expect(img.match(/drawStoreMark\(ctx, input\.store/g)?.length).toBe(3)
    expect(img).not.toMatch(/input\.appName/)
    for (const f of ['web/src/v2/reading/ShareSheet.tsx', 'web/src/v2/daily/names/NameShare.tsx', 'web/src/v2/daily/salaf/SalafShare.tsx']) expect(read(f)).toContain('store: storeMark(lang)')
  })

  it('lean-qr is pinned and recorded in COMPONENTS.csv; so is the review plugin', () => {
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['lean-qr']).toBe('2.7.4')
    expect(pkg.dependencies['@capawesome/capacitor-app-review']).toBe('8.1.0')
    const csv = read('docs/COMPONENTS.csv')
    expect(csv).toContain('library,lean-qr 2.7.4,')
    expect(csv).toContain('library,@capawesome/capacitor-app-review 8.1.0,')
  })
})

// A device first opened on 1 October 2026, local dates.
const at = (day: string, hm = '12:00') => Date.parse(`${day}T${hm}:00`)
const ctx = (day: string, o: Partial<ReviewContext> = {}): ReviewContext => ({ now: at(day), today: day, native: true, firstRun: false, prayerTimes: [], ...o })
const used = (days: string[], o: Partial<ReviewState> = {}): ReviewState => days.reduce(noteDay, { ...EMPTY_REVIEW, ...o })

describe('§5 the rating request: the rules', () => {
  const week = ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-06', '2026-10-07']

  it('the moments: a prayer lesson finished, a portion read, or the 7/5 rule', () => {
    const s = used(['2026-10-01', '2026-10-02'])
    expect(reviewDecision(s, 'lesson', ctx('2026-10-02'))).toEqual({ ask: true })
    expect(reviewDecision(s, 'ward', ctx('2026-10-02'))).toEqual({ ask: true })
    expect(reviewDecision(s, 'days', ctx('2026-10-02'))).toEqual({ ask: false, why: 'notYet' })
    expect(reviewDecision(used(week), 'days', ctx('2026-10-07'))).toEqual({ ask: true })
  })

  it('the 7/5 rule: seven days of use with five active days among the last seven', () => {
    expect(sevenFive(used(week), '2026-10-07')).toBe(true)
    // four active days: not yet
    expect(sevenFive(used(week.slice(0, 4)), '2026-10-06')).toBe(false)
    // five active days within six days of use: not yet (the seventh day is the first that counts)
    expect(sevenFive(used(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']), '2026-10-06')).toBe(false)
    expect(sevenFive(used(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']), '2026-10-07')).toBe(true)
    // five days long ago and one today: only the last seven days count
    expect(sevenFive(used(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-20']), '2026-10-20')).toBe(false)
    // a day counted once however many launches
    const s = used(['2026-10-01', '2026-10-01', '2026-10-01', '2026-10-07'])
    expect(s.days).toEqual(['2026-10-01', '2026-10-07'])
    expect(sevenFive(s, '2026-10-07')).toBe(false)
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1)
  })

  it('at most once in 120 days', () => {
    const asked = at('2026-10-02')
    const s = used(week, { asked })
    expect(reviewDecision(s, 'lesson', ctx('2026-10-07'))).toEqual({ ask: false, why: 'cap' })
    const before = new Date(asked + REVIEW_CAP_MS - 60_000)
    expect(reviewDecision(s, 'lesson', ctx(localDay(before), { now: before.getTime() }))).toEqual({ ask: false, why: 'cap' })
    const after = new Date(asked + REVIEW_CAP_MS)
    expect(reviewDecision(s, 'lesson', ctx(localDay(after), { now: after.getTime() }))).toEqual({ ask: true })
    // a clock set back before the last ask: still no
    expect(reviewDecision(s, 'lesson', ctx('2026-10-01', { now: asked - DAY }))).toMatchObject({ ask: false })
  })

  it('never on the first run, never on the first day of use, never on the web', () => {
    const s = used(['2026-10-01'])
    expect(reviewDecision(s, 'lesson', ctx('2026-10-01'))).toEqual({ ask: false, why: 'firstDay' })
    expect(reviewDecision(EMPTY_REVIEW, 'lesson', ctx('2026-10-01'))).toEqual({ ask: false, why: 'firstDay' })
    expect(reviewDecision(used(week), 'lesson', ctx('2026-10-07', { firstRun: true }))).toEqual({ ask: false, why: 'firstRun' })
    expect(reviewDecision(used(week), 'lesson', ctx('2026-10-07', { native: false }))).toEqual({ ask: false, why: 'web' })
  })

  it('never around a prayer: from 10 minutes before its time to 40 minutes after (the adhan, the prayer, its alert)', () => {
    const s = used(week)
    const asr = at('2026-10-07', '15:20')
    const times = [at('2026-10-07', '04:40'), at('2026-10-07', '11:50'), asr]
    for (const dt of [-PRAYER_BEFORE_MS, 0, 5 * 60_000, PRAYER_AFTER_MS]) {
      expect(reviewDecision(s, 'ward', ctx('2026-10-07', { now: asr + dt, prayerTimes: times }))).toEqual({ ask: false, why: 'prayer' })
    }
    for (const dt of [-PRAYER_BEFORE_MS - 60_000, PRAYER_AFTER_MS + 60_000]) {
      expect(reviewDecision(s, 'ward', ctx('2026-10-07', { now: asr + dt, prayerTimes: times }))).toEqual({ ask: true })
    }
    expect(inPrayerWindow(asr, [])).toBe(false)
  })

  it('never in the half hour after an alert was opened', () => {
    const now = at('2026-10-07', '20:00')
    const s = used(week, { alertTap: now - 10 * 60_000 })
    expect(reviewDecision(s, 'ward', ctx('2026-10-07', { now }))).toEqual({ ask: false, why: 'alert' })
    expect(reviewDecision({ ...s, alertTap: now - ALERT_TAP_MS }, 'ward', ctx('2026-10-07', { now }))).toEqual({ ask: true })
  })

  it('never within a day of an error or a wait in «اسأل»', () => {
    const now = at('2026-10-07', '20:00')
    const s = used(week, { askTrouble: now - 3_600_000 })
    expect(reviewDecision(s, 'lesson', ctx('2026-10-07', { now }))).toEqual({ ask: false, why: 'ask' })
    expect(reviewDecision(s, 'days', ctx('2026-10-07', { now }))).toEqual({ ask: false, why: 'ask' })
    expect(reviewDecision({ ...s, askTrouble: now - ASK_TROUBLE_MS }, 'lesson', ctx('2026-10-07', { now }))).toEqual({ ask: true })
  })

  it('the stored record: one user key, read back whatever it holds', () => {
    expect(REVIEW_KEY).toMatch(/^muslim\./)
    const s = used(week, { asked: 5, askTrouble: 6, alertTap: 7 })
    expect(parseReview(JSON.stringify(s))).toEqual(s)
    for (const raw of [null, '', 'nonsense', '42', '{"days":"x"}', '[]']) expect(parseReview(raw)).toEqual(EMPTY_REVIEW)
    expect(parseReview('{"days":["2026-10-03","bad","2026-10-01","2026-10-03"]}')).toEqual({ ...EMPTY_REVIEW, first: '2026-10-01', days: ['2026-10-01', '2026-10-03'] })
  })

  it('wired: the lesson’s last step, the portion read, the launch and resume, the alert, «اسأل»; no «قيّمنا» button', () => {
    expect(read('web/src/lessons/prayer/lesson.js')).toMatch(/i === N - 1 && N > 1 && opts\.onFinished/)
    expect(read('web/src/lessons/prayer/lesson-prayer.tsx')).toContain("reviewMoment('lesson')")
    expect(read('web/src/v2/reading/Ward.tsx')).toContain("reviewMoment('ward')")
    const nd = read('web/src/native/NativeDevice.tsx')
    expect(nd.match(/reviewMoment\('days'\)/g)?.length).toBe(2)
    expect(nd).toContain('noteAlertTap()')
    expect(read('web/src/api/client.ts').match(/noteAskTrouble\(\)/g)?.length).toBeGreaterThanOrEqual(3)
    const review = read('web/src/native/review.ts')
    expect(review).toContain("import('@capawesome/capacitor-app-review')")
    expect(review).toMatch(/if \(!isNative\(\)\) return/)
    // nowhere a button or a link that asks for a rating
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    const src = walk(path.join(ROOT, 'web/src')).filter((f) => /\.tsx$/.test(f) || /[/\\]i18n[/\\]/.test(f))
    for (const f of src) expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/قيّمنا|قيمنا|Rate us|action=write-review|openAppStore/)
    // the iPhone's plugin list and Package.swift carry the review plugin (cap sync ios); Android's gradle too
    expect(read('web/ios/App/CapApp-SPM/Package.swift')).toContain('path: "../../../node_modules/@capawesome/capacitor-app-review"')
    expect(read('web/android/capacitor.settings.gradle')).toContain("include ':capawesome-capacitor-app-review'")
  })
})
