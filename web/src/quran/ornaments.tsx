// Reader ornaments (CLAUDE.md §8, §11): the sura-head cartouche, the ayah-number ring and the
// eight-pointed star of the sura index. Thin gilded strokes only — no fills, shadows or gradients.
import type { ReactNode } from 'react'

const f = (n: number) => n.toFixed(2)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
}

/** Small eight-petal rosette centred on (cx, cy). */
function rosette(cx: number, cy: number, r: number, key: string) {
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} strokeWidth="0.7" />
      {range(8).map((i) => {
        const [x0, y0] = polar(cx, cy, r * 0.28, i * 45)
        const [x1, y1] = polar(cx, cy, r * 0.86, i * 45)
        const [ax, ay] = polar(cx, cy, r * 0.6, i * 45 - 16)
        const [bx, by] = polar(cx, cy, r * 0.6, i * 45 + 16)
        return (
          <path
            key={i}
            d={`M${f(x0)} ${f(y0)} Q${f(ax)} ${f(ay)} ${f(x1)} ${f(y1)} Q${f(bx)} ${f(by)} ${f(x0)} ${f(y0)}Z`}
            strokeWidth="0.55"
          />
        )
      })}
      <circle cx={cx} cy={cy} r={r * 0.16} fill="currentColor" stroke="none" />
    </g>
  )
}

/** Ogee cartouche between x0 and x1 (pointed ends), vertical centre 32. */
function cartouche(x0: number, x1: number, h: number) {
  const top = 32 - h
  const bot = 32 + h
  const k = 22
  return `M${x0} 32 C${x0 + 6} ${top + 4} ${x0 + k - 8} ${top} ${x0 + k} ${top} L${x1 - k} ${top} C${x1 - k + 8} ${top} ${x1 - 6} ${top + 4} ${x1} 32 C${x1 - 6} ${bot - 4} ${x1 - k + 8} ${bot} ${x1 - k} ${bot} L${x0 + k} ${bot} C${x0 + k - 8} ${bot} ${x0 + 6} ${bot - 4} ${x0} 32Z`
}

/** Gilded sura head: double band, central cartouche for the name, a rosette at each end. */
export function SuraCartouche({ children }: { children: ReactNode }) {
  return (
    <div className="sura-head">
      <svg className="sura-head-art" viewBox="0 0 340 64" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          <rect x="1.5" y="5.5" width="337" height="53" rx="2" strokeWidth="0.9" />
          <rect x="5.5" y="9.5" width="329" height="45" rx="1" strokeWidth="0.5" />
          <path d={cartouche(68, 272, 18)} strokeWidth="0.9" />
          <path d={cartouche(73, 267, 14.5)} strokeWidth="0.5" />
          <path d="M50 32 L64 32 M276 32 L290 32" strokeWidth="0.6" />
          <path d="M57 28.5 Q60.5 32 57 35.5 Q53.5 32 57 28.5Z M283 28.5 Q286.5 32 283 35.5 Q279.5 32 283 28.5Z" strokeWidth="0.55" />
          {rosette(32, 32, 14, 'l')}
          {rosette(308, 32, 14, 'r')}
        </g>
      </svg>
      <div className="sura-head-name">{children}</div>
    </div>
  )
}

/** Ring marking the end of an ayah; the number is drawn by the caller on top. */
export function AyahRing() {
  return (
    <svg className="ayah-ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="18" cy="18" r="14.6" strokeWidth="0.9" />
        <circle cx="18" cy="18" r="12.2" strokeWidth="0.5" />
        {range(8).map((i) => {
          const [x, y] = polar(18, 18, 13.4, i * 45 + 22.5)
          return <circle key={`d${i}`} cx={f(x)} cy={f(y)} r="0.55" fill="currentColor" stroke="none" />
        })}
        {range(4).map((i) => {
          const [x0, y0] = polar(18, 18, 14.6, i * 90)
          const [x1, y1] = polar(18, 18, 17.6, i * 90)
          const [ax, ay] = polar(18, 18, 16.1, i * 90 - 9)
          const [bx, by] = polar(18, 18, 16.1, i * 90 + 9)
          return (
            <path
              key={`l${i}`}
              d={`M${f(x0)} ${f(y0)} Q${f(ax)} ${f(ay)} ${f(x1)} ${f(y1)} Q${f(bx)} ${f(by)} ${f(x0)} ${f(y0)}Z`}
              strokeWidth="0.55"
            />
          )
        })}
      </g>
    </svg>
  )
}

/** Eight-pointed star (two interlaced squares) holding the sura number in the index. */
export function KhatamStar() {
  const sq = (rot: number) =>
    range(4)
      .map((i) => polar(20, 20, 17, rot + i * 90))
      .map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`)
      .join(' ') + 'Z'
  return (
    <svg className="khatam" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <path d={sq(0)} strokeWidth="0.9" />
        <path d={sq(45)} strokeWidth="0.9" />
        <circle cx="20" cy="20" r="10.5" strokeWidth="0.5" />
      </g>
    </svg>
  )
}
