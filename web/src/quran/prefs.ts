// Reader preferences on this device only (localStorage): reading mode and last position.
export type ReadMode = 'mushaf' | 'ayah'
type Prefs = { mode?: ReadMode; last?: { sura: number; aya: number } }

const KEY = 'imuslim.reader.v1'

export function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

export function savePrefs(patch: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...patch }))
  } catch {
    // storage unavailable: the reader still works, it just won't remember
  }
}
