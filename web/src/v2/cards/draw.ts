// «اصنع كروت» (add-on 0072-add30 §1): each card drawn on a canvas by code, in the share images' look
// (../reading/share-image.ts: the double gold rule of the frame, the welcome painting's shamsa, the eight-pointed star
// between two rules, Amiri for the quoted texts and IBM Plex Sans Arabic for ours), in three styles: lapis (the
// welcome painting's sky), night, and ivory (the paper of the day image). Every text is drawn as it was given: lines
// break between words only, and a text too long for its card is drawn smaller, never cut (./model.ts).
import { clauses, cornerOf, layoutDeck, sentences, SIZES, type Block, type Deck, type Measure, type Page, type Piece, type Shape, type Style } from './model'
import { drawStoreQr, qrCount } from './qr'

const NASKH = '"Amiri Arabic", "Amiri", serif'
const UI = '"IBM Plex Sans Arabic", system-ui, sans-serif'
/** The welcome painting's shamsa (the widgets' medallion.png, drawn whole), its light disc of radius 150 of 660. */
const SHAMSA_SRC = '/art/medallion.png'
const SHAMSA_DISC = 150 / 660
/** The app's icon «المورّقة» (relay/w1/0072-icon-v2/icon-default.png, 256 px), small on the closing card (add-ons
 *  0072-add31 §4 and 0072-add32). */
export const ICON_SRC = '/art/app-icon-256.png'

type Palette = { top: string; mid: string; bottom: string; ink: string; gold: string; muted: string; line: string; inner: string; qrDark: string; qrLight: string | null }
export const PALETTES: Record<Style, Palette> = {
  lapis: { top: '#1f4a96', mid: '#163a7c', bottom: '#0f2a5e', ink: '#f6eedd', gold: '#e3c57c', muted: '#c9d0e3', line: 'rgba(227,197,124,0.8)', inner: 'rgba(227,197,124,0.35)', qrDark: '#0f2a5e', qrLight: '#f6eedd' },
  night: { top: '#121a2c', mid: '#0c1220', bottom: '#070a13', ink: '#efe7d4', gold: '#d9b866', muted: '#aaa290', line: 'rgba(217,184,102,0.75)', inner: 'rgba(217,184,102,0.32)', qrDark: '#0c1220', qrLight: '#efe7d4' },
  ivory: { top: '#f8f2e3', mid: '#f4ecd8', bottom: '#efe4c8', ink: '#1b3466', gold: '#8a6a26', muted: '#6b5a45', line: 'rgba(148,113,44,0.75)', inner: 'rgba(148,113,44,0.35)', qrDark: '#1b3466', qrLight: null },
}

/** The base sizes of a shape (px at 1080 wide): the texts, their line heights, the card's head and foot. */
function metrics(shape: Shape) {
  const story = shape === 'story'
  const square = shape === 'square'
  return {
    side: 120,
    width: 1080 - 240,
    ayah: story ? 66 : square ? 52 : 60,
    quote: story ? 54 : square ? 44 : 50,
    explain: story ? 40 : square ? 33 : 38,
    meaning: story ? 34 : square ? 28 : 32,
    small: story ? 30 : square ? 26 : 28,
    by: story ? 34 : square ? 28 : 32,
    bodyTop: story ? 300 : square ? 230 : 270,
    bodyBottom: (h: number) => h - (story ? 170 : square ? 130 : 150),
    gap: story ? 56 : square ? 36 : 48,
  }
}
type Metrics = ReturnType<typeof metrics>

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
/** The font of a block's text, at scale `s`. */
const textFont = (b: Block, m: Metrics, s: number) =>
  b.kind === 'ayah' ? `${Math.round(m.ayah * s)}px ${NASKH}` : b.kind === 'quote' && isArabic(b.lang) ? `${Math.round(m.quote * s)}px ${NASKH}` : `400 ${Math.round(m.explain * s)}px ${UI}`
const lineH = (b: Block, m: Metrics, s: number) => (b.kind === 'ayah' ? m.ayah * 1.85 : b.kind === 'quote' && isArabic(b.lang) ? m.quote * 1.8 : m.explain * 1.65) * s

/** A piece's parts, each with its height at scale `s`: what ./model.ts measures and what is drawn are the same list. */
type Row = { kind: 'note' | 'label' | 'context' | 'lines' | 'marker' | 'ref' | 'meaning' | 'meaningBy' | 'by' | 'source' | 'explainNote'; lines: string[]; font: string; lh: number; dir: 'rtl' | 'ltr'; color: 'ink' | 'gold' | 'muted'; center: boolean }

function rowsOf(ctx: CanvasRenderingContext2D, deck: Deck, p: Piece, m: Metrics, s: number, heading: string): Row[] {
  const b = p.block
  const W = m.width
  const rows: Row[] = []
  const add = (kind: Row['kind'], text: string, font: string, lh: number, dir: 'rtl' | 'ltr', color: Row['color'], center = true) => {
    ctx.font = font
    const lines = wrapText(ctx, text, W)
    if (lines.length) rows.push({ kind, lines, font, lh, dir, color, center })
  }
  const small = `400 ${Math.round(m.small * s)}px ${UI}`
  const uiDir = deck.dir
  // «النص بالعربية» above an Arabic quoted text outside Arabic (add-on 0072-add23 §4.7), on every card it is on.
  if (deck.quoteNote && b.kind !== 'explain' && (b.kind === 'ayah' || isArabic(b.lang))) add('note', deck.quoteNote, small, m.small * 1.5 * s, uiDir, 'muted')
  // The app's explanation under its title on every card: the section's heading, or its own line when that is another.
  if (b.kind === 'explain' && b.title !== heading) add('label', b.title, `600 ${Math.round(m.by * s)}px ${UI}`, m.by * 1.5 * s, b.dir, 'gold')
  else if (b.kind !== 'explain' && b.label) add('label', b.label, small, m.small * 1.5 * s, uiDir, 'muted')
  if (b.kind === 'quote' && b.context && p.first) add('context', b.context, `${Math.round(m.quote * 0.72 * s)}px ${NASKH}`, m.quote * 0.72 * 1.7 * s, 'rtl', 'muted')
  const dir = b.kind === 'ayah' ? 'rtl' : b.dir
  // The app's explanation and a long text in a Latin script read from their side; a quoted Arabic text is centred.
  const center = b.kind === 'ayah' || (b.kind === 'quote' && isArabic(b.lang))
  add('lines', p.text.trim(), textFont(b, m, s), lineH(b, m, s), dir, 'ink', center)
  if (b.kind === 'ayah') {
    rows.push({ kind: 'marker', lines: [b.num], font: `600 ${Math.round(26 * s)}px ${UI}`, lh: 72 * s, dir: 'rtl', color: 'gold', center: true })
    add('ref', b.ref, `500 ${Math.round(m.by * s)}px ${UI}`, m.by * 1.5 * s, 'rtl', 'gold')
    add('source', b.source, small, m.small * 1.45 * s, 'rtl', 'muted')
    if (b.meaning) {
      add('meaning', b.meaning.text, `400 ${Math.round(m.meaning * s)}px ${UI}`, m.meaning * 1.6 * s, b.meaning.dir, 'ink', true)
      add('meaningBy', b.meaning.by, small, m.small * 1.45 * s, b.meaning.dir, 'muted')
    }
    return rows
  }
  if (b.kind === 'quote') {
    if (b.by) add('by', b.by, `600 ${Math.round(m.by * s)}px ${UI}`, m.by * 1.5 * s, isArabic(b.lang) ? 'rtl' : b.dir, 'gold')
    add('source', b.source, small, m.small * 1.45 * s, isArabic(b.lang) ? 'rtl' : uiDir, 'muted')
  } else if (b.note) add('explainNote', b.note, small, m.small * 1.45 * s, b.dir, 'muted')
  return rows
}

/** The space before a row: a little air between the text and what follows it. */
const before = (r: Row, s: number) => (r.kind === 'lines' ? 10 * s : r.kind === 'marker' ? 6 * s : r.kind === 'meaning' ? 30 * s : r.kind === 'by' || r.kind === 'source' || r.kind === 'ref' ? 8 * s : 0)
const rowsHeight = (rows: Row[], s: number) => rows.reduce((h, r) => h + before(r, s) + r.lines.length * r.lh, 0)

/** The canvas the measures are taken on. */
let scratch: CanvasRenderingContext2D | null = null
const measureCtx = () => (scratch ??= document.createElement('canvas').getContext('2d')!)

/** The room and the pieces' heights for a shape, for ./model.ts layoutDeck. */
export function measureFor(deck: Deck, shape: Shape): Measure {
  const m = metrics(shape)
  const ctx = measureCtx()
  const H = SIZES[shape].h
  return {
    room: m.bodyBottom(H) - m.bodyTop,
    gap: m.gap,
    piece: (block, text, first, section) => rowsHeight(rowsOf(ctx, deck, { block, text, part: 1, parts: 1, first, last: true }, m, 1, section.heading), 1),
  }
}

export const layoutFor = (deck: Deck, shape: Shape, sections = deck.sections): Page[] => layoutDeck(sections, measureFor(deck, shape))

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

function ground(ctx: CanvasRenderingContext2D, W: number, H: number, c: Palette) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, c.top)
  g.addColorStop(0.55, c.mid)
  g.addColorStop(1, c.bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = c.line
  ctx.lineWidth = 3
  roundRect(ctx, 40, 40, W - 80, H - 80, 36)
  ctx.stroke()
  ctx.strokeStyle = c.inner
  ctx.lineWidth = 2
  roundRect(ctx, 56, 56, W - 112, H - 112, 26)
  ctx.stroke()
}

/** The eight-pointed star between two rules, as under the salaf image's title. */
function starRule(ctx: CanvasRenderingContext2D, cx: number, y: number, c: Palette, half = 180, r = 13) {
  ctx.save()
  ctx.strokeStyle = c.gold
  ctx.lineWidth = 2.5
  for (const rot of [0, Math.PI / 4]) {
    ctx.save()
    ctx.translate(cx, y)
    ctx.rotate(rot)
    ctx.strokeRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.moveTo(cx - half, y)
  ctx.lineTo(cx - r * 2.6, y)
  ctx.moveTo(cx + r * 2.6, y)
  ctx.lineTo(cx + half, y)
  ctx.stroke()
  ctx.restore()
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

/** The shamsa on the painting's sky in a gold-ruled square, as on the name's image; a name in its disc, or the star. */
function shamsa(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, top: number, size: number, c: Palette, name?: string) {
  const x = cx - size / 2
  ctx.save()
  roundRect(ctx, x, top, size, size, 28)
  ctx.clip()
  const g = ctx.createRadialGradient(cx, top + size * 0.45, 0, cx, top + size * 0.45, size * 0.75)
  g.addColorStop(0, '#1f4a96')
  g.addColorStop(0.6, '#163a7c')
  g.addColorStop(1, '#0f2a5e')
  ctx.fillStyle = g
  ctx.fillRect(x, top, size, size)
  if (img) ctx.drawImage(img, x, top, size, size)
  else {
    ctx.fillStyle = '#f3ead6'
    ctx.beginPath()
    ctx.arc(cx, top + size / 2, size * SHAMSA_DISC, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = c.line
  ctx.lineWidth = 3
  roundRect(ctx, x, top, size, size, 28)
  ctx.stroke()
  const r = size * SHAMSA_DISC
  const cy = top + size / 2
  if (name) {
    const words = name.split(/\s+/).filter(Boolean)
    const half = Math.ceil(words.length / 2)
    const lines = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [name]
    const maxW = r * (lines.length > 1 ? 1.5 : 1.62)
    let fs = Math.round(r * (lines.length > 1 ? 0.62 : 0.78))
    for (; fs > 20; fs -= 2) {
      ctx.font = `700 ${fs}px ${NASKH}`
      if (lines.every((l) => ctx.measureText(l).width <= maxW)) break
    }
    ctx.fillStyle = '#1b3466'
    ctx.font = `700 ${fs}px ${NASKH}`
    ctx.textAlign = 'center'
    ctx.direction = 'rtl'
    const lh = fs * 1.25
    lines.forEach((l, i) => ctx.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * lh + fs * 0.08))
  } else starRule(ctx, cx, cy, { ...c, gold: '#94712c' }, 0, r * 0.32)
}

type DrawOpts = { deck: Deck; shape: Shape; style: Style; pages: Page[]; corner: string; appName: string; storeLine: string; storeUrl: string }

function corner(ctx: CanvasRenderingContext2D, o: DrawOpts, i: number, c: Palette) {
  const W = SIZES[o.shape].w
  ctx.save()
  ctx.fillStyle = c.muted
  ctx.font = `500 ${o.shape === 'square' ? 26 : 28}px ${UI}`
  ctx.textBaseline = 'middle'
  // The corner the reading ends toward on the line: top left in Arabic, top right in a left-to-right interface.
  const rtl = o.deck.dir === 'rtl'
  ctx.direction = o.deck.dir
  ctx.textAlign = rtl ? 'left' : 'right'
  ctx.fillText(cornerOf(o.deck.lang, o.corner, i + 1, o.pages.length), rtl ? 96 : W - 96, 104)
  ctx.restore()
}

function foot(ctx: CanvasRenderingContext2D, o: DrawOpts, c: Palette) {
  const { w: W, h: H } = SIZES[o.shape]
  ctx.save()
  ctx.fillStyle = c.muted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = o.deck.dir
  ctx.font = `400 ${o.shape === 'square' ? 24 : 28}px ${UI}`
  ctx.fillText(o.appName, W / 2, H - (o.shape === 'square' ? 92 : 104))
  ctx.restore()
}

function drawRows(ctx: CanvasRenderingContext2D, rows: Row[], y: number, m: Metrics, c: Palette, s: number) {
  const W = 1080
  for (const r of rows) {
    y += before(r, s)
    ctx.font = r.font
    ctx.direction = r.dir
    ctx.fillStyle = c[r.color]
    if (r.kind === 'marker') {
      const cy = y + r.lh / 2
      ctx.beginPath()
      ctx.arc(W / 2, cy, 28 * s, 0, Math.PI * 2)
      ctx.strokeStyle = c.gold
      ctx.lineWidth = 3 * s
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillText(r.lines[0], W / 2, cy + 2 * s)
      y += r.lh
      continue
    }
    ctx.textAlign = r.center ? 'center' : 'start'
    const x = r.center ? W / 2 : r.dir === 'rtl' ? W - m.side : m.side
    for (const l of r.lines) {
      ctx.fillText(l, x, y + r.lh / 2)
      y += r.lh
    }
  }
  return y
}

/** The faces the cards use, loaded for the deck's texts (before any measure: a measure without them is wrong). */
export async function loadFonts(deck: Deck) {
  // Every text of the set, so each subset its letters need (Arabic, Latin, the digits) is loaded before a measure.
  const sample = [deck.title, deck.kicker ?? '', deck.quoteNote ?? '', ...deck.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => [b.text, b.kind === 'ayah' ? `${b.ref} ${b.source} ${b.meaning?.text ?? ''} ${b.meaning?.by ?? ''}` : b.kind === 'quote' ? `${b.by ?? ''} ${b.source} ${b.label ?? ''}` : `${b.title} ${b.note ?? ''}`])])].join(' ')
  try {
    await Promise.all([
      document.fonts.load(`40px ${NASKH}`, sample),
      document.fonts.load(`700 60px ${NASKH}`, sample),
      document.fonts.load(`400 30px ${UI}`, sample),
      document.fonts.load(`500 30px ${UI}`, sample),
      document.fonts.load(`600 30px ${UI}`, sample),
    ])
  } catch {
    // fonts unavailable: the canvas falls back to the system's
  }
}

/** Every card of the set, drawn at `scale` of its size (1 for the files, smaller for the preview). */
export async function drawCards(o: DrawOpts, scale = 1): Promise<HTMLCanvasElement[]> {
  await loadFonts(o.deck)
  const [shamsaImg, iconImg] = await Promise.all([loadImage(SHAMSA_SRC), loadImage(ICON_SRC)])
  return o.pages.map((p, i) => drawPage(o, p, i, scale, shamsaImg, iconImg))
}

function drawPage(o: DrawOpts, p: Page, i: number, scale: number, shamsaImg: HTMLImageElement | null, iconImg: HTMLImageElement | null) {
  const { w: W, h: H } = SIZES[o.shape]
  const c = PALETTES[o.style]
  const m = metrics(o.shape)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ground(ctx, W, H, c)
  ctx.textBaseline = 'middle'
  const cx = W / 2
  const story = o.shape === 'story'
  const square = o.shape === 'square'

  if (p.kind === 'cover') {
    const size = story ? 560 : square ? 360 : 480
    const kickerH = o.deck.kicker ? 70 : 0
    // The title whole: smaller for a long one (an answer's question), four lines at most at its size.
    let tf = story ? 72 : square ? 56 : 66
    let titleLines: string[] = []
    for (; tf >= 30; tf -= 2) {
      ctx.font = `700 ${tf}px ${NASKH}`
      titleLines = wrapText(ctx, o.deck.title, W - 260)
      if (titleLines.length <= (square ? 3 : 4)) break
    }
    const titleLh = tf * 1.6
    const block = kickerH + size + 70 + titleLines.length * titleLh + 60
    let y = (H - block) / 2 + (square ? 10 : 0)
    ctx.textAlign = 'center'
    if (o.deck.kicker) {
      ctx.fillStyle = c.gold
      ctx.direction = o.deck.dir
      ctx.font = `600 ${story ? 40 : square ? 32 : 36}px ${UI}`
      ctx.fillText(o.deck.kicker, cx, y + 24)
      y += kickerH
    }
    shamsa(ctx, shamsaImg, cx, y, size, c, o.deck.shamsaName)
    y += size + 70
    ctx.fillStyle = c.ink
    ctx.direction = o.deck.dir
    ctx.font = `700 ${tf}px ${NASKH}`
    for (const l of titleLines) {
      ctx.fillText(l, cx, y + titleLh / 2)
      y += titleLh
    }
    starRule(ctx, cx, y + 30, c)
  } else if (p.kind === 'closing') {
    const icon = story ? 220 : square ? 170 : 200
    const module = story ? 9 : square ? 7 : 8
    const qr = qrCount(o.storeUrl) * module
    const lineH = 80
    const block = icon + 60 + lineH + 50 + qr + module * 8
    let y = (H - block) / 2
    // The icon whole, its corners rounded as the Home Screen rounds them, a fine gold rule round it.
    ctx.save()
    roundRect(ctx, cx - icon / 2, y, icon, icon, icon * 0.225)
    ctx.clip()
    if (iconImg) ctx.drawImage(iconImg, cx - icon / 2, y, icon, icon)
    else {
      ctx.fillStyle = '#163a7c'
      ctx.fillRect(cx - icon / 2, y, icon, icon)
    }
    ctx.restore()
    ctx.strokeStyle = c.line
    ctx.lineWidth = 2
    roundRect(ctx, cx - icon / 2, y, icon, icon, icon * 0.225)
    ctx.stroke()
    y += icon + 60
    ctx.fillStyle = c.gold
    ctx.textAlign = 'center'
    ctx.direction = o.deck.dir
    ctx.font = `600 ${story ? 46 : square ? 38 : 42}px ${UI}`
    ctx.fillText(o.storeLine, cx, y + lineH / 2)
    y += lineH + 50 + module * 4
    drawStoreQr(ctx, o.storeUrl, { x: cx - qr / 2, y, module, dark: c.qrDark, light: c.qrLight })
  } else {
    // The section's heading on every card of it, under it the star between two rules.
    ctx.textAlign = 'center'
    ctx.direction = o.deck.dir
    ctx.fillStyle = c.gold
    ctx.font = `600 ${story ? 42 : square ? 34 : 40}px ${UI}`
    const headY = story ? 190 : square ? 140 : 170
    ctx.fillText(p.section.heading, cx, headY)
    starRule(ctx, cx, headY + (story ? 56 : 48), c, 150, 11)
    // The pieces at the base sizes, or smaller when one long text has the card to itself: never cut.
    const room = m.bodyBottom(H) - m.bodyTop
    let s = 1
    let rows: Row[][] = []
    let total = 0
    for (; s >= 0.4; s -= 0.02) {
      rows = p.pieces.map((x) => rowsOf(ctx, o.deck, x, m, s, p.section.heading))
      total = rows.reduce((h, r) => h + rowsHeight(r, s), 0) + m.gap * s * (rows.length - 1)
      if (total <= room) break
    }
    // For the checks: the scale it was drawn at, and whether one text has the card alone (only then may it be < 1).
    canvas.dataset.scale = s.toFixed(2)
    const one = p.pieces[0]
    canvas.dataset.single = String(p.pieces.length === 1 && (one.block.kind === 'ayah' || sentences(one.text).flatMap(clauses).length === 1))
    let y = m.bodyTop + Math.max(0, (room - total) / 2)
    rows.forEach((r, k) => {
      y = drawRows(ctx, r, y, m, c, s)
      if (k < rows.length - 1) {
        y += (m.gap * s) / 2
        starRule(ctx, cx, y, { ...c, gold: c.inner }, 60, 6)
        y += (m.gap * s) / 2
      }
    })
  }
  corner(ctx, o, i, c)
  if (p.kind !== 'closing') foot(ctx, o, c)
  return canvas
}

export const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'))
