// Quick-access buttons in «يومك» (add-on 0072-add13 §3): which buttons, their routes, their order on this device, and
// the two looks Talal compares. Pure functions (no React), tested in worker/test/shortcuts-0072.test.ts.
//
// Talal's choice (add-on 0072-add15): look (a), the emoji, under «اسأل» above the day's cards, 📍 for the mosques and
// 🎯 for the goals; «أذكار المواقف» stays a card under the grid. The buttons stay off (SHORTCUTS_ON) until he has seen
// the shots of the «ﷲ» fix: the «يومك» grid of eight as it was. The build's VITE_SHORTCUTS (off | emoji | line) and
// VITE_SHORTCUTS_AT (times | cards), and the address's ?shortcuts= and ?shortcutsAt= over them, still show either look
// in either place, for the review.

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

/** The calendar (add-on 0072-add15 §📅): 📅 prints «JUL 17» (Apple) or «July 17» (Noto) inside the Arabic interface,
 *  and 🗓️ too prints «JUL» on its spiral pad in Apple Color Emoji (iOS 18.5 simulator, relay/w1/0072-shortcuts/fix/).
 *  So the crescent, for the Hijri calendar. */
export const CALENDAR_EMOJI = '🌙'
/** Emoji drawn with Latin letters in Apple Color Emoji or Noto Color Emoji: never in the grid. */
export const LATIN_EMOJI = ['📅', '🗓️', '🗓', '🆗', '🆕', '🆓', '🔙', '🔚', '🔛', '🔜', '🔝', '🆒', '🆙', '🆘'] as const

/** Look (a): the emoji Talal named (00:44), his choice (add-on 0072-add15). The Names of Allah have no emoji: the
 *  letter «ﷲ» in gold instead (nothing that concerns Allah is shown by a coloured symbol). Mosques 📍 and goals 🎯 as
 *  proposed, approved in add15 §3. The calendar: see CALENDAR_EMOJI. */
export const SHORTCUT_EMOJI: Record<Exclude<ShortcutId, 'names'>, string> = {
  prayerLesson: '🕌',
  wuduLesson: '💧',
  tasbih: '📿',
  adhkar: '🤲',
  quran: '📖',
  qibla: '🧭',
  times: '🕰️',
  calendar: CALENDAR_EMOJI,
  ask: '💬',
  mosques: '📍',
  goals: '🎯',
}
/** U+FDF2 ARABIC LIGATURE ALLAH ISOLATED FORM: drawn from Amiri's own outline (allah-mark.ts), not set as text. */
export const ALLAH_MARK = 'ﷲ'

/** «ﷲ» in its well (add-on 0072-add15). As text it rose out of the well: its ascenders stand above the font's box, so
 *  no font size keeps it inside. It is Amiri's outline instead, placed by its measured bounds, in fractions of the well
 *  (so it does not grow with the text size: the well is 44 px whatever the setting):
 *  - every side keeps at least ALLAH_MIN_MARGIN of the well; the placement aims at ALLAH_MARGIN, a little more, so the
 *    edge's anti-aliasing stays inside the minimum on the pixels too;
 *  - the optical centre, put at the well's centre, is ALLAH_PULL of the way from the box's centre to the centre of
 *    mass: on the mass alone the tall thin ascenders bind the size and the letter is half the emoji's weight; on the
 *    box alone the heavy bowl sits low;
 *  - ALLAH_STROKE (font units) of the same gold around the outline, so its weight is near the emoji beside it. */
export const ALLAH_MIN_MARGIN = 0.14
export const ALLAH_MARGIN = 0.15
export const ALLAH_PULL = 0.5
export const ALLAH_STROKE = 24

export type WellBox = { left: number; top: number; width: number; height: number }

/** The outline's drawn box (its measured bounds widened by half the stroke) in the well, as fractions of the well, and
 *  the viewBox that maps it. `box` and `mass` are the outline's measured size and centre of mass (allah-mark.ts). */
export function allahPlacement(
  box: { w: number; h: number },
  mass: { x: number; y: number },
  o: { margin?: number; pull?: number; stroke?: number } = {},
): WellBox & { viewBox: string; centre: { x: number; y: number }; massAt: { x: number; y: number } } {
  const margin = o.margin ?? ALLAH_MARGIN
  const pull = o.pull ?? ALLAH_PULL
  const sw = o.stroke ?? ALLAH_STROKE
  const w = box.w + sw
  const h = box.h + sw
  const mx = (mass.x + sw / 2) / w
  const my = (mass.y + sw / 2) / h
  // the optical centre within the drawn box, as fractions of it
  const ox = 0.5 + pull * (mx - 0.5)
  const oy = 0.5 + pull * (my - 0.5)
  const aspect = w / h
  // the largest height for which every side keeps `margin` with (ox, oy) at the well's centre
  const height = (0.5 - margin) / Math.max(oy, 1 - oy, ox * aspect, (1 - ox) * aspect)
  const width = height * aspect
  const left = 0.5 - ox * width
  const top = 0.5 - oy * height
  return {
    left,
    top,
    width,
    height,
    viewBox: `${-sw / 2} ${-sw / 2} ${w} ${h}`,
    centre: { x: left + ox * width, y: top + oy * height },
    massAt: { x: left + mx * width, y: top + my * height },
  }
}

export type ShortcutStyle = 'off' | 'emoji' | 'line'
export type ShortcutPlace = 'times' | 'cards'

const pick = <T extends string>(v: string | null | undefined, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined

/** Talal's look (add-on 0072-add15 §1). */
export const SHORTCUTS_LOOK: Exclude<ShortcutStyle, 'off'> = 'emoji'
/** The one line that turns the buttons on, once Talal has seen the «ﷲ» fix (add-on 0072-add15: «أراجعها، ثم تُشغَّل
 *  الأزرار»): true. Off, the «يومك» grid of eight stays. */
export const SHORTCUTS_ON: boolean = false

/** The look in force: the address's ?shortcuts= over the build's VITE_SHORTCUTS, else Talal's look when the buttons
 *  are on, else «off». */
export function shortcutStyle(search: string, build?: string, on: boolean = SHORTCUTS_ON): ShortcutStyle {
  const q = new URLSearchParams(search).get('shortcuts')
  return pick(q, ['off', 'emoji', 'line'] as const) ?? pick(build, ['off', 'emoji', 'line'] as const) ?? (on ? SHORTCUTS_LOOK : 'off')
}

/** Talal's place (add-on 0072-add15 §2): under «اسأل», above the day's cards. */
export const SHORTCUTS_PLACE: ShortcutPlace = 'cards'

/** Where the grid stands: above the day's cards, under «اسأل» («cards», Talal's choice: «اسأل» stays whole on the
 *  first screen of an SE), or under the next-prayer line, above «اسأل» («times»). */
export function shortcutPlace(search: string, build?: string): ShortcutPlace {
  const q = new URLSearchParams(search).get('shortcutsAt')
  return pick(q, ['times', 'cards'] as const) ?? pick(build, ['times', 'cards'] as const) ?? SHORTCUTS_PLACE
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
