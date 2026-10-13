// The daily screens behind /today/<tool> (reply 0032 D). Each fork registers its own tools here; an unknown tool falls
// back to the home page.
import type { ComponentType } from 'react'
import { Calendar } from './Calendar'
import { Goals } from './Goals'
import { Mosques } from './Mosques'
import { PrayerTimes } from './PrayerTimes'
import { Qibla } from './Qibla'
import { Sources } from '../sources/Sources'

export const TODAY_SCREENS: Record<string, ComponentType> = {
  times: PrayerTimes,
  qibla: Qibla,
  calendar: Calendar,
  goals: Goals,
  mosques: Mosques,
  sources: Sources, // at /sources (reply 0033 §أ3), in the same frame
}

export function TodayView({ tool }: { tool: string }) {
  const S = TODAY_SCREENS[tool]
  return S ? <S /> : null
}
