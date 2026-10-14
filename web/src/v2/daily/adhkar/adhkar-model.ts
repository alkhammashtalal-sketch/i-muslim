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
type SplitItem = {
  id: string
  parts: AdhkarPart[]
  night?: boolean
  segments: Partial<Record<AdhkarPart, number[]>>
  box?: Partial<Record<AdhkarPart, number[]>>
  compose?: Partial<Record<AdhkarPart, Compose>>
  composeLine?: AdhkarPart
  quran?: QuranRange[]
  quranLinks?: boolean
  read?: 'time' | 'night' | 'sleep'
}
/** 0049-add1 أ: a box built from reviewed segments by the replacements the hadith or its explanation names. */
type Compose = { segment: number; replace: { from: string; to?: string; toSegment?: number; count: number }[] }[]
/** 0049-add1 ب: a dhikr that is reading the Quran: its sura, whole or from one ayah to another. */
export type QuranRange = { s: number; from?: number; to?: number }
const SPLIT = split as { status: string; items: SplitItem[] }
export const ADHKAR_SPLIT = SPLIT.status === 'reviewed'
export type AdhkarChip = (typeof CATS)[number] | AdhkarPart
/** The chips: the two lists first in place of «الصباح والمساء» when they are two. */
export const chipsOf = (twoLists = ADHKAR_SPLIT): AdhkarChip[] => (twoLists ? [...PARTS, ...CATS.filter((c) => c !== MORNING_EVENING)] : [...CATS])
export const isPart = (c: string): c is AdhkarPart => c === 'morning' || c === 'evening'

/** The night's adhkar (0048-add4 أ): at the end of «أذكار المساء», under «من أذكار الليل». */
export const isNightDhikr = (id: string) => SPLIT.items.some((x) => x.id === id && x.night)

/** A dhikr of the two lists (0049 د): `box` the words to say, the list's segments verbatim and in order (none when the
 *  hadith has no highlight), and `note` a line quoted from HadeethEnc's explanation under it. */
export type AdhkarItem = ToolHadith & { box: string[]; composed?: boolean; quran?: QuranRange[]; quranLinks?: boolean; read?: 'time' | 'night' | 'sleep' }

/** The composed box: each part's segment with its replacements, each found exactly `count` times (else nothing is built). */
export function composeBox(rules: Compose, segs: string[]): string[] | null {
  const out: string[] = []
  for (const part of rules) {
    let t = segs[part.segment]
    if (t === undefined) return null
    for (const r of part.replace) {
      const to = r.toSegment !== undefined ? segs[r.toSegment] : r.to
      if (to === undefined || t.split(r.from).length - 1 !== r.count) return null
      t = t.split(r.from).join(to)
    }
    out.push(t)
  }
  return out
}

/** A list's hadiths from the category's, in its order and the night's last, each with its own wording highlighted: the
 *  segments of the list (indices into the dhikr's reviewed segments, as the server sends them all or none). Nothing
 *  else is changed. */
export function partItems(items: ToolHadith[], part: AdhkarPart): AdhkarItem[] {
  const byId = new Map(SPLIT.items.map((x) => [x.id, x]))
  const mine = items.flatMap((h) => {
    const x = byId.get(h.id)
    if (!x?.parts.includes(part)) return []
    const all = h.highlights ?? []
    const at = (ix: number[]) => (all.length ? ix.map((i) => all[i]).filter((t): t is string => !!t) : [])
    const pick = x.segments[part] ?? []
    const rules = x.compose?.[part]
    const composed = rules && all.length ? composeBox(rules, all) : null
    return [
      {
        ...h,
        highlights: at(pick),
        box: composed ?? (rules ? [] : at(x.box?.[part] ?? pick)),
        ...(composed && x.composeLine === part ? { composed: true } : {}),
        ...(x.quran ? { quran: x.quran, quranLinks: x.quranLinks, read: x.read } : {}),
      },
    ]
  })
  return [...mine.filter((h) => !isNightDhikr(h.id)), ...mine.filter((h) => isNightDhikr(h.id))]
}

/** The box's words: the segments joined by a comma where the first does not end in one, nothing of ours between. */
export const boxText = (segs: string[]) => segs.reduce((acc, x) => (acc ? `${acc}${/[،,.؛:]$/.test(acc) ? ' ' : '، '}${x}` : x), '')

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
