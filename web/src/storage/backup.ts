// «نسخة احتياطية من بياناتي» (add-on 0072-add25 §5): the person's data as one JSON file they keep where they choose
// (the share sheet's «Save to Files»), and «استعادة» from such a file. No server, no account: the file is made and read
// on the device. A file is restored only when every part of it is what this app writes; otherwise nothing is touched.
import { deviceStorage, flushStorage, isUserKey, storageEntries, type KeyValue } from './device'

export const BACKUP_FORMAT = 'muslim-backup'
export const BACKUP_VERSION = 1
/** Not carried: what belongs to this device alone. The downloaded recitations' list and queue (the files themselves
 *  stay on the device and are not in the file), and the ids of questions still in review (kept a week on the server). */
export const NOT_IN_BACKUP = new Set(['imuslim.downloads.v1', 'imuslim.downloads.queue.v1', 'ask.pending'])
export const inBackup = (k: string) => isUserKey(k) && !NOT_IN_BACKUP.has(k)

const MAX_FILE = 2 * 1024 * 1024
const MAX_VALUE = 512 * 1024
const MAX_KEYS = 100

export type Backup = { format: typeof BACKUP_FORMAT; v: typeof BACKUP_VERSION; created: string; data: Record<string, string> }

/** The file's content now. */
export function makeBackup(entries: Map<string, string> = storageEntries(), now = new Date()): Backup {
  const data: Record<string, string> = {}
  for (const [k, v] of [...entries].sort(([a], [b]) => a.localeCompare(b))) if (inBackup(k)) data[k] = v
  return { format: BACKUP_FORMAT, v: BACKUP_VERSION, created: now.toISOString(), data }
}

export const backupFileName = (now = new Date()) => `muslim-backup-${now.toISOString().slice(0, 10)}.json`

export type Parsed = { ok: true; data: Record<string, string>; keys: number } | { ok: false; reason: 'size' | 'json' | 'shape' | 'key' | 'value' }

/** Strict: the file must be this app's backup, version 1, with only the app's own keys and each value valid JSON. */
export function parseBackup(text: string): Parsed {
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_FILE) return { ok: false, reason: 'size' }
  let o: unknown
  try {
    o = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'json' }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, reason: 'shape' }
  const b = o as Record<string, unknown>
  const fields = Object.keys(b).sort().join(',')
  if (fields !== 'created,data,format,v' || b.format !== BACKUP_FORMAT || b.v !== BACKUP_VERSION) return { ok: false, reason: 'shape' }
  if (typeof b.created !== 'string' || Number.isNaN(Date.parse(b.created))) return { ok: false, reason: 'shape' }
  const d = b.data
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, reason: 'shape' }
  const keys = Object.keys(d)
  if (keys.length === 0 || keys.length > MAX_KEYS) return { ok: false, reason: 'shape' }
  const data: Record<string, string> = {}
  for (const k of keys) {
    if (!inBackup(k)) return { ok: false, reason: 'key' }
    const v = (d as Record<string, unknown>)[k]
    if (typeof v !== 'string' || v.length > MAX_VALUE) return { ok: false, reason: 'value' }
    try {
      JSON.parse(v)
    } catch {
      return { ok: false, reason: 'value' }
    }
    data[k] = v
  }
  return { ok: true, data, keys: keys.length }
}

/** Writes the file's keys (the others stay as they are), then waits until they are kept. The caller reloads the app,
 *  so every screen reads them again. */
export async function restoreBackup(data: Record<string, string>, s: KeyValue = deviceStorage, flush: () => Promise<void> = flushStorage) {
  for (const [k, v] of Object.entries(data)) if (inBackup(k)) s.setItem(k, v)
  await flush()
}
