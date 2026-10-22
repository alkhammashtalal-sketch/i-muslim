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
import { passageIdOf } from './lib/fusion'
import { isStopword, tokenize } from './lib/normalize'
import { embed } from './retrieve'

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

// Fix «grade-tr» (reply 0071 §2.5): the same frame in the other interface languages, read on the question as written
// (lowercase), word by word: Urdu, Bengali and Hindi words lose their vowel signs in tokenize.
const W = (words: string) => new RegExp(`(?<![\\p{L}\\p{M}])(${words})(?![\\p{L}\\p{M}])`, 'u')
const FRAMES: Record<string, { ask: RegExp; about: RegExp; hadith: RegExp; filler: string[] }> = {
  ur: { ask: W('کیا'), about: W('صحیح|صحيح|ضعیف|ضعيف|موضوع|درجہ|درست|ثابت'), hadith: W('حدیث|حديث'), filler: ['کیا', 'یہ', 'ہے', 'کی', 'کا', 'حدیث', 'صحیح', 'ضعیف', 'درجہ', 'درست', 'ثابت', 'موضوع'] },
  id: { ask: W('apakah|benarkah|apa'), about: W('shahih|sahih|shohih|dhaif|daif|palsu|maudhu|derajat|benar'), hadith: W('hadits|hadis|hadith'), filler: ['apakah', 'benarkah', 'apa', 'hadits', 'hadis', 'hadith', 'shahih', 'sahih', 'shohih', 'dhaif', 'daif', 'palsu', 'maudhu', 'derajat', 'benar', 'ini', 'itu', 'yang'] },
  ms: { ask: W('adakah|apakah|apa'), about: W('sahih|shahih|daif|dhaif|palsu|maudhu|darjat|benar'), hadith: W('hadis|hadith|hadits'), filler: ['adakah', 'apakah', 'apa', 'hadis', 'hadith', 'hadits', 'sahih', 'shahih', 'daif', 'dhaif', 'palsu', 'maudhu', 'darjat', 'benar', 'ini', 'itu', 'yang'] },
  tr: { ask: W('mi|mı|mu|mü|midir|mıdır|nedir'), about: W('sahih|zayıf|uydurma|mevzu|derecesi|doğru'), hadith: W('hadis|hadisi|hadith'), filler: ['mi', 'mı', 'mu', 'mü', 'midir', 'mıdır', 'nedir', 'hadis', 'hadisi', 'hadith', 'sahih', 'zayıf', 'uydurma', 'mevzu', 'derecesi', 'doğru', 'bu'] },
  fr: { ask: W('est|est-il|quel|quelle'), about: W('authentique|sahih|faible|inventé|forgé|degré|authenticité'), hadith: W('hadith|hadîth'), filler: ['est', 'il', 'est-il', 'quel', 'quelle', 'le', 'la', 'ce', 'hadith', 'hadîth', 'authentique', 'sahih', 'faible', 'inventé', 'forgé', 'degré', 'authenticité', 'du'] },
  es: { ask: W('es|cuál|cual'), about: W('auténtico|autentico|sahih|débil|debil|inventado|falso|grado'), hadith: W('hadiz|hadith|hadiz'), filler: ['es', 'cuál', 'cual', 'el', 'la', 'este', 'hadiz', 'hadith', 'auténtico', 'autentico', 'sahih', 'débil', 'debil', 'inventado', 'falso', 'grado', 'del'] },
  bn: { ask: W('কি|কী'), about: W('সহীহ|সহিহ|দুর্বল|জাল|যঈফ'), hadith: W('হাদিস|হাদীস|হাদিসটি'), filler: ['কি', 'কী', 'এই', 'হাদিস', 'হাদীস', 'হাদিসটি', 'সহীহ', 'সহিহ', 'দুর্বল', 'জাল', 'যঈফ'] },
  hi: { ask: W('क्या'), about: W('सहीह|सही|ज़ईफ़|जईफ|कमजोर|मनगढ़ंत'), hadith: W('हदीस'), filler: ['क्या', 'यह', 'है', 'हदीस', 'सहीह', 'सही', 'ज़ईफ़', 'जईफ', 'कमजोर', 'मनगढ़ंत'] },
}
const FILLER_EN = ['hadith', 'authentic', 'sahih', 'sound', 'weak', 'fabricated', 'grade', 'graded', 'true', 'correct', 'reliable', 'but']

/** The words searched for a quote in a translation: tokenized, without the frame and the stop words (both sides alike). */
const trWords = (s: string, filler: ReadonlySet<string>) => tokenize(s).filter((w) => !isStopword(w) && !filler.has(w))

/** Fix «grade-tr»: a grade question in the reader's language (or English), and its quote: the marked one, else the
 *  question's own words without the frame. null when it is not one, or names too few words. */
export function gradeQuestionTr(q: string, lang: string): { quote: string; filler: ReadonlySet<string> } | null {
  const lower = q.toLowerCase()
  const marked = q.match(QUOTED)?.[1] ?? null
  const outside = marked ? lower.replace(marked.toLowerCase(), ' ') : lower
  const f = FRAMES[lang]
  const nr = tokenize(outside).join(' ')
  const en = ASK_EN.test(nr) && ABOUT_EN.test(nr) && HADITH_EN.test(nr)
  const own = !!f && f.ask.test(outside) && f.about.test(outside) && f.hadith.test(outside)
  if (!en && !own) return null
  const filler = new Set([...FILLER_EN, ...(f?.filler ?? [])].flatMap((w) => tokenize(w)))
  const quote = marked ?? q
  return trWords(quote, filler).length >= 2 ? { quote, filler } : null
}

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
export type Found = Row & { how: 'exact' | 'ordered' | 'near' }

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

const AR_ROW = `SELECT id, text, title, grade, class, tier, attribution FROM hadiths WHERE lang = 'ar' AND id IN`
/** The hadiths nearest a text by meaning (bge-m3, the hadiths' own index), best first, one score each. */
async function nearest(env: Env, text: string, k = 10): Promise<{ id: string; score: number }[]> {
  if (!env.VECTORIZE_HADITH) return []
  const [vec] = await embed(env, [text])
  const r = await env.VECTORIZE_HADITH.query(vec, { topK: k })
  const best = new Map<string, number>()
  for (const m of r.matches) {
    const id = passageIdOf(m.id).replace(/^hadith:/, '')
    if (!best.has(id)) best.set(id, m.score)
  }
  return [...best].map(([id, score]) => ({ id, score }))
}

/** Fix «grade-tr» (reply 0071 §2.5): the quote in HadeethEnc's own translation, in the reader's language or English,
 *  by the same rule as the Arabic (the whole quote word for word, or every word in order with at most two between),
 *  stop words and the frame left out on both sides. Candidates: the nearest hadiths by meaning. Then the same rule for
 *  more than one: one hadith, or all with the same grade; else none. */
export async function findQuotedTr(env: Env, quote: string, lang: string, filler: ReadonlySet<string>): Promise<{ found: Found | null; rowsRead: number }> {
  const near = await nearest(env, quote)
  if (!near.length) return { found: null, rowsRead: 0 }
  const ids = near.map((n) => n.id)
  const langs = [...new Set([lang, 'en'])]
  const tr = await env.DB.prepare(
    `SELECT id, title, text FROM hadiths WHERE lang IN (${langs.map(() => '?').join(',')}) AND id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(...langs, ...ids)
    .all<{ id: string; title: string | null; text: string }>()
  let read = tr.meta.rows_read ?? 0
  const words = trWords(quote, filler)
  const hitIds = [...new Set(tr.results.filter((r) => quoteMatch(words, trWords(`${r.title ?? ''} ${r.text}`, filler))).map((r) => r.id))]
  if (!hitIds.length) return { found: null, rowsRead: read }
  const rows = await env.DB.prepare(`${AR_ROW} (${hitIds.map(() => '?').join(',')})`).bind(...hitIds).all<Row>()
  read += rows.meta.rows_read ?? 0
  const hits = rows.results.filter((r) => r.grade).sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id))
  if (!hits.length) return { found: null, rowsRead: read }
  const same = hits.every((h) => h.grade === hits[0].grade && h.class === hits[0].class)
  return { found: hits.length === 1 || same ? { ...hits[0], how: 'ordered' } : null, rowsRead: read }
}

/** Fix «grade-near» (reply 0071 §2.5, Talal 22 October: «حتى لو ما كانت مكتوبة بشكل كامل … يفهم … عن إيش قاعد يسأل»):
 *  when no wording matches, the hadith nearest the quote by meaning, only above `min` and ahead of the next one by
 *  `margin` (both set by measurement, eval/run-basic.mjs). Its own text is shown with its grade, so the reader sees which
 *  hadith it is; nothing is ruled by the model. */
export async function findNear(env: Env, quote: string, min: number, margin: number): Promise<{ found: Found | null; score: number; second: number }> {
  const near = await nearest(env, quote)
  const [a, b] = near
  if (!a || a.score < min || a.score - (b?.score ?? 0) < margin) return { found: null, score: a?.score ?? 0, second: b?.score ?? 0 }
  const row = await env.DB.prepare(`${AR_ROW} (?)`).bind(a.id).first<Row>()
  return { found: row?.grade ? { ...row, how: 'near' } : null, score: a.score, second: b?.score ?? 0 }
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
