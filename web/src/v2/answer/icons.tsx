// The answer screen's icons, as drawn on the boards (AnsAfter, PinAfter, SourceAfter).
const s = (w: number, sw: number) => ({
  width: w,
  height: w,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
})

export const IconOpenBook = ({ size = 15 }: { size?: number }) => (
  <svg {...s(size, 1.6)}>
    <path d="M12 6.6C10 5.1 7.2 4.6 4 5.1v12.6c3.2-.5 6 0 8 1.5 2-1.5 4.8-2 8-1.5V5.1c-3.2-.5-6 0-8 1.5Z" />
    <path d="M12 6.6v12.6" />
  </svg>
)
/** The chevron at the end of a source line: points to the end side, so it turns with the reading direction. */
export const IconChevronEnd = () => (
  <svg {...s(16, 1.7)} className="icon-end">
    <path d="m14.5 6-6 6 6 6" />
  </svg>
)
export const IconStar = () => (
  <svg {...s(14, 1)}>
    <path d="m12 3.6 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7Z" fill="currentColor" stroke="none" />
  </svg>
)
export const IconLayers = () => (
  <svg {...s(17, 1.6)}>
    <path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
    <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
  </svg>
)
export const IconPin = ({ size = 15 }: { size?: number }) => (
  <svg {...s(size, 1.8)}>
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3Z" />
    <path d="M12 14v6" />
  </svg>
)
export const IconInfoCircle = () => (
  <svg {...s(18, 1.6)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
)
export const IconExternalV2 = ({ size = 16 }: { size?: number }) => (
  <svg {...s(size, 1.7)}>
    <path d="M14 5h5v5" />
    <path d="M19 5 11 13" />
    <path d="M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10" />
  </svg>
)
export const IconCopy = () => (
  <svg {...s(19, 1.5)}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </svg>
)
const thumb = (
  <>
    <path d="M7.5 10.5v9H5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
    <path d="M7.5 10.5 11 3.6a2.6 2.6 0 0 1 2.7 3L13.2 9.5h5.3a2 2 0 0 1 2 2.3l-1.2 6.3a2.3 2.3 0 0 1-2.3 1.9H7.5" />
  </>
)
export const IconThumbUp = () => <svg {...s(19, 1.5)}>{thumb}</svg>
export const IconThumbDown = () => (
  <svg {...s(19, 1.5)}>
    <g transform="rotate(180 12 12)">{thumb}</g>
  </svg>
)
export const IconCheck = () => (
  <svg {...s(14, 2.2)}>
    <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
  </svg>
)
export const IconRadio = ({ on }: { on: boolean }) => (
  <svg {...s(22, 1.6)}>
    <circle cx="12" cy="12" r="8.6" />
    {on && <circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none" />}
  </svg>
)
export const IconX = () => (
  <svg {...s(19, 1.5)}>
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </svg>
)
