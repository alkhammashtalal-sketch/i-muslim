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
import { ftsMatch, normalizeArabic, queryTerms } from './lib/normalize'

export const EMBED_MODEL = '@cf/baai/bge-m3'

export type { Retrieved, Source }
export type RetrieveResult = {
  passages: Retrieved[] // top finalK, empty when abstaining
  ranked: Retrieved[] // top fusedTopK, before the threshold (for evaluation)
  abstain: boolean
  topVectorScore: number
  /** The best hadith vector's similarity (reply 0048), 0 with the hadiths off. */
  topHadithScore?: number
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
export type RetrieveOptions = { multiLexicon?: boolean; hadith?: boolean; hadithWeight?: number; hadithWeightOther?: number }

/** A question that asks for an ayah («آية», "verse"): the hadiths do not compete with the ayat for it (reply 0048). */
const ASKS_AYAH = /(^|[\s«"(])(ال)?(آيه|ايه|آية|اية|آيات|ايات|آيتين|ايتين)([\s»")؟?.,،]|$)|\b(verse|verses|ayah|ayat|aya)\b/i

export const hadithRetrievalOn = (env: Env, override?: boolean) => (override ?? env.HADITH_RETRIEVAL === 'on') && !!env.VECTORIZE_HADITH

/** opts override a setting, for measurement through the admin route only (the answer path passes none). */
export async function retrieve(env: Env, q: string, lang: Lang, mode: Mode = 'new', opts: RetrieveOptions = {}): Promise<RetrieveResult> {
  const multiLexicon = opts.multiLexicon ?? cfg.multiLexicon
  // The hadith lists' weight (reply 0048, tuned on the tuning half): 1 where keyword search runs (Arabic, English), less
  // in the languages searched by meaning alone, where the hadiths' vector list is the whole of a hadith's score and
  // would push the ayat down one for one. The measurement may try others (admin route only).
  const okW = (x: unknown) => (typeof x === 'number' && x >= 0 && x <= 2 ? x : null)
  const keyword = (ARABIC.test(q) && cfg.arabicFtsLangs.includes(lang)) || lang === 'en' // isAr || isEn below
  const hw = keyword ? (okW(opts.hadithWeight) ?? cfg.hadithWeight.keyword) : (okW(opts.hadithWeightOther) ?? cfg.hadithWeight.meaningOnly)
  const weights = { ...cfg.weights, hadith_vec: hw, hadith: hw, hadith_en: hw } as Record<Source, number>
  const withHadith = hadithRetrievalOn(env, opts.hadith) && !ASKS_AYAH.test(q)

  if (mode === 'baseline') {
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
  const [vh, kwHadith, kwHadithEn] = withHadith
    ? await Promise.all([
        env.VECTORIZE_HADITH!.query(vec, { topK: cfg.vectorTopK }),
        hadithMatch ? fts(env, 'SELECT id, bm25(hadith_fts) AS r FROM hadith_fts WHERE hadith_fts MATCH ? ORDER BY r LIMIT ?', hadithMatch, cfg.ftsTopK) : none,
        isEn ? fts(env, 'SELECT id, bm25(hadith_en_fts) AS r FROM hadith_en_fts WHERE hadith_en_fts MATCH ? ORDER BY r LIMIT ?', match, cfg.ftsTopK) : none,
      ])
    : [null, { ids: [], read: 0 }, { ids: [], read: 0 }]

  const [v, kwAyah, kwTafsir, kwEn, kwLex, kwSeat] = await Promise.all([
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
  ])

  // The hadiths' vectors are a list of their own (reply 0048): merged into the passages' list by score they pushed ayat
  // out of it (measured on the tuning half, eval/reports/retrieval-0048-after-tune-*-merge), most in the languages
  // searched by meaning alone. Each hadith counts once, by its best vector (its own or a part of its explanation).
  const matches = v.matches
  const hbest = new Map<string, number>()
  for (const m of vh?.matches ?? []) {
    const pid = passageIdOf(m.id)
    if (!hbest.has(pid)) hbest.set(pid, m.score)
  }
  const best = new Map<string, number>()
  for (const m of matches) {
    const pid = passageIdOf(m.id)
    if (!best.has(pid)) best.set(pid, m.score)
  }
  const ranked = rrf(
    {
      vector: [...best.keys()],
      ayah: kwAyah.ids,
      tafsir: dedupe(kwTafsir.ids),
      en: kwEn.ids,
      lex: kwLex.ids,
      ...(withHadith ? { hadith_vec: [...hbest.keys()], hadith: kwHadith.ids, hadith_en: kwHadithEn.ids } : {}),
    },
    weights,
    cfg.rrfK,
  ).slice(0, cfg.fusedTopK)
  for (const r of ranked) r.vectorScore = best.get(r.id) ?? hbest.get(r.id)
  // The seat replaces the last of the passages sent (finalK) only, and never duplicates a passage already there.
  const seat = kwSeat.ids[0]
  if (seat && !ranked.slice(0, cfg.finalK).some((r) => r.id === seat)) {
    const at = ranked.findIndex((r) => r.id === seat)
    const entry = at >= 0 ? ranked.splice(at, 1)[0] : { id: seat, score: 0, foundBy: {} as Retrieved['foundBy'] }
    entry.foundBy = { ...entry.foundBy, seat: 1 } as Retrieved['foundBy']
    ranked.splice(Math.min(cfg.finalK - 1, ranked.length), 0, entry)
    if (ranked.length > cfg.fusedTopK) ranked.pop()
  }

  const topVectorScore = matches[0]?.score ?? 0
  const topHadithScore = vh?.matches[0]?.score ?? 0
  // Grouped by whether Arabic keyword search ran (language), not by script: Urdu is Arabic script but vector-only.
  const minScore = isAr ? cfg.threshold.minTopVectorScore.arabic : cfg.threshold.minTopVectorScore.other
  // A hadith alone keeps the answer from abstaining only above a threshold of its own (reply 0048): many hadiths are
  // near any religious question, as the creed books and the ayat were (docs/METHODOLOGY.md, «الاعتذار بالعتبة»).
  const minHadith = isAr ? cfg.threshold.minTopHadithScore.arabic : cfg.threshold.minTopHadithScore.other
  const abstain = ranked.length === 0 || (topics.length === 0 && topVectorScore < minScore && topHadithScore < minHadith)
  return {
    passages: abstain ? [] : ranked.slice(0, cfg.finalK),
    ranked,
    abstain,
    topVectorScore,
    topHadithScore,
    topics,
    rowsRead: kwAyah.read + kwTafsir.read + kwEn.read + kwLex.read + kwSeat.read + kwHadith.read + kwHadithEn.read,
  }
}
