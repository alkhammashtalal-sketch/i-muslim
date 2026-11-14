// Reading without a connection in the iOS/Android app (reply 0033 §ب3): the answers to /api/* reads that the device
// can give, from the app's own copy, the downloaded meanings and what was kept (web/src/native/offline-data.ts says
// which and why). Storage, network and the app's files come in as dependencies (web/src/native/boot.ts gives the real
// ones), so worker/test/native-device.test.ts runs all of it with fakes.
import type { Meaning } from '../../../shared/api'
import {
  adhkarLang,
  asbabFrom,
  asbabPairFrom,
  ayahFrom,
  keptName,
  keptToDrop,
  KEPT_MAX_AGE_MS,
  offlineRoute,
  suraFrom,
  type BundledSura,
  type HadithRow,
  type OfflineManifest,
  type SuraMeanings,
} from './offline-data'

/** A small file store (in the app: @capacitor/filesystem under Library/NoCloud, kept and never backed up to iCloud). */
export interface Kv {
  get(path: string): Promise<string | null>
  put(path: string, data: string): Promise<void>
  remove(path: string): Promise<void>
  list(dir: string): Promise<string[]>
}

export type OfflineDeps = {
  kv: Kv
  /** The network, for an absolute URL (never routed back through the offline layer). */
  net: (href: string) => Promise<Response>
  /** A file of the app's copy, dist/offline/<rel>, or null. */
  bundle: (rel: string) => Promise<string | null>
  /** A file of web/public the app carries, dist/<rel> (the Hijri offset, the reviewed translations), or null. */
  appFile?: (rel: string) => Promise<string | null>
  apiBase: string
  meaningLangs: readonly string[]
  now?: () => number
  /** How long the network has before what is on the device answers instead (it keeps going and is kept if it comes). */
  timeoutMs?: number
}

const SURAS = 114
const WEEK = 7 * 24 * 3600 * 1000
type Kept = { u: string; t: number; b: string }
type MeaningMeta = { key: string; complete: boolean; checked: number }

/** A content language's download asks first only above this size (reply 0037 §3.6: «ويسأل أولًا فقط إن زاد الحجم على
 *  20 MB»); below it, it starts by itself on any network. MB as the build counts them (10^6 bytes). */
export const ASK_ABOVE_BYTES = 20_000_000

/** Where a content language's download stands, for the app's quiet line (web/src/native/MeaningsStrip.tsx). */
export type MeaningsStatus = {
  lang: string
  /** 'ask': too large to start before the person agrees; 'saving': under way; 'done'; 'partial': cut short, goes on later. */
  state: 'ask' | 'saving' | 'done' | 'partial'
  /** Suras on the device, of `total` (114). */
  saved: number
  total: number
  /** The whole download's size in bytes (the app's manifest); null when the build did not record it. */
  bytes: number | null
}
export type MeaningsResult = 'none' | 'done' | 'partial' | 'ask'

const ok = (body: string) => new Response(body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } })
const sleep = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms))

/** What identifies one edition of a translation (QuranEnc's key and version; the translator for the others). */
export const editionOf = (m: SuraMeanings) => {
  const first = (m.meanings['1'] ?? Object.values(m.meanings)[0]) as Meaning | undefined
  return first ? [first.translator, first.source_key ?? '', first.version ?? ''].join('|') : ''
}

export function createOffline(d: OfflineDeps) {
  const now = d.now ?? Date.now
  const timeoutMs = d.timeoutMs ?? 8000
  const suraMemo = new Map<number, Promise<BundledSura | null>>()
  const meaningMemo = new Map<string, Promise<SuraMeanings | null>>()
  const parse = <T,>(s: string | null): T | null => {
    if (s == null) return null
    try {
      return JSON.parse(s) as T
    } catch {
      return null
    }
  }

  const bundledSura = (n: number) => {
    let p = suraMemo.get(n)
    if (!p) {
      p = d.bundle(`sura/${n}.json`).then((s) => parse<BundledSura>(s), () => null)
      suraMemo.set(n, p)
    }
    return p
  }
  const meaningOf = (lang: string, n: number) => {
    const key = `${lang}/${n}`
    let p = meaningMemo.get(key)
    if (!p) {
      p = d.kv.get(`meanings/${lang}/${n}.json`).then((s) => parse<SuraMeanings>(s), () => null)
      meaningMemo.set(key, p)
    }
    return p
  }

  // What the build put in the app (manifest.json): the languages of the adhkar and of their hadiths, the meanings' sizes.
  let built: Promise<OfflineManifest | null> | null = null
  const manifest = async () => {
    const m = await (built ??= d.bundle('manifest.json').then((s) => parse<OfflineManifest>(s), () => null))
    if (!m) built = null
    return m
  }
  const builtLangs = async (of: 'adhkar' | 'hadith'): Promise<readonly string[]> => {
    const m = await manifest()
    return (of === 'adhkar' ? m?.adhkar?.langs : m?.langs) ?? ['ar']
  }
  // The rows of the «سبب النزول» hadiths in the app (reply 0036 §أ), as /api/hadith/:id returns each.
  const asbabRow = async (id: string, lang: string) => parse<HadithRow>(await d.bundle(`asbab/${id}.${lang}.json`).catch(() => null))
  const meaningBytes = async (lang: string): Promise<number | null> => {
    const b = (await manifest())?.meanings?.[lang]
    return typeof b === 'number' && b > 0 ? b : null
  }

  // What was read once with a connection: one file per URL, and an index of when each was kept.
  let index: Promise<Record<string, number>> | null = null
  const loadIndex = () =>
    (index ??= d.kv.get('kept/index.json').then(
      (s): Record<string, number> => parse<Record<string, number>>(s) ?? {},
      (): Record<string, number> => ({}),
    ))
  let saving: ReturnType<typeof setTimeout> | null = null
  const saveIndex = () => {
    if (saving) return
    saving = setTimeout(async () => {
      saving = null
      const ix = await loadIndex()
      for (const name of keptToDrop(ix, now())) {
        delete ix[name]
        void d.kv.remove(`kept/${name}.json`).catch(() => undefined)
      }
      await d.kv.put('kept/index.json', JSON.stringify(ix)).catch(() => undefined)
    }, 1000)
  }
  async function keep(pq: string, res: Response) {
    try {
      const b = await res.text()
      const name = keptName(pq)
      await d.kv.put(`kept/${name}.json`, JSON.stringify({ u: pq, t: now(), b } satisfies Kept))
      ;(await loadIndex())[name] = now()
      saveIndex()
    } catch {
      // the store is full or refused: this read is simply not kept
    }
  }
  async function kept(pq: string): Promise<string | null> {
    const k = parse<Kept>(await d.kv.get(`kept/${keptName(pq)}.json`).catch(() => null))
    return k && k.u === pq && now() - k.t <= KEPT_MAX_AGE_MS ? k.b : null
  }

  /** The network first; when it fails, answers with an error, or is slow: what was kept, then the app's copy. */
  async function networkFirst(href: string, pq: string, local: () => Promise<string | null>): Promise<Response> {
    type Got = { r: Response } | { e: unknown }
    const netP: Promise<Got> = d.net(href).then(
      (r) => ({ r }),
      (e) => ({ e }),
    )
    const first = await Promise.race([netP, sleep(timeoutMs)])
    if (first && 'r' in first && (first.r.ok || first.r.status === 404)) {
      if (first.r.ok) void keep(pq, first.r.clone())
      return first.r
    }
    const here = (await kept(pq)) ?? (await local().catch(() => null))
    if (here != null) {
      // Too slow: the device answers now, and the network goes on; its answer, if it comes, is kept for the next read.
      if (!first) void netP.then((g) => (('r' in g && g.r.ok) ? keep(pq, g.r) : undefined))
      return ok(here)
    }
    const later = first ?? (await netP)
    if ('r' in later) {
      if (later.r.ok) void keep(pq, later.r.clone())
      return later.r
    }
    throw later.e
  }

  /** The device's answer to a GET of `href`, or null when the app does not keep that read (it goes to the network). */
  async function answer(href: string): Promise<Response | null> {
    if (!d.apiBase || !href.startsWith(`${d.apiBase}/api/`)) return null
    const url = new URL(href)
    const route = offlineRoute(url, d.meaningLangs)
    if (!route) return null
    const pq = url.pathname + url.search
    switch (route.kind) {
      case 'suras':
      case 'quarters': {
        const b = await d.bundle(`${route.kind}.json`).catch(() => null)
        return b != null ? ok(b) : networkFirst(href, pq, async () => null)
      }
      case 'sura': {
        const b = await bundledSura(route.n)
        if (!b) return networkFirst(href, pq, async () => null)
        const m = route.ml ? await meaningOf(route.ml, route.n) : null
        if (!route.ml || m) return ok(JSON.stringify(suraFrom(b, route.en, m)))
        // The meaning is not on the device yet: the network, else the text without it.
        return networkFirst(href, pq, async () => JSON.stringify(suraFrom(b, route.en, null)))
      }
      case 'ayah':
        return networkFirst(href, pq, async () => {
          const b = await bundledSura(route.sura)
          const p = b && ayahFrom(b, route.aya, route.ml ? await meaningOf(route.ml, route.sura) : null)
          return p ? JSON.stringify(p) : null
        })
      case 'adhkar':
        return networkFirst(href, pq, async () => d.bundle(`adhkar/${route.cat}.${adhkarLang(route.lang, await builtLangs('adhkar'))}.json`))
      case 'hadith':
        return networkFirst(href, pq, async () => d.bundle(`hadith/${route.id}.${adhkarLang(route.lang, await builtLangs('hadith'))}.json`))
      case 'asbab':
        return networkFirst(href, pq, async () => {
          const r = await asbabFrom(route.sura, route.aya, route.lang, await manifest(), asbabRow)
          return r ? JSON.stringify(r) : null
        })
      case 'asbabHadith':
        return networkFirst(href, pq, async () => {
          const r = await asbabPairFrom(route.id, route.lang, (await manifest())?.asbab?.[route.id], asbabRow)
          return r ? JSON.stringify(r) : null
        })
      case 'kept':
        return networkFirst(href, pq, async () => null)
      case 'file':
        // The server's file first (it may be newer than the app), then what was kept, then the app's own copy.
        return networkFirst(href, pq, async () => (d.appFile ? d.appFile(route.rel) : null))
    }
  }

  // The quiet line's state per language (MeaningsStrip), and who listens to it.
  const statuses = new Map<string, MeaningsStatus>()
  const listeners = new Set<(s: MeaningsStatus) => void>()
  const emit = (s: MeaningsStatus) => {
    statuses.set(s.lang, s)
    for (const f of listeners) {
      try {
        f(s)
      } catch {
        // a listener's failure is its own
      }
    }
  }
  /** Follow the downloads' state; returns the function that stops following. */
  const onMeanings = (f: (s: MeaningsStatus) => void) => {
    listeners.add(f)
    return () => void listeners.delete(f)
  }
  /** The last state of a language's download in this session, or null. */
  const meaningsStatus = (lang: string) => statuses.get(lang) ?? null

  const running = new Map<string, Promise<MeaningsResult>>()
  /**
   * The content language's meanings on the device (reply 0033 §ب3: downloaded when chosen, then kept): the 114 suras
   * from GET /api/meanings/:lang/:n, once. A week after a complete download, one read checks the edition; a new edition
   * replaces the old files. Stops at the first failure (offline) and goes on at the next call.
   * Reply 0037 §3.6: it starts on any network, and tells its size and progress (onMeanings). Only a download larger
   * than ASK_ABOVE_BYTES that has not begun waits for the person: it answers 'ask', and the call with `approved` starts it.
   */
  function ensureMeanings(lang: string, { concurrency = 3, approved = false }: { concurrency?: number; approved?: boolean } = {}): Promise<MeaningsResult> {
    if (!d.meaningLangs.includes(lang)) return Promise.resolve('none')
    let p = running.get(lang)
    if (!p) {
      p = download(lang, concurrency, approved).finally(() => running.delete(lang))
      running.set(lang, p)
    }
    return p
  }
  const get = async (lang: string, n: number): Promise<SuraMeanings | null> => {
    const r = await d.net(`${d.apiBase}/api/meanings/${lang}/${n}`)
    if (!r.ok) throw new Error(`meanings ${lang} ${n}: ${r.status}`)
    return (await r.json()) as SuraMeanings
  }
  async function download(lang: string, concurrency: number, approved: boolean): Promise<'done' | 'partial' | 'ask'> {
    const dir = `meanings/${lang}`
    const meta = parse<MeaningMeta>(await d.kv.get(`${dir}/meta.json`).catch(() => null))
    if (meta?.complete && now() - meta.checked < WEEK) return 'done'
    let have = new Set(await d.kv.list(dir).catch(() => [] as string[]))
    const bytes = await meaningBytes(lang)
    const tell = (state: MeaningsStatus['state'], saved: number) => emit({ lang, state, saved, total: SURAS, bytes })
    // Asks first only when it is large and nothing of it is on the device yet: an agreed download cut short goes on.
    const begun = !!meta || [...have].some((f) => /^\d+\.json$/.test(f))
    if (!approved && !begun && bytes !== null && bytes > ASK_ABOVE_BYTES) {
      tell('ask', 0)
      return 'ask'
    }
    let first: SuraMeanings | null
    try {
      first = await get(lang, 1)
    } catch {
      return meta?.complete ? 'done' : 'partial'
    }
    if (!first) return 'partial'
    const key = editionOf(first)
    if (meta && meta.key !== key) {
      for (const f of have) await d.kv.remove(`${dir}/${f}`).catch(() => undefined)
      have = new Set()
      for (const k of [...meaningMemo.keys()]) if (k.startsWith(`${lang}/`)) meaningMemo.delete(k)
    }
    const todo = Array.from({ length: SURAS - 1 }, (_, i) => i + 2).filter((n) => !have.has(`${n}.json`))
    // Told only when something is saved: the weekly check of a complete download that finds the same edition is silent.
    const shown = todo.length > 0 || !have.has('1.json')
    await d.kv.put(`${dir}/1.json`, JSON.stringify(first))
    meaningMemo.delete(`${lang}/1`)
    let saved = SURAS - todo.length
    if (shown) tell('saving', saved)
    let failed = false
    const worker = async () => {
      while (!failed && todo.length) {
        const n = todo.shift()!
        try {
          const m = await get(lang, n)
          if (!m) throw new Error('empty')
          await d.kv.put(`${dir}/${n}.json`, JSON.stringify(m))
          meaningMemo.delete(`${lang}/${n}`)
          saved++
          if (shown) tell('saving', saved)
        } catch {
          failed = true
        }
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))
    await d.kv.put(`${dir}/meta.json`, JSON.stringify({ key, complete: !failed, checked: now() } satisfies MeaningMeta)).catch(() => undefined)
    if (shown) tell(failed ? 'partial' : 'done', saved)
    return failed ? 'partial' : 'done'
  }

  return { answer, ensureMeanings, onMeanings, meaningsStatus, meaningOf }
}
export type Offline = ReturnType<typeof createOffline>
