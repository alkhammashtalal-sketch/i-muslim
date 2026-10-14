// The adhkar's categories and today's counts on the device, shared by the screen (Adhkar.tsx) and the iOS widgets
// (reply 0046, web/src/native/widget-data.ts). Counts start again each day.
import split from '../../../../../data/adhkar-split.json'
import { dayTimes, ymdIn } from '../../../daily/prayer'
import { savedPlace } from '../../../daily/location'
import { loadPrayerPrefs } from '../store'
import type { ToolHadith } from '../api'

export const CATS = ['301', '465', '313', '302', '303', '306', '307', '308'] as const
/** HadeethEnc's «أذكار الصباح والمساء». */
export const MORNING_EVENING = '301'

// 0048-add1 §ب (Talal 14 October 09:23): «أذكار الصباح» and «أذكار المساء» as two lists in place of the one, from
// data/adhkar-split.json, shown only once the coordinator has reviewed it (its status «reviewed»): until then the one list.
export type AdhkarPart = 'morning' | 'evening'
export const PARTS: AdhkarPart[] = ['morning', 'evening']
type SplitItem = { id: string; parts: AdhkarPart[]; segments: Partial<Record<AdhkarPart, number[]>> }
const SPLIT = split as { status: string; items: SplitItem[] }
export const ADHKAR_SPLIT = SPLIT.status === 'reviewed'
export type AdhkarChip = (typeof CATS)[number] | AdhkarPart
/** The chips: the two lists first in place of «الصباح والمساء» when they are two. */
export const chipsOf = (twoLists = ADHKAR_SPLIT): AdhkarChip[] => (twoLists ? [...PARTS, ...CATS.filter((c) => c !== MORNING_EVENING)] : [...CATS])
export const isPart = (c: string): c is AdhkarPart => c === 'morning' || c === 'evening'

/** A list's hadiths from the category's, in its order, each with its own wording highlighted: the segments of the list
 *  (indices into the dhikr's reviewed segments, as the server sends them all or none). Nothing else is changed. */
export function partItems(items: ToolHadith[], part: AdhkarPart): ToolHadith[] {
  const byId = new Map(SPLIT.items.map((x) => [x.id, x]))
  return items.flatMap((h) => {
    const x = byId.get(h.id)
    if (!x?.parts.includes(part)) return []
    const all = h.highlights ?? []
    const pick = x.segments[part] ?? []
    return [{ ...h, highlights: all.length ? pick.map((i) => all[i]).filter((t): t is string => !!t) : [] }]
  })
}

/** The list the time asks for: «أذكار الصباح» from Fajr to Asr, «أذكار المساء» from Asr to Fajr, by the computed times
 *  of the saved place and prayer settings (as the widget «أذكار الوقت»); without a place, by the clock, 4:00 to 15:00. */
export function partNow(now = new Date()): AdhkarPart {
  const place = savedPlace()
  if (!place) {
    const h = now.getHours()
    return h >= 4 && h < 15 ? 'morning' : 'evening'
  }
  const prefs = loadPrayerPrefs()
  const d = dayTimes(place, ymdIn(now, place.timeZone), { method: prefs.method, asr: prefs.asr })
  return now >= d.fajr && now < d.asr ? 'morning' : 'evening'
}

/** A count's key: by list when there are two, so a dhikr said in the morning is counted afresh in the evening. */
export const countKey = (id: string, part?: AdhkarPart | null) => (part ? `${part}:${id}` : id)
export const ADHKAR_KEY = 'muslim.adhkar.v1'
export const adhkarToday = () => new Date().toLocaleDateString('en-CA')

export function loadCounts(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(ADHKAR_KEY) ?? '{}') as { day?: string; n?: Record<string, number> }
    return v.day === adhkarToday() ? (v.n ?? {}) : {}
  } catch {
    return {}
  }
}
export function saveCounts(n: Record<string, number>) {
  try {
    localStorage.setItem(ADHKAR_KEY, JSON.stringify({ day: adhkarToday(), n }))
  } catch {}
  // The iOS widget «أذكار الوقت» shows today's progress (reply 0046).
  window.dispatchEvent(new Event('muslim:widgets'))
}
