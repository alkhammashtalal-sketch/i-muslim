// Pinning a source (V2_UI_SPEC §8): one choice per type (the tafsir of the ayat; hadith explanations), on the device.
// «best» (the default) shows the best match first; a source key pins it first; «all» shows them all in order.
// The suggestion line («تبغى السعدي أول دائمًا؟») appears once the same non-best source was chosen in two answers;
// «لا» stops it for that source. The first-time tip (§10) is shown once per device.
import { useEffect, useState } from 'react'

export type PinType = 'tafsir' | 'hadith'
export type PinValue = 'best' | 'all' | string
type Store = { pins: Record<PinType, PinValue>; picks: Record<string, string[]>; declined: string[]; tipSeen: boolean }

const KEY = 'muslim.sources.v1'
const EMPTY: Store = { pins: { tafsir: 'best', hadith: 'best' }, picks: {}, declined: [], tipSeen: false }
const EVENT = 'muslim-sources-change'

function read(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Store> | null
    return { ...EMPTY, ...s, pins: { ...EMPTY.pins, ...(s?.pins ?? {}) } }
  } catch {
    return EMPTY
  }
}
function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function useSources() {
  const [s, setS] = useState(read)
  useEffect(() => {
    const on = () => setS(read())
    window.addEventListener(EVENT, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return s
}

export const setPin = (type: PinType, value: PinValue) => {
  const s = read()
  write({ ...s, pins: { ...s.pins, [type]: value } })
}

/** A choice of a non-best source in one answer; returns nothing (the hook re-reads). */
export function notePick(source: string, answer: string) {
  const s = read()
  const list = s.picks[source] ?? []
  if (list.includes(answer)) return
  write({ ...s, picks: { ...s.picks, [source]: [...list, answer].slice(-5) } })
}

export const declineSuggestion = (source: string) => {
  const s = read()
  if (!s.declined.includes(source)) write({ ...s, declined: [...s.declined, source] })
}

/** Suggest pinning `source` when it was chosen in two different answers, is not pinned, and was not declined. */
export const shouldSuggest = (s: Store, type: PinType, source: string) =>
  s.pins[type] !== source && !s.declined.includes(source) && (s.picks[source]?.length ?? 0) >= 2

export const markTipSeen = () => write({ ...read(), tipSeen: true })
