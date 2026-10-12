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
