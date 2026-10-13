// The language boards' icons (out/design-v2/three/boards Lang*), as drawn there. Decorative: aria-hidden.
import type { ReactNode } from 'react'

const Svg = ({ size, sw, children, stroke = 'currentColor' }: { size: number; sw: number; children: ReactNode; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

export const IcSearch = ({ size = 19 }: { size?: number }) => (
  <Svg size={size} sw={1.7}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
)
export const IcClear = () => (
  <Svg size={19} sw={1.5}>
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </Svg>
)
export const IcCheck = () => (
  <Svg size={22} sw={2.2}>
    <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
  </Svg>
)
export const IcInfo = () => (
  <Svg size={17} sw={1.6}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Svg>
)
export const IcGlobe = () => (
  <Svg size={28} sw={1.6}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.6 12h16.8" />
    <path d="M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6Z" />
  </Svg>
)
export const IcGlobeSmall = () => (
  <Svg size={17} sw={1.6}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.6 12h16.8" />
    <path d="M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6Z" />
  </Svg>
)
export const IcHand = () => (
  <Svg size={19} sw={1.8}>
    <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 10V5a1.5 1.5 0 0 1 3 0v6" />
    <path d="M14 10.5V6.8a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.6a5.4 5.4 0 0 1-4.3-2.2L3.8 14.6a1.5 1.5 0 0 1 2.3-1.9L8 14.6" />
  </Svg>
)
export const IcLock = () => (
  <Svg size={17} sw={1.6}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
)
