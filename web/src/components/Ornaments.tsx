import { useId, type ReactNode } from 'react'

const C = 100
const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}
const f = (n: number) => n.toFixed(2)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

// Scalloped outer edge.
function scallop(r: number, lobes: number, depth: number) {
  const step = 360 / lobes
  let d = ''
  range(lobes).forEach((i) => {
    const [x0, y0] = pt(r - depth, i * step)
    const [cx, cy] = pt(r + depth, i * step + step / 2)
    const [x1, y1] = pt(r - depth, (i + 1) * step)
    d += `${i === 0 ? `M${f(x0)} ${f(y0)}` : ''} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`
  })
  return d + 'Z'
}

// Vesica (almond leaf) pointing outward at angle deg, spanning r0..r1.
function leaf(r0: number, r1: number, deg: number, w: number) {
  const [x0, y0] = pt(r0, deg)
  const [x1, y1] = pt(r1, deg)
  const mid = (r0 + r1) / 2
  const [ax, ay] = pt(mid, deg - w)
  const [bx, by] = pt(mid, deg + w)
  return `M${f(x0)} ${f(y0)} Q${f(ax)} ${f(ay)} ${f(x1)} ${f(y1)} Q${f(bx)} ${f(by)} ${f(x0)} ${f(y0)}Z`
}

/** Gilded medallion (shamsa) behind the welcome line; the centre is left clear for the text. */
export function Shamsa({ className = 'shamsa' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -14 200 228" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
        <path d="M100 -12 Q94 -5 100 1 Q106 -5 100 -12Z" strokeWidth="0.9" />
        <path d="M100 212 Q94 205 100 199 Q106 205 100 212Z" strokeWidth="0.9" />

        <path d={scallop(96, 40, 2.4)} strokeWidth="0.9" />
        <circle cx={C} cy={C} r="90" strokeWidth="1" />
        <circle cx={C} cy={C} r="87" strokeWidth="0.5" />

        {range(24).map((i) => (
          <path key={`l${i}`} d={leaf(76, 86, i * 15 + 7.5, 7)} strokeWidth="0.7" />
        ))}
        {range(24).map((i) => {
          const [x, y] = pt(81, i * 15)
          return <circle key={`d${i}`} cx={f(x)} cy={f(y)} r="1" fill="currentColor" stroke="none" />
        })}

        <circle cx={C} cy={C} r="74" strokeWidth="0.8" />
        {range(32).map((i) => {
          const a = i * 11.25
          const [x0, y0] = pt(67, a)
          const [x1, y1] = pt(70.5, a - 4.5)
          const [x2, y2] = pt(74, a)
          const [x3, y3] = pt(70.5, a + 4.5)
          return <path key={`r${i}`} d={`M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}Z`} strokeWidth="0.6" />
        })}
        <circle cx={C} cy={C} r="67" strokeWidth="0.8" />
        <circle cx={C} cy={C} r="64.5" strokeWidth="0.4" />
      </g>
    </svg>
  )
}

/** Small eight-petal rosette used at the corners of the Mushaf frame. */
export function Rosette({ className }: { className?: string }) {
  const petals = range(8).map((i) => {
    const a = (i * 45 * Math.PI) / 180
    const x = 6.5 + 4 * Math.sin(a)
    const y = 6.5 - 4 * Math.cos(a)
    return <circle key={i} cx={f(x)} cy={f(y)} r="1.9" />
  })
  return (
    <svg className={className} viewBox="0 0 13 13" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="0.7">
        {petals}
        <circle cx="6.5" cy="6.5" r="1.6" fill="currentColor" />
      </g>
    </svg>
  )
}

/** Thin double gilded frame with corner rosettes, after the frame of a Mushaf page. */
export function MushafFrame({ children }: { children: ReactNode }) {
  return (
    <div className="frame">
      <div className="frame-inner">{children}</div>
      <Rosette className="rosette tl" />
      <Rosette className="rosette tr" />
      <Rosette className="rosette bl" />
      <Rosette className="rosette br" />
    </div>
  )
}

/** Thin scrolling-vine (tashjir) band across the top of sheets. */
export function Tashjir() {
  const id = 'tashjir' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg className="tashjir" viewBox="0 0 480 14" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="24" height="14" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
            <path d="M0 7 C6 1 18 13 24 7" />
            <path d="M6 4.6 Q8 1 11 2.2 Q9 4.6 6 4.6Z" />
            <path d="M18 9.4 Q16 13 13 11.8 Q15 9.4 18 9.4Z" />
          </g>
          <circle cx="12" cy="7" r="0.9" fill="currentColor" />
        </pattern>
      </defs>
      <line x1="0" y1="0.6" x2="480" y2="0.6" stroke="currentColor" strokeWidth="0.6" />
      <rect x="0" y="0" width="480" height="14" fill={`url(#${id})`} />
      <line x1="0" y1="13.4" x2="480" y2="13.4" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  )
}
