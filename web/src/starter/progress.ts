import { useSyncExternalStore } from 'react'
import type { Lang } from '../../../shared/api'
import path from '../config/starter-path.json'

export type Step = { id: string; title: Record<Lang, string>; q: Record<Lang, string>; topic: Record<Lang, string> }
export const STEPS = (path as { steps: Step[] }).steps

// The steps read (their question asked) and finished («أنهيت هذه الخطوة»), on this device only: no tracking on the
// server. One key, shared by the list and the step's page, so both show the same state.
const KEY = 'imuslim.starter.v1'
export type Progress = { read: string[]; done: string[] }
const EMPTY: Progress = { read: [], done: [] }
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

let cache: Progress | null = null
const subs = new Set<() => void>()

function load(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Progress>
    return { read: ids(v.read), done: ids(v.done) }
  } catch {
    return EMPTY
  }
}
export const getProgress = () => (cache ??= load())
function save(p: Progress) {
  cache = p
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage unavailable: kept for this visit only
  }
  subs.forEach((f) => f())
}
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => void subs.delete(f)
}

/** The step's question was asked (as before: the list shows it read). */
export function markRead(id: string) {
  const p = getProgress()
  if (!p.read.includes(id)) save({ ...p, read: [...p.read, id] })
}
/** «أنهيت هذه الخطوة», pressed again to undo. */
export function setDone(id: string, on: boolean) {
  const p = getProgress()
  const done = on ? (p.done.includes(id) ? p.done : [...p.done, id]) : p.done.filter((x) => x !== id)
  if (done !== p.done) save({ ...p, done })
}
export const useProgress = () => useSyncExternalStore(subscribe, getProgress, getProgress)
