// Repeat to memorise (reply 0032 C-4): an ayah or a range played again and again in the chosen reciter's own
// recorded voice (mp3quran, through web/src/quran/recitation.ts), a set number of times or without end, with a pause
// between rounds. Never a machine voice. Started from the user's press only (iOS plays only inside a press; the later
// rounds reuse the same audio element, which the press unlocked).
import { useSyncExternalStore } from 'react'
import { getRecitation, playThen, stop } from '../../quran/recitation'

export type RepeatState =
  | { active: false }
  | { active: true; sura: number; from: number; to: number; total: number | null; round: number; pauseMs: number; waiting: boolean }

let state: RepeatState = { active: false }
let timer = 0
const listeners = new Set<() => void>()
const set = (s: RepeatState) => {
  state = s
  for (const f of listeners) f()
}

function round() {
  if (!state.active) return
  const s = state
  set({ ...s, waiting: false })
  playThen(s.sura, s.from, s.to, () => {
    if (!state.active) return
    const done = state.total !== null && state.round >= state.total
    if (done) return set({ active: false })
    set({ ...state, waiting: true })
    timer = window.setTimeout(() => {
      if (!state.active) return
      set({ ...state, round: state.round + 1 })
      round()
    }, state.pauseMs)
  })
}

/** total: a number of rounds, or null for without end. */
export function startRepeat(sura: number, from: number, to: number, total: number | null, pauseMs: number) {
  stopRepeat()
  set({ active: true, sura, from, to, total, round: 1, pauseMs, waiting: false })
  round()
}

export function stopRepeat() {
  window.clearTimeout(timer)
  const was = state.active
  set({ active: false })
  if (was && getRecitation().status !== 'idle') stop()
}

export function useRepeat(): RepeatState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => state,
    () => state,
  )
}
