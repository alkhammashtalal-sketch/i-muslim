// data/calendar-events.json (reply 0031-add10 §8): every marked day points at a sahih hadith in the local HadeethEnc
// build, and its evidence phrase is in that hadith's Arabic text (diacritics removed on both sides). Skipped without
// data/processed/hadith.jsonl (outside git).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const cal = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/calendar-events.json'), 'utf8'))
const strip = (s: string) => s.replace(/[ً-ْٰ‌‍]/g, '').replace(/\s+/g, ' ')

describe('calendar events', () => {
  it('none of the four unmarked days is marked', () => {
    for (const d of cal.not_marked.days) for (const e of cal.events) for (const w of e.when) if (w.month === d.month) expect(String(w.days).split(/[,-]/)).not.toContain(String(d.day))
  })
  it.skipIf(!fs.existsSync(HADITH))('each event: a sahih hadith (tier 1 or 2) whose text holds the evidence', () => {
    const ar = new Map<string, { hadeeth: string; tier: string; grade: string }>()
    for (const l of fs.readFileSync(HADITH, 'utf8').trim().split('\n')) {
      const r = JSON.parse(l)
      if (r.lang === 'ar') ar.set(r.id, r)
    }
    for (const e of cal.events) {
      const r = ar.get(e.hadith_id)
      expect(r, e.key).toBeDefined()
      expect(['1', '2'], e.key).toContain(r!.tier)
      expect(strip(r!.hadeeth), e.key).toContain(strip(e.evidence))
    }
  })
})
