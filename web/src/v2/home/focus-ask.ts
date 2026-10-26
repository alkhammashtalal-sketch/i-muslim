// «اسأل»: the question box on the home page (AskCard.tsx, id="q"), brought into view and focused. From the «يومك»
// button (Shortcuts.tsx), and from the app icon's menu «اسأل» (add-on 0072-add30 §3, imuslim://ask), which first goes
// home and so waits for the box to be drawn.

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function focusAsk(): boolean {
  const q = document.getElementById('q') as HTMLTextAreaElement | null
  if (!q) return false
  q.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' })
  q.focus({ preventScroll: true })
  return true
}

/** The same, once the box is there: tried at each frame for up to `ms` (the home page drawn after a link). */
export function focusAskSoon(ms = 3000) {
  const until = Date.now() + ms
  const tick = () => {
    if (!focusAsk() && Date.now() < until) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
