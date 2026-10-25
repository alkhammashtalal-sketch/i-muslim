// Add-on 0072-add30 §5: the optional reminders (Friday; fasting al-ayyam al-bid and Monday and Thursday, each the
// evening before; «اسم الله لليوم» in the morning), off by default, in the same 64 pending notifications as the bells
// and the adhkar reminders (web/src/native/bells.ts planAlerts, web/src/native/reminders.ts). Their hadiths
// (data/reminders.json) are checked here against HadeethEnc's rows when data/processed is there: every quote a verbatim
// part of the text, the grade and takhrij verbatim parts of the Arabic row, sahih or hasan only.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../../data/reminders.json'
import namesDaily from '../../data/names-daily.json'
import { hijriParts } from '../../web/src/daily/hijri'
import { dayTimes, ymdIn, type Ymd } from '../../web/src/daily/prayer'
import { ADHKAR_DEFAULTS, alertId, ALL_KINDS, IOS_PENDING_LIMIT, KINDS, PLAN_DAYS, planAlerts, type AdhkarTexts, type PlanInput } from '../../web/src/native/bells'
import { applyLocal, reschedule, toNotification, type AlertContext, type NotifyApi } from '../../web/src/native/notify'
import { REMINDER_TEXT } from '../../web/src/native/reminder-strings'
import {
  EXTRA_DEFAULTS,
  EXTRA_MINUTES,
  fastingFor,
  hadithLines,
  nameOfRiyadhDay,
  readExtra,
  REMINDER_HADITHS,
  REMINDER_KINDS,
  reminderHadithIds,
  reminderPath,
  REMINDER_VIRTUE,
  remindersOfDay,
  riyadhDay,
  type ExtraReminders,
} from '../../web/src/native/reminders'
import { parseRoute } from '../../web/src/quran/route'
import { toolHadithIds } from '../../web/scripts/native-offline-gen'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RIYADH = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh' }
const ALL = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
const TEXTS: AdhkarTexts = { title: 'مسلم', morning: 'أذكار الصباح', evening: 'أذكار المساء', morningUrl: '/today/adhkar', eveningUrl: '/today/adhkar' }
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const on = (p: Partial<ExtraReminders>): ExtraReminders => ({ ...EXTRA_DEFAULTS, ...p })
const plan = (p: Partial<PlanInput> & { now: Date }) =>
  planAlerts({ place: RIYADH, bells: [], ward: false, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', adhkarTexts: TEXTS, virtue: true, ...p })
const ymd = (s: string): Ymd => ({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) })
const dayOf = (at: number) => {
  const d = ymdIn(new Date(at), RIYADH.timeZone)
  return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
}
const times = (d: Ymd) => dayTimes(RIYADH, d, { method: 'UmmAlQura', asr: 'shafi' })

describe('the hadiths behind REMINDER_VIRTUE, off until the coordinator approves them (add-on 0072-add34 §أ3)', () => {
  it('off: each reminder is its own line only; no hadith, no quote, no grade', () => {
    expect(REMINDER_VIRTUE).toBe(false)
    const now = new Date('2026-11-18T09:00:00Z')
    const p = plan({ now, virtue: undefined, extra: on({ friday: true, fastBid: true, fastMonThu: true, nameDay: true }) })
    expect(p.length).toBeGreaterThan(50)
    for (const a of p) expect(a.body.split('\n'), a.kind).toHaveLength(1)
    expect(p.find((a) => a.kind === 'friday')!.body).toBe('سورة الكهف، والإكثار من الصلاة على النبي ﷺ')
    for (const k of REMINDER_KINDS) for (const l of LANGS) expect(hadithLines(k, l)).toEqual([])
  })
})

describe('settings: off by default, minutes among the offered ones', () => {
  it('all four off; a bad stored value falls back', () => {
    expect(REMINDER_KINDS).toEqual(['friday', 'fastBid', 'fastMonThu', 'nameDay'])
    expect(readExtra(null)).toEqual(EXTRA_DEFAULTS)
    for (const k of REMINDER_KINDS) expect(EXTRA_DEFAULTS[k]).toBe(false)
    expect(readExtra({ friday: 'yes' as unknown as boolean, fridayMin: 7, nameDay: true, nameDayMin: 45 })).toEqual({ ...EXTRA_DEFAULTS, nameDay: true, nameDayMin: 45 })
    expect(EXTRA_MINUTES).toEqual([5, 15, 30, 45, 60])
  })

  it('with all of them off the plan is exactly what it was', () => {
    const now = new Date('2026-10-25T09:00:00Z')
    const before = planAlerts({ place: RIYADH, bells: ALL, ward: true, adhkar: { ...ADHKAR_DEFAULTS, morning: true }, adhkarTexts: TEXTS, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now })
    expect(planAlerts({ place: RIYADH, bells: ALL, ward: true, adhkar: { ...ADHKAR_DEFAULTS, morning: true }, adhkarTexts: TEXTS, extra: EXTRA_DEFAULTS, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now })).toEqual(before)
  })
})

describe('ids: thirteen kinds within the sixteen slots a day', () => {
  it('unique across kinds and days, under 2^31', () => {
    expect(ALL_KINDS).toEqual([...KINDS, 'adhkarMorning', 'adhkarEvening', ...REMINDER_KINDS])
    expect(ALL_KINDS.length).toBeLessThanOrEqual(15)
    const ids = new Set<number>()
    for (let k = 0; k < 400; k++) for (const kind of ALL_KINDS) ids.add(alertId({ y: 2026, m: 10, d: 13 + k }, kind))
    expect(ids.size).toBe(400 * ALL_KINDS.length)
    expect(Math.max(...ids)).toBeLessThan(2 ** 31)
  })
})

describe('Friday', () => {
  const now = new Date('2026-10-25T09:00:00Z') // a Sunday in Riyadh
  it('only on Fridays, an hour after sunrise by default, then the chosen minutes', () => {
    const p = plan({ now, extra: on({ friday: true }) })
    expect(p.length).toBeGreaterThanOrEqual(8)
    for (const a of p) {
      expect(a.kind).toBe('friday')
      const d = ymd(dayOf(a.at))
      expect(new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()).toBe(5)
      expect(a.at).toBe(times(d).sunrise.getTime() + 60 * 60_000)
    }
    expect(dayOf(p[0].at)).toBe('2026-10-30')
    const q = plan({ now, extra: on({ friday: true, fridayMin: 15 }) })
    expect(q[0].at).toBe(times(ymd('2026-10-30')).sunrise.getTime() + 15 * 60_000)
  })

  it('its text: our line, then the hadith (Arabic), its grade and takhrij as HadeethEnc writes them, and its page', () => {
    const a = plan({ now, extra: on({ friday: true }) })[0]
    expect(a).toMatchObject({ title: 'يوم الجمعة', url: '/today/reminder/friday' })
    expect(a.body.split('\n')).toEqual(['سورة الكهف، والإكثار من الصلاة على النبي ﷺ', `«${data.hadiths.friday.quote.ar}»`, 'صحيح · رواه مسلم'])
    // English: HadeethEnc has no English row of 65928, so the Arabic alone, never a translation of ours.
    const en = plan({ now, lang: 'en', extra: on({ friday: true }) })[0]
    expect(en.body.split('\n')).toEqual(['Surat al-Kahf, and sending much salawat on the Prophet ﷺ', `«${data.hadiths.friday.quote.ar}»`, 'صحيح · رواه مسلم'])
  })
})

describe('al-ayyam al-bid (Umm al-Qura, with the offset)', () => {
  // 13 Jumada al-Ula 1448 is Monday 23 November 2026 in Umm al-Qura (Intl islamic-umalqura).
  it('the engine knows the date', () => {
    expect(hijriParts(new Date(Date.UTC(2026, 10, 23, 12)), 0, 'UTC')).toEqual({ day: 13, month: 6, year: 1448 })
  })

  const now = new Date('2026-11-18T09:00:00Z')
  const evenings = (offset: number) =>
    plan({ now, hijriOffset: offset, extra: on({ fastBid: true }) })
      .filter((a) => a.at < Date.UTC(2026, 11, 1))
      .map((a) => [dayOf(a.at), a.body.split('\n')[0]])

  it('offset 0: the evenings before the 13th, 14th and 15th, after Maghrib by the chosen minutes', () => {
    expect(evenings(0)).toEqual([
      ['2026-11-22', 'غدًا الثالث عشر من الشهر الهجري'],
      ['2026-11-23', 'غدًا الرابع عشر من الشهر الهجري'],
      ['2026-11-24', 'غدًا الخامس عشر من الشهر الهجري'],
    ])
    const a = plan({ now, extra: on({ fastBid: true }) })[0]
    expect(a.at).toBe(times(ymd('2026-11-22')).maghrib.getTime() + 30 * 60_000)
    expect(plan({ now, extra: on({ fastBid: true, fastBidMin: 5 }) })[0].at).toBe(times(ymd('2026-11-22')).maghrib.getTime() + 5 * 60_000)
  })

  it('offset +1: a day earlier; offset −1: a day later', () => {
    expect(evenings(1).map((x) => x[0])).toEqual(['2026-11-21', '2026-11-22', '2026-11-23'])
    expect(evenings(-1).map((x) => x[0])).toEqual(['2026-11-23', '2026-11-24', '2026-11-25'])
  })

  it('none in Ramadan; in Dhu al-Hijjah not the 13th (a day of Tashreeq), only the 14th and 15th', () => {
    // Ramadan 1448: 1 Ramadan is 8 February 2027.
    const r = plan({ now: new Date('2027-02-09T09:00:00Z'), extra: on({ fastBid: true }) }).filter((a) => a.at < Date.UTC(2027, 2, 8))
    expect(r).toEqual([])
    // 13 Dhu al-Hijjah 1448 is 19 May 2027.
    const d = plan({ now: new Date('2027-05-10T09:00:00Z'), extra: on({ fastBid: true }) }).filter((a) => a.at < Date.UTC(2027, 4, 31))
    expect(d.map((a) => [dayOf(a.at), a.body.split('\n')[0]])).toEqual([
      ['2027-05-19', 'غدًا الرابع عشر من الشهر الهجري'],
      ['2027-05-20', 'غدًا الخامس عشر من الشهر الهجري'],
    ])
  })

  it('its hadith: Abu Dharr’s words, the grade and takhrij of that narration as the row writes them', () => {
    const lines = hadithLines('fastBid', 'ar', true)
    expect(lines).toEqual([`«${data.hadiths.fastBid.quote.ar}»`, 'حديث أبي ذر حسن · حديث أبي ذر رواه الترمذي والنسائي وأحمد'])
    // The reader's language from HadeethEnc after the Arabic, never in place of it.
    expect(hadithLines('fastBid', 'en', true)).toEqual([`«${data.hadiths.fastBid.quote.ar}»`, `“${data.hadiths.fastBid.quote.en}”`, lines[1]])
    // Malay: HadeethEnc has no Malay row: the Arabic alone.
    expect(hadithLines('fastBid', 'ms', true)).toEqual(lines)
  })
})

describe('Monday and Thursday', () => {
  it('Sunday and Wednesday evenings; one reminder when tomorrow is also one of al-ayyam al-bid', () => {
    const now = new Date('2026-11-18T09:00:00Z') // Wednesday
    const p = plan({ now, extra: on({ fastMonThu: true }) }).filter((a) => a.at < Date.UTC(2026, 11, 1))
    expect(p.map((a) => [dayOf(a.at), a.title, a.body.split('\n')[0]])).toEqual([
      ['2026-11-18', 'صيام الخميس', 'غدًا الخميس'],
      ['2026-11-22', 'صيام الاثنين', 'غدًا الاثنين'],
      ['2026-11-25', 'صيام الخميس', 'غدًا الخميس'],
      ['2026-11-29', 'صيام الاثنين', 'غدًا الاثنين'],
    ])
    // Monday 23 November is 13 Jumada al-Ula: with both on, that Sunday evening has the White Days' reminder alone.
    const both = plan({ now, extra: on({ fastMonThu: true, fastBid: true }) }).filter((a) => dayOf(a.at) === '2026-11-22')
    expect(both.map((a) => a.kind)).toEqual(['fastBid'])
    expect(fastingFor(ymd('2026-11-22'), 0, { fastBid: true, fastMonThu: true })).toEqual({ bid: 13 })
    expect(fastingFor(ymd('2026-11-22'), 0, { fastBid: false, fastMonThu: true })).toEqual({ monThu: 'mon' })
    // With offset −1 the 13th is Tuesday, so the Monday's own reminder stays.
    expect(fastingFor(ymd('2026-11-22'), -1, { fastBid: true, fastMonThu: true })).toEqual({ monThu: 'mon' })
  })

  it('not on the eve of an Eid day or a day of Tashreeq, nor in Ramadan', () => {
    // 11 Dhu al-Hijjah 1448 (Tashreeq) is Monday 17 May 2027; 1 Shawwal is Tuesday 9 March; Thursday 11 February is in Ramadan.
    expect(fastingFor(ymd('2027-05-16'), 0, { fastBid: false, fastMonThu: true })).toEqual({})
    expect(fastingFor(ymd('2027-02-10'), 0, { fastBid: false, fastMonThu: true })).toEqual({})
    // The Thursday after the Eid of Adha (14 Dhu al-Hijjah, 20 May) is one of al-ayyam al-bid; without it, Monday-Thursday.
    expect(fastingFor(ymd('2027-05-19'), 0, { fastBid: false, fastMonThu: true })).toEqual({ monThu: 'thu' })
    expect(fastingFor(ymd('2027-05-19'), 0, { fastBid: true, fastMonThu: true })).toEqual({ bid: 14 })
  })

  it('its hadith: the first narration of 5908, sahih, at-Tirmidhi', () => {
    expect(hadithLines('fastMonThu', 'ar', true)).toEqual([`«${data.hadiths.fastMonThu.quote.ar}»`, 'صحيح · حديث أبي هريرة الأول رواه الترمذي'])
  })
})

describe('«اسم الله لليوم»', () => {
  it('the names file’s rotation, by the Riyadh date: the same list and epoch', () => {
    expect(data.names.epoch).toBe(namesDaily.epoch)
    expect(data.names.list).toEqual(namesDaily.entries.map((e) => e.name))
    expect(nameOfRiyadhDay('2026-10-22')).toBe(namesDaily.entries[0].name)
    expect(nameOfRiyadhDay('2026-10-23')).toBe(namesDaily.entries[1].name)
    expect(nameOfRiyadhDay('2026-10-21')).toBe(namesDaily.entries[namesDaily.entries.length - 1].name)
  })

  it('every morning after sunrise, the day’s name, the hadith of the ninety-nine names', () => {
    const now = new Date('2026-10-25T09:00:00Z')
    const p = plan({ now, extra: on({ nameDay: true }) })
    expect(p).toHaveLength(PLAN_DAYS - 1)
    for (const a of p) {
      expect(a.at).toBe(times(ymd(dayOf(a.at))).sunrise.getTime() + 30 * 60_000)
      expect(a.body.split('\n')[0]).toBe(nameOfRiyadhDay(riyadhDay(a.at)))
    }
    expect(p[0]).toMatchObject({ title: 'اسم الله لليوم', url: '/today/reminder/nameDay' })
    expect(p[0].body.split('\n').slice(1)).toEqual([`«${data.hadiths.nameDay.quote.ar}»`, 'صحيح · متفق عليه'])
  })
})

describe('the 64 (iOS), shared with everything', () => {
  const now = new Date('2026-11-18T09:00:00Z')
  const allOn = on({ friday: true, fastBid: true, fastMonThu: true, nameDay: true })
  it('everything on: 64, in time order, after now, unique ids; the days planned follow what is on', () => {
    const p = plan({ now, bells: ALL, ward: true, adhkar: { ...ADHKAR_DEFAULTS, morning: true, evening: true }, extra: allOn })
    expect(p).toHaveLength(IOS_PENDING_LIMIT)
    expect(new Set(p.map((a) => a.id)).size).toBe(64)
    for (let i = 1; i < p.length; i++) expect(p[i].at).toBeGreaterThanOrEqual(p[i - 1].at)
    expect(p.every((a) => a.at > now.getTime())).toBe(true)
    // Nine a day and the name: six days and a little; the Friday, a Monday-Thursday eve and the eve of the 13th inside them.
    const days = new Set(p.map((a) => dayOf(a.at)))
    expect(days.size).toBeLessThanOrEqual(7)
    for (const k of ['friday', 'fastBid', 'fastMonThu', 'nameDay']) expect(p.some((a) => a.kind === k), k).toBe(true)
    // The bells alone reach further (nine days): the reminders take their share of the 64.
    const bells = plan({ now, bells: ALL, ward: true })
    expect(new Set(bells.map((a) => dayOf(a.at))).size).toBeGreaterThan(days.size)
  })

  it('combinations: one bell and the reminders; the reminders alone reach the plan’s 60 days', () => {
    const p = plan({ now, bells: ['fajr'], extra: on({ friday: true, fastBid: true }) })
    // 60 Fajrs, 8 Fridays and 6 eves would be 74: the 64 come first, so the plan stops a week short of 60 days.
    expect(p).toHaveLength(64)
    expect(p.filter((a) => a.kind === 'fastBid').map((a) => dayOf(a.at))).toEqual(['2026-11-22', '2026-11-23', '2026-11-24', '2026-12-21', '2026-12-22', '2026-12-23'])
    expect(p.filter((a) => a.kind === 'friday').length).toBeGreaterThanOrEqual(7)
    const alone = plan({ now, extra: on({ fastBid: true, fastMonThu: true, friday: true }) })
    const last = Math.max(...alone.map((a) => a.at))
    expect(last - now.getTime()).toBeGreaterThan(55 * 86_400_000)
    expect(last - now.getTime()).toBeLessThan(PLAN_DAYS * 86_400_000)
    // The name every morning and all the bells: 64, never more.
    expect(plan({ now, bells: ALL, ward: true, extra: on({ nameDay: true }) })).toHaveLength(64)
  })

  it('rings with the adhkar reminders’ sound; a tap asks for the permission only when one is turned on', async () => {
    const a = plan({ now, extra: on({ friday: true }) })[0]
    expect(toNotification(a, false, 'ios', { choice: 'calm', ready: {} })).toMatchObject({ sound: 'muslim-calm.caf', extra: { url: '/today/reminder/friday', kind: 'friday' } })
    const st = { display: 'prompt' as string, asked: 0, pending: [] as { id: number }[] }
    const api = {
      checkPermissions: async () => ({ display: st.display }),
      requestPermissions: async () => (st.asked++, (st.display = 'granted'), { display: st.display }),
      getPending: async () => ({ notifications: st.pending }),
      cancel: async () => void (st.pending = []),
      schedule: async ({ notifications }: { notifications: { id: number }[] }) => ((st.pending = notifications.slice(0, 64)), { notifications }),
      checkExactNotificationSetting: async () => ({ exact_alarm: 'denied' }),
    } as unknown as NotifyApi
    const ctx: AlertContext = { place: { ...RIYADH, source: 'city' }, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', platform: 'ios', adhkarTexts: TEXTS, hijriOffset: 0 }
    // A reschedule never asks.
    expect(await reschedule(api, { bells: [], ward: false, extra: on({ nameDay: true }) }, ctx)).toBe(0)
    expect(st.asked).toBe(0)
    expect(await applyLocal(api, { bells: [], ward: false, extra: on({ nameDay: true }) }, ctx, () => undefined)).toBe('ok')
    expect(st.asked).toBe(1)
    expect(st.pending.length).toBeGreaterThan(50)
    expect(await applyLocal(api, { bells: [], ward: false, extra: EXTRA_DEFAULTS }, ctx, () => undefined)).toBe('ok')
    expect(st.pending).toEqual([])
    expect(st.asked).toBe(1)
  })
})

describe('the words: ten languages, our tone', () => {
  it('every language has every text; no exclamation; the Arabic has no Latin letters', () => {
    const keys = Object.keys(REMINDER_TEXT.ar)
    for (const l of LANGS) {
      expect(Object.keys(REMINDER_TEXT[l]).sort(), l).toEqual([...keys].sort())
      const all = JSON.stringify(REMINDER_TEXT[l])
      expect(all, l).not.toMatch(/[!！¡]/)
      for (const k of ['fridayWhen', 'fastBidWhen', 'fastMonThuWhen', 'nameDayWhen'] as const) expect(REMINDER_TEXT[l][k], `${l} ${k}`).toContain('{n}')
    }
    const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : values(v)))
    for (const v of values(REMINDER_TEXT.ar)) expect(v.replaceAll('{n}', ''), v).not.toMatch(/[A-Za-z]/)
  })

  it('every reminder in every language: the Arabic quote always, the grade line last, the page by its kind', () => {
    for (const l of LANGS)
      for (const k of REMINDER_KINDS) {
        const lines = hadithLines(k, l, true)
        expect(lines[0]).toBe(`«${REMINDER_HADITHS[k]!.quote.ar}»`)
        expect(lines.at(-1)).toBe(`${REMINDER_HADITHS[k]!.gradeAr} · ${REMINDER_HADITHS[k]!.attributionAr}`)
        expect(lines).toHaveLength(l !== 'ar' && REMINDER_HADITHS[k]!.quote[l] ? 3 : 2)
      }
    for (const k of REMINDER_KINDS) expect(parseRoute(reminderPath(k))).toEqual({ view: 'today', tool: 'reminder' })
  })

  it('the page’s hadiths go into the app’s offline copy while they are shown', () => {
    const ids = toolHadithIds()
    for (const id of reminderHadithIds()) expect(ids).toContain(id)
    expect(reminderHadithIds(true)).toEqual(['65928', '10108', '5908', '64673'])
    expect(reminderHadithIds(false)).toEqual([])
  })
})

// The hadiths against HadeethEnc's own rows (data/processed is outside git: skipped where it is absent).
const JSONL = path.join(ROOT, 'data/processed/hadith.jsonl')
const GRADES = path.join(ROOT, 'data/processed/hadith_grades.json')
describe.skipIf(!fs.existsSync(JSONL))('the hadiths, letter for letter as in HadeethEnc', () => {
  it('quotes are verbatim parts of the text; grade and takhrij verbatim parts of the Arabic row; sahih or hasan; every translation quoted', () => {
    const want = new Set(Object.values(data.hadiths).map((h) => h.id))
    const rows = new Map<string, { hadeeth: string; grade: string; attribution: string; version: string }>()
    for (const line of fs.readFileSync(JSONL, 'utf8').split('\n')) {
      if (!line) continue
      const m = /"id":"(\d+)"/.exec(line)
      if (!m || !want.has(m[1])) continue
      const r = JSON.parse(line) as { id: string; lang: string; hadeeth: string; grade: string; attribution: string; version: string }
      rows.set(`${r.id}|${r.lang}`, r)
    }
    const classes = new Map((JSON.parse(fs.readFileSync(GRADES, 'utf8')) as { grade: string; class: string }[]).map((g) => [g.grade, g.class]))
    for (const [k, h] of Object.entries(data.hadiths)) {
      const ar = rows.get(`${h.id}|ar`)!
      expect(ar, k).toBeTruthy()
      expect(['sahih', 'hasan'], `${k} ${ar.grade}`).toContain(classes.get(ar.grade))
      expect(ar.grade, k).toContain(h.gradeAr)
      expect(ar.attribution, k).toContain(h.attributionAr)
      expect(ar.version).toBe(h.version)
      for (const [l, q] of Object.entries(h.quote as Record<string, string>)) expect(rows.get(`${h.id}|${l}`)?.hadeeth ?? '', `${k} ${l}`).toContain(q)
      const translated = LANGS.filter((l) => l !== 'ar' && rows.has(`${h.id}|${l}`))
      expect([...h.translated].sort(), k).toEqual([...translated].sort())
      for (const l of translated) expect(Object.keys(h.quote), `${k} ${l}`).toContain(l)
    }
  })
})

describe('the planner’s day: what remindersOfDay gives for one day', () => {
  it('a Friday that is also the eve of the 13th: both, each at its own time', () => {
    // Friday 18 June 2027 is 13 Muharram 1449; the eve of the 14th is that Friday evening.
    const d = ymd('2027-06-18')
    const r = remindersOfDay(d, times(d), on({ friday: true, fastBid: true }), 'ar', 0, true)
    expect(r.map((x) => x.kind)).toEqual(['friday', 'fastBid'])
    expect(r[1].body.split('\n')[0]).toBe('غدًا الرابع عشر من الشهر الهجري')
  })
})

// The review page's texts (relay/w1/0072-reminders/review.html): every reminder's exact title and body in the ten
// languages, as the planner gives them, written where REMINDER_REVIEW says (nothing is written otherwise).
describe.skipIf(!process.env.REMINDER_REVIEW)('review texts', () => {
  it('writes them', () => {
    const out: Record<string, Record<string, { title: string; body: string; url: string; when: string }[]>> = {}
    const days: [string, Partial<ExtraReminders>][] = [
      ['2026-11-20', { friday: true }],
      ['2026-11-22', { fastBid: true }],
      ['2026-11-23', { fastBid: true }],
      ['2026-11-24', { fastBid: true }],
      ['2026-11-29', { fastMonThu: true }],
      ['2026-11-25', { fastMonThu: true }],
      ['2026-11-19', { nameDay: true }],
    ]
    for (const l of LANGS) {
      out[l] = {}
      for (const [d, p] of days) {
        const day = ymd(d)
        for (const r of remindersOfDay(day, times(day), on(p), l, 0, true)) {
          const key = r.kind === 'fastMonThu' ? (r.title === REMINDER_TEXT[l].monTitle ? 'fastMon' : 'fastThu') : r.kind
          ;(out[l][key] ??= []).push({ title: r.title, body: r.body, url: r.url, when: d })
        }
      }
      out[l].settings = [{ title: '', body: JSON.stringify(REMINDER_TEXT[l]), url: '', when: '' }]
    }
    fs.writeFileSync(process.env.REMINDER_REVIEW!, JSON.stringify(out, null, 1))
  })
})
