// The language picker of reply 0033 §أ1: the served languages and their badges from the data, the names, the order,
// the device's language, the search (normalisation, aliases, slips, «أقرب نتيجة», highlights) and the content language.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import served from '../../data/served-langs.json'
import aliases from '../../data/lang-aliases.json'
import { foldText, normalizeName, searchWord, typedArticle, validRequest } from '../../shared/lang-norm'
import { contentDir, contentFor, deviceLang, englishName, nativeName, servedRows, SERVED, uiLangFor, uiName } from '../../web/src/v2/lang/served'
import { highlightOrWhole, highlightWords, searchLangs } from '../../web/src/v2/lang/search'
import { MEANING_LANGS } from '../src/meaning'
import { HADITH_LANGS } from '../src/hadith'
import { ML } from '../../web/src/quran/api'

const ROOT = path.resolve(import.meta.dirname, '../..')
const top = (q: string, ui: 'ar' | 'en' = 'ar') => searchLangs(q, ui)[0]?.row.code

describe('served languages (data/served-langs.json)', () => {
  const codes = served.langs.map((l) => l.code)
  it('are Arabic, English and every language with a human meaning translation served by meaning.ts: 31', () => {
    expect(codes.slice(0, 2)).toEqual(['ar', 'en'])
    expect(new Set(codes)).toEqual(new Set(['ar', 'en', ...MEANING_LANGS]))
    expect(codes.length).toBe(31)
  })
  it('the badge follows the rule: full = meanings + al-Mukhtasar + hadiths with explanation; no-tafsir without al-Mukhtasar; else none', () => {
    for (const l of served.langs) {
      const meanings = l.meanings.rows > 0
      const mx = l.mukhtasar !== null
      const hadith = l.hadith.explained > 0
      expect(l.badge, l.code).toBe(meanings && mx && hadith ? 'full' : meanings && hadith ? 'no-tafsir' : null)
    }
    const by = (b: string | null) => served.langs.filter((l) => l.badge === b).map((l) => l.code).sort()
    expect(by('full')).toEqual(['ar', 'bn', 'es', 'fr', 'hi', 'id', 'tr'])
    expect(by('no-tafsir')).toEqual(['en', 'ms', 'ur'])
    expect(by(null)).toHaveLength(21)
  })
  it('only the HadeethEnc languages have hadiths; Italian and Arabic al-Mukhtasar are never counted', () => {
    for (const l of served.langs) expect(l.hadith.rows > 0, l.code).toBe((HADITH_LANGS as readonly string[]).includes(l.code))
    expect(served.langs.some((l) => typeof l.mukhtasar === 'string' && /italian|arabic_mokhtasar/.test(l.mukhtasar))).toBe(false)
  })
  it('the Arabic-script languages read right to left, from their own letters', () => {
    expect(served.langs.filter((l) => l.dir === 'rtl').map((l) => l.code).sort()).toEqual(['ar', 'fa', 'ku', 'ps', 'ug', 'ur'])
  })
  // Needs the full data (outside git) and the same ICU as the build (the names come from CLDR).
  it.skipIf(!fs.existsSync(path.join(ROOT, 'data/processed/meanings.jsonl')) || process.versions.icu !== served.icu)('rebuilding from the data gives the same file', async () => {
    const before = fs.readFileSync(path.join(ROOT, 'data/served-langs.json'), 'utf8')
    const { execFileSync } = await import('node:child_process')
    execFileSync('node', [path.join(ROOT, 'scripts/daily/served-langs-build.mjs')], { stdio: 'pipe' })
    expect(fs.readFileSync(path.join(ROOT, 'data/served-langs.json'), 'utf8')).toBe(before)
  }, 60_000)
  it('the web asks meaning.ts for every language it serves a meaning in', () => {
    expect([...ML].sort()).toEqual([...MEANING_LANGS].sort())
  })
  it('every alias belongs to a served language', () => {
    for (const code of Object.keys(aliases.aliases)) expect(codes, code).toContain(code)
    for (const code of codes) expect((aliases.aliases as Record<string, string[]>)[code]?.length ?? 0, code).toBeGreaterThan(0)
  })
})

describe('names and order', () => {
  it('line 1 in the language itself, line 2 in Arabic with the two corrections', () => {
    expect(nativeName('ar')).toBe('العربية')
    expect(nativeName('ur')).toBe('اردو')
    expect(nativeName('es')).toBe('Español')
    expect(nativeName('az')).toBe('Azərbaycan')
    expect(uiName('ur', 'ar')).toBe('الأردية')
    expect(uiName('ms', 'ar')).toBe('الملايوية')
    expect(uiName('fa', 'ar')).toBe('الفارسية')
    expect(englishName('fa')).toBe('Persian')
  })
  it('names come from the data (CLDR at build time), not from a browser that may lack the locale', () => {
    expect(nativeName('as')).toBe('অসমীয়া')
    expect(nativeName('ug')).toBe('ئۇيغۇرچە')
    expect(nativeName('ps')).toBe('پښتو')
    expect(uiName('as', 'ar')).toBe('الأسامية')
    expect(uiName('fa', 'fr')).toBe('Persan')
    for (const l of served.langs) for (const k of ['self', 'ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']) expect((l.names as Record<string, string>)[k], l.code + ' ' + k).toBeTruthy()
  })
  it('QuranEnc’s Kurdish is named as Central Kurdish, in the script of its text', () => {
    expect(nativeName('ku')).toBe('کوردیی ناوەندی')
    expect(contentDir('ku')).toBe('rtl')
  })
  it('the list is ordered by the Arabic name with Intl.Collator("ar"), and holds every served language', () => {
    const rows = servedRows('ar')
    expect(rows).toHaveLength(SERVED.length)
    const names = rows.map((r) => r.ui)
    expect(names).toEqual([...names].sort(new Intl.Collator('ar').compare))
    expect(names.slice(0, 3)).toEqual(['الأذربيجانية', 'الأردية', 'الأسامية'])
  })
  it('the device language is the first served one of navigator.languages', () => {
    expect(deviceLang(['de-DE', 'ar-SA', 'en'])).toBe('ar')
    expect(deviceLang(['zh-Hans-CN'])).toBe('zh')
    expect(deviceLang(['fil-PH'])).toBe('tl')
    expect(deviceLang(['de', 'it'])).toBeNull()
  })
})

describe('content language', () => {
  it('one of the ten sets both; any other served language goes with English', () => {
    expect(uiLangFor('ur')).toBe('ur')
    expect(uiLangFor('fa')).toBe('en')
    expect(contentFor('fa', 'en')).toBe('fa')
    expect(contentFor('fa', 'ar')).toBe('ar') // the interface was changed elsewhere (?lang=ar): content follows
    expect(contentFor('fr', 'en')).toBe('en')
    expect(contentFor('xx', 'tr')).toBe('tr')
    expect(contentFor(undefined, 'ar')).toBe('ar')
  })
  it('direction: the data first, then the list', () => {
    expect(contentDir('fa')).toBe('rtl')
    expect(contentDir('ur')).toBe('rtl')
    expect(contentDir('tr')).toBe('ltr')
    expect(contentDir('zh')).toBe('ltr')
  })
})

describe('normalisation', () => {
  it('Arabic: no diacritics or tatweel, أ/إ/آ → ا, ة → ه, ى → ي, a leading «ال» dropped', () => {
    expect(normalizeName('العَرَبِيّـة')).toBe('عربيه')
    expect(normalizeName('الأُردية')).toBe('ارديه')
    expect(normalizeName('إنجليزي')).toBe('انجليزي')
    expect(normalizeName('آسامي')).toBe('اسامي')
    expect(normalizeName('فارسى')).toBe('فارسي')
    expect(normalizeName('الف')).toBe('الف') // a short word keeps its letters
  })
  it('only a bare ا+ل is the article: the «أل» of a name stays, so one language is one request text', () => {
    expect(normalizeName('ألماني')).toBe('الماني')
    expect(normalizeName('ألمانية')).toBe('المانيه')
    expect(normalizeName('الألمانية')).toBe('المانيه')
    expect(normalizeName('الأَلمانيّة')).toBe('المانيه') // marks go before the article is looked for
    expect(normalizeName('ألباني')).toBe('الباني')
    expect(normalizeName('الألبانية')).toBe('البانيه')
    expect(normalizeName('إلبي')).toBe('البي')
    expect(normalizeName('الأردية')).toBe('ارديه')
    expect(normalizeName('الْعربية')).toBe('عربيه')
    expect(searchWord('(الألمانية)')).toBe('المانيه')
    expect(typedArticle('الع')).toBe(true)
    expect(typedArticle('ألب')).toBe(false)
    expect(typedArticle('Bahasa الملايو')).toBe(true)
  })
  it('Latin: lower case, no accents; other scripts keep their signs', () => {
    expect(normalizeName('Español')).toBe('espanol')
    expect(normalizeName('  Français  ')).toBe('francais')
    expect(normalizeName('TÜRKÇE')).toBe('turkce')
    expect(normalizeName('हिन्दी')).toBe('हिन्दी')
    expect(searchWord('(kurmancî)')).toBe('kurmanci')
  })
  it('folding is idempotent (the server folds what the device normalised, and gets the same text)', () => {
    for (const s of ['عربي', 'Hmong', 'ارديه', 'الالمانيه', 'ألمانية', 'الألبانية', 'Bahasa Melayu']) expect(foldText(normalizeName(s))).toBe(normalizeName(s))
  })
})

describe('search', () => {
  it('the reply’s cases', () => {
    expect(top('عربي')).toBe('ar')
    expect(top('انقليزي')).toBe('en')
    expect(top('Farsi')).toBe('fa')
    expect(top('اردو')).toBe('ur')
    expect(top('ar')).toBe('ar')
    expect(searchLangs('Hmong', 'ar')).toEqual([])
  })
  it('more names people type, slips and codes', () => {
    expect(top('العربية')).toBe('ar')
    expect(top('Arabic')).toBe('ar')
    expect(top('الانجليزية')).toBe('en')
    expect(top('Englsh')).toBe('en') // one slip
    expect(top('انكلش')).toBe('en') // one slip in an alias
    expect(top('فارسی')).toBe('fa')
    expect(top('تركي')).toBe('tr')
    expect(top('اندونيسي')).toBe('id')
    expect(top('ملايو')).toBe('ms')
    expect(top('Tagalog')).toBe('tl')
    expect(top('Filipino')).toBe('tl')
    expect(top('Bahasa Melayu')).toBe('ms')
    expect(top('espanol')).toBe('es')
    expect(top('中文')).toBe('zh')
    expect(top('Kurdish')).toBe('ku')
    expect(top('fr')).toBe('fr')
    expect(top('Persian', 'en')).toBe('fa')
  })
  it('nothing for what is not a served language', () => {
    for (const q of ['Hmong', 'Klingon', 'Deutsch', 'Swahili', 'qq', '١٢٣', 'ألماني', 'ألمانية', 'الألمانية', 'ألب']) expect(searchLangs(q, 'ar'), q).toEqual([])
  })
  it('a name that begins with «أل» is not read as the article', () => {
    // «ألباني» was «باني», a part of «اسباني» and «ياباني»; now it is «الباني», one slip from «اسباني» at most
    for (const q of ['ألباني', 'الألبانية']) {
      const r = searchLangs(q, 'ar')
      expect(r.map((h) => h.row.code), q).not.toContain('ja')
      expect(r.every((h) => h.tier === 3), q).toBe(true) // only a slip: the picker still offers the request
    }
    expect(top('أوزبكي')).toBe('uz')
    expect(top('الأوزبكية')).toBe('uz')
    expect(top('أذري')).toBe('az')
    expect(top('الأردية')).toBe('ur')
    expect(searchLangs('الأ', 'ar').map((h) => h.row.code)).toEqual(expect.arrayContaining(['ur', 'es', 'en']))
  })
  it('slips are forgiven only when nothing matches as written; «ال…» finds names while it is typed', () => {
    expect(searchLangs('عربي', 'ar').map((h) => h.row.code)).toEqual(['ar']) // not «صربي» (sr), one slip away
    expect(searchLangs('Englsh', 'ar')[0]).toMatchObject({ tier: 3, slips: 1 })
    expect(searchLangs('ال', 'ar').length).toBeGreaterThan(20)
    expect(searchLangs('الع', 'ar').map((h) => h.row.code)).toContain('ar')
  })
  it('each interface language’s own spelling-slip example finds English', () => {
    const examples = { ar: 'انقليزي', en: 'Englsh', ur: 'انقليزي', id: 'Inggrs', ms: 'Inggeri', tr: 'Ingilzce', fr: 'Anglai', es: 'Ingls', bn: 'ইংরেজী', hi: 'अंग्रेजी' } as const
    for (const [ui, q] of Object.entries(examples)) expect(searchLangs(q, ui as 'ar')[0]?.row.code, ui).toBe('en')
  })
  it('a two-letter query finds only a whole code or a name that begins with it', () => {
    const r = searchLangs('ar', 'ar').map((h) => h.row.code)
    expect(r[0]).toBe('ar')
    expect(r).not.toContain('fa') // «Farsi» holds «ar», but does not begin with it
  })
  it('the matching word is highlighted whole, as on the board', () => {
    expect(highlightWords('العربية', 'عربي')).toEqual([{ text: 'العربية', mark: true }])
    expect(highlightWords('Arabic', 'عربي')).toEqual([{ text: 'Arabic', mark: false }])
    expect(highlightWords('Bahasa Melayu', 'melayu').filter((p) => p.mark).map((p) => p.text)).toEqual(['Melayu'])
    expect(highlightOrWhole('English', 'انقليزي', true)).toEqual([{ text: 'English', mark: true }])
  })
})

describe('request text', () => {
  it('2 to 40 characters, letters and spaces only', () => {
    expect(validRequest('hmong')).toBe(true)
    expect(validRequest('هوسا')).toBe(true)
    expect(validRequest('बोडो')).toBe(true) // a vowel sign is part of the word
    expect(validRequest('a')).toBe(false)
    expect(validRequest('x'.repeat(41))).toBe(false)
    expect(validRequest('x'.repeat(40))).toBe(true)
    expect(validRequest('hmong 2')).toBe(false)
    expect(validRequest('hm-ong')).toBe(false)
    expect(validRequest('<b>')).toBe(false)
    expect(validRequest(' hmong')).toBe(false)
  })
})
