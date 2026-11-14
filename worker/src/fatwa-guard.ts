// The fatwa guard (add-on 0072-add69 §2, Talal 1 November 15:00: «موافق», on condition of a solution that causes no
// problems later): the last step before anything of «اسأل» is shown, for the fix «fatwa-ref» and for any generated text.
//   - A fatwa a referral carries (FatwaQuote) is read again from D1 by its key: it must exist, be general, and have the
//     same site and number; its link is the stored link of that row, never anything else.
//   - A generated sentence (direct, explanation, «بسّط لي») about a fatwa (the word in the ten languages, Ibn Baz, Ibn
//     ʿUthaymin, the Permanent Committee) has every number in it checked against our index (fatwas, migration 0018;
//     data/processed/fatwas.jsonl): binbaz.org.sa's numbers are its keys (fatwa:binbaz:<number>); binothaimeen.net
//     shows none and the Permanent Committee is not indexed, so a number under either is not ours. A link in generated
//     text is kept only as the stored link of the fatwa it or its sentence names; any other link, and any number not
//     ours, and the sentence is removed. Nothing unmatched is shown; it fails closed (a percentage or a decimal is not
//     taken for a number).
//   - What was removed is logged by count and number only (evt fatwa_guard): never the question (CLAUDE.md §7).
// Reads: one D1 query by the primary key (id IN …), only when a sentence holds a number about a fatwa or a link; none else
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
/** A sentence is about a fatwa when it names one (the word), a fatwa site, a scholar whose fatwas are published, or the
 *  Permanent Committee: in such a sentence every number is a claim to check (review of add69, finding 2). */
const SCHOLAR_BAZ = /(?:ابن|بن|ابنِ)\s*باز|\b(?:ib[nb]|bin)[\s-]*b[aāâ]{1,2}z\b|(?:ইবনে|বিন)\s*বা[যজ]|(?:इब्न|बिन)\s*बा[ज़जज़]/iu
const SCHOLAR_OTHER = /عثيمين|العثيمين|عثیمین|اللجنة\s*الدائمة|لجنہ|u[tṯ]h?a[iy]m[ie]{1,2}n|uthaim|othaim|permanent\s+committee|lajnah|উসাইমীন|উছাইমীন|उसैमीन|उथैमीन|binothaimeen|alifta/iu
/** Any link written by the model: a scheme, «www.», or a bare domain (binbaz.org/…, islamqa.info/…). */
const URL_RE = /(?:https?:\/\/|www\.)[^\s«»"'()<>]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s«»"'()<>]*|\b(?:binbaz\.org(?:\.sa)?|binothaimeen\.net|alifta\.gov\.sa|alifta\.net|islamqa\.info|dorar\.net)\b/giu
const BINBAZ_PATH = /binbaz\.org\.sa\/fatwas\/(\d+)/i
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
/** A number that is plainly no fatwa's: a percentage of at most two digits (2.5%, ٢٫٥ بالمئة). */
const NOT_A_NUMBER = new RegExp(`(?<![${DIGITS}.,٫٬])[${DIGITS}]{1,2}(?:[.,٫][${DIGITS}]{1,2})?\\s*(?:%|٪|بالمئة|بالمائة|في المئة|percent|persen|pour cent|por ciento|yüzde)`, 'giu')
/** «9,999», «12.345», «١٢٬٣٤٥»: one number with its thousands separator, checked whole (review round 2, finding 1). */
const THOUSANDS = new RegExp(`([${DIGITS}])[,.٬٫'’ ](?=[${DIGITS}]{3}(?![${DIGITS}]))`, 'gu')
/** A number given as a reference («رقمها 9999», «no. 9999»): a claim in any sentence of a text that is about a fatwa. */
const REF_NUM = new RegExp(`(?:رقم|رقمها|رقمه|number|no\\.?|nr\\.?|n[°º]\\.?|nomor|numara|numéro|número|نمبر|নং|নম্বর|संख्या|नंबर)\\s*(?:is|was|est|es|era|adalah|ialah|:|هو|هي|=|ہے)?\\s*([${DIGITS}]+)`, 'giu')

const ascii = (s: string) =>
  s.replace(/[٠-٩۰-۹০-৯०-९]/gu, (c) => {
    const x = c.codePointAt(0)!
    const zero = x >= 0x09e6 ? 0x09e6 : x >= 0x0966 ? 0x0966 : x >= 0x06f0 ? 0x06f0 : 0x0660
    return String(x - zero)
  })
const canon = (n: string) => ascii(n).replace(/^0+(?=\d)/, '')
const trimUrl = (u: string) => u.replace(/[.,،؛:!؟?]+$/u, '')

/** What one sentence claims. `numbers`: every number in a sentence about a fatwa (links aside); `urls`: every link;
 *  `other`: it names a scholar or body whose fatwas we hold no numbers of (Ibn ʿUthaymin, the Permanent Committee). */
export function claimsOf(text: string, inFatwaText = false): { numbers: string[]; urls: string[]; other: boolean; about: boolean } {
  const urls = [...text.matchAll(URL_RE)].map((m) => trimUrl(m[0]))
  // Numbers inside a link are the link's, not the sentence's.
  const bare = urls.reduce((t, u) => t.split(u).join(' '), text)
  WORD.lastIndex = 0
  const other = SCHOLAR_OTHER.test(bare)
  const about = WORD.test(bare) || SCHOLAR_BAZ.test(bare) || other
  WORD.lastIndex = 0
  const numbers = new Set<string>()
  const joined = bare.replace(THOUSANDS, '$1')
  if (about) for (const n of joined.replace(NOT_A_NUMBER, ' ').match(NUM) ?? []) numbers.add(canon(n))
  // Another sentence of the same text names the fatwa («لابن باز فتوى في ذلك. ورقمها 9999.»; round 2, finding 2).
  else if (inFatwaText) for (const m of joined.matchAll(REF_NUM)) numbers.add(canon(m[1]))
  return { numbers: [...numbers], urls, other, about }
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
  const ctx = aboutAny(texts)
  for (const t of texts) {
    const c = claimsOf(t, ctx)
    if (!c.other) for (const n of c.numbers) keys.add(`fatwa:binbaz:${n}`)
    for (const u of c.urls) for (const k of keysOfUrl(u)) keys.add(k)
  }
  return [...keys]
}
/** Whether any sentence of a text is about a fatwa: then a reference number in the others is a claim too. */
const aboutAny = (texts: string[]) => texts.some((t) => claimsOf(t).about)
const needsGuard = (texts: string[]) => texts.some((t) => {
  const c = claimsOf(t, aboutAny(texts))
  return c.numbers.length > 0 || c.urls.length > 0
})

/** One sentence through the guard: null when it names a fatwa number not in our index (or a number under a scholar or
 *  body whose fatwas carry none in it), or holds a link that is not the stored link of a fatwa it names; else its text
 *  with each link set to the stored one. Generated text has no link of its own: every link comes from D1. */
export function guardText(text: string, index: Map<string, StoredFatwa>, note: GuardNote, inFatwaText = false): string | null {
  const { numbers, urls, other } = claimsOf(text, inFatwaText)
  if (!numbers.length && !urls.length) return text
  const drop = (nums: string[]) => {
    note.dropped.push(...nums)
    note.removedSentences++
    return null
  }
  // Ibn ʿUthaymin's site shows no numbers, and the Permanent Committee is not in the index: a number there is not ours.
  if (other && numbers.length) return drop(numbers)
  const missing = numbers.filter((n) => !index.get(`fatwa:binbaz:${n}`)?.number)
  if (missing.length) return drop(missing)
  const named = numbers.map((n) => index.get(`fatwa:binbaz:${n}`)!)
  let out = text
  for (const u of urls) {
    const fromUrl = keysOfUrl(u).map((k) => index.get(k)).filter((x): x is StoredFatwa => !!x)
    // The fatwa the link is for: the one its path names (and the sentence, if it names any), else the one it names.
    const target = fromUrl.find((f) => !named.length || named.includes(f)) ?? (fromUrl.length ? null : named.length === 1 ? named[0] : null)
    if (!target) return drop(keysOfUrl(u).map((k) => k.split(':').pop()!))
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
  if (!needsGuard(texts)) return { ...s, note }
  const index = await lookup(keys)
  const ctx = aboutAny(texts)
  const one = (x: Sentence) => {
    const t = guardText(x.text, index, note, ctx)
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
  // «no. 9999», «ج. ١٢»: an abbreviation's point does not end the sentence (review of add69, finding 1).
  const parts: string[] = []
  for (const p of text.split(/(?<=[.؟?!؛।۔])(?=\s|$)|(?<=\n)/u)) {
    // Merged only when a number follows («no. 9999», «p. 12»), so «The answer is no. Pray.» stays two sentences.
    if (parts.length && /(?:^|[\s(])(?:no|nr|n[°º]|núm|num|vol|p|pp|ج|ص|رقم)\.$/iu.test(parts[parts.length - 1]) && new RegExp(`^\\s*[${DIGITS}]`, 'u').test(p)) parts[parts.length - 1] += p
    else parts.push(p)
  }
  const keys = keysOf(parts)
  if (!needsGuard(parts)) return { text, note }
  const index = await lookup(keys)
  const ctx = aboutAny(parts)
  const kept = parts.map((p) => guardText(p, index, note, ctx)).filter((p): p is string => p !== null)
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
