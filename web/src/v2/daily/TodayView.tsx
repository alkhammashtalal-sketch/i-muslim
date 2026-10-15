// The daily screens behind /today/<tool> (reply 0032 D). Each fork registers its own tools here; an unknown tool falls
// back to the home page.
import { useEffect, type ComponentType } from 'react'
import { isAndroid } from '../../native/platform'
import { navigate } from '../../quran/route'
import { Calendar } from './Calendar'
import { Goals } from './Goals'
import { Mosques } from './Mosques'
import { PrayerTimes } from './PrayerTimes'
import { Qibla } from './Qibla'
import { Sources } from '../sources/Sources'
import { Mawaqif } from './mawaqif/Mawaqif'

export const TODAY_SCREENS: Record<string, ComponentType> = {
  times: PrayerTimes,
  qibla: Qibla,
  calendar: Calendar,
  goals: Goals,
  mosques: Mosques,
  sources: Sources, // at /sources (reply 0033 §أ3), in the same frame
  mawaqif: Mawaqif, // at /mawaqif… (reply 0050), shown once its table is reviewed
}

/** «المساجد» is not in the Android app (reply 0066; its tile is hidden, HomeSlots.tsx shownTools): its path goes home. */
const hiddenHere = (tool: string) => tool === 'mosques' && isAndroid()

export function TodayView({ tool }: { tool: string }) {
  const hidden = hiddenHere(tool)
  useEffect(() => {
    if (hidden) navigate('/')
  }, [hidden])
  const S = hidden ? undefined : TODAY_SCREENS[tool]
  return S ? <S /> : null
}
