// Add-on 0072-add67 §1–3:
//   §1 Friday in the sunnahs' line: the Dhuhr row is «الجمعة» with «الفرض ٢ ✦ ٤ بعدها» under it and no «قبلها», on the
//      times page, in the large times widget (iOS and Android, from the widgets' file) and in the spoken label; the
//      other days keep «الظهر». Its evidence in the sheet: 65764 and 3062 with their text as our data has it.
//   §2 The next prayer's gold pill in the large times widget: its text reaches 4.5:1 on every gold it sits on.
//   §3 «السابق» in «تأكد من فهمك»: worker/test/understand-prev-add67.test.ts.
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

const { JUMUAH, PILL, SUNAN, SUNAN_FRIDAY_SOURCES, isFridayYmd, sunanLine, sunanRowLabel, sunanRowName } = await import('../../web/src/v2/daily/sunan')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')
const { buildWidgetData } = await import('../../web/src/native/widget-data')
const { TODAY } = await import('../../web/src/v2/daily/strings-today')
const { num } = await import('../../web/src/v2/daily/format')

const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

// WCAG 2 relative luminance and contrast.
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lumOf = (c: number[]) => {
  const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const contrast = (a: string, b: string) => ratio(rgb(a), rgb(b))
/** The pill's gradient sampled along its run (sRGB interpolation, as both platforms draw a two-stop gradient). */
const gradient = (from: string, to: string, n = 200) => {
  const [a, b] = [rgb(from), rgb(to)]
  return Array.from({ length: n + 1 }, (_, i) => a.map((v, j) => Math.round(v + ((b[j] - v) * i) / n)))
}

async function widgetFile(lang: string, at: string, place = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }) {
  const now = new Date(at)
  vi.setSystemTime(now)
  localStorage.clear()
  localStorage.setItem('imuslim.settings.v1', JSON.stringify({ lang, content: lang }))
  localStorage.setItem('muslim.place.v1', JSON.stringify(place))
  return buildWidgetData(now)
}

describe('§1 Friday in the sunnahs’ line', () => {
  it('on Friday Dhuhr’s line is the Jumu’ah’s, «الفرض ٢ ✦ ٤ بعدها», with no «قبلها»; on the other days «٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها»', () => {
    expect(JUMUAH).toEqual({ before: 0, fard: 2, after: 4 })
    expect(sunanLine('dhuhr', 'ar', true)!.text).toBe('الفرض ٢ ✦ ٤ بعدها')
    expect(sunanLine('dhuhr', 'ar', true)!.parts.map((p) => p.kind)).toEqual(['fard', 'after'])
    expect(sunanLine('dhuhr', 'ar', false)!.text).toBe('٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها')
    expect(sunanLine('dhuhr', 'ar')!.text).toBe('٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها')
    expect(sunanLine('dhuhr', 'en', true)!.text).toBe('Fard 2 · 4 after')
    // The other four prayers are the same on a Friday.
    for (const lang of LANGS) for (const k of FIVE.filter((x) => x !== 'dhuhr')) expect(sunanLine(k, lang, true), `${lang} ${k}`).toEqual(sunanLine(k, lang, false))
    expect(SUNAN.dhuhr).toEqual({ before: 4, fard: 4, after: 2 })
  })

  it('the ten languages: the row’s name, the line in the language’s digits and separator, the spoken words', () => {
    for (const lang of LANGS) {
      const w = WIDGET_STRINGS[lang].sunan
      expect(w.jumuah, lang).toBeTruthy()
      expect(w.jumuah, lang).not.toBe(TODAY[lang].prayers.dhuhr)
      expect(w.spoken.after[4], lang).toBeTruthy()
      expect(w.spoken.after[4], lang).not.toBe(w.spoken.after[2])
      const line = sunanLine('dhuhr', lang, true)!
      expect(line.parts.map((p) => p.text), lang).toEqual([w.fard.replace('{n}', num(2, lang)), w.after.replace('{n}', num(4, lang))])
      expect(line.sep).toBe(lang === 'ar' ? ' ✦ ' : ' · ')
      expect(line.spoken).toBe([w.spoken.fard[2], w.spoken.after[4]].join(w.comma))
      expect(sunanRowName('dhuhr', TODAY[lang].prayers.dhuhr, lang, true)).toBe(w.jumuah)
      expect(sunanRowName('dhuhr', TODAY[lang].prayers.dhuhr, lang, false)).toBe(TODAY[lang].prayers.dhuhr)
      expect(sunanRowName('asr', TODAY[lang].prayers.asr, lang, true)).toBe(TODAY[lang].prayers.asr)
    }
    expect(WIDGET_STRINGS.ar.sunan.jumuah).toBe('الجمعة')
    expect(sunanLine('dhuhr', 'bn', true)!.text).toMatch(/২.*৪/)
    expect(sunanLine('dhuhr', 'hi', true)!.text).toContain('4')
  })

  it('VoiceOver and TalkBack: «الجمعة، ١٢:٠٢ م، الفرض ركعتان، أربع ركعات بعدها»; «الظهر» with its line on the other days', () => {
    expect(sunanRowLabel('dhuhr', 'الظهر', '١٢:٠٢ م', 'ar', true)).toBe('الجمعة، ١٢:٠٢ م، الفرض ركعتان، أربع ركعات بعدها')
    expect(sunanRowLabel('dhuhr', 'الظهر', '١٢:٠٢ م', 'ar', false)).toBe('الظهر، ١٢:٠٢ م، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها')
    expect(sunanRowLabel('dhuhr', 'Dhuhr', '12:02 PM', 'en', true)).toBe('Jumuah, 12:02 PM, fard two, four rakahs after')
    expect(sunanRowLabel('asr', 'العصر', '٣:١٥ م', 'ar', true)).toBe('العصر، ٣:١٥ م، الفرض أربع')
  })

  it('Friday is the place’s own date', () => {
    expect(isFridayYmd({ y: 2026, m: 10, d: 30 })).toBe(true)
    expect(isFridayYmd({ y: 2026, m: 10, d: 31 })).toBe(false)
    expect(isFridayYmd({ y: 2026, m: 11, d: 6 })).toBe(true)
    expect(isFridayYmd({ y: 2026, m: 11, d: 5 })).toBe(false)
  })

  it('the widgets’ file: a Friday’s Dhuhr carries «الجمعة» and its line, a Saturday’s «الظهر»; each day by its own weekday', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }))
    try {
      // Thursday 29 October 2026 in Riyadh: the file's sixty days, each by its own date.
      const file = await widgetFile('ar', '2026-10-29T10:00:00Z')
      const byDate = new Map(file.days.map((d) => [d.date, d]))
      const fri = byDate.get('2026-10-30')!
      const sat = byDate.get('2026-10-31')!
      expect(fri.weekday).toBe('الجمعة')
      const fd = fri.times.find((t) => t.key === 'dhuhr')!
      expect(fd.name).toBe('الظهر')
      expect(fd.sunan!.name).toBe('الجمعة')
      expect(fd.sunan!.parts.map((p) => p.text).join(fd.sunan!.sep)).toBe('الفرض ٢ ✦ ٤ بعدها')
      expect(fd.sunan!.label).toBe(`الجمعة، ${fd.text}، الفرض ركعتان، أربع ركعات بعدها`)
      const sd = sat.times.find((t) => t.key === 'dhuhr')!
      expect(sd.sunan!.name).toBeUndefined()
      expect(sd.sunan!.parts.map((p) => p.text).join(sd.sunan!.sep)).toBe('٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها')
      expect(sd.sunan!.label).toBe(`الظهر، ${sd.text}، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها`)
      // Every Friday of the sixty days, and only Fridays.
      for (const d of file.days) {
        const t = d.times.find((x) => x.key === 'dhuhr')!
        expect(t.sunan!.name === 'الجمعة', d.date).toBe(d.weekday === 'الجمعة')
      }
      // A place west of Greenwich: the same instant is still Friday there (Friday 30 October, 18:30 in New York).
      const ny = await widgetFile('en', '2026-10-30T22:30:00Z', { lat: 40.7128, lng: -74.006, timeZone: 'America/New_York', name: 'New York', source: 'city' })
      expect(ny.days[0].date).toBe('2026-10-30')
      expect(ny.days[0].times.find((t) => t.key === 'dhuhr')!.sunan!.name).toBe('Jumuah')
      const ry = await widgetFile('en', '2026-10-30T22:30:00Z')
      expect(ry.days[0].date).toBe('2026-10-31')
      expect(ry.days[0].times.find((t) => t.key === 'dhuhr')!.sunan!.name).toBeUndefined()
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      vi.stubGlobal('localStorage', new MemStorage())
    }
  })

  it('the times page and both widgets draw the row’s own name and the day’s line', () => {
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    expect(page).toMatch(/const friday = isFridayYmd\(ymdIn\(now, tz\)\)/)
    expect(page).toMatch(/\{sunanRowName\(n, s\.prayers\[n\], lang, friday\)\}\s*<SunanLineView prayer=\{n\} friday=\{friday\} \/>/)
    expect(page).toMatch(/sunanLine\(n, lang, friday\)!\.spoken/)
    expect(page).toMatch(/const line = sunanLine\(prayer, lang, friday\)/)
    // iOS: the file's row name, optional (a file written before it still reads); the spoken label is the file's.
    expect(read('web/ios/App/MuslimWidgets/WidgetData.swift')).toMatch(/var name: String\?/)
    const swift = read('web/ios/App/MuslimWidgets/Views.swift')
    expect(swift).toContain('Text(time.sunan?.name ?? time.name)')
    // Android: the same name for the row's height and its drawing.
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(java).toContain('String own = sunan != null ? sunan.optString("name", "") : "";')
    expect(java).toContain('StaticLayout nl = block(rowName(t), plexR, 15 * u, 0, 0.7f, nameW, 2, 9999, START, dir(), 1);')
    expect(java).toContain('String name = rowName(t);')
    expect(java).not.toMatch(/block\(t\.optString\("name"\)/)
  })

  it('the sheet of sources: «الجمعة», 65764 and 3062 with their text as HadeethEnc gives it, the Arabic always', () => {
    expect(SUNAN_FRIDAY_SOURCES.map((h) => h.id)).toEqual(['65764', '3062'])
    const [h65764, h3062] = SUNAN_FRIDAY_SOURCES
    expect([h65764.attribution, h65764.grade]).toEqual(['رواه مسلم', 'صحيح'])
    expect(h65764.text.ar).toContain('إذا صليتم بعد الجمعة')
    expect(Object.keys(h65764.text)).toEqual(['ar'])
    expect(h3062.text.ar).toContain('بَعْدَ الْجُمُعَةِ رَكْعَتَيْنِ')
    const page = read('web/src/v2/daily/PrayerTimes.tsx')
    const sheet = page.slice(page.indexOf('function SunanSources()'), page.indexOf('function Forbidden('))
    expect(sheet).toMatch(/<h3 className="dt-sunan-friday-h">\{su\.jumuah\}<\/h3>/)
    expect(sheet).toMatch(/SUNAN_FRIDAY_SOURCES\.map/)
    expect(sheet).toMatch(/lang="ar" dir="rtl">\s*\{h\.text\.ar\}/)
    expect(sheet).toMatch(/const own = lang !== 'ar' \? h\.text\[lang\] : undefined/)
    // No hadith text is typed in the code: the sheet reads the file, the file is written from our data.
    expect(read('web/src/v2/daily/sunan.ts')).not.toContain('إذا صليتم')
    expect(page).not.toContain('إذا صليتم')
    expect(read('docs/SUNAN.md')).toContain(h65764.text.ar)
  })

  const HADITHS = path.join(ROOT, 'data/processed/hadith.jsonl')
  describe.runIf(fs.existsSync(HADITHS))('against our data', () => {
    it('sunan-friday.json is our data’s text, attribution, grade and release, in every one of the ten languages it has', () => {
      const want = new Map<string, { text: Record<string, string>; version: Record<string, string>; attribution?: string; grade?: string }>()
      for (const line of fs.readFileSync(HADITHS, 'utf8').split('\n')) {
        const id = /"id":"(\d+)"/.exec(line)?.[1]
        if (!id || !['65764', '3062'].includes(id)) continue
        const r = JSON.parse(line) as { lang: string; hadeeth: string; version: string; attribution: string; grade: string }
        if (!(LANGS as readonly string[]).includes(r.lang)) continue
        const w = want.get(id) ?? { text: {}, version: {} }
        w.text[r.lang] = r.hadeeth
        w.version[r.lang] = r.version
        if (r.lang === 'ar') Object.assign(w, { attribution: r.attribution, grade: r.grade })
        want.set(id, w)
      }
      expect(want.get('65764'), '65764 is in our data').toBeTruthy()
      for (const h of SUNAN_FRIDAY_SOURCES) {
        const w = want.get(h.id)!
        expect(h.text, h.id).toEqual(w.text)
        expect(h.version, h.id).toEqual(w.version)
        expect([h.attribution, h.grade], h.id).toEqual([w.attribution, w.grade])
      }
    })
  })
})

describe('§2 the next prayer’s gold pill', () => {
  it('its text reaches 4.5:1 on both gold stops and along the whole gradient; white and the lapis asked for did not', () => {
    const [deep, light] = PILL.stops
    expect(contrast(PILL.text, deep)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(PILL.text, light)).toBeGreaterThanOrEqual(4.5)
    const min = Math.min(...gradient(deep, light).map((c) => ratio(rgb(PILL.text), c)))
    expect(min).toBeGreaterThanOrEqual(4.5)
    expect(min).toBeCloseTo(contrast(PILL.text, deep), 2)
    // The measured values (relay/w1/0072-review-queue/add67-report.md).
    expect(contrast(PILL.was, deep).toFixed(2)).toBe('3.12')
    expect(contrast(PILL.was, light).toFixed(2)).toBe('2.04')
    expect(contrast(PILL.asked, deep).toFixed(2)).toBe('3.59')
    expect(contrast(PILL.asked, light).toFixed(2)).toBe('5.51')
    expect(contrast(PILL.text, deep).toFixed(2)).toBe('5.06')
    expect(contrast(PILL.text, light).toFixed(2)).toBe('7.76')
    expect(contrast(PILL.asked, deep)).toBeLessThan(4.5)
  })

  it('iOS and Android draw the same pill with that text, for the name, the time and the sunnahs’ line', () => {
    const swift = read('web/ios/App/MuslimWidgets/Views.swift')
    const row = swift.slice(swift.indexOf('struct TimeRow'), swift.indexOf('private struct SpokenLabel'))
    expect(row).toContain('Color(hex: 0xb88a35), Color(hex: 0xd8b064)')
    expect(row).toContain(`static let onGold = Color(hex: 0x${PILL.text.slice(1)})`)
    expect(row).not.toMatch(/\.white/)
    expect(row.match(/isNext \? TimeRow\.onGold/g)).toHaveLength(4)
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(java).toContain('0xFFB88A35, 0xFFD8B064')
    expect(java).toContain(`static final int ON_GOLD = 0xFF${PILL.text.slice(1).toUpperCase()};`)
    const col = java.slice(java.indexOf('private void column('), java.indexOf('private static void appendColored('))
    expect(col).not.toContain('Color.WHITE')
    expect(col.match(/ON_GOLD/g)!.length).toBeGreaterThanOrEqual(5)
    // The web app has no gold pill: the times page's next prayer is the blue tint with lapis text.
    expect(read('web/src/v2/daily/today.css')).not.toMatch(/b88a35|d8b064/i)
  })
})
