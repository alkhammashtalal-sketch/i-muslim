// Quick-access buttons in «يومك» (add-on 0072-add13 §3): which buttons, their routes, their order on this device, and
// the two looks Talal compares. Pure functions (no React), tested in worker/test/shortcuts-0072.test.ts.
//
// The switch (both looks from one build, for the shots): the build's VITE_SHORTCUTS (off | emoji | line) and
// VITE_SHORTCUTS_AT (times | cards), and the address's ?shortcuts= and ?shortcutsAt= over them. «off», the default
// until Talal chooses, keeps the «يومك» grid of eight as it was.

export const SHORTCUT_IDS = [
  'prayerLesson',
  'wuduLesson',
  'names',
  'tasbih',
  'adhkar',
  'quran',
  'qibla',
  'times',
  'calendar',
  'mosques',
  'goals',
  'ask',
] as const
export type ShortcutId = (typeof SHORTCUT_IDS)[number]

/** Each button's route. «ask» has none: it brings the question box on the home page into view and focuses it. */
export const SHORTCUT_PATHS: Record<ShortcutId, string | null> = {
  prayerLesson: '/today/lesson/prayer',
  wuduLesson: '/today/lesson/wudu',
  names: '/today/names',
  tasbih: '/today/tasbih',
  adhkar: '/today/adhkar',
  quran: '/quran',
  qibla: '/today/qibla',
  times: '/today/times',
  calendar: '/today/calendar',
  mosques: '/today/mosques',
  goals: '/today/goals',
  ask: null,
}

/** Look (a): the emoji Talal named (00:44). The Names of Allah have no emoji: the letter «ﷲ» in gold instead
 *  (nothing that concerns Allah is shown by a coloured symbol). Mosques and goals were not in his list: 📍 and 🎯 are
 *  proposed for his choice. */
export const SHORTCUT_EMOJI: Record<Exclude<ShortcutId, 'names'>, string> = {
  prayerLesson: '🕌',
  wuduLesson: '💧',
  tasbih: '📿',
  adhkar: '🤲',
  quran: '📖',
  qibla: '🧭',
  times: '🕰️',
  calendar: '📅',
  ask: '💬',
  mosques: '📍',
  goals: '🎯',
}
/** U+FDF2 ARABIC LIGATURE ALLAH ISOLATED FORM, set in Amiri. */
export const ALLAH_MARK = 'ﷲ'

export type ShortcutStyle = 'off' | 'emoji' | 'line'
export type ShortcutPlace = 'times' | 'cards'

const pick = <T extends string>(v: string | null | undefined, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined

/** The look in force: the address's ?shortcuts= over the build's VITE_SHORTCUTS, else «off». */
export function shortcutStyle(search: string, build?: string): ShortcutStyle {
  const q = new URLSearchParams(search).get('shortcuts')
  return pick(q, ['off', 'emoji', 'line'] as const) ?? pick(build, ['off', 'emoji', 'line'] as const) ?? 'off'
}

/** Where the grid stands: above the day's cards, under «اسأل» («cards», the default chosen by the shots: «اسأل» stays
 *  whole on the first screen of an SE), or under the next-prayer line, above «اسأل» («times»). */
export function shortcutPlace(search: string, build?: string): ShortcutPlace {
  const q = new URLSearchParams(search).get('shortcutsAt')
  return pick(q, ['times', 'cards'] as const) ?? pick(build, ['times', 'cards'] as const) ?? 'cards'
}

/** A stored order made whole: unknown and repeated ids dropped, and any id it lacks (a button added later) put back
 *  at its default place. */
export function normalizeOrder(stored: unknown, all: readonly ShortcutId[] = SHORTCUT_IDS): ShortcutId[] {
  const seen = new Set<ShortcutId>()
  const out: ShortcutId[] = []
  if (Array.isArray(stored))
    for (const v of stored)
      if (all.includes(v as ShortcutId) && !seen.has(v as ShortcutId)) {
        seen.add(v as ShortcutId)
        out.push(v as ShortcutId)
      }
  all.forEach((id, k) => {
    if (seen.has(id)) return
    // after the default neighbour that precedes it, if present; else first
    const before = all.slice(0, k).reverse().find((p) => seen.has(p))
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, id)
    seen.add(id)
  })
  return out
}

/** `order` with the item at `from` moved to `to` (both clamped). */
export function moveItem<T>(order: readonly T[], from: number, to: number): T[] {
  const out = order.slice()
  if (from < 0 || from >= out.length) return out
  const [x] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x)
  return out
}

export const isDefaultOrder = (order: readonly ShortcutId[], all: readonly ShortcutId[] = SHORTCUT_IDS) => order.join() === all.join()

export const ORDER_KEY = 'muslim.shortcuts.order.v1'

/** The order kept on this device, over the buttons this build has (`all`; a lesson not yet merged has none). Browser
 *  storage may be missing or refuse: the default order then. */
export function loadOrder(all: readonly ShortcutId[] = SHORTCUT_IDS): ShortcutId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return normalizeOrder(raw ? JSON.parse(raw) : null, all)
  } catch {
    return normalizeOrder(null, all)
  }
}

export function saveOrder(order: readonly ShortcutId[], all: readonly ShortcutId[] = SHORTCUT_IDS) {
  try {
    if (isDefaultOrder(order, all)) localStorage.removeItem(ORDER_KEY)
    else localStorage.setItem(ORDER_KEY, JSON.stringify(order))
  } catch {
    // storage refused: the order holds for this visit only
  }
}
