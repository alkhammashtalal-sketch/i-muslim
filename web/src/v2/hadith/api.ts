// The HadeethEnc routes of worker/src/hadith.ts (reply 0032 B). Every text is shown as the server returns it.
import { api } from '../../api/base'
export type Hadith = {
  id: string
  lang: string
  title: string | null
  text: string
  intro: string | null
  attribution: string | null
  grade: string | null
  explanation: string | null
  hints: string[]
  words: { word: string; meaning: string }[]
  reference: string | null
  categories: string[]
  class: 'sahih' | 'hasan' | 'weak' | 'mawdu' | 'mixed' | string
  tier: string
  version: string | null
  /** A report from a Companion: shown as in the source, never introduced as the Prophet's saying ﷺ. */
  mawquf?: boolean
  url: string
}
export type HadithPair = { ar: Hadith; tr?: Hadith }
export type HadithBrief = { id: string; text: string; grade: string | null; attribution: string | null }
/** «تأكد من فهمك» (reply 0033 §أ2; worker/src/hadith-quiz.ts): the options are HadeethEnc benefits as stored; the
 *  answer (at `answer`) is this hadith's benefit n, the others name the hadith they come from. */
export type QuizOption = { text: string; id: string; title: string | null }
export type QuizQuestion = { n: number; answer: number; options: QuizOption[] }
export type HadithQuiz = { id: string; lang: string; questions: QuizQuestion[] }

export class NotFound extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (r.status === 404) throw new NotFound(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()) as T
}

const memo = new Map<string, Promise<unknown>>()
const once = <T,>(key: string, f: () => Promise<T>): Promise<T> => {
  let p = memo.get(key) as Promise<T> | undefined
  if (!p) {
    p = f()
    p.catch(() => memo.delete(key))
    memo.set(key, p)
  }
  return p
}

export const getHadith = (id: string, lang: string) =>
  once(`h:${id}:${lang}`, () => getJson<HadithPair>(api(`/api/hadith/${encodeURIComponent(id)}?lang=${lang}`)))
export const getSameTopic = (id: string) =>
  once(`s:${id}`, () => getJson<{ items: HadithBrief[] }>(api(`/api/hadith/${encodeURIComponent(id)}/same-topic`)).then((r) => r.items))
/** The language of the quiz and of the benefits it asks about: the language of the HadeethEnc row the page shows,
 *  the reader's content language (reply 0033 §أ1); a language HadeethEnc lacks has no row, so no quiz. */
export const quizLang = (contentLang: string) => contentLang
/** The stored questions of the row in that language (one read by primary key). Nothing about an answer is sent. */
export const getQuiz = (id: string, lang: string) =>
  once(`q:${id}:${lang}`, () => getJson<HadithQuiz>(api(`/api/hadith/${encodeURIComponent(id)}/quiz?lang=${lang}`)).then((r) => r.questions ?? []))
export const getToday = (lang: string) => once(`t:${lang}`, () => getJson<{ day: string; hadith: HadithPair | null }>(api(`/api/today?lang=${lang}`)))
/** «سبب النزول» under an ayah (reply 0036 §أ; worker/src/asbab.ts): the hadiths in their order, read by key. */
export const getAsbab = (sura: number, aya: number, lang: string) =>
  once(`a:${sura}:${aya}:${lang}`, () => getJson<{ ayah: string; items: HadithPair[] }>(api(`/api/asbab/${sura}/${aya}?lang=${lang}`)).then((r) => r.items ?? []))

/** Weak, fabricated and mixed grades (rule 10, V2 §11): shown with the warning badge, after the sahih, never alone. */
export const isWeak = (h: Pick<Hadith, 'class'>) => h.class === 'weak' || h.class === 'mawdu' || h.class === 'mixed'

/** A hadith as it is shared (its page and the day card): the text, its grade and attribution, the source's name and
 *  its page (HadeethEnc's terms: the source named). */
export const hadithShareText = (h: Pick<Hadith, 'text' | 'grade' | 'attribution' | 'url'>, sourceName: string) =>
  [h.text, [h.grade, h.attribution].filter(Boolean).join(' · '), `${sourceName} · ${h.url}`].join('\n')

/** The text after its opening (intro), when the text begins with it: both parts are shown, nothing is removed. */
export function splitIntro(h: Pick<Hadith, 'text' | 'intro'>): { intro: string | null; body: string } {
  const intro = h.intro?.trim()
  if (intro && h.text.startsWith(intro)) return { intro, body: h.text.slice(intro.length).trim() }
  return { intro: null, body: h.text }
}
