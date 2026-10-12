// Reply 0032 C: the Mushaf positions (web/src/v2/reading/meta.ts, numbers from QuranData) and GET /api/quarters (the
// quarters' opening words cut from D1's own text).
import { beforeAll, describe, expect, it } from 'vitest'
import { firstWords, isSajda, juzOf, pageOf, portions, quarterInfo, SAJDA, SURA_AYAT, SURA_TYPE } from '../../web/src/v2/reading/meta'
import type { Env } from '../src/index'
import { handleReader } from '../src/reader'
import { buildDb, hasFullData, rawRecord } from './d1-sqlite'

describe('Mushaf positions', () => {
  it('pages, juz, sura table', () => {
    expect(pageOf(1, 1)).toBe(1)
    expect(pageOf(2, 255)).toBe(42)
    expect(pageOf(114, 6)).toBe(604)
    expect(juzOf(2, 141)).toBe(1)
    expect(juzOf(2, 142)).toBe(2)
    expect(juzOf(114, 6)).toBe(30)
    expect(SURA_AYAT.reduce((a, b) => a + b, 0)).toBe(6236)
    expect(SURA_TYPE[33]).toBe('madani')
    expect(SURA_TYPE[96]).toBe('makki')
  })
  it('the fifteen sajda places', () => {
    expect(SAJDA).toHaveLength(15)
    expect(isSajda(7, 206)).toBe(true)
    expect(isSajda(7, 205)).toBe(false)
  })
  it('quarters: hizb and part', () => {
    expect(quarterInfo(0)).toEqual({ hizb: 1, part: 0, juz: 1 })
    expect(quarterInfo(5)).toEqual({ hizb: 2, part: 1, juz: 1 })
    expect(quarterInfo(239)).toEqual({ hizb: 60, part: 3, juz: 30 })
  })
  it('portions cover the Quran once, end to end', () => {
    for (const days of [7, 15, 30, 60, 1, 604]) {
      const p = portions(days)
      expect(p[0].from).toEqual([1, 1])
      expect(p.at(-1)!.to).toEqual([114, 6])
      for (let i = 1; i < p.length; i++) {
        const [s, a] = p[i].from
        expect(p[i - 1].to).toEqual(a > 1 ? [s, a - 1] : [s - 1, SURA_AYAT[s - 1]])
      }
    }
    expect(portions(30)).toHaveLength(30)
    expect(portions(30)[0]).toEqual({ from: [1, 1], to: [2, 141] })
  })
  it('first words: four, the quarter sign counted apart, «more» only when the ayah goes on', () => {
    expect(firstWords('۞ a b c d e f')).toEqual({ cut: '۞ a b c d', more: true })
    expect(firstWords('a b c d')).toEqual({ cut: 'a b c d', more: false })
  })
})

describe.skipIf(!hasFullData)('GET /api/quarters on the full data', () => {
  let env: Env
  beforeAll(() => {
    env = { DB: buildDb() } as unknown as Env
  })
  it('240 quarters, each opening cut from its own ayah in D1, with its page', async () => {
    const url = new URL('https://i-muslim.test/api/quarters')
    const res = await handleReader(new Request(url), env, url)
    expect(res!.status).toBe(200)
    const q = (await res!.json()) as { q: number; sura: number; aya: number; page: number; first: string; more: boolean }[]
    expect(q).toHaveLength(240)
    for (const x of q) {
      const r = rawRecord(`quran:${x.sura}:${x.aya}`)!
      expect(r.text.startsWith(x.first)).toBe(true)
      expect(x.page).toBe(pageOf(x.sura, x.aya))
    }
    expect(q[1]).toMatchObject({ sura: 2, aya: 26, page: 5, more: true })
    expect(q[1].first.split(' ')).toHaveLength(5) // ۞ and four words
  })
})
