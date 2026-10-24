// The widgets «اسم الله لليوم» and «من أقوال السلف» (add-on 0072-add10 §1–§2; the content rules of 0072-add9): their
// part of the widgets' file (web/src/native/widget-data.ts writes it into the App Group on iOS, the same JSON through
// Android's own bridge). The contract, field by field: relay/w1/0072-names-widget/data-contract.md.
//
// Both turn by the Riyadh date, the same for everyone (as the home cards), so each day here carries its own Riyadh
// midnights (`start`, `end`), apart from the place's days.
//   - The name of the day: its pages in the order of the name's page (NameEntry.tsx): 1 the name with its Quranic
//     evidence (the evidence ayah, else the ayah for the meaning; an entry with neither starts with its hadith
//     evidence, and one with no evidence at all with its first Quranic dua under that label); 2 the hadith evidence
//     with its grade and takhrij as stored; 3 the quoted meaning: al-Saʿdi's tafsir of that ayah as D1 has it, with
//     its source;
//     4 «القراءة» under its fixed heading, only while the server sends it (NAMES_READINGS), as whole sentences, so a
//     widget shows as many complete sentences as fit and then «التكملة في التطبيق». Every text is read by its id from
//     our data, as the name's page reads it; nothing is written or translated here. Outside Arabic the ayah's meaning
//     in the reader's language from our sources (QuranEnc, the Ayat archive, Sahih International), and the hadith's
//     HadeethEnc translation; the readings stay Arabic under «الشرح متاح بالعربية» (add-on 0071-add5 §2.3). The name
//     has no Latin pronunciation from any source of ours, so `latin` is null.
//   - The salaf saying of the day: the card's own words from data/salaf-daily.json (offline, in the app), Arabic in
//     every interface: the widget's gallery says «بالعربية».
// The Quranic evidence is never cut: the widget shrinks it to 0.7 and otherwise shows its place and «اضغط لقراءتها».
import type { Lang } from '../../../shared/api'
import { getToolHadith, type ToolHadith } from '../v2/daily/api'
import { firstQuoted, getNameAyah, getNameDay, partsOf, readingPieces, type NameDay, type NameReadings } from '../v2/daily/names/name-day-api'
import { NAME_DAY } from '../v2/daily/names/strings-name-day'
import { salafAttribution, salafOfDay, salafParts, salafSource, salafVolPage } from '../v2/daily/salaf/salaf-model'
import { fill, num } from '../v2/daily/format'
import { arabicDigits } from '../quran/format'
import { STRINGS } from '../i18n'
import { READING } from '../v2/reading/strings'

const DAY = 86_400_000
const RIYADH = 3 * 3600_000
/** Days of the name ahead in the file: each is three small requests, asked once per Riyadh day (the widget shows
 *  «افتح التطبيق» on a day beyond them, as the others do when the app has not been opened for long). */
export const NAME_WIDGET_DAYS = 7
/** The salaf sayings are in the app: as many days as the place's days. */
export const SALAF_WIDGET_DAYS = 60

/** A text with its meaning in the reader's language, from our sources only. */
export type WidgetMeaning = { text: string; lang: string; source: string }
/** One sentence of «القراءة», in its part (0 «المعنى:», 1 «قراءة ميسرة:», 2 «قراءة أعمق:»): a new part starts a new
 *  paragraph, its label first. */
export type WidgetSentence = { part: number; text: string }
export type WidgetNamePage =
  | { kind: 'ayah'; label: string; text: string; ref: string; source: string; url: string; meaning: WidgetMeaning | null }
  | { kind: 'hadith'; label: string; text: string; grade: string; attribution: string; source: string; url: string; meaning: WidgetMeaning | null }
  | { kind: 'meaning'; label: string; paragraphs: string[]; source: string; url: string }
  | { kind: 'reading'; label: string; inArabic: string | null; partLabels: string[]; sentences: WidgetSentence[]; url: string }
export type WidgetNameDay = {
  /** The Riyadh date, and its midnights in ms. */
  day: string
  start: number
  end: number
  n: number
  count: number
  /** The name in Arabic, in every interface. */
  name: string
  /** Its Latin pronunciation from a source of ours: none has one today. */
  latin: string | null
  /** «٥ من ٩٦» in the app's digits. */
  of: string
  url: string
  shareUrl: string
  pages: WidgetNamePage[]
}
export type WidgetSalafDay = {
  day: string
  start: number
  end: number
  n: number
  topic: string
  /** The text exactly as the card shows it; `gloss`, the narrator's words inside it, in a lighter ink. */
  text: string
  parts: { text: string; gloss: boolean }[]
  /** «قال فلان» or «يُروى عن فلان». */
  attribution: string
  /** «الزهد» للإمام أحمد بن حنبل، ص99 */
  source: string
  book: string
  author: string
  place: string
  /** The book's page in the Shamela library (opens outside the app). */
  url: string
  /** The widget's tap: the home page, where the card is. */
  appUrl: string
  shareUrl: string
}

const riyadhYmd = (t: number) => new Date(t + RIYADH).toISOString().slice(0, 10)
/** The Riyadh midnight that begins the Riyadh day holding `t`. */
export const riyadhStart = (t: number) => Math.floor((t + RIYADH) / DAY) * DAY - RIYADH

// MARK: the cut at a sentence (0072-add10 §1 page 4)

/** A reading's words, its {{words|id}} citations as their words (the widget has no links). */
export const plainReading = (t: string) =>
  readingPieces(t)
    .map((p) => p.text)
    .join('')

/** Sentences, each ending at «.» «؟» «?» «!» with its mark (and a closing quote or bracket after it); the words are the
 *  text's own and the sentences joined with a space are the text, its spaces evened. */
export function sentencesOf(text: string): string[] {
  const out: string[] = []
  const re = /[^.؟?!]*[.؟?!]+[»")\]]*|[^.؟?!]+$/g
  for (const m of text.matchAll(re)) {
    const s = m[0].replace(/\s+/g, ' ').trim()
    if (s) out.push(s)
  }
  return out
}

/** The longest run of whole sentences from the start within `max` characters (their joining spaces counted); at least
 *  nothing, never a part of a sentence. `cut` is true when some are left for the app. */
export function cutAtSentence(sentences: string[], max: number): { text: string; count: number; cut: boolean } {
  let len = 0
  let count = 0
  for (const s of sentences) {
    const add = (count ? 1 : 0) + s.length
    if (len + add > max) break
    len += add
    count++
  }
  return { text: sentences.slice(0, count).join(' '), count, cut: count < sentences.length }
}

/** «القراءة» as sentences in their parts: the meaning, the easy reading, then the deeper one's paragraphs. */
export function readingSentences(rd: NameReadings): WidgetSentence[] {
  const parts = [[rd.meaning], [rd.easy], rd.deep]
  return parts.flatMap((ps, part) => ps.flatMap((p) => sentencesOf(plainReading(p)).map((text) => ({ part, text }))))
}

// MARK: the name of the day

type Lab = (typeof NAME_DAY)['ar']

function ayahMeaning(p: { meaning?: { text: string; lang: string; translator: string } | null; text_en?: string }, lang: Lang): WidgetMeaning | null {
  if (lang === 'ar') return null
  if (p.meaning?.text) return { text: p.meaning.text, lang: p.meaning.lang, source: p.meaning.translator }
  if (p.text_en) return { text: p.text_en, lang: 'en', source: 'Sahih International' }
  return null
}

function hadithMeaning(h: ToolHadith, lang: Lang): WidgetMeaning | null {
  if (lang === 'ar' || !h.translation?.text || h.translation.lang === 'ar') return null
  return { text: h.translation.text, lang: h.translation.lang, source: 'HadeethEnc' }
}

const ayahRef = (a: { sura: number; aya: number; suraName: string }, lang: Lang) =>
  lang === 'ar' ? `${a.suraName} · ${arabicDigits(a.aya)}` : `${fill(STRINGS[lang].suraNum, { n: num(a.sura, lang) })} · ${num(a.aya, lang)}`

const quranId = (id: string) => id.match(/^quran:(\d{1,3}):(\d{1,3})$/)


/** One name day's pages, every text by its id as the name's page reads it; a part that does not load is left out. */
export async function namePages(d: NameDay, lang: Lang, content: string): Promise<WidgetNamePage[]> {
  const e = d.entry
  const s: Lab = NAME_DAY[lang] ?? NAME_DAY.ar
  const ar = NAME_DAY.ar
  const r = READING[lang] ?? READING.ar
  const ml = lang !== 'ar' ? content : 'ar'
  const pages: WidgetNamePage[] = []
  const labels = { evidence: s.evidence, meaningAyah: s.meaningAyah, duaQuran: s.duaQuran, praiseQuran: s.praiseQuran, duaSunnah: s.duaSunnah }
  const parts = partsOf(e, labels)

  // 1. The evidence: its ayah (or the ayah for the meaning); with none, its hadith; with neither, the entry's first
  //    Quranic dua, under its own label (as the name's page labels it).
  const first = firstQuoted(e)
  const ayahPart = first?.kind === 'ayah' ? parts.find((p) => p.kind === 'ayah' && p.id === first.id) : undefined
  if (ayahPart) {
    const p = await getNameAyah(ayahPart.id, ml, false).catch(() => null)
    const m = quranId(ayahPart.id)
    if (p?.ayah && m) {
      pages.push({
        kind: 'ayah',
        label: ayahPart.label,
        text: p.text,
        ref: ayahRef(p.ayah, lang),
        source: `${r.srcMushaf} · ${r.srcKsu}`,
        url: `imuslim://quran/${m[1]}/${m[2]}`,
        meaning: ayahMeaning(p, lang),
      })
      // 3. The quoted meaning: al-Saʿdi's tafsir of that ayah when it is the entry's own (`tafsirOf`), as on its page.
      const saadi = e.tafsirOf === ayahPart.id ? p.tafsir?.find((x) => x.key === 'saadi' && !x.empty && x.text) : undefined
      if (saadi)
        pages.push({
          kind: 'meaning',
          label: r.srcSaadi,
          paragraphs: saadi.paragraphs?.length ? saadi.paragraphs : [saadi.text],
          source: `${r.srcSaadi} · ${r.srcKsu}`,
          url: `imuslim://quran/${m[1]}/${m[2]}`,
        })
    }
  }

  // 2. The hadith evidence with its grade and takhrij as stored: after the ayah, before the quoted meaning.
  if (e.hadith) {
    const h = await getToolHadith(e.hadith, content).catch(() => null)
    if (h?.text) {
      const page: WidgetNamePage = {
        kind: 'hadith',
        label: s.evidence,
        text: h.text,
        grade: h.grade ?? '',
        attribution: h.attribution ?? '',
        source: 'موسوعة الأحاديث النبوية',
        url: `imuslim://hadith/${h.id}`,
        meaning: hadithMeaning(h, lang),
      }
      const at = pages.findIndex((p) => p.kind === 'meaning')
      if (at >= 0) pages.splice(at, 0, page)
      else pages.push(page)
    }
  }

  // 4. «القراءة», only while the server sends it, under its heading; Arabic in every interface.
  if (d.readings) {
    const sentences = readingSentences(d.readings)
    if (sentences.length)
      pages.push({
        kind: 'reading',
        label: s.madeHeading,
        inArabic: lang === 'ar' ? null : s.inArabic,
        partLabels: [ar.meaningLabel, ar.easyLabel, ar.deepLabel],
        sentences,
        url: `imuslim://today/name/${e.n}`,
      })
  }
  return pages
}

/** `of`: «{n} من {t}» in the app's language (the widgets' strings). */
export async function nameWidgetDay(day: string, lang: Lang, content: string, of = '{n} / {t}'): Promise<WidgetNameDay | null> {
  const d = await getNameDay(day, lang).catch(() => null)
  if (!d?.entry) return null
  const start = Date.parse(`${day}T00:00:00Z`) - RIYADH
  const pages = await namePages(d, lang, content)
  if (!pages.length) return null
  return {
    day,
    start,
    end: start + DAY,
    n: d.entry.n,
    count: d.count,
    name: d.entry.name,
    latin: null,
    of: fill(of, { n: num(d.entry.n, lang), t: num(d.count, lang) }),
    url: `imuslim://today/name/${d.entry.n}`,
    shareUrl: `imuslim://today/name/${d.entry.n}/share`,
    pages,
  }
}

/** The name of the day from today on (Riyadh), once per Riyadh day; a day that cannot be read keeps what the file had. */
let nameMemo: { key: string; days: WidgetNameDay[] } | null = null
export async function nameWidgetDays(now: Date, lang: Lang, content: string, of: string, previous: WidgetNameDay[] = []): Promise<WidgetNameDay[]> {
  const today = riyadhStart(now.getTime())
  const key = `${riyadhYmd(today)}|${lang}|${content}`
  if (nameMemo?.key === key) return nameMemo.days
  const before = new Map(previous.map((d) => [d.day, d]))
  const days = await Promise.all(
    Array.from({ length: NAME_WIDGET_DAYS }, async (_, k) => {
      const day = riyadhYmd(today + k * DAY)
      return (await nameWidgetDay(day, lang, content, of)) ?? before.get(day) ?? null
    }),
  )
  const out = days.filter((d): d is WidgetNameDay => !!d)
  if (out.length === NAME_WIDGET_DAYS) nameMemo = { key, days: out }
  return out
}

// MARK: the salaf saying of the day

export function salafWidgetDays(now: Date, n = SALAF_WIDGET_DAYS): WidgetSalafDay[] {
  const today = riyadhStart(now.getTime())
  const out: WidgetSalafDay[] = []
  for (let k = 0; k < n; k++) {
    const start = today + k * DAY
    const c = salafOfDay(start + 12 * 3600_000)
    if (!c) continue
    out.push({
      day: riyadhYmd(start),
      start,
      end: start + DAY,
      n: c.n,
      topic: c.topic,
      text: c.text,
      parts: salafParts(c),
      attribution: salafAttribution(c),
      source: salafSource(c),
      book: c.book_title,
      author: c.author,
      place: salafVolPage(c),
      url: c.url,
      appUrl: 'imuslim://today',
      shareUrl: `imuslim://today/salaf/${c.n}/share`,
    })
  }
  return out
}
