import { useEffect, useState } from 'react'
import type { SuraSummary } from '../../../../shared/api'
import { getSuras } from '../../quran/api'

/** The 114 suras (names from D1, Arabic), once per visit; null while loading or offline. */
export function useSuras(): SuraSummary[] | null {
  const [s, setS] = useState<SuraSummary[] | null>(null)
  useEffect(() => {
    let alive = true
    getSuras().then(
      (x) => alive && setS(x),
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [])
  return s
}

/** A sura's name isolated for the text around it (U+2068 … U+2069), so «البقرة · 255 · page 42» keeps its order in a
 *  left-to-right interface; the number when the names are not loaded yet. */
export const isolate = (name: string) => `\u2068${name}\u2069`
