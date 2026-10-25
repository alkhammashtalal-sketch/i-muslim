// «اصنع كروت» (add-on 0072-add30 §1): a set of cards to post on Instagram or Snapchat, made by code from what the
// screen already shows, with no model and no network at the time of making. This file is the pure part: what a set
// holds, how a text is cut into sentences, and how the blocks are laid out into cards. Drawing is ./draw.ts; the
// builder sheet is ./CardsSheet.tsx. Tested in worker/test/cards-0072.test.ts.
//
// The rules (§1 «التقسيم»):
//   - an ayah is never cut: it is one unit, drawn smaller when it is long, on a card of its own when it must be;
//   - a hadith, a quoted saying, a tafsir and the app's own explanation are cut only after a complete sentence;
//     a sentence longer than a card has a card to itself, drawn smaller; never a cut inside a sentence;
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

// MARK: - Sentences

// A sentence ends at «.» «!» «?» «؟» «۔» «।» (and «…»), with any closing quote or bracket after it, then a space or the
// end; or at a line break. A full stop between digits («1.5») or inside an abbreviation without a space is not an end.
const END = /[.!?؟۔।…]+[»"”’')\]）]*(?=\s|$)|\n+/g

/** The text cut after each complete sentence; the whitespace after an end stays with the sentence before it, so the
 *  parts joined are the text exactly. A text with no end is one sentence. */
export function sentences(text: string): string[] {
  const out: string[] = []
  let from = 0
  END.lastIndex = 0
  for (let m = END.exec(text); m; m = END.exec(text)) {
    let to = m.index + m[0].length
    while (to < text.length && /\s/.test(text[to])) to++
    if (to > from && text.slice(from, to).trim()) {
      out.push(text.slice(from, to))
      from = to
    }
    if (END.lastIndex <= m.index) END.lastIndex = m.index + 1
  }
  if (from < text.length) {
    const rest = text.slice(from)
    if (rest.trim() || !out.length) out.push(rest)
    else out[out.length - 1] += rest
  }
  return out
}

/** A sentence cut after each «،» or «؛» that ends a clause: one followed by a new clause that opens with «و» «ف» «ثم»
 *  «أو» «بل» «لكن» (a joined sentence of Arabic prose), never inside brackets or quotes ({…} the ayah quoted in a tafsir,
 *  «…», (…), […], ﴿…﴾). Only for a sentence too long for a card; the parts joined are the sentence exactly. */
export function clauses(sentence: string): string[] {
  const OPEN = '{([«﴿'
  const CLOSE = '})]»﴾'
  const out: string[] = []
  let depth = 0
  let from = 0
  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i]
    if (OPEN.includes(ch)) depth++
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1)
    if (depth || (ch !== '،' && ch !== '؛')) continue
    let to = i + 1
    while (to < sentence.length && /\s/.test(sentence[to])) to++
    if (to === i + 1 || !/^(?:و|ف|ثم\s|أو\s|بل\s|لكن)/.test(sentence.slice(to))) continue
    out.push(sentence.slice(from, to))
    from = to
  }
  if (from < sentence.length) out.push(sentence.slice(from))
  return out.length ? out : [sentence]
}

// MARK: - Layout

/** One piece of a block on a card: the whole block, or some of its sentences (`part` of `parts`). */
export type Piece = { block: Block; text: string; part: number; parts: number; first: boolean; last: boolean }
export type Page =
  | { kind: 'cover' }
  | { kind: 'body'; section: Section; pieces: Piece[]; /** the section's first card */ head: boolean }
  | { kind: 'closing' }

/** How much room a piece takes on a card, in pixels at the card's base sizes (./draw.ts measures with the canvas; the
 *  tests with a fixed width per character). */
export type Measure = {
  /** The height of a piece with its label, its lines, its by-line and source (and the ayah's meaning). */
  piece: (block: Block, text: string, first: boolean, section: Section) => number
  /** The room on a card for the pieces: under the heading, above the foot. */
  room: number
  /** The space between two pieces on one card. */
  gap: number
}

const textOf = (b: Block) => b.text
/** The units of a block that may stand on a card apart: an ayah whole, any other text sentence by sentence. */
export const unitsOf = (b: Block): string[] => (b.kind === 'ayah' ? [b.text] : sentences(textOf(b)))

/** The section's pieces, laid out on as few cards as fit: a block's sentences go on while they fit, and the rest goes to
 *  the next card; a sentence too long for a card has one of its own (./draw.ts draws it smaller). */
export function layoutSection(section: Section, m: Measure): Piece[][] {
  const cards: Piece[][] = []
  let cur: Piece[] = []
  let used = 0
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
    // The units: an ayah whole; else its sentences, and a sentence longer than a whole card in its clauses (a text with
    // no full stop in its source: al-Saʿdi's tafsir in the Ayat archive has none, only «،» and «:»).
    const units = block.kind === 'ayah' ? [block.text] : unitsOf(block).flatMap((u, k) => (m.piece(block, u, k === 0, section) > m.room ? clauses(u) : [u]))
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
      cur.push({ block, text, part: k + 1, parts: runs.length, first: from === 0, last: from + n === units.length })
      used += gap + h(from, n)
    })
  }
  close()
  return cards
}

/** The whole set: the cover, each chosen section's cards in the chosen order, the closing card. */
export function layoutDeck(sections: Section[], m: Measure): Page[] {
  const pages: Page[] = [{ kind: 'cover' }]
  for (const s of sections) layoutSection(s, m).forEach((pieces, i) => pages.push({ kind: 'body', section: s, pieces, head: i === 0 }))
  pages.push({ kind: 'closing' })
  return pages
}

/** The sections kept by default: in their order, while the set stays within 20 cards. */
export function defaultChoice(sections: Section[], m: Measure): string[] {
  let total = 2
  const out: string[] = []
  for (const s of sections) {
    const n = layoutSection(s, m).length
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
