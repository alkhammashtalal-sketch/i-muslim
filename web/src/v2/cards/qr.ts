// The QR code of the app's store page on the closing card (add-on 0072-add30 §1, with add-on 0072-add26 §3): drawn by
// the share images' own module (../reading/store-qr.ts, lean-qr), always dark on light as every phone's camera reads
// it, with its quiet zone of 4 modules (the light tile on lapis and night, the paper itself on ivory).
import { drawQr, qrModules } from '../reading/store-qr'

export type QrSlot = { x: number; y: number; module: number; dark: string; light: string | null }

/** The code's side in modules for a link (29 for the App Store link at correction M). */
export const qrCount = (url: string) => qrModules(url).length

export const drawStoreQr = (ctx: CanvasRenderingContext2D, url: string, s: QrSlot) => drawQr(ctx, url, { x: s.x, y: s.y, module: s.module, dark: s.dark, light: s.light, quiet: 4 })
