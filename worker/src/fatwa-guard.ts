// The fatwa guard (add-on 0072-add69 §2, Talal 1 November 15:00: «موافق», on condition of a solution that causes no
// problems later): the last step before anything of «اسأل» is shown, for the fix «fatwa-ref» and for any generated text.
//   - A fatwa a referral carries (FatwaQuote) is read again from D1 by its key: it must exist, be general, and have the
//     same site and number; its link is the stored link of that row, never anything else.
//   - A fatwa number in a generated sentence (direct, explanation, «بسّط لي») must be a fatwa of our index (fatwas,
//     migration 0018; data/processed/fatwas.jsonl) with that number: binbaz.org.sa's numbers are its keys
//     (fatwa:binbaz:<number>), and binothaimeen.net shows none. A link in such a sentence becomes the stored link of
//     that fatwa; a fatwa site's link that names no fatwa of ours, or a number not in the index, and the sentence is
//     removed. Nothing unmatched is shown.
//   - What was removed is logged by count and number only (evt fatwa_guard): never the question (CLAUDE.md §7).
// Reads: one D1 query by the primary key (id IN …), only when a sentence names a fatwa or a fatwa site; none else
// (CLAUDE.md §12). A table missing or a failed read verifies nothing: every number is removed (fails closed).
import type { FatwaQuote, Sentence } from '../../shared/api'
import type { Env } from './index'

export type StoredFatwa = { id: string; site: string; number: string | null; url: string; general: number }
export type FatwaLookup = (ids: string[]) => Promise<Map<string, StoredFatwa>>
/** What the guard did, for the logs and the evaluation runner: the numbers removed, the links set from the index. */
export type GuardNote = { dropped: string[]; relinked: number; removedSentences: number; quoteDropped?: boolean }

const DIGITS = '0-9٠-٩۰-۹০-৯०-९'
const NUM = new RegExp(`[${DIGITS}]+`, 'gu')
// «فتوى» and its forms in the ten languages: Arabic, Urdu (فتویٰ), the Latin forms (fatwa, fetva, fatoua, fatua, fetua),
// Bengali (ফতোয়া, ফাতওয়া), Hindi (फ़तवा, फतवे).
const AR_WORD = 'فتو[ىيی]ٰ?|فتوا(?:ه|ها|هم)|فتاو[ىيی]ٰ?'
const WORD = new RegExp(
  `(?:${AR_WORD}|\\bfat[wv][aāâ]h?s?\\b|\\bfetva\\w*|\\bfatou?as?\\b|\\bfetuas?\\b|\\bfatuas?\\b|ফা?ত[োও](?:য়|য়?)া|(?:फ़|फ़?)तव[ाेो])`,
  'giu',
)
/** «رقم ١٤٣٢ من فتاوى …»: a number just before the word, after «رقم» or «no.». */
const BEFORE = new RegExp(`(?:رقم|رقمها|no\\.?|number|nomor|numara|n[°º]|#)\\s*([${DIGITS}]+)[^${DIGITS}]{0,16}$`, 'iu')
/** How far after the word a number still belongs to it («فتوى الشيخ ابن باز رقم ١٤٣٢»). */
const WINDOW = 48
const URL_RE = /(?:https?:\/\/|www\.)[^\s«»"'()<>]+|\b(?:binbaz\.org\.sa|binothaimeen\.net|alifta\.gov\.sa|alifta\.net)[^\s«»"'()<>]*/giu
const FATWA_SITE = /(?:^|[/.])(?:binbaz\.org\.sa|binothaimeen\.net|alifta\.gov\.sa|alifta\.net)(?:[/?#:]|$)/i
const BINBAZ_PATH = /binbaz\.org\.sa\/fatwas\/(\d+)/i
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const ascii = (s: string) =>
  s.replace(/[٠-٩۰-۹০-৯०-९]/gu, (c) => {
    const x = c.codePointAt(0)!
    const zero = x >= 0x09e6 ? 0x09e6 : x >= 0x0966 ? 0x0966 : x >= 0x06f0 ? 0x06f0 : 0x0660
    return String(x - zero)
  })
const canon = (n: string) => ascii(n).replace(/^0+(?=\d)/, '')
const trimUrl = (u: string) => u.replace(/[.,،؛:!؟?]+$/u, '')

/** What one sentence claims: the fatwa numbers it names after the word «فتوى», and its links. */
export function claimsOf(text: string): { numbers: string[]; urls: string[] } {
  const urls = [...text.matchAll(URL_RE)].map((m) => trimUrl(m[0]))
  // Numbers inside a link are the link's, not the sentence's.
  const bare = urls.reduce((t, u) => t.split(u).join(' '), text)
  const numbers = new Set<string>()
  for (const m of bare.matchAll(WORD)) {
    // «no.» and «nr.» are not a sentence's end.
    const after = bare.slice(m.index! + m[0].length, m.index! + m[0].length + WINDOW).replace(/\b(no|nr|núm|num)\./giu, '$1 ')
    // Up to the end of the sentence or the next «فتوى».
    const stop = after.search(new RegExp(`[.؟?!؛।۔\\n]|${AR_WORD}|fat[wv]a|fetva`, 'iu'))
    for (const n of (stop >= 0 ? after.slice(0, stop) : after).match(NUM) ?? []) numbers.add(canon(n))
    const before = BEFORE.exec(bare.slice(Math.max(0, m.index! - 32), m.index!))
    if (before) numbers.add(canon(before[1]))
  }
  return { numbers: [...numbers], urls }
}

/** The index keys a link names: binbaz.org.sa's /fatwas/<number>/, binothaimeen.net's own id. */
function keysOfUrl(u: string): string[] {
  const b = BINBAZ_PATH.exec(u)
  if (b) return [`fatwa:binbaz:${canon(b[1])}`]
  const t = /binothaimeen\.net/i.test(u) ? UUID.exec(u) : null
  return t ? [`fatwa:binothaimeen:${t[0].toLowerCase()}`] : []
}

/** The keys a sentence's claims need from the index. */
export function keysOf(texts: string[]): string[] {
  const keys = new Set<string>()
  for (const t of texts) {
    const c = claimsOf(t)
    for (const n of c.numbers) keys.add(`fatwa:binbaz:${n}`)
    for (const u of c.urls) for (const k of keysOfUrl(u)) keys.add(k)
  }
  return [...keys]
}

/** One sentence through the guard: null when it names a fatwa not in the index (or a fatwa site's link that names
 *  none), else its text with every link set to the stored link of the fatwa it names. */
export function guardText(text: string, index: Map<string, StoredFatwa>, note: GuardNote): string | null {
  const { numbers, urls } = claimsOf(text)
  if (!numbers.length && !urls.some((u) => FATWA_SITE.test(u) || keysOfUrl(u).length)) return text
  const missing = numbers.filter((n) => !index.get(`fatwa:binbaz:${n}`)?.number)
  if (missing.length) {
    note.dropped.push(...missing)
    note.removedSentences++
    return null
  }
  const named = numbers.map((n) => index.get(`fatwa:binbaz:${n}`)!)
  let out = text
  for (const u of urls) {
    const fromUrl = keysOfUrl(u).map((k) => index.get(k)).filter((x): x is StoredFatwa => !!x)
    // The fatwa the link is for: the one its path names, else the one fatwa the sentence names.
    const target = fromUrl.find((f) => !named.length || named.includes(f)) ?? (named.length === 1 ? named[0] : null)
    if (!target) {
      if (FATWA_SITE.test(u) || named.length) {
        // A link to a fatwa that is not ours, or a sentence naming several with a link for none of them.
        note.dropped.push(...keysOfUrl(u).map((k) => k.split(':').pop()!))
        note.removedSentences++
        return null
      }
      continue // a link that is not about a fatwa: not this guard's
    }
    if (u !== target.url) note.relinked++
    out = out.split(u).join(target.url)
  }
  return out
}

/** The fatwas the keys name, from D1 by the primary key; a failed read (no table) finds none. */
export const d1Lookup =
  (env: Env): FatwaLookup =>
  async (ids) => {
    if (!ids.length) return new Map()
    try {
      const r = await env.DB.prepare(`SELECT id, site, number, url, general FROM fatwas WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .all<StoredFatwa>()
      return new Map(r.results.map((x) => [x.id, x]))
    } catch {
      return new Map()
    }
  }

const emptyNote = (): GuardNote => ({ dropped: [], relinked: 0, removedSentences: 0 })
const changed = (n: GuardNote) => n.dropped.length > 0 || n.relinked > 0 || n.removedSentences > 0 || n.quoteDropped === true

/** The log line: where, how many, which numbers; never the question (CLAUDE.md §7). */
export function logGuard(where: 'answer' | 'referral' | 'explain', g: GuardNote): void {
  if (!changed(g)) return
  console.log(JSON.stringify({ evt: 'fatwa_guard', where, removed: g.removedSentences, dropped: g.dropped.slice(0, 10), relinked: g.relinked, ...(g.quoteDropped ? { quote: 'dropped' } : {}) }))
}

/** The generated sentences of an answer (direct, explanation) through the guard. A direct sentence removed leaves the
 *  texts shown without it; an explanation sentence removed is gone, as rule 6 drops one without a witness. */
export async function guardSentences(
  lookup: FatwaLookup,
  s: { direct?: Sentence; explanation: Sentence[] },
): Promise<{ direct?: Sentence; explanation: Sentence[]; note: GuardNote }> {
  const note = emptyNote()
  const texts = [...(s.direct ? [s.direct.text] : []), ...s.explanation.map((x) => x.text)]
  const keys = keysOf(texts)
  // Nothing names a fatwa or a fatwa site: no read at all.
  if (!keys.length && !texts.some((t) => claimsOf(t).urls.some((u) => FATWA_SITE.test(u)))) return { ...s, note }
  const index = await lookup(keys)
  const one = (x: Sentence) => {
    const t = guardText(x.text, index, note)
    return t === null ? null : { ...x, text: t }
  }
  const direct = s.direct ? one(s.direct) : null
  const explanation = s.explanation.map(one).filter((x): x is Sentence => x !== null)
  return { ...(direct ? { direct } : {}), explanation, note }
}

/** A free text («بسّط لي»), sentence by sentence: what names a fatwa not ours is removed; null when nothing is left. */
export async function guardFreeText(lookup: FatwaLookup, text: string): Promise<{ text: string | null; note: GuardNote }> {
  const note = emptyNote()
  // Split after each sentence's mark, its spacing kept with the next, so a text with nothing removed is unchanged.
  const parts = text.split(/(?<=[.؟?!؛।۔])(?=\s|$)|(?<=\n)/u)
  const keys = keysOf(parts)
  if (!keys.length && !parts.some((t) => claimsOf(t).urls.some((u) => FATWA_SITE.test(u)))) return { text, note }
  const index = await lookup(keys)
  const kept = parts.map((p) => guardText(p, index, note)).filter((p): p is string => p !== null)
  const out = kept.join('').trim()
  return { text: out || null, note }
}

/** The fatwa a referral carries, checked against its own row: present, general, the same site and number, and its key
 *  the site's own (fatwa:binbaz:<number>). Its link is the stored one. Anything else: no fatwa is shown. */
export function guardQuote(q: FatwaQuote, row: StoredFatwa | undefined): FatwaQuote | null {
  if (!row || row.id !== q.id || row.general !== 1 || row.site !== q.site) return null
  if ((row.number ?? null) !== (q.number ?? null)) return null
  if (row.site === 'binbaz.org.sa' && (!row.number || row.id !== `fatwa:binbaz:${canon(row.number)}`)) return null
  if (!/^https:\/\//.test(row.url)) return null
  return { ...q, url: row.url }
}

/** The referral's fatwa through the guard, by one read of its key. */
export async function guardReferralFatwa(lookup: FatwaLookup, q: FatwaQuote): Promise<{ quote: FatwaQuote | null; note: GuardNote }> {
  const note = emptyNote()
  const row = (await lookup([q.id])).get(q.id)
  const quote = guardQuote(q, row)
  if (!quote) {
    note.quoteDropped = true
    if (q.number) note.dropped.push(canon(q.number))
  } else if (quote.url !== q.url) note.relinked++
  return { quote, note }
}
