// A page turned by a swipe, in both directions (add-on 0072-add54), as «أذكار المواقف» turns its steps (Mawaqif.tsx):
// the finger moving right is the next page in Arabic and Urdu, as a book's pages turn, and the previous one in English
// and the other left-to-right languages. A swipe is at least 50 px across and plainly more across than down; one that
// starts in a field, a dialog or a box that scrolls sideways is that element's own (the cards' strip, a table).
// Plain JS, for the app's React screens (useSwipe.ts) and the lessons' pages (lessons/*/lesson.js) alike.

/** +1 the next page, -1 the previous one, 0 no swipe. */
export function swipeStep(dx, dy, rtl) {
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return (rtl ? dx > 0 : dx < 0) ? 1 : -1
}

/** The touch belongs to something else: a field, a dialog, or a box that scrolls sideways. */
export function ownSwipe(target, root) {
  for (let el = target; el && el !== root && el.nodeType === 1; el = el.parentElement) {
    if (el.matches('input, textarea, select, [role="dialog"], [data-noswipe]')) return true
    if (el.scrollWidth > el.clientWidth + 1) {
      const o = getComputedStyle(el).overflowX
      if (o === 'auto' || o === 'scroll') return true
    }
  }
  return false
}

/** Swipes on `el` turn its pages: `turn(+1)` the next, `turn(-1)` the previous; `rtl()` the reading direction now.
 *  Returns the function that stops listening. */
export function attachSwipe(el, turn, rtl) {
  let start = null
  const down = (e) => {
    const t = e.touches[0]
    start = e.touches.length === 1 && !ownSwipe(e.target, el) ? { x: t.clientX, y: t.clientY } : null
  }
  const up = (e) => {
    const s = start
    start = null
    if (!s) return
    const t = e.changedTouches[0]
    const k = swipeStep(t.clientX - s.x, t.clientY - s.y, rtl())
    if (k) turn(k)
  }
  el.addEventListener('touchstart', down, { passive: true })
  el.addEventListener('touchend', up, { passive: true })
  return () => {
    el.removeEventListener('touchstart', down)
    el.removeEventListener('touchend', up)
  }
}
