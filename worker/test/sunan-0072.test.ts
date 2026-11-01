// Add-on 0072-add59: the fard and the regular sunnahs under each prayer's name, in the large times widget (iOS and
// Android) and on the times page, one table (web/src/v2/daily/sunan.ts) and one set of words in the ten languages
// (web/src/native/widget-strings.ts). Checked here: the five lines, none for sunrise, the middle of the night and the
// last third, Friday as any day, the digits of each language, the spoken row, the colours and their contrast on the
// widgets' paper, the native drawing reading the file's line (and only in the large times widget), and the evidence
// against our data (data/processed, when present).
//   SUNAN_SAMPLES=<dir>: also writes the widgets' file for the renders of relay/w1/0072-review-queue/sunan.html.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
vi.stubGlobal('localStorage', new MemStorage())

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

const { SUNAN, SUNAN_COLORS, SUNAN_SOURCES, sunanHadithTitle, sunanSep, sunanLine, sunanRowLabel } = await import('../../web/src/v2/daily/sunan')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')
const { buildWidgetData } = await import('../../web/src/native/widget-data')
const { num } = await import('../../web/src/v2/daily/format')

const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

// WCAG 2 relative luminance and contrast.
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
// The widgets' paper as rendered (iPhone 16 Pro Max, 3x; text-free pixels of the table, relay/w1/0072-review-queue/sunan.html).
const PAPER_MEAN = '#ede4ce'
const PAPER_DARK_1PC = '#e7dcc7'

async function widgetFile(lang: string, at: string) {
  const now = new Date(at)
  vi.setSystemTime(now)
  localStorage.clear()
  localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang, content: lang }))
  localStorage.setItem('muslim.place.v1', JSON.stringify({ lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }))
  return buildWidgetData(now)
}

describe('the sunnahs under each prayer (add-on 0072-add59)', () => {
  it('the five Arabic lines are the add-on’s, word for word, with «✦» for «·» beside the Arabic-Indic digits (add23 §4.4)', () => {
    expect(Object.fromEntries(FIVE.map((k) => [k, sunanLine(k, 'ar')!.text]))).toEqual({
      fajr: '٢ قبلها ✦ الفرض ٢',
      dhuhr: '٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها',
      asr: 'الفرض ٤',
      maghrib: 'الفرض ٣ ✦ ٢ بعدها',
      isha: 'الفرض ٤ ✦ ٢ بعدها',
    })
    expect(SUNAN).toEqual({
      fajr: { before: 2, fard: 2, after: 0 },
      dhuhr: { before: 4, fard: 4, after: 2 },
      asr: { before: 0, fard: 4, after: 0 },
      maghrib: { before: 0, fard: 3, after: 2 },
      isha: { before: 0, fard: 4, after: 2 },
    })
    // No sunnah for Asr, none before Maghrib.
    expect(sunanLine('asr', 'ar')!.parts.map((p) => p.kind)).toEqual(['fard'])
    expect(sunanLine('maghrib', 'ar')!.parts.map((p) => p.kind)).toEqual(['fard', 'after'])
  })

  it('no line for sunrise, the middle of the night or the last third', () => {
    for (const lang of LANGS) for (const k of ['sunrise', 'midnight', 'lastThird', 'jumuah', '']) expect(sunanLine(k, lang), `${lang} ${k}`).toBeNull()
  })

  it('the ten languages: the three words, the numbers in the language’s digits, the parts in order', () => {
    for (const lang of LANGS) {
      const w = WIDGET_STRINGS[lang].sunan
      for (const k of ['before', 'fard', 'after'] as const) expect(w[k], `${lang} ${k}`).toContain('{n}')
      expect(w.title && w.sources && w.comma, lang).toBeTruthy()
      expect(w.fatwa, `${lang} fatwa`).toContain('{n}')
      for (const k of FIVE) {
        const c = SUNAN[k]
        const line = sunanLine(k, lang)!
        const want = [
          ...(c.before ? [w.before.replace('{n}', num(c.before, lang))] : []),
          w.fard.replace('{n}', num(c.fard, lang)),
          ...(c.after ? [w.after.replace('{n}', num(c.after, lang))] : []),
        ]
        expect(line.parts.map((p) => p.text), `${lang} ${k}`).toEqual(want)
        expect(line.text).toBe(want.join(sunanSep(lang)))
        expect(line.sep).toBe(lang === 'ar' ? ' ✦ ' : ' · ')
        expect(line.spoken, `${lang} ${k}`).not.toMatch(/\{|undefined/)
      }
    }
    // The app's digits: Eastern Arabic in Arabic, Bengali digits in Bengali, Latin in English.
    expect(sunanLine('dhuhr', 'bn')!.text).toMatch(/৪/)
    expect(sunanLine('dhuhr', 'en')!.text).toBe('4 before · Fard 4 · 2 after')
    // The eight machine-translated tables are their own words, not the English copied.
    for (const lang of LANGS.filter((l) => l !== 'en' && l !== 'ar')) expect(WIDGET_STRINGS[lang].sunan.before, lang).not.toBe(WIDGET_STRINGS.en.sunan.before)
    expect(read('web/src/native/widget-strings.ts')).toMatch(/Arabic and English reviewed, the eight others machine translation/)
  })

  it('VoiceOver and TalkBack read the row as one, in words', () => {
    expect(sunanRowLabel('dhuhr', 'الظهر', '١٢:٠٢ م', 'ar')).toBe('الظهر، ١٢:٠٢ م، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها')
    expect(sunanRowLabel('fajr', 'الفجر', '٥:٠٣ ص', 'ar')).toBe('الفجر، ٥:٠٣ ص، ركعتان قبلها، الفرض ركعتان')
    expect(sunanRowLabel('dhuhr', 'Dhuhr', '12:02 PM', 'en')).toBe('Dhuhr, 12:02 PM, four rakahs before, fard four, two rakahs after')
    expect(sunanRowLabel('sunrise', 'الشروق', '٦:٢٠ ص', 'ar')).toBe('الشروق، ٦:٢٠ ص')
    // The native rows speak the file's label: iOS as the row's accessibility label, Android in the widget's description.
    const swift = read('web/ios/App/MuslimWidgets/Views.swift')
    expect(swift).toMatch(/\.modifier\(SpokenLabel\(label: time\.sunan\?\.label\)\)/)
    expect(read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')).toMatch(/said\.append\(sunan\.optString\("label"\)\)/)
    // The page reads the words after the time (the visible line is hidden from the reader).
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    expect(page).toMatch(/className="dt-sunan" aria-hidden="true"/)
    expect(page).toMatch(/className="sr-only">\{`\$\{WIDGET_STRINGS\[lang\]\.sunan\.comma\}\$\{sunanLine\(n, lang\)!\.spoken\}`\}/)
  })

  it('the widgets’ file carries the line on the five prayers only, Friday as any other day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }))
    try {
      const sat = await widgetFile('ar', '2026-10-31T10:30:00Z')
      const fri = await widgetFile('ar', '2026-10-30T09:40:00Z')
      const day = sat.days[0]
      expect(day.times.map((t) => t.key)).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight', 'lastThird'])
      for (const t of day.times) {
        if ((FIVE as readonly string[]).includes(t.key)) {
          expect(t.sunan!.parts).toEqual(sunanLine(t.key, 'ar')!.parts)
          expect(t.sunan!.sep).toBe(' ✦ ')
          expect(t.sunan!.label).toBe(sunanRowLabel(t.key, t.name, t.text, 'ar'))
        } else expect(t.sunan, t.key).toBeUndefined()
      }
      expect(fri.days[0].weekday).toBe('الجمعة')
      const lines = (d: typeof day) => d.times.map((t) => t.sunan?.parts ?? null)
      expect(lines(fri.days[0])).toEqual(lines(day))
      expect(fri.days[0].times.find((t) => t.key === 'dhuhr')!.name).toBe('الظهر')
      // The words travel with each time, not in the labels.
      expect('sunan' in sat.labels).toBe(false)
      const en = await widgetFile('en', '2026-10-31T10:30:00Z')
      expect(en.days[0].times.find((t) => t.key === 'isha')!.sunan!.parts.map((p) => p.text)).toEqual(['Fard 4', '2 after'])
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      vi.stubGlobal('localStorage', new MemStorage())
    }
  })

  it('colours: lapis for the fard, the dark gold deepened to AA on the paper; the same in Swift, Java and the page', () => {
    expect(SUNAN_COLORS.fard).toBe('#1e3a6b')
    expect(contrast(SUNAN_COLORS.fard, PAPER_MEAN)).toBeGreaterThan(8.5)
    expect(contrast(SUNAN_COLORS.fard, PAPER_DARK_1PC)).toBeGreaterThan(8)
    // The gold asked for fails on the paper (3.8:1); the one used holds 4.5:1 on the mean and on the darkest 1%.
    expect(contrast(SUNAN_COLORS.asked, PAPER_MEAN)).toBeLessThan(4.5)
    expect(contrast(SUNAN_COLORS.side, PAPER_MEAN)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(SUNAN_COLORS.side, PAPER_DARK_1PC)).toBeGreaterThanOrEqual(4.5)
    const swift = read('web/ios/App/MuslimWidgets/Views.swift')
    expect(swift).toContain('static let fardColor = Color(hex: 0x1e3a6b)')
    expect(swift).toContain('static let sideColor = Color(hex: 0x795d24)')
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(java).toContain('static final int SUNAN_FARD = 0xFF1E3A6B;')
    expect(java).toContain('static final int SUNAN_SIDE = 0xFF795D24;')
    // The page: --primary and --gold-dark, AA on the card and on the next prayer's tint.
    const tokens = read('web/src/styles/tokens.css')
    expect(tokens).toMatch(/--primary: #1e3a6b;/)
    expect(tokens).toMatch(/--gold-dark: #795d24;/)
    const css = read('web/src/v2/daily/today.css')
    expect(css).toMatch(/\.dt-sunan-fard \{\s*color: var\(--primary\);/)
    expect(css).toMatch(/\.dt-sunan-side \{\s*color: var\(--gold-dark\);/)
    const tint = '#d4e2f7' // --tint-blue (rgba(210, 224, 247, 0.95)) on the white card
    expect(contrast('#795d24', tint)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#1e3a6b', tint)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#795d24', '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('only the large times widget draws it: not the small or medium widgets, nor the lock screen', () => {
    const W = 'web/ios/App/MuslimWidgets'
    for (const f of ['LockViews.swift', 'CountdownViews.swift', 'NameViews.swift', 'FastingViews.swift', 'Widgets.swift', 'LockWidgets.swift']) expect(read(`${W}/${f}`), f).not.toMatch(/sunan/i)
    const views = read(`${W}/Views.swift`)
    // In Views.swift: the large times table (TodayTimesView) and its rows (TimeRow) only.
    const used = [...views.matchAll(/lineRoom|sunan/g)].map((m) => m.index!)
    const from = views.indexOf('struct TodayTimesView')
    const to = views.indexOf('// MARK: - 3. The date (small)')
    const mawaqif = [views.indexOf('struct MawaqifView'), views.indexOf('struct TimeRow')]
    for (const i of used) {
      expect(i > from && i < to, `Views.swift @${i}`).toBe(true)
      expect(i > mawaqif[0] && i < mawaqif[1], `Views.swift @${i} in MawaqifView`).toBe(false)
    }
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    const jFrom = java.indexOf('// MARK: - 2. Today\'s times (large)')
    const jTo = java.indexOf('// MARK: - 3. The date (small)')
    for (const m of java.matchAll(/sunan/gi)) expect(m.index! > jFrom && m.index! < jTo, `WidgetPainter.java @${m.index}`).toBe(true)
    // The iOS data contract decodes the line as optional (a file written before it still reads).
    expect(read(`${W}/WidgetData.swift`)).toMatch(/var sunan: Sunan\?/)
  })

  it('the times page draws the line under each prayer and links its sources', () => {
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    expect(page).toMatch(/\{s\.prayers\[n\]\}\s*<SunanLineView prayer=\{n\} \/>/)
    expect(page).toMatch(/<SunanSources \/>/)
    expect(SUNAN_SOURCES.hadiths.map((h) => h.id)).toEqual(['65715', '11249', '3062'])
    expect(SUNAN_SOURCES.fatwa.number).toBe('1432')
    expect(SUNAN_SOURCES.fatwa.url).toMatch(/^https:\/\/binbaz\.org\.sa\/fatwas\/1432\//)
    const doc = read('docs/SUNAN.md')
    for (const id of ['65715', '11249', '3062', '11253', '1432']) expect(doc).toContain(id)
    // The named fatwa in the sources registry and the sources skill, as 11916 (add-on 0072-add59 §1).
    expect(read('docs/SOURCES.md')).toMatch(/^\| 1432 \| https:\/\/binbaz\.org\.sa\/fatwas\/1432\//m)
    expect(read('.claude/skills/sources-terms/SKILL.md')).toContain('فتوى ابن باز 1432، تحت جدول المواقيت')
  })

  it('the sheet: each hadith by its HadeethEnc title, the fatwa by its number and series, not its title (Opus review)', () => {
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    const sheet = page.slice(page.indexOf('function SunanSources()'), page.indexOf('function Forbidden('))
    // The fatwa's title would read as a hadith for four before Dhuhr (the fatwa puts that wording in Asr): never shown.
    expect(sheet).not.toMatch(/fatwa\.title/)
    expect(sheet).toMatch(/fill\(su\.fatwa, \{ n: num\(Number\(fatwa\.number\), lang\) \}\)/)
    expect(sheet).toMatch(/\{fatwa\.series\}/)
    expect(SUNAN_SOURCES.fatwa.series).toBe('فتاوى الجامع الكبير')
    expect(WIDGET_STRINGS.ar.sunan.fatwa.replace('{n}', num(1432, 'ar'))).toBe('فتوى ابن باز ١٤٣٢')
    for (const lang of LANGS) {
      const label = WIDGET_STRINGS[lang].sunan.fatwa.replace('{n}', num(1432, lang))
      expect(label, lang).not.toContain(SUNAN_SOURCES.fatwa.title)
      expect(label, lang).toContain(num(1432, lang))
    }
    expect(WIDGET_STRINGS.bn.sunan.fatwa.replace('{n}', num(1432, 'bn'))).toContain('১৪৩২')
    // Each hadith's title: the interface's language where our data has it, else the Arabic marked as Arabic.
    expect(sheet).toMatch(/const title = sunanHadithTitle\(h, lang\)/)
    expect(sheet).toMatch(/lang=\{title\.lang\}/)
    expect(sheet).toMatch(/\{title\.text\}/)
    const [h65715, h11249, h3062] = SUNAN_SOURCES.hadiths
    for (const h of SUNAN_SOURCES.hadiths) expect(h.title.ar, h.id).toBeTruthy()
    expect(new Set(SUNAN_SOURCES.hadiths.map((h) => h.title.ar)).size).toBe(3)
    expect(sunanHadithTitle(h65715, 'en')).toEqual({ text: h65715.title.ar, lang: 'ar' })
    expect(sunanHadithTitle(h11249, 'en')).toEqual({ text: h11249.title.en, lang: 'en' })
    expect(sunanHadithTitle(h11249, 'fr')).toEqual({ text: h11249.title.ar, lang: 'ar' })
    expect(sunanHadithTitle(h3062, 'fr')).toEqual({ text: h3062.title.fr, lang: 'fr' })
    expect(sunanHadithTitle(h3062, 'ms')).toEqual({ text: h3062.title.ar, lang: 'ar' })
    // The separators by the app's rule (add23 §4.4): sepOf, never a bare «·», in the sheet and its line.
    expect(sheet).not.toMatch(/ · /)
    expect(sheet).toMatch(/<b>\{su\.title\}<\/b>\s*\{sepOf\(lang\)\}\s*\{su\.sources\}/)
    expect(sheet).toMatch(/\{h\.attribution\}\s*\{sepOf\('ar'\)\}\s*\{h\.grade\}/)
  })

  const PROCESSED = path.join(ROOT, 'data/processed')
  describe.runIf(fs.existsSync(path.join(PROCESSED, 'hadith.jsonl')))('the evidence as our data has it', () => {
    it('the three hadiths: number, attribution and grade; and the text quoted in docs/SUNAN.md', () => {
      const want = new Map<string, { attribution: string; grade: string; hadeeth: string }>()
      for (const line of fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8').split('\n')) {
        if (!line.startsWith('{"lang":"ar"')) continue
        const id = /"id":"(\d+)"/.exec(line)?.[1]
        if (id && ['65715', '11249', '3062', '11253'].includes(id)) want.set(id, JSON.parse(line))
      }
      const doc = read('docs/SUNAN.md')
      for (const h of SUNAN_SOURCES.hadiths) {
        const d = want.get(h.id)!
        expect(d, h.id).toBeTruthy()
        expect([h.attribution, h.grade]).toEqual([d.attribution, d.grade])
        expect(doc).toContain(d.hadeeth)
      }
      // Each title verbatim, in every one of the app's languages our data has it in, and none it lacks.
      const titles = new Map<string, Record<string, string>>()
      for (const line of fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8').split('\n')) {
        const id = /"id":"(\d+)"/.exec(line)?.[1]
        if (!id || !['65715', '11249', '3062'].includes(id)) continue
        const r = JSON.parse(line) as { lang: string; title: string }
        if (!(LANGS as readonly string[]).includes(r.lang)) continue
        titles.set(id, { ...titles.get(id), [r.lang]: r.title })
      }
      for (const h of SUNAN_SOURCES.hadiths) expect(h.title, h.id).toEqual(titles.get(h.id))
      // 11253 (two rak'ahs before Maghrib) is in our data and not a ratiba in its own explanation.
      expect(JSON.stringify(want.get('11253'))).toContain('ليستا من السنن الرواتب المؤكدة')
    })
    it('fatwa 1432: its title, series, link and the two sentences', () => {
      const line = fs.readFileSync(path.join(PROCESSED, 'fatwas.jsonl'), 'utf8').split('\n').find((l) => l.includes('"id":"fatwa:binbaz:1432"'))!
      const f = JSON.parse(line) as { title: string; series: string; url: string; answer: string }
      expect(SUNAN_SOURCES.fatwa.title).toBe(f.title)
      expect(SUNAN_SOURCES.fatwa.series).toBe(f.series)
      expect(SUNAN_SOURCES.fatwa.url).toBe(f.url)
      for (const q of ['أما الظهر فالرواتب في الظهر ست أربعًا قبلها، وثنتين بعدها', 'وصلاة أربع قبل العصر مستحبة، وليست راتبة']) {
        expect(f.answer).toContain(q)
        expect(read('docs/SUNAN.md')).toContain(q)
      }
    })
  })

  describe.runIf(!!process.env.SUNAN_SAMPLES)('samples for the renders', () => {
    it('writes the widgets’ file', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }))
      for (const [tag, at] of [['night', '2026-10-30T22:30:00Z'], ['day', '2026-10-31T10:30:00Z'], ['fri', '2026-10-30T09:40:00Z']] as const)
        for (const lang of ['ar', 'en', 'ur', 'bn', 'hi', 'fr']) {
          const data = await widgetFile(lang, at)
          fs.mkdirSync(process.env.SUNAN_SAMPLES!, { recursive: true })
          fs.writeFileSync(path.join(process.env.SUNAN_SAMPLES!, `s-${lang}-${tag}.json`), JSON.stringify(data))
        }
      vi.useRealTimers()
    }, 120_000)
  })
})
