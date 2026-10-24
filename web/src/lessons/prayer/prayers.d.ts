// Types for prayers.js (each prayer's definitions, add-on 0072-add13).
type Words = { ar: string; en: string }
export type SeqItem = {
  k: string
  r: number | null
  pos?: string
  cue?: string
  ev?: string[]
  do?: string
  title?: string
  tag?: string
  pose?: string
  feet?: string
  rulings?: string[]
  sit?: 1 | 2
  add?: string[]
  hide?: string[]
  khilaf?: string[]
}
export type PrayerDef = { id: string; batch?: number; time?: string | null; rakat: number; name: Words; recite: Words; rakahs?: string[]; seq: SeqItem[] }
export type PrayerSet = { v: 1; batch?: number; words: Record<string, Words>; steps?: unknown[]; hadith?: Record<string, unknown>; prayers: PrayerDef[] }
type Data = { steps: { key: string }[]; hadith: Record<string, unknown>; feet?: Record<string, unknown> }
export declare function resolveRef(ref: string, steps: unknown[]): Record<string, unknown> | null
export declare function validate(set: unknown, data: Data): string[]
export declare function mergeSets<T>(bundled: T, remote: unknown, data: Data): T
export declare function loadPrayers<T>(o: { bundled: T; data: Data; fetchJson: () => Promise<unknown> }): Promise<T>
export declare function buildSteps(p: PrayerDef, set: PrayerSet, steps: unknown[]): Record<string, unknown>[]
export declare const isBinbaz: (o: unknown) => boolean
