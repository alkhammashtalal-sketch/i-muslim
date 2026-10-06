import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

// Recitations in tests (command 19): nothing real is fetched from mp3quran. Every request to its server gets the
// local silent file, with byte ranges as the real server answers them (206), and the timing files are replaced.
const SILENCE = fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/silence-8s.mp3'))

export async function fakeRecitation(
  page: Page,
  o: { timing?: (sura: number) => [number, number, number][]; audio?: 'ok' | 'missing' } = {},
): Promise<string[]> {
  const requested: string[] = []
  const timing = o.timing ?? (() => Array.from({ length: 300 }, (_, i): [number, number, number] => [i + 1, 500, 1000]))
  await page.route(/\/recitation\/54\/(\d+)\.json$/, (r) => {
    const sura = Number(r.request().url().match(/\/(\d+)\.json$/)![1])
    return r.fulfill({ json: { sura, read: 54, audio: '', ayat: timing(sura) } })
  })
  await page.route(/cdn\.mp3quran\.net/, (r) => {
    requested.push(r.request().url())
    if (o.audio === 'missing') return r.fulfill({ status: 404, body: '' })
    const m = (r.request().headers()['range'] ?? '').match(/bytes=(\d+)-(\d*)/)
    if (!m) return r.fulfill({ status: 200, contentType: 'audio/mpeg', headers: { 'accept-ranges': 'bytes' }, body: SILENCE })
    const from = Number(m[1])
    const to = m[2] ? Math.min(Number(m[2]), SILENCE.length - 1) : SILENCE.length - 1
    return r.fulfill({
      status: 206,
      contentType: 'audio/mpeg',
      headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${from}-${to}/${SILENCE.length}` },
      body: SILENCE.subarray(from, to + 1),
    })
  })
  return requested
}
