// «حجم الخط: حسب إعداد الجوال» (reply 0047 §3). On the iPhone the WebView's system font style -apple-system-body
// follows the phone's Text Size (Dynamic Type), 17 px at the default. The middle step («حسب إعداد الجوال») sets the
// root size to that ratio, kept between 100% and 135%, the sizes the clipping test passes at (v2-fit-sweep). «صغير» and
// «كبير» stay fixed steps. Where the style is unknown (not WebKit) the ratio is 1, and the browser's own root size holds.
// Read again when the app comes back to the front, since the setting is changed outside it.

/** -apple-system-body at the phone's default Text Size («Large»). */
export const BODY_DEFAULT_PX = 17
export const PHONE_SCALE_MIN = 1
export const PHONE_SCALE_MAX = 1.35

/** The root size ratio for a body size in px: the phone's ratio to its default, within 100%–135%. */
export function phoneScale(px: number | null): number {
  if (px === null || !Number.isFinite(px) || px <= 0) return 1
  const r = Math.round((px / BODY_DEFAULT_PX) * 1000) / 1000
  return Math.min(PHONE_SCALE_MAX, Math.max(PHONE_SCALE_MIN, r))
}

/** The phone's body text size in px from a hidden probe in -apple-system-body, or null where that style is unknown. */
export function readBodyPx(doc: Document = document): number | null {
  if (typeof CSS === 'undefined' || !CSS.supports?.('font', '-apple-system-body') || !doc.body) return null
  const el = doc.createElement('span')
  el.dataset.textProbe = ''
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'font: -apple-system-body; position: absolute; visibility: hidden; pointer-events: none'
  el.textContent = 'م'
  doc.body.appendChild(el)
  const px = parseFloat(getComputedStyle(el).fontSize)
  el.remove()
  return Number.isFinite(px) ? px : null
}

/** Sets --phone-scale on the root (tokens.css: the middle step is 100% × it) and returns it. */
export function applyPhoneScale(doc: Document = document): number {
  const s = phoneScale(readBodyPx(doc))
  // Only on a change: the same value again would still restyle the page on each return to the front.
  if (doc.documentElement.style.getPropertyValue('--phone-scale') !== String(s)) doc.documentElement.style.setProperty('--phone-scale', String(s))
  return s
}

/** Follows the phone's Text Size: now, and each time the app is shown again. Returns the stop. */
export function followPhoneTextSize(): () => void {
  applyPhoneScale()
  const again = () => {
    if (document.visibilityState === 'visible') applyPhoneScale()
  }
  document.addEventListener('visibilitychange', again)
  window.addEventListener('pageshow', again)
  window.addEventListener('focus', again)
  return () => {
    document.removeEventListener('visibilitychange', again)
    window.removeEventListener('pageshow', again)
    window.removeEventListener('focus', again)
  }
}
