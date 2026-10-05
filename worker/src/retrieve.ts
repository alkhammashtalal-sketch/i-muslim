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

export type RetrieveOptions = { multiLexicon?: boolean }

/** opts override a setting, for measurement through the admin route only (the answer path passes none). */
export async function retrieve(env: Env, q: string, lang: Lang, mode: Mode = 'new', opts: RetrieveOptions = {}): Promise<RetrieveResult> {
  const multiLexicon = opts.multiLexicon ?? cfg.multiLexicon
  const weights = cfg.weights as Record<Source, number>

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
  const { add, topics } = isAr || isEn ? expand(q, lex) : multiLexicon ? expandMulti(q, lexiconMulti as Lexicon) : { add: [], topics: [] }
  const terms = [...queryTerms(q, COMMON), ...add]
  const match = isAr || isEn ? ftsMatch(terms) : null

  const vectorText = cfg.expandVectorQuery && add.length ? `${q}\n${add.join(' ')}` : q
  const [vec] = await embed(env, [vectorText])

  // Lexicon phrases also get their own ranked list, so a precise phrase is not diluted by general words.
  const lexMatch = (isAr || isOther) && add.length ? ftsMatch(add) : null

  const [v, kwAyah, kwTafsir, kwEn, kwLex] = await Promise.all([
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
  ])

  const best = new Map<string, number>()
  for (const m of v.matches) {
    const pid = passageIdOf(m.id)
    if (!best.has(pid)) best.set(pid, m.score)
  }
  const ranked = rrf(
    { vector: [...best.keys()], ayah: kwAyah.ids, tafsir: dedupe(kwTafsir.ids), en: kwEn.ids, lex: kwLex.ids },
    weights,
    cfg.rrfK,
  ).slice(0, cfg.fusedTopK)
  for (const r of ranked) r.vectorScore = best.get(r.id)

  const topVectorScore = v.matches[0]?.score ?? 0
  // Grouped by whether Arabic keyword search ran (language), not by script: Urdu is Arabic script but vector-only.
  const minScore = isAr ? cfg.threshold.minTopVectorScore.arabic : cfg.threshold.minTopVectorScore.other
  const abstain = ranked.length === 0 || (topics.length === 0 && topVectorScore < minScore)
  return {
    passages: abstain ? [] : ranked.slice(0, cfg.finalK),
    ranked,
    abstain,
    topVectorScore,
    topics,
    rowsRead: kwAyah.read + kwTafsir.read + kwEn.read + kwLex.read,
  }
}
