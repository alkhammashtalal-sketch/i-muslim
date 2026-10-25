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
  // add-on 0072-add17
  boxes?: string[]
  before?: string[]
  notes?: { at: 'cue' | 'do' | 'say'; topic?: string; refs: string[] }[]
  say?: { kind: 'binbaz'; texts: string[]; en?: string }
}
export type PrayerDef = { id: string; batch?: number; time?: string | null; rakat: number; name: Words; recite: Words; rakahs?: string[]; seq: SeqItem[]; follower?: SeqItem[] }
export type PrayerSet = { v: 1; batch?: number; words: Record<string, Words>; steps?: unknown[]; hadith?: Record<string, unknown>; prayers: PrayerDef[] }
type Data = { steps: { key: string }[]; hadith: Record<string, unknown>; feet?: Record<string, unknown> }
export declare function resolveRef(ref: string, steps: unknown[]): Record<string, unknown> | null
export declare function validate(set: unknown, data: Data): string[]
export declare function mergeSets<T>(bundled: T, remote: unknown, data: Data): T
export declare function loadPrayers<T>(o: { bundled: T; data: Data; fetchJson: () => Promise<unknown> }): Promise<T>
export declare function buildSteps(p: PrayerDef, set: PrayerSet, steps: unknown[], mode?: 'solo' | 'follower'): Record<string, unknown>[]
export declare function practiceBeats(steps: Record<string, unknown>[]): { st: Record<string, unknown>; kind: 'binbaz' | 'do' | 'ayah' | 'hadith'; r?: Record<string, unknown>; id?: string; say?: Record<string, unknown>; en?: Record<string, unknown> | null; example?: boolean }[]
export declare const isBinbaz: (o: unknown) => boolean
