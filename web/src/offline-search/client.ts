import type MiniSearch from 'minisearch'
import { offline } from '../native/boot'
import { boxText, situations, stepsOf } from '../v2/daily/mawaqif/mawaqif-model'
import { buildIndex, loadCorpus, placesIn, searchIndex, type Doc, type Place, type Result, type SuraName } from './search'

// The offline search on the device (reply 0056 ب): built once, at the first search with no connection, from the
// app's own files (capacitor://localhost/offline/…, never the network), the reader's downloaded meanings, and
// «أذكار المواقف» from the app's data.

let built: Promise<{ ms: MiniSearch<Doc>; suras: SuraName[] }> | null = null
let builtFor = ''

const bundle = async (rel: string) => {
  try {
    const r = await fetch(`/offline/${rel}`)
    if (!r.ok) return null
    const text = await r.text()
    // A web build without the app's files answers with the page itself.
    return text.startsWith('<') ? null : text
  } catch {
    return null
  }
}

function mawaqifDocs() {
  const out: { id: string; text: string; ref: string; path: string }[] = []
  for (const s of situations())
    stepsOf(s).forEach((st, i) => {
      const words = st.item.segments?.length ? boxText(st.item.segments) : ''
      if (words) out.push({ id: `${s.id}:${i}`, text: words, ref: [s.name.ar, st.item.attribution].filter(Boolean).join(' · '), path: `/mawaqif/${s.id}${st.stage.id ? `?step=${st.stage.id}` : ''}` })
    })
  return out
}

function index(content: string) {
  if (built && builtFor === content) return built
  builtFor = content
  built = (async () => {
    const manifest = JSON.parse((await bundle('manifest.json')) ?? '{}') as { adhkar?: { categories?: string[] } }
    const meanings =
      offline && content !== 'ar' && content !== 'en'
        ? async (n: number) => {
            const m = await offline!.meaningOf(content, n)
            if (!m) return null
            return Object.fromEntries(Object.entries(m.meanings).map(([k, v]) => [k, v.text]))
          }
        : undefined
    const { docs, suras } = await loadCorpus({ bundle, meanings, mawaqif: mawaqifDocs, adhkarCategories: manifest.adhkar?.categories ?? [] })
    return { ms: buildIndex(docs), suras }
  })()
  built.catch(() => {
    built = null
  })
  return built
}

export type OfflineFound = { places: Place[]; results: Result[] }
/** The ten best rows for a question, and the places it names, from what is on the device. */
export async function searchOffline(q: string, content: string): Promise<OfflineFound> {
  const { ms, suras } = await index(content)
  return { places: placesIn(q, suras), results: searchIndex(ms, q, 10) }
}
