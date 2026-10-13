// The adhkar categories and highlight rules (reply 0031-add16 §2), kept free of imports so the Worker
// (worker/src/adhkar.ts) and the coordinator's review list (scripts/daily/adhkar-review.mjs, run by Node with its type
// stripping) serve and list the very same hadiths and highlights:
//   1. A highlight is a list of segments, each a verbatim part of the hadith's Arabic text (diacritics, tatweel and
//      joiners removed on both sides), in the text's order and not overlapping.
//   2. All or nothing: a segment not found that way leaves the hadith with no highlight at all, so a dhikr cut by the
//      narrator's words is never shown half highlighted.
//   3. A hadith whose Arabic text has more than one «…» pair is shown without a highlight until the coordinator has
//      reviewed its entry (`reviewed: true`, set by that review only). So is an entry with `hold`, where the text has
//      one pair yet the dhikr goes on outside it in the narrator's words, or part of it is only described (10947,
//      10948): the count of pairs cannot see those, so the entry says it, with the question put to the coordinator.

/** The categories, in the reply's order, with their HadeethEnc titles in Arabic (categories/list, 13 October). */
export const ADHKAR_CATEGORIES = [
  { id: '301', ar: 'أذكار الصباح والمساء' },
  { id: '465', ar: 'أذكار الصلاة' },
  { id: '313', ar: 'الأدعية المأثورة' },
  { id: '302', ar: 'الأذكار المطلقة' },
  { id: '303', ar: 'أذكار الدخول والخروج من المنزل' },
  { id: '306', ar: 'أذكار الدخول والخروج من المسجد' },
  { id: '307', ar: 'الأذكار التي تقال في أوقات الشدة' },
  { id: '308', ar: 'الأذكار للأمور العارضة' },
] as const
/** At most this many hadiths per category: the first by hadith_categories' key (category, id), ids compared as text. */
export const MAX = 60

/** `hold`: why the entry waits for the coordinator's review though its text has at most one «…» pair (rule 3). */
export type HighlightEntry = { id: string; segments: string[]; reviewed: boolean; hold?: string }
export type HighlightStatus = 'shown' | 'pending_review' | 'not_verbatim' | 'none'

export const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()

/** The number of «…» pairs in the text (a pair nested in another counts once, with the outer one). */
export function quotePairs(text: string): number {
  let depth = 0
  let n = 0
  for (const ch of text) {
    if (ch === '«') depth++
    else if (ch === '»' && depth > 0 && --depth === 0) n++
  }
  return n
}

/** Where each segment starts in the stripped text, or null unless every one is there, in order, without overlap.
 *  Each segment's first occurrence is the one taken, as the app's highlighter takes it (web/src/v2/daily/verbatim.ts). */
export function locateSegments(text: string, segments: string[]): number[] | null {
  if (!segments.length) return null
  const plain = strip(text)
  const at: number[] = []
  let end = 0
  for (const seg of segments) {
    const p = strip(seg)
    const k = p ? plain.indexOf(p) : -1
    if (k < end) return null
    at.push(k)
    end = k + p.length
  }
  return at
}

/** The segments the app may highlight in this hadith, and why (rule 3 before rules 1 and 2). */
export function highlightFor(text: string, entry: HighlightEntry | undefined): { segments: string[]; status: HighlightStatus } {
  if (!entry) return { segments: [], status: 'none' }
  if ((quotePairs(text) > 1 || !!entry.hold) && entry.reviewed !== true) return { segments: [], status: 'pending_review' }
  if (!locateSegments(text, entry.segments)) return { segments: [], status: 'not_verbatim' }
  return { segments: entry.segments, status: 'shown' }
}
