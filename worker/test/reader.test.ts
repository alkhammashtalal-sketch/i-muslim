import { beforeAll, describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { htmlParagraphs, parseRange, SAADI_EMPTY } from '../src/passage'
import { handleReader } from '../src/reader'
import { buildDb, hasFullData, rawRecord } from './d1-sqlite'

let env: Env
const get = async (path: string) => {
  const url = new URL(`https://i-muslim.test${path}`)
  const res = await handleReader(new Request(url), env, url)
  if (!res) throw new Error(`no reader route for ${path}`)
  return { status: res.status, cache: res.headers.get('cache-control'), body: (await res.json()) as any }
}

describe('saadi helpers', () => {
  it('turns <p> HTML into plain paragraphs without changing the words', () => {
    expect(htmlParagraphs('<p>أ &amp; ب</p><p></p><p> ج </p>')).toEqual(['أ & ب', 'ج'])
    expect(htmlParagraphs('<p></p>')).toEqual([])
  })
  it('reads multi-ayah ranges only', () => {
    expect(parseRange('2:5-2:7')).toEqual({ from: 5, to: 7 })
    expect(parseRange('2:255-2:255')).toBeNull()
  })
})

describe.skipIf(!hasFullData)('reader routes on the full data (data/processed)', () => {
  beforeAll(() => {
    env = { DB: buildDb() } as unknown as Env
  })

  it('GET /api/suras: 114 suras, 6,236 ayat, long cache', async () => {
    const { status, body, cache } = await get('/api/suras')
    expect(status).toBe(200)
    expect(cache).toMatch(/max-age=\d+/)
    expect(body).toHaveLength(114)
    expect(body.reduce((n: number, s: { ayat: number }) => n + s.ayat, 0)).toBe(6236)
    expect(body[1]).toMatchObject({ n: 2, name: 'البقرة', ayat: 286 })
  })

  it('every sura returns all its ayat in order', async () => {
    const { body: suras } = await get('/api/suras')
    let total = 0
    for (const s of suras) {
      const { body } = await get(`/api/sura/${s.n}`)
      expect(body.ayat.map((a: { aya: number }) => a.aya)).toEqual(Array.from({ length: s.ayat }, (_, i) => i + 1))
      total += body.ayat.length
    }
    expect(total).toBe(6236)
  })

  it('basmala comes from quran:1:1, not for at-Tawba nor al-Fatiha', async () => {
    const b = rawRecord('quran:1:1')!.text
    expect((await get('/api/sura/2')).body.basmala).toBe(b)
    expect((await get('/api/sura/9')).body.basmala).toBeNull()
    expect((await get('/api/sura/1')).body.basmala).toBeNull()
  })

  it('English meaning only with ?en=1', async () => {
    expect((await get('/api/sura/112')).body.ayat[0].text_en).toBeUndefined()
    expect((await get('/api/sura/112?en=1')).body.ayat[0].text_en).toBe(rawRecord('quran:112:1')!.text_en)
  })

  it('2:255 is byte-for-byte the stored text, in the sura and in the passage', async () => {
    const stored = new TextEncoder().encode(rawRecord('quran:2:255')!.text as string)
    const inSura = (await get('/api/sura/2')).body.ayat[254]
    const passage = (await get('/api/passage/quran:2:255')).body
    expect(inSura.id).toBe('quran:2:255')
    expect(new TextEncoder().encode(inSura.text)).toEqual(stored)
    expect(new TextEncoder().encode(passage.text)).toEqual(stored)
  })

  it('passage 2:255: two ayat around it, both tafsirs with refs and links', async () => {
    const { body } = await get('/api/passage/quran:2:255')
    expect(body.before.map((c: { id: string }) => c.id)).toEqual(['quran:2:253', 'quran:2:254'])
    expect(body.after.map((c: { id: string }) => c.id)).toEqual(['quran:2:256', 'quran:2:257'])
    expect(body.ayah).toMatchObject({ sura: 2, aya: 255, page: 42, suraName: 'البقرة', suraAyat: 286 })
    const [m, s] = body.tafsir
    expect(m).toMatchObject({ key: 'muyassar', name: 'التفسير الميسر', ref: 'التفسير الميسر – البقرة: 255' })
    expect(m.text).toBe(rawRecord('quran:2:255')!.muyassar)
    expect(s.key).toBe('saadi')
    expect(s.url).toBe('https://quran.ksu.edu.sa/tafseer/saadi/sura2-aya255.html')
    expect(s.text).not.toMatch(/<\/?p>/)
    expect(s.empty).toBeUndefined()
  })

  it('context stays inside the sura (1:1 has nothing before, 114:6 nothing after)', async () => {
    expect((await get('/api/passage/quran:1:1')).body.before).toEqual([])
    expect((await get('/api/passage/quran:114:6')).body.after).toEqual([])
  })

  it('4:61 has no al-Saadi entry in the source: fixed sentence, al-Muyassar kept', async () => {
    const { body } = await get('/api/passage/quran:4:61')
    const saadi = body.tafsir.find((t: { key: string }) => t.key === 'saadi')
    expect(saadi).toMatchObject({ empty: true, text: SAADI_EMPTY, paragraphs: [] })
    expect(body.tafsir.find((t: { key: string }) => t.key === 'muyassar').text.length).toBeGreaterThan(20)
  })

  it('aqeedah passage carries the previous and next segment of the same book', async () => {
    const { body } = await get('/api/passage/aqeedah:tawhid:002')
    expect(body.before.map((c: { id: string }) => c.id)).toEqual(['aqeedah:tawhid:001'])
    expect(body.after.map((c: { id: string }) => c.id)).toEqual(['aqeedah:tawhid:003'])
    expect(body.tafsir).toBeUndefined()
  })

  it('unknown or malformed ids and suras are 404, never cached', async () => {
    for (const p of ['/api/passage/quran:115:1', '/api/passage/%E0%A4%A', '/api/passage/x', '/api/sura/0', '/api/sura/115']) {
      const r = await get(p)
      expect(r.status).toBe(404)
      expect(r.cache).toBe('no-store')
    }
  })

  it('no route serves the tafsir of a whole sura', async () => {
    const { body } = await get('/api/sura/2?en=1')
    const s = JSON.stringify(body)
    expect(s).not.toContain('muyassar')
    expect(s).not.toContain(rawRecord('quran:2:255')!.muyassar as string)
  })
})
