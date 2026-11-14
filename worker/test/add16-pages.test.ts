// Reply 0031-add16 §3 and §7: the hadith page's references (first two lines, the rest under «كل المراجع»), and the
// portion reminder said as «بعد العشاء بنصف ساعة» to match the push schedule (Isha + 30 minutes).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HADITH } from '../../web/src/v2/hadith/strings'
import { SHOWN_REFERENCES, splitReferences } from '../../web/src/v2/hadith/references'
import { READING } from '../../web/src/v2/reading/strings'
import { AFTER_ISHA_MS } from '../src/push/schedule'

const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
// Hadith 4196 «من صام رمضان»: its reference field as stored (data/processed/hadith.jsonl, HadeethEnc v1.7.0).
const REF_4196 = [
  'صحيح البخاري (1/ 16) (38).',
  'صحيح مسلم (1/ 523) (760).',
  'بهجة الناظرين شرح رياض الصالحين، لسليم الهلالي (2/ 361).',
  'نزهة المتقين شرح رياض الصالحين، لمصطفى الخِن وغيره (2/ 868).',
  'كنوز رياض الصالحين، لمجموعة من الباحثين (15/ 40).',
  'شرح رياض الصالحين، لابن عثيمين (5/ 270).',
].join('\n')

describe('hadith references (reply 0031-add16 §3)', () => {
  it('the first two lines are shown, the rest wait under «كل المراجع»; nothing is edited', () => {
    const r = splitReferences(REF_4196)
    expect(SHOWN_REFERENCES).toBe(2)
    expect(r.shown).toEqual(['صحيح البخاري (1/ 16) (38).', 'صحيح مسلم (1/ 523) (760).'])
    expect(r.rest).toHaveLength(4)
    expect([...r.shown, ...r.rest].join('\n')).toBe(REF_4196)
  })
  it('two lines or fewer: no disclosure', () => {
    expect(splitReferences('أ\nب').rest).toEqual([])
    expect(splitReferences('أ')).toEqual({ shown: ['أ'], rest: [] })
    expect(splitReferences(null)).toEqual({ shown: [], rest: [] })
    expect(splitReferences('')).toEqual({ shown: [], rest: [] })
  })
  it('an empty line has nothing to show and is not counted', () => {
    expect(splitReferences('أ\n\nب\n')).toEqual({ shown: ['أ', 'ب'], rest: [] })
  })
  it('the stored record of 4196, when the data is here, splits back to its own text', () => {
    const file = path.resolve(import.meta.dirname, '../../data/processed/hadith.jsonl')
    if (!fs.existsSync(file)) return
    const line = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('{"lang":"ar",') && l.includes('"id":"4196"'))
    expect(line).toBeTruthy()
    const rec = JSON.parse(line!)
    const r = splitReferences(rec.reference)
    expect([...r.shown, ...r.rest].join('\n')).toBe(rec.reference)
    expect(r.shown).toHaveLength(2)
    expect(r.rest.length).toBeGreaterThan(0)
  })
  it('the labels in ten languages; Arabic «المراجع» and «كل المراجع»', () => {
    expect(HADITH.ar.references).toBe('المراجع')
    expect(HADITH.ar.allReferences).toBe('كل المراجع')
    expect(HADITH.en.allReferences).toBe('All references')
    for (const l of LANGS) expect(HADITH[l].allReferences.length).toBeGreaterThan(3)
  })
})

describe('the portion reminder is said as Isha + half an hour (reply 0031-add16 §7)', () => {
  it('the schedule rings 30 minutes after Isha', () => {
    expect(AFTER_ISHA_MS).toBe(30 * 60_000)
  })
  it('the interface says «بعد العشاء بنصف ساعة», the no-place line the same', () => {
    expect(READING.ar.wardReminderPush).toBe('كل يوم بعد العشاء بنصف ساعة')
    expect(READING.ar.wardReminderNoPlace).toContain('بعد عشائها بنصف ساعة')
    expect(READING.en.wardReminderPush).toBe('Every day, half an hour after Isha')
    expect(READING.en.wardReminderNoPlace).toContain('half an hour after its Isha')
    // Each language says the half hour in both lines.
    const half: Record<(typeof LANGS)[number], RegExp> = {
      ar: /بنصف ساعة/,
      en: /half an hour/,
      ur: /آدھے گھنٹے/,
      id: /setengah jam/,
      ms: /setengah jam/,
      tr: /yarım saat/,
      fr: /demi-heure/,
      es: /media hora/,
      bn: /আধা ঘণ্টা/,
      hi: /आधे घंटे/,
    }
    for (const l of LANGS) {
      expect(READING[l].wardReminderPush).toMatch(half[l])
      expect(READING[l].wardReminderNoPlace).toMatch(half[l])
    }
  })
})
