// Voice conversation (command 12): what the app may read aloud. The most important property in the command:
// the text of an ayah is never read by a machine voice, in any reply, in any language. Checked against the texts as
// stored in D1 (data/processed when present, else data/samples) with a normalizer independent of the code under test.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AnswerResponse, Lang, Quote } from '../../shared/api'
import ar from '../../web/src/i18n/ar'
import bn from '../../web/src/i18n/bn'
import en from '../../web/src/i18n/en'
import es from '../../web/src/i18n/es'
import fr from '../../web/src/i18n/fr'
import hi from '../../web/src/i18n/hi'
import id from '../../web/src/i18n/id'
import ms from '../../web/src/i18n/ms'
import tr from '../../web/src/i18n/tr'
import ur from '../../web/src/i18n/ur'
import { quotedSacredTexts, splitPassage } from '../../web/src/trust/sacred'
import { speakable, type Heard, type Speech } from '../../web/src/trust/speakable'
import { chunk } from '../../web/src/voice/speaker'
import { normalizeArabic } from '../src/lib/normalize'

const STRINGS = { ar, en, ur, id, ms, tr, fr, es, bn, hi }
const ROOT = path.resolve(__dirname, '../..')
type Rec = { id: string; ref: string; url: string; text: string; text_en?: string; muyassar?: string }
function load(name: string): { recs: Rec[]; full: boolean } {
  const full = path.join(ROOT, `data/processed/${name}.jsonl`)
  const file = fs.existsSync(full) ? full : path.join(ROOT, `data/samples/${name}.sample.jsonl`)
  return { recs: fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Rec), full: file === full }
}
const quran = load('quran')
const aqeedah = load('aqeedah')

// Independent oracle: the Worker's search normalizer, punctuation dropped.
const words = (s: string) => normalizeArabic(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
/** The first run of `n` words of `sacred` found in `output`; an ayah shorter than that must not appear whole. */
function sharedRun(output: string, sacred: string, { n = 4, whole = true } = {}): string | null {
  const out = ` ${words(output).join(' ')} `
  const w = words(sacred)
  if (w.length < n) return whole && out.includes(` ${w.join(' ')} `) ? w.join(' ') : null
  for (let i = 0; i + n <= w.length; i++) if (out.includes(` ${w.slice(i, i + n).join(' ')} `)) return w.slice(i, i + n).join(' ')
  return null
}

/** Every 6 consecutive words of the Quran (whole data only), for unmarked quotations of any ayah. */
const quranGrams = new Map<string, string>()
if (quran.full)
  for (const r of quran.recs) {
    const w = words(r.text)
    for (let i = 0; i + 6 <= w.length; i++) quranGrams.set(w.slice(i, i + 6).join(' '), r.id)
  }
function anyAyah(output: string): string | null {
  const w = words(output)
  for (let i = 0; i + 6 <= w.length; i++) {
    const id = quranGrams.get(w.slice(i, i + 6).join(' '))
    if (id) return `${id} «${w.slice(i, i + 6).join(' ')}»`
  }
  return null
}

const ayahQuote = (r: Rec): Quote => ({ id: r.id, kind: 'ayah', text: r.text, text_en: r.text_en, ref: r.ref, url: r.url, verified: true, tafsirExcerpt: r.muyassar })
const bookQuote = (r: Rec): Quote => ({ id: r.id, kind: 'aqeedah', text: r.text, ref: r.ref, url: r.url, verified: true })
const answer = (quotes: Quote[], extra: Partial<AnswerResponse> = {}): AnswerResponse => ({
  type: 'answer',
  level: 'A',
  quotes,
  explanation: [],
  machineTranslated: false,
  fromCache: false,
  explain_mode: 'on_demand',
  ...extra,
})
const speak = (res: Heard, lang: Lang = 'ar', explanation?: string) => speakable({ res, lang, t: STRINGS[lang], ar, explanation })
const spoken = (parts: Speech[]) => parts.map((p) => p.text).join('\n')

describe('no ayah text is ever read aloud', () => {
  it(`any reply with an ayah, in Arabic, English and Urdu (${quran.recs.length} ayat${quran.full ? ', the whole Quran' : ', samples'})`, () => {
    let muyassarRead = 0
    for (const r of quran.recs) {
      for (const lang of ['ar', 'en', 'ur'] as Lang[]) {
        const parts = speak(answer([ayahQuote(r)]), lang, 'A short explanation in plain words.')
        // The first line is the reference, exactly: a sura's name («طه», «يس», «الرحمن») is not its ayah.
        const [, sura, aya] = r.id.split(':')
        const ref = STRINGS[lang].speakAyahRef.replace('{sura}', lang === 'ar' ? r.ref.split(':')[0].trim() : sura).replace('{aya}', aya)
        expect(parts[0]).toEqual({ kind: 'say', text: STRINGS[lang].speakFound.replace('{ref}', ref), lang })
        const hit = sharedRun(spoken(parts.slice(1)), r.text)
        if (hit) throw new Error(`${r.id} (${lang}) reads ayah words: «${hit}»`)
        const other = lang === 'ar' ? anyAyah(spoken(parts.slice(1))) : null // al-Muyassar quoting another ayah
        if (other) throw new Error(`${r.id} (ar) reads the words of ${other}`)
        // The ayah's place is its own part: the fixed line, or (voice conversation, command 19) a human recitation.
        const slot = parts.filter((p) => p.kind === 'ayah')
        expect(slot).toEqual([{ kind: 'ayah', id: r.id, text: STRINGS[lang].speakAyahSlot, lang, ref: r.ref }])
        if (lang === 'ar' && r.muyassar && parts.some((p) => p.text.includes(r.muyassar!))) muyassarRead++
      }
    }
    console.info(`al-Muyassar read in full for ${muyassarRead} of ${quran.recs.length} ayat; the rest repeat ayah words or quote another ayah, and are not read`)
  })

  it(`every ayah quoted inside a creed passage, and the basmala (${aqeedah.recs.length} passages)`, () => {
    for (const r of aqeedah.recs) {
      const { parts: pieces, paired } = splitPassage(r.text)
      const ayat = [...r.text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1])
      for (const lang of ['ar', 'en'] as Lang[]) {
        const parts = speak(answer([bookQuote(r)]), lang)
        const out = spoken(parts)
        for (const a of [...ayat, 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ']) {
          const hit = sharedRun(out, a)
          if (hit) throw new Error(`${r.id} (${lang}) reads ayah words: «${hit}»`)
        }
        expect(out).not.toMatch(/[{}﴿﴾"«»“”]/)
        if (paired && pieces.some((p) => p.kind === 'ayah')) expect(parts.some((p) => p.kind === 'ayah' && p.text === ar.speakAyahSlot)).toBe(true)
      }
    }
  })

  it('outside its marked quotations, a passage reads no Quran text: a 6-word scan against the whole Quran', () => {
    if (!quran.full) return
    const found: string[] = []
    for (const r of aqeedah.recs) {
      const hit = anyAyah(spoken(speak(answer([bookQuote(r)]), 'ar')))
      if (hit) found.push(`${r.id} ${hit}`)
    }
    // Unmarked Quran text (Ibn al-Qayyim citing Sad 38:27, the author's wording of 41:37 and 4:136) is replaced
    // through web/src/config/voice-guard.json; a passage re-ingested without re-running the script fails here.
    expect(found).toEqual([])
  })

  it('a machine explanation that repeats 4 words of the ayah is not read; a clean one is read with its label', () => {
    const r = quran.recs.find((x) => x.id === 'quran:1:1') ?? quran.recs[0]
    const echo = `This verse says ${r.text} and more.`
    expect(spoken(speak(answer([ayahQuote(r)]), 'en', echo))).not.toContain(en.speakMachineMuyassar)
    const clean = speak(answer([ayahQuote(r)]), 'en', 'It teaches to begin with the name of God.')
    expect(clean.map((p) => p.text)).toEqual(expect.arrayContaining([en.speakMachineMuyassar, 'It teaches to begin with the name of God.']))
    // Arabic never gets the asked-for explanation: the text and its tafsir are read instead.
    expect(spoken(speak(answer([ayahQuote(r)]), 'ar', 'شرح'))).not.toContain(ar.speakMachineMuyassar)
  })

  it('a generated explanation (generated mode) is read with its label, unless it repeats the ayah', () => {
    const r = quran.recs[1]
    const ok = answer([ayahQuote(r)], { explain_mode: 'generated', explanation: [{ text: 'جملة شرح من النص.', cites: [r.id] }] })
    expect(spoken(speak(ok))).toContain(ar.speakMachineAnswer)
    const bad = answer([ayahQuote(r)], { explain_mode: 'generated', explanation: [{ text: r.text, cites: [r.id] }] })
    const out = spoken(speak(bad))
    expect(out).not.toContain(ar.speakMachineAnswer)
    expect(sharedRun(out, r.text)).toBeNull()
  })

  it('English: reference, the fixed line, the Sahih International meaning, the labelled explanation, the closing line', () => {
    const r = quran.recs.find((x) => x.id === 'quran:2:255') ?? quran.recs[2]
    const [, s, a] = r.id.split(':')
    const parts = speak(answer([ayahQuote(r)]), 'en', 'A simple explanation.')
    expect(parts).toEqual([
      { kind: 'say', text: `I found a text for you in Surah ${s}, verse ${a}.`, lang: 'en' },
      { kind: 'ayah', id: r.id, text: en.speakAyahSlot, lang: 'en', ref: r.ref },
      { kind: 'say', text: en.speakMeaningEn, lang: 'en' },
      { kind: 'say', text: r.text_en, lang: 'en' },
      { kind: 'say', text: en.speakMachineMuyassar, lang: 'en' },
      { kind: 'say', text: 'A simple explanation.', lang: 'en' },
      { kind: 'say', text: en.speakFullOnScreen, lang: 'en' },
    ])
  })
})

describe('hadith and quotations are not read', () => {
  it('a hadith reply: reference and the fixed line only, never its Arabic or English text', () => {
    const h: Quote = { id: 'hadith:bukhari:1', kind: 'hadith', text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى', text_en: 'Actions are judged by intentions', ref: 'صحيح البخاري – 1', url: 'https://sunnah.com/bukhari:1', verified: true }
    for (const lang of ['ar', 'en'] as Lang[]) {
      const parts = speak(answer([h]), lang, 'An explanation.')
      const out = spoken(parts)
      expect(sharedRun(out, h.text)).toBeNull()
      expect(out).not.toContain(h.text_en)
      expect(parts.some((p) => p.kind === 'quote' && p.id === h.id && p.text === STRINGS[lang].speakHadithSlot)).toBe(true)
    }
  })

  it('quotations inside creed passages are replaced, so the hadith in them are not read', () => {
    for (const r of aqeedah.recs) {
      const out = spoken(speak(answer([bookQuote(r)]), 'ar'))
      for (const q of quotedSacredTexts(r.text)) {
        const hit = sharedRun(out, q, { whole: false })
        if (hit) throw new Error(`${r.id} reads quoted words: «${hit}»`)
      }
    }
  })

  it('a passage whose quotation marks do not pair is not read at all (reference and closing line only)', () => {
    const odd = 'وعن ابن عباس قال: "حديث بلا علامة إغلاق، فلا نعرف أين ينتهي النص المنقول ولا أين يبدأ كلام المؤلف'
    const parts = speak(answer([{ id: 'aqeedah:tawhid:999', kind: 'aqeedah', text: odd, ref: 'كتاب التوحيد – ص 1', url: 'https://shamela.ws/book/11318/1', verified: true }]))
    expect(parts.map((p) => p.text)).toEqual(['وجدت لك نصًا في كتاب التوحيد، صفحة 1.', ar.speakFullOnScreen])
  })
})

describe('fixed texts for the other replies', () => {
  for (const lang of Object.keys(STRINGS) as Lang[]) {
    const t = STRINGS[lang]
    it(`${lang}: referral, apology, errors`, () => {
      expect(speak({ type: 'referral', level: 'D', message: '', link: 'https://www.alifta.gov.sa' }, lang).map((p) => p.text)).toEqual([t.referralTitle, t.referralBody, t.speakLinkOnScreen])
      expect(speak({ type: 'abstain', message: '', link: '' }, lang).map((p) => p.text)).toEqual([t.abstainBody])
      expect(speak({ type: 'error', code: 'rate_limited', message: '' }, lang).map((p) => p.text)).toEqual([t.errRateLimited])
      expect(speak({ type: 'network' }, lang).map((p) => p.text)).toEqual([t.errConnection])
    })
  }

  it('a disputed matter: the fixed sentence of rule 11, then the references, never the texts', () => {
    const a = quran.recs[3]
    const b = aqeedah.recs[0]
    const parts = speak({ type: 'referral', level: 'C', message: '', link: '', disputed: true, quotes: [ayahQuote(a), bookQuote(b)] })
    const [, s, n] = a.id.split(':')
    expect(parts.map((p) => p.text)).toEqual([ar.disputedText, `سورة ${a.ref.split(':')[0]}، الآية ${n}`, b.ref.replace(/\s*–\s*ص\s*(\d+)\s*[–-]\s*(\d+)/, '، الصفحات $1 إلى $2').replace(/\s*–\s*ص\s*(\d+)/, '، صفحة $1'), ar.speakLinkOnScreen])
    expect(sharedRun(spoken(parts), a.text)).toBeNull()
    expect(s).toBeTruthy()
  })
})

describe('reading in short pieces', () => {
  it('no piece longer than 160 characters, and no word lost', () => {
    for (const r of aqeedah.recs.slice(0, 20)) {
      const pieces = chunk(r.text)
      expect(pieces.every((p) => p.length <= 160)).toBe(true)
      expect(words(pieces.join(' '))).toEqual(words(r.text))
    }
  })
})

describe('the machine explanation switched off (reply 0031)', () => {
  it('outside Arabic and English: the reference and the closing line, no English meaning and nothing «machine»', () => {
    const r = quran.recs.find((x) => x.id === 'quran:2:255') ?? quran.recs[2]
    const parts = speakable({ res: answer([ayahQuote(r)]), lang: 'fr', t: STRINGS.fr, ar, meaningEn: false })
    const said = parts.filter((p) => p.kind === 'say').map((p) => p.text)
    expect(said).not.toContain(STRINGS.fr.speakMeaningEn)
    expect(said.some((x) => x === r.text_en)).toBe(false)
    expect(said.join(' ')).not.toContain(STRINGS.fr.speakMachineMuyassar)
    expect(said.at(-1)).toBe(STRINGS.fr.speakFullOnScreen)
  })
  it('in English the Sahih International meaning is still read', () => {
    const r = quran.recs.find((x) => x.id === 'quran:2:255') ?? quran.recs[2]
    const said = speakable({ res: answer([ayahQuote(r)]), lang: 'en', t: STRINGS.en, ar, meaningEn: false }).map((p) => p.text)
    expect(said).toContain(STRINGS.en.speakMeaningEn)
    expect(said).toContain(r.text_en)
  })
})

describe('the meaning in the reader\'s language (command 22)', () => {
  const r = quran.recs.find((x) => x.id === 'quran:2:255') ?? quran.recs[2]
  const meaning = { lang: 'tr', text: 'Allah, kendisinden başka hiçbir ilah olmayandır.', translator: 'Diyanet Isleri' }
  it('in Turkish: the translator\'s line, then the Turkish meaning in a Turkish voice, and no English', () => {
    const parts = speakable({ res: answer([{ ...ayahQuote(r), meaning }]), lang: 'tr', t: STRINGS.tr, ar, meaningEn: false })
    const said = parts.filter((p) => p.kind === 'say')
    const i = said.findIndex((p) => p.text === meaning.text)
    expect(i).toBeGreaterThan(0)
    expect(said[i].lang).toBe('tr')
    expect(said[i - 1].text).toBe(STRINGS.tr.speakMeaningMine.replace('{translator}', 'Diyanet Isleri'))
    expect(said.some((p) => p.text === r.text_en || p.text === STRINGS.tr.speakMeaningEn)).toBe(false)
    expect(parts.filter((p) => p.kind === 'ayah')).toHaveLength(1)
  })
  it('in Indonesian: the source names no translator, so the line names the archive', () => {
    const m = { lang: 'id', text: 'Allah, tidak ada Tuhan melainkan Dia.', translator: 'Bahasa Indonesia' }
    const said = speakable({ res: answer([{ ...ayahQuote(r), meaning: m }]), lang: 'id', t: STRINGS.id, ar, meaningEn: false }).map((p) => p.text)
    expect(said[said.indexOf(m.text) - 1]).toBe(STRINGS.id.speakMeaningArchive)
    expect(said.join(' ')).not.toContain('Bahasa Indonesia')
  })
  it('in Arabic: al-Muyassar, never the English meaning (Talal, 6 October 19:00)', () => {
    const said = speakable({ res: answer([ayahQuote(r)]), lang: 'ar', t: STRINGS.ar, ar }).map((p) => p.text)
    expect(said).not.toContain(r.text_en)
    expect(said).not.toContain(STRINGS.ar.speakMeaningEn)
  })
  it('without a meaning (Hindi): as before', () => {
    const said = speakable({ res: answer([ayahQuote(r)]), lang: 'hi', t: STRINGS.hi, ar, meaningEn: true }).map((p) => p.text)
    expect(said).toContain(STRINGS.hi.speakMeaningEn)
    expect(said).toContain(r.text_en)
  })
})
