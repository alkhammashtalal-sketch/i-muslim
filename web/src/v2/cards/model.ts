// «اصنع كروت» (add-on 0072-add30 §1): a set of cards to post on Instagram or Snapchat, made by code from what the
// screen already shows, with no model and no network at the time of making. This file is the pure part: what a set
// holds, how a text is cut into sentences, and how the blocks are laid out into cards. Drawing is ./draw.ts; the
// builder sheet is ./CardsSheet.tsx. Tested in worker/test/cards-0072.test.ts.
//
// The rules (§1 «التقسيم»):
//   - an ayah is never cut: it is one unit, drawn smaller when it is long, on a card of its own when it must be;
//   - a hadith, a quoted saying, a tafsir and the app's own explanation are cut after a complete sentence; a sentence
//     longer than a card after a joined clause («، و…»), then after a pause («،» «؛» «:»); never inside «…», {…}, ﴿…﴾,
//     (…) or […]; a text that a card cannot hold even drawn smaller leaves its section out of the set, never off a card;
//   - every card carries the source of every text on it, and the app's explanation carries its title on every card
//     it appears on;
//   - the first card is the cover, the last the closing card («مسلم» ✦ App Store, the QR code, the icon);
//   - at most 20 cards in a set (Instagram's carousel limit).
// No text is altered: the parts of a cut text, joined, are the text exactly (sentences(t).join('') === t).

export type Dir = 'rtl' | 'ltr'
export type Shape = 'post' | 'story' | 'square'
/** The three designs (add-on 0072-add39): «المخطوطة» (the default), «الورق», «الهندسة». */
export type Style = 'manuscript' | 'paper' | 'geometry'
export const STYLES: Style[] = ['manuscript', 'paper', 'geometry']
/** «الهندسة» colours a card by what is on it: a name emerald, an ayah blue, a hadith, a saying or an explanation brick,
 *  a lesson emerald, an answer of «اسأل» blue. */
export type Tone = 'name' | 'ayah' | 'hadith' | 'lesson' | 'answer'

export const SIZES: Record<Shape, { w: number; h: number }> = {
  post: { w: 1080, h: 1440 },
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
}
/** Instagram's limit of photos in one post. */
export const MAX_CARDS = 20

/** The meaning of an ayah in the reader's language, from our sources (QuranEnc, the Ayat archive, Sahih International). */
export type Meaning = { text: string; lang: string; dir: Dir; by: string }

export type Block =
  /** An ayah from D1: its text, its number for the marker, its place, and its source line; never cut. */
  | { kind: 'ayah'; text: string; num: string; ref: string; source: string; meaning?: Meaning | null; label?: string }
  /** A quoted text (a hadith, a saying of the Salaf, a scholar's words, a tafsir, a fatwa): Arabic in the text face
   *  unless `lang` says otherwise; `by` is «قال فلان» or the grade with the takhrij; `source` the book or site. */
  | { kind: 'quote'; text: string; lang: string; dir: Dir; by?: string; source: string; label?: string; context?: string; /** the main quoted text of its card (a hadith, a saying), in the large face */ big?: boolean }
  /** The app's own words (a lesson's «ماذا تفعل», the name's «أثره في قلبك», the answer's generated explanation): under
   *  their `title` on every card (the section's heading when it is the same, else a line of its own over the text), with
   *  `note` («شرح أعدّه التطبيق») where the screen shows one. */
  | { kind: 'explain'; title: string; text: string; lang: string; dir: Dir; note?: string }

/** A section the person can keep or leave out, and move. `heading` is drawn at the top of its cards. */
export type Section = { id: string; label: string; heading: string; blocks: Block[]; tone?: Tone }

export type Deck = {
  /** The cover's title: «اسم الله الحفيظ», «سورة البقرة ✦ ٢٥٥», the lesson's step. */
  title: string
  /** A small line over the title on the cover («اسم الله لليوم», the lesson's name). */
  kicker?: string
  /** A name of Allah, drawn inside the shamsa on the cover. */
  shamsaName?: string
  /** The interface language: the cards' own words (the numbering, the headings) are in it. */
  lang: string
  dir: Dir
  /** «النص بالعربية» in the interface's language above a quoted Arabic text, outside Arabic; null in Arabic. */
  quoteNote?: string | null
  sections: Section[]
  /** The cover's colour in «الهندسة» (and a section's when it names none). */
  tone: Tone
  /** A short name for the files. */
  fileBase: string
}

// MARK: - Where a text may be cut

/** The quoting marks a text is never cut inside: «…» a quotation, {…} and ﴿…﴾ an ayah quoted in a tafsir, (…) an ayah
 *  or a quotation in Ibn Kathir («( … ) [سورة : رقم]») and the hadiths, […] its reference. */
const PAIRS: Record<string, string> = { '«': '»', '{': '}', '﴿': '﴾', '(': ')', '[': ']' }
const CLOSERS = new Set(Object.values(PAIRS))

/** For each position p of the text (0..length), whether a cut there falls inside a quoting pair: some matched opener
 *  before p whose closer is at p or after. Computed over the whole text, so a sentence that starts inside a quotation
 *  opened before it is still inside it. An opener never closed, or a closer never opened, guards nothing. */
export function guarded(text: string): Uint8Array {
  const open: { ch: string; at: number }[] = []
  const diff = new Int32Array(text.length + 2)
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch in PAIRS) open.push({ ch, at: i })
    else if (CLOSERS.has(ch)) {
      // Its own opener, the nearest; an opener of another kind left open inside it does not count.
      for (let k = open.length - 1; k >= 0; k--)
        if (PAIRS[open[k].ch] === ch) {
          diff[open[k].at + 1]++
          diff[i + 1]--
          open.length = k
          break
        }
    }
  }
  const inside = new Uint8Array(text.length + 1)
  let d = 0
  for (let p = 0; p <= text.length; p++) {
    d += diff[p]
    inside[p] = d > 0 ? 1 : 0
  }
  return inside
}

// A sentence ends at «.» «!» «?» «؟» «۔» «।» (and «…»), with any closing mark after it, then a space or the end; or at a
// line break. A full stop between digits («1.5») or before a letter with no space is not an end.
const END = /[.!?؟۔।…]+[»"”’')\]）}﴾]*(?=\s|$)|\n+/g
/** A clause of Arabic prose: «،» or «؛», then a joined clause that opens with «و» «ف» «ثم» «أو» «بل» «لكن». */
const CLAUSE = /[،؛]\s+(?=و|ف|ثم\s|أو\s|بل\s|لكن)/g
/** The last resort before leaving a text out: any «،» «؛» or «:» with a space after it. */
const PAUSE = /[،؛:]\s+/g

/** The cut positions of one kind in text[from, to), each after the mark and the spaces after it, never inside a pair. */
function cutsOf(text: string, inside: Uint8Array, re: RegExp, from = 0, to = text.length): number[] {
  const out: number[] = []
  re.lastIndex = from
  for (let m = re.exec(text); m && m.index < to; m = re.exec(text)) {
    let p = m.index + m[0].length
    while (p < to && /\s/.test(text[p])) p++
    if (p > from && p < to && !inside[p]) out.push(p)
    if (re.lastIndex <= m.index) re.lastIndex = m.index + 1
  }
  return out
}

/** A span cut at the given positions: the parts, joined, are the span. */
const splitAt = (from: number, to: number, cuts: number[]): [number, number][] => {
  const out: [number, number][] = []
  let a = from
  for (const c of cuts) if (c > a && c < to) (out.push([a, c]), (a = c))
  out.push([a, to])
  return out
}

/** The text cut after each complete sentence, never inside a quoting pair; the spaces after an end stay with the
 *  sentence before it, so the parts joined are the text exactly. A text with no end is one sentence. */
export function sentences(text: string): string[] {
  const inside = guarded(text)
  return splitAt(0, text.length, cutsOf(text, inside, END)).map(([a, b]) => text.slice(a, b)).filter((x, _i, all) => x.length > 0 || all.length === 1)
}

/** One unit of a text in the layout: its span in the text. */
type Span = [number, number]

/** The units of a block, from the largest cut to the smallest, only as small as a card needs: an ayah whole; any other
 *  text by its sentences; a sentence longer than a card by its joined clauses; one still longer by its pauses («،» «؛»
 *  «:»). Never inside «…», {…}, ﴿…﴾, (…) or […], which are guarded over the whole text. */
export function spansOf(block: Block, fits: (text: string, first: boolean) => boolean): Span[] {
  const t = block.text
  if (block.kind === 'ayah') return [[0, t.length]]
  const inside = guarded(t)
  let spans = splitAt(0, t.length, cutsOf(t, inside, END))
  for (const re of [CLAUSE, PAUSE])
    spans = spans.flatMap(([a, b]) => (fits(t.slice(a, b), a === 0) ? [[a, b] as Span] : splitAt(a, b, cutsOf(t, inside, re, a, b))))
  return spans.filter(([a, b]) => b > a)
}

/** A sentence's clauses (after «،» or «؛» and a joined clause), guarded over the sentence; for the tests. */
export function clauses(sentence: string): string[] {
  return splitAt(0, sentence.length, cutsOf(sentence, guarded(sentence), CLAUSE)).map(([a, b]) => sentence.slice(a, b))
}

// MARK: - Layout

/** One piece of a block on a card: the whole block, or some of its units (`part` of `parts`); `units` how many. */
export type Piece = { block: Block; text: string; part: number; parts: number; first: boolean; last: boolean; units: number }
export type Page =
  | { kind: 'cover' }
  | { kind: 'body'; section: Section; pieces: Piece[]; /** the section's first card */ head: boolean }
  | { kind: 'closing' }

/** How much room a piece takes on a card, in pixels at the card's base sizes (./draw.ts measures with the canvas; the
 *  tests with a fixed width per character). */
export type Measure = {
  /** The height of a piece with its label, its lines, its by-line and source (and the ayah's meaning). */
  piece: (block: Block, text: string, first: boolean, section: Section) => number
  /** Whether a piece too tall at the base sizes fits when drawn smaller, down to the smallest size a card allows. */
  fits: (block: Block, text: string, first: boolean, section: Section) => boolean
  /** The room on a card for the pieces: under the heading, above the foot. */
  room: number
  /** The space between two pieces on one card. */
  gap: number
}

/** The smallest a card's text is drawn (of its base size), when one text has the card alone. */
export const MIN_SCALE = 0.6

/** The units of a block that may stand on a card apart (an ayah whole, any other text by its sentences). */
export const unitsOf = (b: Block): string[] => (b.kind === 'ayah' ? [b.text] : sentences(b.text))

/** A section's cards, and whether every unit of it fits a card (else it is left out of the set). */
export function layoutSectionX(section: Section, m: Measure): { cards: Piece[][]; fits: boolean } {
  const cards: Piece[][] = []
  let cur: Piece[] = []
  let used = 0
  let fits = true
  const close = () => {
    if (cur.length) cards.push(cur)
    cur = []
    used = 0
  }
  // An ayah with its meaning that one card cannot hold at its size: the ayah alone, then its meaning on the next card,
  // under the ayah's place and with its translator as its source (the meaning is never cut from its ayah's reference).
  const blocks = section.blocks.flatMap((b): Block[] =>
    b.kind === 'ayah' && b.meaning && m.piece(b, b.text, true, section) > m.room
      ? [
          { ...b, meaning: null },
          { kind: 'quote', text: b.meaning.text, lang: b.meaning.lang, dir: b.meaning.dir, by: b.ref, source: b.meaning.by },
        ]
      : [b],
  )
  for (const block of blocks) {
    const units = spansOf(block, (text, first) => m.piece(block, text, first, section) <= m.room).map(([a, b]) => block.text.slice(a, b))
    // A unit that a card cannot hold even drawn smaller: the section does not go on cards (never a text off its card).
    units.forEach((u, k) => {
      if (m.piece(block, u, k === 0, section) > m.room && !m.fits(block, u, k === 0, section)) fits = false
    })
    const h = (from: number, n: number) => m.piece(block, units.slice(from, from + n).join(''), from === 0, section)
    /** Runs of units from `from`, each as many as `cap` holds (one at least). */
    const greedy = (from: number, cap: number) => {
      const out: [number, number][] = []
      for (let i = from; i < units.length; ) {
        let n = 0
        while (i + n < units.length && h(i, n + 1) <= cap) n++
        n = Math.max(1, n)
        out.push([i, n])
        i += n
      }
      return out
    }
    const runs: [number, number][] = []
    let i = 0
    // On a card that already holds a text: as much as its room left holds, the rest on fresh cards.
    if (cur.length) {
      let n = 0
      while (n < units.length && used + m.gap + h(0, n + 1) <= m.room) n++
      if (n) runs.push([0, n])
      else close()
      i = n
    }
    // On fresh cards: as few as the greedy fill needs, the units spread evenly over them (no full card and a near-empty
    // one after it).
    if (i < units.length) {
      const fill = greedy(i, m.room)
      let best = fill
      if (fill.length > 1) {
        const total = h(i, units.length - i)
        for (let cap = Math.ceil(total / fill.length); cap < m.room; cap += Math.max(8, Math.round(m.room * 0.02))) {
          const g = greedy(i, cap)
          if (g.length <= fill.length) {
            best = g
            break
          }
        }
      }
      runs.push(...best)
    }
    runs.forEach(([from, n], k) => {
      if (k > 0) close()
      const text = units.slice(from, from + n).join('')
      const gap = cur.length ? m.gap : 0
      cur.push({ block, text, part: k + 1, parts: runs.length, first: from === 0, last: from + n === units.length, units: n })
      used += gap + h(from, n)
    })
  }
  close()
  return { cards, fits }
}

/** The section's pieces, laid out on as few cards as fit (see layoutSectionX). */
export const layoutSection = (section: Section, m: Measure): Piece[][] => layoutSectionX(section, m).cards
/** Whether every text of the section fits a card at this size and design. */
export const sectionFits = (section: Section, m: Measure): boolean => layoutSectionX(section, m).fits

/** The whole set: the cover, each chosen section's cards in the chosen order (a section that does not fit is left out),
 *  the closing card. */
export function layoutDeck(sections: Section[], m: Measure): Page[] {
  const pages: Page[] = [{ kind: 'cover' }]
  for (const s of sections) {
    const x = layoutSectionX(s, m)
    if (x.fits) x.cards.forEach((pieces, i) => pages.push({ kind: 'body', section: s, pieces, head: i === 0 }))
  }
  pages.push({ kind: 'closing' })
  return pages
}

/** The sections kept by default: in their order, those that fit, while the set stays within 20 cards. */
export function defaultChoice(sections: Section[], m: Measure): string[] {
  let total = 2
  const out: string[] = []
  for (const s of sections) {
    const x = layoutSectionX(s, m)
    if (!x.fits) continue
    const n = x.cards.length
    if (total + n > MAX_CARDS) continue
    total += n
    out.push(s.id)
  }
  return out
}

// MARK: - Numbering

/** A number in the interface's digits, as the interface writes its numbers (i18n numberLocale): Arabic-Indic in
 *  Arabic, the language's own default elsewhere (Bengali digits in Bengali, Latin in the others). */
export const digitsOf = (lang: string, n: number): string => {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-arab' : lang, { useGrouping: false }).format(n)
  } catch {
    return String(n)
  }
}

/** The corner's «١ من ٥» in the interface's language and digits. */
export const cornerOf = (lang: string, of: string, i: number, n: number) => of.replace('{i}', digitsOf(lang, i)).replace('{n}', digitsOf(lang, n))
