// The adhkar highlights (reply 0031-add16 §2): all of a hadith's segments or none, hidden in a hadith with more than
// one «…» pair, or in an entry on hold, until the coordinator has reviewed its entry; and the card title, HadeethEnc's
// own, in the response.
// The rules on made-up texts, then GET /api/adhkar/:category on an in-memory D1 built from migration 0008 with texts
// assembled around the data file's own segments (no data/processed needed).
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import highlights from '../../data/adhkar-highlights.json'
import { handleAdhkar, MAX } from '../src/adhkar'
import { highlightFor, locateSegments, quotePairs, type HighlightEntry } from '../src/adhkar-rules'
import type { Env } from '../src/index'
import { SqliteD1 } from './d1-sqlite'

const entry = (segments: string[], reviewed = false): HighlightEntry => ({ id: '1', segments, reviewed })

describe('«…» pairs', () => {
  it('counts each pair once', () => {
    expect(quotePairs('قال: سبحان الله')).toBe(0)
    expect(quotePairs('قال: «سبحان الله»')).toBe(1)
    expect(quotePairs('قال: «أمسينا» قال الراوي: «له الملك»، وإذا أصبح «أصبحنا»')).toBe(3)
    // A pair inside another counts with it; a mark left open is not a pair.
    expect(quotePairs('«قل: «سبحان الله» ثلاثا»')).toBe(1)
    expect(quotePairs('«سبحان الله')).toBe(0)
    // Straight quotes are not «…» pairs.
    expect(quotePairs('قال: "سبحان الله"')).toBe(0)
  })
})

describe('highlightFor', () => {
  const one = 'عن أبي هريرة قال: «من قال: سُبْحَانَ اللهِ وَبِحَمْدِهِ، مائة مرة»'
  const cut = 'كان إذا أمسى قال: «أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ» قال الراوي: أراه قال فيهن: «لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ»'
  it('no entry: no highlight', () => {
    expect(highlightFor(one, undefined)).toEqual({ segments: [], status: 'none' })
  })
  it('one «…» pair: the segments, compared without diacritics', () => {
    expect(highlightFor(one, entry(['سبحان الله وبحمده']))).toEqual({ segments: ['سبحان الله وبحمده'], status: 'shown' })
  })
  it('more than one «…» pair: nothing until the entry is reviewed', () => {
    const segs = ['أمسينا وأمسى الملك لله', 'له الملك وله الحمد']
    expect(highlightFor(cut, entry(segs))).toEqual({ segments: [], status: 'pending_review' })
    expect(highlightFor(cut, { ...entry(segs), reviewed: undefined as unknown as boolean })).toEqual({ segments: [], status: 'pending_review' })
    expect(highlightFor(cut, entry(segs, true))).toEqual({ segments: segs, status: 'shown' })
  })
  it('an entry on hold: nothing though the text has one «…» pair, until the entry is reviewed', () => {
    // As in 10947: the dhikr goes on after the «…», in the narrator's words.
    const out = 'كان إذا انصرف استغفر ثلاثا، وقال: «اللهم أنت السلام» قال الراوي: تقول: أستغفر الله'
    const segs = ['اللهم أنت السلام', 'أستغفر الله']
    expect(quotePairs(out)).toBe(1)
    expect(highlightFor(out, entry(segs)).status).toBe('shown')
    const held = { ...entry(segs), hold: 'الاستغفار خارج «»' }
    expect(highlightFor(out, held)).toEqual({ segments: [], status: 'pending_review' })
    expect(highlightFor(out, { ...held, reviewed: true })).toEqual({ segments: segs, status: 'shown' })
    // An empty hold holds nothing.
    expect(highlightFor(out, { ...entry(segs), hold: '' }).status).toBe('shown')
  })
  it('all or nothing: one segment not verbatim hides every segment, reviewed or not', () => {
    expect(highlightFor(cut, entry(['أمسينا وأمسى الملك لله', 'له الملك وله الشكر'], true))).toEqual({ segments: [], status: 'not_verbatim' })
    const two = '«إذا دخل فليقل: اللهم افتح لي أبواب رحمتك، وإذا خرج فليقل: اللهم إني أسألك من فضلك»'
    expect(highlightFor(two, entry(['اللهم افتح لي أبواب رحمتك', 'اللهم إني أسألك من فضلك'])).status).toBe('shown')
    expect(highlightFor(two, entry(['اللهم افتح لي أبواب رحمتك', 'اللهم إني أسألك من رحمتك'])).segments).toEqual([])
  })
  it('segments in the text order, without overlap; an empty list or segment is no highlight', () => {
    const t = '«سبحان الله، والحمد لله، والله أكبر»'
    expect(locateSegments(t, ['سبحان الله', 'والله أكبر'])).not.toBeNull()
    expect(locateSegments(t, ['والله أكبر', 'سبحان الله'])).toBeNull()
    expect(locateSegments(t, ['سبحان الله، والحمد', 'والحمد لله'])).toBeNull()
    expect(locateSegments(t, [])).toBeNull()
    expect(locateSegments(t, ['سبحان الله', ' '])).toBeNull()
    expect(highlightFor(t, entry([])).status).toBe('not_verbatim')
  })
})

describe('GET /api/adhkar/:category', () => {
  const MIGRATION = path.resolve(import.meta.dirname, '../migrations/0008_hadiths.sql')
  const E = new Map((highlights.highlights as HighlightEntry[]).map((h) => [h.id, h]))
  type Row = { id: string; lang: string; title: string; text: string; tier?: string }
  function envWith(rows: Row[], category = '301') {
    const db = new DatabaseSync(':memory:')
    db.exec(fs.readFileSync(MIGRATION, 'utf8'))
    const ins = db.prepare('INSERT INTO hadiths (id, lang, title, text, attribution, grade, class, tier, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const cat = db.prepare('INSERT OR REPLACE INTO hadith_categories (category, id, tier) VALUES (?, ?, ?)')
    for (const r of rows) {
      ins.run(r.id, r.lang, r.title, r.text, 'رواه مسلم', 'صحيح', 'sahih', r.tier ?? '1', 'v1')
      if (r.lang === 'ar') cat.run(category, r.id, r.tier ?? '1')
    }
    return { DB: new SqliteD1(db) } as unknown as Env
  }
  const get = async (env: Env, p: string) => {
    const url = new URL(`https://x.test${p}`)
    const res = (await handleAdhkar(new Request(url), env, url))!
    return (await res.json()) as { items: { id: string; title: string; highlights: string[]; translation?: { title: string } }[] }
  }
  // Texts built around the file's segments, the narrator's words between them as in the hadiths.
  const s3008 = E.get('3008')!.segments
  const s66086 = E.get('66086')!.segments
  const s65092 = E.get('65092')!.segments
  const ROWS: Row[] = [
    { id: '3008', lang: 'ar', title: 'عنوان المساء', text: `كان إذا أمسى قال: «${s3008[0]}» قال الراوي: أراه قال فيهن: «${s3008[1]}»، وإذا أصبح قال ذلك أيضا «${s3008[2]}».` },
    { id: '3008', lang: 'en', title: 'The evening title', text: 'English text' },
    { id: '66086', lang: 'ar', title: 'حين تمسي', text: `«من قال حين يمسي ثلاث مرات: ${s66086[0]}، لم يضره»` },
    { id: '65092', lang: 'ar', title: 'دخول المسجد', text: `«إذا دخل أحدكم المسجد فليقل: ${s65092[0]}، وإذا خرج فليقل: ${s65092[1]}»` },
  ]
  it('the data file has the entries these texts are built on, none reviewed yet', () => {
    for (const id of ['3008', '66086', '65092']) expect(E.get(id)?.reviewed, id).toBe(false)
    expect(s3008).toHaveLength(3)
  })
  it('3008 (three «…» pairs, unreviewed): no highlight; one pair: every segment', async () => {
    const { items } = await get(envWith(ROWS), '/api/adhkar/301?lang=ar')
    const by = Object.fromEntries(items.map((x) => [x.id, x]))
    expect(by['3008'].highlights).toEqual([])
    expect(by['66086'].highlights).toEqual(s66086)
    expect(by['65092'].highlights).toEqual(s65092)
  })
  it('all or nothing: a text missing one of the segments gives no highlight', async () => {
    const rows = ROWS.map((r) => (r.id === '65092' ? { ...r, text: `«إذا دخل أحدكم المسجد فليقل: ${s65092[0]}»` } : r))
    const { items } = await get(envWith(rows), '/api/adhkar/301')
    expect(items.find((x) => x.id === '65092')!.highlights).toEqual([])
  })
  it('the card title: HadeethEnc’s Arabic title, and the language row’s title outside Arabic', async () => {
    const ar = await get(envWith(ROWS), '/api/adhkar/301?lang=ar')
    expect(ar.items.find((x) => x.id === '66086')!.title).toBe('حين تمسي')
    const en = await get(envWith(ROWS), '/api/adhkar/301?lang=en')
    const h = en.items.find((x) => x.id === '3008')!
    expect(h.title).toBe('عنوان المساء')
    expect(h.translation!.title).toBe('The evening title')
    // No row in that language: the Arabic title alone (the app shows it with lang="ar").
    expect(en.items.find((x) => x.id === '66086')!.translation).toBeUndefined()
  })
  it(`at most ${MAX} hadiths per category`, async () => {
    const rows = Array.from({ length: MAX + 5 }, (_, i) => ({ id: String(90000 + i), lang: 'ar', title: 't', text: 'نص' }))
    expect((await get(envWith(rows), '/api/adhkar/301')).items).toHaveLength(MAX)
  })
})
