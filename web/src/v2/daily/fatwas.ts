// The named fatwas and the book passage the daily screens quote (reply 0031-add14; data/fatwas.json, copied verbatim
// from their pages with their full links). Quotes are cut from the stored text as exact substrings, never retyped: a
// quote whose words are not found is not shown (and worker/test/daily-fatwas.test.ts fails).
// The stored texts are shown by StoredText.tsx.
import data from '../../../../data/fatwas.json'

export type Fatwa = { site: string; number: string; url: string; title: string; question: string; answer: string; use: string }
export type BookPassage = { site: string; book: string; author: string; volume: number; page: number; paragraph: string; url: string; passage: string }
/** A quote: the exact words of its source. `elided`: words before it are left out, and «…» stands in their place. */
export type Quote = { text: string; elided?: boolean }

export const FATWAS = data.fatwas as Fatwa[]
export const BOOKS = data.books as BookPassage[]
export const fatwa = (n: string) => FATWAS.find((f) => f.number === n) ?? null

/** The exact words `from` inside `text`, or null when they are not there. */
export const cut = (text: string | undefined, from: string): string | null => (text && text.includes(from) ? from : null)

const quote = (text: string | undefined, words: string, elided = false): Quote | null => {
  const t = cut(text, words)
  return t ? { text: t, elided } : null
}

/** A quote as shown: «… » before it when words were left out (reply 0031-add16 §4); nothing else is added. */
export const shownQuote = (q: Quote) => (q.elided ? `… ${q.text}` : q.text)

/** The forbidden-times quotes: each the exact words of its source, with its link. */
export function forbiddenQuotes() {
  const f10693 = fatwa('10693')
  const f12348 = fatwa('12348')
  const book = BOOKS.find((b) => b.volume === 4 && b.page === 88) ?? null
  return {
    // The item's number in the fatwa's list («الثاني:») is left out, «…» in its place; the rest as written (§4).
    afterSunrise: f10693 && quote(f10693.answer, 'بعد طلوع الشمس إلى أن ترتفع قيد رمح', true),
    standing: f12348 && quote(f12348.answer, 'والوقت ليس بالطويل يقارب ربع ساعة أو ثلث ساعة'),
    beforeZawal: book && quote(book.passage, book.passage),
    sources: { f10693, f12348, book },
  }
}

/** Fatwa 13471 in «لماذا لا نعرض بعض المناسبات؟» (reply 0031-add16 §5). Its stored answer carries two private-use
 *  marks of the site's own font, and nothing of ours is written in their place: only this sentence, which has none, is
 *  shown, cut as written, then the fatwa's full link. `sentence` is null when the words are not found (the link alone). */
export function mawlidExcerpt() {
  const f = fatwa('13471')
  if (!f) return null
  return { title: f.title, sentence: cut(f.answer, 'الاحتفال بالموالد ليس بمشروع، بل هو من البدع'), url: f.url }
}
