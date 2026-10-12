// Icons of the daily boards (out/design-v2/daily/boards), as drawn there. Decorative: aria-hidden.
import type { ReactNode } from 'react'

const Svg = ({ size = 22, sw = 1.6, children, className }: { size?: number; sw?: number; children: ReactNode; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    {children}
  </svg>
)

export const IcClock = ({ size = 22 }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
export const IcQibla = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.6" />
    <path d="m15.2 8.8-2 5.2-5.2 2 2-5.2Z" />
  </Svg>
)
export const IcBook = ({ size = 22 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 6.6C10 5.1 7.2 4.6 4 5.1v12.6c3.2-.5 6 0 8 1.5 2-1.5 4.8-2 8-1.5V5.1c-3.2-.5-6 0-8 1.5Z" />
    <path d="M12 6.6v12.6" />
  </Svg>
)
export const IcTasbih = () => (
  <Svg>
    <path d="M12 4.2a6.2 6.2 0 1 1-4.4 10.6" />
    <circle cx="12" cy="4.2" r="1.3" />
    <circle cx="17.4" cy="7.3" r="1.3" />
    <circle cx="18.2" cy="13.4" r="1.3" />
    <path d="M7.6 14.8 6 19.5" />
    <circle cx="5.7" cy="20.2" r="0.9" />
  </Svg>
)
export const IcCalendar = () => (
  <Svg>
    <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
    <path d="M4 10h16" />
    <path d="M8.5 3.5v4" />
    <path d="M15.5 3.5v4" />
  </Svg>
)
export const IcMosque = () => (
  <Svg>
    <path d="M3.5 20h17" />
    <path d="M6 20v-5.5a6 6 0 0 1 12 0V20" />
    <path d="M12 8.5V5" />
    <path d="M10.5 6.2 12 4.6l1.5 1.6" />
    <path d="M10 20v-3a2 2 0 0 1 4 0v3" />
  </Svg>
)
export const IcStar = () => (
  <Svg>
    <path d="m12 3.2 2.6 3.4 4.3-.5-.5 4.3 3.4 2.6-3.4 2.6.5 4.3-4.3-.5L12 22.8l-2.6-3.4-4.3.5.5-4.3L2.2 13l3.4-2.6-.5-4.3 4.3.5Z" transform="translate(0 -1) scale(1 .95)" />
  </Svg>
)
export const IcTarget = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="4.8" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </Svg>
)
/** Points to the reading direction's end (the board's chevron); CSS turns it in left-to-right pages. */
export const IcChevron = ({ size = 18 }: { size?: number }) => (
  <Svg size={size} sw={1.7} className="dt-chev">
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)
export const IcChevronPrev = () => (
  <Svg size={19} sw={1.5} className="dt-chev">
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)
export const IcPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 20.5s-6-5.4-6-10.3a6 6 0 0 1 12 0c0 4.9-6 10.3-6 10.3Z" />
    <circle cx="12" cy="10.2" r="2.2" />
  </svg>
)
export const IcLock = () => (
  <Svg size={17}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
)
export const IcChecked = () => (
  <Svg size={28}>
    <rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor" stroke="none" />
    <path d="m8 12.3 2.8 2.8 5.4-5.8" stroke="var(--on-primary)" />
  </Svg>
)
export const IcUnchecked = () => (
  <Svg size={28}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
  </Svg>
)
export const IcPlus = () => (
  <Svg size={19} sw={1.7}>
    <path d="M12 6v12" />
    <path d="M6 12h12" />
  </Svg>
)
export const IcDirections = () => (
  <Svg size={17} sw={1.7} className="dt-dir">
    <path d="M6 19.5V11a3 3 0 0 1 3-3h9" />
    <path d="m14.5 4.5 3.5 3.5-3.5 3.5" />
  </Svg>
)
export const IcAdjust = () => (
  <Svg size={17}>
    <path d="M5 12h14" />
    <path d="M8.5 8.5 5 12l3.5 3.5" />
    <path d="M15.5 8.5 19 12l-3.5 3.5" />
  </Svg>
)
export const IcCheckBadge = () => (
  <Svg size={15}>
    <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
    <path d="m7.8 12.3 2.9 2.9 5.6-6" stroke="var(--on-primary)" strokeWidth="2" />
  </Svg>
)
export const IcClose = () => (
  <Svg size={18} sw={1.8}>
    <path d="M7 7l10 10M17 7 7 17" />
  </Svg>
)
