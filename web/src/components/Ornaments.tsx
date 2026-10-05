import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import '../styles/illumination.css'

// Illumination identity v4 (CLAUDE.md §8, command 14): every screen a page of a hand-gilded Mushaf. The shapes and
// numbers are those of design/illumination/*.dc.html. Every ornament is defined once in <OrnamentDefs> and drawn with
// <use>; colours come from CSS variables (illumination.css), so dark mode follows. Flat fills only: the hand feel is
// three filters (hand: a slow waver on ruled lines, edge: a fine roughness, gilt: brushed-gold mottling inside gold
// only) and the paper grain, never applied to text. All ornaments are aria-hidden.

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const f = (n: number) => Number(n.toFixed(2))

/** Eight gold lobes around a circle (rose and ayah marker). */
const lobes = (r: number, lobeR: number, sw: number) =>
  range(8).map((i) => {
    const a = (i * Math.PI) / 4
    return <circle key={i} className="o-gold o-ink-s" cx={f(r * Math.sin(a))} cy={f(-r * Math.cos(a))} r={lobeR} strokeWidth={sw} />
  })
const dots = (r: number, dr: number, n: number, cls: string, phase = 0) =>
  range(n).map((i) => {
    const a = ((i + phase) * 2 * Math.PI) / n
    return <circle key={i} className={cls} cx={f(r * Math.sin(a))} cy={f(-r * Math.cos(a))} r={dr} />
  })

/** The shared definitions, mounted once at the root of the app. */
export function OrnamentDefs() {
  return (
    <svg className="orn-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="hand" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="edge" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={0.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="gilt" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={2} seed={5} result="m" />
          <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0 0.08  0 0 0 1.1 -0.45" result="mott" />
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves={1} seed={9} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 0.94  0 0 0 0 0.72  0 0 0 2.2 -1.45" result="glint" />
          <feMerge result="tex">
            <feMergeNode in="mott" />
            <feMergeNode in="glint" />
          </feMerge>
          <feComposite in="tex" in2="SourceAlpha" operator="in" result="t2" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="t2" />
          </feMerge>
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} />
          <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.32  0 0 0 0 0.18  0.16 0 0 0 -0.05" />
        </filter>
        {/* Dark paper: the grain at half strength. */}
        <filter id="grain-dark" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} />
          <feColorMatrix values="0 0 0 0 0.93  0 0 0 0 0.9  0 0 0 0 0.84  0.08 0 0 0 -0.025" />
        </filter>

        {/* Five-petal white flower with a coral heart. */}
        <g id="hf">
          {range(5).map((i) => (
            <ellipse key={i} className="o-white o-ink-s" cx="0" cy="-1.45" rx="0.95" ry="1.45" strokeWidth="0.25" transform={`rotate(${i * 72})`} />
          ))}
          <circle className="o-coral" r="0.75" />
          <circle className="o-gold" r="0.3" />
        </g>
        <path id="lf" d="M0 -2.6 C1.3 -1.2 1.3 0.8 0 1.6 C-1.3 0.8 -1.3 -1.2 0 -2.6 Z" />

        {/* Scrolling vine on azure: gold stem with spirals, white khatai flowers, gold and turquoise leaves. */}
        <pattern id="vineH" x="0" y="0" width="42" height="14" patternUnits="userSpaceOnUse">
          <rect className="o-azure" width="42" height="14" />
          <path className="o-gold-s" d="M0 7 C7 1 14 1 21 7 S35 13 42 7" strokeWidth="1.1" fill="none" />
          <path
            className="o-gold-s"
            d="M12.6 2.9 C15.2 4.2 15.1 7.5 12.7 7.9 C11.3 8.1 10.7 6.9 11.7 6.3 M29.4 11.1 C26.8 9.8 26.9 6.5 29.3 6.1 C30.7 5.9 31.3 7.1 30.3 7.7"
            strokeWidth="0.6"
            fill="none"
          />
          <use href="#lf" className="o-teal" transform="translate(4.2 4.2) rotate(-40) scale(0.9)" />
          <use href="#lf" className="o-teal" transform="translate(37.8 9.8) rotate(140) scale(0.9)" />
          <use href="#lf" className="o-gold o-ink-s" strokeWidth="0.25" transform="translate(18.2 3.6) rotate(55)" />
          <use href="#lf" className="o-gold o-ink-s" strokeWidth="0.25" transform="translate(23.8 10.4) rotate(235)" />
          <use href="#hf" transform="translate(6.5 10.3) scale(1.05)" />
          <use href="#hf" transform="translate(35.5 3.7) scale(1.05)" />
          <circle className="o-gold" cx="20" cy="11.6" r="0.55" />
          <circle className="o-gold" cx="22" cy="2.4" r="0.55" />
        </pattern>

        {/* Gilded rope (zanjirak): dark and light diagonals on gold. */}
        <pattern id="rope" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect className="o-gold" width="4" height="4" />
          <path className="o-rope-dark" d="M-1 1 L1 -1 M0 4 L4 0 M3 5 L5 3" strokeWidth="0.75" />
          <path className="o-rope-light" d="M-1 3 L3 -1 M1 5 L5 1" strokeWidth="0.55" />
        </pattern>

        {/* Lobed rose: eight gold lobes, azure heart, white six-petal flower. */}
        <g id="rose">
          <g filter="url(#gilt)">
            {lobes(9.2, 3.6, 0.45)}
            <circle className="o-gold" r="9.7" />
          </g>
          {dots(10.4, 0.9, 8, 'o-azure')}
          <circle className="o-azure o-ink-s" r="7.7" strokeWidth="0.45" />
          {range(6).map((i) => (
            <ellipse key={i} className="o-white o-ink-s" cx="0" cy="-3.3" rx="1.55" ry="2.6" strokeWidth="0.3" transform={`rotate(${i * 60})`} />
          ))}
          <circle className="o-coral o-ink-s" r="1.6" strokeWidth="0.25" />
          <circle className="o-gold" r="0.6" />
        </g>

        {/* Almond hizb mark: gold, azure heart, a flower. */}
        <g id="alm">
          <path
            className="o-gold o-ink-s"
            d="M0 -17 C6 -11 8.2 -5 8.2 0 C8.2 5 6 11 0 17 C-6 11 -8.2 5 -8.2 0 C-8.2 -5 -6 -11 0 -17 Z"
            strokeWidth="0.55"
            filter="url(#gilt)"
          />
          <path
            className="o-azure o-ink-s"
            d="M0 -17 C6 -11 8.2 -5 8.2 0 C8.2 5 6 11 0 17 C-6 11 -8.2 5 -8.2 0 C-8.2 -5 -6 -11 0 -17 Z"
            transform="scale(0.66 0.7)"
            strokeWidth="0.4"
          />
          <use href="#hf" transform="scale(1.7)" />
          <circle className="o-white" cy="-15" r="0.9" />
          <circle className="o-white" cy="15" r="0.9" />
        </g>

        {/* Ayah marker: eight gilded lobes around a paper heart. */}
        <g id="mkp">
          <g filter="url(#gilt)">
            {lobes(8.4, 3.3, 0.4)}
            <circle className="o-gold" r="8.6" />
          </g>
          {dots(9.7, 0.85, 8, 'o-azure')}
          <circle className="o-paper-heart o-ink-s" r="6.6" strokeWidth="0.45" />
          <circle className="o-azure-s" r="5.6" fill="none" strokeWidth="0.5" />
        </g>

        {/* Tig rays: a long and a short hairline every 4 px. */}
        <pattern id="tig" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <line className="o-tig" x1="2" y1="0.6" x2="2" y2="8" strokeWidth="0.7" strokeLinecap="round" />
          <line className="o-tig" x1="6" y1="4" x2="6" y2="8" strokeWidth="0.6" strokeLinecap="round" />
        </pattern>
      </defs>
    </svg>
  )
}

/** Watches an element's size (for frames drawn to fit their box). */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => {
      const w = Math.round(el.clientWidth)
      const h = Math.round(el.clientHeight)
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }))
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

let uid = 0
const useUid = () => {
  const r = useRef(0)
  if (!r.current) r.current = ++uid
  return r.current
}

type FrameSpec = {
  /** Outer ink rule (its centre) and width. */
  o: number
  ruleW: number
  /** Rope and vine band widths. */
  rope: number
  band: number
  goldW: number
  roseScale: number
  /** Almond hizb marks: on all four sides, or on the two long sides only (a cartouche sits on top). */
  alm: 'all' | 'sides'
  /** Quarter shamsas in the paper's inner corners. */
  quarters: boolean
  /** Tig rays in the margin. */
  tig: boolean
}

/** The jadwal (Mushaf frame) from outside in: ink, gilded rope, ink, vine band, ink, gold, ink; roses at the corners. */
function JadwalArt({ w, h, s, id }: { w: number; h: number; s: FrameSpec; id: number }) {
  const sc = s.band / 14
  const ropeC = s.o + 0.5 + s.rope / 2
  const rule1 = s.o + 0.5 + s.rope + 0.2
  const v0 = rule1 + 0.3
  const v1 = v0 + s.band
  const inner = v1 + 2.9
  const mid = (v0 + v1) / 2
  const box = (x: number) => ({ x, y: x, width: Math.max(0, w - 2 * x), height: Math.max(0, h - 2 * x) })
  const p = (k: string) => `o${id}${k}`
  return (
    <svg className="jadwal-art" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={p('vT')} href="#vineH" patternTransform={`translate(0 ${v0}) scale(${sc})`} />
        <pattern id={p('vB')} href="#vineH" patternTransform={`translate(0 ${h - v1}) scale(${sc})`} />
        <pattern id={p('vL')} href="#vineH" patternTransform={`translate(${v1} 0) rotate(90) scale(${sc})`} />
        <pattern id={p('vR')} href="#vineH" patternTransform={`translate(${w - v0} 0) rotate(90) scale(${sc})`} />
        {s.tig && (
          <>
            <pattern id={p('tT')} href="#tig" patternTransform="translate(0 2)" />
            <pattern id={p('tB')} href="#tig" patternTransform={`translate(0 ${h - 2}) scale(1 -1)`} />
            <pattern id={p('tL')} href="#tig" patternTransform="translate(2 0) rotate(-90) scale(-1 1)" />
            <pattern id={p('tR')} href="#tig" patternTransform={`translate(${w - 2} 0) rotate(90)`} />
          </>
        )}
        {s.quarters && (
          <clipPath id={p('clip')}>
            <rect {...box(inner)} />
          </clipPath>
        )}
      </defs>
      <g filter="url(#hand)">
        {s.tig && (
          <>
            <rect x="10" y="2" width={w - 20} height="8" fill={`url(#${p('tT')})`} />
            <rect x="10" y={h - 10} width={w - 20} height="8" fill={`url(#${p('tB')})`} />
            <rect x="2" y="10" width="8" height={h - 20} fill={`url(#${p('tL')})`} />
            <rect x={w - 10} y="10" width="8" height={h - 20} fill={`url(#${p('tR')})`} />
          </>
        )}
        <rect {...box(s.o)} className="o-rule" fill="none" strokeWidth={s.ruleW} />
        <rect {...box(ropeC)} fill="none" stroke="url(#rope)" strokeWidth={s.rope} filter="url(#gilt)" />
        <rect {...box(rule1)} className="o-rule" fill="none" strokeWidth="0.5" />
        <rect x={v0} y={v0} width={w - 2 * v0} height={s.band} fill={`url(#${p('vT')})`} />
        <rect x={v0} y={h - v1} width={w - 2 * v0} height={s.band} fill={`url(#${p('vB')})`} />
        <rect x={v0} y={v1} width={s.band} height={Math.max(0, h - 2 * v1)} fill={`url(#${p('vL')})`} />
        <rect x={w - v1} y={v1} width={s.band} height={Math.max(0, h - 2 * v1)} fill={`url(#${p('vR')})`} />
        <rect {...box(v1 + 0.3)} className="o-rule" fill="none" strokeWidth="0.5" />
        <rect {...box(v1 + 1.5)} className="o-gold-s" fill="none" strokeWidth={s.goldW} filter="url(#gilt)" />
        <rect {...box(v1 + 2.6)} className="o-rule" fill="none" strokeWidth="0.45" />
        {s.quarters && (
          <g clipPath={`url(#${p('clip')})`}>
            {[
              [inner, inner, 1, 1],
              [w - inner, inner, -1, 1],
              [inner, h - inner, 1, -1],
              [w - inner, h - inner, -1, -1],
            ].map(([x, y, dx, dy], i) => (
              <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
                <circle className="o-gold o-ink-s" r="14.5" strokeWidth="0.5" filter="url(#gilt)" />
                <circle className="o-azure o-ink-s" r="11" strokeWidth="0.4" />
                {dots(13.2, 0.7, 16, 'o-white', 0.5)}
                <use href="#hf" transform={`translate(${5.2 * dx} ${5.2 * dy}) scale(1.6)`} />
              </g>
            ))}
          </g>
        )}
        {[
          [mid, mid],
          [w - mid, mid],
          [mid, h - mid],
          [w - mid, h - mid],
        ].map(([x, y], i) => (
          <use key={`r${i}`} href="#rose" transform={`translate(${f(x)} ${f(y)}) scale(${s.roseScale})`} />
        ))}
        <use href="#alm" transform={`translate(${f(mid)} ${f(h / 2)}) scale(${s.roseScale})`} />
        <use href="#alm" transform={`translate(${f(w - mid)} ${f(h / 2)}) scale(${s.roseScale})`} />
        {s.alm === 'all' && (
          <>
            <use href="#alm" transform={`translate(${f(w / 2)} ${f(mid)}) rotate(90) scale(${s.roseScale})`} />
            <use href="#alm" transform={`translate(${f(w / 2)} ${f(h - mid)}) rotate(90) scale(${s.roseScale})`} />
          </>
        )}
      </g>
    </svg>
  )
}

const PAGE: FrameSpec = { o: 10.5, ruleW: 0.8, rope: 4, band: 14, goldW: 1.9, roseScale: 1, alm: 'all', quarters: true, tig: true }
const PAGE_SMALL: FrameSpec = { ...PAGE, rope: 3, band: 10, roseScale: 0.75 }
const AYAH: FrameSpec = { o: 0.4, ruleW: 0.7, rope: 3, band: 10, goldW: 1.4, roseScale: 0.55, alm: 'sides', quarters: false, tig: false }

/** The page itself: margin with tig rays, the jadwal, roses, hizb marks and quarter shamsas; the paper and its grain.
 *  Drawn behind the content of the centre column (the content sits on the paper, inside --folio-inset). */
export function PageFrame() {
  const [ref, size] = useSize<HTMLDivElement>()
  const id = useUid()
  const spec = size && size.w <= 340 ? PAGE_SMALL : PAGE
  const paper = spec === PAGE ? 30 : 25
  return (
    <div ref={ref} className="folio-art" aria-hidden="true">
      {size && size.w > 0 && (
        <>
          <svg className="folio-paper" width={size.w} height={size.h} aria-hidden="true" focusable="false">
            <rect x={paper} y={paper} width={Math.max(0, size.w - 2 * paper)} height={Math.max(0, size.h - 2 * paper)} className="o-paper" />
            <rect width={size.w} height={size.h} className="o-grain" />
          </svg>
          <JadwalArt w={size.w} h={size.h} s={spec} id={id} />
        </>
      )}
    </div>
  )
}

/** A small rose, as an icon (chips, labels, dividers, the header). */
export function Rose({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg className={className ?? 'rose'} width={size} height={size} viewBox="-13.5 -13.5 27 27" aria-hidden="true" focusable="false">
      <use href="#rose" />
    </svg>
  )
}

/** Double rule (gold over ink) with a rose; with a label, the label sits between two roses. */
export function Divider({ label }: { label?: ReactNode }) {
  return (
    <div className="orn-divider" aria-hidden={label ? undefined : true}>
      <span className="orn-rule" />
      <Rose size={16} />
      {label !== undefined && (
        <>
          <span className="orn-divider-label">{label}</span>
          <Rose size={16} />
        </>
      )}
      <span className="orn-rule" />
    </div>
  )
}

/** Ayah marker (eight gilded lobes) with the ayah number; place right after the last word (see AyahEnd). */
export function Mkp({ n, size = 28 }: { n: ReactNode; size?: number }) {
  return (
    <span className="mkp" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="-13 -13 26 26" aria-hidden="true" focusable="false">
        <use href="#mkp" />
      </svg>
      <span className="mkp-n">{n}</span>
    </span>
  )
}

/** Sura-name cartouche on the top edge of an ayah frame: gold, azure, a gold ring, flowers and tig rays at the ends. */
export function Cartouche({ children }: { children: ReactNode }) {
  const rays = (x: number, dir: 1 | -1) =>
    [-60, -30, 0, 30, 60].map((deg) => {
      const a = (deg * Math.PI) / 180
      const len = deg === 0 ? 8 : 5
      return (
        <line key={`${x}${deg}`} className="o-tig" x1={x} y1="18" x2={f(x - dir * len * Math.cos(a))} y2={f(18 + len * Math.sin(a))} strokeWidth="0.8" strokeLinecap="round" />
      )
    })
  const shape = 'M8 18 Q16 14 20 6 Q26 2 36 2 L164 2 Q174 2 180 6 Q184 14 192 18 Q184 22 180 30 Q174 34 164 34 L36 34 Q26 34 20 30 Q16 22 8 18 Z'
  return (
    <div className="cartouche">
      <svg width="170" height="31" viewBox="-8 0 216 36" aria-hidden="true" focusable="false">
        <g filter="url(#hand)">
          {rays(6.5, 1)}
          {rays(193.5, -1)}
          <path className="o-gold o-ink-s" d={shape} strokeWidth="0.7" filter="url(#gilt)" />
          <path className="o-azure o-ink-s" d={shape} transform="translate(100 18) scale(0.9 0.76) translate(-100 -18)" strokeWidth="0.5" />
          <rect className="o-gold-s" x="34" y="8.8" width="132" height="18.4" rx="9.2" fill="none" strokeWidth="0.8" />
          <use href="#hf" transform="translate(22 18) scale(1.5)" />
          <use href="#hf" transform="translate(178 18) scale(1.5)" />
        </g>
      </svg>
      <span className="cartouche-name">{children}</span>
    </div>
  )
}

/** Mushaf frame around an ayah or a hadith: a small jadwal (rope, vine 10 px, gold, roses, hizb marks), and the sura
 *  cartouche on its top edge when `title` is given. */
export function MushafFrame({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const [ref, size] = useSize<HTMLDivElement>()
  const id = useUid()
  return (
    <div ref={ref} className={`frame${title ? ' has-title' : ''}`}>
      {size && size.w > 0 && <JadwalArt w={size.w} h={size.h} s={AYAH} id={id} />}
      {title && <Cartouche>{title}</Cartouche>}
      <div className="frame-inner">{children}</div>
    </div>
  )
}

/** Sura head (sarlawh): tig rays above and below, gilded rope, vine field, a gold cartouche holding the name on paper
 *  within gold and azure-dotted rings, a rose at each side. */
export function SuraHead({ children }: { children: ReactNode }) {
  const [ref, size] = useSize<HTMLDivElement>()
  const id = useUid()
  const w = size?.w ?? 0
  const c = w / 2
  const shape = 'M60 39 Q70 33 76 22 Q84 15 98 15 L242 15 Q256 15 264 22 Q270 33 280 39 Q270 45 264 56 Q256 63 242 63 L98 63 Q84 63 76 56 Q70 45 60 39 Z'
  return (
    <div ref={ref} className="sura-head">
      {w > 0 && (
        <svg className="sura-head-art" width={w} height="102" viewBox={`0 0 ${w} 102`} aria-hidden="true" focusable="false">
          <defs>
            <pattern id={`o${id}uF`} href="#vineH" patternTransform="translate(0 19.8) scale(1.3)" />
          </defs>
          <g filter="url(#hand)">
            {range(Math.floor((w - 2) / 5)).map((i) => {
              const x = 5 + i * 5
              const long = i % 2 === 0
              return (
                <g key={i} className="o-tig" strokeWidth="0.75" strokeLinecap="round">
                  <line x1={x} y1={long ? 1.2 : 6} x2={x} y2="12.5" />
                  <line x1={x} y1="89.5" x2={x} y2={long ? 100.8 : 96} />
                </g>
              )
            })}
            <rect className="o-rule" x="0.4" y="12.9" width={w - 0.8} height="76.2" fill="none" strokeWidth="0.8" />
            <rect x="2.5" y="15" width={w - 5} height="72" fill="none" stroke="url(#rope)" strokeWidth="3.4" filter="url(#gilt)" />
            <rect className="o-rule" x="4.4" y="16.9" width={w - 8.8} height="68.2" fill="none" strokeWidth="0.45" />
            <rect x="4.7" y="17.2" width={w - 9.4} height="67.6" fill={`url(#o${id}uF)`} />
            <rect className="o-rule" x="4.9" y="17.4" width={w - 9.8} height="67.2" fill="none" strokeWidth="0.45" />
            <path className="o-gold o-ink-s" d={shape} transform={`translate(${c} 51) scale(0.84 0.98) translate(-170 -39)`} strokeWidth="0.8" filter="url(#gilt)" />
            <rect className="o-paper-heart o-ink-s" x={c - 75} y="32.5" width="150" height="37" rx="18.5" strokeWidth="0.6" />
            <rect className="o-gold-s" x={c - 71.6} y="35.9" width="143.2" height="30.2" rx="15.1" fill="none" strokeWidth="1" />
            <rect className="o-azure-dots" x={c - 69.4} y="38.1" width="138.8" height="25.8" rx="12.9" fill="none" strokeWidth="1.1" strokeDasharray="0.1 3.2" strokeLinecap="round" />
            <use href="#hf" transform={`translate(${c - 91.5} 51) scale(1.5)`} />
            <use href="#hf" transform={`translate(${c + 91.5} 51) scale(1.5)`} />
            <use href="#rose" transform="translate(27 51) scale(1.05)" />
            <use href="#rose" transform={`translate(${w - 27} 51) scale(1.05)`} />
          </g>
        </svg>
      )}
      <div className="sura-head-name">{children}</div>
    </div>
  )
}

/** Gilded band across the top of sheets: the rope over a thin vine band. */
export function Tashjir() {
  const [ref, size] = useSize<HTMLDivElement>()
  const id = useUid()
  const w = size?.w ?? 0
  return (
    <div ref={ref} className="tashjir" aria-hidden="true">
      {w > 0 && (
        <svg width={w} height="14" viewBox={`0 0 ${w} 14`} aria-hidden="true" focusable="false">
          <defs>
            <pattern id={`o${id}t`} href="#vineH" patternTransform="translate(0 4.5) scale(0.64)" />
          </defs>
          <g filter="url(#hand)">
            <rect x="0" y="0.5" width={w} height="3" fill="url(#rope)" filter="url(#gilt)" />
            <line className="o-rule" x1="0" y1="4.2" x2={w} y2="4.2" strokeWidth="0.45" />
            <rect x="0" y="4.5" width={w} height="9" fill={`url(#o${id}t)`} />
            <line className="o-rule" x1="0" y1="13.6" x2={w} y2="13.6" strokeWidth="0.45" />
          </g>
        </svg>
      )}
    </div>
  )
}

/** The welcome shamsa (a static image of the model's medallion, light or dark by theme) with the «مسلم» wordmark and a
 *  short line in its clear centre. The wordmark stays Arabic in every language; the header carries the page's name. */
export function Shamsa({ line }: { line: string }) {
  return (
    <div className="shamsa">
      <div className="shamsa-art" aria-hidden="true" />
      <div className="shamsa-text">
        <span className="shamsa-name wordmark" lang="ar" aria-hidden="true">
          مسلم
        </span>
        <span className="shamsa-line">{line}</span>
      </div>
    </div>
  )
}
