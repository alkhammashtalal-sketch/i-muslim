// iOS 1.0.0 (16), the app in the App Store, talks to i-muslim-next (add-on 0072-add61 §1): every request its code makes
// (commit 4a2b510, web/src, through api() of web/src/api/base.ts with VITE_API_BASE = next's URL) is sent here to the
// whole Worker, in-process, with the app's own origin (capacitor://localhost) and its exact parameters. Each answer must
// keep what 1.0.0's server gave it: the same status, CORS for the app, and every JSON path with the same JSON type(s).
// New fields are allowed (1.0.0 ignores them); a path removed, renamed or retyped is a break.
//
// The reference (fixtures/compat-1.0.0/shapes.json) holds shapes only (paths and types, no source text: CLAUDE.md §7),
// written by this same file run against the Worker of 4a2b510 with 4a2b510's env.next vars:
//   git worktree add --detach <tmp> 4a2b510 && cp worker/test/compat-ios-1.0.0.test.ts <tmp>/worker/test/ &&
//   ln -s $PWD/worker/node_modules <tmp>/worker/node_modules &&
//   (cd <tmp>/worker && COMPAT_WRITE=$PWD/../../<this tree>/worker/test/fixtures/compat-1.0.0/shapes.json npx vitest run test/compat-ios-1.0.0.test.ts)
// Here it runs with this tree's env.next vars (worker/wrangler.jsonc), the model mocked (LLM_MODE=mock), the vectors
// mocked, no network (fetch throws), the clock fixed, and data/samples only, so it gives the same in a clean checkout
// (scripts/deploy.sh runs npm test there).
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import dayConfig from '../src/config/hadith-day.json'
import { dayIndex } from '../src/hadith'
import { ftsIndexText } from '../src/lib/normalize'
import worker, { type Env } from '../src/index'

const ROOT = path.resolve(import.meta.dirname, '../..')
const GOLDEN = path.join(import.meta.dirname, 'fixtures/compat-1.0.0/shapes.json')
const WRITE = process.env.COMPAT_WRITE
const BASE = 'https://i-muslim-next.alkhammashtalal.workers.dev'
// What Capacitor's WKWebView sends from the iOS app (worker/src/cors.ts allows it).
const APP = { origin: 'capacitor://localhost', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' }
const FIXED_NOW = Date.parse('2026-11-01T09:00:00Z')

/** JSONC → JSON: comments removed outside strings (as site.test.ts reads it). */
function parseJsonc(text: string): Record<string, unknown> {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      let j = text.indexOf('"', i + 1)
      while (text[j - 1] === '\\') j = text.indexOf('"', j + 1)
      out += text.slice(i, j + 1)
      i = j
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i) + 1
    } else out += c
  }
  return JSON.parse(out)
}
const NEXT_VARS = (parseJsonc(fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')) as { env: { next: { vars: Record<string, string> } } }).env.next.vars

// ---------------------------------------------------------------------------------------------------------------------
// D1 over node:sqlite, built from this tree's migrations and data/samples (in git), like worker/test/d1-sqlite.ts but
// self-contained, so the same file runs in the 4a2b510 tree to write the reference.
type Val = string | number | null
class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private args: Val[] = []) {}
  bind(...args: Val[]) {
    return new Stmt(this.db, this.sql, args)
  }
  async all<T>() {
    const results = this.db.prepare(this.sql).all(...this.args) as T[]
    return { results, success: true, meta: { rows_read: results.length } }
  }
  async first<T>(col?: string) {
    const row = this.db.prepare(this.sql).get(...this.args) as Record<string, unknown> | undefined
    if (!row) return null
    return (col ? row[col] : row) as T
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args)
    return { success: true, meta: { changes: Number(r.changes) } }
  }
}
class D1 {
  constructor(public db: DatabaseSync) {}
  prepare(sql: string) {
    return new Stmt(this.db, sql)
  }
  async batch(stmts: Stmt[]) {
    return Promise.all(stmts.map((s) => s.all()))
  }
}

const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']
const samples = (f: string) =>
  fs.readFileSync(path.join(ROOT, 'data/samples', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>)

function buildDb(): D1 {
  const db = new DatabaseSync(':memory:')
  const dir = path.join(ROOT, 'worker/migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files.filter((f) => f < '0004')) db.exec(fs.readFileSync(path.join(dir, f), 'utf8'))
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const r of [...samples('quran.sample.jsonl'), ...samples('aqeedah.sample.jsonl')]) {
    ins.run(...COLUMNS.map((c) => (r[c] ?? null) as Val), JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))))
  }
  for (const f of files.filter((f) => f >= '0004')) db.exec(fs.readFileSync(path.join(dir, f), 'utf8'))
  // HadeethEnc's sample rows (data/samples/hadith.sample.jsonl), as scripts/index loads them; the tier-1 sahih Arabic
  // ones take the day sequence from the fixed day on, so the day card and the widgets' days have a hadith.
  const hcols = db.prepare('PRAGMA table_info(hadiths)').all().map((c) => (c as { name: string }).name)
  const hins = db.prepare(
    `INSERT INTO hadiths (id, lang, title, text, intro, attribution, grade, explanation, hints, words_meanings, reference, categories, class, tier, version, seq${hcols.includes('mawquf') ? ', mawquf' : ''}) VALUES (${new Array(16 + (hcols.includes('mawquf') ? 1 : 0)).fill('?').join(', ')})`,
  )
  const cat = db.prepare('INSERT OR REPLACE INTO hadith_categories (category, id, tier) VALUES (?, ?, ?)')
  const N = (dayConfig as { tier1_ar: number }).tier1_ar
  let k = 0
  for (const h of samples('hadith.sample.jsonl')) {
    const day = h.lang === 'ar' && h.tier === '1' && h.class === 'sahih' ? (dayIndex(FIXED_NOW) + k++) % N : null
    const vals: Val[] = [h.id, h.lang, h.title, h.hadeeth, h.hadeeth_intro, h.attribution, h.grade, h.explanation, JSON.stringify(h.hints ?? []), JSON.stringify(h.words_meanings ?? []), h.reference, JSON.stringify(h.categories ?? []), h.class, h.tier, h.version, day].map((v) => (v ?? null) as Val)
    hins.run(...vals, ...(hcols.includes('mawquf') ? [h.mawquf ? 1 : 0] : []))
    if (h.lang === 'ar') for (const c of (h.categories as string[]) ?? []) cat.run(c, h.id as string, h.tier as string)
  }
  // The grade search (hadith_grade_fts) over every Arabic row, as /api/admin/hadith-grade-index fills it
  // (worker/src/hadith-index.ts), so «هل حديث كذا صحيح؟» finds a sample hadith and answers with its grade.
  const gfts = db.prepare('INSERT INTO hadith_grade_fts (rowid, id, text_search) VALUES (?, ?, ?)')
  for (const r of db.prepare("SELECT rowid, id, text FROM hadiths WHERE lang = 'ar'").all() as { rowid: number; id: string; text: string }[]) gfts.run(r.rowid, r.id, ftsIndexText(r.text))
  // An Urdu meaning for al-Fatiha and 2:255 (placeholder text, not the translation), for the meanings download and ?ml=.
  const tins = db.prepare('INSERT INTO ayah_translations (lang, sura, aya, text, translator, version, footnotes, source_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  for (const [s, a] of [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 255]]) tins.run('ur', s, a, `ur ${s}:${a}`, 'translator', '1.0.0', null, 'urdu_test')
  return new D1(db)
}

// ---------------------------------------------------------------------------------------------------------------------
// The requests of iOS 1.0.0, with where its code makes each one (4a2b510) and the fields it reads of the answer.
type Req = { name: string; method: 'GET' | 'POST'; path: string; body?: unknown; wav?: boolean; at: string; reads: string[] }

/** A 16 kHz mono 16-bit PCM WAV of one second, as useRecorder sends it. */
function wav(): Uint8Array {
  const n = 16000
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE')
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(3000 * Math.sin((2 * Math.PI * 440 * i) / 16000)), true)
  return new Uint8Array(buf)
}

const REQUESTS: Req[] = [
  // «اسأل» (web/src/App.tsx:184 → web/src/api/client.ts:27): { q, lang, simple, ml? }, never canWait.
  { name: 'ask: answer (ar)', method: 'POST', path: '/api/ask', body: { q: 'ما فضل الصيام', lang: 'ar', simple: false }, at: 'web/src/App.tsx:184, web/src/api/client.ts:27', reads: ['type'] },
  { name: 'ask: answer (en, simple, ml ur)', method: 'POST', path: '/api/ask', body: { q: 'What is fasting?', lang: 'en', simple: true, ml: 'ur' }, at: 'web/src/App.tsx:184', reads: ['type'] },
  { name: 'ask: gate referral (C)', method: 'POST', path: '/api/ask', body: { q: 'هل هذا حلال ام حرام', lang: 'ar', simple: false }, at: 'web/src/App.tsx:184', reads: ['type', 'level', 'message', 'link'] },
  { name: 'ask: personal case (D)', method: 'POST', path: '/api/ask', body: { q: 'طلقت زوجتي ثلاثا فما الحكم', lang: 'ar', simple: false }, at: 'web/src/App.tsx:184', reads: ['type', 'level', 'message', 'link'] },
  // «هل حديث كذا صحيح؟» (HADITH_GRADE on next): a sample hadith (4560), so the answer is a GradeResponse (shared/api.ts:54-60
  // at 4a2b510); in English with HadeethEnc's English row, its grade_tr too.
  { name: 'ask: grade question', method: 'POST', path: '/api/ask', body: { q: 'هل حديث «إنما الأعمال بالنيات» صحيح؟', lang: 'ar', simple: false }, at: 'web/src/App.tsx:184', reads: ['type', 'message', 'hadith', 'hadith.id', 'hadith.text', 'hadith.title', 'hadith.grade', 'hadith.class', 'hadith.attribution', 'hadith.url'] },
  { name: 'ask: grade question (en)', method: 'POST', path: '/api/ask', body: { q: 'هل حديث «إنما الأعمال بالنيات» صحيح؟', lang: 'en', simple: false }, at: 'web/src/App.tsx:184', reads: ['type', 'message', 'hadith', 'hadith.id', 'hadith.text', 'hadith.title', 'hadith.grade', 'hadith.class', 'hadith.attribution', 'hadith.url', 'grade_tr', 'grade_tr.lang', 'grade_tr.grade'] },
  { name: 'ask: empty question (error)', method: 'POST', path: '/api/ask', body: { q: '', lang: 'ar', simple: false }, at: 'web/src/api/client.ts:38', reads: ['type', 'code', 'message'] },
  // The full text sheet and the reader (web/src/api/client.ts:49, web/src/quran/api.ts:47, web/src/v2/daily/api.ts:40).
  { name: 'passage: ayah', method: 'GET', path: '/api/passage/quran:2:255', at: 'web/src/api/client.ts:49, web/src/v2/daily/api.ts:40', reads: ['id', 'kind', 'text', 'ref', 'url', 'tafsir'] },
  { name: 'passage: ayah ?ml=ur', method: 'GET', path: '/api/passage/quran:2:255?ml=ur', at: 'web/src/quran/api.ts:47', reads: ['id', 'text', 'meaning', 'meaning.text', 'meaning.translator'] },
  { name: 'passage: creed segment', method: 'GET', path: `/api/passage/${encodeURIComponent(String(samples('aqeedah.sample.jsonl')[0].id))}`, at: 'web/src/library/api.ts:25', reads: ['id', 'text', 'ref', 'url'] },
  // The library (web/src/library/api.ts:23-24).
  { name: 'books', method: 'GET', path: '/api/books', at: 'web/src/library/api.ts:23', reads: [] },
  { name: 'book', method: 'GET', path: `/api/book/${String(samples('aqeedah.sample.jsonl')[0].id).split(':')[1]}`, at: 'web/src/library/api.ts:24', reads: [] },
  // The reader (web/src/quran/api.ts:15, :33; web/src/v2/daily/api.ts:41; web/src/v2/reading/JuzIndex.tsx:17).
  { name: 'suras', method: 'GET', path: '/api/suras', at: 'web/src/quran/api.ts:15, web/src/v2/daily/api.ts:41', reads: [] },
  { name: 'sura 1', method: 'GET', path: '/api/sura/1', at: 'web/src/quran/api.ts:33', reads: [] },
  { name: 'sura 1 ?en=1&ml=ur', method: 'GET', path: '/api/sura/1?en=1&ml=ur', at: 'web/src/quran/api.ts:33', reads: [] },
  { name: 'quarters', method: 'GET', path: '/api/quarters', at: 'web/src/v2/reading/JuzIndex.tsx:17', reads: [] },
  { name: 'meanings ur 1 (offline download)', method: 'GET', path: '/api/meanings/ur/1', at: 'web/src/native/offline.ts:276', reads: [] },
  // The machine explanation (web/src/quran/api.ts:58, :74): off on next (READER_EXPLAIN false): the status answers
  // 200 { enabled: false } and the explanation itself 404.
  { name: 'explain status', method: 'GET', path: '/api/explain', at: 'web/src/quran/api.ts:58', reads: [] },
  { name: 'explain', method: 'POST', path: '/api/explain', body: { id: 'quran:1:1', lang: 'fr' }, at: 'web/src/quran/api.ts:74', reads: [] },
  // Al-Mukhtasar (web/src/quran/mukhtasar.ts:16): not public on next (MUKHTASAR_PUBLIC false): 200 { found: false },
  // which 1.0.0 reads as none (no `text`).
  { name: 'mukhtasar', method: 'GET', path: '/api/mukhtasar/1/1?lang=en', at: 'web/src/quran/mukhtasar.ts:16', reads: [] },
  // The app's static files through /api/ (web/src/quran/reviewed.ts:17, web/src/v2/daily/store.ts:43).
  { name: 'config hijri', method: 'GET', path: '/api/config/hijri', at: 'web/src/v2/daily/store.ts:43', reads: [] },
  { name: 'reviewed (published)', method: 'GET', path: '/api/reviewed/en/112/1', at: 'web/src/quran/reviewed.ts:17', reads: [] },
  // HadeethEnc (web/src/v2/hadith/api.ts:52-64, web/src/v2/daily/hadith-client.ts:35).
  { name: 'hadith ar', method: 'GET', path: '/api/hadith/4560?lang=ar', at: 'web/src/v2/hadith/api.ts:52, web/src/v2/daily/hadith-client.ts:35', reads: ['ar', 'ar.id', 'ar.text', 'ar.grade', 'ar.attribution', 'ar.url'] },
  { name: 'hadith en', method: 'GET', path: '/api/hadith/4560?lang=en', at: 'web/src/v2/hadith/api.ts:52', reads: ['ar', 'tr', 'tr.text'] },
  { name: 'hadith same-topic', method: 'GET', path: '/api/hadith/4560/same-topic', at: 'web/src/v2/hadith/api.ts:54', reads: ['items'] },
  { name: 'hadith quiz', method: 'GET', path: '/api/hadith/4560/quiz?lang=ar', at: 'web/src/v2/hadith/api.ts:60', reads: ['questions'] },
  { name: 'today', method: 'GET', path: '/api/today?lang=ar', at: 'web/src/v2/hadith/api.ts:61', reads: ['day', 'hadith'] },
  { name: 'today en', method: 'GET', path: '/api/today?lang=en', at: 'web/src/v2/hadith/api.ts:61', reads: ['day', 'hadith'] },
  { name: 'today/days n=60 (widgets)', method: 'GET', path: '/api/today/days?n=60', at: 'web/src/native/widget-data.ts:121', reads: ['days', 'days[].day', 'days[].hadith', 'days[].hadith.id', 'days[].hadith.text', 'days[].hadith.grade', 'days[].hadith.attribution'] },
  { name: 'asbab', method: 'GET', path: '/api/asbab/2/255?lang=ar', at: 'web/src/v2/hadith/api.ts:64', reads: ['items'] },
  // The adhkar (web/src/v2/daily/api.ts:38-39; the widgets: web/src/native/widget-data.ts:224 with 301).
  { name: 'adhkar 301', method: 'GET', path: '/api/adhkar/301?lang=ar', at: 'web/src/v2/daily/api.ts:38, web/src/native/widget-data.ts:224', reads: ['category', 'items'] },
  { name: 'adhkar hadith', method: 'GET', path: '/api/adhkar/hadith/4560?lang=ar', at: 'web/src/v2/daily/api.ts:39', reads: [] },
  // The starting path (web/src/starter/stories.ts:16).
  { name: 'starter stories', method: 'GET', path: '/api/starter/islam/stories?lang=ar', at: 'web/src/starter/stories.ts:16', reads: ['step', 'stories', 'chapters'] },
  // The sources page and «أبلغ عن خطأ» (web/src/v2/sources/api.ts:12, :26; web/src/api/client.ts:62).
  { name: 'sources status', method: 'GET', path: '/api/sources/status?lang=ar', at: 'web/src/v2/sources/api.ts:12', reads: [] },
  { name: 'report (source)', method: 'POST', path: '/api/report', body: { kind: 'text', loc: { type: 'ayah', id: '1:1', lang: 'ar', source: 'ksu' }, note: 'ملاحظة تجريبية' }, at: 'web/src/v2/sources/api.ts:26 (place: web/src/v2/sources/place.ts:20)', reads: [] },
  { name: 'report (support)', method: 'POST', path: '/api/report', body: { kind: 'support', note: 'رسالة تجريبية' }, at: 'web/src/v2/sources/api.ts:26', reads: [] },
  { name: 'report (passage)', method: 'POST', path: '/api/report', body: { passageId: 'quran:1:1', reason: 'text_mismatch' }, at: 'web/src/api/client.ts:62', reads: [] },
  // «اطلب لغتك» (web/src/v2/lang/store.ts:60) and «اسأل بصوتك» (web/src/voice/useRecorder.ts:27).
  { name: 'lang-request', method: 'POST', path: '/api/lang-request', body: { text: 'klingon' }, at: 'web/src/v2/lang/store.ts:60', reads: [] },
  { name: 'transcribe', method: 'POST', path: '/api/transcribe', wav: true, at: 'web/src/voice/useRecorder.ts:31-36', reads: ['text'] },
]
// Not asked by the iOS app, so not here: /api/mosques (Apple Maps on the device, web/src/native/mosques.ts) and
// /api/push/* (pushSupported() is false when isNative(), web/src/v2/daily/push.ts:28).

// ---------------------------------------------------------------------------------------------------------------------
type Shape = Record<string, string[]>
/** Every JSON path of a value with the set of JSON types seen there; array items under `[]`. */
function shapeOf(v: unknown, at = '', out: Shape = {}): Shape {
  const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
  const key = at || '$'
  out[key] = [...new Set([...(out[key] ?? []), t])].sort()
  if (Array.isArray(v)) for (const x of v) shapeOf(x, `${at}[]`, out)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) shapeOf(x, at ? `${at}.${k}` : k, out)
  return out
}
/** `type`: the answer's own `type` for /api/ask (AskResponse), which 1.0.0 switches on. */
type Record1 = { status: number; cors: string | null; json: boolean; type?: string; shape: Shape }

let env: Env
const asked: string[] = []
const results = new Map<string, Record1>()

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
  // No network: a request that leaves the Worker fails the test.
  vi.stubGlobal('fetch', async (u: unknown) => {
    throw new Error(`network request in a compatibility test: ${String(u)}`)
  })
  env = {
    ...NEXT_VARS,
    LLM_MODE: 'mock',
    ADMIN_ENABLED: 'false',
    DB: buildDb(),
    IP_SALT: 'test-salt',
    AI: {
      run: async (model: string, input: { text?: string[] }) =>
        /bge-m3/.test(model) ? { data: (input.text ?? []).map(() => new Array(1024).fill(0.01)) } : { text: 'ما أركان الإسلام', transcription_info: { language: 'ar' } },
    },
    VECTORIZE: { query: async () => ({ matches: [{ id: 'quran:2:183', score: 0.9 }, { id: 'quran:2:43', score: 0.85 }] }) },
    VECTORIZE_HADITH: { query: async () => ({ matches: [{ id: '4560', score: 0.82 }] }) },
    // The queue must never be reached by a client that does not send canWait (iOS 1.0.0).
    ASK_JOBS: {
      idFromName: (n: string) => (asked.push(`idFromName:${n}`), n),
      get: () => ({ fetch: async () => (asked.push('enqueue'), new Response(JSON.stringify({ id: 'x' }))) }),
    },
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
        const f = path.join(ROOT, 'web/public', decodeURIComponent(u.pathname))
        if (f.startsWith(path.join(ROOT, 'web/public') + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile())
          return new Response(fs.readFileSync(f), { headers: { 'content-type': f.endsWith('.json') ? 'application/json' : 'application/octet-stream' } })
        return new Response('<!doctype html><title>مسلم</title>', { headers: { 'content-type': 'text/html; charset=utf-8' } })
      },
    },
  } as unknown as Env

  for (const r of REQUESTS) {
    const headers: Record<string, string> = { ...APP, 'cf-connecting-ip': '198.51.100.7' }
    let body: BodyInit | undefined
    if (r.wav) {
      headers['content-type'] = 'audio/wav'
      body = wav()
    } else if (r.body !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(r.body)
    }
    const res = await worker.fetch(new Request(`${BASE}${r.path}`, { method: r.method, headers, body }), env)
    const text = await res.text()
    let parsed: unknown = undefined
    try {
      parsed = JSON.parse(text)
    } catch {}
    const type = r.path === '/api/ask' && parsed && typeof (parsed as { type?: unknown }).type === 'string' ? (parsed as { type: string }).type : undefined
    results.set(r.name, { status: res.status, cors: res.headers.get('access-control-allow-origin'), json: parsed !== undefined, ...(type ? { type } : {}), shape: parsed === undefined ? {} : shapeOf(parsed) })
  }
  if (WRITE) {
    fs.mkdirSync(path.dirname(WRITE), { recursive: true })
    fs.writeFileSync(WRITE, `${JSON.stringify({ _note: 'Shapes of the answers iOS 1.0.0 got from its server (Worker of commit 4a2b510, its env.next vars, data/samples). Written by worker/test/compat-ios-1.0.0.test.ts with COMPAT_WRITE; paths and JSON types only.', requests: Object.fromEntries(results) }, null, 1)}\n`)
  }
})
afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe.runIf(!!WRITE)('writing the reference (COMPAT_WRITE, in the 4a2b510 tree)', () => {
  it('every request answered', () => {
    expect(results.size).toBe(REQUESTS.length)
    expect(fs.existsSync(WRITE!)).toBe(true)
  })
})

/** AskResponse's types in 1.0.0 (shared/api.ts at 4a2b510: AnswerResponse | ReferralResponse | AbstainResponse |
 *  GradeResponse | ErrorResponse); «pending» came after it. */
const ASK_TYPES_1_0 = ['answer', 'referral', 'abstain', 'grade', 'error']
const golden = (): Record<string, Record1> => (JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) as { requests: Record<string, Record1> }).requests

describe.skipIf(!!WRITE)('iOS 1.0.0 against this Worker: every request it makes, answered as its server answered it', () => {
  it('the reference covers exactly these requests', () => {
    expect(Object.keys(golden()).sort()).toEqual(REQUESTS.map((r) => r.name).sort())
  })

  it.each(REQUESTS.map((r) => [r.name, r] as const))('%s', (name, r) => {
    let was = golden()[name]
    const now = results.get(name)!
    let reads = r.reads
    // «اسأل» may answer a question with another of the types 1.0.0 knows (shared/api.ts AskResponse at 4a2b510), e.g. a
    // general ruling answered from its texts (fix «level», live on next since 23 October) where 1.0.0's server referred
    // it: then the answer is held to the reference of that type, from the reference's other questions.
    if (r.path === '/api/ask' && now.type !== was.type) {
      expect(ASK_TYPES_1_0, `${name}: a type 1.0.0 knows`).toContain(now.type)
      const same = Object.values(golden()).find((g) => g.type === now.type)
      expect(same, `${name}: the reference has a ${now.type} answer to compare with`).toBeDefined()
      was = { ...same!, status: now.status === 200 ? same!.status : was.status }
      reads = ['type']
    }
    expect(now.status, `${r.method} ${r.path} (${r.at}): status`).toBe(was.status)
    // CORS for the app's origin on every /api/* answer (worker/src/cors.ts), as before.
    expect(now.cors, 'access-control-allow-origin').toBe(was.cors)
    expect(now.cors).toBe(APP.origin)
    expect(now.json, 'JSON body').toBe(was.json)
    // Every path 1.0.0's server gave, with the same JSON type(s); extra paths are allowed.
    const missing: string[] = []
    for (const [p, types] of Object.entries(was.shape)) {
      if (!now.shape[p]) missing.push(`${p}: gone (was ${types.join('|')})`)
      else if (now.shape[p].join('|') !== types.join('|')) missing.push(`${p}: ${now.shape[p].join('|')} (was ${types.join('|')})`)
    }
    expect(missing, `${r.method} ${r.path}`).toEqual([])
    // The fields its code reads were in its server's answer, and are still there.
    for (const f of reads) {
      expect(was.shape[f], `reference has ${f}`).toBeDefined()
      expect(now.shape[f], `${f} still answered`).toBeDefined()
    }
  })

  it('no question is ever «pending» for 1.0.0 (it sends no canWait), and the queue is never reached', () => {
    for (const r of REQUESTS.filter((x) => x.path === '/api/ask')) {
      const types = results.get(r.name)!.shape
      expect(types.type, r.name).toEqual(['string'])
      expect(ASK_TYPES_1_0, r.name).toContain(results.get(r.name)!.type)
      expect(types.id, `${r.name}: no job id`).toBeUndefined()
      expect(types.stage, `${r.name}: no stage`).toBeUndefined()
    }
    expect(asked).toEqual([])
  })
})

describe.skipIf(!!WRITE)('the queue answers 1.0.0 in the reply even when it is on (worker/src/ask.ts handleAsk)', () => {
  it('env.next has the queue on, so this file tests the real path', () => {
    expect(NEXT_VARS.ASK_QUEUE).toBe('on')
  })
  it('an answer-type question without canWait: an answer, an abstention or a referral, never pending', async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/api/ask`, { method: 'POST', headers: { ...APP, 'cf-connecting-ip': '198.51.100.8', 'content-type': 'application/json' }, body: JSON.stringify({ q: 'كيف أتوضأ', lang: 'ar', simple: false }) }),
      env,
    )
    const body = (await res.json()) as { type: string }
    expect(['answer', 'abstain', 'referral', 'grade']).toContain(body.type)
    expect(asked).toEqual([])
  })
  it('the preflight the WebView sends before a POST: 204 with the app origin, POST and content-type allowed', async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/api/ask`, { method: 'OPTIONS', headers: { ...APP, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } }),
      env,
    )
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get('access-control-allow-origin')).toBe(APP.origin)
    expect(res.headers.get('access-control-allow-methods') ?? '').toMatch(/POST/)
    expect((res.headers.get('access-control-allow-headers') ?? '').toLowerCase()).toMatch(/content-type/)
  })
})
