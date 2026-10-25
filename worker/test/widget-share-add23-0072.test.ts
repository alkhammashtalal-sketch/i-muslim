// Add-on 0072-add23 §4 (the iOS widgets and the share images; the card is the names agent's):
//   §4.1 the page dots: the first page on the right in Arabic in every mode, laid out by hand from the data's direction;
//   §4.2 the large widget's shamsa: a radial mask clear before the square's sides, so no edge shows on the sky;
//   §4.3 the medium's «٢ من ٩٦» under the shamsa, not over its rays;
//   §4.4 «✦», not «·», in every Arabic line of the widgets and the images; §4.5 Arabic-Indic digits in the salaf's
//   reference; §4.6 the images' Hijri date takes the user's and the global offset, and a new offset writes the widgets'
//   file again; §4.7 «النص بالعربية» in the interface's language above a quoted text in Arabic, never a translation;
//   §4.8 the salaf widget Arabic in every interface, «in Arabic» in its gallery.
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
const events: string[] = []
vi.stubGlobal('window', { dispatchEvent: (e: Event) => void events.push(e.type), addEventListener() {}, removeEventListener() {} })

const ROOT = path.resolve(__dirname, '../..')
const SWIFT = fs.readFileSync(path.join(ROOT, 'web/ios/App/MuslimWidgets/NameViews.swift'), 'utf8')
const NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names-daily.json'), 'utf8')) as {
  epoch: string
  entries: { n: number; ayah: string | null; hadith: string | null; meaningAyah: string | null; tafsirOf: string | null; duas: { kind: string; id: string }[]; readings: unknown }[]
}

const M = await import('../../web/src/v2/daily/arabic-marks')
const W = await import('../../web/src/native/widget-names')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')
const { saveHijriOffset } = await import('../../web/src/v2/daily/store')
const { riyadhHijri, nameEvidence } = await import('../../web/src/v2/daily/names/NameShare')
const { hijriDisc } = await import('../../web/src/v2/home/hijri-disc')
const { SALAF_CARDS } = await import('../../web/src/v2/daily/salaf/salaf-model')
const { nameDayIndex } = await import('../../worker/src/names-day')

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url, 'https://x.test')
    const day = u.pathname === '/api/names/day' ? u.searchParams.get('day')! : null
    if (day) {
      const index = nameDayIndex(day)
      const { readings, ...entry } = NAMES.entries[index]
      return new Response(JSON.stringify({ day, index, count: NAMES.entries.length, entry, readings }))
    }
    const pass = u.pathname.match(/^\/api\/passage\/quran:(\d+):(\d+)$/)
    if (pass) {
      const [s, a] = [Number(pass[1]), Number(pass[2])]
      return new Response(
        JSON.stringify({
          id: `quran:${s}:${a}`,
          text: `نص الآية ${s}:${a}`,
          ayah: { sura: s, aya: a, page: 1, suraName: 'هود', suraAyat: 123 },
          text_en: `Meaning ${s}:${a}`,
          tafsir: [{ key: 'saadi', name: 'تفسير السعدي', text: 'تفسير.', paragraphs: ['تفسير.'], ref: '', url: '' }],
        }),
      )
    }
    const h = u.pathname.match(/^\/api\/adhkar\/hadith\/(\d+)$/)
    if (h) return new Response(JSON.stringify({ id: h[1], text: `نص الحديث ${h[1]}`, grade: 'صحيح', attribution: 'رواه مسلم 57' }))
    return new Response('{}', { status: 404 })
  })
})
afterAll(() => vi.unstubAllGlobals())

const dayOf = (n: number) => new Date(Date.parse(`${NAMES.epoch}T00:00:00Z`) + (n - 1) * 86_400_000).toISOString().slice(0, 10)
const withTafsir = NAMES.entries.find((e) => e.tafsirOf && e.tafsirOf === (e.ayah ?? e.meaningAyah))!

describe('§4.4–§4.5 the marks of the Arabic lines', () => {
  it('«✦» in Arabic, «·» elsewhere; Latin digits as Arabic-Indic', () => {
    expect(M.sepOf('ar')).toBe(' ✦ ')
    expect(M.sepOf('en')).toBe(' · ')
    expect(M.arabicIndicIn('ج10، ص29')).toBe('ج١٠، ص٢٩')
    expect(M.arabicIndicIn('«الزهد» ص99')).toBe('«الزهد» ص٩٩')
  })
  it('no «·» in any Arabic line of the name widget; the ayah’s place «هود ✦ ٥٧»', async () => {
    for (const e of NAMES.entries) {
      const d = (await W.nameWidgetDay(dayOf(e.n), 'ar', 'ar', WIDGET_STRINGS.ar.of))!
      for (const p of d.pages) {
        const lines = [p.label, 'ref' in p ? p.ref : '', 'source' in p ? p.source : '']
        for (const l of lines) expect(l, `${e.n} ${p.kind}`).not.toContain('·')
        if (p.kind === 'ayah') expect(p.ref).toMatch(/^هود ✦ [٠-٩]+$/)
      }
    }
    // Outside Arabic the line keeps «·» with the reader's digits.
    const en = (await W.nameWidgetDay(dayOf(withTafsir.n), 'en', 'en', WIDGET_STRINGS.en.of))!
    const a = en.pages.find((p) => p.kind === 'ayah')
    if (a?.kind === 'ayah') expect(a.ref).toMatch(/^Surah \d+ · \d+$/)
  })
  it('the salaf widget’s reference has no Latin digit', () => {
    const days = W.salafWidgetDays(new Date('2026-10-25T09:00:00Z'), SALAF_CARDS.length)
    expect(days.length).toBe(SALAF_CARDS.length)
    for (const d of days) {
      expect(d.source).not.toMatch(/[0-9]/)
      expect(d.place).not.toMatch(/[0-9]/)
    }
    expect(days.some((d) => /[٠-٩]/.test(d.place))).toBe(true)
  })
  it('the widget’s title line takes «✦» in Arabic (NameViews.swift)', () => {
    expect(SWIFT).toMatch(/data\.lang == "ar" \? "✦" : "·"/)
    expect(SWIFT).not.toMatch(/"اسم الله لليوم"\) · \\\(day\.of\)/)
  })
  it('the name image’s Arabic lines take «✦»', () => {
    const ev = nameEvidence(
      { n: 2, name: 'الحفيظ', ayah: 'quran:11:57' } as never,
      [{ kind: 'ayah', id: 'quran:11:57', p: { text: 'نص', ayah: { sura: 11, aya: 57, suraName: 'هود' } } } as never],
    )!
    expect(ev.evidence.kind === 'ayah' && ev.evidence.refLine).toBe('سورة هود ✦ ٥٧')
    expect(ev.sourceLine).toBe('نص المصحف ✦ المصحف الإلكتروني')
    const img = fs.readFileSync(path.join(ROOT, 'web/src/v2/reading/share-image.ts'), 'utf8')
    expect(img).toContain(".join(' ✦ ')")
    const salaf = fs.readFileSync(path.join(ROOT, 'web/src/v2/daily/salaf/SalafShare.tsx'), 'utf8')
    expect(salaf).toMatch(/arabicIndicIn\(salafSource\(card\)\)\}\$\{sepOf\('ar'\)\}\$\{SHAMELA\}/)
  })
})

describe('§4.6 the Hijri offset', () => {
  it('the image’s date is the card’s with the offset', () => {
    const day = '2026-10-25'
    const noon = new Date(Date.parse(`${day}T12:00:00+03:00`))
    for (const k of [-2, -1, 0, 1, 2]) expect(riyadhHijri(day, k)).toBe(hijriDisc('ar', noon, 'Asia/Riyadh', k)!.full)
    expect(riyadhHijri(day, 1)).not.toBe(riyadhHijri(day, 0))
    expect(riyadhHijri(day)).toBe(riyadhHijri(day, 0))
  })
  it('both share sheets pass the offset of useHijriOffset', () => {
    for (const f of ['web/src/v2/daily/names/NameShare.tsx', 'web/src/v2/daily/salaf/SalafShare.tsx']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      expect(src, f).toMatch(/useHijriOffset\(\)/)
      expect(src, f).toMatch(/riyadhHijri\(day, offset\)/)
    }
  })
  it('a new offset in the settings writes the widgets’ file again', () => {
    events.length = 0
    saveHijriOffset(1)
    expect(events).toContain('muslim:widgets')
    expect(localStorage.getItem('muslim.hijri.offset.v1')).toBe('1')
    saveHijriOffset(0)
  })
})

describe('§4.7–§4.8 quoted texts outside Arabic', () => {
  it('«النص بالعربية» in the ten languages, none in Arabic', () => {
    for (const lang of Object.keys(WIDGET_STRINGS)) {
      const n = M.quoteNote(lang)
      if (lang === 'ar') expect(n).toBeNull()
      else {
        expect(n, lang).toBeTruthy()
        expect(n).not.toMatch(/[!؟?]/)
      }
    }
    expect(M.QUOTE_IN_ARABIC.ar).toBe('النص بالعربية')
    expect(M.quoteNote('en')).toBe('Text in Arabic')
  })
  it('al-Saʿdi’s quote carries it outside Arabic, nothing in Arabic; a page with its meaning carries none', async () => {
    const en = (await W.nameWidgetDay(dayOf(withTafsir.n), 'en', 'en', WIDGET_STRINGS.en.of))!
    const m = en.pages.find((p) => p.kind === 'meaning')!
    expect(m.kind === 'meaning' && m.inArabic).toBe('Text in Arabic')
    const a = en.pages.find((p) => p.kind === 'ayah')!
    expect(a.kind === 'ayah' && a.meaning?.text).toBeTruthy()
    expect(a.kind === 'ayah' && a.inArabic).toBeNull()
    const ar = (await W.nameWidgetDay(dayOf(withTafsir.n), 'ar', 'ar', WIDGET_STRINGS.ar.of))!
    for (const p of ar.pages) if (p.kind !== 'reading') expect(p.inArabic).toBeNull()
  })
  it('the salaf widget and the images show it above the Arabic saying (NameViews.swift, share-image.ts)', () => {
    expect(SWIFT).toMatch(/data\.lang != "ar", let q = data\.labels\.quoteInArabic/)
    const img = fs.readFileSync(path.join(ROOT, 'web/src/v2/reading/share-image.ts'), 'utf8')
    expect((img.match(/if \(input\.quoteNote\) drawNote/g) ?? []).length).toBe(2)
  })
  it('the salaf widget’s gallery says «in Arabic» in every language', () => {
    const words = { ar: 'بالعربية', en: 'in Arabic', ur: 'عربی میں', id: 'bahasa Arab', ms: 'bahasa Arab', tr: 'Arapça', fr: 'en arabe', es: 'en árabe', bn: 'আরবিতে', hi: 'अरबी में' }
    for (const [lang, w] of Object.entries(words)) expect(WIDGET_STRINGS[lang as keyof typeof WIDGET_STRINGS].names.salaf.desc, lang).toContain(w)
  })
})

describe('§4.1–§4.3 the views (NameViews.swift)', () => {
  it('the dots: laid out left to right by hand, reversed in Arabic, at every call', () => {
    expect(SWIFT).toMatch(/static func order\(_ count: Int, rtl: Bool\) -> \[Int\] \{ rtl \? Array\(\(0\.\.<count\)\.reversed\(\)\) : Array\(0\.\.<count\) \}/)
    expect(SWIFT).toMatch(/ForEach\(PageDots\.order\(count, rtl: rtl\)/)
    const body = SWIFT.slice(SWIFT.indexOf('struct PageDots'), SWIFT.indexOf('struct NamePill'))
    expect(body).toContain('.environment(\\.layoutDirection, .leftToRight)')
    const calls = SWIFT.match(/PageDots\(count:[^\n]*/g) ?? []
    expect(calls.length).toBe(2)
    for (const c of calls) expect(c).toContain('rtl: data.rtl')
  })
  it('the shamsa’s mask is clear at the inscribed circle, before the square’s sides', () => {
    expect(SWIFT).toContain('.mask(RadialGradient(stops: ShamsaName.fade, center: .center, startRadius: 0, endRadius: d * 0.5))')
    expect(SWIFT).toMatch(/\.init\(color: \.black\.opacity\(0\), location: 1\)\]/)
  })
  it('the medium’s «٢ من ٩٦» sits under the shamsa, not lifted over its rays', () => {
    const med = SWIFT.slice(SWIFT.indexOf('struct NameMediumView'), SWIFT.indexOf('struct NameSmallBackground'))
    expect(med).toContain('ShamsaName(name: day.name, d: 144 * s)')
    expect(med).not.toMatch(/\.offset\(y: -8 \* s\)/)
  })
})
