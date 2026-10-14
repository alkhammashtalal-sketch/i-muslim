// The iOS widgets' data (reply 0046). The app computes, the widgets show: this builds the file the widgets read from
// the App Group (web/ios/App/MuslimWidgets/WidgetData.swift is its contract), from the app's own engines and data:
//   - the prayer times of 60 days from prayer.ts (dayTimes, with the user's method and Asr setting), with the middle
//     and the last third of the night, each written as the times screen writes it (timeOf);
//   - the Hijri date of each day as the day card's disc writes it (hijriDisc), and the Gregorian as the app does;
//   - the ayah of each day by the card's own rule (dailyAyah) with its text from the app (getAyah: offline in the app);
//   - the hadith of each day by the server's own rule (hadithOfDay, /api/today/days), Arabic as served;
//   - the tasbih's state and words (tasbih-model.ts) and today's adhkar counts (adhkar-model.ts).
// Nothing personal leaves the phone here: the only request is /api/today/days, which carries no place.
// The widget's «+١» writes the tasbih back into the same file; the app reads it when it opens (syncWidgets).
import { registerPlugin } from '@capacitor/core'
import type { Lang } from '../../../shared/api'
import { getAyah } from '../quran/api'
import { api } from '../api/base'
import { dayTimes, ymdIn, type Ymd } from '../daily/prayer'
import { savedPlace, type Place } from '../daily/location'
import { isLang, langMeta, STRINGS } from '../i18n'
import { dailyAyah } from '../v2/home/daily-ayah'
import { hijriDisc } from '../v2/home/hijri-disc'
import { fill, gregorianText, num, timeOf } from '../v2/daily/format'
import { cityName, nearestCity } from '../v2/daily/place'
import { loadPrayerPrefs } from '../v2/daily/store'
import { TODAY } from '../v2/daily/strings-today'
import { getAdhkar, getToolHadith } from '../v2/daily/api'
import { ADHKAR_SPLIT, countKey, loadCounts, MORNING_EVENING, partItems, type AdhkarPart as ListPart } from '../v2/daily/adhkar/adhkar-model'
import { loadTasbih, TASBIH_HADITHS, TASBIH_KEY, tasbihSteps, tasbihToday, tasbihWords } from '../v2/daily/tasbih/tasbih-model'
import countsData from '../../../data/adhkar-counts.json'
import { platform } from './platform'
import { WIDGET_STRINGS, type WidgetKind } from './widget-strings'

export const WIDGET_DAYS = 60
const DAY = 86_400_000

export type WidgetTime = { key: string; name: string; at: number; text: string; prayer: boolean }
export type WidgetDay = {
  date: string
  start: number
  end: number
  weekday: string
  gregorian: string
  gregorianShort: string
  hijri: { day: string; month: string; year: string; text: string }
  times: WidgetTime[]
  ayah: { text: string; ref: string; url: string } | null
  hadith: { text: string; grade: string; attribution: string; url: string } | null
}
export type WidgetTasbih = { steps: { zikr: string; target: number }[]; step: number; n: number; after: boolean; total: number; day: string; digits: string; changedByWidget?: boolean }
export type WidgetData = {
  v: 1
  lang: Lang
  rtl: boolean
  built: number
  place: { name: string; tz: string } | null
  labels: Omit<(typeof WIDGET_STRINGS)['ar'], 'names' | 'midnight' | 'lastThird' | 'morning' | 'evening' | 'of'> & { names: Record<WidgetKind, { name: string; desc: string }> }
  days: WidgetDay[]
  tasbih: WidgetTasbih
  adhkar: { day: string; morning: AdhkarPart; evening: AdhkarPart }
}
type AdhkarPart = { title: string; progress: string; none: string; fraction: number; url: string }

/** The instant of 00:00 on a civil date in a time zone (offsets read from Intl; two passes cover a change that day). */
export function zonedMidnight(day: Ymd, timeZone: string): number {
  const offset = (at: number) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at)
    const v = (t: string) => Number(p.find((x) => x.type === t)?.value)
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - at
  }
  const utc = Date.UTC(day.y, day.m - 1, day.d)
  let at = utc - offset(utc)
  at = utc - offset(at)
  return at
}

const ymdText = (d: Ymd) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
const nextYmd = (d: Ymd): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d) + DAY)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

function settings(): { lang: Lang; content: string } {
  try {
    const s = JSON.parse(localStorage.getItem('imuslim.settings.v1') ?? '{}') as { lang?: string; content?: string }
    const lang = isLang(s.lang) ? s.lang : 'ar'
    return { lang, content: typeof s.content === 'string' ? s.content : lang }
  } catch {
    return { lang: 'ar', content: 'ar' }
  }
}

async function placeName(place: Place, lang: Lang): Promise<string> {
  if (place.source === 'city' && place.name) return place.name
  const near = await nearestCity(place).catch(() => null)
  return near ? cityName(near, lang) : ''
}

/** The hadith of each day from the server's own rule; null for every day when it cannot be reached. Asked once per
 *  Riyadh day (the server's day) and kept for three hours, not at every tasbih press that rewrites the file. */
let hadithMemo: { day: string; at: number; map: Map<string, WidgetDay['hadith']> } | null = null
async function hadithDays(n: number, now: Date): Promise<Map<string, WidgetDay['hadith']>> {
  const day = new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10)
  const age = now.getTime() - (hadithMemo?.at ?? 0)
  if (hadithMemo && hadithMemo.day === day && age >= 0 && age < 3 * 3600_000) return hadithMemo.map
  const out = new Map<string, WidgetDay['hadith']>()
  try {
    const r = await fetch(api(`/api/today/days?n=${n}`))
    if (!r.ok) return out
    const j = (await r.json()) as { days: { day: string; hadith: { id: string; text: string; grade: string | null; attribution: string | null } | null }[] }
    for (const d of j.days)
      out.set(d.day, d.hadith ? { text: d.hadith.text, grade: d.hadith.grade ?? '', attribution: d.hadith.attribution ?? '', url: `imuslim://hadith/${d.hadith.id}` } : null)
    hadithMemo = { day, at: now.getTime(), map: out }
  } catch {
    // Offline: the days keep the hadith they had (syncWidgets merges with the file already written).
  }
  return out
}

/** The ten digits the app writes in a language. */
export const digitsOf = (lang: Lang) => Array.from({ length: 10 }, (_, i) => num(i, lang)).join('')

export async function buildWidgetData(now = new Date(), opts: { previous?: WidgetData | null } = {}): Promise<WidgetData> {
  const { lang, content } = settings()
  const w = WIDGET_STRINGS[lang]
  const t = TODAY[lang]
  const place = savedPlace()
  const tz = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const prefs = loadPrayerPrefs()
  const popts = { method: prefs.method, asr: prefs.asr }
  const hadiths = await hadithDays(WIDGET_DAYS, now)
  const before = new Map((opts.previous?.days ?? []).map((d) => [d.date, d]))

  const days: WidgetDay[] = []
  const ayahs: Promise<unknown>[] = []
  let ymd = ymdIn(now, tz)
  for (let k = 0; k < WIDGET_DAYS; k++, ymd = nextYmd(ymd)) {
    const start = zonedMidnight(ymd, tz)
    const end = zonedMidnight(nextYmd(ymd), tz)
    const noon = new Date(start + 12 * 3600_000)
    const date = ymdText(ymd)
    const disc = hijriDisc(lang, noon, tz)
    const times: WidgetTime[] = []
    if (place) {
      const d = dayTimes(place, ymd, popts)
      const put = (key: string, name: string, at: Date, prayer: boolean) => times.push({ key, name, at: at.getTime(), text: timeOf(at, lang, tz), prayer })
      put('fajr', t.prayers.fajr, d.fajr, true)
      put('sunrise', t.prayers.sunrise, d.sunrise, false)
      put('dhuhr', t.prayers.dhuhr, d.dhuhr, true)
      put('asr', t.prayers.asr, d.asr, true)
      put('maghrib', t.prayers.maghrib, d.maghrib, true)
      put('isha', t.prayers.isha, d.isha, true)
      put('midnight', w.midnight, d.midnight, false)
      put('lastThird', w.lastThird, d.lastThird, false)
    }
    // The ayah of the day by the card's rule, its text as the app has it; never shortened (the widget shows it whole
    // or invites to open it).
    // The sixty are asked together (the app's own copy of the Quran in the app, the server on the web).
    const pick = dailyAyah(noon.getTime())
    const index = days.length
    if (pick)
      ayahs.push(
        getAyah(pick.sura, pick.aya).then(
          (p) => {
            const a = p?.ayah
            if (!p || !a) return
            // As the day card writes it: the sura's name in Arabic, «Surah 2» otherwise (STRINGS.suraNum).
            const name = lang === 'ar' ? a.suraName : fill(STRINGS[lang].suraNum, { n: num(a.sura, lang) })
            days[index].ayah = { text: p.text, ref: `${name} • ${num(a.aya, lang)}`, url: `imuslim://quran/${a.sura}/${a.aya}` }
          },
          () => undefined,
        ),
      )
    days.push({
      date,
      start,
      end,
      weekday: gregorianText(noon, lang, { weekday: 'long' }, tz),
      gregorian: gregorianText(noon, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz),
      gregorianShort: gregorianText(noon, lang, { weekday: 'long', day: 'numeric', month: 'long' }, tz),
      hijri: { day: disc?.day ?? '', month: disc?.month ?? '', year: disc?.year ?? '', text: disc?.full ?? '' },
      times,
      ayah: before.get(date)?.ayah ?? null,
      hadith: hadiths.has(date) ? (hadiths.get(date) ?? null) : (before.get(date)?.hadith ?? null),
    })
  }

  await Promise.all(ayahs)

  // The tasbih as the screen counts it; its words cut from the hadiths (offline in the app).
  const st = loadTasbih()
  const texts = await Promise.all(TASBIH_HADITHS.map((id) => getToolHadith(id, content).catch(() => null)))
  const byId = Object.fromEntries(texts.filter(Boolean).map((r) => [r!.id, r!]))
  const haveTexts = TASBIH_HADITHS.every((id) => byId[id])
  const words = haveTexts ? tasbihWords(byId) : []
  const stepsAfter = haveTexts ? tasbihSteps(byId) : []
  const free = st.word < words.length ? words[st.word] : st.custom
  const tasbih: WidgetTasbih = {
    steps: st.after ? stepsAfter.map((x) => ({ zikr: x.label ?? x.words ?? '', target: x.count })) : [{ zikr: free || words[0] || '', target: st.limit }],
    step: st.after ? st.step : 0,
    n: st.n,
    after: st.after,
    total: st.total,
    day: st.day,
    digits: digitsOf(lang),
  }

  // Today's adhkar counts in «أذكار الصباح والمساء»: the hadiths there that carry a counter, and those done. With the
  // two lists (0048-add1 §ب, once reviewed) each part reads its own list and counts, and opens it.
  const counters = new Map((countsData as { counts: { id: string; count: number }[] }).counts.map((c) => [c.id, c.count]))
  const items = await getAdhkar(MORNING_EVENING, content).then((r) => r.items, () => [])
  const counts = loadCounts()
  const part = (title: string, list: ListPart): AdhkarPart => {
    const mine = ADHKAR_SPLIT ? partItems(items, list) : items
    const withCount = mine.filter((h) => counters.has(h.id))
    const done = withCount.filter((h) => (counts[countKey(h.id, ADHKAR_SPLIT ? list : null)] ?? 0) >= counters.get(h.id)!).length
    const totalN = withCount.length
    return {
      title,
      progress: fill(w.of, { n: num(done, lang), t: num(totalN, lang) }),
      none: fill(w.of, { n: num(0, lang), t: num(totalN, lang) }),
      fraction: totalN ? done / totalN : 0,
      url: ADHKAR_SPLIT ? `imuslim://today/adhkar?part=${list}` : 'imuslim://today/adhkar',
    }
  }

  const { midnight: _m, lastThird: _l, morning, evening, of: _o, names, ...labels } = w
  return {
    v: 1,
    lang,
    rtl: langMeta(lang).dir === 'rtl',
    built: now.getTime(),
    place: place ? { name: await placeName(place, lang), tz } : null,
    labels: { ...labels, names },
    days,
    tasbih,
    adhkar: { day: tasbihToday(), morning: part(morning, 'morning'), evening: part(evening, 'evening') },
  }
}

type Bridge = { write(o: { json: string }): Promise<void>; read(): Promise<{ json: string | null }> }
const WidgetBridge = registerPlugin<Bridge>('WidgetBridge')

let busy: Promise<void> | null = null
let again = false

/** In the iOS app: read back what the widget counted, then write the widgets' data again. Several calls in a row
 *  run one after the other, the last one with the latest state. */
export function syncWidgets(): Promise<void> {
  if (platform() !== 'ios') return Promise.resolve()
  if (busy) {
    again = true
    return busy
  }
  busy = (async () => {
    try {
      const prev = await WidgetBridge.read().then((r) => (r.json ? (JSON.parse(r.json) as WidgetData) : null), () => null)
      // The widget's «+١»: its count becomes the screen's, for today.
      if (prev?.tasbih?.changedByWidget && prev.tasbih.day === tasbihToday()) {
        const st = loadTasbih()
        localStorage.setItem(TASBIH_KEY, JSON.stringify({ ...st, n: prev.tasbih.n, step: prev.tasbih.step, total: prev.tasbih.total, day: prev.tasbih.day }))
        window.dispatchEvent(new Event('muslim:tasbih'))
      }
      const data = await buildWidgetData(new Date(), { previous: prev })
      await WidgetBridge.write({ json: JSON.stringify(data) })
    } catch {
      // The widgets keep the file they have.
    } finally {
      busy = null
      if (again) {
        again = false
        void syncWidgets()
      }
    }
  })()
  return busy
}

let timer: ReturnType<typeof setTimeout> | null = null
/** After a change the widgets show (place, prayer settings, language, tasbih, adhkar): one sync a second later. */
export function requestWidgetSync() {
  if (platform() !== 'ios') return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void syncWidgets(), 1000)
}
