import type { AskResponse, Lang, Quote } from '../../../shared/api'
import type { Strings } from '../i18n/en'
import guard from '../config/voice-guard.json'
import { BASMALA, findRuns, matchWords, passageQuotes, protectedRuns, sharesRun, splitPassage, type Runs } from './sacred'

// What voice conversation (command 12) may read aloud from a reply. Pure: the reply in, a list of parts out;
// voice/speaker.ts speaks them with the device voices.
//
// Never synthesised, in any language: the text of an ayah (it is shown on screen only) and the text of a hadith or
// any other quotation (until Talal decides). In their place a fixed line is said, as its own part, so a later
// command can put a human recitation there. Read: references, al-Muyassar verbatim, the Sahih International meaning
// (a translation of meanings, not Quran), creed passages with every ayah and quotation replaced, labelled machine
// explanations, and the fixed referral, apology and error texts.
//
// Guard: any part that repeats 4 consecutive words of an ayah in the reply (or the basmala, or a whole ayah shorter
// than that) is not read; the same threshold /api/explain applies to machine explanations. Inside a creed passage
// those words are replaced like a marked ayah, and so are the words of its own quotations repeated in its text, and
// the unmarked Quran phrases found once by scripts/ingest/voice-guard.mjs. al-Muyassar often repeats words of its
// ayah (about a third of all ayat) or quotes another ayah: then it is not read at all, rather than read in pieces.

export type Speech =
  | { kind: 'say'; text: string; lang: Lang }
  /** Where an ayah stands. `text` is the fixed line said in its place; `id` when the ayah is known (quran:S:A), with
   *  its `ref`. Inside a creed passage: the `quoted` text and the reference written after it (`cited`, such as
   *  «آل عمران: ١٨»), so a human recitation can be played only when the two match the ayah in D1 (command 19). */
  | { kind: 'ayah'; id?: string; text: string; lang: Lang; ref?: string; quoted?: string; cited?: string }
  /** Where a hadith or another quotation stands. */
  | { kind: 'quote'; id?: string; text: string; lang: Lang }

/** A reply as the voice conversation hears it: the API's, or a network failure. */
export type Heard = AskResponse | { type: 'network' }

export type SpeakStrings = Pick<
  Strings,
  | 'speakFound'
  | 'speakFoundBook'
  | 'speakAyahRef'
  | 'speakAyahSlot'
  | 'speakQuoteSlot'
  | 'speakHadithSlot'
  | 'speakMuyassar'
  | 'speakMeaningEn'
  | 'speakMachineMuyassar'
  | 'speakMachinePassage'
  | 'speakMachineAnswer'
  | 'speakFullOnScreen'
  | 'speakLinkOnScreen'
  | 'referralTitle'
  | 'referralBody'
  | 'abstainBody'
  | 'disputedText'
  | 'errConnection'
  | 'errRateLimited'
  | 'errMonthlyCap'
  | 'errBadInput'
  | 'errServer'
>

export type SpeakInput = {
  res: Heard
  /** Interface language. */
  lang: Lang
  /** Interface strings. */
  t: SpeakStrings
  /** Arabic strings: the lines said inside an Arabic book passage. */
  ar: SpeakStrings
  /** The /api/explain text for the first passage, in `lang` (asked for outside Arabic, in on_demand mode). */
  explanation?: string
  /** Read the Sahih International meaning outside Arabic (default). False when the machine explanation is off: the
   *  meaning is then read in the English interface only (reply 0031), so another language hears its reference and
   *  the closing line rather than English alone. */
  meaningEn?: boolean
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))

/** "الأصول الثلاثة – ص 6–8" → "الأصول الثلاثة، الصفحات 6 إلى 8": a reference as it is said. */
export function spokenBookRef(ref: string): string {
  return ref
    .replace(/\s*–\s*ص\s*(\d+)\s*[–-]\s*(\d+)/, '، الصفحات $1 إلى $2')
    .replace(/\s*–\s*ص\s*(\d+)/, '، صفحة $1')
    .replace(/\s+[–-]\s+/g, '، ')
}

function ayahRef(q: Quote, lang: Lang, t: SpeakStrings): string {
  const [, sura, aya] = q.id.split(':')
  const name = q.ref.split(':')[0].trim()
  return fill(t.speakAyahRef, { sura: lang === 'ar' ? name : sura, aya })
}

const hasWords = (s: string) => /[\p{L}\p{N}]/u.test(s)

/** Plain text of a book passage, with protected runs replaced by their slot (the first matching kind wins). */
function maskRuns(text: string, masks: [Runs, Speech][]): Speech[] {
  const tokens = text.split(/(\s+)/)
  const flat = tokens.flatMap((tok, i) => (i % 2 === 0 ? matchWords(tok).map((w) => ({ tok: i, w })) : []))
  const slotOf = new Map<number, Speech>()
  for (const [runs, slot] of masks)
    for (const [a, b] of findRuns(flat.map((x) => x.w), runs)) for (let k = a; k < b; k++) if (!slotOf.has(flat[k].tok)) slotOf.set(flat[k].tok, slot)
  const out: Speech[] = []
  let plain = ''
  tokens.forEach((tok, i) => {
    const slot = slotOf.get(i)
    if (!slot) return void (plain += tok)
    if (hasWords(plain)) out.push({ kind: 'say', text: plain.trim(), lang: 'ar' })
    plain = ''
    if (out.at(-1) !== slot) out.push(slot)
  })
  if (hasWords(plain)) out.push({ kind: 'say', text: plain.trim(), lang: 'ar' })
  return out
}

// The editor's footnote numbers right after an ayah or a quotation ("{…} ١." / "» ٣ ٤.") are not read.
const FOOTNOTE_MARKS = /^\s*(?:[٠-٩]{1,2}\s*)+\.?/

/** A creed passage (or a fatwa), in Arabic, with its ayat and quotations replaced. Empty when it cannot be split safely. */
function passageSpeech(text: string, ayahRuns: Runs, quoteRuns: Runs, ar: SpeakStrings): Speech[] {
  const { parts, paired } = splitPassage(text)
  if (!paired) return []
  const ayahSlot: Speech = { kind: 'ayah', text: ar.speakAyahSlot, lang: 'ar' }
  const quoteSlot: Speech = { kind: 'quote', text: ar.speakQuoteSlot, lang: 'ar' }
  const out: Speech[] = []
  parts.forEach((p, idx) => {
    const afterSlot = out.length > 0 && out.at(-1)!.kind !== 'say'
    const plain = afterSlot ? p.text.replace(FOOTNOTE_MARKS, '') : p.text
    const following = parts[idx + 1]
    const cited = following?.kind === 'plain' ? following.text.match(/^\s*\[([^\]]+)\]/)?.[1]?.trim() : undefined
    const next =
      p.kind === 'ayah'
        ? [{ ...ayahSlot, quoted: p.text, cited }]
        : p.kind === 'speech'
          ? [quoteSlot]
          : maskRuns(plain, [
              [ayahRuns, ayahSlot],
              [quoteRuns, quoteSlot],
            ])
    for (const s of next) if (s.kind === 'say' || out.at(-1)?.kind !== s.kind) out.push(s)
  })
  return out
}

const unmarked = guard.passages as Record<string, string[]>
const muyassarQuotesOther = new Set(guard.muyassarQuotesOtherAyat)

/** Ayat in the reply: its ayah quotes, the ayat quoted inside its passages, and the basmala. */
function ayahTexts(quotes: Quote[]): string[] {
  const out = [BASMALA]
  for (const q of quotes) {
    if (q.kind === 'ayah') out.push(q.text)
    else if (q.kind !== 'hadith') out.push(...passageQuotes(q.text).ayat, ...(unmarked[q.id] ?? []))
  }
  return out
}

/** Hadith and the quotations inside the reply's passages (of 4 words or more: a one-word quotation such as «الرياء»
 *  must not hide that word everywhere). */
function quoteTexts(quotes: Quote[]): string[] {
  const out: string[] = []
  for (const q of quotes) {
    if (q.kind === 'hadith') out.push(q.text)
    else if (q.kind !== 'ayah') out.push(...passageQuotes(q.text).speech)
  }
  return out.filter((t) => matchWords(t).length >= 4)
}

export function speakable({ res, lang, t, ar, explanation, meaningEn = true }: SpeakInput): Speech[] {
  const say = (text: string, l: Lang = lang): Speech => ({ kind: 'say', text, lang: l })
  switch (res.type) {
    case 'network':
      return [say(t.errConnection)]
    case 'error':
      return [say({ rate_limited: t.errRateLimited, monthly_cap: t.errMonthlyCap, bad_input: t.errBadInput, server: t.errServer }[res.code])]
    case 'abstain':
      return [say(t.abstainBody)]
    case 'referral': {
      if (!res.disputed) return [say(t.referralTitle), say(t.referralBody), say(t.speakLinkOnScreen)]
      // Rule 11: the fixed sentence, then the references only (the texts stay on screen).
      const refs = (res.quotes ?? []).map((q) => (q.kind === 'ayah' ? say(ayahRef(q, lang, t)) : say(spokenBookRef(q.ref), 'ar')))
      return [say(t.disputedText), ...refs, say(t.speakLinkOnScreen)]
    }
    case 'answer': {
      const q = res.quotes[0]
      if (!q) return [say(t.abstainBody)]
      const ayahRuns = protectedRuns(ayahTexts(res.quotes))
      const quoteRuns = protectedRuns(quoteTexts(res.quotes))
      const allRuns = protectedRuns([...ayahTexts(res.quotes), ...quoteTexts(res.quotes)])
      const out: Speech[] = []
      if (q.kind === 'ayah') {
        out.push(say(fill(t.speakFound, { ref: ayahRef(q, lang, t) })))
        out.push({ kind: 'ayah', id: q.id, text: t.speakAyahSlot, lang, ref: q.ref })
        if (lang === 'ar') {
          const muyassar = q.tafsirExcerpt?.trim()
          if (muyassar && !muyassarQuotesOther.has(q.id) && !sharesRun(muyassar, ayahRuns)) out.push(say(`${t.speakMuyassar} ${muyassar}`))
        } else if (q.text_en && (meaningEn || lang === 'en')) {
          out.push(say(t.speakMeaningEn), say(q.text_en, 'en'))
        }
      } else {
        out.push(lang === 'ar' ? say(fill(t.speakFound, { ref: spokenBookRef(q.ref) })) : say(t.speakFoundBook))
        if (lang !== 'ar') out.push(say(spokenBookRef(q.ref), 'ar'))
        if (q.kind === 'hadith') out.push({ kind: 'quote', id: q.id, text: t.speakHadithSlot, lang })
        else out.push(...passageSpeech(q.text, ayahRuns, quoteRuns, ar))
      }
      // A machine explanation, labelled as such: the generated one when the card shows it, else the one asked for.
      const generated = [res.direct?.text, ...res.explanation.map((s) => s.text)].filter(Boolean).join(' ')
      if (generated && !sharesRun(generated, allRuns)) out.push(say(t.speakMachineAnswer), say(generated, (res.answer_lang?.split('-')[0] as Lang) || lang))
      else if (!generated && explanation && lang !== 'ar' && q.kind !== 'hadith' && !sharesRun(explanation, allRuns))
        out.push(say(q.kind === 'ayah' ? t.speakMachineMuyassar : t.speakMachinePassage), say(explanation))
      out.push(say(t.speakFullOnScreen))
      return out
    }
  }
}
