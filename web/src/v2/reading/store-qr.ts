// The QR code of the app's store page, on any canvas (add-on 0072-add26 §3): the share images' foot (share-image.ts
// drawStoreMark) and any other picture of the app that carries the link. lean-qr 2.7.4 makes the module grid (MIT, no
// dependencies; docs/COMPONENTS.csv); this file draws it as flat squares on whole pixels, always dark on light, as
// every phone's camera reads it, with its quiet zone (4 modules) either the picture's own light ground or a tile.
//
//   import { drawQr, qrModules } from './store-qr'
//   drawQr(ctx, storeMark(lang).url, { x: 92, y: 1683, module: 5, dark: '#94712c' })                       // on paper
//   drawQr(ctx, url, { x, y, module: 4, dark: '#0f1f45', light: '#cfb06a' })                               // on a tile
import { correction, generate } from 'lean-qr'

/** The dark modules of a link's code, row by row (no quiet zone); correction M at least. 29×29 (version 3) for the
 *  40 characters of the App Store link. */
export function qrModules(url: string): boolean[][] {
  const code = generate(url, { minCorrectionLevel: correction.M })
  return Array.from({ length: code.size }, (_, y) => Array.from({ length: code.size }, (_, x) => code.get(x, y)))
}

export type QrStyle = {
  /** The top left corner of the code itself (its quiet zone lies around it). */
  x: number
  y: number
  /** One module's side in pixels (a whole number keeps the edges sharp). */
  module: number
  /** The modules' colour: the darker one. */
  dark: string
  /** A light tile under the code and its quiet zone, rounded; none when the ground under it is already light. */
  light?: string | null
  /** The quiet zone in modules (4 by the standard). */
  quiet?: number
}

/** The code's side in pixels without its quiet zone. */
export const qrSide = (url: string, module: number) => qrModules(url).length * module

/** Draws a link's code; returns its square (without the quiet zone). */
export function drawQr(ctx: CanvasRenderingContext2D, url: string, s: QrStyle) {
  const rows = qrModules(url)
  const m = s.module
  const size = rows.length * m
  ctx.save()
  if (s.light) {
    const pad = m * (s.quiet ?? 4)
    const x = s.x - pad
    const y = s.y - pad
    const w = size + 2 * pad
    const r = m * 2
    ctx.fillStyle = s.light
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + w, r)
    ctx.arcTo(x + w, y + w, x, y + w, r)
    ctx.arcTo(x, y + w, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = s.dark
  rows.forEach((row, j) => row.forEach((on, i) => on && ctx.fillRect(s.x + i * m, s.y + j * m, m, m)))
  ctx.restore()
  return { x: s.x, y: s.y, size }
}
