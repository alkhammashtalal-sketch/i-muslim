// Line icons for the reader's additions, drawn like the V2 boards' (24-unit grid, 1.6 stroke, currentColor).
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}
type P = { size?: number }

export const IcBookmark = ({ size = 20, filled = false }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
  </svg>
)
export const IcNote = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M5 4h14v11l-5 5H5z" />
    <path d="M14 20v-5h5" />
    <path d="M8.5 8.5h7M8.5 12h5" />
  </svg>
)
export const IcRepeat = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M17 3.5 20 6.5l-3 3" />
    <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
    <path d="M7 20.5 4 17.5l3-3" />
    <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
  </svg>
)
export const IcImage = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 16-5-5-8.5 8.5" />
  </svg>
)
export const IcStar = ({ size = 22, filled = false }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
  </svg>
)
export const IcChevron = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
export const IcCaret = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} className="rd-caret">
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const IcPlay = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
)
export const IcStop = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
)
export const IcPause = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
  </svg>
)
export const IcSearch = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
)
export const IcShare = ({ size = 19 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 15V3.5" />
    <path d="m7.5 8 4.5-4.5L16.5 8" />
    <path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
)
export const IcDownload = ({ size = 19 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 3.5V15" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19.5h14" />
  </svg>
)
export const IcSource = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
    <path d="M5 16.5a3 3 0 0 1 3-3h10.5" />
  </svg>
)
export const IcLock = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
)
export const IcBook = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 6.5c-2-1.6-4.8-2-8-1.5v13c3.2-.5 6 0 8 1.5 2-1.5 4.8-2 8-1.5V5c-3.2-.5-6-.1-8 1.5z" />
    <path d="M12 6.5V20" />
  </svg>
)
export const IcMic = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="9" y="3.5" width="6" height="10.5" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5v3" />
  </svg>
)
export const IcClose = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
/** The hizb mark: a small eight-lobed medallion, flat fills from the ornament palette (CLAUDE.md §8). */
export const HizbMark = ({ size = 40, full = true }: P & { full?: boolean }) => (
  <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true" focusable="false">
    {Array.from({ length: 8 }, (_, i) => (
      <circle key={i} cx={Math.cos((i * Math.PI) / 4) * 12} cy={Math.sin((i * Math.PI) / 4) * 12} r={6} style={{ fill: 'var(--o-gold)', stroke: 'var(--o-ink)', strokeWidth: 0.5 }} />
    ))}
    <circle r={13} style={{ fill: full ? 'var(--o-azure)' : 'var(--o-white)', stroke: 'var(--o-ink)', strokeWidth: 0.5 }} />
  </svg>
)
/** A quarter mark: one, two or three of four petals filled. */
export const QuarterMark = ({ part, size = 30 }: { part: 1 | 2 | 3; size?: number }) => (
  <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
    <circle r={10.5} style={{ fill: 'var(--o-white)', stroke: 'var(--o-gold)', strokeWidth: 1.2 }} />
    {[0, 1, 2, 3].map((i) => (
      <path
        key={i}
        d="M0 0 L0 -9 A9 9 0 0 1 9 0 Z"
        transform={`rotate(${i * 90})`}
        style={{ fill: i < part ? 'var(--o-gold)' : 'transparent', stroke: 'var(--o-gold-dark)', strokeWidth: 0.5 }}
      />
    ))}
  </svg>
)
