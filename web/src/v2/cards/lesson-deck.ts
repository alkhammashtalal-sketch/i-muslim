// «اصنع كروت» of the lessons (add-on 0072-add30 §1): a step's card, or every step's for «الدرس كله», read from the
// lesson's own DOM as its renderer built it (lessons/<id>/lesson.js stepCard). The quoted texts there are the checked
// slices of texts.js, each in an element with data-ref and data-field, put in by textContent from our server's rows:
// so what goes on a card is what the step shows, letter for letter. Our own words (the step's «ماذا تفعل», its line,
// the fixed sentences) go under their field's heading as the app's explanation; the folded full texts, the buttons,
// the links and the close-ups' drawings stay on the page.
import type { Lang } from '../../../../shared/api'
import { arabicDigits } from '../../quran/format'
import { READING } from '../reading/strings'
import { sepOf } from '../daily/arabic-marks'
import { quoteNote } from '../daily/arabic-marks'
import type { Block, Deck, Section } from './model'
import { dirOf } from './decks'

type LessonData = { quran?: Record<string, { sura: number; aya: number; sura_name: string }> }
const AR_SEP = sepOf('ar')

/** What is never put on a card: folded texts, controls, maps, drawings, and the notes about the page itself. */
const SKIP = 'details, nav, button:not(.ayah), .repeat, .links, .map, .pm-mode, .pm-bar, .listen, .lsn-listen, .lsn-cards, .slot, canvas, svg, .feet-view, table, .table-wrap, .none, .content-note, .kicker, .mark, .translit, a.btn'
/** Our own words on the step. */
const APP = 'p.do-text, p.intro-text, p.pm-cue-text, p.step-tag, p.fixed-note, p.feet-line.ui, p.legend, p.editor-note, p.fixed, p.ui, p.draw-note, p.badge'
/** The labels of a quoted text (its topic, «من شرح الحديث», whose words). */
const LABEL = 'p.topic, p.part-label, p.label, p.example, figcaption'

type Tok =
  | { t: 'h'; text: string }
  | { t: 'app'; text: string }
  | { t: 'label'; text: string }
  | { t: 'quote'; ref: string; field: string; text: string; lang: string }
  | { t: 'src'; by: string[]; source: string }

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function tokens(root: Element, out: Tok[] = []): Tok[] {
  for (const el of Array.from(root.children)) {
    if (el.matches(SKIP)) continue
    if (el.tagName === 'H2') {
      out.push({ t: 'h', text: clean(el.textContent) })
      continue
    }
    if (el.tagName === 'H1') continue
    if (el.matches('p.src')) {
      // A source line: its name (the first plain span), and the grade, takhrij, narrator… its quoted parts carry.
      const spans = Array.from(el.children).filter((x) => x.tagName === 'SPAN')
      const plain = spans.find((x) => !x.hasAttribute('data-ref') && !x.querySelector('[data-ref]'))
      const by: string[] = []
      for (const x of spans) {
        if (x === plain) continue
        if (x.hasAttribute('data-ref') && (x.getAttribute('data-field') === 'grade' || x.getAttribute('data-field') === 'attribution')) by.push(clean(x.textContent))
      }
      // sunnah.com's rows: «الراوي: …» with the quoted part inline, as the step shows it.
      if (el.querySelector('[data-ref^="evidence:"]') && !el.querySelector('a[data-ref]')) by.push(clean(el.textContent))
      const source = plain && !el.querySelector('[data-ref^="evidence:"]') ? clean(plain.textContent).replace(/[:：]\s*$/, '') : ''
      if (by.length || source) out.push({ t: 'src', by, source })
      continue
    }
    const ref = el.getAttribute('data-ref')
    if (ref) {
      const field = el.getAttribute('data-field') ?? el.getAttribute('data-col') ?? ''
      const text = el.textContent ?? ''
      if (field !== 'translit' && text.trim()) out.push({ t: 'quote', ref, field, text, lang: el.getAttribute('lang') ?? el.closest('[lang]')?.getAttribute('lang') ?? 'ar' })
      continue
    }
    if (el.matches(APP)) {
      const text = clean(el.textContent)
      if (text) out.push({ t: 'app', text })
      continue
    }
    if (el.matches(LABEL)) {
      const text = clean(el.textContent)
      if (text) out.push({ t: 'label', text })
      continue
    }
    tokens(el, out)
  }
  return out
}

/** The step's sections: what comes before its first heading under the step's title, then one per heading. */
function stepSections(card: Element, lang: string, data: LessonData, key: string): { title: string; kicker: string; sections: Section[] } {
  const r = READING[lang as Lang] ?? READING.ar
  const title = clean(card.querySelector('h1')?.textContent)
  const kicker = clean(card.querySelector('.kicker')?.textContent)
  const sections: Section[] = []
  let cur: Section = { id: `${key}-0`, label: title, heading: title, blocks: [] }
  let labels: string[] = []
  let last: Block | null = null
  // The quoted texts since the last source line: the next one is theirs (a hadith and its translation share one).
  let open: Block[] = []
  const content = lang === 'ar' ? 'ar' : 'en'
  const push = (b: Block) => {
    cur.blocks.push(b)
    last = b
    if (b.kind !== 'explain') open.push(b)
  }
  const flush = () => {
    if (cur.blocks.length) sections.push(cur)
  }
  for (const k of tokens(card)) {
    if (k.t === 'h') {
      flush()
      cur = { id: `${key}-${sections.length + 1}`, label: k.text, heading: k.text, blocks: [] }
      labels = []
      last = null
      open = []
      continue
    }
    if (k.t === 'label') {
      labels.push(k.text)
      continue
    }
    if (k.t === 'app') {
      const prev = cur.blocks[cur.blocks.length - 1]
      // Our consecutive lines of one field are one explanation under its heading.
      if (prev && prev.kind === 'explain' && (last as Block | null) === prev) prev.text += `\n${k.text}`
      else push({ kind: 'explain', title: cur.heading, text: k.text, lang: content, dir: dirOf(content) })
      continue
    }
    if (k.t === 'src') {
      for (const b of open) {
        if (b.kind === 'quote') {
          if (k.by.length) b.by = [b.by, ...k.by].filter(Boolean).join(AR_SEP)
          if (k.source && !b.source) b.source = k.source
        } else if (b.kind === 'ayah' && k.source) b.source = k.source
      }
      // sunnah.com's narrator, takhrij and grade come one line each: the rows stay open until the next text.
      if (!k.by.length || k.source) open = []
      continue
    }
    // A quoted text.
    const label = labels.length ? labels.join(sepOf(lang)) : undefined
    labels = []
    const q = k.ref.match(/^quran:(\d{1,3}):(\d{1,3})$/)
    if (q) {
      const A = data.quran?.[k.ref]
      const place = A ? `سورة ${A.sura_name}${AR_SEP}${arabicDigits(A.aya)}` : ''
      if (k.field === 'text') {
        push({ kind: 'ayah', text: k.text, num: arabicDigits(Number(q[2])), ref: place, source: `${r.srcMushaf}${sepOf(lang)}${r.srcKsu}`, label })
      } else if (k.field === 'text_en') {
        const b = last as Block | null
        if (b && b.kind === 'ayah') b.meaning = { text: k.text, lang: 'en', dir: 'ltr', by: 'Sahih International' }
      } else if (k.field === 'muyassar') {
        push({ kind: 'quote', text: k.text, lang: 'ar', dir: 'rtl', by: place, source: `${r.srcMuyassar}${sepOf(lang)}${r.srcKsu}`, label })
      }
      continue
    }
    const kl = (k.lang || 'ar').split('-')[0]
    if (k.ref.startsWith('evidence:')) {
      // A row of sunnah.com or the Dorar: its site is the label over it («sunnah.com»), its source line.
      const site = label ? label.split(sepOf(lang)).pop()! : 'sunnah.com'
      const rest = label ? label.split(sepOf(lang)).slice(0, -1).join(sepOf(lang)) : ''
      open = []
      push({ kind: 'quote', text: k.text, lang: kl, dir: dirOf(kl), source: site, label: rest || undefined })
      continue
    }
    push({ kind: 'quote', text: k.text, lang: kl, dir: dirOf(kl), source: '', label, big: k.ref.startsWith('hadith:') && k.field === 'hadeeth' && kl === 'ar' })
  }
  flush()
  return { title, kicker, sections }
}

/** The set of one step. */
export function lessonStepDeck(card: Element, lang: string, data: unknown, lesson: string, fileBase: string): Deck {
  const { title, kicker, sections } = stepSections(card, lang, data as LessonData, 's')
  return finish({ tone: 'lesson', title: title || lesson, kicker: [lesson, kicker].filter(Boolean).join(sepOf(lang)), lang, dir: dirOf(lang), quoteNote: quoteNote(lang), sections, fileBase })
}

/** «الدرس كله»: one section a step, its title as the heading, every field of it in order. */
export function lessonDeck(cards: Element[], lang: string, data: unknown, lesson: string, whole: string, fileBase: string): Deck {
  const sections: Section[] = cards.map((card, i) => {
    const { title, sections } = stepSections(card, lang, data as LessonData, `s${i}`)
    const n = new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-arab' : lang).format(i + 1)
    // The field's heading («الدليل», «ماذا تقول») over the first quoted text of it, as the step shows it; our own words
    // carry it as their title (./draw.ts draws it when it is not the card's heading).
    const blocks = sections.flatMap((x) =>
      x.blocks.map((b, k): Block => (k === 0 && b.kind !== 'explain' && x.heading !== title ? { ...b, label: [x.heading, b.label].filter(Boolean).join(sepOf(lang)) } : b)),
    )
    return { id: `step${i}`, label: `${n}. ${title}`, heading: title, blocks }
  })
  return finish({ tone: 'lesson', title: lesson, kicker: whole, lang, dir: dirOf(lang), quoteNote: quoteNote(lang), sections, fileBase })
}

/** Empty sections out; a quoted text with no source line takes its source from where the step's data comes. */
function finish(d: Deck): Deck {
  for (const s of d.sections) for (const b of s.blocks) if (b.kind === 'quote' && !b.source) b.source = b.lang === 'ar' ? 'موسوعة الأحاديث النبوية المترجمة' : 'HadeethEnc.com'
  return { ...d, sections: d.sections.filter((s) => s.blocks.length) }
}
