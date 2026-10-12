// The reader's personal data (reply 0032 C): bookmarks, notes, the daily portion and favourite reciters. On this
// device only (localStorage), never sent anywhere; no accounts. A small external store so every screen stays in step.
import { useSyncExternalStore } from 'react'

export type Bookmark = { sura: number; aya: number; first: string; more: boolean; at: string }
export type Note = { sura: number; aya: number; text: string; first: string; more: boolean; at: string }
/** The khatma plan: its length in days and how many portions are done. No dates, no streak: a missed day changes
 *  nothing, the next portion waits where the reader stopped. */
export type Ward = { days: number; done: number; reminder: boolean }
export type ReadingData = { bookmarks: Bookmark[]; notes: Note[]; ward: Ward; favReciters: number[] }

const KEY = 'muslim.reading.v1'
const EMPTY: ReadingData = { bookmarks: [], notes: [], ward: { days: 30, done: 0, reminder: false }, favReciters: [] }

function read(): ReadingData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ReadingData> | null
    if (!d || typeof d !== 'object') return EMPTY
    return {
      bookmarks: Array.isArray(d.bookmarks) ? d.bookmarks.filter((b) => Number.isInteger(b?.sura) && Number.isInteger(b?.aya)) : [],
      notes: Array.isArray(d.notes) ? d.notes.filter((n) => Number.isInteger(n?.sura) && typeof n?.text === 'string') : [],
      ward: { ...EMPTY.ward, ...(d.ward ?? {}) },
      favReciters: Array.isArray(d.favReciters) ? d.favReciters.filter(Number.isInteger) : [],
    }
  } catch {
    return EMPTY
  }
}

let data: ReadingData = read()
const listeners = new Set<() => void>()
function write(next: ReadingData) {
  data = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable: kept for this session only
  }
  for (const f of listeners) f()
}

export function useReading(): ReadingData {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => data,
    () => data,
  )
}
export const getReading = () => data

const same = (s: number, a: number) => (x: { sura: number; aya: number }) => x.sura === s && x.aya === a
const now = () => new Date().toISOString()

export const isBookmarked = (sura: number, aya: number) => data.bookmarks.some(same(sura, aya))
export function toggleBookmark(sura: number, aya: number, first: { cut: string; more: boolean }) {
  const has = isBookmarked(sura, aya)
  write({
    ...data,
    bookmarks: has ? data.bookmarks.filter((b) => !same(sura, aya)(b)) : [{ sura, aya, first: first.cut, more: first.more, at: now() }, ...data.bookmarks],
  })
  return !has
}
export const removeBookmark = (sura: number, aya: number) => write({ ...data, bookmarks: data.bookmarks.filter((b) => !same(sura, aya)(b)) })

export const noteOf = (sura: number, aya: number) => data.notes.find(same(sura, aya))
export function saveNote(sura: number, aya: number, text: string, first: { cut: string; more: boolean }) {
  const rest = data.notes.filter((n) => !same(sura, aya)(n))
  const t = text.trim()
  write({ ...data, notes: t ? [{ sura, aya, text: t.slice(0, 2000), first: first.cut, more: first.more, at: now() }, ...rest] : rest })
}
export const deleteNote = (sura: number, aya: number) => write({ ...data, notes: data.notes.filter((n) => !same(sura, aya)(n)) })

export const setWard = (patch: Partial<Ward>) => write({ ...data, ward: { ...data.ward, ...patch } })

export function toggleFavReciter(read: number) {
  const has = data.favReciters.includes(read)
  write({ ...data, favReciters: has ? data.favReciters.filter((r) => r !== read) : [...data.favReciters, read] })
}

/** For tests: forget the cached copy and read localStorage again. */
export const reloadReading = () => write(read())
