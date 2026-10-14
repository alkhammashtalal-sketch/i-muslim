// The welcome page (0048-add2, add3; Talal 14 October 09:59–10:25): the approved board «٢ الجديدة», its painting
// welcome-B4 (lossless, its own pixels) under the whole screen, the first run only. On it, by the board's own places
// (percent of the painting): «مسلم» on the disc, the tagline, the language pill between the moon and the sun, «ابدأ»
// (ب) between Talal's two marks, and the marks. The painting fills the screen within 2% of its shape (every recent
// iPhone); a shorter screen shows it whole at full height with the sky's colour beside it, never cut, never stretched more.
// 0049: «مسلم» by its ink, not its line box, on the disc's centre (as on the app's icon); «ابدأ» a word alone; and on every
// launch after the first (the app's, not a browser tab's) the page shows for a second and a half without its buttons,
// then fades to the home, a touch cutting it short.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { launchReady } from '../../native/launch'
import { isNative } from '../../native/platform'
import { shortNativeName } from '../lang/served'
import { WELCOME } from './strings'
import './welcome.css'

/** The painting's own shape (1320 × 2857). */
export const ART_RATIO = 1320 / 2857
/** Its box on a screen of vw × vh: the whole screen within 2% of the shape, else whole at the screen's height (or width). */
export function artBox(vw: number, vh: number) {
  const r = vw / vh
  if (Math.abs(r / ART_RATIO - 1) <= 0.02) return { left: 0, top: 0, width: vw, height: vh }
  if (r > ART_RATIO) {
    const width = vh * ART_RATIO
    return { left: (vw - width) / 2, top: 0, width, height: vh }
  }
  const height = vw / ART_RATIO
  return { left: 0, top: (vh - height) / 2, width: vw, height }
}

const IcGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9M12 3C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9" />
  </svg>
)

/** The disc's centre in the painting, measured from its pixels (chords of the cream disc, 0049 أ). */
const DISC = { x: 0.4992, y: 0.3592 }
/** The brief welcome of a later launch (0049 ب): its time, then a fade (none with reduced motion). */
const BRIEF_MS = 1500
const FADE_MS = 180

/** Where the ink of «مسلم» falls relative to the start of its line and its baseline (canvas metrics, the element's font). */
function inkOf(el: HTMLElement) {
  const cs = getComputedStyle(el)
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  const m = ctx.measureText(el.textContent?.trim() ?? '')
  if (!(m.actualBoundingBoxAscent > 0)) return null
  return { cx: (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, cy: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2 }
}

export function Welcome({ mode = 'first', onStart, onLanguage, onDone }: { mode?: 'first' | 'brief'; onStart: () => void; onLanguage: () => void; onDone?: () => void }) {
  const brief = mode === 'brief'
  const { t, lang, content } = useI18n()
  const w = WELCOME[lang]
  const start = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState(() => artBox(window.innerWidth, window.innerHeight))
  // The fits below are measured again once the fonts have come (a name measured in the fallback font was cut after).
  const [fonts, setFonts] = useState(0)
  useEffect(() => {
    let alive = true
    void document.fonts?.ready.then(() => alive && setFonts((n) => n + 1))
    const again = () => alive && setFonts((n) => n + 1)
    document.fonts?.addEventListener?.('loadingdone', again)
    return () => {
      alive = false
      document.fonts?.removeEventListener?.('loadingdone', again)
    }
  }, [])
  useLayoutEffect(() => {
    const fit = () => setBox(artBox(window.innerWidth, window.innerHeight))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  useEffect(() => start.current?.focus({ preventScroll: true }), [])
  // «مسلم» by its ink (0049 أ): the centre of the word's drawn letters, the meem's tail with them, on the disc's centre.
  const name = useRef<HTMLHeadingElement>(null)
  const base = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState({ x: 0, y: 0 })
  useLayoutEffect(() => {
    const el = name.current
    const b = base.current
    if (!el || !b) return
    // Measured from the line box's centre; React's own transform put back as it was (it would not set it again).
    const before = el.style.transform
    el.style.transform = 'translate(-50%, -50%)'
    const ink = inkOf(el)
    const r = el.getBoundingClientRect()
    const baseline = b.getBoundingClientRect().top
    el.style.transform = before
    if (!ink) return
    const art = el.parentElement!.getBoundingClientRect()
    setShift({ x: art.left + DISC.x * art.width - (r.left + ink.cx), y: art.top + DISC.y * art.height - (baseline + ink.cy) })
  }, [box.width, box.height, fonts])
  // The launch screen (the same painting) goes once this page is drawn with its painting and fonts, or after 0.8 s; the
  // brief welcome's second and a half counts from then.
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    let alive = true
    const art = new Image()
    art.src = '/art/welcome-B4.webp'
    const ready = Promise.all([art.decode().catch(() => undefined), document.fonts?.ready])
    void Promise.race([ready, new Promise((r) => setTimeout(r, 800))]).then(() =>
      requestAnimationFrame(() => {
        launchReady()
        if (alive) setDrawn(true)
      }),
    )
    return () => {
      alive = false
    }
  }, [])
  // A later launch (0049 ب): a second and a half, then a short fade to the home; a touch cuts it short.
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone?.()
  }
  const going = useRef(false)
  const leave = () => {
    if (!brief || going.current) return
    going.current = true
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish()
    else {
      setLeaving(true)
      setTimeout(finish, FADE_MS + 40) // in case transitionend does not come
    }
  }
  const leaveNow = useRef(leave)
  useEffect(() => {
    leaveNow.current = leave
  })
  useEffect(() => {
    if (!brief || !drawn) return
    const t = setTimeout(() => leaveNow.current(), BRIEF_MS)
    return () => clearTimeout(t)
  }, [brief, drawn])
  // The language's name whole inside the pill's 104/440 (add3): a long one («Indonesia») set smaller to fit, never cut.
  const pill = useRef<HTMLSpanElement>(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    const el = pill.current
    if (!el) return
    // The globe does not scale with it: smaller by steps until the name is whole (scrollWidth within the pill).
    const before = el.style.getPropertyValue('--fit')
    let f = 1
    el.style.setProperty('--fit', '1')
    const room = (box.width * 104) / 440
    if (el.scrollWidth > room) f = Math.max(0.6, (room - 2) / el.scrollWidth)
    el.style.setProperty('--fit', String(f))
    while (f > 0.6 && el.scrollWidth > el.clientWidth) {
      f = Math.max(0.6, f - 0.02)
      el.style.setProperty('--fit', String(f))
    }
    el.style.setProperty('--fit', before)
    setFit(f)
  }, [box.width, content, fonts])
  // «ابدأ» likewise within the room between the marks (140 of 440): a long word («Commencer») set smaller, never over a mark.
  const [fitStart, setFitStart] = useState(1)
  useLayoutEffect(() => {
    const el = start.current
    if (!el) return
    // Measured at full size, then React's value put back (it would not set the same value again).
    const before = el.style.getPropertyValue('--fit')
    el.style.setProperty('--fit', '1')
    const room = (box.width * 140) / 440
    const need = el.scrollWidth
    el.style.setProperty('--fit', before)
    setFitStart(need > room ? Math.max(0.6, (room - 2) / need) : 1)
  }, [box.width, lang, fonts])
  // Light status-bar text over the sky on this page only (add2 §4), with the official plugin; dark again after.
  useEffect(() => {
    if (!isNative()) return
    let done = false
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      if (!done) void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined)
    })
    return () => {
      done = true
      void import('@capacitor/status-bar').then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Light }).catch(() => undefined))
    }
  }, [])
  // Sizes are the board's at 440 wide, in proportion to the painting's width.
  const u = box.width / 440
  return (
    <div
      className={`wl${brief ? ' wl-brief' : ''}${leaving ? ' wl-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={w.label}
      data-testid="welcome"
      data-mode={mode}
      onPointerDown={brief ? leave : undefined}
      onTransitionEnd={(e) => e.target === e.currentTarget && leaving && finish()}
    >
      <div className="wl-art" dir="ltr" style={{ left: box.left, top: box.top, width: box.width, height: box.height, ['--u' as string]: `${u}px` }}>
        {!brief && (
        <button
          type="button"
          className="wl-lang"
          onClick={onLanguage}
          aria-label={`${t.language}: ${shortNativeName(content)}`}
          data-testid="welcome-lang"
        >
          <span className="wl-lang-pill" ref={pill} style={{ ['--fit' as string]: String(fit) }}>
            <IcGlobe />
            <bdi lang={content}>{shortNativeName(content)}</bdi>
          </span>
        </button>
        )}
        <h1 className="wl-name" lang="ar" ref={name} style={{ transform: `translate(calc(-50% + ${shift.x}px), calc(-50% + ${shift.y}px))` }}>
          مسلم
          <span className="wl-base" ref={base} aria-hidden="true" />
        </h1>
        <p className="wl-tagline" lang={lang}>
          {t.tagline}
        </p>
        <span className="wl-mark wl-mark-i" role="img" aria-label={t.logoI} />
        {!brief && (
          <button type="button" ref={start} className="wl-start" onClick={onStart} data-testid="welcome-start" style={{ ['--fit' as string]: String(fitStart) }}>
            <span>{w.start}</span>
          </button>
        )}
        <span className="wl-mark wl-mark-palm" role="img" aria-label={t.logoPalm} />
      </div>
    </div>
  )
}
