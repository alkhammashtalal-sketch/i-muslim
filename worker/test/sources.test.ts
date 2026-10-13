// «المصادر والشكر» (reply 0033 §أ3): the registry against the data, the monthly check with a stubbed fetch, the cron
// dispatch, the status route, and «أبلغ عن خطأ» on POST /api/report (with the old shape still working).
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import registry from '../../data/sources.json'
import worker, { type Env } from '../src/index'
import { riyadhDay } from '../src/lib/keys'
import { handleReport, NOTE_MAX, parseSourceReport } from '../src/report'
import { checkSources, cleanVersion, handleSources, newer, QURANENC_LIST, SOURCES_CRON, sourcesStatus } from '../src/sources'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']

/** Every migration, with the sample passages (data/samples, in git) loaded where the indexer puts them. */
function sampleDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const run = (f: string) => db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  files.filter((f) => f < '0004').forEach(run)
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const f of ['quran.sample.jsonl', 'aqeedah.sample.jsonl'])
    for (const line of fs.readFileSync(path.join(ROOT, 'data/samples', f), 'utf8').trim().split('\n')) {
      const r = JSON.parse(line) as Record<string, unknown>
      ins.run(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))))
    }
  files.filter((f) => f >= '0004').forEach(run)
  return new SqliteD1(db)
}

let db: SqliteD1
let env: Env
beforeEach(() => {
  db = sampleDb()
  const tr = db.db.prepare('INSERT INTO ayah_translations (lang, sura, aya, text, translator, version, footnotes, source_key) VALUES (?, 1, 1, ?, ?, ?, NULL, ?)')
  tr.run('fr', 'Au nom d’Allah…', 'Rachid Maach', '1.0.3', 'french_rashid')
  tr.run('tr', 'Rahmân ve Rahîm…', 'Rowwad', '1.0.4', 'turkish_rwwad')
  tr.run('bn', 'পরম করুণাময়…', 'Muhiuddin Khan', null, null)
  db.db.prepare("INSERT INTO tafsir_translations (source, lang, sura, aya, text, version, source_key) VALUES ('quranenc', ?, 1, 1, 'x', ?, ?)").run('fr', '1.0.0', 'french_mokhtasar')
  db.db.prepare("INSERT INTO tafsir_translations (source, lang, sura, aya, text, version, source_key) VALUES ('quranenc', 'ar', 1, 1, 'x', '1.0.0', 'arabic_mokhtasar')").run()
  env = { DB: db as unknown as D1Database, IP_SALT: 'salt', MUKHTASAR_QURANENC: 'true' } as unknown as Env
})

const listResponse = (items: { key: string; version: unknown }[], status = 200) =>
  vi.fn(async (url: string | URL | Request) => {
    expect(String(url)).toBe(QURANENC_LIST)
    return new Response(JSON.stringify({ translations: items }), { status, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch

describe('the registry (data/sources.json)', () => {
  type Text = string | Record<string, string>
  type Src = { id: string; group: string; name: Text; take: Text; [k: string]: unknown }
  const sources = registry.sources as unknown as Src[]
  const groups = registry.groups.map((g) => g.id)

  it('has unique ids, known groups, every group used, and texts in the ten languages', () => {
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length)
    for (const s of sources) expect(groups).toContain(s.group)
    for (const g of groups) expect(sources.some((s) => s.group === g)).toBe(true)
    for (const s of sources)
      for (const f of ['name', 'take', 'by', 'prepared', 'published', 'terms', 'fetchedNote']) {
        const v = s[f] as Text | undefined
        if (v === undefined || typeof v === 'string') continue
        for (const l of LANGS) expect(v[l]?.trim(), `${s.id}.${f}.${l}`).toBeTruthy()
        // A count is a placeholder filled from the data, never a number written in a text.
        expect(Object.values(v).every((t) => t.includes('{n}')) || Object.values(v).every((t) => !t.includes('{n}')), `${s.id}.${f}`).toBe(true)
      }
  })

  it('links are https, dates are real Riyadh dates, the open link is rel=noreferrer-safe', () => {
    for (const s of sources) {
      for (const k of ['site', 'termsUrl']) if (s[k]) expect(String(s[k])).toMatch(/^https:\/\//)
      const lic = s.licence as { url: string } | undefined
      if (lic) expect(lic.url).toMatch(/^https:\/\//)
      for (const d of (s.fetched as string[] | undefined) ?? []) expect(new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10)).toBe(d)
    }
  })

  it('lists what the app uses: no sunnah.com, no dorar.net (no token yet), no Riyad al-Salihin explanation (no permission yet)', () => {
    const all = JSON.stringify(registry)
    expect(all).not.toMatch(/sunnah\.com|dorar\.net|binothaimeen\.net/)
    for (const id of ['ksu', 'quranenc', 'mukhtasar', 'hadeethenc', 'shamela', 'binbaz', 'mumti', 'mp3quran', 'adhan', 'wmm', 'osm', 'geonames', 'ummalqura']) expect(sources.map((s) => s.id)).toContain(id)
  })

  const meanings = path.join(ROOT, 'data/processed/meanings.jsonl')
  it.runIf(fs.existsSync(meanings))('QuranEnc languages are the meanings loaded with a QuranEnc key (the Ayat archive rows have none)', () => {
    const qe = new Set<string>()
    const all = new Set<string>()
    for (const line of fs.readFileSync(meanings, 'utf8').trim().split('\n')) {
      const r = JSON.parse(line) as { lang: string; source_key?: string | null }
      all.add(r.lang)
      if (r.source_key) qe.add(r.lang)
    }
    expect([...qe].sort()).toEqual(sources.find((s) => s.id === 'quranenc')!.langs)
    // 29 languages of meanings are loaded: QuranEnc's and the two from the Ayat archive (Bengali, Malay).
    expect(all.size).toBe(qe.size + 2)
    expect([...all].filter((l) => !qe.has(l)).sort()).toEqual(['bn', 'ms'])
  })

  const mokhtasar = path.join(ROOT, 'data/processed/mokhtasar-qe.sql')
  it.runIf(fs.existsSync(mokhtasar))('al-Mukhtasar languages are those loaded, less Arabic and Italian (stored, not shown)', () => {
    const langs = new Set([...fs.readFileSync(mokhtasar, 'utf8').matchAll(/^\('quranenc', '([a-z]{2,3})', 1, 1,/gm)].map((m) => m[1]))
    expect([...langs].filter((l) => l !== 'ar' && l !== 'it').sort()).toEqual(sources.find((s) => s.id === 'mukhtasar')!.langs)
  })

  const manifest = path.join(ROOT, 'data/raw/hadeethenc/MANIFEST.json')
  it.runIf(fs.existsSync(manifest))('HadeethEnc versions are those of the files we loaded', () => {
    const m = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { versions: Record<string, { version: string }> }
    expect(sources.find((s) => s.id === 'hadeethenc')!.versions).toEqual(Object.fromEntries(LANGS.map((l) => [l, m.versions[l].version])))
  })
})

describe('versions', () => {
  it('compares dotted versions', () => {
    expect(newer('1.0.4', '1.0.3')).toBe(true)
    expect(newer('1.0.10', '1.0.9')).toBe(true)
    expect(newer('2.0', '1.9.9')).toBe(true)
    expect(newer('v1.8.0', 'v1.7.0')).toBe(true)
    expect(newer('1.0.3', '1.0.3')).toBe(false)
    expect(newer('1.0.2', '1.0.3')).toBe(false)
    expect(newer('1.0.3.0', '1.0.3')).toBe(false)
    expect(newer(null, '1.0.3')).toBe(false)
    expect(newer('1.0.0', null)).toBe(true)
  })
  it('keeps only what looks like a version', () => {
    expect(cleanVersion('1.0.13')).toBe('1.0.13')
    expect(cleanVersion(' v1.7.0 ')).toBe('v1.7.0')
    expect(cleanVersion('<script>')).toBeNull()
    expect(cleanVersion(null)).toBeNull()
    expect(cleanVersion(2)).toBe('2')
  })
})

describe('the monthly check', () => {
  const NOW = Date.parse('2026-11-01T03:00:00Z')

  it('records ours and theirs for each QuranEnc translation; a newer one is pending, not applied', async () => {
    const f = listResponse([
      { key: 'french_rashid', version: '1.0.4' },
      { key: 'turkish_rwwad', version: '1.0.4' },
      { key: 'english_rwwad', version: '1.0.19' },
    ])
    const r = await checkSources(env, f, NOW)
    expect(f).toHaveBeenCalledTimes(1)
    expect(r).toEqual({ day: '2026-11-01', checked: 2, pending: [{ source: 'quranenc', key: 'french_rashid', lang: 'fr', ours: '1.0.3', theirs: '1.0.4' }] })
    expect(db.db.prepare('SELECT * FROM source_checks ORDER BY key').all()).toEqual([
      { checked_at: '2026-11-01', source: 'quranenc', key: 'french_rashid', lang: 'fr', ours: '1.0.3', theirs: '1.0.4' },
      { checked_at: '2026-11-01', source: 'quranenc', key: 'turkish_rwwad', lang: 'tr', ours: '1.0.4', theirs: '1.0.4' },
    ])
    // Not applied: the meaning served is still ours.
    expect(db.db.prepare("SELECT version FROM ayah_translations WHERE lang = 'fr'").get()).toEqual({ version: '1.0.3' })
    // Run again the same day: one row per item still.
    await checkSources(env, f, NOW)
    expect(db.db.prepare('SELECT count(*) AS n FROM source_checks').get()).toEqual({ n: 2 })
  })

  it('a key gone from their list is recorded with theirs empty, and a strange version is not stored', async () => {
    await checkSources(env, listResponse([{ key: 'turkish_rwwad', version: '<b>new</b>' }]), NOW)
    const rows = db.db.prepare('SELECT key, theirs FROM source_checks ORDER BY key').all()
    expect(rows).toEqual([
      { key: 'french_rashid', theirs: null },
      { key: 'turkish_rwwad', theirs: null },
    ])
  })

  it('writes nothing when their list cannot be read', async () => {
    await expect(checkSources(env, listResponse([], 503), NOW)).rejects.toThrow(/503/)
    const notJson = vi.fn(async () => new Response('{"oops":1}', { status: 200 })) as unknown as typeof fetch
    await expect(checkSources(env, notJson, NOW)).rejects.toThrow(/no translations/)
    expect(db.db.prepare('SELECT count(*) AS n FROM source_checks').get()).toEqual({ n: 0 })
  })

  it('the monthly cron runs the check; the minute cron does not', async () => {
    const f = listResponse([{ key: 'french_rashid', version: '1.0.3' }])
    vi.stubGlobal('fetch', f)
    try {
      const waits: Promise<unknown>[] = []
      const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException() {} } as unknown as ExecutionContext
      await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() } as ScheduledController, env, ctx)
      await Promise.all(waits)
      expect(f).not.toHaveBeenCalled()
      expect(SOURCES_CRON).toBe('0 3 1 * *')
      await worker.scheduled({ cron: SOURCES_CRON, scheduledTime: Date.now() } as ScheduledController, env, ctx)
      await Promise.all(waits)
      expect(f).toHaveBeenCalledTimes(1)
      expect(db.db.prepare('SELECT checked_at, key, theirs FROM source_checks ORDER BY key').all()).toEqual([
        { checked_at: riyadhDay(), key: 'french_rashid', theirs: '1.0.3' },
        { checked_at: riyadhDay(), key: 'turkish_rwwad', theirs: null },
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('wrangler.jsonc keeps the minute cron and adds the monthly one, in env.next only', () => {
    const conf = fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')
    expect(conf).toMatch(/"triggers": \{ "crons": \["\* \* \* \* \*", "0 3 1 \* \*"\] \}/)
    expect(conf.match(/"triggers"/g)).toHaveLength(1)
  })
})

describe('GET /api/sources/status', () => {
  const get = (q: string, cache?: Cache) => handleSources(new Request(`https://x/api/sources/status${q}`), env, new URL(`https://x/api/sources/status${q}`), cache)

  it('before any check: no date, nothing pending; the reader language versions by key', async () => {
    expect(await sourcesStatus(env, 'fr')).toEqual({
      checked_at: null,
      pending: [],
      meaning: { key: 'french_rashid', version: '1.0.3', translator: 'Rachid Maach' },
      mukhtasar: { key: 'french_mokhtasar', version: '1.0.0' },
    })
    // Bengali's meaning is the Ayat archive's (no QuranEnc key); Arabic has no meaning and no Mukhtasar shown.
    expect(await sourcesStatus(env, 'bn')).toMatchObject({ meaning: null, mukhtasar: null })
    expect(await sourcesStatus(env, 'ar')).toMatchObject({ meaning: null, mukhtasar: null })
    // Al-Mukhtasar follows its switch.
    expect(await sourcesStatus({ ...env, MUKHTASAR_QURANENC: 'false' } as Env, 'fr')).toMatchObject({ mukhtasar: null })
  })

  it('after a check: its date and the pending items', async () => {
    await checkSources(env, listResponse([{ key: 'french_rashid', version: '1.1.0' }, { key: 'turkish_rwwad', version: '1.0.4' }]), Date.parse('2026-11-01T03:00:00Z'))
    const res = (await get('?lang=tr'))!
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(await res.json()).toMatchObject({
      checked_at: '2026-11-01',
      pending: [{ source: 'quranenc', key: 'french_rashid', lang: 'fr', ours: '1.0.3', theirs: '1.1.0' }],
      meaning: { key: 'turkish_rwwad', version: '1.0.4' },
    })
  })

  it('the latest check wins', async () => {
    await checkSources(env, listResponse([{ key: 'french_rashid', version: '1.1.0' }]), Date.parse('2026-11-01T03:00:00Z'))
    await checkSources(env, listResponse([{ key: 'french_rashid', version: '1.0.3' }]), Date.parse('2026-12-01T03:00:00Z'))
    expect(await sourcesStatus(env, '')).toEqual({ checked_at: '2026-12-01', pending: [], meaning: null, mukhtasar: null })
  })

  it('refuses a strange language, answers only its path, and serves the edge cache', async () => {
    expect((await get('?lang=fr%27--'))!.status).toBe(400)
    expect(await handleSources(new Request('https://x/api/sources'), env, new URL('https://x/api/sources'))).toBeNull()
    const store = new Map<string, Response>()
    const cache = {
      match: async (r: Request) => store.get(r.url)?.clone(),
      put: async (r: Request, res: Response) => void store.set(r.url, res),
    } as unknown as Cache
    expect(await (await get('?lang=fr', cache))!.json()).toMatchObject({ checked_at: null })
    await checkSources(env, listResponse([{ key: 'french_rashid', version: '9.0.0' }]), Date.now())
    // Within the cache's lifetime the same answer comes back without reading D1.
    expect(await (await get('?lang=fr', cache))!.json()).toMatchObject({ checked_at: null })
    expect(store.size).toBe(1)
  })

  it('a database without the migration reads as no check yet', async () => {
    db.db.exec('DROP TABLE source_checks')
    expect(await sourcesStatus(env, 'fr')).toMatchObject({ checked_at: null, pending: [] })
  })
})

describe('POST /api/report: «أبلغ عن خطأ»', () => {
  const post = (body: unknown, ip = '203.0.113.7') =>
    handleReport(new Request('https://x/api/report', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify(body) }), env)
  const rows = () => db.db.prepare('SELECT * FROM source_reports ORDER BY id').all() as Record<string, unknown>[]
  const ayah = { type: 'ayah', id: '2:255', lang: 'ar', source: 'ksu' }

  beforeEach(() => {
    db.db.prepare("INSERT INTO hadiths (id, lang, text, class, tier, version) VALUES ('5503', 'ar', 'نص', 'sahih', '1', 'v1.7.0')").run()
  })

  it('stores the type, the place, the note and the date only (no IP, no time)', async () => {
    const res = await post({ kind: 'text', loc: ayah, note: '  في الكلمة الثالثة  ' })
    expect(res.status).toBe(200)
    expect(rows()).toEqual([{ id: 1, day: riyadhDay(), kind: 'text', ref_type: 'ayah', ref_id: '2:255', lang: 'ar', source: 'ksu', version: null, note: 'في الكلمة الثالثة' }])
    expect(JSON.stringify(rows())).not.toContain('203.0.113.7')
    expect((await post({ kind: 'translation', loc: { type: 'hadith', id: '5503', lang: 'en', source: 'hadeethenc', version: 'v1.25.0' } })).status).toBe(200)
    expect(rows()[1]).toMatchObject({ kind: 'translation', ref_type: 'hadith', ref_id: '5503', lang: 'en', source: 'hadeethenc', version: 'v1.25.0', note: null })
    // From the sources page: no place.
    expect((await post({ kind: 'other' })).status).toBe(200)
    expect(rows()[2]).toMatchObject({ kind: 'other', ref_type: null, ref_id: null, lang: null, source: null })
    // A passage of a book.
    expect((await post({ kind: 'explanation', loc: { type: 'passage', id: 'aqeedah:usul:001', lang: 'ar', source: 'shamela' } })).status).toBe(200)
  })

  it('accepts a support message, which must have its note', async () => {
    expect((await post({ kind: 'support', note: 'سؤال عن التطبيق' })).status).toBe(200)
    expect(rows()[0]).toMatchObject({ kind: 'support', note: 'سؤال عن التطبيق' })
    expect((await post({ kind: 'support' })).status).toBe(400)
    expect((await post({ kind: 'support', note: '   ' })).status).toBe(400)
  })

  it('validates everything and refuses rather than trims', () => {
    const ok = (b: unknown) => parseSourceReport(b) !== null
    expect(ok({ kind: 'text' })).toBe(true)
    expect(ok({ kind: 'spam' })).toBe(false)
    expect(ok({ kind: 'text', note: 'x'.repeat(NOTE_MAX) })).toBe(true)
    expect(ok({ kind: 'text', note: 'x'.repeat(NOTE_MAX + 1) })).toBe(false)
    // 500 characters, not 500 bytes or UTF-16 units.
    expect(ok({ kind: 'text', note: 'ب'.repeat(NOTE_MAX) })).toBe(true)
    expect(ok({ kind: 'text', note: '😀'.repeat(NOTE_MAX) })).toBe(true)
    expect(ok({ kind: 'text', note: 5 })).toBe(false)
    for (const loc of [
      { ...ayah, id: '115:1' },
      { ...ayah, id: '2:0' },
      { ...ayah, id: '2:255:1' },
      { ...ayah, type: 'page' },
      { ...ayah, lang: 'arabic' },
      { ...ayah, source: 'sunnah' },
      { ...ayah, version: '<b>' },
      { type: 'hadith', id: '05503', lang: 'ar', source: 'hadeethenc' },
      { type: 'passage', id: "x'; DROP TABLE reports;--", lang: 'ar', source: 'shamela' },
      'quran:2:255',
    ])
      expect(ok({ kind: 'text', loc }), JSON.stringify(loc)).toBe(false)
    expect(parseSourceReport({ kind: 'text', note: 'a\u0000b\u0007c\n\n\n\nd' })?.note).toBe('abc\n\nd')
  })

  it('a place that does not exist is refused', async () => {
    expect((await post({ kind: 'text', loc: { ...ayah, id: '2:287' } })).status).toBe(400)
    expect((await post({ kind: 'text', loc: { ...ayah, id: '2:200' } })).status).toBe(404)
    expect((await post({ kind: 'text', loc: { type: 'hadith', id: '999999', lang: 'ar', source: 'hadeethenc' } })).status).toBe(404)
    expect(rows()).toHaveLength(0)
  })

  it('shares the daily limit with the old shape, which keeps working', async () => {
    expect((await post({ passageId: 'quran:5:6', reason: 'wrong_ref' })).status).toBe(200)
    expect(db.db.prepare('SELECT passage_id, reason FROM reports').all()).toEqual([{ passage_id: 'quran:5:6', reason: 'wrong_ref' }])
    for (let i = 0; i < 9; i++) expect((await post({ kind: 'other' })).status).toBe(200)
    expect((await post({ kind: 'other' })).status).toBe(429)
    expect((await post({ passageId: 'quran:5:6', reason: 'other' })).status).toBe(429)
    // Another device has its own count.
    expect((await post({ kind: 'other' }, '198.51.100.9')).status).toBe(200)
  })

  it('needs the salt, like the old shape', async () => {
    env.IP_SALT = undefined
    expect((await post({ kind: 'other' })).status).toBe(500)
  })
})
