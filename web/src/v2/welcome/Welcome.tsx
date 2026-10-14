// The welcome page (0048-add2, add3; Talal 14 October 09:59–10:25): the approved board «٢ الجديدة», its painting
// welcome-B4 (lossless, its own pixels) under the whole screen, the first run only. On it, by the board's own places
// (percent of the painting): «مسلم» on the disc, the tagline, the language pill between the moon and the sun, «ابدأ»
// (ب) between Talal's two marks, and the marks. The painting fills the screen within 2% of its shape (every recent
// iPhone); a shorter screen shows it whole at full height with the sky's colour beside it, never cut, never stretched more.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
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

export function Welcome({ onStart, onLanguage }: { onStart: () => void; onLanguage: () => void }) {
  const { t, lang, content } = useI18n()
  const w = WELCOME[lang]
  const start = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState(() => artBox(window.innerWidth, window.innerHeight))
  useLayoutEffect(() => {
    const fit = () => setBox(artBox(window.innerWidth, window.innerHeight))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  useEffect(() => start.current?.focus({ preventScroll: true }), [])
  // The language's name whole inside the pill's 104/440 (add3): a long one («Indonesia») set smaller to fit, never cut.
  const pill = useRef<HTMLSpanElement>(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    const el = pill.current
    if (!el) return
    el.style.setProperty('--fit', '1')
    const room = (box.width * 104) / 440
    const need = el.scrollWidth
    const f = need > room ? Math.max(0.6, (room - 2) / need) : 1
    el.style.removeProperty('--fit')
    setFit(f)
  }, [box.width, content])
  // «ابدأ» likewise within the room between the marks (140 of 440): a long word («Commencer») set smaller, never over a mark.
  const [fitStart, setFitStart] = useState(1)
  useLayoutEffect(() => {
    const el = start.current
    if (!el) return
    el.style.setProperty('--fit', '1')
    const room = (box.width * 140) / 440
    const need = el.scrollWidth
    el.style.removeProperty('--fit')
    setFitStart(need > room ? Math.max(0.6, (room - 2) / need) : 1)
  }, [box.width, lang])
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
    <div className="wl" role="dialog" aria-modal="true" aria-label={w.label} data-testid="welcome">
      <div className="wl-art" dir="ltr" style={{ left: box.left, top: box.top, width: box.width, height: box.height, ['--u' as string]: `${u}px` }}>
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
        <h1 className="wl-name" lang="ar">
          مسلم
        </h1>
        <p className="wl-tagline" lang={lang}>
          {t.tagline}
        </p>
        <span className="wl-mark wl-mark-i" role="img" aria-label={t.logoI} />
        <button type="button" ref={start} className="wl-start" onClick={onStart} data-testid="welcome-start" style={{ ['--fit' as string]: String(fitStart) }}>
          <span>{w.start}</span>
        </button>
        <span className="wl-mark wl-mark-palm" role="img" aria-label={t.logoPalm} />
      </div>
    </div>
  )
}
