// Reader preferences (localStorage, copied to iCloud on the iPhone: storage/cloud.ts): reading mode, last position, and
// the font and sizes (reader-display.ts, add-on 0072-add60 §5).
import { deviceStorage } from '../storage/device'
export type ReadMode = 'mushaf' | 'ayah'
type Prefs = { mode?: ReadMode; last?: { sura: number; aya: number }; display?: unknown }

const KEY = 'imuslim.reader.v1'

export function loadPrefs(): Prefs {
  try {
    return JSON.parse(deviceStorage.getItem(KEY) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

export function savePrefs(patch: Prefs) {
  try {
    deviceStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...patch }))
  } catch {
    // storage unavailable: the reader still works, it just won't remember
  }
}
