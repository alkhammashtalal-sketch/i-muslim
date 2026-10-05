export type Source = 'vector' | 'ayah' | 'tafsir' | 'en'
export type Retrieved = {
  id: string // a displayable passage: quran:<s>:<a> | aqeedah:… | hadith:…
  score: number // RRF score
  foundBy: Partial<Record<Source, number>> // rank (1-based) in each list that found it
  vectorScore?: number // best cosine similarity among vectors mapped to this passage
}

/** A tafsir chunk or tafsir row maps back to the ayah it explains. */
export function passageIdOf(id: string): string {
  if (id.startsWith('tafsir:')) {
    const [, , s, a] = id.split(':')
    return `quran:${s}:${a}`
  }
  return id
}

/** Reciprocal Rank Fusion over ranked id lists; each id keeps its best rank per list. */
export function rrf(lists: Partial<Record<Source, string[]>>, weights: Record<Source, number>, k: number): Retrieved[] {
  const acc = new Map<string, Retrieved>()
  for (const [src, ids] of Object.entries(lists) as [Source, string[]][]) {
    ids.forEach((id, i) => {
      const r = acc.get(id) ?? { id, score: 0, foundBy: {} }
      if (r.foundBy[src] === undefined) {
        r.foundBy[src] = i + 1
        r.score += (weights[src] ?? 1) / (k + i + 1)
      }
      acc.set(id, r)
    })
  }
  return [...acc.values()].sort((a, b) => b.score - a.score)
}

