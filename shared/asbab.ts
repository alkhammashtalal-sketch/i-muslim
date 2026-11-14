// «سبب النزول» in the ayah panel (reply 0036 §أ): which HadeethEnc hadiths of category 14 «أسباب النزول» an ayah shows,
// from data/asbab-map.json (add-on 0033-add7, built by scripts/daily/asbab-build.mjs, no AI). Shared by the Worker
// (worker/src/asbab.ts reads the rows by key) and the app (the panel asks only for an ayah listed here; the native
// app's offline copy holds these hadiths). Only the `hadiths` part of the map is read: `outside_category` is a review
// list and is never shown, and `by_ayah` is rebuilt here from the entries the conditions keep, so an entry the
// coordinator marks `reviewed: true` (with its ayat) is shown at the next build without another step.
//
// An entry is shown when both hold (reply 0036 §أ «متى يظهر»):
//   1. it is linked by an accepted automatic method (the bracketed reference, the whole ayah text, or the longest run
//      with its margin: bracket, full_text, longest_run) and not set back to `reviewed: false`, or the coordinator
//      marked it `reviewed: true`;
//   2. its acceptance tier is 1–3 and its class is not `mixed` (tier X — weak, fabricated, mixed, for review — never).
// The texts, grades and takhrij are never here: they are read from D1 `hadiths` by id at display time.
import { hadiths } from '../data/asbab-map.json'

export type AsbabEntry = {
  ayat: string[]
  method: string
  tier: string
  class: string
  mawquf?: boolean
  reviewed?: boolean
}

export const ASBAB_METHODS: readonly string[] = ['bracket', 'full_text', 'longest_run']
export const ASBAB_TIERS: readonly string[] = ['1', '2', '3']
const AYAH_KEY = /^quran:(\d{1,3}):(\d{1,3})$/

/** Whether an entry of the map's `hadiths` may be shown (the two conditions above). */
export function asbabShown(e: AsbabEntry): boolean {
  const linked = e.reviewed === true || (e.reviewed !== false && ASBAB_METHODS.includes(e.method))
  return linked && ASBAB_TIERS.includes(e.tier) && e.class !== 'mixed' && Array.isArray(e.ayat) && e.ayat.length > 0
}

/** Ayah key (`quran:S:A`) → the ids it shows, the soundest first (tier 1, 2, 3; then HadeethEnc's id), as rule 10
 *  puts the sahih first. Built from the entries alone; anything outside them (the review list) is never read. */
export function asbabIndex(entries: Record<string, AsbabEntry>): Record<string, string[]> {
  const by: Record<string, { id: string; tier: string }[]> = {}
  for (const [id, e] of Object.entries(entries)) {
    if (!/^\d{1,7}$/.test(id) || !asbabShown(e)) continue
    for (const k of new Set(e.ayat)) if (AYAH_KEY.test(k)) (by[k] ??= []).push({ id, tier: e.tier })
  }
  const out: Record<string, string[]> = {}
  for (const k of Object.keys(by)) out[k] = by[k].sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id)).map((x) => x.id)
  return out
}

export const ASBAB_INDEX: Readonly<Record<string, string[]>> = asbabIndex(hadiths as Record<string, AsbabEntry>)

/** The ids an ayah shows, in order; none for an ayah without an accepted link (then the panel has no section). */
export const asbabIds = (sura: number, aya: number): string[] => ASBAB_INDEX[`quran:${sura}:${aya}`] ?? []

/** Every id shown somewhere, ascending (the native app's offline copy holds these). */
export const ASBAB_ALL_IDS: readonly string[] = [...new Set(Object.values(ASBAB_INDEX).flat())].sort((a, b) => Number(a) - Number(b))

/** Several hadiths for one ayah (reply 0036 §أ): the first is shown, the others fold under «أحاديث أخرى في نزولها (n)». */
export function asbabFold<T>(items: readonly T[]): { first: T | null; folded: T[] } {
  return { first: items[0] ?? null, folded: items.slice(1) }
}
