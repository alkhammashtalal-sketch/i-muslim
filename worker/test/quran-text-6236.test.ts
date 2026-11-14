import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { handleReader } from '../src/reader'
import { buildDb, hasFullData } from './d1-sqlite'

// Add-on 0072-add60 «لا يُدمج النص القرآني إلا بفحص آلي: مطابقة الحروف للمصدر 6236 آية»: every ayah the reader serves,
// and every ayah the app carries for offline reading (web/dist/offline/sura, from npm run build:native), is the source's
// text letter for letter (data/processed/quran.jsonl, copied byte for byte from quran.ksu.edu.sa by ksu-build.mjs).
const ROOT = path.resolve(import.meta.dirname, '../..')
const OFFLINE = path.join(ROOT, 'web/dist/offline/sura')

const source = (): Map<string, string> => {
  const m = new Map<string, string>()
  for (const line of fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line) as { sura: number; aya: number; text: string }
    m.set(`${r.sura}:${r.aya}`, r.text)
  }
  return m
}

describe.skipIf(!hasFullData)('the Quranic text, 6,236 ayat letter for letter', () => {
  let src: Map<string, string>
  let env: Env
  beforeAll(() => {
    src = source()
    env = { DB: buildDb() } as unknown as Env
  })

  it('the source has 6,236 ayat', () => {
    expect(src.size).toBe(6236)
  })

  it('the reader serves each ayah exactly as the source has it', async () => {
    const differ: string[] = []
    let n = 0
    for (let s = 1; s <= 114; s++) {
      const url = new URL(`https://i-muslim.test/api/sura/${s}`)
      const res = await handleReader(new Request(url), env, url)
      const body = (await res!.json()) as { ayat: { aya: number; text: string }[] }
      for (const a of body.ayat) {
        n++
        if (a.text !== src.get(`${s}:${a.aya}`)) differ.push(`${s}:${a.aya}`)
      }
    }
    expect(n).toBe(6236)
    expect(differ).toEqual([])
  })

  it.skipIf(!fs.existsSync(OFFLINE))('the app carries each ayah exactly as the source has it (offline suras)', () => {
    const differ: string[] = []
    let n = 0
    for (let s = 1; s <= 114; s++) {
      const body = JSON.parse(fs.readFileSync(path.join(OFFLINE, `${s}.json`), 'utf8')) as { ayat: { aya: number; text: string }[] }
      for (const a of body.ayat) {
        n++
        if (a.text !== src.get(`${s}:${a.aya}`)) differ.push(`${s}:${a.aya}`)
      }
    }
    expect(n).toBe(6236)
    expect(differ).toEqual([])
  })
})
