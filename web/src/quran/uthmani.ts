import { useEffect, useState, useSyncExternalStore } from 'react'
import index from '../../public/uthmani/index.json'
import { loadPrefs, savePrefs } from './prefs'

// The Uthmanic text layer (add-on 0072-add65 §1–§2): the King Fahd Complex's own Uthmanic text of each of its mushafs,
// a second source for the Quran beside (أ), for the Mushaf pages (and later the tajweed and the word sheet; add65 §3,
// add66). One data file per mushaf in public/uthmani (scripts/ingest/qurancomplex-uthmani.mjs), drawn in the Complex's
// own font for that riwaya, both unmodified. The reading text stays (أ)'s everywhere else.
//   import { uthmaniAyah } from './uthmani'
//   const a = await uthmaniAyah(2, 255)            // { words: ['ٱللَّهُ', 'لَآ', …], hizb?: true } in Hafs, or null
//   const w = await uthmaniAyah(2, 5, 'warsh')     // the same ayah number in another riwaya's own count

export type MushafKey = 'hafs' | 'warsh' | 'qalun' | 'bazzi' | 'qunbul' | 'douri' | 'shubah'
export type MushafInfo = {
  key: MushafKey
  riwaya: { ar: string; latn: string }
  edition: { ar: string; latn: string }
  font: string
  total: number
  bytes: number
}
export type UthmaniAyah = { aya: number; words: string[]; hizb?: boolean }
export type UthmaniSura = { sura: number; basmala?: string; ayat: UthmaniAyah[] }
export type MushafData = MushafInfo & { publisher: { ar: string; latn: string }; source: string; file: string; suras: UthmaniSura[] }

/** The mushafs, Hafs first (the default). */
export const MUSHAFS = index.mushafs as MushafInfo[]
export const DEFAULT_MUSHAF: MushafKey = 'hafs'
/** Riwayat with Hafs's count (Kufi, 6,236 ayat, the same numbers in every sura): their ayat are the reader's ayat. */
export const SAME_NUMBERS: readonly MushafKey[] = ['hafs', 'shubah']
export const mushafInfo = (key: MushafKey) => MUSHAFS.find((m) => m.key === key) ?? MUSHAFS[0]

const cache = new Map<MushafKey, Promise<MushafData>>()
/** A mushaf's whole file (fetched once; on the web the service worker keeps it for offline). */
export function loadMushaf(key: MushafKey = DEFAULT_MUSHAF): Promise<MushafData> {
  let p = cache.get(key)
  if (!p) {
    p = fetch(`/uthmani/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`uthmani ${key}: HTTP ${r.status}`)
      return r.json() as Promise<MushafData>
    })
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

/** A sura of a mushaf, or null if it has none by that number. */
export async function uthmaniSura(sura: number, key: MushafKey = DEFAULT_MUSHAF): Promise<UthmaniSura | null> {
  return (await loadMushaf(key)).suras[sura - 1] ?? null
}

/** The Uthmanic words of an ayah, by the riwaya's own numbering, or null. */
export async function uthmaniAyah(sura: number, aya: number, key: MushafKey = DEFAULT_MUSHAF): Promise<UthmaniAyah | null> {
  return (await uthmaniSura(sura, key))?.ayat[aya - 1] ?? null
}

/** The CSS family of a mushaf's font, added to the document once, when first used. (Its own name: family names are
 *  compared without case, and «KFGQPC Hafs» is the reading text's face of «الخط والحجم».) */
const added = new Set<MushafKey>()
export function mushafFont(key: MushafKey): string {
  const family = `Mushaf Uthmani ${key}`
  if (!added.has(key) && typeof document !== 'undefined' && 'fonts' in document && typeof FontFace !== 'undefined') {
    added.add(key)
    const face = new FontFace(family, `url(/uthmani/fonts/${mushafInfo(key).font}) format('truetype')`, { display: 'swap' })
    document.fonts.add(face)
    face.load().catch(() => added.delete(key))
  }
  return family
}

// The chosen mushaf, with the reader's preferences (copied to iCloud on the iPhone).
const pick = (v: unknown): MushafKey => (MUSHAFS.some((m) => m.key === v) ? (v as MushafKey) : DEFAULT_MUSHAF)
let chosen: MushafKey = pick(loadPrefs().mushaf)
const listeners = new Set<() => void>()
export function setMushaf(key: MushafKey) {
  chosen = pick(key)
  savePrefs({ mushaf: chosen })
  for (const f of listeners) f()
}
export function useMushafKey(): MushafKey {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => chosen,
    () => chosen,
  )
}

/** A sura of the chosen mushaf, loaded on demand: undefined while loading, null if it failed. */
export function useUthmaniSura(sura: number, key: MushafKey, on = true): UthmaniSura | null | undefined {
  const [s, setS] = useState<{ k: string; v: UthmaniSura | null } | null>(null)
  const k = `${key}|${sura}`
  useEffect(() => {
    if (!on) return
    let alive = true
    uthmaniSura(sura, key).then(
      (v) => alive && setS({ k, v }),
      () => alive && setS({ k, v: null }),
    )
    return () => {
      alive = false
    }
  }, [sura, key, on, k])
  return s && s.k === k ? s.v : undefined
}
