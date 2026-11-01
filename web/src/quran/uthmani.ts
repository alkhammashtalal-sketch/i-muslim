import { useEffect, useState, useSyncExternalStore } from 'react'
import index from '../../public/uthmani/index.json'
import { loadPrefs, savePrefs } from './prefs'

// The Uthmanic text layer (add-on 0072-add65 §1–§2): the King Fahd Complex's own Uthmanic text of each of its mushafs,
// a second source for the Quran beside (أ), for the Mushaf pages (and later the tajweed and the word sheet; add65 §3,
// add66). One data file per mushaf in public/uthmani (scripts/ingest/qurancomplex-uthmani.mjs, built before each build
// from data/raw; never in git, CLAUDE.md §7), drawn in the Complex's own font for that riwaya, both unmodified. The
// reading text stays (أ)'s everywhere else, and the page view falls back to it when a file is not there.
//   import { uthmaniAyah } from './uthmani'
//   const a = await uthmaniAyah(2, 255)            // { aya: 255, words: ['ٱللَّهُ', 'لَآ', …], hizb?: true } in Hafs, or null
//   const w = await uthmaniAyah(2, 5, 'warsh')     // the same ayah number in another riwaya's own count

export type MushafKey = 'hafs' | 'warsh' | 'qalun' | 'bazzi' | 'qunbul' | 'douri' | 'shubah'
export type MushafInfo = {
  key: MushafKey
  riwaya: { ar: string; latn: string }
  edition: { ar: string; latn: string }
  version: string
  font: string
  total: number
  bytes: number
  /** The text's hash, in its URL: a corrected text is a new URL for the service worker's CacheFirst. */
  v: string
}
export type UthmaniAyah = { aya: number; words: string[]; hizb?: boolean }
export type UthmaniSura = { sura: number; title: string | null; basmala?: string; ayat: UthmaniAyah[] }
export type MushafData = Omit<MushafInfo, 'bytes' | 'v'> & { publisher: { ar: string; latn: string }; source: string; file: string; suras: UthmaniSura[] }

/** The mushafs, Hafs first (the default). */
export const MUSHAFS = index.mushafs as MushafInfo[]
export const DEFAULT_MUSHAF: MushafKey = 'hafs'
/** The one mushaf whose ayat are the reader's ayat (its tap, its recitation and the Madinah pages): Hafs. Shu‘ba has
 *  the same count, but its words are not (أ)'s, so its ayah is not the reader's ayah sheet. */
export const READER_MUSHAF: MushafKey = 'hafs'
export const mushafInfo = (key: MushafKey) => MUSHAFS.find((m) => m.key === key) ?? MUSHAFS[0]

/** An ayah's text as the page shows it: the quarter mark «۞» where the file has it, then the words. */
export const ayahText = (a: UthmaniAyah) => (a.hizb ? '۞ ' : '') + a.words.join(' ')

const pending = new Map<MushafKey, Promise<MushafData>>()
const ready = new Map<MushafKey, MushafData>()
/** A mushaf's whole file (fetched once; on the web the service worker keeps it for offline). Only JSON is taken: the
 *  Worker answers a missing file with the app's page (single-page fallback), which is not the text. */
export function loadMushaf(key: MushafKey = DEFAULT_MUSHAF): Promise<MushafData> {
  let p = pending.get(key)
  if (!p) {
    p = fetch(`/uthmani/${key}.json?v=${mushafInfo(key).v}`).then(async (r) => {
      if (!r.ok || !/json/.test(r.headers.get('content-type') ?? '')) throw new Error(`uthmani ${key}: not here`)
      const d = (await r.json()) as MushafData
      ready.set(key, d)
      return d
    })
    p.catch(() => pending.delete(key))
    pending.set(key, p)
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

/** Whether the layer is served here (its Hafs file answers as JSON): the mushaf choice shows only then. */
let present: Promise<boolean> | null = null
export function layerPresent(): Promise<boolean> {
  present ??= loadMushaf(DEFAULT_MUSHAF).then(
    () => true,
    () => false,
  )
  return present
}
export function useLayerPresent(): boolean {
  const [on, setOn] = useState(ready.size > 0)
  useEffect(() => {
    let alive = true
    layerPresent().then((v) => alive && setOn(v))
    return () => {
      alive = false
    }
  }, [])
  return on
}

/** The CSS family of a mushaf's font (its own name: family names are compared without case, and «KFGQPC Hafs» is the
 *  reading text's face of «الخط والحجم»). */
export const mushafFamily = (key: MushafKey) => `Mushaf Uthmani ${key}`
const added = new Set<MushafKey>()
/** Adds a mushaf's font to the document once (from an effect). */
export function addMushafFont(key: MushafKey) {
  if (added.has(key) || typeof document === 'undefined' || !('fonts' in document) || typeof FontFace === 'undefined') return
  added.add(key)
  const m = mushafInfo(key)
  const face = new FontFace(mushafFamily(key), `url(/uthmani/fonts/${m.font}?v=${m.v}) format('truetype')`, { display: 'swap' })
  document.fonts.add(face)
  face.load().catch(() => added.delete(key))
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

/** How long the page view waits for a mushaf's file before it shows (أ) instead. */
const WAIT_MS = 4000
/** A sura of the chosen mushaf: at once when its file is loaded, undefined while loading, null if it is not here (or
 *  took longer than WAIT_MS: the page then shows (أ), and the mushaf when it comes). */
export function useUthmaniSura(sura: number, key: MushafKey, on = true): UthmaniSura | null | undefined {
  const k = `${key}|${sura}`
  const now = () => (ready.has(key) ? (ready.get(key)!.suras[sura - 1] ?? null) : undefined)
  const [s, setS] = useState<{ k: string; v: UthmaniSura | null | undefined }>(() => ({ k, v: now() }))
  useEffect(() => {
    if (!on) return
    addMushafFont(key)
    if (ready.has(key)) return
    let alive = true
    const late = setTimeout(() => alive && setS((x) => (x.k === k && x.v === undefined ? { k, v: null } : x)), WAIT_MS)
    uthmaniSura(sura, key).then(
      (v) => alive && setS({ k, v }),
      () => alive && setS({ k, v: null }),
    )
    return () => {
      alive = false
      clearTimeout(late)
    }
  }, [sura, key, on, k])
  return s.k === k ? s.v : now()
}
