// «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4, 0071-add2 §2 and 0071-add5 §2): the
// route, its switch, the rotation, and the data (data/names-daily.json, scripts/names/daily-build.mjs): the 96 main
// entries in the reviewed file's order, ids only beside the file's readings, the six with their Quranic evidence
// alone, the readings' citations by number each a link to a text of our data (add5 §2), and the book whose order
// inspired the list named nowhere. The checks against data/processed skip without it.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EDITS } from '../../scripts/names/add5-edits.mjs'
import { DISPUTE_LINE, EDITS as EDITS7, EVIDENCE, SENSE_WORDS } from '../../scripts/names/add7-edits.mjs'
import KEPT from '../../scripts/names/add7-names.json'
import { findForbidden } from '../../scripts/names/forbidden.mjs'
import data from '../../data/names-daily.json'
import { quoteMatch } from '../src/hadith-grade'
import type { Env } from '../src/index'
import { normalizeArabic, tokenize } from '../src/lib/normalize'
import { handleNamesDay, nameDayIndex, NAME_APPENDIX, NAME_ENTRIES, NAMES_EPOCH, validDay } from '../src/names-day'
import { parseRoute } from '../../web/src/quran/route'

const ROOT = path.resolve(import.meta.dirname, '../..')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
// The old draft, outside git (relay), for the check's own control; NAMES_DRAFT points to it from a worktree.
const DRAFT = process.env.NAMES_DRAFT ?? path.join(ROOT, 'relay/w1/0071-names/names-draft.txt')

// No DB binding: the route reads nothing from D1.
const envWith = (vars: Record<string, string> = {}) => ({ ...vars }) as unknown as Env
async function get(env: Env, p: string) {
  const res = await handleNamesDay(new Request(`https://x${p}`), env, new URL(`https://x${p}`))
  if (!res) return { status: 0, body: null as never, cache: null }
  return { status: res.status, body: (await res.json()) as Record<string, unknown> & { entry: (typeof NAME_ENTRIES)[number]; readings?: unknown; index: number }, cache: res.headers.get('cache-control') }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/names/day', () => {
  it('answers only its own path, and only GET', async () => {
    expect(await handleNamesDay(new Request('https://x/api/names'), envWith(), new URL('https://x/api/names'))).toBeNull()
    expect(await handleNamesDay(new Request('https://x/api/names/day', { method: 'POST' }), envWith(), new URL('https://x/api/names/day'))).toBeNull()
  })

  it('the day asked: its entry, ids only, cached ten minutes', async () => {
    const r = await get(envWith(), '/api/names/day?day=2026-10-22')
    expect(r.status).toBe(200)
    expect(r.cache).toBe('public, max-age=600')
    expect(r.body.day).toBe('2026-10-22')
    expect(r.body.index).toBe(0)
    expect(r.body.count).toBe(96)
    expect(r.body.entry).toEqual({ n: 1, name: 'الصمد', ayah: 'quran:112:2', hadith: null, meaningAyah: null, duas: [{ kind: 'ayah', id: 'quran:28:24' }], quranOnly: false, tafsirOf: 'quran:112:2' })
  })

  it('switch off (absent, or anything but "on"): no readings', async () => {
    for (const vars of [{}, { NAMES_READINGS: 'off' }, { NAMES_READINGS: 'ON' }, { NAMES_READINGS: 'true' }, { NAMES_READINGS: '' }]) {
      const r = await get(envWith(vars), '/api/names/day?day=2026-10-22')
      expect(r.status).toBe(200)
      expect(r.body).not.toHaveProperty('readings')
      expect(JSON.stringify(r.body)).not.toContain(NAME_ENTRIES[0].readings.easy)
    }
  })

  it('switch on: the readings of the day, as stored (Arabic), to every interface language (add-on 0071-add5 §2)', async () => {
    const on = envWith({ NAMES_READINGS: 'on' })
    const langs = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi', 'xx']
    for (const p of ['/api/names/day?day=2026-10-22', ...langs.map((l) => `/api/names/day?day=2026-10-22&lang=${l}`)]) {
      const r = await get(on, p)
      expect(r.body.readings, p).toEqual(NAME_ENTRIES[0].readings)
    }
    // The same answer whatever the language: nothing in it is translated.
    expect((await get(on, '/api/names/day?day=2026-10-23&lang=en')).body).toEqual((await get(on, '/api/names/day?day=2026-10-23&lang=ar')).body)
  })

  it('switch off: no readings in any language', async () => {
    for (const lang of ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']) {
      const r = await get(envWith({ NAMES_READINGS: 'off' }), `/api/names/day?day=2026-10-24&lang=${lang}`)
      expect(r.body, lang).not.toHaveProperty('readings')
      expect(JSON.stringify(r.body)).not.toContain(NAME_ENTRIES[2].readings.easy)
    }
  })

  it('a day that is not a date is refused, never cached', async () => {
    for (const d of ['22-10-2026', '2026-10-2', '2026-02-30', 'today', '']) {
      const r = await get(envWith(), `/api/names/day?day=${d}`)
      expect(r.status, d).toBe(400)
      expect(r.cache).toBe('no-store')
    }
  })

  it('no day: the server’s Riyadh date, which turns at 21:00 UTC', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T20:59:00Z'))
    expect((await get(envWith(), '/api/names/day')).body).toMatchObject({ day: '2026-10-22', index: 0 })
    vi.setSystemTime(new Date('2026-10-22T21:00:00Z'))
    expect((await get(envWith(), '/api/names/day')).body).toMatchObject({ day: '2026-10-23', index: 1 })
  })
})

describe('the name’s page and «كل الأسماء» (add-on 0072-add1)', () => {
  type Ref = { n: number; name: string }
  const getJson = async (env: Env, p: string) => {
    const res = (await handleNamesDay(new Request(`https://x${p}`), env, new URL(`https://x${p}`)))!
    return { status: res.status, cache: res.headers.get('cache-control'), body: (await res.json()) as Record<string, unknown> }
  }

  it('GET /api/names/entry/<n>: the entry, its neighbours round the order, the readings only while the switch is on', async () => {
    const off = await getJson(envWith(), '/api/names/entry/2')
    expect(off.status).toBe(200)
    expect(off.cache).toBe('public, max-age=600')
    expect(off.body).toMatchObject({ index: 1, count: 96, prev: { n: 1, name: 'الصمد' }, next: { n: 3, name: NAME_ENTRIES[2].name } })
    expect((off.body.entry as Ref).n).toBe(2)
    expect(off.body).not.toHaveProperty('readings')
    const { readings, ...entry } = NAME_ENTRIES[1]
    expect(off.body.entry).toEqual(entry)
    const on = await getJson(envWith({ NAMES_READINGS: 'on' }), '/api/names/entry/2')
    expect(on.body.readings).toEqual(readings)
    // Round: the first's previous is the last, the last's next the first.
    expect((await getJson(envWith(), '/api/names/entry/1')).body.prev).toEqual({ n: 96, name: NAME_ENTRIES[95].name })
    expect((await getJson(envWith(), '/api/names/entry/96')).body.next).toEqual({ n: 1, name: 'الصمد' })
  })

  it('an entry that is not one: 404, never cached; not a number: not this route', async () => {
    for (const n of ['0', '97', '100', '999']) {
      const r = await getJson(envWith(), `/api/names/entry/${n}`)
      expect(r.status, n).toBe(404)
      expect(r.cache).toBe('no-store')
    }
    for (const p of ['/api/names/entry/x', '/api/names/entry/', '/api/names/entry/1/2', '/api/names/other']) expect(await handleNamesDay(new Request(`https://x${p}`), envWith(), new URL(`https://x${p}`)), p).toBeNull()
  })

  it('GET /api/names/list: the 96 in order and the six of the appendix; their notes only while the switch is on', async () => {
    const off = await getJson(envWith(), '/api/names/list')
    expect(off.cache).toBe('public, max-age=600')
    expect(off.body.count).toBe(96)
    expect(off.body.entries).toEqual(NAME_ENTRIES.map((e) => ({ n: e.n, name: e.name })))
    expect(off.body.appendix).toEqual([97, 98, 99, 100, 101, 102].map((n, i) => ({ n, name: NAME_APPENDIX[i].name })))
    expect(JSON.stringify(off.body)).not.toContain(NAME_APPENDIX[0].note)
    const on = await getJson(envWith({ NAMES_READINGS: 'on' }), '/api/names/list')
    expect(on.body.appendix).toEqual(NAME_APPENDIX)
    // Names only: no readings, no ids of texts.
    expect(JSON.stringify(on.body).replace(/\{\{[^{}]*\}\}/g, '')).not.toMatch(/quran:\d|"readings"|"hadith"/)
  })

  it('the appendix: the reviewed file’s six, «تنبيه الملحق» by the same rules as the readings', () => {
    expect(data.appendix.map((a) => a.name)).toEqual(['الهادي', 'المسعر', 'مالك الملك', 'ذو الجلال والإكرام', 'الحفي', 'المحسن'])
    const LINK = /\{\{([^{}|]+)\|([^{}|]+)\}\}/g
    for (const a of data.appendix) {
      expect(Object.keys(a).sort()).toEqual(['n', 'name', 'note'])
      expect(a.note.length, a.name).toBeGreaterThan(40)
      // No number outside a link; no name whose reference does not open (dorar.net); no hadith cited by number.
      expect(a.note.replace(LINK, ''), a.name).not.toMatch(/\d/)
      expect(a.note, a.name).not.toMatch(/ابن تيمية|ابن القيم|ابن باز|مسلم 1955/)
      for (const m of a.note.matchAll(LINK)) expect(m[2]).toMatch(/^quran:\d{1,3}:\d{1,3}$/)
    }
    expect(data.appendix[0].note).toContain('«وإن الله لهاد الذين آمنوا إلى صراط مستقيم» ({{الحج: 54|quran:22:54}})')
    expect(data.appendix[4].note).toContain('«وإن كان عندنا تردد في إدخال (الحفي)، لأنه إنما ورد مقيدًا»')
    expect(data.appendix[5].note).toBe('دليله يحتاج تحققًا؛ أُثبت بنقل الموسوعة العقدية، وتذكر الموسوعة أن في أسانيد لفظه مقالًا.')
    // Ibn ʿUthaymin, with «القواعد المثلى», in the five others' notes, as add7-names.json keeps him.
    expect((KEPT as { n: number; at: string; name: string }[]).filter((k) => k.at === 'note').map((k) => [k.n, k.name])).toEqual([97, 98, 99, 100, 101].map((n) => [n, 'ابن عثيمين']))
  })

  it('the app’s routes: /today/name and /today/name/<n> the name’s page, /today/names the one names page', () => {
    for (const p of ['/today/name', '/today/name/', '/today/name/1', '/today/name/96']) expect(parseRoute(p), p).toEqual({ view: 'today', tool: 'name' })
    expect(parseRoute('/today/names')).toEqual({ view: 'tools', tool: 'names' })
    expect(parseRoute('/today/name/x')).toEqual({ view: 'chat' })
  })
})

describe('the rotation', () => {
  it('entry 1 on the epoch, one a day, again after the 96th; before the epoch it counts back', () => {
    expect(NAMES_EPOCH).toBe('2026-10-22')
    expect(nameDayIndex('2026-10-22')).toBe(0)
    expect(nameDayIndex('2026-10-23')).toBe(1)
    expect(nameDayIndex('2027-01-25')).toBe(95)
    expect(nameDayIndex('2027-01-26')).toBe(0)
    expect(nameDayIndex('2026-10-21')).toBe(95)
    expect(nameDayIndex('2025-01-01')).toBeGreaterThanOrEqual(0)
  })
  it('96 days in a row show the 96 entries once each', () => {
    const start = Date.parse('2026-12-01T00:00:00Z')
    const seen = new Set(Array.from({ length: 96 }, (_, k) => nameDayIndex(new Date(start + k * 86_400_000).toISOString().slice(0, 10))))
    expect(seen.size).toBe(96)
  })
  it('validDay', () => {
    expect(validDay('2026-10-22')).toBe(true)
    expect(validDay('2028-02-29')).toBe(true)
    expect(validDay('2027-02-29')).toBe(false)
    expect(validDay(null)).toBe(false)
  })
})

describe('data/names-daily.json', () => {
  const entries = data.entries
  const APPENDIX = ['الهادي', 'المسعر', 'مالك الملك', 'ذو الجلال والإكرام', 'الحفي', 'المحسن']
  // Six until add-on 0071-add7 §2, which gives السيد and الوتر their HadeethEnc evidence (3389, 10416).
  const FOUR = ['الجواد', 'الحكم', 'المعطي', 'المنان']

  it('the 96 main entries, numbered 1–96 in the reviewed order; the appendix is not in the rotation', () => {
    expect(data.count).toBe(96)
    expect(entries.map((e) => e.n)).toEqual(Array.from({ length: 96 }, (_, k) => k + 1))
    expect(new Set(entries.map((e) => e.name)).size).toBe(96)
    for (const a of APPENDIX) expect(entries.map((e) => e.name)).not.toContain(a)
    // The two pairs that are one entry each (add-on 0071-add1), and al-Jawad in the main part.
    expect(entries.map((e) => e.name)).toEqual(expect.arrayContaining(['القابض الباسط', 'المقدم المؤخر', 'الجواد']))
  })

  it('ids only: no text of the Quran, a hadith or a tafsir beside the name and the readings', () => {
    for (const e of entries) {
      expect(Object.keys(e).sort(), e.name).toEqual(['ayah', 'duas', 'hadith', 'meaningAyah', 'n', 'name', 'quranOnly', 'readings', 'tafsirOf'])
      for (const id of [e.ayah, e.meaningAyah, e.tafsirOf]) if (id) expect(id).toMatch(/^quran:\d{1,3}:\d{1,3}$/)
      if (e.hadith) expect(e.hadith).toMatch(/^\d{1,7}$/)
      for (const d of e.duas) expect(d.kind === 'ayah' ? /^quran:\d{1,3}:\d{1,3}$/.test(d.id) : d.kind === 'hadith' && /^\d{1,7}$/.test(d.id), `${e.name} ${d.id}`).toBe(true)
      for (const d of e.duas) expect(Object.keys(d).every((k) => ['kind', 'id', 'praise'].includes(k)), e.name).toBe(true)
      expect(Object.keys(e.readings).sort()).toEqual(['deep', 'easy', 'meaning'])
      expect(e.readings.meaning.length && e.readings.easy.length && e.readings.deep.length, e.name).toBeTruthy()
      // The file's reference marks and codes stay out.
      for (const t of [e.readings.meaning, e.readings.easy, ...e.readings.deep]) expect(t, e.name).not.toMatch(/\[\d|\b[DHR]\d{2,3}\b|^(دعاء|ذكر|ثناء) /)
    }
  })

  it('the tafsir goes with an ayah the entry itself cites', () => {
    for (const e of entries) {
      const own = [e.ayah, e.meaningAyah, ...e.duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]
      if (e.tafsirOf) expect(own, e.name).toContain(e.tafsirOf)
      if (e.ayah) expect(e.tafsirOf).toBe(e.ayah)
    }
  })

  it('the four with no HadeethEnc hadith as evidence (add-ons 0071-add2 §2, 0071-add7 §2): their Quranic evidence alone', () => {
    const four = entries.filter((e) => e.quranOnly)
    expect(four.map((e) => e.name)).toEqual(FOUR)
    for (const e of four) {
      expect(e.hadith, e.name).toBeNull()
      expect(e.duas.every((d) => d.kind === 'ayah'), e.name).toBe(true)
      expect(e.tafsirOf, e.name).not.toBeNull()
    }
    // al-Jawad's ayah is the one the file gives for the meaning; the others' is their Quranic dua.
    expect(four.map((e) => e.tafsirOf)).toEqual(['quran:3:8', 'quran:7:89', 'quran:28:24', 'quran:3:8'])
    expect(entries.find((e) => e.name === 'الجواد')!.meaningAyah).toBe('quran:3:8')
  })

  it('السيد and الوتر with their HadeethEnc evidence (add-on 0071-add7 §2): 3389 and 10416, shown from D1', () => {
    expect(EVIDENCE.map((x) => [x.name, x.hadith])).toEqual([
      ['السيد', '3389'],
      ['الوتر', '10416'],
    ])
    for (const x of EVIDENCE) {
      const e = entries.find((y) => y.n === x.n)!
      expect(e, x.name).toMatchObject({ name: x.name, hadith: x.hadith, quranOnly: false, ayah: null, meaningAyah: null })
      // The same rule as every entry whose evidence is a hadith and has no ayah: no tafsir.
      expect(e.tafsirOf, x.name).toBeNull()
    }
    // Their readings keep their hadith, its words as stored.
    const sayyid = entries.find((e) => e.name === 'السيد')!
    expect(sayyid.readings.deep[0]).toContain('ورد قول النبي صلى الله عليه وسلم «السَّيدُ اللهُ» في حديث وفد بني عامر')
    expect(JSON.stringify(sayyid.readings)).not.toContain('تبارك وتعالى')
    expect(entries.find((e) => e.name === 'الوتر')!.readings.deep[0]).toContain('ثبت في الصحيحين وصف الله بأنه وتر يحب الوتر.')
  })

  it.skipIf(!fs.existsSync(HADITH))('the evidence of السيد and الوتر, and the words quoted from it, are its stored text (hadith.jsonl)', () => {
    const want = new Set(EVIDENCE.map((x) => x.hadith))
    const rows = new Map<string, { hadeeth: string; tier: string; attribution: string }>()
    for (const l of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!l.startsWith('{"lang":"ar"')) continue
      const r = JSON.parse(l)
      if (want.has(r.id)) rows.set(r.id, r)
    }
    expect(rows.get('3389')).toMatchObject({ tier: '2', attribution: 'رواه أبو داود وأحمد' })
    expect(rows.get('10416')).toMatchObject({ tier: '1', attribution: 'متفق عليه' })
    for (const x of EVIDENCE) expect(rows.get(x.hadith)!.hadeeth, x.name).toContain(x.words)
    for (const e of EDITS7.filter((e) => e.rule === 'quote')) expect(rows.get(e.hadith!)!.hadeeth).toContain(e.after.match(/«([^»]+)»/)![1])
  })

  it('الجواد: of the dispute one neutral line, Talal’s words exactly (add-on 0071-add7 §1)', () => {
    expect(DISPUTE_LINE).toBe('أثبته ابن عثيمين في القواعد المثلى، وفي عدّه اسمًا خلاف بين أهل العلم')
    const r = entries.find((e) => e.name === 'الجواد')!.readings
    const all = [r.meaning, r.easy, ...r.deep].join(' ')
    expect(all.split(DISPUTE_LINE)).toHaveLength(2)
    expect(all.split('خلاف')).toHaveLength(2)
    expect(all).not.toMatch(/القولين|لا تثبت|أهل الحديث|مختلف في صحته/)
  })

  it('the praises and the meaning ayah the reviewed file lists (since f28e841): al-Fatiha 2, called a praise', () => {
    const PRAISE = ['الحميد', 'الخالق', 'الخلاق', 'العلي', 'الكبير', 'المتعال', 'المجيد', 'المصور']
    for (const e of entries) {
      const p = e.duas.filter((d) => 'praise' in d && d.praise)
      if (PRAISE.includes(e.name)) expect(p, e.name).toEqual([{ kind: 'ayah', id: 'quran:1:2', praise: true }])
      else expect(p, e.name).toEqual([])
    }
    const rabb = entries.find((e) => e.name === 'الرب')!
    expect(rabb).toMatchObject({ hadith: '10922', meaningAyah: 'quran:1:2', tafsirOf: 'quran:1:2' })
  })

  it('every entry shows a quoted text: an ayah or a hadith', () => {
    for (const e of entries) expect(!!(e.ayah || e.hadith || e.meaningAyah || e.duas.length), e.name).toBe(true)
  })

  it.skipIf(!fs.existsSync(QURAN))('every ayah id is in quran.jsonl', () => {
    const ids = new Set(
      fs
        .readFileSync(QURAN, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l).id as string),
    )
    for (const e of entries) for (const id of [e.ayah, e.meaningAyah, ...e.duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]) if (id) expect(ids.has(id), `${e.name} ${id}`).toBe(true)
  })

  it.skipIf(!fs.existsSync(HADITH))('every hadith id is an accepted Arabic row of HadeethEnc (tier 1–3), as /api/adhkar/hadith serves', () => {
    const want = new Set(entries.flatMap((e) => [e.hadith, ...e.duas.filter((d) => d.kind === 'hadith').map((d) => d.id)]).filter(Boolean) as string[])
    const tier = new Map<string, string>()
    for (const l of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!l.startsWith('{"lang":"ar"')) continue
      const r = JSON.parse(l)
      if (want.has(r.id)) tier.set(r.id, r.tier)
    }
    for (const id of want) expect(['1', '2', '3'], id).toContain(tier.get(id))
  })
})

describe('what the readings cite (add-on 0071-add5 §2)', () => {
  const entries = data.entries
  const LINK = /\{\{([^{}|]+)\|([^{}|]+)\}\}/g
  const texts = (e: (typeof entries)[number]) => [e.readings.meaning, e.readings.easy, ...e.readings.deep]
  const links = entries.flatMap((e) => texts(e).flatMap((t) => [...t.matchAll(LINK)].map((m) => ({ n: e.n, name: e.name, t, at: m.index, words: m[1], id: m[2] }))))
  const bare = (t: string) => t.replace(LINK, '$1')

  it('no number outside a link; every link is an ayah or a hadith id, its words the reading’s own citation', () => {
    for (const e of entries) for (const t of texts(e)) expect(t.replace(LINK, ''), e.name).not.toMatch(/\d/)
    for (const l of links) {
      expect(l.id, l.name).toMatch(/^(quran:\d{1,3}:\d{1,3}|hadith:\d{1,7})$/)
      expect(l.words, l.name).toMatch(/\d/)
      expect(l.words, l.name).toMatch(/^\S.*\S$/)
    }
    // The citations as the reviewed file writes them, now links (counted when the data was built).
    expect(links.filter((l) => l.id.startsWith('quran:'))).toHaveLength(17)
    expect(links.filter((l) => l.id.startsWith('hadith:')).map((l) => `${l.name} ${l.words} ${l.id}`)).toEqual([
      'الأول صحيح مسلم 2713 hadith:6335',
      'الظاهر صحيح مسلم 2713 hadith:6335',
      'الباطن مسلم 2713 hadith:6335',
    ])
    expect(entries[1].readings.meaning).toContain('إثبات الاسم من {{هود 57|quran:11:57}}.')
    expect(entries.find((e) => e.name === 'الغفور')!.readings.deep[0]).toContain('«إن الله لا يغفر أن يشرك به ويغفر ما دون ذلك لمن يشاء» ({{النساء: 48|quran:4:48}})')
    // A range links its first ayah.
    expect(entries.find((e) => e.name === 'الآخر')!.readings.deep[0]).toContain('({{الرحمن: 26–27|quran:55:26}})')
  })

  it('what did not match is gone: Muslim 2713 paraphrased for al-Akhir, Muslim 2590 and al-Bukhari 2441 for al-Sitteer', () => {
    expect(entries.find((e) => e.name === 'الآخر')!.readings.meaning).toBe('فسر النبي صلى الله عليه وسلم الآخر بأنه ليس بعده شيء. ويذكر المفسرون هذا البيان عند آية الحديد.')
    const sitteer = entries.find((e) => e.name === 'الستير')!.readings.meaning
    expect(sitteer).not.toMatch(/2590|2441|لا يستر الله على عبد|سترتها عليك/)
    // (and, by add-on 0071-add7 §3, without Ibn Baz: the page of his grading does not open from here)
    expect(sitteer).toBe('الستير هو الذي يستر على عباده كثيرًا من ذنوبهم وعيوبهم فلا يفضحهم، ويحب الستر. وليس الستير في قائمة ابن عثيمين، وأثبت هنا لتصحيح حديثه.')
  })

  it('the four with no HadeethEnc hadith mention none in their readings', () => {
    const six = entries.filter((e) => e.quranOnly)
    expect(six).toHaveLength(4)
    const MENTION = /(?:^| )(?:و|ف|ب|ل|ك)?(?:ال)?(?:حديث\S*|احاديث|روايه|روايات|اسانيد\S*|اسناد\S*|صحيحين|بخاري|رواه|صحيح الجامع|السلسله الصحيحه)(?= |$)|(?:^| )مسلم(?= |$)|النبي صلي الله عليه وسلم|(?:^| )الرسول(?= |$)/
    for (const e of six)
      for (const t of texts(e)) {
        const n = normalizeArabic(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').replace(/اهل الحديث/g, ' ')
        expect(n.match(MENTION)?.[0] ?? null, `${e.name}: ${t}`).toBeNull()
      }
    // And the declaration of the dispute about al-Jawad stays (CLAUDE.md §3 rule 11), in the one line of add7 §1.
    const jawad = entries.find((e) => e.name === 'الجواد')!
    expect(texts(jawad).join(' ')).toContain('وفي عدّه اسمًا خلاف بين أهل العلم')
  })

  it('the edits are removals: no word of their own, only a connective dropped or turned to «و» (فالخلاف → والخلاف)', () => {
    const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{M}\p{N}]/gu, '')).filter(Boolean)
    for (const e of EDITS) {
      const was = new Set(words(e.before))
      for (const w of words(e.after)) {
        const bare = w.replace(/^و/, '')
        expect(was.has(w) || was.has(`و${w}`) || was.has(`ف${w}`) || (w.startsWith('و') && (was.has(bare) || was.has(`ف${bare}`))), `${e.n} ${e.at}: «${w}»`).toBe(true)
      }
      expect(e.after.length, `${e.n}`).toBeLessThan(e.before.length)
      expect(['number', 'six']).toContain(e.rule)
    }
    expect(EDITS.filter((e) => e.rule === 'number')).toHaveLength(3)
    expect(EDITS.filter((e) => e.rule === 'six')).toHaveLength(22)
    // Those of السيد and الوتر withdrawn by add-on 0071-add7 §2, and only those.
    expect(EDITS.filter((e) => 'withdrawn' in e && e.withdrawn).map((e) => e.n)).toEqual([89, 89, 89, 95, 95, 95])
  })

  it('the edits of add-on 0071-add7: removals too, but Talal’s line, a hadith’s stored words, a passive or plain verb', () => {
    const plain = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '')
    const words = (t: string) => plain(t).split(/\s+/).map((w) => w.replace(/[^\p{L}\p{M}\p{N}]/gu, '')).filter(Boolean)
    const allowed = new Set(words(DISPUTE_LINE))
    for (const e of EDITS7) {
      expect(['jawad', 'quote', 'name', 'detach', 'attrib', 'sense', 'number']).toContain(e.rule)
      expect(e.why, `${e.n}`).toBeTruthy()
      if (e.rule === 'quote') continue // its words are the hadith's own, checked against hadith.jsonl above
      if (e.rule === 'sense') continue // checked in its own test below
      const was = new Set(words(e.before))
      for (const w of words(e.after)) {
        const bare = w.replace(/^و/, '')
        // A passive made by dropping the verb's attached pronoun («أثبته» → «أُثبت») counts as its own word.
        const ok = was.has(w) || was.has(`${w}ه`) || was.has(`و${w}`) || was.has(`ف${w}`) || (w.startsWith('و') && (was.has(bare) || was.has(`ف${bare}`))) || (e.rule === 'jawad' && allowed.has(w))
        expect(ok, `${e.n} ${e.at}: «${w}»`).toBe(true)
      }
      if (e.rule === 'name') expect(e.names!.length, `${e.n}`).toBeGreaterThan(0)
    }
  })

  it.skipIf(!fs.existsSync(QURAN))('every ayah link is in quran.jsonl, and the words quoted right before it are in it', () => {
    const rows = new Map(
      fs
        .readFileSync(QURAN, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as { id: string; text: string; sura_name: string; sura: number })
        .map((r) => [r.id, r]),
    )
    for (const l of links.filter((x) => x.id.startsWith('quran:'))) {
      const [, s, a] = l.id.split(':').map(Number)
      const row = rows.get(l.id)!
      expect(row, `${l.name} ${l.id}`).toBeTruthy()
      // The link's words name that sura and ayah (or a range from it).
      const m = l.words.match(/^(.+?)(?::\s*|\s+)(\d+)(?:\s*[–-]\s*(\d+))?$/)!
      expect(normalizeArabic(m[1]), l.words).toBe(normalizeArabic(row.sura_name))
      expect(Number(m[2]), l.words).toBe(a)
      const to = m[3] ? Number(m[3]) : a
      const words = Array.from({ length: to - a + 1 }, (_, k) => rows.get(`quran:${s}:${a + k}`)!.text).flatMap((x) => tokenize(x))
      const quoted = bare(l.t.slice(0, l.at)).match(/«([^»]+)»\s*\(?\s*$/)?.[1]
      if (quoted) expect(quoteMatch(tokenize(quoted), words), `${l.name}: «${quoted}» in ${l.words}`).not.toBeNull()
    }
  })

  it.skipIf(!fs.existsSync(HADITH))('every hadith link: its sentence quotes that HadeethEnc row by the rule of CLAUDE.md §9, and its takhrij names the book', () => {
    const want = new Set(links.filter((l) => l.id.startsWith('hadith:')).map((l) => l.id.slice(7)))
    const rows = new Map<string, { hadeeth: string; attribution: string; tier: string }>()
    for (const l of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!l.startsWith('{"lang":"ar"')) continue
      const r = JSON.parse(l)
      if (want.has(r.id)) rows.set(r.id, r)
    }
    for (const l of links.filter((x) => x.id.startsWith('hadith:'))) {
      const r = rows.get(l.id.slice(7))!
      expect(['1', '2', '3'], l.id).toContain(r.tier)
      const book = l.words.match(/البخاري|مسلم/)![0]
      expect(r.attribution, l.id).toMatch(new RegExp(`${book}|متفق عليه`))
      // The sentence's quote: after «بقوله» up to the comma, as the reading writes it.
      const sentence = bare(l.t).split(/[.؟!]/).find((x) => x.includes(l.words))!
      const quote = sentence.match(/بقوله\s*([^،؛.]+)/)![1]
      expect(tokenize(quote).length, quote).toBeGreaterThanOrEqual(2)
      expect(quoteMatch(tokenize(quote), tokenize(r.hadeeth)), `${l.name}: «${quote}»`).not.toBeNull()
    }
  })
})

describe('the scholars named in the readings (add-on 0071-add7 §3, CLAUDE.md §3 rule 14)', () => {
  const entries = data.entries
  const SCHOLARS = ['ابن كثير', 'السعدي', 'الطبري', 'ابن جرير', 'ابن هبيرة', 'الخطابي', 'الأزهري', 'ابن منده', 'البيهقي', 'ابن القيم', 'ابن باز', 'ابن عثيمين', 'الألباني', 'ابن عباس', 'قتادة', 'مجاهد', 'عكرمة', 'ابن تيمية', 'القرطبي', 'البغوي']
  const RE = new RegExp(`(?<![\\p{L}\\p{M}])(?:و|ف|ل|ب|ك)?(${SCHOLARS.join('|')})(?![\\p{L}\\p{M}])`, 'gu')
  type Kept = { n: number; at: string; name: string; ref: string; url: string; ayah?: string; tafsir?: string; evidence: string; checked: string }
  const kept = KEPT as Kept[]

  it('each name left is one add7-names.json keeps, with a reference that opened and holds the claim', () => {
    const seen = new Map<string, number>()
    for (const e of entries) for (const t of [e.readings.meaning, e.readings.easy, ...e.readings.deep]) for (const m of t.matchAll(RE)) seen.set(`${e.n} ${m[1]}`, (seen.get(`${e.n} ${m[1]}`) ?? 0) + 1)
    const want = new Map<string, number>()
    // The readings' names here; the appendix notes' (at 'note') in the appendix test.
    for (const k of kept.filter((k) => k.at !== 'note')) want.set(`${k.n} ${k.name}`, (want.get(`${k.n} ${k.name}`) ?? 0) + 1)
    expect(Object.fromEntries(seen)).toEqual(Object.fromEntries(want))
    // Those whose reference did not open (dorar.net, 403 from here) or did not hold the claim are gone.
    for (const name of ['ابن هبيرة', 'الخطابي', 'الأزهري', 'ابن منده', 'البيهقي', 'ابن القيم', 'ابن باز', 'الألباني']) expect([...seen.keys()].some((k) => k.endsWith(` ${name}`)), name).toBe(false)
    for (const k of kept) {
      expect(k.evidence.length, `${k.n} ${k.name}`).toBeGreaterThan(10)
      expect(k.url, `${k.n} ${k.name}`).not.toMatch(/dorar\.net/)
      if (k.checked === 'data') expect([k.tafsir, k.url.includes(`/tafseer/${k.tafsir}/`)], `${k.n} ${k.name}`).toEqual([k.name === 'السعدي' ? 'saadi' : 'katheer', true])
      // A page that is not our data: al-Tabari on the KSU site, and Ibn ʿUthaymin's «القواعد المثلى» (source ج).
      else expect(k.url, `${k.n} ${k.name}`).toMatch(/^https:\/\/(quran\.ksu\.edu\.sa\/tafseer\/tabary\/|www\.alathar\.net\/)/)
    }
    expect(kept.filter((k) => k.name === 'ابن عثيمين').every((k) => k.ref === 'R001')).toBe(true)
  })

  it.skipIf(!fs.existsSync(QURAN) || !fs.existsSync(path.join(ROOT, 'data/processed/tafsir-katheer.sql')))(
    'Ibn Kathir and al-Saʿdi: each kept name’s evidence is word for word in his tafsir of that ayah in our data',
    () => {
      const strip = (x: string) => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const rows = fs
        .readFileSync(QURAN, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as { id: string; sura: number; aya: number; saadi?: string; saadi_range?: string })
      const saadi = (s: number, a: number) => {
        const r = rows.find((x) => x.id === `quran:${s}:${a}`)
        if (r?.saadi) return strip(r.saadi)
        const c = rows.find((x) => {
          const m = x.saadi_range?.match(/^(\d+):(\d+)-(\d+):(\d+)$/)
          return !!m && Number(m[1]) === s && a >= Number(m[2]) && a <= Number(m[4]) && !!x.saadi
        })
        return c ? strip(c.saadi!) : ''
      }
      const sql = fs.readFileSync(path.join(ROOT, 'data/processed/tafsir-katheer.sql'), 'utf8')
      const katheer = new Map<string, string>()
      for (const m of sql.matchAll(/\('katheer', (\d+), (\d+), '((?:[^']|'')*)'\)/g)) katheer.set(`${m[1]}:${m[2]}`, strip(m[3].replace(/''/g, "'")))
      const fromData = kept.filter((k) => k.checked === 'data')
      expect(fromData.length).toBeGreaterThan(190)
      for (const k of fromData) {
        const [, s, a] = k.ayah!.split(':').map(Number)
        const text = k.tafsir === 'saadi' ? saadi(s, a) : (katheer.get(`${s}:${a}`) ?? '')
        expect(text.includes(k.evidence), `${k.n} ${k.at} ${k.name} ${k.ayah}`).toBe(true)
        // The ayah is one the entry itself cites for that tafsir (its R line in the reviewed file).
        expect(k.url, `${k.n} ${k.name}`).toBe(`https://quran.ksu.edu.sa/tafseer/${k.tafsir}/sura${s}-aya${a}.html`)
      }
    },
  )
})

describe('a kept name whose claim is his by meaning (add-on 0071-add10 §2)', () => {
  const plain = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآؤئ]/g, 'ء')
  const words = (t: string) => plain(t).split(/\s+/).map((w) => w.replace(/[^\p{L}\p{M}\p{N}]/gu, '')).filter(Boolean)
  const sense = EDITS7.filter((e) => e.rule === 'sense')

  it('the attributing verb becomes «ومعنى ما ذكره …» or «ويفهم من كلام …», and no other word is added', () => {
    expect(sense).toHaveLength(18)
    const formula = new Set(words(SENSE_WORDS.join(' ')))
    for (const e of sense) {
      expect(e.after, `${e.n}`).toMatch(/معنى ما ذكره|يفهم من كلام/)
      expect(e.after, `${e.n}`).not.toMatch(/يقول|قال/)
      const was = new Set(words(e.before))
      // A word of the reading's own (its «ب» or «و» may go), or a word of the two formulas.
      for (const w of words(e.after)) expect(was.has(w) || formula.has(w) || was.has(`ب${w}`) || was.has(`و${w}`) || was.has(w.replace(/^و/, '')), `${e.n} ${e.at}: «${w}»`).toBe(true)
    }
  })

  it('the readings carry them, and add7-names.json marks the 19 names so kept', () => {
    const byN = new Map(data.entries.map((e) => [e.n, [e.readings.meaning, e.readings.easy, ...e.readings.deep].join(' ')]))
    for (const e of sense) expect(byN.get(e.n)!.replace(/\{\{([^{}|]+)\|[^{}|]+\}\}/g, '$1'), `${e.n}`).toContain(e.after.trim())
    const marked = (KEPT as { n: number; name: string; sense?: string }[]).filter((k) => k.sense)
    expect(marked).toHaveLength(19)
    expect([...new Set(marked.map((k) => k.n))].sort((a, b) => a - b)).toEqual([...new Set(sense.map((e) => e.n))].sort((a, b) => a - b))
  })
})

describe('the book whose order inspired the list is named nowhere (reply 0071 §4.2, add-on 0071-add1)', () => {
  const files = [
    'data/names-daily.json',
    'scripts/names/daily-build.mjs',
    'scripts/names/add5-edits.mjs',
    'scripts/names/add7-edits.mjs',
    'scripts/names/add7-names.json',
    'worker/src/names-day.ts',
    'web/src/v2/daily/names/NameOfDay.tsx',
    'web/src/v2/daily/names/NameEntry.tsx',
    'web/src/v2/daily/names/NamePage.tsx',
    'web/src/v2/daily/names/Names.tsx',
    'web/src/v2/daily/names/name-day-api.ts',
    'web/src/v2/daily/names/strings-name-day.ts',
    'web/e2e/v2-0071-names-card.spec.ts',
    'worker/test/names-day.test.ts',
    'scripts/names/forbidden.mjs',
  ]
  it.each(files)('%s', (f) => expect(findForbidden(fs.readFileSync(path.join(ROOT, f), 'utf8'))).toEqual([]))
  it.skipIf(!fs.existsSync(DRAFT))('and the check finds it where it is: the old draft’s header', () => {
    expect(findForbidden(fs.readFileSync(DRAFT, 'utf8')).length).toBeGreaterThan(0)
  })
})

describe('the readings reach the app from the server only', () => {
  it('the app imports no copy of the data file', () => {
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]))
    for (const f of walk(path.join(ROOT, 'web/src')).filter((f) => /\.(ts|tsx)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), f).not.toContain('names-daily')
  })
  it('NAMES_READINGS is "on" in env next (add-on 0072-add12) and env v11 (worker/wrangler.jsonc); production has none', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')
    expect(cfg.match(/"NAMES_READINGS"/g)).toHaveLength(2)
    const next = cfg.indexOf('"next": {')
    const v11 = cfg.indexOf('"v11": {')
    const first = cfg.indexOf('"NAMES_READINGS": "on"')
    const second = cfg.indexOf('"NAMES_READINGS": "on"', first + 1)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(v11)
    expect(first).toBeGreaterThan(next)
    expect(first).toBeLessThan(v11)
    expect(second).toBeGreaterThan(v11)
  })
})
