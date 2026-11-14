// The date card's sky with the time of day (add-on 0071-add16): four layers over the painting's sky (sky.css), the
// card's first children so the dates paint above them. Decoration only: aria-hidden, no name (§7).
//
// - The layers: the tone (multiply, the lapis mask), a second tone that deepens Maghrib into the night (multiply), the
//   light (screen, the lapis mask) and the gilding (overlay or screen, the gold mask). The masks are images derived
//   once from the painting (public/art/sky-*-mask.png, scripts/sky-masks.mjs); the painting itself is not touched.
// - No wrapper element: an element's opacity would isolate its children's blending from the painting under them.
// - A new state fades in over the old in 200 ms only when a bound passes while the page is shown, the card is on the
//   screen and motion is not reduced (Team B §2); otherwise it is simply there (the first paint, a return, a new
//   setting). The page's own sky (sky.css, :root[data-sky]) follows the same state while the home is open.
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { SkySnap } from '../daily/day-clock'
import './sky.css'

const LAYERS = ['tone', 'tone2', 'light', 'gild'] as const
const FADE_MS = 400 // the old layers stay under the new through the 200 ms fade, with a margin

function vars(s: SkySnap): CSSProperties {
  const l = s.light
  if (!l) return {}
  return { '--sky-dx': l.dx, '--sky-y': l.y, '--sky-warm': l.warm, '--sky-lapis': l.lapis, '--sky-k': l.k, '--sky-q': l.q } as CSSProperties
}

function Layers({ s, cls }: { s: SkySnap; cls: string }) {
  if (!s.state) return null
  const style = vars(s)
  return (
    <>
      {LAYERS.map((l) => (
        <span key={l} className={`sky-l sky-${l}${cls}`} data-sky={s.state!} data-stars={l === 'gild' ? s.stars : undefined} style={style} aria-hidden="true" />
      ))}
    </>
  )
}

/** Whether the card is on the screen (IntersectionObserver). */
function useOnScreen(card: RefObject<HTMLElement | null>) {
  const on = useRef(false)
  useEffect(() => {
    const el = card.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => (on.current = e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [card])
  return on
}
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function SkyLayers({ sky, card }: { sky: SkySnap; card: RefObject<HTMLElement | null> }) {
  const onScreen = useOnScreen(card)
  const [shown, setShown] = useState(sky)
  const [leaving, setLeaving] = useState<SkySnap | null>(null)
  // A new snapshot: fade only for a bound crossed in view (state from the render, as React advises).
  if (sky !== shown) {
    const fade = sky.animate && !!shown.state && !!sky.state && sky.state !== shown.state && document.visibilityState === 'visible' && onScreen.current && !reduced()
    setLeaving(fade ? shown : null)
    setShown(sky)
  }
  useEffect(() => {
    if (!leaving) return
    const id = setTimeout(() => setLeaving(null), FADE_MS)
    return () => clearTimeout(id)
  }, [leaving])
  // The page's sky follows the card's state while the home is open.
  useEffect(() => {
    const root = document.documentElement
    if (shown.state) root.dataset.sky = shown.state
    else delete root.dataset.sky
  }, [shown.state])
  useEffect(() => () => void delete document.documentElement.dataset.sky, [])
  return (
    <>
      {leaving && <Layers s={leaving} cls=" is-leaving" />}
      <Layers s={shown} cls={leaving ? ' is-entering' : ''} />
    </>
  )
}
