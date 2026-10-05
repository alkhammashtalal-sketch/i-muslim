import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { HEADERS } from '../src/security'
import { DAILY_RECORDINGS, handleTranscribe, MAX_BYTES, WHISPER_MODEL, wavInfo } from '../src/transcribe'
import { buildDb, type SqliteD1 } from './d1-sqlite'

/** A 16 kHz mono 16-bit PCM WAV of `seconds` (a quiet tone), like the browser sends. */
function makeWav(seconds: number, sampleRate = 16000): Uint8Array {
  const n = Math.round(seconds * sampleRate)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE')
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(3000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)), true)
  return new Uint8Array(buf)
}

let db: SqliteD1
let calls: { model: string; input: { audio: string; language?: string; task?: string } }[]
let reply: unknown
const envOf = () =>
  ({
    DB: db,
    IP_SALT: 'test-salt',
    AI: { run: async (model: string, input: never) => (calls.push({ model, input }), reply) },
  }) as unknown as Env
const post = async (body: Uint8Array | string, type = 'audio/wav', ip = '203.0.113.20', extra: Record<string, string> = {}) => {
  const res = await handleTranscribe(new Request('https://i-muslim.test/api/transcribe', { method: 'POST', headers: { 'content-type': type, 'cf-connecting-ip': ip, ...extra }, body }), envOf())
  return { status: res.status, body: (await res.json()) as any }
}

beforeEach(() => {
  db = buildDb()
  calls = []
  reply = { text: ' ما أركان الإسلام ', transcription_info: { language: 'ar' } }
})

describe('wavInfo', () => {
  it('reads the duration and format of a PCM WAV', () => {
    expect(wavInfo(makeWav(2.5))).toMatchObject({ seconds: 2.5, sampleRate: 16000, channels: 1 })
    expect(wavInfo(new TextEncoder().encode('not a wav file at all, just some text bytes here'))).toBeNull()
  })
})

describe('POST /api/transcribe', () => {
  it('turns speech into text and returns the detected language; Whisper chooses the language itself', async () => {
    const wav = makeWav(2)
    const r = await post(wav)
    expect(r).toEqual({ status: 200, body: { text: 'ما أركان الإسلام', language: 'ar' } })
    expect(calls).toHaveLength(1)
    expect(calls[0].model).toBe(WHISPER_MODEL)
    expect(calls[0].input.language).toBeUndefined()
    expect(Uint8Array.from(atob(calls[0].input.audio), (c) => c.charCodeAt(0))).toEqual(wav)
  })

  it('accepts WAV only', async () => {
    expect((await post(makeWav(1), 'audio/webm')).status).toBe(415)
    expect((await post('hello', 'audio/wav')).status).toBe(415)
    expect(calls).toHaveLength(0)
  })

  it('rejects files over 2 MB and recordings over 30 seconds', async () => {
    expect((await post(makeWav(1), 'audio/wav', '203.0.113.21', { 'content-length': String(MAX_BYTES + 1) })).status).toBe(413)
    expect((await post(makeWav(31))).body).toEqual({ error: 'too_long' })
    expect(calls).toHaveLength(0)
  })

  it('silence or noise gives a gentle "nothing heard", not a server error', async () => {
    reply = { text: '  ', transcription_info: { language: 'en' } }
    expect(await post(makeWav(1))).toEqual({ status: 200, body: { text: '', empty: true } })
    reply = { text: '...', transcription_info: { language: 'en' } }
    expect((await post(makeWav(1))).body).toEqual({ text: '', empty: true })
    expect((await post(makeWav(0.1))).body).toEqual({ text: '', empty: true })
  })

  it(`allows ${DAILY_RECORDINGS} recordings per device per day, separately from questions`, async () => {
    for (let i = 0; i < DAILY_RECORDINGS; i++) expect((await post(makeWav(0.5), 'audio/wav', '198.51.100.30')).status).toBe(200)
    expect((await post(makeWav(0.5), 'audio/wav', '198.51.100.30')).body).toEqual({ error: 'rate_limited' })
    expect((await post(makeWav(0.5), 'audio/wav', '198.51.100.31')).status).toBe(200)
    const keys = db.db.prepare('SELECT ip_hash FROM usage_daily').all() as { ip_hash: string }[]
    expect(keys.every((k) => k.ip_hash.startsWith('voice:'))).toBe(true)
  })

  it('stores no audio and no text anywhere', async () => {
    await post(makeWav(1))
    const tables = (db.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%fts%'").all() as { name: string }[]).map((t) => t.name)
    for (const t of tables.filter((t) => !['passages', 'suras', 'usage_daily', 'd1_migrations'].includes(t))) {
      expect((db.db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n, t).toBe(0)
    }
    const usage = db.db.prepare('SELECT * FROM usage_daily').all() as Record<string, unknown>[]
    expect(JSON.stringify(usage)).not.toContain('أركان')
  })
})

describe('microphone permission', () => {
  it('this origin may use the microphone (the mic button needs it); no third party, and the camera stays off', () => {
    const policy = HEADERS['permissions-policy']
    expect(policy).toContain('microphone=(self)')
    expect(policy).toContain('camera=()')
  })
})
