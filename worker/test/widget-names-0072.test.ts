// Add-on 0072-add10 §1–§2: the widgets «اسم الله لليوم» and «من أقوال السلف» read their part of the widgets' file
// (web/src/native/widget-names.ts, written by widget-data.ts; contract relay/w1/0072-names-widget/data-contract.md).
// Checked here: the pages in the order of the name's page, every text as our data has it (the ayah whole, never cut),
// «القراءة» as whole sentences under its heading and cut only between sentences, the share links, the Riyadh day for
// everyone, the salaf saying as the home card, the sky's six states, and the strings in the ten languages.
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
vi.stubGlobal('localStorage', new MemStorage())
const realFetch = globalThis.fetch

const ROOT = path.resolve(__dirname, '../..')
const NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names-daily.json'), 'utf8')) as {
  epoch: string
  entries: { n: number; name: string; ayah: string | null; hadith: string | null; meaningAyah: string | null; duas: { kind: string; id: string }[]; tafsirOf: string | null; readings: { meaning: string; easy: string; deep: string[] } }[]
}

const W = await import('../../web/src/native/widget-names')
const { buildWidgetData, skyOfDay } = await import('../../web/src/native/widget-data')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')
const { salafOfDay, salafAttribution, salafSource } = await import('../../web/src/v2/daily/salaf/salaf-model')
const { nameDayIndex } = await import('../../worker/src/names-day')

const AYAH = (s: number, a: number) => `نص الآية ${s}:${a} كما في D1 بحروفه كاملًا من غير قص`
const SAADI = (s: number, a: number) => [`تفسير السعدي للآية ${s}:${a}، الفقرة الأولى.`, 'الفقرة الثانية.']
let readingsOn = true

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url, 'https://x.test')
    const day = u.pathname === '/api/names/day' ? u.searchParams.get('day')! : null
    if (day) {
      const index = nameDayIndex(day)
      const { readings, ...entry } = NAMES.entries[index] as (typeof NAMES.entries)[number] & { quranOnly?: boolean }
      return new Response(JSON.stringify({ day, index, count: NAMES.entries.length, entry, ...(readingsOn ? { readings } : {}) }))
    }
    const pass = u.pathname.match(/^\/api\/passage\/quran:(\d+):(\d+)$/)
    if (pass) {
      const [s, a] = [Number(pass[1]), Number(pass[2])]
      const ml = u.searchParams.get('ml')
      return new Response(
        JSON.stringify({
          id: `quran:${s}:${a}`,
          text: AYAH(s, a),
          ref: `x:${a}`,
          url: `https://quran.ksu.edu.sa/tafseer/saadi/sura${s}-aya${a}.html`,
          ayah: { sura: s, aya: a, page: 1, suraName: 'الإخلاص', suraAyat: 4 },
          text_en: `Meaning ${s}:${a} (Sahih International)`,
          ...(ml && ml !== 'ar' ? { meaning: { lang: ml, text: `Meaning ${ml} ${s}:${a}`, translator: 'QuranEnc translator' } } : {}),
          tafsir: [
            { key: 'muyassar', name: 'التفسير الميسر', text: 'م', ref: '', url: '' },
            { key: 'saadi', name: 'تفسير السعدي', text: SAADI(s, a).join('\n\n'), paragraphs: SAADI(s, a), ref: '', url: '' },
          ],
        }),
      )
    }
    const h = u.pathname.match(/^\/api\/adhkar\/hadith\/(\d+)$/)
    if (h) {
      const lang = u.searchParams.get('lang')
      return new Response(
        JSON.stringify({
          id: h[1],
          title: null,
          text: `نص الحديث ${h[1]} من الموسوعة`,
          grade: 'صحيح',
          attribution: 'رواه مسلم',
          tier: '1',
          version: null,
          ...(lang && lang !== 'ar' ? { translation: { lang, title: null, text: `Hadith ${h[1]} in ${lang}`, grade: null, attribution: null, version: null } } : {}),
        }),
      )
    }
    return new Response('{}', { status: 404 })
  })
})
afterAll(() => vi.unstubAllGlobals())

describe('«القراءة» is cut at its last whole sentence (0072-add10 §1 page 4)', () => {
  it('splits at the sentence marks and keeps every word', () => {
    expect(W.sentencesOf('الجملة الأولى. والثانية؟ والثالثة! والرابعة بلا علامة')).toEqual(['الجملة الأولى.', 'والثانية؟', 'والثالثة!', 'والرابعة بلا علامة'])
    expect(W.sentencesOf('قال: «هذا كلام.» ثم   مضى.')).toEqual(['قال: «هذا كلام.»', 'ثم مضى.'])
    expect(W.sentencesOf('')).toEqual([])
  })
  it('the cut takes whole sentences only, and says when some are left', () => {
    const s = ['أ ب ج.', 'د هـ و ز.', 'ح ط.']
    expect(W.cutAtSentence(s, 100)).toEqual({ text: 'أ ب ج. د هـ و ز. ح ط.', count: 3, cut: false })
    expect(W.cutAtSentence(s, 16)).toEqual({ text: 'أ ب ج. د هـ و ز.', count: 2, cut: true })
    expect(W.cutAtSentence(s, 15)).toEqual({ text: 'أ ب ج.', count: 1, cut: true })
    expect(W.cutAtSentence(s, 3)).toEqual({ text: '', count: 0, cut: true })
    // Never a part of a sentence, at every budget.
    for (let max = 0; max < 30; max++) {
      const r = W.cutAtSentence(s, max)
      expect(r.text.length).toBeLessThanOrEqual(max)
      expect(s.slice(0, r.count).join(' ')).toBe(r.text)
    }
  })
  it('every reading of the 96 splits into sentences that are its own words, its citations as their words', () => {
    for (const e of NAMES.entries) {
      const ss = W.readingSentences(e.readings)
      expect(ss.length, e.name).toBeGreaterThan(2)
      const parts = [[e.readings.meaning], [e.readings.easy], e.readings.deep]
      parts.forEach((ps, part) => {
        const joined = ss.filter((x) => x.part === part).map((x) => x.text).join(' ')
        const plain = ps.map((p) => W.plainReading(p)).join(' ').replace(/\s+/g, ' ').trim()
        expect(joined, `${e.name} ${part}`).toBe(plain)
      })
      for (const x of ss) expect(x.text).not.toMatch(/\{\{|\}\}|quran:|hadith:/)
    }
  })
})

describe('the name of the day in the widgets’ file (0072-add10 §1)', () => {
  const now = new Date('2026-10-25T21:30:00Z') // 00:30 on 26 October in Riyadh
  it('turns by the Riyadh date, the same for everyone', async () => {
    const days = await W.nameWidgetDays(now, 'ar', 'ar', WIDGET_STRINGS.ar.of)
    expect(days).toHaveLength(W.NAME_WIDGET_DAYS)
    expect(days[0].day).toBe('2026-10-26')
    expect(days[0].start).toBe(Date.parse('2026-10-26T00:00:00+03:00'))
    expect(days[0].end - days[0].start).toBe(86_400_000)
    days.forEach((d, k) => {
      const e = NAMES.entries[nameDayIndex(d.day)]
      expect(d.n).toBe(e.n)
      expect(d.name).toBe(e.name)
      expect(d.latin).toBeNull()
      expect(d.url).toBe(`imuslim://today/name/${e.n}`)
      expect(d.shareUrl).toBe(`imuslim://today/name/${e.n}/share`)
      if (k) expect(d.start).toBe(days[k - 1].end)
    })
  })
  it('the pages in the order of the name’s page, each text whole from our data', async () => {
    for (const e of NAMES.entries) {
      const day = W.nameWidgetDay(dayOf(e.n), 'ar', 'ar', WIDGET_STRINGS.ar.of)
      const d = (await day)!
      expect(d.of).toBe(`${ar(e.n)} من ${ar(96)}`)
      const kinds = d.pages.map((p) => p.kind)
      // ayah first when there is one; the hadith before the quoted meaning; «القراءة» last.
      const order = { ayah: 0, hadith: 1, meaning: 2, reading: 3 }
      const rank = kinds.map((k) => order[k])
      if (kinds[0] !== 'hadith') expect(rank).toEqual([...rank].sort())
      expect(kinds.at(-1)).toBe('reading')
      expect(new Set(kinds).size).toBe(kinds.length)
      // The evidence first: its ayah or the ayah for the meaning, else its hadith, else its first Quranic dua.
      const firstAyah = e.ayah ?? e.meaningAyah ?? (e.hadith ? null : (e.duas.find((x) => x.kind === 'ayah')?.id ?? null))
      if (firstAyah) {
        const [, s, a] = firstAyah.match(/^quran:(\d+):(\d+)$/)!.map(Number)
        const p = d.pages[0]
        expect(p.kind).toBe('ayah')
        if (p.kind === 'ayah') {
          expect(p.text).toBe(AYAH(s, a)) // never cut
          expect(p.url).toBe(`imuslim://quran/${s}/${a}`)
          expect(p.meaning).toBeNull()
        }
      } else expect(kinds[0]).toBe('hadith')
      // No dua comes before the evidence, and the tafsir is of the ayah shown.
      if (e.hadith && !e.ayah && !e.meaningAyah) expect(kinds).not.toContain('ayah')
      if (kinds.includes('meaning')) expect(e.tafsirOf).toBe(firstAyah)
      if (e.hadith) expect(d.pages.find((p) => p.kind === 'hadith')).toMatchObject({ text: `نص الحديث ${e.hadith} من الموسوعة`, grade: 'صحيح', attribution: 'رواه مسلم', url: `imuslim://hadith/${e.hadith}` })
      const m = d.pages.find((p) => p.kind === 'meaning')
      if (m && m.kind === 'meaning') {
        expect(m.label).toBe('تفسير السعدي')
        expect(m.paragraphs[0]).toMatch(/^تفسير السعدي للآية/)
      }
      const r = d.pages.at(-1)!
      if (r.kind === 'reading') {
        expect(r.label).toBe('شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء')
        expect(r.inArabic).toBeNull()
        expect(r.partLabels).toEqual(['المعنى:', 'قراءة ميسرة:', 'قراءة أعمق:'])
      }
    }
  })
  it('outside Arabic: the name in Arabic, the meanings from our sources, «القراءة» Arabic under its line', async () => {
    const e = NAMES.entries[0] // الصمد: al-Ikhlas 2
    const en = (await W.nameWidgetDay(dayOf(e.n), 'en', 'en', WIDGET_STRINGS.en.of))!
    expect(en.name).toBe(e.name)
    expect(en.of).toBe('1 of 96')
    const p = en.pages[0]
    expect(p.kind === 'ayah' && p.meaning).toEqual({ text: 'Meaning 112:2 (Sahih International)', lang: 'en', source: 'Sahih International' })
    expect(p.kind === 'ayah' && p.ref).toBe('Surah 112 · 2')
    const r = en.pages.at(-1)!
    expect(r.kind === 'reading' && r.inArabic).toBe('The explanation is available in Arabic')
    expect(r.kind === 'reading' && r.sentences[0].text).toBe(W.sentencesOf(W.plainReading(e.readings.meaning))[0])
    const fr = (await W.nameWidgetDay(dayOf(e.n), 'fr', 'fr', WIDGET_STRINGS.fr.of))!
    const q = fr.pages[0]
    expect(q.kind === 'ayah' && q.meaning).toEqual({ text: 'Meaning fr 112:2', lang: 'fr', source: 'QuranEnc translator' })
    const sh = NAMES.entries.find((x) => x.hadith && !x.ayah && !x.meaningAyah && !x.duas.some((d) => d.kind === 'ayah'))!
    const ur = (await W.nameWidgetDay(dayOf(sh.n), 'ur', 'ur', WIDGET_STRINGS.ur.of))!
    const h = ur.pages[0]
    expect(h.kind === 'hadith' && h.meaning).toEqual({ text: `Hadith ${sh.hadith} in ur`, lang: 'ur', source: 'HadeethEnc' })
  })
  it('no «القراءة» page while the server does not send it', async () => {
    readingsOn = false
    try {
      // A day of the next round (the app's requests are kept by their address).
      const d = (await W.nameWidgetDay(dayOf(1, 1), 'ar', 'ar'))!
      expect(d.pages.some((p) => p.kind === 'reading')).toBe(false)
    } finally {
      readingsOn = true
    }
  })
})

describe('the salaf saying of the day (0072-add10 §2)', () => {
  it('the home card’s own saying, by the Riyadh date, Arabic, with its source and share link', () => {
    const now = new Date('2026-10-25T21:30:00Z')
    const days = W.salafWidgetDays(now)
    expect(days).toHaveLength(W.SALAF_WIDGET_DAYS)
    for (const d of days) {
      const c = salafOfDay(d.start + 1)!
      expect(d.n).toBe(c.n)
      expect(d.text).toBe(c.text)
      expect(d.parts.map((p) => p.text).join('')).toBe(c.text)
      expect(d.attribution).toBe(salafAttribution(c))
      expect(d.attribution).toMatch(/^(قال|يُروى عن) /)
      // In the Arabic interface its volume and page in Arabic-Indic digits (add-on 0072-add23 §4.5), and no line over it.
      expect(d.source).toBe(W.widgetDigits(salafSource(c), 'ar'))
      expect(d.source).not.toMatch(/[0-9]/)
      expect(d.inArabic).toBeNull()
      expect(d.url).toMatch(/^https:\/\/shamela\.ws\/book\//)
      expect(d.shareUrl).toBe(`imuslim://today/salaf/${c.n}/share`)
      expect(new Date(d.start + 3 * 3600_000).toISOString().slice(11, 19)).toBe('00:00:00')
    }
    expect(days[0].day).toBe('2026-10-26')
  })
  it('outside Arabic the saying stays Arabic, «النص بالعربية» over it in the reader’s language (0072-add23 §4.7–8)', () => {
    const now = new Date('2026-10-25T21:30:00Z')
    const ar = W.salafWidgetDays(now, 5, 'ar')
    for (const lang of ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const) {
      const days = W.salafWidgetDays(now, 5, lang)
      days.forEach((d, k) => {
        expect(d.text).toBe(ar[k].text)
        expect(d.attribution).toBe(ar[k].attribution)
        expect(d.source).toBe(salafSource(salafOfDay(d.start + 1)!))
        expect(d.inArabic).toBe(W.TEXT_IN_ARABIC[lang])
      })
    }
  })
})

describe('the separator, the digits and «النص بالعربية» (add-on 0072-add23 §4.4, §4.5, §4.7)', () => {
  it('«✦» in Arabic and beside digits whose zero is a dot or a ring; «·» with Latin digits', () => {
    expect(W.widgetSep('ar')).toBe('✦')
    expect(W.widgetSep('en')).toBe('·')
    expect(W.widgetSep('fr')).toBe('·')
  })
  it('Arabic-Indic digits in the Arabic interface only', () => {
    expect(W.widgetDigits('ج10، ص29', 'ar')).toBe('ج١٠، ص٢٩')
    expect(W.widgetDigits('ص99', 'ar')).toBe('ص٩٩')
    expect(W.widgetDigits('ج10، ص29', 'en')).toBe('ج10، ص29')
  })
  it('the ten languages', () => {
    expect(Object.keys(W.TEXT_IN_ARABIC).sort()).toEqual(['ar', 'bn', 'en', 'es', 'fr', 'hi', 'id', 'ms', 'tr', 'ur'])
    expect(W.TEXT_IN_ARABIC.ar).toBe('النص بالعربية')
  })
  it('the ayah’s place and source in Arabic with «✦», never «·»; the quoted tafsir under «النص بالعربية» outside Arabic', async () => {
    for (const e of NAMES.entries.slice(0, 12)) {
      const d = (await W.nameWidgetDay(dayOf(e.n), 'ar', 'ar', WIDGET_STRINGS.ar.of))!
      for (const p of d.pages) {
        if (p.kind === 'ayah') {
          expect(p.ref).toMatch(/^\S.* ✦ [٠-٩]+$/)
          expect(p.source).not.toContain('·')
        }
        if (p.kind !== 'reading') expect(p.inArabic).toBeNull()
      }
    }
    const e = NAMES.entries.find((x) => x.tafsirOf)!
    const en = (await W.nameWidgetDay(dayOf(e.n), 'en', 'en', WIDGET_STRINGS.en.of))!
    const m = en.pages.find((p) => p.kind === 'meaning')!
    expect(m.inArabic).toBe('The text in Arabic')
    // A text with its meaning from our sources under it needs no such line.
    for (const p of en.pages) if (p.kind === 'ayah' || p.kind === 'hadith') expect(p.inArabic).toBe(p.meaning ? null : 'The text in Arabic')
  })
})

describe('the file carries them, and the sky’s six states (0072-add10 «أفضل من المطلوب»)', () => {
  it('the day’s sky in adhan’s order, from midnight', () => {
    const t = (h: number) => new Date(Date.UTC(2026, 9, 26, h))
    const d = { fajr: t(1), sunrise: t(3), dhuhr: t(9), asr: t(12), maghrib: t(14), isha: t(16) }
    expect(skyOfDay(0, d).map((x) => x.state)).toEqual(['night', 'fajr', 'morning', 'dhuhr', 'asr', 'maghrib', 'night'])
    expect(skyOfDay(0, { ...d, isha: new Date(NaN) })).toEqual([])
  })
  it('buildWidgetData writes nameDays, salafDays and each day’s sky', async () => {
    localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang: 'ar' }))
    localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }))
    const data = await buildWidgetData(new Date('2026-10-26T09:00:00Z'))
    expect(data.nameDays.length).toBe(W.NAME_WIDGET_DAYS)
    expect(data.salafDays.length).toBe(W.SALAF_WIDGET_DAYS)
    expect(data.labels.nameOfDay).toBe('اسم الله لليوم')
    expect(data.labels.names.name.name).toBe('اسم الله لليوم')
    expect(data.labels.names.salaf.desc).toMatch(/بالعربية/)
    const withSky = data.days.filter((d) => d.sky.length === 7)
    if (data.place) expect(withSky.length).toBe(data.days.length)
    const json = JSON.parse(JSON.stringify(data))
    expect(json.nameDays[0].pages[0].kind).toBeTruthy()
  })
})

describe('the strings in the ten languages, and no exclamation mark', () => {
  it('has them all', () => {
    for (const [lang, s] of Object.entries(WIDGET_STRINGS)) {
      for (const k of ['nameOfDay', 'nextPage', 'share', 'continueInApp'] as const) {
        expect(s[k], `${lang} ${k}`).toBeTruthy()
        expect(s[k]).not.toMatch(/!|！/)
      }
      for (const k of ['name', 'salaf'] as const) {
        expect(s.names[k].name, `${lang} ${k}`).toBeTruthy()
        expect(s.names[k].desc).not.toMatch(/!/)
      }
      expect(s.names.name.name).not.toMatch(/\bi\s?Muslim|i مسلم/)
    }
    expect(WIDGET_STRINGS.ar.continueInApp).toBe('التكملة في التطبيق')
    expect(WIDGET_STRINGS.ar.nextPage).toBe('التالي')
    expect(WIDGET_STRINGS.ar.share).toBe('شارك')
  })
})

const ar = (n: number) => new Intl.NumberFormat('ar-SA-u-nu-arab', { useGrouping: false }).format(n)
/** A Riyadh date whose entry is `n`. */
function dayOf(n: number, round = 0): string {
  const epoch = Date.parse(`${NAMES.epoch}T00:00:00Z`)
  return new Date(epoch + (n - 1 + round * NAMES.entries.length) * 86_400_000).toISOString().slice(0, 10)
}

// WIDGET_SAMPLES=<dir>: the file the app writes in Riyadh, from a server with the names routes (SAMPLES_SERVER, by
// default v11, where NAMES_READINGS is on), for the widget renders of relay/w1/0072-names-widget: sample-<lang>-<n>.json
// (الحفيظ: an ayah, its tafsir and the readings; الشافي: a hadith; القابض الباسط: a pair), and
// sample-<lang>-2-noreadings.json without the «القراءة» page, as the app builds it on next where the switch is off.
describe.runIf(!!process.env.WIDGET_SAMPLES)('widget samples for the renders', () => {
  it('writes the samples', async () => {
    const server = process.env.SAMPLES_SERVER ?? 'https://i-muslim-v11.alkhammashtalal.workers.dev'
    vi.stubGlobal('fetch', (url: string) => realFetch(new URL(url, server)))
    vi.useFakeTimers({ toFake: ['Date'] })
    const cases: [number, string, boolean][] = [
      [2, '2026-10-23T13:30:00Z', false],
      [2, '2026-10-23T13:30:00Z', true],
      [4, '2026-10-25T13:30:00Z', false],
      [91, '2027-01-20T13:30:00Z', false],
    ]
    for (const [n, at, noReadings] of cases)
      for (const lang of ['ar', 'en']) {
        const now = new Date(at)
        vi.setSystemTime(now)
        localStorage.clear()
        localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang, content: lang }))
        localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: lang === 'ar' ? 'الرياض' : 'Riyadh', source: 'city' }))
        const data = await buildWidgetData(now)
        expect(data.nameDays[0].n).toBe(n)
        // As the app builds it when the server sends no readings (namePages: no «القراءة» page).
        if (noReadings) for (const d of data.nameDays) d.pages = d.pages.filter((p) => p.kind !== 'reading')
        fs.mkdirSync(process.env.WIDGET_SAMPLES!, { recursive: true })
        fs.writeFileSync(path.join(process.env.WIDGET_SAMPLES!, `sample-${lang}-${n}${noReadings ? '-noreadings' : ''}.json`), JSON.stringify(data))
      }
    vi.useRealTimers()
  }, 180_000)
})
