// The sources page's icons, as drawn on the boards Sources and SourcesN (the open book and the chevron are the answer
// screen's, from ../answer/icons).
import type { GroupIcon } from './registry'
import { IconOpenBook } from '../answer/icons'

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

export const IconBooks = () => (
  <svg {...s(18, 1.6)}>
    <path d="M5 4.5h3.2v15H5z" />
    <path d="M10.4 4.5h3.2v15h-3.2z" />
    <path d="m15.6 5.6 3.1-.8 3 14.5-3.1.8z" transform="translate(-1.6 .2)" />
  </svg>
)
export const IconHeadphones = () => (
  <svg {...s(18, 1.6)}>
    <path d="M4.5 15v-2.5a7.5 7.5 0 0 1 15 0V15" />
    <rect x="3.5" y="14" width="4" height="6" rx="1.6" />
    <rect x="16.5" y="14" width="4" height="6" rx="1.6" />
  </svg>
)
export const IconWrench = () => (
  <svg {...s(18, 1.6)}>
    <path d="M14.5 5.5a4 4 0 0 0-5.2 5.2l-5 5a1.6 1.6 0 0 0 2.3 2.3l5-5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.3-.4-.4-2.3Z" />
  </svg>
)
export const IconSync = () => (
  <svg {...s(22, 1.6)}>
    <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3" />
    <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3" />
    <path d="M17.5 3.5v3.3h-3.3" />
    <path d="M6.5 20.5v-3.3h3.3" />
  </svg>
)
export const IconFlag = ({ size = 19 }: { size?: number }) => (
  <svg {...s(size, 1.8)}>
    <path d="M5.5 20.5V4.5" />
    <path d="M5.5 5h11l-2.2 4 2.2 4h-11" />
  </svg>
)
export const IconHeart = () => (
  <svg {...s(18, 1.6)}>
    <path d="M12 19.5s-7-4.3-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z" />
  </svg>
)

export function GroupIconOf({ icon }: { icon: GroupIcon }) {
  switch (icon) {
    case 'books':
      return <IconBooks />
    case 'headphones':
      return <IconHeadphones />
    case 'wrench':
      return <IconWrench />
    default:
      return <IconOpenBook size={18} />
  }
}
