// The QR code of the app's store page on the closing card (add-on 0072-add30 §1, with add-on 0072-add26 §3). The code
// itself is drawn by the share images' module (web/src/v2/reading/store-qr.ts, branch share-review-111, lean-qr);
// until that module is in this branch, the closing card keeps its place: a light tile of the code's size with a fine
// rule, so the layout and the shots are the final ones. When it lands, this file's body becomes:
//   import { drawQr } from '../reading/store-qr'
//   export const drawStoreQr = (ctx, url, s) => drawQr(ctx, url, { ...s, quiet: 4 })
export type QrSlot = { x: number; y: number; module: number; dark: string; light: string | null }

/** Whether the real code is drawn (false: the placeholder). */
export const QR_READY = false

/** The code's square at (x, y), 29 modules (version 3, the App Store link at correction M), its quiet zone around it. */
export function drawStoreQr(ctx: CanvasRenderingContext2D, _url: string, s: QrSlot) {
  const size = 29 * s.module
  const pad = 4 * s.module
  ctx.save()
  ctx.fillStyle = s.light ?? 'rgba(255,255,255,0)'
  const r = s.module * 2
  const x = s.x - pad
  const y = s.y - pad
  const w = size + 2 * pad
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + w, r)
  ctx.arcTo(x + w, y + w, x, y + w, r)
  ctx.arcTo(x, y + w, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  if (s.light) ctx.fill()
  ctx.setLineDash([s.module * 1.5, s.module * 1.5])
  ctx.strokeStyle = s.dark
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 2
  ctx.strokeRect(s.x, s.y, size, size)
  ctx.restore()
  return { x: s.x, y: s.y, size }
}
