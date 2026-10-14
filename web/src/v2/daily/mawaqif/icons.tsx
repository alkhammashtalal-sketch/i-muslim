// The situations' icons on the «أذكار المواقف» board (out/design-v2/mawaqif/mawaqif-mock.png): line drawings in the
// daily icons' stroke. Decorative: aria-hidden; the tile's name is its label.
import type { ReactNode } from 'react'

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

const PATHS: Record<string, ReactNode> = {
  car: (
    <>
      <path d="M4 15.5V12l2-4.5h12l2 4.5v3.5" />
      <path d="M3 15.5h18v2.5H3z" />
      <circle cx="7.5" cy="15.5" r="1" />
      <circle cx="16.5" cy="15.5" r="1" />
      <path d="M6.5 12h11" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  sunrise: (
    <>
      <path d="M7.5 16a4.5 4.5 0 0 1 9 0" />
      <path d="M3 19h18M12 6.5V9M5.6 10.1l1.8 1.6M18.4 10.1l-1.8 1.6M3.5 15.5H5M19 15.5h1.5" />
    </>
  ),
  'home-in': (
    <>
      <path d="M4 11 12 4.5 20 11v8.5H4z" />
      <path d="M12 9.5v6M9.5 13l2.5 2.5 2.5-2.5" />
    </>
  ),
  'home-out': (
    <>
      <path d="M4 11 12 4.5 20 11v8.5H4z" />
      <path d="M12 15.5v-6M9.5 12l2.5-2.5 2.5 2.5" />
    </>
  ),
  mosque: (
    <>
      <path d="M6 19.5v-7a6 6 0 0 1 12 0v7z" />
      <path d="M12 4v2.5M10 19.5v-3a2 2 0 0 1 4 0v3M4 19.5h16" />
    </>
  ),
  door: (
    <>
      <path d="M7 20V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V20" />
      <path d="M5 20h14M14 12.5h.01" />
    </>
  ),
  food: <path d="M7 4v6a2 2 0 0 0 2 2v8M11 4v6a2 2 0 0 1-2 2M9 4v5M16.5 20V4c-1.8 1-2.5 3.2-2.5 6v3h2.5" />,
  lantern: (
    <>
      <path d="M10 4h4M12 4V6M8.5 8.5 10 6h4l1.5 2.5" />
      <path d="M8.5 8.5h7v8l-1.5 2h-4l-1.5-2z" />
      <path d="M12 11.5v3" />
    </>
  ),
  rain: (
    <>
      <path d="M7 14.5a3.5 3.5 0 0 1 .5-7 5 5 0 0 1 9.6 1.4A3 3 0 0 1 17 14.5z" />
      <path d="M8.5 17.5 8 19M12 17.5l-.5 1.5M15.5 17.5 15 19" />
    </>
  ),
  wind: <path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7" />,
  crescent: <path d="M15.5 4.5A8 8 0 1 0 19.5 16 6.5 6.5 0 0 1 15.5 4.5z" />,
  person: (
    <>
      <circle cx="10" cy="7.5" r="3" />
      <path d="M4.5 19.5a5.5 5.5 0 0 1 11 0M17 6.5l2-1M17.5 9h2.5M17 11.5l2 1" />
    </>
  ),
  face: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.8 15.8a4 4 0 0 1 6.4 0M9 9.5l1.5.8M15 9.5l-1.5.8" />
    </>
  ),
  heart: <path d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.7 12 19 12 19z" />,
  people: (
    <>
      <circle cx="9" cy="8.5" r="2.6" />
      <circle cx="16" cy="9.5" r="2.2" />
      <path d="M3.5 18.5a5.5 5.5 0 0 1 11 0M14 14.2a4.5 4.5 0 0 1 6.5 4.3" />
    </>
  ),
  drop: <path d="M12 4.5s5.5 6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 10.5 12 4.5 12 4.5z" />,
  hand: (
    <>
      <path d="M5 13.5h3.5l3.5 1.5h3a1.5 1.5 0 0 1 0 3H11" />
      <path d="M5 19.5h9.5l5-4a1.4 1.4 0 0 0-2-2l-2.5 2" />
      <path d="M14.5 9.5s-3-1.8-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.7-3 3.7z" />
    </>
  ),
  cloud: <path d="M7 17.5a3.5 3.5 0 0 1 .5-7 5 5 0 0 1 9.6 1.4A3 3 0 0 1 17 17.5z" />,
  sound: <path d="M4 10v4h3l4 3.5v-11L7 10zM15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />,
  shirt: <path d="M9 4.5 4 7l1.5 4L8 10v9.5h8V10l2.5 1L20 7l-5-2.5a3 3 0 0 1-6 0z" />,
  stone: (
    <>
      <path d="M7 20V9a5 5 0 0 1 10 0v11" />
      <path d="M5 20h14M12 9.5v4M10 11.5h4" />
    </>
  ),
  rings: (
    <>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
}

export const SituationIcon = ({ name }: { name: string }) => <Svg>{PATHS[name] ?? PATHS.heart}</Svg>
export const IcCarAuto = () => <Svg>{PATHS.car}</Svg>
export const IcMic = () => (
  <Svg>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V20" />
  </Svg>
)
export const IcNfc = () => (
  <Svg>
    <path d="M8 8.5a5 5 0 0 1 0 7M11 6a8.5 8.5 0 0 1 0 12M14 3.5a12 12 0 0 1 0 17" />
  </Svg>
)
