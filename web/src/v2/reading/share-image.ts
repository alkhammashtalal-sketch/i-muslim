// An ayah as an image to share (reply 0032 C-7, board ShareAfter): drawn on a canvas, 1080×1920 (story) or
// 1080×1080 (square), day or night. The ayah's text is the one from D1, drawn as it is; the source line is always
// printed on the image. Flat fills and lines only (CLAUDE.md §8).

export type Shape = 'story' | 'square'
export type Look = 'day' | 'night'
export type ImageInput = { text: string; suraName: string; ayaLabel: string; refLine: string; sourceLine: string; appName: string; shape: Shape; look: Look }

const COLORS = {
  day: { top: '#f6efdd', bottom: '#efe4c8', ink: '#1b3466', gold: '#94712c', muted: '#7d6d55', line: 'rgba(148,113,44,0.75)', inner: 'rgba(148,113,44,0.35)' },
  night: { top: '#0f1f45', bottom: '#0a1330', ink: '#efe7d4', gold: '#d9b866', muted: '#a39a86', line: 'rgba(217,184,102,0.75)', inner: 'rgba(217,184,102,0.35)' },
}
const AYAH_FONT = '"Amiri Arabic", "Amiri", serif'
const UI_FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Lines that fit `width`, breaking between words only (the text itself is never altered). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && ctx.measureText(next).width > width) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export async function drawAyahImage(input: ImageInput): Promise<HTMLCanvasElement> {
  const W = 1080
  const H = input.shape === 'story' ? 1920 : 1080
  const c = COLORS[input.look]
  try {
    await Promise.all([document.fonts.load(`64px ${AYAH_FONT}`, input.text), document.fonts.load(`700 44px ${AYAH_FONT}`, input.suraName), document.fonts.load(`32px ${UI_FONT}`, input.sourceLine)])
  } catch {
    // fonts unavailable: the canvas falls back to the system's
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, c.top)
  g.addColorStop(1, c.bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // The double rule of the frame.
  ctx.strokeStyle = c.line
  ctx.lineWidth = 3
  roundRect(ctx, 40, 40, W - 80, H - 80, 36)
  ctx.stroke()
  ctx.strokeStyle = c.inner
  ctx.lineWidth = 2
  roundRect(ctx, 56, 56, W - 112, H - 112, 26)
  ctx.stroke()

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = W / 2
  const footer = H - 150
  const top = input.shape === 'story' ? 260 : 170
  // The sura's title.
  ctx.fillStyle = c.gold
  ctx.font = `700 46px ${AYAH_FONT}`
  ctx.fillText(input.suraName, cx, top - 70)

  // The ayah: the largest size whose lines fit between the title and the reference.
  const maxW = W - 220
  const avail = footer - 120 - top
  let size = input.shape === 'story' ? 96 : 80
  let lines: string[] = []
  for (; size >= 28; size -= 2) {
    ctx.font = `${size}px ${AYAH_FONT}`
    lines = wrap(ctx, input.text, maxW)
    if (lines.length * size * 1.9 <= avail) break
  }
  const lh = size * 1.9
  const blockTop = top + (avail - lines.length * lh) / 2
  ctx.fillStyle = c.ink
  ctx.font = `${size}px ${AYAH_FONT}`
  lines.forEach((l, i) => ctx.fillText(l, cx, blockTop + lh * (i + 0.5)))

  // The ayah's number in a small medallion, then the reference.
  const my = blockTop + lines.length * lh + 34
  ctx.beginPath()
  ctx.arc(cx, my, 30, 0, Math.PI * 2)
  ctx.strokeStyle = c.gold
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = c.gold
  ctx.font = `600 28px ${UI_FONT}`
  ctx.fillText(input.ayaLabel, cx, my + 2)
  ctx.font = `500 34px ${UI_FONT}`
  ctx.fillText(input.refLine, cx, my + 76)

  // The source line, always.
  ctx.fillStyle = c.muted
  ctx.font = `400 32px ${UI_FONT}`
  ctx.fillText(input.sourceLine, cx, footer)
  ctx.fillText(input.appName, cx, footer + 50)
  return canvas
}

export const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'))

// MARK: - «اسم الله لليوم» and «من أقوال السلف» as images (add-on 0072-add10 §3; the content rules of 0072-add9)
// On the same canvas, frame and colours as the ayah's. Only quoted words and their sources go on an image: the name, its
// Quranic evidence from D1 whole (never cut: it shrinks, and with no room the image carries its place alone), or with no
// ayah its HadeethEnc hadith with its grade and takhrij; the salaf saying as its card has it, with «قال» or «يُروى عن»,
// the book, its author and page. Then the Hijri date by Umm al-Qura, the source line, and «مسلم» small. «القراءة»
// (the app's own explanation) never goes on an image. The name of the day is the same for everyone by the Riyadh date,
// so the images of one day match.

/** The welcome painting's shamsa as the widgets carry it (web/ios/App/MuslimWidgets medallion.png, the same file):
 *  660 px square, its light disc of radius about 150 at the centre. */
export const SHAMSA_SRC = '/art/medallion.png'
const SHAMSA_DISC = 150 / 660

export type NameEvidence = { kind: 'ayah'; text: string; ayaLabel: string; refLine: string } | { kind: 'hadith'; text: string; grade: string; attribution: string }
export type NameImageInput = {
  name: string
  /** «اسم الله لليوم» */
  title: string
  evidence: NameEvidence
  hijri: string
  sourceLine: string
  appName: string
  shape: Shape
  look: Look
}
export type SalafImageInput = {
  /** «من أقوال السلف» */
  title: string
  parts: { text: string; gloss: boolean }[]
  attribution: string
  sourceLine: string
  hijri: string
  appName: string
  shape: Shape
  look: Look
}

const SKY = { top: '#1f4a96', mid: '#163a7c', bottom: '#0f2a5e' }

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function ground(ctx: CanvasRenderingContext2D, W: number, H: number, look: Look) {
  const c = COLORS[look]
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, c.top)
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

/** The shamsa on its lapis, as in the widgets: the picture whole in a square of the painting's sky, a gold rule round it. */
function shamsa(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, top: number, size: number, look: Look) {
  const x = cx - size / 2
  ctx.save()
  roundRect(ctx, x, top, size, size, 28)
  ctx.clip()
  const g = ctx.createRadialGradient(cx, top + size * 0.45, 0, cx, top + size * 0.45, size * 0.75)
  g.addColorStop(0, SKY.top)
  g.addColorStop(0.6, SKY.mid)
  g.addColorStop(1, SKY.bottom)
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
  ctx.strokeStyle = look === 'day' ? 'rgba(148,113,44,0.75)' : 'rgba(217,184,102,0.75)'
  ctx.lineWidth = 3
  roundRect(ctx, x, top, size, size, 28)
  ctx.stroke()
}

/** The largest size from `from` down to `min` whose wrapped lines fit `maxW` × `maxH`; null when none does. */
export function fitLines(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, from: number, min: number, maxW: number, maxH: number, lh: number) {
  for (let size = from; size >= min; size -= 2) {
    ctx.font = font(size)
    const lines = wrap(ctx, text, maxW)
    if (lines.length * size * lh <= maxH) return { size, lines }
  }
  return null
}

/** The name inside the shamsa's light disc: one line, or two for a pair («القابض الباسط»), in ink. */
function nameInDisc(ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, r: number) {
  const words = name.split(/\s+/).filter(Boolean)
  const half = Math.ceil(words.length / 2)
  const lines = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [name]
  const maxW = r * (lines.length > 1 ? 1.5 : 1.62)
  let size = Math.round(r * (lines.length > 1 ? 0.62 : 0.78))
  for (; size > 20; size -= 2) {
    ctx.font = `700 ${size}px ${AYAH_FONT}`
    if (lines.every((l) => ctx.measureText(l).width <= maxW)) break
  }
  ctx.fillStyle = '#1b3466'
  ctx.font = `700 ${size}px ${AYAH_FONT}`
  const lh = size * 1.25
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * lh + size * 0.08))
}

export async function drawNameImage(input: NameImageInput): Promise<HTMLCanvasElement> {
  const W = 1080
  const story = input.shape === 'story'
  const H = story ? 1920 : 1080
  const c = COLORS[input.look]
  try {
    await Promise.all([
      document.fonts.load(`64px ${AYAH_FONT}`, input.evidence.text),
      document.fonts.load(`700 64px ${AYAH_FONT}`, input.name),
      document.fonts.load(`32px ${UI_FONT}`, input.sourceLine),
      document.fonts.load(`600 32px ${UI_FONT}`, input.title),
    ])
  } catch {
    // fonts unavailable: the canvas falls back to the system's
  }
  const img = await loadImage(SHAMSA_SRC)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ground(ctx, W, H, input.look)
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = W / 2

  // «اسم الله لليوم», then the shamsa with the name in it.
  const titleY = story ? 150 : 104
  ctx.fillStyle = c.gold
  ctx.font = `600 ${story ? 46 : 36}px ${UI_FONT}`
  ctx.fillText(input.title, cx, titleY)
  const size = story ? 620 : 380
  const top = titleY + (story ? 50 : 32)
  shamsa(ctx, img, cx, top, size, input.look)
  nameInDisc(ctx, input.name, cx, top + size / 2, size * SHAMSA_DISC)

  // The footer: the source line and «مسلم»; the Hijri date above them.
  const footer = H - (story ? 140 : 110)
  ctx.fillStyle = c.muted
  ctx.font = `400 ${story ? 32 : 26}px ${UI_FONT}`
  ctx.fillText(input.sourceLine, cx, footer)
  ctx.font = `400 ${story ? 28 : 22}px ${UI_FONT}`
  ctx.fillText(input.appName, cx, footer + (story ? 48 : 36))
  const hijriY = footer - (story ? 66 : 46)
  ctx.fillStyle = c.ink
  ctx.font = `500 ${story ? 34 : 26}px ${UI_FONT}`
  ctx.fillText(input.hijri, cx, hijriY)

  // The evidence between the shamsa and the date: whole, or its place alone.
  const e = input.evidence
  const refH = e.kind === 'ayah' ? (story ? 120 : 96) : story ? 60 : 50
  const areaTop = top + size + (story ? 60 : 22)
  const areaH = hijriY - (story ? 60 : 36) - refH - areaTop
  const maxW = W - 220
  const fit = fitLines(ctx, e.text, (s) => `${s}px ${AYAH_FONT}`, story ? 72 : 52, story ? 40 : 28, maxW, areaH, 1.85)
  let y: number
  if (fit) {
    const lh = fit.size * 1.85
    y = areaTop + (areaH - fit.lines.length * lh) / 2
    ctx.fillStyle = c.ink
    ctx.font = `${fit.size}px ${AYAH_FONT}`
    fit.lines.forEach((l, i) => ctx.fillText(l, cx, y + lh * (i + 0.5)))
    y += fit.lines.length * lh + 8
  } else y = areaTop + areaH / 2
  if (e.kind === 'ayah') {
    ctx.beginPath()
    ctx.arc(cx, y + 28, 26, 0, Math.PI * 2)
    ctx.strokeStyle = c.gold
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = c.gold
    ctx.font = `600 24px ${UI_FONT}`
    ctx.fillText(e.ayaLabel, cx, y + 30)
    ctx.font = `500 ${story ? 34 : 28}px ${UI_FONT}`
    ctx.fillText(e.refLine, cx, y + (story ? 92 : 80))
  } else {
    ctx.fillStyle = c.gold
    ctx.font = `600 ${story ? 32 : 26}px ${UI_FONT}`
    ctx.fillText([e.grade, e.attribution].filter(Boolean).join(' · '), cx, y + 28)
  }
  return canvas
}

/** Words with their ink, wrapped between words only (the text itself is never altered). */
function wrapRuns(ctx: CanvasRenderingContext2D, parts: { text: string; gloss: boolean }[], width: number) {
  const words = parts.flatMap((p) =>
    p.text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ w, gloss: p.gloss })),
  )
  const space = ctx.measureText(' ').width
  const lines: { words: typeof words; width: number }[] = []
  let cur: typeof words = []
  let cw = 0
  for (const x of words) {
    const ww = ctx.measureText(x.w).width
    const next = cur.length ? cw + space + ww : ww
    if (cur.length && next > width) {
      lines.push({ words: cur, width: cw })
      cur = [x]
      cw = ww
    } else {
      cur.push(x)
      cw = next
    }
  }
  if (cur.length) lines.push({ words: cur, width: cw })
  return { lines, space }
}

export async function drawSalafImage(input: SalafImageInput): Promise<HTMLCanvasElement> {
  const W = 1080
  const story = input.shape === 'story'
  const H = story ? 1920 : 1080
  const c = COLORS[input.look]
  const text = input.parts.map((p) => p.text).join('')
  try {
    await Promise.all([document.fonts.load(`64px ${AYAH_FONT}`, text), document.fonts.load(`700 44px ${AYAH_FONT}`, input.title), document.fonts.load(`32px ${UI_FONT}`, input.sourceLine)])
  } catch {
    // fonts unavailable: the canvas falls back to the system's
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ground(ctx, W, H, input.look)
  ctx.direction = 'rtl'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  const cx = W / 2

  // The title, and an eight-pointed star between two rules under it (flat lines, CLAUDE.md §8).
  const titleY = story ? 230 : 130
  ctx.fillStyle = c.gold
  ctx.font = `700 ${story ? 58 : 48}px ${AYAH_FONT}`
  ctx.fillText(input.title, cx, titleY)
  const starY = titleY + (story ? 82 : 62)
  ctx.strokeStyle = c.gold
  ctx.lineWidth = 2.5
  for (const rot of [0, Math.PI / 4]) {
    ctx.save()
    ctx.translate(cx, starY)
    ctx.rotate(rot)
    ctx.strokeRect(-15, -15, 30, 30)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.moveTo(cx - 200, starY)
  ctx.lineTo(cx - 40, starY)
  ctx.moveTo(cx + 40, starY)
  ctx.lineTo(cx + 200, starY)
  ctx.stroke()

  const footer = H - (story ? 140 : 110)
  ctx.fillStyle = c.muted
  ctx.font = `400 ${story ? 28 : 22}px ${UI_FONT}`
  ctx.fillText(input.appName, cx, footer + (story ? 48 : 36))
  ctx.fillStyle = c.ink
  ctx.font = `500 ${story ? 32 : 26}px ${UI_FONT}`
  ctx.fillText(input.hijri, cx, footer)

  // The saying, as large as fits, then «قال فلان» and the book with its author and page.
  const maxW = W - 220
  ctx.font = `400 ${story ? 32 : 26}px ${UI_FONT}`
  const src = wrap(ctx, input.sourceLine, maxW)
  const srcLh = story ? 46 : 36
  const tail = (story ? 110 : 80) + src.length * srcLh
  const areaTop = starY + (story ? 90 : 46)
  const areaH = footer - (story ? 80 : 50) - tail - areaTop
  let size = story ? 78 : 60
  let laid = wrapRuns(ctx, input.parts, maxW)
  for (; size >= 30; size -= 2) {
    ctx.font = `${size}px ${AYAH_FONT}`
    laid = wrapRuns(ctx, input.parts, maxW)
    if (laid.lines.length * size * 1.85 <= areaH) break
  }
  const lh = size * 1.85
  let y = areaTop + Math.max(0, (areaH - laid.lines.length * lh) / 2)
  ctx.font = `${size}px ${AYAH_FONT}`
  ctx.textAlign = 'right'
  for (const line of laid.lines) {
    let x = cx + line.width / 2
    for (const w of line.words) {
      ctx.fillStyle = w.gloss ? c.muted : c.ink
      ctx.fillText(w.w, x, y + lh / 2)
      x -= ctx.measureText(w.w).width + laid.space
    }
    y += lh
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = c.gold
  ctx.font = `600 ${story ? 40 : 32}px ${UI_FONT}`
  ctx.fillText(input.attribution, cx, y + (story ? 50 : 36))
  ctx.fillStyle = c.muted
  ctx.font = `400 ${story ? 32 : 26}px ${UI_FONT}`
  src.forEach((l, i) => ctx.fillText(l, cx, y + (story ? 116 : 84) + i * srcLh))
  return canvas
}
