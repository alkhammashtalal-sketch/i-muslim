import { useSyncExternalStore } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Network } from '@capacitor/network'
import config from '../config/recitation.json'
import sizes from '../config/recitation-sizes.json'
import { isAndroid, isNative } from '../native/platform'

// Downloaded recitations (reply 0056 أ): the very files of mp3quran.net that the player streams (whose terms say «جميع
// الحقوق متاحة للجميع و يحق لأي زائر أو مطور استخدام اي مادة أو رابط من الموقع»), kept on the device so a sura plays
// with no connection. Nothing is downloaded unless the user presses «تنزيل».
// - The iOS app: @capacitor/filesystem downloads each file to Library/Application Support/recitations/<read>/<sura>.mp3
//   (Filesystem.downloadFile, its native download with progress; the plugin marks it deprecated in favour of
//   @capacitor/file-transfer, whose iOS package must be fetched anew, and it works as it is), and deletes it; a folder
//   the small RecitationStore plugin excludes from the
//   iCloud backup (NSURLIsExcludedFromBackupKey; RecitationStorePlugin.swift): it can be downloaded again, and the
//   system does not purge it as it does Caches.
// - The browser: the Cache Storage of this site, with the timing file beside it.
// Which suras are here, and their bytes, is kept in localStorage; a file found missing at play time is streamed again.

type Reciter = { read: number; server: string }
const RECITERS = config.reciters as Reciter[]
const SIZES = sizes as Record<string, number[]>
const KEY = 'imuslim.downloads.v1'
const QUEUE_KEY = 'imuslim.downloads.queue.v1'
const CACHE = 'imuslim-recitations-v1'
export const DIR = 'Application Support/recitations'

const pad = (sura: number) => String(sura).padStart(3, '0')
const server = (read: number) => RECITERS.find((r) => r.read === read)?.server ?? ''
export const remoteUrl = (read: number, sura: number) => `${server(read)}${pad(sura)}.mp3`
const timingUrl = (read: number, sura: number) => `/recitation/${read}/${sura}.json`
const filePath = (read: number, sura: number) => `${DIR}/${read}/${pad(sura)}.mp3`

/** The size of a sura's recording, in bytes, as mp3quran's server gave it (scripts/ingest/recitation-sizes.mjs). */
export const suraBytes = (read: number, sura: number) => SIZES[String(read)]?.[sura - 1] ?? 0
/** A whole Mushaf in one reciter's voice. */
export const reciterBytes = (read: number) => (SIZES[String(read)] ?? []).reduce((a, b) => a + b, 0)

// ---- What is on the device ----------------------------------------------------------------------------------------
type Index = Record<string, Record<string, number>> // read → sura → bytes
let index: Index = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Index
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
})()
const listeners = new Set<() => void>()
const emit = () => {
  for (const f of listeners) f()
}
function saveIndex(next: Index) {
  index = next
  try {
    localStorage.setItem(KEY, JSON.stringify(index))
  } catch {
    // no storage: the list lasts for this visit
  }
  emit()
}
export const isDownloaded = (read: number, sura: number) => !!index[String(read)]?.[String(sura)]
export const downloadedSuras = (read: number) => Object.keys(index[String(read)] ?? {}).map(Number).sort((a, b) => a - b)
export const downloadedBytes = (read?: number) =>
  Object.entries(index)
    .filter(([r]) => read === undefined || r === String(read))
    .reduce((a, [, s]) => a + Object.values(s).reduce((x, y) => x + y, 0), 0)
export const downloadedReciters = () => Object.keys(index).filter((r) => Object.keys(index[r]).length).map(Number)

function mark(read: number, sura: number, bytes: number | null) {
  const r = String(read)
  const next: Index = { ...index, [r]: { ...(index[r] ?? {}) } }
  if (bytes) next[r][String(sura)] = bytes
  else delete next[r][String(sura)]
  if (!Object.keys(next[r]).length) delete next[r]
  saveIndex(next)
}

// ---- The progress of what is downloading ----------------------------------------------------------------------------
export type Job = { read: number; sura: number; bytes: number; total: number }
/** A whole Mushaf being downloaded: the suras left, and whether the user paused it. Kept, so a paused or interrupted one
 *  can be resumed later. */
export type Queue = { read: number; left: number[]; paused: boolean }
let job: Job | null = null
let queue: Queue | null = (() => {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? 'null') as Queue | null
    // After a relaunch a queue that was running shows as paused: nothing downloads without a press.
    return q && Array.isArray(q.left) && q.left.length ? { ...q, paused: true } : null
  } catch {
    return null
  }
})()
let failed: { read: number; sura: number } | null = null
function setQueue(q: Queue | null) {
  queue = q
  try {
    if (q) localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    else localStorage.removeItem(QUEUE_KEY)
  } catch {
    // no storage
  }
  emit()
}

export type DownloadsState = { index: Index; job: Job | null; queue: Queue | null; failed: { read: number; sura: number } | null }
let snapshot: DownloadsState = { index, job, queue, failed }
function snap(): DownloadsState {
  if (snapshot.index !== index || snapshot.job !== job || snapshot.queue !== queue || snapshot.failed !== failed) snapshot = { index, job, queue, failed }
  return snapshot
}
export function useDownloads(): DownloadsState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    snap,
    snap,
  )
}
export const getDownloads = snap

// ---- The two stores --------------------------------------------------------------------------------------------------
type RecitationStore = { prepare(o: { path: string }): Promise<{ excluded: boolean }> }
const Store = registerPlugin<RecitationStore>('RecitationStore')

async function nativeUri(path: string) {
  return (await Filesystem.getUri({ directory: Directory.Library, path })).uri
}
let prepared: Promise<void> | null = null
/** The folder, once: made, and excluded from the backup (the flag on a folder covers what is put in it). Android has no
 *  RecitationStore (iOS code): its backup rules leave the folder out instead (android/app/src/main/res/xml, reply 0066). */
function prepareDir(): Promise<void> {
  prepared ??= (async () => {
    await Filesystem.mkdir({ directory: Directory.Library, path: DIR, recursive: true }).catch(() => undefined)
    if (!isAndroid()) await Store.prepare({ path: await nativeUri(DIR) })
  })().catch((e) => {
    prepared = null
    throw e
  })
  return prepared
}

async function downloadNative(read: number, sura: number, onBytes: (b: number, t: number) => void): Promise<number> {
  await prepareDir()
  await Filesystem.mkdir({ directory: Directory.Library, path: `${DIR}/${read}`, recursive: true }).catch(() => undefined)
  const part = `${filePath(read, sura)}.part`
  const url = remoteUrl(read, sura)
  // One download at a time, so every progress event is this one's (its URL may be the redirect's).
  const handle = await Filesystem.addListener('progress', (p) => onBytes(p.bytes, p.contentLength || suraBytes(read, sura)))
  try {
    await Filesystem.downloadFile({ url, directory: Directory.Library, path: part, progress: true, recursive: true })
  } finally {
    await handle.remove()
  }
  await Filesystem.rename({ directory: Directory.Library, from: part, to: filePath(read, sura), toDirectory: Directory.Library })
  const st = await Filesystem.stat({ directory: Directory.Library, path: filePath(read, sura) })
  return st.size || suraBytes(read, sura)
}

async function downloadWeb(read: number, sura: number, onBytes: (b: number, t: number) => void): Promise<number> {
  const url = remoteUrl(read, sura)
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`)
  const total = Number(res.headers.get('content-length')) || suraBytes(read, sura)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    got += value.byteLength
    onBytes(got, total)
  }
  const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
  const cache = await caches.open(CACHE)
  await cache.put(url, new Response(blob, { headers: { 'content-type': 'audio/mpeg', 'content-length': String(blob.size) } }))
  // The timing file beside it, so the ayah is followed with no connection (the app has it in its bundle already).
  const t = await fetch(timingUrl(read, sura)).catch(() => null)
  if (t?.ok) await cache.put(timingUrl(read, sura), t)
  return blob.size
}

/** One sura, now. Resolves when it is on the device. */
export async function downloadSura(read: number, sura: number): Promise<void> {
  if (isDownloaded(read, sura)) return
  if (job) throw new Error('busy')
  failed = null
  job = { read, sura, bytes: 0, total: suraBytes(read, sura) }
  emit()
  try {
    const bytes = await (isNative() ? downloadNative : downloadWeb)(read, sura, (b, t) => {
      job = { read, sura, bytes: b, total: t || suraBytes(read, sura) }
      emit()
    })
    job = null
    mark(read, sura, bytes)
    void prepareLocal(read, sura)
  } catch (e) {
    job = null
    failed = { read, sura }
    emit()
    throw e
  }
}

/** A whole Mushaf in a reciter's voice, sura by sura; pause stops after the sura on its way, resume goes on. */
export function downloadAll(read: number) {
  const left = Array.from({ length: 114 }, (_, i) => i + 1).filter((s) => !isDownloaded(read, s))
  if (!left.length) return setQueue(null)
  setQueue({ read, left, paused: false })
  void runQueue()
}
export function pauseAll() {
  if (queue) setQueue({ ...queue, paused: true })
}
export function resumeAll() {
  if (!queue) return
  setQueue({ ...queue, paused: false })
  void runQueue()
}
export function cancelAll() {
  setQueue(null)
}
let running = false
async function runQueue() {
  if (running) return
  running = true
  try {
    while (queue && !queue.paused && queue.left.length) {
      const { read, left } = queue
      const sura = left[0]
      try {
        await downloadSura(read, sura)
      } catch {
        // A failure (the connection went): the queue pauses where it was, to be resumed.
        if (queue) setQueue({ ...queue, paused: true })
        break
      }
      if (queue && queue.read === read) setQueue(queue.left.length > 1 ? { ...queue, left: queue.left.slice(1) } : null)
    }
  } finally {
    running = false
  }
}

export async function deleteSura(read: number, sura: number) {
  revoke(read, sura)
  if (isNative()) await Filesystem.deleteFile({ directory: Directory.Library, path: filePath(read, sura) }).catch(() => undefined)
  else {
    const cache = await caches.open(CACHE)
    await cache.delete(remoteUrl(read, sura))
  }
  mark(read, sura, null)
}
export async function deleteReciter(read: number) {
  if (queue?.read === read) setQueue(null)
  for (const s of downloadedSuras(read)) await deleteSura(read, s)
  if (isNative()) await Filesystem.rmdir({ directory: Directory.Library, path: `${DIR}/${read}`, recursive: true }).catch(() => undefined)
}

// ---- Playing what is here -------------------------------------------------------------------------------------------
const local = new Map<string, string>() // read:sura → a URL the audio element can play
function revoke(read: number, sura: number) {
  const k = `${read}:${sura}`
  const u = local.get(k)
  if (u?.startsWith('blob:')) URL.revokeObjectURL(u)
  local.delete(k)
}
/** The local URL of a downloaded sura, ready (prepareLocal made it), else null. */
export const localUrl = (read: number, sura: number) => (isDownloaded(read, sura) ? (local.get(`${read}:${sura}`) ?? null) : null)
/** Makes the local URL of a downloaded sura ready before a press (iOS plays only inside the press itself). A file found
 *  missing is dropped from the list, and the sura streams again. */
export async function prepareLocal(read: number, sura: number): Promise<string | null> {
  if (!isDownloaded(read, sura)) return null
  const k = `${read}:${sura}`
  const have = local.get(k)
  if (have) return have
  try {
    if (isNative()) {
      await Filesystem.stat({ directory: Directory.Library, path: filePath(read, sura) })
      const u = Capacitor.convertFileSrc(await nativeUri(filePath(read, sura)))
      local.set(k, u)
      return u
    }
    const hit = await (await caches.open(CACHE)).match(remoteUrl(read, sura))
    if (!hit) throw new Error('missing')
    const u = URL.createObjectURL(await hit.blob())
    local.set(k, u)
    return u
  } catch {
    mark(read, sura, null)
    return null
  }
}
/** The timing file of a downloaded sura from the browser's cache, when the network cannot give it. */
export async function cachedTiming(read: number, sura: number): Promise<Response | null> {
  if (isNative() || typeof caches === 'undefined') return null
  return (await (await caches.open(CACHE)).match(timingUrl(read, sura))) ?? null
}

/** The kind of connection, to warn before a large download on mobile data. */
export async function connection(): Promise<'wifi' | 'cellular' | 'none' | 'unknown'> {
  if (isNative()) return (await Network.getStatus().catch(() => null))?.connectionType ?? 'unknown'
  const c = (navigator as { connection?: { type?: string } }).connection
  if (!navigator.onLine) return 'none'
  return c?.type === 'cellular' ? 'cellular' : c?.type === 'wifi' ? 'wifi' : 'unknown'
}

/** Bytes for people, in their language: «١٫٢ غيغابايت», "120 MB". */
export function formatBytes(bytes: number, lang: string): string {
  const gb = bytes >= 1e9
  const v = gb ? bytes / 1e9 : bytes / 1e6
  try {
    return new Intl.NumberFormat(lang, { style: 'unit', unit: gb ? 'gigabyte' : 'megabyte', unitDisplay: 'short', maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)
  } catch {
    return `${v.toFixed(v < 10 ? 1 : 0)} ${gb ? 'GB' : 'MB'}`
  }
}
