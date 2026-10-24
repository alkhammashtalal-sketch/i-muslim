// Look (b) of the quick-access buttons (add-on 0072-add13 §3): gold line drawings in the daily icons' stroke, like the
// «أذكار المواقف» situations (mawaqif/icons.tsx). The buttons that were on «يومك» keep their drawings (../icons.tsx);
// «الأذكار» takes the raised hands of 🤲 from the situations; four are new here: the mihrab (the prayer lesson), the
// drop (the wudu lesson), the Mushaf on its stand (the Quran), the speech bubble («اسأل»). No figures of people.
// Decorative: aria-hidden; the button's name is its label. The Names of Allah take the letter «ﷲ», never a drawing.
import type { ReactNode } from 'react'
import { IcCalendar, IcClock, IcMosque, IcQibla, IcTarget, IcTasbih } from '../icons'
import { SituationIcon } from '../mawaqif/icons'
import { ALLAH_MARK, SHORTCUT_EMOJI, type ShortcutId } from './model'

const Svg = ({ size = 24, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

export const IcMihrab = () => (
  <Svg>
    <path d="M4.5 20.5h15" />
    <path d="M6 20.5V11c0-3.1 2.6-5.5 6-7.5 3.4 2 6 4.4 6 7.5v9.5" />
    <path d="M9.5 20.5v-7c0-1.7 1-3 2.5-4 1.5 1 2.5 2.3 2.5 4v7" />
  </Svg>
)
export const IcDrop = () => (
  <Svg>
    <path d="M12 3.8c-3.1 4-5.6 7-5.6 10.1a5.6 5.6 0 0 0 11.2 0c0-3.1-2.5-6.1-5.6-10.1Z" />
    <path d="M9.4 14.4a2.7 2.7 0 0 0 2.4 2.6" />
  </Svg>
)
export const IcMushafStand = () => (
  <Svg>
    <path d="M12 8.6C10.2 7.3 7.7 6.9 4.8 7.3v6.9c2.9-.4 5.4 0 7.2 1.3 1.8-1.3 4.3-1.7 7.2-1.3V7.3c-2.9-.4-5.4 0-7.2 1.3Z" />
    <path d="M12 8.6v6.9" />
    <path d="m7.6 20.6 8.8-4.3M16.4 20.6l-8.8-4.3" />
  </Svg>
)
export const IcSpeech = () => (
  <Svg>
    <path d="M5.2 5.5h13.6a1.7 1.7 0 0 1 1.7 1.7v8.1a1.7 1.7 0 0 1-1.7 1.7H12l-4.3 3.3V17H5.2a1.7 1.7 0 0 1-1.7-1.7V7.2a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="M8 10h8M8 13h5" />
  </Svg>
)
/** The arrange list's handle and arrows. */
export const IcGrip = () => (
  <Svg size={22}>
    <path d="M6 9h12M6 12h12M6 15h12" />
  </Svg>
)
export const IcUp = () => (
  <Svg size={22}>
    <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />
  </Svg>
)
export const IcDown = () => (
  <Svg size={22}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
)

const LINE: Record<Exclude<ShortcutId, 'names'>, () => ReactNode> = {
  prayerLesson: () => <IcMihrab />,
  wuduLesson: () => <IcDrop />,
  tasbih: () => <IcTasbih />,
  adhkar: () => <SituationIcon name="hands" size={24} />,
  quran: () => <IcMushafStand />,
  qibla: () => <IcQibla />,
  times: () => <IcClock size={24} />,
  calendar: () => <IcCalendar />,
  mosques: () => <IcMosque />,
  goals: () => <IcTarget />,
  ask: () => <IcSpeech />,
}

/** A button's mark in either look: «ﷲ» in gold for the Names in both, the emoji (a) or the line drawing (b). */
export function ShortcutMark({ id, look }: { id: ShortcutId; look: 'emoji' | 'line' }) {
  if (id === 'names')
    return (
      <span className="sc-allah" aria-hidden="true">
        {ALLAH_MARK}
      </span>
    )
  if (look === 'emoji')
    return (
      <span className="sc-emoji" aria-hidden="true">
        {SHORTCUT_EMOJI[id]}
      </span>
    )
  return <>{LINE[id]()}</>
}
