// Types for template.js (the one template of each prayer's steps, add-on 0072-add13); build time and tests only.
import type { PrayerSet, SeqItem } from './prayers'
export declare const PRAYERS: { id: string; time: string; row: number; rakat: number; recite: ('jahr' | 'sirr')[]; ev: Record<string, string> }[]
export declare const WORDS: Record<string, { ar: string; en: string }>
export declare function sequence(p: (typeof PRAYERS)[number]): SeqItem[]
export declare function definitions(data: unknown): PrayerSet
