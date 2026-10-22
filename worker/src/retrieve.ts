// Unified retrieval (command 05). No language model is called here: only normalization, lexicon
// expansion, bge-m3 vectors and FTS5 keyword search, fused with Reciprocal Rank Fusion.
import type { Lang } from '../../shared/api'
import commonTerms from './config/common-terms.ar.json'
import cfg from './config/retrieval.json'
import lexiconAr from './config/lexicon.ar.json'
import lexiconEn from './config/lexicon.en.json'
import lexiconMulti from './config/lexicon.multi.json'
import type { Env } from './index'
import { expand, expandMulti, type Lexicon } from './lib/lexicon'
import { passageIdOf, rrf, type Retrieved, type Source } from './lib/fusion'
import { ftsMatch, isStopword, normalizeArabic, queryTerms, tokenize } from './lib/normalize'
import type { Understood } from './understand'

export const EMBED_MODEL = '@cf/baai/bge-m3'

export type { Retrieved, Source }
export type RetrieveResult = {
  passages: Retrieved[] // top finalK, empty when abstaining
  ranked: Retrieved[] // top fusedTopK, before the threshold (for evaluation)
  abstain: boolean
  topVectorScore: number
  /** The best hadith vector's similarity (reply 0048), 0 with the hadiths off. */
  topHadithScore?: number
  /** The hadiths' block (0048-add8): its candidates, apart from the passages; empty with the hadiths off. */
  hadiths?: Retrieved[]
  topics: string[]
  rowsRead: number
}
export type Mode = 'new' | 'baseline'

const COMMON = new Set<string>(commonTerms.terms)

const ARABIC = /[؀-ۿ]/

const dedupe = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) === i)

export async function embed(env: Env, texts: string[]): Promise<number[][]> {
  const out = (await env.AI.run(EMBED_MODEL, { text: texts })) as { data?: number[][] }
  if (!out.data || out.data.length !== texts.length) throw new Error('embedding_failed')
  return out.data
}

async function fts(env: Env, sql: string, match: string | null, limit: number): Promise<{ ids: string[]; read: number }> {
  if (!match) return { ids: [], read: 0 }
  const r = await env.DB.prepare(sql).bind(match, limit).all<{ id: string }>()
  return { ids: r.results.map((x) => x.id), read: r.meta.rows_read ?? 0 }
}

// The keyword query used before command 05: every normalized word OR-ed, ayah text only.
function baselineMatch(q: string): string | null {
  const tokens = normalizeArabic(q)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 12)
  return tokens.length ? tokens.map((t) => `"${t}"`).join(' OR ') : null
}

/** hadith: HadeethEnc's hadiths too (reply 0048); by default env.HADITH_RETRIEVAL === 'on', and never without the
 *  env.next binding of their index. Off, nothing below differs from before: their index and keyword tables are not read. */
/** understood: the search words of the fix «understand» (src/understand.ts), any language's question. */
/** minScore: the passages' threshold tried for measurement (reply 0071 §2.6), the evaluation runner's own requests only. */
/** base: the search's own lists already run for this question (src/queue.ts: a question waiting for the model's turn). */
export type RetrieveOptions = { multiLexicon?: boolean; hadith?: boolean; hadithMin?: number; minScore?: number; phrase?: boolean; understood?: Understood; base?: SearchBase }

/** Words that only frame a quote («حديث …», «آية …»), normalized; never part of the phrase searched. */
const FRAME = new Set(['حديث', 'الحديث', 'احاديث', 'ايه', 'الايه', 'اية', 'ايات', 'الايات', 'سوره', 'السوره', 'قوله', 'تعالي', 'نص'])

/** Fix «phrase» (reply 0071 §2.2): the question's words without its frame and without the stop words at either end
 *  (inner ones stay: «لا يكلف الله نفسا»), as an FTS5 NEAR group; null when too few or too many words, and for a
 *  question that does not present a quote (no «حديث», «آية», … and no quotation marks): measured on v11
 *  (eval/reports/basic-60-fix-phrase), every question as a phrase answered «ما معنى لا إله إلا الله؟» with ayat that hold
 *  the words, not their meaning. */
export function phraseMatchOf(q: string): string | null {
  const all = tokenize(q)
  if (!all.some((w) => FRAME.has(w)) && !/[«"“”]/.test(q)) return null
  const words = all.filter((w) => !FRAME.has(w))
  while (words.length && isStopword(words[0])) words.shift()
  while (words.length && isStopword(words[words.length - 1])) words.pop()
  if (words.length < cfg.phrase.minWords || words.length > cfg.phrase.maxWords) return null
  return `NEAR(${words.map((w) => `"${w.replace(/"/g, '')}"`).join(' ')}, ${words.length + cfg.phrase.slack})`
}

/** A question that asks for an ayah («آية», "verse"): the hadiths do not compete with the ayat for it (reply 0048). */
const ASKS_AYAH = /(^|[\s«"(])(ال)?(آيه|ايه|آية|اية|آيات|ايات|آيتين|ايتين)([\s»")؟?.,،]|$)|\b(verse|verses|ayah|ayat|aya)\b/i

export const hadithRetrievalOn = (env: Env, override?: boolean) => (override ?? env.HADITH_RETRIEVAL === 'on') && !!env.VECTORIZE_HADITH

/** opts override a setting, for measurement through the admin route only (the answer path passes none). */
export async function retrieve(env: Env, q: string, lang: Lang, mode: Mode = 'new', opts: RetrieveOptions = {}): Promise<RetrieveResult> {
  if (mode === 'baseline') {
    const weights = cfg.weights as Record<Source, number>
    const [vec] = await embed(env, [q])
    const v = await env.VECTORIZE.query(vec, { topK: 50 })
    const vMatches = v.matches.filter((m) => !m.id.startsWith('tafsir:')).slice(0, 20)
    const kw = await fts(
      env,
      'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?',
      baselineMatch(q),
      20,
    )
    const ranked = rrf({ vector: vMatches.map((m) => m.id), ayah: kw.ids }, weights, 60).slice(0, cfg.fusedTopK)
    for (const r of ranked) r.vectorScore = vMatches.find((m) => m.id === r.id)?.score
    return {
      passages: ranked.slice(0, cfg.finalK),
      ranked,
      abstain: false,
      topVectorScore: vMatches[0]?.score ?? 0,
      topics: [],
      rowsRead: kw.read,
    }
  }

  const base = opts.base ?? (await searchBase(env, q, lang, opts))
  const lists = opts.understood ? await understoodLists(env, opts.understood, base.withHadith) : NO_LISTS
  return fuse(base, lists, opts)
}

/** The search's own lists, all but those of the fix «understand» (which need the model's words): the embedding, both
 *  indexes and the keyword tables. Run at once, never waiting for the model's turn (add-on 0071-add4 §2), and plain data,
 *  so a question waiting for the model keeps them until its turn (src/queue.ts). */
export type SearchBase = {
  isAr: boolean
  withHadith: boolean
  phrase: boolean
  best: [string, number][]
  hbest: [string, number][]
  ayah: string[]
  tafsir: string[]
  en: string[]
  lex: string[]
  seat: string[]
  phraseIds: string[]
  hadith: string[]
  hadithEn: string[]
  hadithPhrase: string[]
  topVectorScore: number
  topHadithScore: number
  topics: string[]
  rowsRead: number
}

/** The base search of retrieve() (mode 'new'), as it always was. */
export async function searchBase(env: Env, q: string, lang: Lang, opts: RetrieveOptions = {}): Promise<SearchBase> {
  const multiLexicon = opts.multiLexicon ?? cfg.multiLexicon
  const withHadith = hadithRetrievalOn(env, opts.hadith) && !ASKS_AYAH.test(q)
  const isAr = ARABIC.test(q) && cfg.arabicFtsLangs.includes(lang)
  const isEn = lang === 'en'
  const lex = isEn ? (lexiconEn as Lexicon) : (lexiconAr as Lexicon)
  const isOther = !isAr && !isEn
  // Other languages: only the multilingual lexicon reaches the Arabic keyword indexes (its Arabic terms, never the
  // question's own words); the question itself is searched by meaning (bge-m3).
  const { add, topics, precise } = isAr || isEn ? expand(q, lex) : multiLexicon ? expandMulti(q, lexiconMulti as Lexicon) : { add: [], topics: [], precise: null }
  // English lexicon entries may name Arabic terms: the creed books have no English text, so an English question can
  // reach them only through the Arabic keyword index. Those go to the lexicon list; the English index keeps Latin terms.
  const arabicAdd = isEn ? add.filter((a) => ARABIC.test(a)) : []
  const terms = [...queryTerms(q, COMMON), ...add.filter((a) => !arabicAdd.includes(a))]
  const match = isAr || isEn ? ftsMatch(terms) : null

  const vectorText = cfg.expandVectorQuery && add.length ? `${q}\n${add.join(' ')}` : q
  const [vec] = await embed(env, [vectorText])

  // Lexicon phrases also get their own ranked list, so a precise phrase is not diluted by general words.
  const lexMatch = (isAr || isOther) && add.length ? ftsMatch(add) : arabicAdd.length ? ftsMatch(arabicAdd) : null

  // Reserved seat: when the question names a precise lexicon phrase, its best passage is kept among the passages sent.
  // The longest target is searched first (the most specific wording, e.g. «شروط الصلاه تسعه»); all targets if it finds none.
  const seatTargets = cfg.reservedSeat && precise ? precise.filter((a) => ARABIC.test(a)).sort((a, b) => b.length - a.length) : []

  const none = Promise.resolve({ ids: [] as string[], read: 0 })
  // The hadiths' own lists (reply 0048): their vectors (merged with the passages' by score below), their Arabic
  // keyword table with the question's words (Arabic) or the lexicon's Arabic terms (other languages, English), and
  // their English translation for English questions.
  const hadithMatch = isAr ? match : lexMatch
  // Fix «phrase» (reply 0071 §2.2): Arabic questions only, in the passages and, with them on, the hadiths.
  const phraseMatch = opts.phrase && isAr ? phraseMatchOf(q) : null
  const [vh, kwHadith, kwHadithEn, kwHadithPhrase] = withHadith
    ? await Promise.all([
        env.VECTORIZE_HADITH!.query(vec, { topK: cfg.vectorTopK }),
        hadithMatch ? fts(env, 'SELECT id, bm25(hadith_fts) AS r FROM hadith_fts WHERE hadith_fts MATCH ? ORDER BY r LIMIT ?', hadithMatch, cfg.ftsTopK) : none,
        isEn ? fts(env, 'SELECT id, bm25(hadith_en_fts) AS r FROM hadith_en_fts WHERE hadith_en_fts MATCH ? ORDER BY r LIMIT ?', match, cfg.ftsTopK) : none,
        phraseMatch ? fts(env, 'SELECT id, bm25(hadith_fts) AS r FROM hadith_fts WHERE hadith_fts MATCH ? ORDER BY r LIMIT ?', phraseMatch, cfg.ftsTopK) : none,
      ])
    : [null, { ids: [], read: 0 }, { ids: [], read: 0 }, { ids: [], read: 0 }]

  const [v, kwAyah, kwTafsir, kwEn, kwLex, kwSeat, kwPhrase] = await Promise.all([
    env.VECTORIZE.query(vec, { topK: cfg.vectorTopK }),
    isAr
      ? fts(env, 'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?', match, cfg.ftsTopK)
      : Promise.resolve({ ids: [], read: 0 }),
    isAr || (isOther && lexMatch)
      ? fts(env, 'SELECT ayah_id AS id, bm25(tafsir_fts) AS r FROM tafsir_fts WHERE tafsir_fts MATCH ? ORDER BY r LIMIT ?', isAr ? match : lexMatch, cfg.ftsTopK)
      : Promise.resolve({ ids: [], read: 0 }),
    isEn
      ? fts(env, 'SELECT id, bm25(passages_en_fts) AS r FROM passages_en_fts WHERE passages_en_fts MATCH ? ORDER BY r LIMIT ?', match, cfg.ftsTopK)
      : Promise.resolve({ ids: [], read: 0 }),
    lexMatch
      ? fts(env, 'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?', lexMatch, cfg.ftsTopK)
      : Promise.resolve({ ids: [], read: 0 }),
    seatTargets.length
      ? fts(env, 'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?', ftsMatch(seatTargets.slice(0, 1)), 1).then(
          (r) => (r.ids.length ? r : fts(env, 'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?', ftsMatch(seatTargets), 1)),
        )
      : Promise.resolve({ ids: [], read: 0 }),
    phraseMatch
      ? fts(env, 'SELECT id, bm25(passages_fts) AS r FROM passages_fts WHERE passages_fts MATCH ? ORDER BY r LIMIT ?', phraseMatch, cfg.ftsTopK)
      : Promise.resolve({ ids: [], read: 0 }),
  ])


  // The hadiths' vectors are a list of their own (reply 0048), each hadith counted once, by its best vector (its own or
  // a part of its explanation); the passages' likewise.
  const hbest = new Map<string, number>()
  for (const m of vh?.matches ?? []) {
    const pid = passageIdOf(m.id)
    if (!hbest.has(pid)) hbest.set(pid, m.score)
  }
  const best = new Map<string, number>()
  for (const m of v.matches) {
    const pid = passageIdOf(m.id)
    if (!best.has(pid)) best.set(pid, m.score)
  }
  return {
    isAr,
    withHadith,
    phrase: phraseMatch !== null,
    best: [...best],
    hbest: [...hbest],
    ayah: kwAyah.ids,
    tafsir: kwTafsir.ids,
    en: kwEn.ids,
    lex: kwLex.ids,
    seat: kwSeat.ids,
    phraseIds: kwPhrase.ids,
    hadith: kwHadith.ids,
    hadithEn: kwHadithEn.ids,
    hadithPhrase: kwHadithPhrase.ids,
    topVectorScore: v.matches[0]?.score ?? 0,
    topHadithScore: vh?.matches[0]?.score ?? 0,
    topics,
    rowsRead: kwAyah.read + kwTafsir.read + kwEn.read + kwLex.read + kwSeat.read + kwHadith.read + kwHadithEn.read + kwPhrase.read + kwHadithPhrase.read,
  }
}

type UnderstoodLists = { terms: string[]; phrase: string[]; hadithTerms: string[]; hadithPhrase: string[]; read: number }
const NO_LISTS: UnderstoodLists = { terms: [], phrase: [], hadithTerms: [], hadithPhrase: [], read: 0 }

/** Fix «understand» (reply 0071 §2.3): the model's Arabic search words, in every language, and the words of the text
 *  the question names, searched as a phrase. Never shown. */
async function understoodLists(env: Env, u: Understood, withHadith: boolean): Promise<UnderstoodLists> {
  const none = Promise.resolve({ ids: [] as string[], read: 0 })
  const uTermsMatch = u.terms.length ? ftsMatch(u.terms.flatMap((t) => [t, ...queryTerms(t, COMMON)])) : null
  const uPhraseMatch = u.quote ? phraseMatchOf(u.quote) : null
  const sql = (table: string) => `SELECT id, bm25(${table}) AS r FROM ${table} WHERE ${table} MATCH ? ORDER BY r LIMIT ?`
  const [t, p, ht, hp] = await Promise.all([
    uTermsMatch ? fts(env, sql('passages_fts'), uTermsMatch, cfg.ftsTopK) : none,
    uPhraseMatch ? fts(env, sql('passages_fts'), uPhraseMatch, cfg.ftsTopK) : none,
    uTermsMatch && withHadith ? fts(env, sql('hadith_fts'), uTermsMatch, cfg.ftsTopK) : none,
    uPhraseMatch && withHadith ? fts(env, sql('hadith_fts'), uPhraseMatch, cfg.ftsTopK) : none,
  ])
  return { terms: t.ids, phrase: p.ids, hadithTerms: ht.ids, hadithPhrase: hp.ids, read: t.read + p.read + ht.read + hp.read }
}

/** The fusion of retrieve(): the base lists and, with the fix «understand», its lists; the threshold; the block. */
function fuse(b: SearchBase, ul: UnderstoodLists, opts: RetrieveOptions): RetrieveResult {
  const weights = cfg.weights as Record<Source, number>
  const isAr = b.isAr
  const withHadith = b.withHadith
  const u = opts.understood
  const best = new Map(b.best)
  const hbest = new Map(b.hbest)
  // The passages' list: as it is with the hadiths off, letter for letter (0048-add8: the hadiths no longer compete for
  // its places).
  const ranked = rrf(
    {
      vector: [...best.keys()],
      ayah: b.ayah,
      tafsir: dedupe(b.tafsir),
      en: b.en,
      lex: b.lex,
      ...(b.phrase ? { phrase: b.phraseIds } : {}),
      ...(u ? { u_terms: ul.terms, u_phrase: ul.phrase } : {}),
    },
    weights,
    cfg.rrfK,
  ).slice(0, cfg.fusedTopK)
  for (const r of ranked) r.vectorScore = best.get(r.id)
  // Grouped by whether Arabic keyword search ran (language), not by script: Urdu is Arabic script but vector-only.
  const tryScore = typeof opts.minScore === 'number' && opts.minScore >= 0 && opts.minScore <= 1 ? opts.minScore : null
  const minScore = tryScore ?? (isAr ? cfg.threshold.minTopVectorScore.arabic : cfg.threshold.minTopVectorScore.other)
  // The hadiths' block (0048-add8): a list of their own, their vectors and keyword tables fused, the best few, given to
  // the answer beside the passages, never among them; offered only when the best hadith vector reaches its threshold.
  // The measurement may try another threshold on the tuning half (admin route only).
  const tryMin = typeof opts.hadithMin === 'number' && opts.hadithMin >= 0 && opts.hadithMin <= 1 ? opts.hadithMin : null
  const minHadith = tryMin ?? (isAr ? cfg.threshold.minTopHadithScore.arabic : cfg.threshold.minTopHadithScore.other)
  const topHadithScore = b.topHadithScore
  // A hadith found by the phrase offers the block whatever its vector's score (fix «phrase»).
  const hadiths = withHadith && (topHadithScore >= minHadith || b.hadithPhrase.length > 0 || ul.hadithPhrase.length > 0)
    ? rrf(
        {
          hadith_vec: [...hbest.keys()],
          hadith: b.hadith,
          hadith_en: b.hadithEn,
          ...(b.phrase ? { hadith_phrase: b.hadithPhrase } : {}),
          ...(u ? { hadith_u_terms: ul.hadithTerms, hadith_u_phrase: ul.hadithPhrase } : {}),
        },
        weights,
        cfg.rrfK,
      ).slice(0, cfg.hadithBlock.candidates)
    : []
  for (const r of hadiths) r.vectorScore = hbest.get(r.id)
  // The seat replaces the last of the passages sent (finalK) only, and never duplicates a passage already there.
  const seat = b.seat[0]
  if (seat && !ranked.slice(0, cfg.finalK).some((r) => r.id === seat)) {
    const at = ranked.findIndex((r) => r.id === seat)
    const entry = at >= 0 ? ranked.splice(at, 1)[0] : { id: seat, score: 0, foundBy: {} as Retrieved['foundBy'] }
    entry.foundBy = { ...entry.foundBy, seat: 1 } as Retrieved['foundBy']
    ranked.splice(Math.min(cfg.finalK - 1, ranked.length), 0, entry)
    if (ranked.length > cfg.fusedTopK) ranked.pop()
  }

  const topVectorScore = b.topVectorScore
  // The abstention is the passages' own, as with the hadiths off (docs/METHODOLOGY.md, «الاعتذار بالعتبة»).
  // A text found by the phrase (fix «phrase») is not abstained on: the question quoted it.
  const phraseHit = b.phraseIds.length > 0 || b.hadithPhrase.length > 0 || ul.phrase.length > 0 || ul.hadithPhrase.length > 0
  const abstain = ranked.length === 0 || (b.topics.length === 0 && topVectorScore < minScore && !phraseHit)
  return {
    passages: abstain ? [] : ranked.slice(0, cfg.finalK),
    ranked,
    abstain,
    topVectorScore,
    topHadithScore,
    hadiths,
    topics: b.topics,
    rowsRead: b.rowsRead + ul.read,
  }
}
