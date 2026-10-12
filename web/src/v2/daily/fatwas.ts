// The named fatwas and the book passage the daily screens quote (reply 0031-add14; data/fatwas.json, copied verbatim
// from their pages with their full links). Quotes are cut from the stored text as exact substrings, never retyped: a
// quote whose words are not found is not shown (and worker/test/daily-fatwas.test.ts fails).
// The stored texts are shown by StoredText.tsx.
import data from '../../../../data/fatwas.json'

export type Fatwa = { site: string; number: string; url: string; title: string; question: string; answer: string; use: string }
export type BookPassage = { site: string; book: string; author: string; volume: number; page: number; paragraph: string; url: string; passage: string }

export const FATWAS = data.fatwas as Fatwa[]
export const BOOKS = data.books as BookPassage[]
export const fatwa = (n: string) => FATWAS.find((f) => f.number === n) ?? null

/** The exact words `from` inside `text`, or null when they are not there. */
export const cut = (text: string | undefined, from: string): string | null => (text && text.includes(from) ? from : null)

/** The forbidden-times quotes: each the exact words of its source, with its link. */
export function forbiddenQuotes() {
  const f10693 = fatwa('10693')
  const f12348 = fatwa('12348')
  const book = BOOKS.find((b) => b.volume === 4 && b.page === 88) ?? null
  return {
    afterSunrise: f10693 && cut(f10693.answer, 'الثاني: بعد طلوع الشمس إلى أن ترتفع قيد رمح.'),
    standing: f12348 && cut(f12348.answer, 'والوقت ليس بالطويل يقارب ربع ساعة أو ثلث ساعة'),
    beforeZawal: book && cut(book.passage, book.passage),
    sources: { f10693, f12348, book },
  }
}
