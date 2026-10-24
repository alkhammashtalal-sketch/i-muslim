// The luxury name card (add-on 0072-add11 §1): what it shows, in which order, and its small lines, apart from React so
// the rules are tested (worker/test/names-card-0072.test.ts). One design for the home («يومك») and the name's page.
//   The sections, in order, each only when there is something to show (present-only: a missing one is absent, never
//   filled): 1 الدليل, 2 معنى الاسم عند العلماء, 3 من أقوال السلف في الاسم, 4 أثره في قلبك, 5 ادعُ الله به, 6 تفسير الآية.
//   On the home the card opens with the header, the evidence, the first meaning quote and one saying of the Salaf; «أكمل
//   القراءة» shows the rest in place. The page shows it all.
import type { NameEnriched, NameQuote, NameReadings } from './name-day-api'

export const SECTIONS = ['evidence', 'meaning', 'salaf', 'heart', 'dua', 'tafsir'] as const
export type SectionKey = (typeof SECTIONS)[number]

/** «قال فلان» or «يُروى عن فلان» (add-on 0072-add4: «قال» for a connected chain, «يُروى عن» for any other). */
export const quoteAttribution = (q: Pick<NameQuote, 'attribution' | 'by'>): string => (q.attribution === 'yurwa' ? `يُروى عن ${q.by}` : `قال ${q.by}`)

/** «ج24، ص692» from the Shamela form «ج24 - ص692»; «ص99» as it is. */
export const quoteRef = (q: Pick<NameQuote, 'ref'>): string => q.ref.trim().replace(/\s*-\s*/g, '، ')

/** The author as read after «لـ»: «لابن جرير الطبري»، «لعبد الرحمن بن ناصر السعدي»، «لأبي سليمان الخطابي»، «للحليمي». */
export function authorBy(author: string): string {
  const a = author.trim()
  if (!a) return ''
  if (a.startsWith('أبو ')) return `لأبي ${a.slice(4)}`
  if (a.startsWith('ال')) return `ل${a.slice(1)}`
  return `ل${a}`
}

/** The source line before the link, as on the salaf card: «جامع البيان عن تأويل آي القرآن» لابن جرير الطبري، ج20، ص241. */
export function quoteSource(q: Pick<NameQuote, 'book' | 'author' | 'ref'>): string {
  const by = authorBy(q.author)
  const ref = quoteRef(q)
  return `«${q.book.trim()}»${by ? ` ${by}` : ''}${ref ? `، ${ref}` : ''}`
}

/** The link's words: the site the page is on, in Arabic as the source names itself (the card quotes Arabic books). */
export function quoteSite(url: string): string {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
  if (host === 'shamela.ws') return 'المكتبة الشاملة'
  if (host === 'quran.ksu.edu.sa') return 'المصحف الإلكتروني'
  return host
}

/** A quote the card may show: its words, who said it, the book, its author and place and a https link, as the rules ask;
 *  one whose context is required comes with it. Anything less is left out, never mended; at most three (§2). */
export function shownQuotes(list: unknown): NameQuote[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((q): q is NameQuote => {
      if (!q || typeof q !== 'object') return false
      const x = q as Record<string, unknown>
      const str = (k: string) => typeof x[k] === 'string' && (x[k] as string).trim().length > 0
      if (x.context_required && !str('context')) return false
      return str('text') && str('by') && str('book') && str('author') && typeof x.ref === 'string' && (x.attribution === 'qala' || x.attribution === 'yurwa') && typeof x.url === 'string' && /^https:\/\//.test(x.url)
    })
    .slice(0, 3)
}

/** «أثره في قلبك»: the rewrite when the server sends it (§3), in its paragraphs, else the readings as they are; or nothing. */
export function heartOf(d: NameEnriched & { readings?: NameReadings }): { kind: 'heart'; paragraphs: string[] } | { kind: 'readings'; readings: NameReadings } | null {
  const h = typeof d.heart === 'string' ? d.heart.split(/\n+/).map((p) => p.trim()).filter(Boolean) : []
  if (h.length) return { kind: 'heart', paragraphs: h }
  return d.readings ? { kind: 'readings', readings: d.readings } : null
}

/** What the card has, section by section; `lead` is what the home shows before «أكمل القراءة»: the first text of each
 *  of these sections, and the rest only once opened. */
export type CardPlan = { present: SectionKey[]; lead: SectionKey[]; more: boolean }
export function cardPlan(has: Record<SectionKey, number>, mode: 'home' | 'page'): CardPlan {
  const present = SECTIONS.filter((k) => has[k] > 0)
  if (mode === 'page') return { present, lead: present, more: false }
  // The home: the evidence (its first text), the first meaning quote, one saying of the Salaf. The three entries whose
  // only Quranic text is a dua the file lists (الحكم، المعطي، المنان) open with that dua instead, as the short card did.
  const first: SectionKey[] = has.evidence > 0 ? ['evidence'] : has.dua > 0 ? ['dua'] : []
  const lead = present.filter((k) => first.includes(k) || k === 'meaning' || k === 'salaf')
  const more = present.some((k) => !lead.includes(k)) || lead.some((k) => has[k] > 1)
  return { present, lead, more }
}

/** How many of a section's items the card shows: all when open (or on the page), the first alone in the home's lead. */
export const shownCount = (k: SectionKey, n: number, open: boolean, plan: CardPlan): number => (open || !plan.more ? n : plan.lead.includes(k) ? Math.min(1, n) : 0)

/** The Riyadh day's noon, for its Hijri date (the name turns with the Riyadh date). */
export const riyadhNoon = (day: string) => new Date(Date.parse(`${day}T12:00:00+03:00`))
