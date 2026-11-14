// «المصادر والشكر» (reply 0033 §أ3): «نتابع إصداراتهم» and the page's live facts.
//   checkSources(env)          the monthly job (cron "0 3 1 * *" in env.next, dispatched in index.ts): for the
//                              sources whose API gives a version (QuranEnc's /translations/list), our version (D1) and
//                              theirs, one row per item in source_checks (migration 0014). A newer version is not
//                              applied: it stays «تحديث منتظر» until Talal decides to fetch it.
//   GET /api/sources/status?lang=xx
//                              { checked_at, pending, meaning, mukhtasar }: the last check, the updates waiting, and
//                              the version of the reader's language translation (QuranEnc meaning, al-Mukhtasar).
// Every read is by key: ayah_translations (lang, 1, 1), tafsir_translations ('quranenc', lang, 1, 1..2), the latest
// check date (the primary key's first column) and that date's rows. HadeethEnc's API gives no version (its languages,
// categories and hadiths only), so it is not checked here; its versions are in data/sources.json.
import type { SourceCheck, SourcesStatus } from '../../shared/api'
import registry from '../../data/sources.json'
import type { Env } from './index'
import { riyadhDay } from './lib/keys'
import { quranEncOn } from './mukhtasar'

export const SOURCES_CRON = '0 3 1 * *'
export const QURANENC_LIST = 'https://quranenc.com/api/v1/translations/list/'
const UA = 'Muslim-app/1.0 (+https://github.com/alkhammashtalal-sketch/i-muslim)'
/** Al-Mukhtasar in Arabic and Italian is stored, never shown (mukhtasar.ts). */
const MUKHTASAR_NOT_SHOWN = new Set(['ar', 'it'])
const LANG_RE = /^[a-z]{2,3}$/
const VERSION_RE = /^v?\d{1,4}(\.\d{1,4}){0,3}$/

type Registry = { sources: { id: string; langs?: string[]; check?: string }[] }
const SOURCES = (registry as Registry).sources
export const SOURCE_IDS = new Set(SOURCES.map((s) => s.id))
const QURANENC_LANGS = SOURCES.find((s) => s.id === 'quranenc')?.langs ?? []

/** A version as their API writes it, or null when it is not one (nothing else is stored). */
export const cleanVersion = (v: unknown): string | null => (typeof v === 'string' || typeof v === 'number') && VERSION_RE.test(String(v).trim()) ? String(v).trim() : null

/** True when `theirs` is a later version than `ours` (dotted numbers, an optional leading «v»). */
export function newer(theirs: string | null, ours: string | null): boolean {
  if (!theirs) return false
  if (!ours) return true
  const parts = (v: string) => v.replace(/^v/, '').split('.').map((x) => Number(x) || 0)
  const a = parts(theirs)
  const b = parts(ours)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d) return d > 0
  }
  return false
}

export type CheckResult = { day: string; checked: number; pending: SourceCheck[] }

/** The monthly check. Throws when their list cannot be read, and then writes nothing (the last check stays). */
export async function checkSources(env: Env, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<CheckResult> {
  const day = riyadhDay(now)
  const ph = QURANENC_LANGS.map(() => '?').join(', ')
  const { results: ours } = await env.DB.prepare(`SELECT lang, version, source_key FROM ayah_translations WHERE lang IN (${ph}) AND sura = 1 AND aya = 1`)
    .bind(...QURANENC_LANGS)
    .all<{ lang: string; version: string | null; source_key: string | null }>()
  const res = await fetchFn(QURANENC_LIST, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!res.ok) throw new Error(`quranenc list: HTTP ${res.status}`)
  const body = (await res.json()) as { translations?: unknown } | unknown[]
  const list = Array.isArray(body) ? body : (body as { translations?: unknown }).translations
  if (!Array.isArray(list)) throw new Error('quranenc list: no translations')
  const theirs = new Map<string, string | null>()
  for (const t of list as { key?: unknown; version?: unknown }[]) if (typeof t?.key === 'string') theirs.set(t.key, cleanVersion(t.version))
  const items: SourceCheck[] = ours
    .filter((r) => r.source_key)
    .map((r) => ({ source: 'quranenc', key: r.source_key!, lang: r.lang, ours: r.version, theirs: theirs.get(r.source_key!) ?? null }))
  if (items.length)
    await env.DB.batch(
      items.map((i) =>
        env.DB.prepare('INSERT OR REPLACE INTO source_checks (checked_at, source, key, lang, ours, theirs) VALUES (?, ?, ?, ?, ?, ?)').bind(day, i.source, i.key, i.lang, i.ours, i.theirs),
      ),
    )
  return { day, checked: items.length, pending: items.filter((i) => newer(i.theirs, i.ours)) }
}

/** The page's facts for a language. A table not yet migrated reads as «no check yet». */
export async function sourcesStatus(env: Env, lang: string): Promise<SourcesStatus> {
  const last = await env.DB.prepare('SELECT checked_at FROM source_checks ORDER BY checked_at DESC LIMIT 1')
    .first<{ checked_at: string }>()
    .catch(() => null)
  let pending: SourceCheck[] = []
  if (last) {
    const { results } = await env.DB.prepare('SELECT source, key, lang, ours, theirs FROM source_checks WHERE checked_at = ?').bind(last.checked_at).all<SourceCheck>()
    pending = results.filter((r) => newer(r.theirs, r.ours))
  }
  let meaning: SourcesStatus['meaning'] = null
  let mukhtasar: SourcesStatus['mukhtasar'] = null
  if (lang && lang !== 'ar') {
    const m = await env.DB.prepare('SELECT version, translator, source_key FROM ayah_translations WHERE lang = ? AND sura = 1 AND aya = 1')
      .bind(lang)
      .first<{ version: string | null; translator: string; source_key: string | null }>()
      .catch(() => null)
    // Rows from the Ayat archive (Bengali, Malay) have no key: they are not QuranEnc's.
    if (m?.source_key) meaning = { key: m.source_key, version: m.version ?? null, translator: m.translator }
    if (quranEncOn(env) && !MUKHTASAR_NOT_SHOWN.has(lang)) {
      const t = await env.DB.prepare("SELECT version, source_key FROM tafsir_translations WHERE source = 'quranenc' AND lang = ? AND sura = 1 AND aya IN (1, 2) LIMIT 1")
        .bind(lang)
        .first<{ version: string | null; source_key: string | null }>()
        .catch(() => null)
      if (t?.source_key) mukhtasar = { key: t.source_key, version: t.version ?? null }
    }
  }
  return { checked_at: last?.checked_at ?? null, pending, meaning, mukhtasar }
}

const STATUS_TTL = 6 * 3600

/** The route, or null when the path is not it. Cached at the edge for six hours per language. */
export async function handleSources(
  request: Request,
  env: Env,
  url: URL,
  cache: Cache | undefined = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default,
): Promise<Response | null> {
  if (url.pathname !== '/api/sources/status' || request.method !== 'GET') return null
  const lang = url.searchParams.get('lang') ?? ''
  if (lang && !LANG_RE.test(lang)) return reply({ ok: false, error: 'bad_input' }, 400)
  const key = new Request(`https://cache.i-muslim/sources-status?lang=${lang}`)
  const hit = await cache?.match(key)
  if (hit) return reply(await hit.json(), 200)
  const body = await sourcesStatus(env, lang)
  await cache?.put(key, new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${STATUS_TTL}` } }))
  return reply(body, 200)
}

const reply = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store' },
  })
