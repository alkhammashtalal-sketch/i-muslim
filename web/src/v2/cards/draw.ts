// «اصنع كروت» (add-ons 0072-add30 §1 and 0072-add39): each card drawn on a canvas by code, in one of three designs that
// match the mockups in relay/w1/0072-cards/mockups/ (A «المخطوطة», B «الورق», C «الهندسة», 1080×1440; gen.py has their
// colours, faces, sizes and spacing, taken here as they are):
//   A «المخطوطة»: the welcome painting's lapis, a gold double frame, its arabesque spandrel in the four corners, the
//     shamsa on the cover, the text centred;
//   B «الورق»: the paper's colour, a label and «٣ / ٦» over a gold rule, the card's number large and faint, the text
//     from its side, a short lapis rule between texts;
//   C «الهندسة»: a colour by what the card holds (./model.ts Tone), the eight-pointed star in a faint lattice and one
//     large, a band on the reading side with the number, the references in chips.
// The only pictures are the painting's own (welcome-B4.webp: its lapis, its corner spandrel) and its shamsa
// (medallion.png), drawn from the app's files: nothing from the network. The splitting, the sources, «١ من ٦», the
// closing card with the icon and the QR code, and the three sizes are the same in the three; on the story and the square
// the space is laid out anew, nothing is stretched. Every text is drawn as it was given: lines break between words only,
// and a text too long for its card is drawn smaller, never cut (./model.ts).
import { clauses, cornerOf, digitsOf, layoutDeck, sentences, SIZES, type Deck, type Measure, type Page, type Piece, type Shape, type Style, type Tone } from './model'
import { drawStoreQr, qrCount } from './qr'

const NASKH = '"Amiri Arabic", "Amiri", serif'
const UI = '"IBM Plex Sans Arabic", system-ui, sans-serif'
/** CLAUDE.md §8: an approved picture is used whole, never cut, the date card from B4 its one exception. Parts of the
 *  welcome painting on the cards (its lapis, its corner spandrel), as in the mockups of add-on 0072-add39, would be a
 *  second exception: until Talal decides, false, and «المخطوطة» takes the painting's lapis as one colour sampled from
 *  it, corners drawn by code in the app's own ornament vocabulary (components/Ornaments: the lobed rose, the five-petal
 *  flower, the leaf, the gold vine), and the shamsa as the widgets carry it, the picture whole in its gold-ruled square.
 *  True: the parts of the painting. */
export const CARDS_USE_B4_PARTS = false
/** The development server's switch for the comparison shots (never in a build): window.__cardsB4 = true. */
function useB4(): boolean {
  if (CARDS_USE_B4_PARTS) return true
  return !!import.meta.env.DEV && (globalThis as { __cardsB4?: boolean }).__cardsB4 === true
}
/** The painting's lapis as one colour: the mean of its plain ground under the flowers (LAPIS), sampled once. */
const LAPIS_SOLID = '#1a2e56'
/** The ornament palette of the app (styles/tokens.css). */
const ORN = { gold: '#c9a24a', goldDark: '#8c6d2a', azure: '#1e3a6b', white: '#fbf7ec', teal: '#3a8c84', coral: '#b5523a', ink: '#2a1e14' }

/** The welcome painting (1320 × 2857) and the parts of it the cards take, drawn from it as they are. */
const PAINTING_SRC = '/art/welcome-B4.webp'
/** Its lapis with no star or flower: the ground under the flowers. */
const LAPIS = { x: 110, y: 2540, w: 1100, h: 200 }
/** Its arabesque spandrel in the top corner, above the arch. */
const SPANDREL = { x: 96, y: 96, w: 256, h: 256 }
/** The painting's shamsa as the widgets carry it (medallion.png, 660 × 660, its disc of radius 150 at the centre). */
const SHAMSA_SRC = '/art/medallion.png'
const SHAMSA_DISC = 150 / 660
/** The app's icon «المورّقة» (relay/w1/0072-icon-v2/icon-default.png, 256 px), small on the closing card (add-ons
 *  0072-add31 §4 and 0072-add32). */
export const ICON_SRC = '/art/app-icon-256.png'

/** «الهندسة»: the colour of each kind (add-on 0072-add39 §4), and the closing card's sand. */
export const TONES: Record<Tone, string> = { name: '#0f5c4d', ayah: '#0b3f6b', hadith: '#a8462f', lesson: '#0f5c4d', answer: '#0b3f6b' }
const SAND = '#ecdcb9'
const STAR = 'M50 0 L61.2 22.9 L85.4 14.6 L77.1 38.8 L100 50 L77.1 61.2 L85.4 85.4 L61.2 77.1 L50 100 L38.8 77.1 L14.6 85.4 L22.9 61.2 L0 50 L22.9 38.8 L14.6 14.6 L38.8 22.9 Z'

type Ink = { ink: string; big: string; ref: string; label: string }
/** A design at a size: its text box, its faces and inks, its spacing (gen.py's CSS, the post's; the story and the
 *  square take the same faces in a box of their own). */
type Spec = {
  style: Style
  W: number
  H: number
  box: { x0: number; x1: number; top: number; bottom: number }
  center: boolean
  /** The heading drawn in the text's flow, over it (A), or in the card's head (B, C). */
  headInFlow: boolean
  big: number
  bigLh: number
  bigQuote: number
  txt: number
  txtLh: number
  explain: number
  latin: number
  ref: number
  refGap: number
  label: number
  gap: number
  ink: (tone: Tone) => Ink
}

function spec(style: Style, shape: Shape): Spec {
  const { w: W, h: H } = SIZES[shape]
  const story = shape === 'story'
  const square = shape === 'square'
  const k = square ? 0.88 : 1
  if (style === 'manuscript')
    return {
      style, W, H,
      box: { x0: 130, x1: W - 130, top: story ? 300 : square ? 205 : 250, bottom: H - (story ? 280 : square ? 185 : 230) },
      center: true, headInFlow: true,
      big: 66 * k, bigLh: 1.7, bigQuote: 58 * k, txt: 52 * k, txtLh: 1.85, explain: 44 * k, latin: 38 * k, ref: 28 * k, refGap: 34 * k, label: 34 * k, gap: 62 * k,
      ink: () => ({ ink: '#f3e7c8', big: '#f6e3a8', ref: '#cdb98a', label: '#e2c271' }),
    }
  if (style === 'paper')
    return {
      style, W, H,
      box: { x0: 110, x1: W - 110, top: story ? 260 : square ? 190 : 220, bottom: H - (story ? 240 : square ? 170 : 200) },
      center: false, headInFlow: false,
      big: 72 * k, bigLh: 1.65, bigQuote: 62 * k, txt: 54 * k, txtLh: 1.8, explain: 44 * k, latin: 38 * k, ref: 27 * k, refGap: 22 * k, label: 26 * k, gap: 92 * k,
      ink: () => ({ ink: '#1f1a14', big: '#1e3a6b', ref: '#6e5a3a', label: '#8a6d2c' }),
    }
  return {
    style, W, H,
    box: { x0: 90, x1: W - 190, top: story ? 240 : square ? 170 : 200, bottom: H - (story ? 240 : square ? 160 : 200) },
    center: false, headInFlow: false,
    big: 70 * k, bigLh: 1.6, bigQuote: 60 * k, txt: 54 * k, txtLh: 1.8, explain: 44 * k, latin: 38 * k, ref: 28 * k, refGap: 24 * k, label: 34 * k, gap: 50 * k,
    ink: () => ({ ink: '#ffffff', big: '#ffffff', ref: 'rgba(255,255,255,0.85)', label: '#ffffff' }),
  }
}

/** Lines that fit `width`, breaking between words only; a line break in the text stays one. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (line && ctx.measureText(next).width > width) {
        out.push(line)
        line = w
      } else line = next
    }
    if (line) out.push(line)
  }
  return out
}

const isArabic = (lang: string) => lang === 'ar'
type RowKind = 'note' | 'label' | 'context' | 'lines' | 'chip' | 'ref' | 'source' | 'meaning' | 'meaningBy' | 'explainNote'
type Row = { kind: RowKind; lines: string[]; font: string; lh: number; dir: 'rtl' | 'ltr'; color: string; before: number; bar?: boolean }

/** A piece's rows with their heights at scale `s`: what ./model.ts measures and what is drawn are the same list. */
function rowsOf(ctx: CanvasRenderingContext2D, deck: Deck, p: Piece, d: Spec, s: number, heading: string, tone: Tone): Row[] {
  const b = p.block
  const c = d.ink(tone)
  const width = d.box.x1 - d.box.x0
  const rows: Row[] = []
  const add = (kind: RowKind, text: string, font: string, lh: number, dir: 'rtl' | 'ltr', color: string, before: number, extra: Partial<Row> = {}) => {
    ctx.font = font
    const lines = wrapText(ctx, text, kind === 'chip' ? width - 60 * s : extra.bar ? width - 30 * s : width)
    if (lines.length) rows.push({ kind, lines, font, lh, dir, color, before, ...extra })
  }
  const ui = (w: number, px: number) => `${w} ${Math.round(px * s)}px ${UI}`
  const naskh = (w: number, px: number) => `${w} ${Math.round(px * s)}px ${NASKH}`
  const refLh = d.ref * 1.5 * s
  const uiDir = deck.dir
  const arabicText = b.kind === 'ayah' || (b.kind !== 'explain' && isArabic(b.lang)) || (b.kind === 'explain' && isArabic(b.lang))
  // «النص بالعربية» above an Arabic quoted text outside Arabic (add-on 0072-add23 §4.7), on every card it is on.
  if (deck.quoteNote && b.kind !== 'explain' && (b.kind === 'ayah' || isArabic(b.lang))) add('note', deck.quoteNote, ui(400, d.ref * 0.95), refLh, uiDir, c.ref, 0)
  // The app's explanation under its title on every card: the section's heading, or a line of its own when that is another.
  if (b.kind === 'explain' && b.title !== heading) add('label', b.title, ui(600, d.ref), refLh, b.dir, c.label, rows.length ? 10 * s : 0)
  else if (b.kind !== 'explain' && b.label) add('label', b.label, ui(600, d.ref), refLh, uiDir, c.label, rows.length ? 10 * s : 0)
  if (b.kind === 'quote' && b.context && p.first) add('context', b.context, naskh(400, d.txt * 0.8), d.txt * 0.8 * 1.7 * s, 'rtl', c.ref, rows.length ? 12 * s : 0)
  const first = rows.length ? 14 * s : 0
  if (b.kind === 'ayah') {
    // The ayah in the large face between the Mushaf's brackets, as in the mockups; its place, then its source.
    add('lines', `﴿${p.text.trim()}﴾`, naskh(700, d.big), d.big * d.bigLh * s, 'rtl', c.big, first)
    if (d.style === 'geometry') add('chip', b.ref, ui(600, d.ref * 0.93), (d.ref * 0.93 + 20) * s, 'rtl', c.ink, 34 * s)
    else add('ref', b.ref, ui(400, d.ref), refLh, 'rtl', c.ref, d.refGap * s)
    add('source', d.style === 'paper' ? `— ${b.source}` : b.source, ui(400, d.ref * 0.9), d.ref * 0.9 * 1.5 * s, uiDir, c.ref, 6 * s)
    if (b.meaning) {
      add('meaning', b.meaning.text, ui(400, d.latin), d.latin * 1.6 * s, b.meaning.dir, c.ink, 36 * s)
      add('meaningBy', b.meaning.by, ui(400, d.ref * 0.9), d.ref * 0.9 * 1.5 * s, b.meaning.dir, c.ref, 8 * s)
    }
    return rows
  }
  const text = p.text.trim()
  if (b.kind === 'quote') {
    if (!isArabic(b.lang)) add('lines', text, ui(400, d.latin), d.latin * 1.6 * s, b.dir, c.ink, first)
    else if (b.big) add('lines', text, naskh(700, d.bigQuote), d.bigQuote * d.bigLh * s, 'rtl', d.style === 'paper' ? c.ink : c.big, first)
    else add('lines', text, naskh(400, d.txt), d.txt * d.txtLh * s, 'rtl', c.ink, first)
    const bdir = isArabic(b.lang) ? 'rtl' : b.dir
    if (b.by) {
      if (d.style === 'geometry') add('chip', b.by, ui(600, d.ref * 0.93), (d.ref * 0.93 + 20) * s, bdir, c.ink, 34 * s)
      else add('ref', b.by, ui(400, d.ref), refLh, bdir, c.ref, d.refGap * s)
    }
    add('source', d.style === 'paper' ? `— ${b.source}` : b.source, ui(400, d.ref * 0.9), d.ref * 0.9 * 1.5 * s, bdir, c.ref, b.by ? 6 * s : d.refGap * s)
    return rows
  }
  // Our own words: the text face smaller (Arabic) or the interface's (another language), a lapis bar beside it on paper.
  if (arabicText) add('lines', text, naskh(400, d.explain), d.explain * 1.7 * s, 'rtl', c.ink, first, { bar: d.style === 'paper' })
  else add('lines', text, ui(400, d.latin), d.latin * 1.6 * s, b.dir, c.ink, first, { bar: d.style === 'paper' })
  if (b.note) add('explainNote', b.note, ui(400, d.ref * 0.85), d.ref * 0.85 * 1.5 * s, b.dir, c.ref, d.refGap * s)
  return rows
}

const rowsHeight = (rows: Row[]) => rows.reduce((h, r) => h + r.before + r.lines.length * r.lh, 0)
const headHeight = (d: Spec) => (d.headInFlow ? d.label * 1.4 + 34 : 0)

const toneOf = (deck: Deck, sectionTone: Tone | undefined) => sectionTone ?? deck.tone

/** The canvas the measures are taken on. */
let scratch: CanvasRenderingContext2D | null = null
const measureCtx = () => (scratch ??= document.createElement('canvas').getContext('2d')!)

/** The room and the pieces' heights for a design and a size, for ./model.ts layoutDeck. */
export function measureFor(deck: Deck, shape: Shape, style: Style = 'manuscript'): Measure {
  const d = spec(style, shape)
  const ctx = measureCtx()
  return {
    room: d.box.bottom - d.box.top - headHeight(d),
    gap: d.gap,
    piece: (block, text, first, section) => rowsHeight(rowsOf(ctx, deck, { block, text, part: 1, parts: 1, first, last: true }, d, 1, section.heading, toneOf(deck, section.tone))),
  }
}

export const layoutFor = (deck: Deck, shape: Shape, sections = deck.sections, style: Style = 'manuscript'): Page[] => layoutDeck(sections, measureFor(deck, shape, style))

// MARK: - Drawing

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const images = new Map<string, Promise<HTMLImageElement | null>>()
function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = images.get(src)
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
    images.set(src, p)
  }
  return p
}

type Pics = { painting: HTMLImageElement | null; shamsa: HTMLImageElement | null; icon: HTMLImageElement | null }

/** The painting's lapis over the card: its plain ground, tiled with every other row mirrored so no seam shows. */
function lapis(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement | null) {
  ctx.fillStyle = '#1b3a86'
  ctx.fillRect(0, 0, W, H)
  if (!img) return
  const x = (W - LAPIS.w) / 2
  for (let y = 0, k = 0; y < H; y += LAPIS.h, k++) {
    ctx.save()
    if (k % 2) {
      ctx.translate(0, y * 2 + LAPIS.h)
      ctx.scale(1, -1)
    }
    ctx.drawImage(img, LAPIS.x, LAPIS.y, LAPIS.w, LAPIS.h, x, y, LAPIS.w, LAPIS.h)
    ctx.restore()
  }
}

/** The spandrel at a corner, `size` square, its inner side fading into the lapis (no edge of the crop shows). */
function spandrel(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, size: number, flipX: boolean, flipY: boolean) {
  if (!img) return
  const off = document.createElement('canvas')
  off.width = off.height = Math.round(size)
  const o = off.getContext('2d')!
  o.drawImage(img, SPANDREL.x, SPANDREL.y, SPANDREL.w, SPANDREL.h, 0, 0, size, size)
  o.globalCompositeOperation = 'destination-in'
  const g = o.createRadialGradient(0, 0, size * 0.55, 0, 0, size * 1.05)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  o.fillStyle = g
  o.fillRect(0, 0, size, size)
  ctx.save()
  ctx.globalAlpha = 0.95
  ctx.translate(x + (flipX ? size : 0), y + (flipY ? size : 0))
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)
  ctx.drawImage(off, 0, 0)
  ctx.restore()
}

/** A corner of «المخطوطة» drawn by code from the app's ornament vocabulary (components/Ornaments): a gold vine in two
 *  scrolls along the corner, spirals, white five-petal flowers with a coral heart, gold and turquoise leaves, and the
 *  lobed rose at the corner itself. Flat fills and lines, `size` square, the corner at the top left (flips for the others). */
function codeCorner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flipX: boolean, flipY: boolean) {
  const k = size / 250
  ctx.save()
  ctx.translate(x + (flipX ? size : 0), y + (flipY ? size : 0))
  ctx.scale(flipX ? -k : k, flipY ? -k : k)
  ctx.lineCap = 'round'
  // The vine: an outer scroll and an inner one, from one edge round to the other.
  const vine = (d: string, w: number) => {
    ctx.strokeStyle = ORN.gold
    ctx.lineWidth = w
    ctx.stroke(new Path2D(d))
  }
  vine('M236 14 C150 14 70 22 40 52 C18 74 14 150 14 236', 4.2)
  vine('M196 42 C140 44 92 58 72 82 C54 104 44 140 42 196', 3)
  // Spirals off the vine.
  const spiral = (cx: number, cy: number, r: number, a0: number) => {
    ctx.beginPath()
    for (let t = 0; t <= 1.6 * Math.PI; t += 0.12) {
      const rr = r * (1 - t / (2.2 * Math.PI))
      const px = cx + rr * Math.cos(a0 + t)
      const py = cy + rr * Math.sin(a0 + t)
      if (t === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = ORN.gold
    ctx.lineWidth = 2.2
    ctx.stroke()
  }
  spiral(150, 34, 16, Math.PI * 0.9)
  spiral(34, 150, 16, Math.PI * 1.6)
  spiral(112, 70, 12, Math.PI * 1.2)
  spiral(70, 112, 12, Math.PI * 0.3)
  // Leaves: the leaf of the vine pattern, gold and turquoise, along the stems.
  const leaf = new Path2D('M0 -2.6 C1.3 -1.2 1.3 0.8 0 1.6 C-1.3 0.8 -1.3 -1.2 0 -2.6 Z')
  const putLeaf = (lx: number, ly: number, rot: number, color: string, sc = 6) => {
    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(rot)
    ctx.scale(sc, sc)
    ctx.fillStyle = color
    ctx.fill(leaf)
    ctx.lineWidth = 0.25
    ctx.strokeStyle = ORN.ink
    ctx.globalAlpha = 0.6
    ctx.stroke(leaf)
    ctx.restore()
  }
  putLeaf(200, 26, -1.2, ORN.gold)
  putLeaf(26, 200, 2.7, ORN.gold)
  putLeaf(128, 20, -0.5, ORN.teal)
  putLeaf(20, 128, 2.1, ORN.teal)
  putLeaf(166, 52, 0.9, ORN.teal, 5)
  putLeaf(52, 166, 0.7, ORN.teal, 5)
  putLeaf(96, 50, -0.9, ORN.gold, 5)
  putLeaf(50, 96, 2.5, ORN.gold, 5)
  // Flowers: five white petals, a coral heart, a gold dot.
  const flower = (fx: number, fy: number, sc: number) => {
    ctx.save()
    ctx.translate(fx, fy)
    ctx.scale(sc, sc)
    for (let i = 0; i < 5; i++) {
      ctx.save()
      ctx.rotate((i * 72 * Math.PI) / 180)
      ctx.beginPath()
      ctx.ellipse(0, -1.45, 0.95, 1.45, 0, 0, Math.PI * 2)
      ctx.fillStyle = ORN.white
      ctx.fill()
      ctx.lineWidth = 0.25
      ctx.strokeStyle = ORN.ink
      ctx.stroke()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(0, 0, 0.75, 0, Math.PI * 2)
    ctx.fillStyle = ORN.coral
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, 0, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = ORN.gold
    ctx.fill()
    ctx.restore()
  }
  flower(176, 30, 6.5)
  flower(30, 176, 6.5)
  flower(120, 52, 5.5)
  flower(52, 120, 5.5)
  flower(84, 84, 6)
  // The lobed rose at the corner: eight gold lobes, an azure heart, six white petals, a coral heart.
  ctx.save()
  ctx.translate(34, 34)
  ctx.scale(2.3, 2.3)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.arc(9.2 * Math.sin(a), -9.2 * Math.cos(a), 3.6, 0, Math.PI * 2)
    ctx.fillStyle = ORN.gold
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 9.7, 0, Math.PI * 2)
  ctx.fillStyle = ORN.gold
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, 7.7, 0, Math.PI * 2)
  ctx.fillStyle = ORN.azure
  ctx.fill()
  ctx.lineWidth = 0.45
  ctx.strokeStyle = ORN.ink
  ctx.stroke()
  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 3)
    ctx.beginPath()
    ctx.ellipse(0, -3.3, 1.55, 2.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = ORN.white
    ctx.fill()
    ctx.lineWidth = 0.3
    ctx.stroke()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2)
  ctx.fillStyle = ORN.coral
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

/** «الورق»'s grain (add-on 0072-add42 §4): no picture of paper, a light noise drawn by code over #f3ece0, each pixel at
 *  most 3% lighter or darker, the same on every card (a fixed seed), so the paper does not look flat. */
let grainTile: HTMLCanvasElement | null = null
function paperGrain(ctx: CanvasRenderingContext2D, W: number, H: number) {
  if (!grainTile) {
    const n = 256
    grainTile = document.createElement('canvas')
    grainTile.width = grainTile.height = n
    const g = grainTile.getContext('2d')!
    const img = g.createImageData(n, n)
    let seed = 0x9e3779b9
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    for (let i = 0; i < n * n; i++) {
      const v = rnd()
      // Dark or light, up to 3% of full strength (alpha 0..0.03 of black or white).
      const dark = v < 0.5
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = dark ? 60 : 255
      img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 0.03 * 255)
    }
    g.putImageData(img, 0, 0)
  }
  const pat = ctx.createPattern(grainTile, 'repeat')
  if (!pat) return
  ctx.save()
  ctx.fillStyle = pat
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const p = new Path2D(STAR)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 100, size / 100)
  return { p, done: () => ctx.restore() }
}

/** The lattice of eight-pointed stars, 100 px a cell, as in the mockups. */
function lattice(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  const p = new Path2D(STAR)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  for (let x = -1; x < Math.ceil(W / 100) + 1; x++)
    for (let y = -1; y < Math.ceil(H / 100) + 1; y++) {
      ctx.save()
      ctx.translate(x * 100 + 4, y * 100 + 4)
      ctx.scale(0.92, 0.92)
      ctx.lineWidth = 2.2 / 0.92
      ctx.stroke(p)
      ctx.restore()
    }
  ctx.restore()
}

/** The ground and frame of a card of the design (A: lapis, frame and corners; B: paper; C: the tone, the lattice, the
 *  large star and the band). `rtl`: the reading side is the right. */
function ground(ctx: CanvasRenderingContext2D, d: Spec, pics: Pics, tone: Tone, rtl: boolean, body: boolean) {
  const { W, H } = d
  if (d.style === 'manuscript') {
    const b4 = useB4()
    if (b4) lapis(ctx, W, H, pics.painting)
    else {
      ctx.fillStyle = LAPIS_SOLID
      ctx.fillRect(0, 0, W, H)
    }
    ctx.strokeStyle = '#c9a24a'
    ctx.lineWidth = 5
    roundRect(ctx, 34 + 2.5, 34 + 2.5, W - 68 - 5, H - 68 - 5, 6)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(201,162,74,0.75)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(50.75, 50.75, W - 101.5, H - 101.5)
    const size = H <= 1080 ? 200 : 250
    const corner = b4 ? (x: number, y: number, fx: boolean, fy: boolean) => spandrel(ctx, pics.painting, x, y, size, fx, fy) : (x: number, y: number, fx: boolean, fy: boolean) => codeCorner(ctx, x, y, size, fx, fy)
    corner(46, 46, false, false)
    corner(W - 46 - size, 46, true, false)
    corner(46, H - 46 - size, false, true)
    corner(W - 46 - size, H - 46 - size, true, true)
    return
  }
  if (d.style === 'paper') {
    ctx.fillStyle = '#f3ece0'
    ctx.fillRect(0, 0, W, H)
    paperGrain(ctx, W, H)
    return
  }
  ctx.fillStyle = TONES[tone]
  ctx.fillRect(0, 0, W, H)
  lattice(ctx, W, H, '#ffffff', body ? 0.07 : 0.09)
  if (!body) return
  // The large star toward the end of the reading, and the band on its start with the number.
  const big = starPath(ctx, rtl ? -260 : W + 260 - 760, H + 240 - 760, 760)
  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#ffffff'
  ctx.fill(big.p)
  big.done()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(rtl ? W - 120 : 0, 0, 120, H)
}

type DrawOpts = { deck: Deck; shape: Shape; style: Style; pages: Page[]; corner: string; appName: string; storeLine: string; storeUrl: string; scanHint: string }

const text = (ctx: CanvasRenderingContext2D, t: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign, dir: 'rtl' | 'ltr', alpha = 1) => {
  ctx.save()
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.direction = dir
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = alpha
  ctx.fillText(t, x, y)
  ctx.restore()
}

/** The text's side: right for right-to-left. */
const sideX = (d: Spec, dir: 'rtl' | 'ltr') => (dir === 'rtl' ? d.box.x1 : d.box.x0)

/** A body card's head and foot: the number and the heading, «مسلم» small. */
function chrome(ctx: CanvasRenderingContext2D, o: DrawOpts, d: Spec, i: number, heading: string, closing = false) {
  const { W, H } = d
  const n = o.pages.length
  const lang = o.deck.lang
  const rtl = o.deck.dir === 'rtl'
  const dir = o.deck.dir
  if (d.style === 'manuscript') {
    text(ctx, cornerOf(lang, o.corner, i + 1, n), W / 2, 90, `600 30px ${UI}`, '#e2c271', 'center', dir)
    text(ctx, o.appName, W / 2, H - 72 - 17, `400 26px ${UI}`, '#cdb98a', 'center', dir)
    return
  }
  if (d.style === 'paper') {
    if (closing) return
    const start = rtl ? W - 96 : 96
    const end = rtl ? 96 : W - 96
    text(ctx, heading, start, 97, `600 26px ${UI}`, '#8a6d2c', rtl ? 'right' : 'left', dir)
    text(ctx, `${digitsOf(lang, i + 1)} / ${digitsOf(lang, n)}`, end, 97, `600 26px ${UI}`, '#8a6d2c', rtl ? 'left' : 'right', dir)
    ctx.fillStyle = '#b08d3c'
    ctx.fillRect(96, 132, W - 192, 1.5)
    // The card's number large and faint toward the end of the reading.
    ctx.save()
    ctx.font = `700 ${H <= 1080 ? 230 : 300}px ${NASKH}`
    ctx.fillStyle = 'rgba(176,141,60,0.18)'
    ctx.textAlign = rtl ? 'left' : 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.direction = dir
    ctx.fillText(digitsOf(lang, i + 1), rtl ? 70 : W - 70, H - 40 - (H <= 1080 ? 40 : 60))
    ctx.restore()
    text(ctx, o.appName, rtl ? W - 110 : 110, H - 86 - 17, `600 26px ${UI}`, '#1e3a6b', rtl ? 'right' : 'left', dir)
    return
  }
  // «الهندسة»: the number in the band, «من ٦» under it, the heading beside it, «مسلم» at the foot.
  const band = rtl ? W - 60 : 60
  text(ctx, digitsOf(lang, i + 1), band, 92, `600 34px ${UI}`, '#ffffff', 'center', dir)
  text(ctx, o.corner.replace('{i}', '').replace('{n}', digitsOf(lang, n)).trim(), band, 136, `600 24px ${UI}`, '#ffffff', 'center', dir, 0.7)
  text(ctx, heading, rtl ? W - 180 : 180, 92, `600 34px ${UI}`, '#ffffff', rtl ? 'right' : 'left', dir, 0.9)
  text(ctx, o.appName, rtl ? W - 190 : 190, H - 80 - 18, `600 28px ${UI}`, '#ffffff', rtl ? 'right' : 'left', dir, 0.9)
}

function drawRows(ctx: CanvasRenderingContext2D, rows: Row[], y: number, d: Spec, s: number) {
  for (const r of rows) {
    y += r.before
    ctx.font = r.font
    ctx.direction = r.dir
    ctx.fillStyle = r.color
    ctx.textBaseline = 'middle'
    if (r.kind === 'chip') {
      // A chip: the reference on a light pill, from the text's side.
      for (const l of r.lines) {
        const w = ctx.measureText(l).width + 52 * s
        const h = r.lh
        const x = d.center ? d.W / 2 - w / 2 : r.dir === 'rtl' ? sideX(d, 'rtl') - w : sideX(d, 'ltr')
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        roundRect(ctx, x, y, w, h, h / 2)
        ctx.fill()
        ctx.restore()
        ctx.textAlign = 'center'
        ctx.fillText(l, x + w / 2, y + h / 2 + 1)
        y += h + 8 * s
      }
      y -= 8 * s
      continue
    }
    const center = d.center
    ctx.textAlign = center ? 'center' : r.dir === 'rtl' ? 'right' : 'left'
    const inset = r.bar ? 30 * s : 0
    const x = center ? d.W / 2 : r.dir === 'rtl' ? sideX(d, 'rtl') - inset : sideX(d, 'ltr') + inset
    if (r.bar) {
      ctx.save()
      ctx.fillStyle = '#1e3a6b'
      ctx.fillRect(r.dir === 'rtl' ? sideX(d, 'rtl') - 4 * s : sideX(d, 'ltr'), y + r.lh * 0.12, 4 * s, r.lines.length * r.lh - r.lh * 0.24)
      ctx.restore()
    }
    for (const l of r.lines) {
      ctx.fillText(l, x, y + r.lh / 2)
      y += r.lh
    }
  }
  return y
}

/** The space between two texts on a card: A a gold rule, B a short lapis rule from the side, C air. */
function between(ctx: CanvasRenderingContext2D, d: Spec, y: number, s: number, dir: 'rtl' | 'ltr') {
  if (d.style === 'manuscript') {
    ctx.fillStyle = '#c9a24a'
    ctx.fillRect(d.W / 2 - 90, y + d.gap * s * 0.5 - 1, 180, 2)
  } else if (d.style === 'paper') {
    ctx.fillStyle = '#1e3a6b'
    ctx.fillRect(dir === 'rtl' ? d.box.x1 - 70 : d.box.x0, y + d.gap * s * 0.5 - 2, 70, 4)
  }
}

/** Every text of the set, so each subset its letters need (Arabic, Latin, the digits) is loaded before a measure. */
export async function loadFonts(deck: Deck) {
  const sample = [deck.title, deck.kicker ?? '', deck.quoteNote ?? '', ...deck.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => [b.text, b.kind === 'ayah' ? `${b.ref} ${b.source} ${b.meaning?.text ?? ''} ${b.meaning?.by ?? ''}` : b.kind === 'quote' ? `${b.by ?? ''} ${b.source} ${b.label ?? ''}` : `${b.title} ${b.note ?? ''}`])]), '٠١٢٣٤٥٦٧٨٩ 0123456789 ﴿﴾ / — «مسلم» App Store'].join(' ')
  try {
    await Promise.all([
      document.fonts.load(`40px ${NASKH}`, sample),
      document.fonts.load(`700 60px ${NASKH}`, sample),
      document.fonts.load(`400 30px ${UI}`, sample),
      document.fonts.load(`600 30px ${UI}`, sample),
    ])
  } catch {
    // fonts unavailable: the canvas falls back to the system's
  }
}

/** Every card of the set, drawn at `scale` of its size (1 for the files, smaller for the preview). */
export async function drawCards(o: DrawOpts, scale = 1): Promise<HTMLCanvasElement[]> {
  await loadFonts(o.deck)
  const pics = await loadPics()
  return o.pages.map((p, i) => drawPage(o, p, i, scale, pics))
}

const loadPics = async (): Promise<Pics> => {
  const [painting, shamsa, icon] = await Promise.all([useB4() ? loadImage(PAINTING_SRC) : Promise.resolve(null), loadImage(SHAMSA_SRC), loadImage(ICON_SRC)])
  return { painting, shamsa, icon }
}

/** The cover alone, small: the design's picture in the builder. */
export async function drawCover(o: Omit<DrawOpts, 'pages'> & { pages?: Page[] }, scale: number) {
  await loadFonts(o.deck)
  const pics = await loadPics()
  const pages: Page[] = o.pages ?? [{ kind: 'cover' }, { kind: 'closing' }]
  return drawPage({ ...o, pages }, { kind: 'cover' }, 0, scale, pics)
}

/** The largest face from `from` down whose lines (at most `max`) fit `width`. */
function fitTitle(ctx: CanvasRenderingContext2D, t: string, font: (px: number) => string, from: number, min: number, width: number, max: number) {
  let px = from
  let lines: string[] = []
  for (; px >= min; px -= 2) {
    ctx.font = font(px)
    lines = wrapText(ctx, t, width)
    if (lines.length <= max && lines.every((l) => ctx.measureText(l).width <= width)) break
  }
  return { px, lines }
}

const dirOfText = (t: string): 'rtl' | 'ltr' => (/[؀-ۿ]/.test(t) ? 'rtl' : 'ltr')

function drawCover2(ctx: CanvasRenderingContext2D, o: DrawOpts, d: Spec, pics: Pics) {
  const { W, H } = d
  const deck = o.deck
  const name = deck.shamsaName
  const lang = deck.lang
  const n = o.pages.length
  const tdir = dirOfText(deck.title)
  if (d.style === 'manuscript') {
    // The shamsa whole, faded at its rim into the lapis, the name in its disc; under it the title.
    const size = H <= 1080 ? 480 : 640
    const titleFit = fitTitle(ctx, name ? deck.title : deck.title, (px) => (name ? `600 ${px}px ${UI}` : `700 ${px}px ${NASKH}`), name ? 40 : 64, 28, W - 300, name ? 2 : 4)
    const titleLh = titleFit.px * (name ? 1.4 : 1.6)
    const kick = !name && deck.kicker ? 60 : 0
    const block = size + 40 + titleFit.lines.length * titleLh + kick
    let y = (H - block) / 2
    if (kick) {
      text(ctx, deck.kicker!, W / 2, y + 20, `600 30px ${UI}`, '#e2c271', 'center', dirOfText(deck.kicker!))
      y += kick
    }
    const cx = W / 2
    if (pics.shamsa && !useB4()) {
      // The shamsa as the widgets and the share images carry it: the picture whole, in its square, a gold rule round it.
      const side = Math.round(size * 0.86)
      const sx0 = cx - side / 2
      const sy0 = y + (size - side) / 2
      ctx.save()
      roundRect(ctx, sx0, sy0, side, side, 28)
      ctx.clip()
      ctx.drawImage(pics.shamsa, sx0, sy0, side, side)
      ctx.restore()
      ctx.strokeStyle = '#c9a24a'
      ctx.lineWidth = 3
      roundRect(ctx, sx0, sy0, side, side, 28)
      ctx.stroke()
    } else if (pics.shamsa) {
      const off = document.createElement('canvas')
      off.width = off.height = size
      const g = off.getContext('2d')!
      g.drawImage(pics.shamsa, 0, 0, size, size)
      g.globalCompositeOperation = 'destination-in'
      const R = size * Math.SQRT1_2
      const m = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, R)
      m.addColorStop(0, '#000')
      m.addColorStop(0.62, '#000')
      m.addColorStop(0.7, 'rgba(0,0,0,0)')
      g.fillStyle = m
      g.fillRect(0, 0, size, size)
      ctx.drawImage(off, cx - size / 2, y)
    }
    const r = (useB4() ? size : Math.round(size * 0.86)) * SHAMSA_DISC
    if (name) {
      const f = fitTitle(ctx, name, (px) => `700 ${px}px ${NASKH}`, Math.round(r * 1.03), 40, r * 1.75, 2)
      f.lines.forEach((l, k) => text(ctx, l, cx, y + size / 2 - 30 * (size / 640) * 0.5 + (k - (f.lines.length - 1) / 2) * f.px * 1.2, `700 ${f.px}px ${NASKH}`, '#1e3a6b', 'center', 'rtl'))
    } else star(ctx, cx, y + size / 2, r * 0.75, '#94712c')
    y += size + 40
    titleFit.lines.forEach((l) => {
      text(ctx, l, cx, y + titleLh / 2, name ? `600 ${titleFit.px}px ${UI}` : `700 ${titleFit.px}px ${NASKH}`, name ? '#e2c271' : '#f6e3a8', 'center', tdir)
      y += titleLh
    })
    chrome(ctx, o, d, 0, '')
    return
  }
  if (d.style === 'paper') {
    // The kicker, a gold rule, the name (or the title) large in lapis, a gold rule, «١ / ٦».
    const big = name ? fitTitle(ctx, name, (px) => `700 ${px}px ${NASKH}`, H <= 1080 ? 220 : 290, 60, W - 220, 1) : fitTitle(ctx, deck.title, (px) => `700 ${px}px ${NASKH}`, H <= 1080 ? 84 : 110, 36, W - 220, 4)
    const lh = big.px * (name ? 1.2 : 1.45)
    const kicker = deck.kicker ?? ''
    const block = (kicker ? 30 * 1.4 : 0) + 81.5 + big.lines.length * lh + 81.5 + 42
    let y = (H - block) / 2
    if (kicker) {
      text(ctx, kicker, W / 2, y + 21, `600 30px ${UI}`, '#8a6d2c', 'center', dirOfText(kicker))
      y += 42
    }
    ctx.fillStyle = '#b08d3c'
    ctx.fillRect(W / 2 - 60, y + 40, 120, 1.5)
    y += 81.5
    big.lines.forEach((l) => {
      text(ctx, l, W / 2, y + lh / 2, `700 ${big.px}px ${NASKH}`, '#1e3a6b', 'center', dirOfText(l))
      y += lh
    })
    ctx.fillStyle = '#b08d3c'
    ctx.fillRect(W / 2 - 60, y + 40, 120, 1.5)
    y += 81.5
    text(ctx, `${digitsOf(lang, 1)} / ${digitsOf(lang, n)}`, W / 2, y + 21, `400 30px ${UI}`, '#6e5a3a', 'center', deck.dir)
    text(ctx, o.appName, W / 2, H - 86 - 17, `600 26px ${UI}`, '#1e3a6b', 'center', deck.dir)
    return
  }
  // «الهندسة»: the gold star large, the name in it in the tone's colour; the title under it, «١ من ٦» at the top.
  const tone = TONES[deck.tone]
  const size = H <= 1080 ? 640 : 900
  const top = H <= 1080 ? 150 : H >= 1920 ? 330 : 200
  const sx = (W - size) / 2
  const s = starPath(ctx, sx, top, size)
  ctx.fillStyle = '#f2c14e'
  ctx.fill(s.p)
  s.done()
  const cx = W / 2
  const cy = top + size / 2
  if (name) {
    const f = fitTitle(ctx, name, (px) => `700 ${px}px ${NASKH}`, Math.round(size * 0.222), 40, size * 0.52, 2)
    f.lines.forEach((l, k) => text(ctx, l, cx, cy - size * 0.02 + (k - (f.lines.length - 1) / 2) * f.px * 1.2, `700 ${f.px}px ${NASKH}`, tone, 'center', 'rtl'))
    const t = fitTitle(ctx, deck.title, (px) => `600 ${px}px ${UI}`, 46, 28, W - 180, 2)
    t.lines.forEach((l, k) => text(ctx, l, cx, H - 150 - 23 - (t.lines.length - 1 - k) * t.px * 1.4, `600 ${t.px}px ${UI}`, '#ffffff', 'center', tdir))
  } else {
    star(ctx, cx, cy, size * 0.16, tone)
    const t = fitTitle(ctx, deck.title, (px) => `700 ${px}px ${NASKH}`, H <= 1080 ? 56 : 66, 30, W - 180, 3)
    const lh = t.px * 1.5
    const ty = Math.min(H - 150 - t.lines.length * lh, top + size + 40)
    t.lines.forEach((l, k) => text(ctx, l, cx, ty + lh * (k + 0.5), `700 ${t.px}px ${NASKH}`, '#ffffff', 'center', tdir))
    if (deck.kicker) text(ctx, deck.kicker, cx, ty - 40, `600 32px ${UI}`, '#ffffff', 'center', dirOfText(deck.kicker), 0.85)
  }
  text(ctx, cornerOf(lang, o.corner, 1, n), cx, 90, `600 30px ${UI}`, '#ffffff', 'center', deck.dir, 0.85)
}

/** An eight-pointed star outlined, of radius `r`. */
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, r * 0.08)
  for (const rot of [0, Math.PI / 4]) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4)
    ctx.restore()
  }
  ctx.restore()
}

function drawClosing(ctx: CanvasRenderingContext2D, o: DrawOpts, d: Spec, pics: Pics, i: number) {
  const { W, H } = d
  const deck = o.deck
  const n = o.pages.length
  const sq = H <= 1080
  const icon = d.style === 'paper' ? (sq ? 170 : 200) : sq ? 180 : 220
  const ink = d.style === 'manuscript' ? '#f3e7c8' : d.style === 'paper' ? '#1e3a6b' : '#3a2a14'
  const hint = d.style === 'manuscript' ? '#cdb98a' : d.style === 'paper' ? '#6e5a3a' : '#6a5434'
  const qrDark = d.style === 'manuscript' ? '#13284f' : d.style === 'paper' ? '#1e3a6b' : '#0f5c4d'
  const qrLight = d.style === 'manuscript' ? '#f3e7c8' : d.style === 'paper' ? '#f3ece0' : SAND
  const module = sq ? 7 : 9
  const qr = qrCount(o.storeUrl) * module
  const pad = 2 * module
  const lineFont = `600 ${d.style === 'paper' ? 52 : 54}px ${UI}`
  const block = icon + 34 + 70 + 8 + 40 + 40 + qr + 2 * pad + (d.style === 'paper' ? 50 + 42 : 0)
  let y = (H - block) / 2
  const cx = W / 2
  ctx.save()
  if (d.style === 'manuscript') {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    ctx.fillStyle = '#163a7c'
    roundRect(ctx, cx - icon / 2, y, icon, icon, icon * 0.227)
    ctx.fill()
  }
  ctx.restore()
  ctx.save()
  roundRect(ctx, cx - icon / 2, y, icon, icon, icon * 0.227)
  ctx.clip()
  if (pics.icon) ctx.drawImage(pics.icon, cx - icon / 2, y, icon, icon)
  ctx.restore()
  y += icon + 34
  text(ctx, o.storeLine, cx, y + 35, lineFont, ink, 'center', deck.dir)
  y += 70 + 8
  text(ctx, o.scanHint, cx, y + 20, `400 28px ${UI}`, hint, 'center', deck.dir)
  y += 40 + 40
  // The code on its light tile, its quiet zone the tile.
  ctx.fillStyle = qrLight
  roundRect(ctx, cx - qr / 2 - pad, y, qr + 2 * pad, qr + 2 * pad, 18)
  ctx.fill()
  drawStoreQr(ctx, o.storeUrl, { x: Math.round(cx - qr / 2), y: Math.round(y + pad), module, dark: qrDark, light: null })
  y += qr + 2 * pad
  if (d.style === 'paper') text(ctx, `${digitsOf(deck.lang, i + 1)} / ${digitsOf(deck.lang, n)}`, cx, y + 50 + 21, `400 30px ${UI}`, '#8a6d2c', 'center', deck.dir)
  if (d.style === 'geometry') text(ctx, cornerOf(deck.lang, o.corner, i + 1, n), cx, 90, `600 30px ${UI}`, '#3a2a14', 'center', deck.dir)
  if (d.style === 'manuscript') chrome(ctx, o, d, i, '', true)
}

function drawPage(o: DrawOpts, p: Page, i: number, scale: number, pics: Pics) {
  const d = spec(o.style, o.shape)
  const { W, H } = d
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  const rtl = o.deck.dir === 'rtl'
  if (p.kind === 'cover') {
    ground(ctx, d, pics, o.deck.tone, rtl, false)
    drawCover2(ctx, o, d, pics)
    canvas.dataset.scale = '1.00'
    canvas.dataset.single = 'false'
    return canvas
  }
  if (p.kind === 'closing') {
    if (o.style === 'geometry') {
      ctx.fillStyle = SAND
      ctx.fillRect(0, 0, W, H)
      lattice(ctx, W, H, '#a8462f', 0.1)
    } else ground(ctx, d, pics, o.deck.tone, rtl, false)
    drawClosing(ctx, o, d, pics, i)
    canvas.dataset.scale = '1.00'
    canvas.dataset.single = 'false'
    return canvas
  }
  const tone = toneOf(o.deck, p.section.tone)
  ground(ctx, d, pics, tone, rtl, true)
  chrome(ctx, o, d, i, p.section.heading)
  // The pieces at the base sizes, or smaller when one long text has the card to itself: never cut.
  const head = headHeight(d)
  const room = d.box.bottom - d.box.top - head
  let s = 1
  let rows: Row[][] = []
  let total = 0
  for (; s >= 0.4; s -= 0.02) {
    rows = p.pieces.map((x) => rowsOf(ctx, o.deck, x, d, s, p.section.heading, tone))
    total = rows.reduce((h, r) => h + rowsHeight(r), 0) + d.gap * s * (rows.length - 1)
    if (total <= room) break
  }
  // For the checks: the scale it was drawn at, and whether one text has the card alone (only then may it be < 1).
  canvas.dataset.scale = s.toFixed(2)
  const one = p.pieces[0]
  canvas.dataset.single = String(p.pieces.length === 1 && (one.block.kind === 'ayah' || sentences(one.text).flatMap(clauses).length === 1))
  let y = d.box.top + Math.max(0, (room + head - total - head) / 2)
  if (d.headInFlow) {
    text(ctx, p.section.heading, W / 2, y + d.label * 0.7, `600 ${d.label}px ${UI}`, '#e2c271', 'center', o.deck.dir)
    y += head
  }
  rows.forEach((r, k) => {
    y = drawRows(ctx, r, y, d, s)
    if (k < rows.length - 1) {
      between(ctx, d, y, s, o.deck.dir)
      y += d.gap * s
    }
  })
  return canvas
}

export const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'))
