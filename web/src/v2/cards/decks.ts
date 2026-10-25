// «اصنع كروت» (add-on 0072-add30 §1): the sets of the screens that have the button, made from what each screen shows,
// as it shows it. Every quoted text is the screen's own string from our data (D1, HadeethEnc, Shamela, the lessons'
// checked slices), never rewritten; the meaning of an ayah in the reader's language only from our sources (QuranEnc,
// the Ayat archive, Sahih International), and the hadith's translation only HadeethEnc's: no machine translation of a
// religious text (CLAUDE.md §4). The headings, the labels and the numbering are the interface's own words.
import type { AnswerResponse, Lang, PassageResponse, Quote, TafsirText } from '../../../../shared/api'
import { arabicDigits, displayRef } from '../../quran/format'
import { ANSWER } from '../answer/strings'
import { bookTitle, sourceOfQuote } from '../answer/sources'
import { READING } from '../reading/strings'
import { quoteNote, sepOf } from '../daily/arabic-marks'
import type { ToolHadith } from '../daily/api'
import { TOOLS } from '../daily/strings-tools'
import { NAME_CARD } from '../daily/names/strings-name-card'
import { NAME_DAY } from '../daily/names/strings-name-day'
import { heartOf, meaningHadithRef, meaningHadithShown, quoteAttribution, quoteSite, quoteSource, shownQuotes } from '../daily/names/name-card-model'
import { readingPieces, type NameEnriched, type NameEntry, type NameReadings } from '../daily/names/name-day-api'
import type { Loaded } from '../daily/names/NameEntry'
import { salafAttribution, salafSource, type SalafCard } from '../daily/salaf/salaf-model'
import { arabicIndicIn } from '../daily/arabic-marks'
import type { Block, Deck, Dir, Meaning, Section } from './model'
import { cardsStrings } from './strings'

const RTL = new Set(['ar', 'ur', 'fa', 'he'])
export const dirOf = (lang: string): Dir => (RTL.has(lang.split('-')[0]) ? 'rtl' : 'ltr')
const L = <T>(table: Record<Lang, T>, lang: string): T => table[lang as Lang] ?? table.ar
const AR_SEP = sepOf('ar')

function base(lang: string, title: string, fileBase: string, sections: Section[], extra: Partial<Deck> = {}): Deck {
  return { title, lang, dir: dirOf(lang), quoteNote: quoteNote(lang), sections: sections.filter((s) => s.blocks.length), fileBase, ...extra }
}

/** The meaning of an ayah outside Arabic, as the ayah's panel shows it: the reader's language from our sources, else
 *  Sahih International; none in Arabic. */
export function meaningOf(p: Pick<Quote, 'meaning' | 'text_en'>, lang: string): Meaning | null {
  if (lang === 'ar') return null
  if (p.meaning?.text) return { text: p.meaning.text, lang: p.meaning.lang, dir: dirOf(p.meaning.lang), by: p.meaning.translator }
  if (p.text_en) return { text: p.text_en, lang: 'en', dir: 'ltr', by: 'Sahih International' }
  return null
}

/** The ayah's place in Arabic, as on its image: «سورة البقرة ✦ ٢٥٥». */
const ayahRef = (suraName: string, aya: number) => `سورة ${suraName}${AR_SEP}${arabicDigits(aya)}`

function ayahBlock(p: PassageResponse, lang: string, label?: string): Block | null {
  const a = p.ayah
  if (!a) return null
  const r = L(READING, lang)
  return { kind: 'ayah', text: p.text, num: arabicDigits(a.aya), ref: ayahRef(a.suraName, a.aya), source: `${r.srcMushaf}${sepOf(lang)}${r.srcKsu}`, meaning: meaningOf(p, lang), label }
}

/** A tafsir's text as stored, its name and the electronic Mushaf as its source line. */
function tafsirBlock(x: TafsirText, name: string, lang: string): Block | null {
  if (x.empty || !x.text?.trim()) return null
  const r = L(READING, lang)
  return { kind: 'quote', text: (x.paragraphs?.length ? x.paragraphs : [x.text]).join('\n'), lang: 'ar', dir: 'rtl', source: `${name}${sepOf(lang)}${r.srcKsu}` }
}

/** A HadeethEnc hadith (the tools' form): the Arabic with its grade and takhrij, then HadeethEnc's own translation. */
function hadithBlocks(h: ToolHadith, lang: string, label?: string): Block[] {
  const t = L(TOOLS, lang)
  const by = [h.grade, h.attribution].filter(Boolean).join(AR_SEP)
  const out: Block[] = [{ kind: 'quote', text: h.text, lang: 'ar', dir: 'rtl', by: by || undefined, source: t.hadithSource, label }]
  const tr = lang !== 'ar' ? h.translation : undefined
  if (tr?.text) out.push({ kind: 'quote', text: tr.text, lang: tr.lang, dir: dirOf(tr.lang), source: t.hadithSource, label: t.translationLabel })
  return out
}

// MARK: - The ayah and its tafsir (the reader's ayah panel)

export function ayahDeck(p: PassageResponse, lang: string, extra: { katheer?: TafsirText | null } = {}): Deck | null {
  const a = p.ayah
  const ayah = ayahBlock(p, lang)
  if (!a || !ayah) return null
  const r = L(READING, lang)
  const ref = ayahRef(a.suraName, a.aya)
  const sections: Section[] = [{ id: 'ayah', label: r.ayahHeading, heading: r.ayahHeading, blocks: [ayah] }]
  const taf: [TafsirText | undefined | null, string, string][] = [
    [p.tafsir?.find((x) => x.key === 'muyassar'), 'muyassar', r.srcMuyassar],
    [p.tafsir?.find((x) => x.key === 'saadi'), 'saadi', r.srcSaadi],
    [extra.katheer ?? p.tafsir?.find((x) => x.key === 'katheer'), 'katheer', r.srcKatheer],
  ]
  for (const [x, id, name] of taf) {
    const b = x && tafsirBlock(x, name, lang)
    if (b) sections.push({ id, label: name, heading: name, blocks: [b] })
  }
  return base(lang, ref, `muslim-cards-${a.sura}-${a.aya}`, sections)
}

// MARK: - «اسأل»

/** `t`: the interface's words for the generated explanation (its title, its tag, the machine translation badge). */
export type ExplainWords = { plainExplanation: string; generatedTag: string; badgeMT: string }

/** `translations`: HadeethEnc's translation of each hadith by its id, in the reader's content language, when it came. */
export function answerDeck(res: AnswerResponse, question: string, lang: string, t: ExplainWords, translations: Record<string, { lang: string; text: string } | null> = {}): Deck {
  const a = L(ANSWER, lang)
  const r = L(READING, lang)
  const s = cardsStrings(lang)
  const sections: Section[] = []
  res.quotes.forEach((q, i) => {
    const label = displayRef(q.ref, lang as Lang)
    const blocks: Block[] = []
    if (q.kind === 'ayah') {
      const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
      const aya = m ? Number(m[2]) : 0
      blocks.push({ kind: 'ayah', text: q.text, num: arabicDigits(aya), ref: label, source: `${a.srcMushaf}${sepOf(lang)}${a.viaKsuShort}`, meaning: meaningOf(q, lang) })
    } else if (q.hadith) {
      const by = [q.grade, q.hadith.attribution && q.hadith.attribution.trim() !== q.ref.trim() ? q.hadith.attribution : q.ref].filter(Boolean).join(AR_SEP)
      blocks.push({ kind: 'quote', text: q.text, lang: 'ar', dir: 'rtl', by, source: a.srcHadith })
      const tr = lang !== 'ar' ? translations[q.hadith.id] : undefined
      if (tr?.text) blocks.push({ kind: 'quote', text: tr.text, lang: tr.lang, dir: dirOf(tr.lang), source: a.srcHadith, label: L(TOOLS, lang).translationLabel })
    } else {
      const src = sourceOfQuote(q)
      const book = src === 'book239' || src === 'tawhid' ? bookTitle(q.ref) : ''
      blocks.push({ kind: 'quote', text: q.text, lang: 'ar', dir: 'rtl', by: q.grade || (book ? undefined : label), source: book ? `${label}${sepOf(lang)}${a.viaShamela}` : a.srcHadith })
    }
    sections.push({ id: `q${i}`, label, heading: label, blocks })
    if (q.kind === 'ayah' && q.tafsirExcerpt?.trim()) {
      const name = r.srcMuyassar
      sections.push({ id: `t${i}`, label: `${name}${sepOf(lang)}${label}`, heading: name, blocks: [{ kind: 'quote', text: q.tafsirExcerpt, lang: 'ar', dir: 'rtl', by: label, source: `${name}${sepOf(lang)}${r.srcKsu}` }] })
    }
  })
  // The generated explanation, when the answer shows one: the app's words, under its title and tag on every card.
  const ansLang = (res.answer_lang ?? lang).split('-')[0].toLowerCase()
  const gen = [res.direct?.text, ...res.explanation.map((x) => x.text)].filter((x): x is string => !!x?.trim())
  if (gen.length) {
    const note = [t.generatedTag, res.machineTranslated ? t.badgeMT : ''].filter(Boolean).join(sepOf(lang))
    sections.push({ id: 'explain', label: t.plainExplanation, heading: t.plainExplanation, blocks: [{ kind: 'explain', title: t.plainExplanation, text: gen.join('\n'), lang: ansLang, dir: dirOf(ansLang), note }] })
  }
  const title = question.trim() || s.fromSources
  return base(lang, title, 'muslim-cards-answer', sections, { kicker: s.fromSources })
}

// MARK: - «اسم من أسماء الله» (the card and its page)

export type NameDeckData = { entry: NameEntry; count: number; readings?: NameReadings; sunnah?: ToolHadith | null } & NameEnriched

export function nameDeck(d: NameDeckData, parts: Loaded[], lang: string, today: boolean): Deck {
  const c = L(NAME_CARD, lang)
  const nd = L(NAME_DAY, lang)
  const e = d.entry
  const isEvidence = (x: Loaded) => (x.kind === 'ayah' ? x.id === e.ayah || x.id === e.meaningAyah : x.id === e.hadith)
  const quoted = (x: Loaded, label?: string): Block[] => (x.kind === 'ayah' ? [ayahBlock(x.p, lang, label)].filter((b): b is Block => !!b) : hadithBlocks(x.h, lang, label))
  const evLabel = (x: Loaded) => (x.kind === 'ayah' && x.id === e.meaningAyah && x.id !== e.ayah ? nd.meaningAyah : undefined)
  const quoteBlock = (q: ReturnType<typeof shownQuotes>[number]): Block => {
    const site = quoteSite(q.url)
    const src = `${quoteSource(q, lang === 'ar')}${site ? `${AR_SEP}${site}` : ''}`
    return { kind: 'quote', text: q.text, lang: 'ar', dir: 'rtl', by: [quoteAttribution(q), q.via].filter(Boolean).join(AR_SEP), source: src, context: q.context }
  }
  const sections: Section[] = []
  const sec = (id: string, heading: string, blocks: Block[]) => sections.push({ id, label: heading, heading, blocks })
  sec('evidence', c.evidence, parts.filter(isEvidence).flatMap((x) => quoted(x, evLabel(x))))
  const sunnah = meaningHadithShown(meaningHadithRef(d.meaningHadith), d.sunnah)
  sec('meaning', c.meaning, [...(sunnah ? hadithBlocks(sunnah, lang, c.meaningSunnah) : []), ...shownQuotes(d.meaning).map(quoteBlock)])
  sec('salaf', c.salaf, shownQuotes(d.salaf).map(quoteBlock))
  const heart = heartOf(d)
  if (heart) {
    const flat = (t: string) =>
      readingPieces(t)
        .map((x) => x.text)
        .join('')
    const ar = NAME_DAY.ar
    const paras = heart.kind === 'heart' ? heart.paragraphs.map(flat) : [`${ar.meaningLabel} ${flat(heart.readings.meaning)}`, `${ar.easyLabel} ${flat(heart.readings.easy)}`, ar.deepLabel, ...heart.readings.deep.map(flat)]
    // The app's own words: Arabic in every interface, under «أثره في قلبك» and the fixed line on every card.
    sec('heart', c.heart, [{ kind: 'explain', title: c.heart, text: paras.join('\n'), lang: 'ar', dir: 'rtl', note: nd.madeHeading }])
  }
  sec('dua', c.dua, parts.filter((x) => !isEvidence(x)).flatMap((x) => quoted(x, x.label)))
  const taf = parts.find((x): x is Extract<Loaded, { kind: 'ayah' }> => x.kind === 'ayah' && !!x.tafsir && !!x.p.tafsir?.some((t) => t.key === 'saadi' || t.key === 'katheer'))
  if (taf) {
    const r = L(READING, lang)
    const saadi = taf.p.tafsir?.find((t) => t.key === 'saadi')
    const katheer = taf.p.tafsir?.find((t) => t.key === 'katheer')
    const by = taf.p.ayah ? ayahRef(taf.p.ayah.suraName, taf.p.ayah.aya) : undefined
    const sb = saadi && tafsirBlock(saadi, r.srcSaadi, lang)
    const kb = katheer && tafsirBlock(katheer, r.srcKatheer, lang)
    if (sb && sb.kind === 'quote') sec('tafsir', `${c.tafsir}${sepOf(lang)}${r.srcSaadi}`, [{ ...sb, by }])
    if (kb && kb.kind === 'quote') sec('katheer', `${c.tafsir}${sepOf(lang)}${r.srcKatheer}`, [{ ...kb, by }])
  }
  return base(lang, `اسم الله ${e.name}`, `muslim-cards-name-${e.n}`, sections, { kicker: today ? c.today : c.other, shamsaName: e.name })
}

// MARK: - «من أقوال السلف»

export function salafDeck(card: SalafCard, lang: string, title: string): Deck {
  const block: Block = { kind: 'quote', text: card.text, lang: 'ar', dir: 'rtl', by: salafAttribution(card), source: `${arabicIndicIn(salafSource(card))}${AR_SEP}المكتبة الشاملة` }
  return base(lang, card.topic, `muslim-cards-salaf-${card.n}`, [{ id: 'saying', label: title, heading: title, blocks: [block] }], { kicker: title })
}
