const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export const IconBook = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

export const IconGear = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const IconChevron = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.5}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const IconClose = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.5}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
)

export const IconSend = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.5}>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
)

export const IconLock = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.8}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const IconExternal = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2}>
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
)

export const IconShareIos = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)

export const IconPlusSquare = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

export const IconCheck = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <path d="M5 12l5 5 9-10" />
  </svg>
)

// Second version (reply 0032 B): the icons of out/design-v2/boards, as drawn there (stroke 1.5–1.6, 19 px).
const v2 = { ...base, strokeWidth: 1.5 }
export const IconSliders = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...v2}>
    <path d="M4 7h9" />
    <path d="M17 7h3" />
    <circle cx="15" cy="7" r="2" />
    <path d="M4 17h3" />
    <path d="M11 17h9" />
    <circle cx="9" cy="17" r="2" />
  </svg>
)
export const IconPen = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...v2}>
    <path d="M12 20h8" />
    <path d="M16.4 3.6a2 2 0 0 1 2.9 2.9L7.2 18.6l-3.7.9.9-3.7Z" />
  </svg>
)
export const IconChat = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.6}>
    <path d="M20.5 12a8 8 0 0 1-11.7 7.1L4 20.3l1.3-4.5A8 8 0 1 1 20.5 12Z" />
  </svg>
)
export const IconShelf = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.6}>
    <path d="M5 4.5h3.2v15H5z" />
    <path d="M10.4 4.5h3.2v15h-3.2z" />
    <path d="m15.6 5.6 3.1-.8 3 14.5-3.1.8z" transform="translate(-1.6 .2)" />
  </svg>
)
export const IconInfo = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.6}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
)
/** Back: points to the start side, so it turns with the reading direction (CSS flips it in left-to-right pages). */
export const IconChevronBack = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.6} className="icon-back">
    <path d="m9 6 6 6-6 6" />
  </svg>
)
