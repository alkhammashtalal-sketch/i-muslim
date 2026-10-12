// Goals and the daily portion (reply 0031-add10, §7): on the device only. The count is of the days done, never of
// consecutive days, and it never goes back to zero (Talal: no pressing day counter).
export type Goal = { id: string; title: string; createdAt: string; doneDays: string[] }

const KEY = 'muslim.goals.v1'
type Store = Pick<Storage, 'getItem' | 'setItem'>

export function loadGoals(storage: Store | undefined = globalThis.localStorage): Goal[] {
  try {
    const g = JSON.parse(storage?.getItem(KEY) ?? '[]') as Goal[]
    return Array.isArray(g) ? g.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.doneDays)) : []
  } catch {
    return []
  }
}

export function saveGoals(goals: Goal[], storage: Store | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(goals))
  } catch {}
}

/** Mark a day (YYYY-MM-DD, the user's local date) done or not; the list stays sorted and without repeats. */
export function setDone(goal: Goal, day: string, done: boolean): Goal {
  const days = new Set(goal.doneDays)
  if (done) days.add(day)
  else days.delete(day)
  return { ...goal, doneDays: [...days].sort() }
}

/** How many days have been done: no streaks, no reset. */
export const daysDone = (goal: Goal) => new Set(goal.doneDays).size
