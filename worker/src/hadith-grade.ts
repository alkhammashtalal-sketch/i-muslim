// «هل حديث كذا صحيح؟» (reply 0048; CLAUDE.md §9, Talal 14 October 09:25: «ننقل حكم الموسوعة»). Only while
// HADITH_RETRIEVAL is on, before the level gate, with no model:
//   - the question: a hadith quoted between quotation marks (or after «حديث»), asked about its soundness or grade, with
//     few other words; anything else goes the usual way;
//   - in HadeethEnc when, after the diacritics are removed (tokenize), the whole quote, six words or more, is in a
//     hadith's text word for word; or every word of the quote is there in order with at most two words between. More
//     than one hadith: the highest tier when they all carry the same grade (a hadith and its copy in an-Nawawi's
//     Forty), else a referral («the clear first result»). A word changed is never matched;
//   - found: its grade as written, its takhrij and its link, nothing of ours. Not found: a referral, as before.
// Every Arabic row is searched, whatever its grade: a weak hadith's grade is given as written, with its badge (rule 10).
import type { GradeResponse, Lang } from '../../shared/api'
import messages from './config/messages.json'
import { hadithUrl } from './hadith'
import type { Env } from './index'
import { tokenize } from './lib/normalize'

const MIN_EXACT = 6
const MAX_GAP = 2
const MAX_OTHER_WORDS = 8
const CANDIDATES = 20
const GRADE_LINE = messages.gradeLine as Record<Lang, string>

// The question's frame, normalized (tokenize: no diacritics, ا for أ إ آ, ه for ة, ي for ى).
const ASK_AR = /(^| )(هل|ما|كم)( |$)/
const ABOUT_AR = /(^| )(صحيح|صحيحه|ثابت|ضعيف|موضوع|صحه|درجه|حكم|يصح|صح)( |$)/
const HADITH_AR = /(^| )(حديث|الحديث)( |$)/
const ASK_EN = /\b(is|are|was|what)\b/
const ABOUT_EN = /\b(authentic|sahih|sound|weak|fabricated|grade|graded|true|correct|reliable)\b/
const HADITH_EN = /\bhadith\b/
const QUOTED = /[«"“”„‟]([^«»"“”„‟]{2,400})[»"“”„‟]/

/** The quoted hadith of a question about its soundness or grade, or null. The frame is read outside the quote, so a
 *  quote's own words («ما», «صح») never make an ordinary question one of these. */
export function gradeQuestionOf(q: string): string | null {
  const marked = q.match(QUOTED)?.[1] ?? null
  const rest = tokenize(marked ? q.replace(marked, ' ') : q)
  const nr = rest.join(' ')
  const ar = ASK_AR.test(nr) && ABOUT_AR.test(nr) && HADITH_AR.test(nr)
  const en = ASK_EN.test(nr) && ABOUT_EN.test(nr) && HADITH_EN.test(nr)
  if (!ar && !en) return null
  let quote = marked
  let others = rest.length
  // Without quotation marks, Arabic only: the words between «حديث» and the closing «صحيح/ثابت/…».
  if (!quote && ar) {
    quote = nr.match(/(?:^| )(?:حديث|الحديث) (.+?) (?:صحيح|صحيحه|ثابت|ضعيف|موضوع)(?: |$)/)?.[1] ?? null
    if (quote) others = rest.length - quote.split(' ').length
  }
  if (!quote || tokenize(quote).length < 2) return null
  // A question that asks something else besides (a ruling, a case) is not this one.
  return others <= MAX_OTHER_WORDS ? quote : null
}

/** Whether `q` (the quote's words) is in `h` (a hadith's words) by the rule above. */
export function quoteMatch(q: string[], h: string[]): 'exact' | 'ordered' | null {
  if (q.length >= MIN_EXACT) {
    for (let i = 0; i + q.length <= h.length; i++) if (q.every((w, j) => h[i + j] === w)) return 'exact'
  }
  // In order, all of them, at most MAX_GAP words between two of them.
  for (let start = 0; start < h.length; start++) {
    if (h[start] !== q[0]) continue
    let at = start
    let ok = true
    for (let j = 1; j < q.length && ok; j++) {
      let k = at + 1
      while (k < h.length && k - at - 1 <= MAX_GAP && h[k] !== q[j]) k++
      if (k < h.length && h[k] === q[j] && k - at - 1 <= MAX_GAP) at = k
      else ok = false
    }
    if (ok) return 'ordered'
  }
  return null
}

type Row = { id: string; text: string; title: string | null; grade: string | null; class: string; tier: string; attribution: string | null }
export type Found = Row & { how: 'exact' | 'ordered' }

/** The HadeethEnc hadith the quote is, or null (no hadith has it, or more than one different hadith does). */
export async function findQuoted(env: Env, quote: string): Promise<{ found: Found | null; rowsRead: number }> {
  const words = tokenize(quote)
  const match = words.map((w) => `"${w.replace(/"/g, '')}"`).join(' AND ')
  const c = await env.DB.prepare('SELECT id FROM hadith_grade_fts WHERE hadith_grade_fts MATCH ? ORDER BY bm25(hadith_grade_fts) LIMIT ?')
    .bind(match, CANDIDATES)
    .all<{ id: string }>()
  let read = c.meta.rows_read ?? 0
  const ids = [...new Set(c.results.map((r) => r.id))]
  if (!ids.length) return { found: null, rowsRead: read }
  const rows = await env.DB.prepare(
    `SELECT id, text, title, grade, class, tier, attribution FROM hadiths WHERE lang = 'ar' AND id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(...ids)
    .all<Row>()
  read += rows.meta.rows_read ?? 0
  const hits: Found[] = []
  for (const r of rows.results) {
    const how = quoteMatch(words, tokenize(r.text))
    if (how && r.grade) hits.push({ ...r, how })
  }
  if (!hits.length) return { found: null, rowsRead: read }
  // One hadith (copies of the same text count once): the lowest tier, then the smallest id. Different hadiths: only
  // when they all carry the same grade and class (the same answer either way); otherwise no clear first, a referral.
  hits.sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id))
  const texts = new Set(hits.map((h) => tokenize(h.text).join(' ')))
  const same = hits.every((h) => h.grade === hits[0].grade && h.class === hits[0].class)
  return { found: texts.size === 1 || same ? hits[0] : null, rowsRead: read }
}

/** The answer: the hadith as stored, its grade as written, the fixed line; in the reader's language the grade as
 *  HadeethEnc translates it, when that row exists. */
export async function gradeAnswer(env: Env, h: Found, lang: Lang): Promise<GradeResponse> {
  const tr =
    lang === 'ar'
      ? null
      : await env.DB.prepare('SELECT grade FROM hadiths WHERE id = ? AND lang = ?').bind(h.id, lang).first<{ grade: string | null }>()
  return {
    type: 'grade',
    message: GRADE_LINE[lang].replace('{grade}', h.grade!),
    hadith: { id: h.id, text: h.text, title: h.title, grade: h.grade!, class: h.class, attribution: h.attribution, url: hadithUrl(h.id, 'ar') },
    ...(tr?.grade ? { grade_tr: { lang, grade: tr.grade } } : {}),
  }
}
