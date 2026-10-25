// The luxury name card (add-on 0072-add11 §1): its model (web/src/v2/daily/names/name-card-model.ts). The sections in
// order and present-only (a section the server does not send is absent, never filled); what the home shows before
// «أكمل القراءة»; the quotes' attribution and source lines by the rules of «من أقوال السلف» (add-on 0072-add4); a quote
// short of what the rules ask is left out, never mended; «أثره في قلبك» takes the readings' place only when sent. And the
// card's strings in the ten languages, with no exclamation mark, and the shamsa the widgets' file byte for byte.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { authorBy, cardPlan, contextRequired, heartOf, meaningHadithRef, meaningHadithShown, quoteAttribution, quoteOrigin, quoteRef, quoteSite, quoteSource, riyadhNoon, SECTIONS, shownCount, shownQuotes } from '../../web/src/v2/daily/names/name-card-model'
import { NAME_CARD } from '../../web/src/v2/daily/names/strings-name-card'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
// The shape worker/src/names-day.ts sends (the content branch, data/names-enriched.json).
const q = (o: Record<string, unknown> = {}) => ({ text: 'نص', by: 'ابن عباس', attribution: 'qala', author: 'ابن جرير الطبري', book: 'جامع البيان', ref: 'ج24 - ص692', url: 'https://shamela.ws/book/1/1', ...o })
const none = { evidence: 0, meaning: 0, salaf: 0, heart: 0, dua: 0, tafsir: 0 }

describe('the sections (add-on 0072-add11 §1)', () => {
  it('six, in Talal’s order', () => {
    expect([...SECTIONS]).toEqual(['evidence', 'meaning', 'salaf', 'heart', 'dua', 'tafsir'])
  })
  it('present-only: what has nothing is absent', () => {
    expect(cardPlan({ ...none, evidence: 1, dua: 1, tafsir: 1, heart: 1 }, 'page').present).toEqual(['evidence', 'heart', 'dua', 'tafsir'])
    expect(cardPlan({ ...none, evidence: 1 }, 'page')).toEqual({ present: ['evidence'], lead: ['evidence'], more: false })
  })
  it('the home: the evidence, the first meaning and one saying, then «أكمل القراءة» for the rest', () => {
    const p = cardPlan({ evidence: 1, meaning: 3, salaf: 2, heart: 1, dua: 1, tafsir: 1 }, 'home')
    expect(p.lead).toEqual(['evidence', 'meaning', 'salaf'])
    expect(p.more).toBe(true)
    expect(shownCount('meaning', 3, false, p)).toBe(1)
    expect(shownCount('salaf', 2, false, p)).toBe(1)
    expect(shownCount('heart', 1, false, p)).toBe(0)
    expect(shownCount('meaning', 3, true, p)).toBe(3)
    expect(shownCount('tafsir', 1, true, p)).toBe(1)
  })
  it('the home with nothing more: no «أكمل القراءة», all shown', () => {
    const p = cardPlan({ ...none, evidence: 1, meaning: 1 }, 'home')
    expect(p.more).toBe(false)
    expect(shownCount('meaning', 1, false, p)).toBe(1)
  })
  it('the three whose only Quranic text is a dua lead with it', () => {
    const p = cardPlan({ ...none, dua: 1, tafsir: 1, heart: 1 }, 'home')
    expect(p.lead).toEqual(['dua'])
    expect(shownCount('dua', 1, false, p)).toBe(1)
    expect(p.more).toBe(true)
  })
})

describe('the quotes (add-on 0072-add11 §2, the rules of 0072-add4)', () => {
  it('«قال» for a connected chain, «يُروى عن» for any other', () => {
    expect(quoteAttribution(q())).toBe('قال ابن عباس')
    expect(quoteAttribution(q({ attribution: 'yurwa' }))).toBe('يُروى عن ابن عباس')
  })
  it('the book, its author as read after «لـ», the volume and page', () => {
    expect(quoteRef(q())).toBe('ج24، ص692')
    expect(quoteSource(q())).toBe('«جامع البيان» لابن جرير الطبري، ج24، ص692')
    expect(quoteSource(q({ ref: 'ص99' }))).toBe('«جامع البيان» لابن جرير الطبري، ص99')
    // The authors of batch 1.
    expect(authorBy('عبد الرحمن بن ناصر السعدي')).toBe('لعبد الرحمن بن ناصر السعدي')
    expect(authorBy('ابن قيم الجوزية')).toBe('لابن قيم الجوزية')
    expect(authorBy('ابن كثير')).toBe('لابن كثير')
    expect(authorBy('أبو سليمان الخطابي')).toBe('لأبي سليمان الخطابي')
    expect(authorBy('أبو بكر البيهقي')).toBe('لأبي بكر البيهقي')
    expect(authorBy('الحليمي')).toBe('للحليمي')
  })
  it('the link’s words: the site', () => {
    expect(quoteSite('https://shamela.ws/book/1/1')).toBe('المكتبة الشاملة')
    expect(quoteSite('https://quran.ksu.edu.sa/tafseer/tabary/sura112-aya2.html')).toBe('المصحف الإلكتروني')
    expect(quoteSite('not a url')).toBe('')
  })
  it('a quote short of the rules is left out, never mended; one to three', () => {
    expect(shownQuotes(undefined)).toEqual([])
    expect(shownQuotes([q({ text: ' ' }), q({ by: '' }), q({ url: 'http://shamela.ws/' }), q({ attribution: 'x' }), q({ book: '' }), q({ author: '' })])).toEqual([])
    // A prophet's words in the ayah: never without their context line.
    expect(shownQuotes([q({ context_required: true })])).toEqual([])
    expect(shownQuotes([q({ context_required: true, context: 'في تفسير قوله تعالى في الشعراء 80' })])).toHaveLength(1)
    expect(shownQuotes([q(), q(), q(), q()])).toHaveLength(3)
  })
})

describe('«أثره في قلبك» (§3)', () => {
  const rd = { meaning: 'م', easy: 'ي', deep: ['ع'] }
  it('the rewrite when the server sends it, else the readings as they are, else nothing', () => {
    expect(heartOf({ heart: 'فقرة', readings: rd })).toEqual({ kind: 'heart', paragraphs: ['فقرة'] })
    expect(heartOf({ heart: 'أولى\nثانية' })).toEqual({ kind: 'heart', paragraphs: ['أولى', 'ثانية'] })
    expect(heartOf({ heart: ' ', readings: rd })).toEqual({ kind: 'readings', readings: rd })
    expect(heartOf({})).toBeNull()
  })
})

describe('the batch of the content branch, when it is here (data/names-enriched.json)', () => {
  const file = path.join(ROOT, 'data/names-enriched.json')
  it.skipIf(!fs.existsSync(file))('every quote of it passes the card’s rules, none left out', () => {
    const d = JSON.parse(fs.readFileSync(file, 'utf8')) as { entries: Record<string, { meaning?: unknown[]; salaf?: unknown[] }> }
    for (const e of Object.values(d.entries))
      for (const k of ['meaning', 'salaf'] as const) if (e[k]) expect(shownQuotes(e[k])).toHaveLength(Math.min(3, e[k]!.length))
  })
})

describe('the header’s date', () => {
  it('the Riyadh day’s noon', () => {
    expect(riyadhNoon('2026-10-25').toISOString()).toBe('2026-10-25T09:00:00.000Z')
  })
})

describe('the card’s strings', () => {
  it('ten languages, every key, no exclamation mark; Talal’s titles in Arabic', () => {
    const keys = Object.keys(NAME_CARD.ar).sort()
    for (const l of LANGS) {
      expect(Object.keys(NAME_CARD[l]).sort()).toEqual(keys)
      for (const v of Object.values(NAME_CARD[l])) {
        expect(v.trim()).not.toBe('')
        expect(v).not.toMatch(/[!！¡]/)
      }
      expect(NAME_CARD[l].ofCount).toContain('{n}')
      expect(NAME_CARD[l].ofCount).toContain('{count}')
    }
    const ar = NAME_CARD.ar
    expect([ar.today, ar.evidence, ar.meaning, ar.salaf, ar.heart, ar.dua, ar.tafsir, ar.readMore, ar.share]).toEqual([
      'اسم الله لليوم',
      'الدليل',
      'معنى الاسم عند العلماء',
      'من أقوال السلف في الاسم',
      'أثره في قلبك',
      'ادعُ الله به',
      'تفسير الآية',
      'أكمل القراءة',
      'شارك',
    ])
  })
})

describe('the pictures', () => {
  const sha = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex')
  it('the shamsa, the sky’s stars and the paper are the widgets’ own files, byte for byte', () => {
    const W = 'web/ios/App/MuslimWidgets/Assets.xcassets'
    expect(sha('web/public/art/medallion.png')).toBe(sha(`${W}/medallion.imageset/medallion.png`))
    expect(sha('web/public/art/sky-stars.png')).toBe(sha(`${W}/sky.imageset/sky.png`))
    expect(sha('web/public/art/paper.png')).toBe(sha(`${W}/paper.imageset/paper.png`))
  })
})

// Add-on 0072-add16: what the server now sends for batch 1 after its second review, as the card reads it.
describe('add-on 0072-add16: the hadith on the meaning, the required context, the origin, two pages', () => {
  const ref = { id: '6335', grade: 'صحيح', attribution: 'رواه مسلم', url: 'https://hadeethenc.com/ar/browse/hadith/6335' }
  const h = { id: '6335', title: null, text: 'اللهم أنت الأول فليس قبلك شيء', grade: 'صحيح', attribution: 'رواه مسلم', tier: '1', version: null }
  it('meaningHadith: whole or none, never mended', () => {
    expect(meaningHadithRef(ref)).toEqual(ref)
    for (const bad of [undefined, null, 'x', { ...ref, id: '63a5' }, { ...ref, grade: '' }, { ...ref, attribution: undefined }, { ...ref, url: 'http://hadeethenc.com/ar/browse/hadith/6335' }, { ...ref, url: 'https://example.com/6335' }]) expect(meaningHadithRef(bad)).toBeNull()
  })
  it('the hadith shown is the one named, with the same grade and takhrij letter for letter, else none', () => {
    expect(meaningHadithShown(ref, h)).toBe(h)
    expect(meaningHadithShown(ref, { ...h, id: '6336' })).toBeNull()
    expect(meaningHadithShown(ref, { ...h, grade: 'حسن' })).toBeNull()
    expect(meaningHadithShown(ref, { ...h, attribution: 'متفق عليه' })).toBeNull()
    expect(meaningHadithShown(null, h)).toBeNull()
    expect(meaningHadithShown(ref, null)).toBeNull()
  })
  it('contextRequired, the server’s name, as context_required: without its context line the quote is left out', () => {
    expect(contextRequired(q({ contextRequired: true }))).toBe(true)
    expect(contextRequired(q({ context_required: true }))).toBe(true)
    expect(contextRequired(q())).toBe(false)
    expect(shownQuotes([q({ contextRequired: true })])).toEqual([])
    expect(shownQuotes([q({ contextRequired: true, context: 'في التعبد باسمه الأول' })])).toHaveLength(1)
  })
  it('origin: its words and a https link, or none; the HadeethEnc link reads «موسوعة الأحاديث»', () => {
    const o = { text: 'وأصله في البخاري (4563، 4564)', url: 'https://hadeethenc.com/ar/browse/hadith/65287' }
    expect(quoteOrigin(q({ origin: o }))).toEqual(o)
    expect(quoteOrigin(q())).toBeNull()
    expect(quoteOrigin(q({ origin: { ...o, text: ' ' } }))).toBeNull()
    expect(quoteOrigin(q({ origin: { ...o, url: 'javascript:alert(1)' } }))).toBeNull()
    expect(quoteSite(o.url)).toBe('موسوعة الأحاديث')
  })
  it('two printed pages: «ج1، ص219–220»', () => {
    // Kept on one line: word joiners on both sides of the dash.
    expect(quoteRef(q({ ref: 'ج1 - ص219–220' }))).toBe('ج1، ص219\u2060–\u2060220')
    expect(quoteSource(q({ ref: 'ج1 - ص219–220', book: 'الأسماء والصفات', author: 'أبو بكر البيهقي' })).replace(/\u2060/g, '')).toBe('«الأسماء والصفات» لأبي بكر البيهقي، ج1، ص219–220')
  })
  it('the batch’s own: الأول، الآخر، الظاهر name HadeethEnc 6335 whole; the nine required context lines have theirs', () => {
    const file = path.join(ROOT, 'data/names-enriched.json')
    if (!fs.existsSync(file)) return
    const { entries } = JSON.parse(fs.readFileSync(file, 'utf8')) as { entries: Record<string, { meaning?: Record<string, unknown>[]; salaf?: Record<string, unknown>[]; meaningHadith?: unknown }> }
    for (const n of ['15', '16', '17']) expect(meaningHadithRef(entries[n].meaningHadith), n).toEqual(ref)
    const all = Object.values(entries).flatMap((e) => [...(e.meaning ?? []), ...(e.salaf ?? [])])
    const req = all.filter((x) => contextRequired(x as never))
    expect(req.length).toBeGreaterThan(0)
    for (const x of req) expect(shownQuotes([x]), String(x.text)).toHaveLength(1)
  })
})
