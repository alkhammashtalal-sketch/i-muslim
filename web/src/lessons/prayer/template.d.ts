// Types for template.js (the one template of each prayer's steps, add-on 0072-add13); build time and tests only.
import type { PrayerSet, SeqItem } from './prayers'
export declare const PRAYERS: { id: string; time: string; row: number; rakat: number; recite: ('jahr' | 'sirr')[]; ev: Record<string, string> }[]
export declare const WORDS: Record<string, { ar: string; en: string }>
export declare const MODES: ('solo' | 'follower')[]
export declare const TEXTS_KEY: string
export declare function sequence(p: (typeof PRAYERS)[number], mode?: 'solo' | 'follower'): SeqItem[]
export declare function textsStep(texts: unknown, words?: Record<string, { ar: string; en: string }>): Record<string, unknown>
export declare function definitions(data: unknown, texts: unknown): PrayerSet
