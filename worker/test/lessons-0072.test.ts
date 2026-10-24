// The «علّمني» lessons in the app (add-on 0072). Their data (web/src/lessons/<id>-data.json, made by
// scripts/lessons/build.mjs) holds no hadith or ayah text (CLAUDE.md §7, §3 rule 4): each excerpt is its hadith id,
// field, index and slice [start, end) with the hash of its reviewed bytes, and the page asks our server for the texts
// by id (web/src/lessons/texts.js). Held here, byte for byte:
//   - every position cut from its row in data/processed (hadith.jsonl, quran.jsonl) gives the review page's own text
//     (relay/w1/<lesson>/data/lesson-data.js) and its hash;
//   - the same through the Worker's own answers (GET /api/hadith/:id, GET /api/passage/quran:S:A on a D1 built from
//     the migrations, quran.jsonl and hadith.sql) and the page's own cutter, texts.js: what the app shows is what the
//     review page showed;
//   - each Ibn Baz excerpt (kept in the data, with its link) against his saved page (sources/binbaz/<id>.txt), and each
//     part of an evidence-table row (sunnah.com, dorar.net: references, no text) against its cell in prayer-evidence.md;
//   - the speaker rule of tools/check_qala.py: an excerpt of a hadith's text that starts after a «قال» away from the
//     Prophet's name ﷺ carries a speaker label, or was reviewed (scripts/lessons/qala-reviewed-<id>.json).
// data/processed and relay/ are outside git: in a clean tree those checks are skipped, the rest still runs.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { createTexts, cut, fieldText } from '../../web/src/lessons/texts.js'
import { buildSteps, loadPrayers, mergeSets, resolveRef, validate } from '../../web/src/lessons/prayer/prayers.js'
import { definitions, WORDS } from '../../web/src/lessons/prayer/template.js'
import { handleHadith } from '../src/hadith'
import type { Env } from '../src/index'
import { getPassage } from '../src/passage'
import { buildDb } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LESSONS_DIR = path.join(ROOT, 'web/src/lessons')
const PROCESSED = path.join(ROOT, 'data/processed')
const RELAY = process.env.LESSONS_RELAY ?? path.join(ROOT, 'relay/w1')
const DIRS: Record<string, string> = { prayer: '0071-prayer', wudu: '0072-wudu' }
const BINBAZ: Record<string, string> = { prayer: '0071-prayer/v1-plus/sources/binbaz', wudu: '0072-wudu/sources/binbaz' }
const EVIDENCE: Record<string, string> = { prayer: '0071-prayer/prayer-evidence.md' }
const HAVE_HADITH = fs.existsSync(path.join(PROCESSED, 'hadith.jsonl'))
const HAVE_QURAN = fs.existsSync(path.join(PROCESSED, 'quran.jsonl'))
const HAVE_D1 = HAVE_QURAN && fs.existsSync(path.join(PROCESSED, 'hadith.sql'))

type Obj = Record<string, unknown>
type Pos = { start: number; end: number; field: string; idx?: number; sha: string }
type Slice = { start: number; end: number; text: string }
type Lesson = { steps: Obj[]; feet?: Obj; hadith: Record<string, Obj & { class: string; ar: Obj; en?: Obj }>; quran?: Record<string, Obj>; qf?: Obj }

const lessons = fs
  .readdirSync(LESSONS_DIR)
  .filter((f) => /^[a-z]+-data\.json$/.test(f))
  .map((f) => ({ id: f.replace('-data.json', ''), data: JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')) as Lesson }))

const sha16 = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 16)
const isPos = (o: unknown): o is Pos => !!o && typeof o === 'object' && typeof (o as Pos).sha === 'string' && typeof (o as Pos).start === 'number'
const isSlice = (o: unknown): o is Slice => !!o && typeof o === 'object' && typeof (o as Slice).text === 'string' && typeof (o as Slice).start === 'number'

/** Every hadith position in the steps and close-ups, with its hadith id, language and path. */
function positions(d: Lesson) {
  const out: { node: Pos; id: string; lang: 'ar' | 'en'; where: string }[] = []
  const walk = (o: unknown, where: string) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${where}[${i}]`))
    if (!o || typeof o !== 'object') return
    for (const [k, v] of Object.entries(o as Obj)) {
      if ((k === 'ar' || k === 'en') && isPos(v) && typeof (o as Obj).id === 'string') out.push({ node: v, id: (o as Obj).id as string, lang: k, where: `${where}.${k}` })
      else walk(v, `${where}.${k}`)
    }
  }
  walk(d.steps, 'steps')
  walk(d.feet ?? {}, 'feet')
  return out
}

/** Every text slice kept in the data (Ibn Baz, the evidence table), with its holder. */
function slices(d: Lesson) {
  const out: { node: Slice & Obj; parent: Obj; where: string }[] = []
  const walk = (o: unknown, parent: Obj | null, where: string) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, parent, `${where}[${i}]`))
    if (!o || typeof o !== 'object') return
    if (isSlice(o) && parent) out.push({ node: o as Slice & Obj, parent, where })
    for (const [k, v] of Object.entries(o as Obj)) walk(v, o as Obj, `${where}.${k}`)
  }
  walk(d.steps, null, 'steps')
  walk(d.feet ?? {}, null, 'feet')
  return out
}

/** The value at a path such as «steps[3].how[0].ar» in another copy of the data. */
function at(o: unknown, where: string): unknown {
  for (const part of where.match(/[^.[\]]+/g) ?? []) o = (o as Obj | undefined)?.[/^\d+$/.test(part) ? Number(part) : part]
  return o
}

/** The review page's own data (relay/w1/<lesson>/data/lesson-data.js), or null. */
function reviewData(id: string): Lesson | null {
  const file = path.join(RELAY, DIRS[id] ?? '-', 'data/lesson-data.js')
  if (!fs.existsSync(file)) return null
  const sandbox = { window: {} as { LESSON_DATA?: Lesson } }
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox)
  return sandbox.window.LESSON_DATA ?? null
}

/** The rows of the hadith ids asked for, Arabic and English (the file is 272 MB: lines are picked by their id first). */
function hadithRows(ids: Set<string>) {
  const rows = new Map<string, Obj>()
  const text = fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8')
  let pos = 0
  while (pos < text.length) {
    let nl = text.indexOf('\n', pos)
    if (nl < 0) nl = text.length
    const m = text.slice(pos, Math.min(nl, pos + 120)).match(/"lang": ?"(ar|en)".*?"id": ?"(\d+)"/)
    if (m && ids.has(m[2])) rows.set(`${m[2]}:${m[1]}`, JSON.parse(text.slice(pos, nl)))
    pos = nl + 1
  }
  return rows
}

function quranRows(ids: Set<string>) {
  const rows = new Map<string, Obj>()
  for (const line of fs.readFileSync(path.join(PROCESSED, 'quran.jsonl'), 'utf8').split('\n')) {
    const m = line.match(/^\{"id": ?"(quran:\d+:\d+)"/)
    if (m && ids.has(m[1])) rows.set(m[1], JSON.parse(line))
  }
  return rows
}

/** prayer-evidence.md: each table row's eight cells by its number, as tools/check.py reads them. */
function evidenceCells(file: string) {
  const ev = new Map<string, string[]>()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| #') || line.startsWith('|---')) continue
    const cells = line.replace(/^\|+|\|+$/g, '').split(' | ').map((c) => c.trim())
    if (cells.length === 8) ev.set(cells[0], cells)
  }
  return ev
}

const bytes = (s: unknown) => Buffer.from(String(s))

// ---- the speaker rule (tools/check_qala.py, both lessons), on the data with its texts cut from data/processed ----
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g
const VERB_SRC = '(?:^|[\\s«"(])(?:ف|و)?(?:قال|قالت|يقول|تقول)(?=[\\s:،.»"]|$)'
const PROPHET = ['رسول الله', 'النبي', 'صلى الله عليه وسلم', 'عليه الصلاة والسلام']
const strip = (s: string) => s.replace(MARKS, '')

function speakerFlags(d: Lesson, textOf: (node: Pos) => string, fullOf: (id: string) => string, reviewed: Record<string, { who: string }>) {
  const items: { where: string; o: Obj }[] = []
  const walk = (o: unknown, where: string) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${where}[${i}]`))
    if (!o || typeof o !== 'object') return
    const r = o as Obj
    if (r.field === 'hadeeth' && r.ar && r.id) items.push({ where, o: r })
    for (const [k, v] of Object.entries(r)) walk(v, `${where}.${k}`)
  }
  walk(d.steps, 'steps')
  walk(d.feet ?? {}, 'feet')
  const flagged: { where: string; id: string; state: 'labelled' | 'reviewed' | 'FLAG' }[] = []
  for (const { where, o } of items) {
    const id = String(o.id)
    const ex = o.ar as Pos
    const before = strip(cut(fullOf(id), 0, ex.start))
    const own = strip(textOf(ex))
    const m0 = new RegExp(VERB_SRC, 'y').exec(own)
    // (the Arabic texts are all in the Basic Multilingual Plane: their UTF-16 indexes are Python's code points)
    // the excerpt itself opens, in the middle of the text, with «قال فلان», and he is not the Prophet ﷺ: flagged
    const opensWithOther = !!m0 && ex.start > 0 && !PROPHET.some((p) => own.slice(0, m0.index + m0[0].length + 40).includes(p))
    if (!opensWithOther) {
      const verbs = [...before.matchAll(new RegExp(VERB_SRC, 'g'))]
      if (verbs.length < 2) continue // no speech verb before it, or only the narrator's opening «عن فلان ... قال»
      const v = verbs[verbs.length - 1]
      const near = before.slice(Math.max(0, v.index - 60), v.index + v[0].length + 40)
      if (PROPHET.some((p) => near.includes(p))) continue // the Prophet ﷺ named next to the verb: his words
    }
    const state = o.speaker ? 'labelled' : reviewed[`${id}:${ex.start}`] ? 'reviewed' : 'FLAG'
    flagged.push({ where, id, state })
  }
  return { checked: items.length, flagged }
}

describe('the «علّمني» lessons’ data (add-on 0072)', () => {
  it('the lessons are found (none yet is also a state: the shell is merged first)', () => {
    for (const l of lessons) expect(['prayer', 'wudu']).toContain(l.id)
  })

  for (const { id, data } of lessons) {
    describe(id, () => {
      const review = reviewData(id)

      it('holds no hadith or ayah text: positions and hashes only (CLAUDE.md §7, §3 rule 4)', () => {
        for (const [hid, H] of Object.entries(data.hadith)) {
          for (const lang of ['ar', 'en'] as const) if (H[lang]) expect(Object.keys(H[lang]).sort(), `${hid}:${lang}`).toEqual(['sha', 'url', 'version'])
        }
        for (const [qid, A] of Object.entries(data.quran ?? {})) for (const k of ['text', 'text_en', 'muyassar', 'translit']) expect(A, `${qid}.${k}`).not.toHaveProperty(k)
        for (const { node, where } of positions(data)) expect(node, where).not.toHaveProperty('text')
        // what text is left is Ibn Baz's (with his page) or an evidence-table reference: nothing else
        for (const { node, where } of slices(data)) expect(node.src === 'binbaz' || /binbaz\.org\.sa/.test(String(node.url ?? '')) || 'col' in node, where).toBe(true)
        expect(positions(data).length).toBeGreaterThan(0)
      })

      it('uses only sahih and hasan hadith, each with its HadeethEnc link and version', () => {
        for (const [hid, H] of Object.entries(data.hadith)) {
          expect(['sahih', 'hasan'], hid).toContain(H.class)
          for (const lang of ['ar', 'en'] as const) {
            if (!H[lang]) continue
            expect(H[lang].url).toBe(`https://hadeethenc.com/${lang}/browse/hadith/${hid}`)
            expect(H[lang].version).toMatch(/^v\d+\.\d+\.\d+$/)
          }
        }
      })

      it('does not bundle Quran Foundation’s transliteration (asked of our server at runtime)', () => {
        if (data.qf) expect(Object.keys(data.qf).sort()).toEqual(['resource', 'source'])
      })

      it('links only to the app’s routes', () => {
        for (const st of data.steps) for (const l of (st.links as { href: string }[]) ?? []) expect(l.href).toMatch(/^\/[a-z]/)
      })

      it.skipIf(!HAVE_HADITH)('every hadith position cut from data/processed is the review page’s own text, byte for byte', () => {
        const rows = hadithRows(new Set(Object.keys(data.hadith)))
        let n = 0
        for (const { node, id: hid, lang, where } of positions(data)) {
          const row = rows.get(`${hid}:${lang}`)
          expect(row, where).toBeTruthy()
          const text = cut(fieldText(row!, node.field, node.idx)!, node.start, node.end)
          expect(sha16(text), where).toBe(node.sha)
          if (review) expect(bytes(text), where).toEqual(bytes((at(review, where) as Slice).text))
          n++
        }
        for (const [hid, H] of Object.entries(data.hadith)) {
          for (const lang of ['ar', 'en'] as const) {
            for (const [field, sha] of Object.entries((H[lang]?.sha ?? {}) as Record<string, string>)) {
              const text = fieldText(rows.get(`${hid}:${lang}`)!, field)!
              expect(sha16(text), `${hid}:${lang}.${field}`).toBe(sha)
              if (review) expect(bytes(text), `${hid}:${lang}.${field}`).toEqual(bytes((review.hadith[hid][lang] as Obj)[field]))
              n++
            }
          }
          if (rows.get(`${hid}:ar`)) expect(rows.get(`${hid}:ar`)!.class, hid).toBe(H.class)
        }
        expect(n).toBeGreaterThan(0)
      })

      it.skipIf(!HAVE_QURAN)('every ayah, its tafsir and its meaning from data/processed are the review page’s own', () => {
        const rows = quranRows(new Set(Object.keys(data.quran ?? {})))
        for (const [qid, A] of Object.entries(data.quran ?? {})) {
          const row = rows.get(qid)
          expect(row, qid).toBeTruthy()
          for (const [field, sha] of Object.entries(A.sha as Record<string, string>)) {
            expect(sha16(String(row![field])), `${qid}.${field}`).toBe(sha)
            if (review) expect(bytes(row![field]), `${qid}.${field}`).toEqual(bytes(review.quran![qid][field]))
          }
          for (const k of ['sura', 'aya', 'sura_name', 'ref', 'url', 'url_en']) expect(A[k], `${qid}.${k}`).toEqual(row![k])
          expect(A.url_muyassar).toBe(`https://quran.ksu.edu.sa/tafseer/muyassar/sura${A.sura}-aya${A.aya}.html`)
        }
      })

      it.skipIf(!HAVE_D1)(
        'through the Worker’s own answers and the page’s cutter (texts.js), every text is the review page’s, byte for byte',
        async () => {
          const d1 = buildDb()
          d1.db.exec(fs.readFileSync(path.join(PROCESSED, 'hadith.sql'), 'utf8'))
          const env = { DB: d1 } as unknown as Env
          const fetchHadith = async (hid: string, lang: string) => {
            const url = new URL(`https://x/api/hadith/${hid}?lang=${lang}`)
            const r = await handleHadith(new Request(url), env, url)
            return r && r.ok ? r.json() : null
          }
          const fetchAyah = (qid: string) => getPassage(env, qid)
          for (const lang of ['ar', 'en'] as const) {
            const tx = createTexts({ data, lang, fetchHadith, fetchAyah })
            for (const st of data.steps) await tx.need([st, data.feet])
            let n = 0
            for (const { node, lang: l, where } of positions(data)) {
              if (l !== lang && !(lang === 'en' && l === 'ar')) continue
              const got = tx.slice(node)
              expect(got.s, where).toBe('ok')
              const text = (got as { text: string }).text
              expect(sha16(text), where).toBe(node.sha)
              if (review) expect(bytes(text), where).toEqual(bytes((at(review, where) as Slice).text))
              n++
            }
            for (const [hid, H] of Object.entries(data.hadith))
              for (const l of lang === 'ar' ? (['ar'] as const) : (['ar', 'en'] as const))
                for (const field of Object.keys((H[l]?.sha ?? {}) as Obj)) {
                  const got = tx.hadith(hid, l, field)
                  expect(got.s, `${hid}:${l}.${field}`).toBe('ok')
                  if (review) expect(bytes((got as { text: string }).text), `${hid}:${l}.${field}`).toEqual(bytes((review.hadith[hid][l] as Obj)[field]))
                }
            for (const [qid, A] of Object.entries(data.quran ?? {}))
              for (const field of Object.keys(A.sha as Obj)) {
                const got = tx.ayah(qid, field)
                expect(got.s, `${qid}.${field}`).toBe('ok')
                if (review) expect(bytes((got as { text: string }).text), `${qid}.${field}`).toEqual(bytes(review.quran![qid][field]))
              }
            expect(n).toBeGreaterThan(0)
          }
          // a text the server sends differently (a changed source) is not shown: the step keeps its reference and link
          const first = positions(data)[0]
          const tx = createTexts({
            data,
            lang: 'ar',
            fetchHadith: async (hid: string) => {
              const r = (await fetchHadith(hid, 'ar')) as { ar: Obj } | null
              // one character more at the start: every slice moves by one
              const more = (x: unknown) => (typeof x === 'string' ? `.${x}` : x)
              return r ? { ar: { ...r.ar, text: more(r.ar.text), explanation: more(r.ar.explanation), hints: (r.ar.hints as string[]).map(more), words: (r.ar.words as Obj[]).map((w) => ({ ...w, meaning: more(w.meaning) })) } } : null
            },
            fetchAyah,
          })
          await tx.need([data.steps, data.feet])
          for (const p of positions(data).filter((x) => x.lang === 'ar')) expect(tx.slice(p.node).s, p.where).toBe('none')
          // and a server that does not answer
          const off = createTexts({ data, lang: 'ar', fetchHadith: async () => null, fetchAyah: async () => null })
          expect(off.slice(first.node).s).toBe('wait') // not asked yet: the calm placeholder, no text
          await off.need([data.steps, data.feet])
          expect(off.slice(first.node).s).toBe('none')
        },
        120_000,
      )

      const bbDir = path.join(RELAY, BINBAZ[id] ?? '-')
      it.skipIf(!fs.existsSync(bbDir))('every Ibn Baz excerpt is a slice of his saved page, with its page’s link', () => {
        let n = 0
        for (const { node, where } of slices(data)) {
          if (node.src !== 'binbaz' && !/binbaz\.org\.sa/.test(String(node.url ?? ''))) continue
          const page = fs.readFileSync(path.join(bbDir, `${node.id}.txt`), 'utf8')
          expect(bytes(node.text), where).toEqual(bytes(cut(page, node.start, node.end)))
          expect(String(node.url), where).toMatch(/^https:\/\/binbaz\.org\.sa\//)
          n++
        }
        expect(n).toBeGreaterThan(0)
      })

      const evFile = EVIDENCE[id] ? path.join(RELAY, EVIDENCE[id]) : ''
      it.skipIf(!evFile || !fs.existsSync(evFile))('every part of an evidence-table row is its cell’s own (sunnah.com, dorar.net)', () => {
        const ev = evidenceCells(evFile)
        let n = 0
        for (const { node, parent, where } of slices(data)) {
          if (!('col' in node)) continue
          const cells = ev.get(String(parent.row))
          expect(cells, where).toBeTruthy()
          expect(bytes(node.text), where).toEqual(bytes(cut(cells![Number(node.col)], node.start, node.end)))
          n++
        }
        expect(n).toBeGreaterThan(0)
      })

      it.skipIf(!HAVE_HADITH)('the speaker rule: an excerpt after a «قال» away from the Prophet’s name ﷺ is labelled or reviewed', () => {
        const rows = hadithRows(new Set(Object.keys(data.hadith)))
        const file = path.join(ROOT, `scripts/lessons/qala-reviewed-${id}.json`)
        const reviewed = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')).items as Record<string, { who: string }>) : {}
        const owner = new Map(positions(data).map((p) => [p.node, p]))
        const textOf = (node: Pos) => cut(fieldText(rows.get(`${owner.get(node)!.id}:${owner.get(node)!.lang}`)!, node.field, node.idx)!, node.start, node.end)
        const fullOf = (hid: string) => rows.get(`${hid}:ar`)!.hadeeth as string
        const { checked, flagged } = speakerFlags(data, textOf, fullOf, reviewed)
        expect(checked).toBeGreaterThan(0)
        expect(flagged.filter((f) => f.state === 'FLAG')).toEqual([])
        expect(flagged.length).toBe({ prayer: 27, wudu: 2 }[id] ?? flagged.length) // as check_qala.py counts them
      })
    })
  }
})

// ---- «علّمني الصلاة» for each prayer (add-on 0072-add13): the definitions, every prayer's steps in order, nothing new ----
describe('each prayer step by step (add-on 0072-add13)', () => {
  const file = path.join(LESSONS_DIR, 'prayer/prayers-batch-1.json')
  const haveLesson = fs.existsSync(path.join(LESSONS_DIR, 'prayer-data.json')) && fs.existsSync(file)
  if (!haveLesson) return
  const data = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, 'prayer-data.json'), 'utf8')) as Lesson & { steps: (Obj & { key: string })[] }
  const { _generated: _g, ...set } = JSON.parse(fs.readFileSync(file, 'utf8'))
  type Def = Parameters<typeof buildSteps>[0]
  type Built = Obj & { key: string; at: Obj; title: { ar: string; en: string }; do: { ar: string; en: string }; cue: { text: { ar: string; en: string }; ev: Obj[] } | null }
  const byId = Object.fromEntries((set.prayers as Def[]).map((p) => [p.id, p])) as Record<string, Def>
  const built = (id: string) => buildSteps(byId[id], set, data.steps) as Built[]

  it('the bundled file is the template’s own output, and it holds together', () => {
    expect(set).toEqual(JSON.parse(JSON.stringify(definitions(data))))
    expect(validate(set, data)).toEqual([])
    expect(Object.keys(byId)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  })

  // the expected order, written out here by hand from the add-on (not from the template)
  const RAKAH = ['fatiha', 'surah', 'ruku', 'itidal', 'sujud1', 'jalsa', 'sujud2']
  const LATER = ['fatiha', 'ruku', 'itidal', 'sujud1', 'jalsa', 'sujud2'] // after the second rakah: no surah
  const END = ['ibrahimiyya', 'qabla_salam', 'taslim']
  const MORE = ['after', 'nofatiha', 'seated', 'mistakes', 'rakat', 'minimum']
  const EXPECTED: Record<string, string[]> = {
    fajr: ['intro', 'takbir', 'istiftah', ...RAKAH, 'istiraha', 'rakah2', ...RAKAH, 'tashahhud', ...END, ...MORE],
    maghrib: ['intro', 'takbir', 'istiftah', ...RAKAH, 'istiraha', 'rakah2', ...RAKAH, 'tashahhud', 'rakah2', ...LATER, 'tawarruk', ...END, ...MORE],
    dhuhr: ['intro', 'takbir', 'istiftah', ...RAKAH, 'istiraha', 'rakah2', ...RAKAH, 'tashahhud', 'rakah2', ...LATER, 'istiraha', 'rakah2', ...LATER, 'tawarruk', ...END, ...MORE],
  }
  EXPECTED.asr = EXPECTED.dhuhr
  EXPECTED.isha = EXPECTED.dhuhr
  // how each rakah is recited, from the rakah table's own words (the «rakat» step)
  const RECITE: Record<string, string[]> = {
    'جهر': ['jahr', 'jahr'],
    'إسرار': ['sirr', 'sirr', 'sirr', 'sirr'],
    'جهر في الأوليين، وسرّ في الثالثة': ['jahr', 'jahr', 'sirr'],
    'جهر في الأوليين، وسرّ في الأخريين': ['jahr', 'jahr', 'sirr', 'sirr'],
  }
  // the template's words, all of them listed on the review page (relay/w1/0072-prayers/batch-1): a word more is a word
  // more to review
  const WORD_COUNT = 41
  const TALAL = {
    tash1: 'بعد السجدة الثانية من الركعة الثانية لا تقم، بل اجلس للتشهد الأول',
    stand3: 'قم إلى الثالثة مكبّرًا رافعًا يديك',
    tawarruk: 'اجلس للتشهد الأخير متورّكًا',
    alone: 'الفاتحة وحدها، سرًّا',
  }

  for (const id of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    it(`${id}: every rakah with all its steps, in order, and its sittings said in the step`, () => {
      const p = byId[id]
      const steps = built(id)
      expect(steps.map((s) => s.key)).toEqual(EXPECTED[id])
      const n = p.rakat
      expect(n).toBe({ fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 }[id])
      // the rakahs: each its start (the opening takbir, or the standing up) and its seven or six steps
      for (let r = 1; r <= n; r++) {
        const own = steps.filter((s) => s.at.r === r && !s.at.sit && s.key !== 'istiraha' && !(r === 2 && n > 2 && s.key === 'tashahhud')).map((s) => s.key)
        expect(own, `${id} rakah ${r}`).toEqual([...(r === 1 ? ['takbir', 'istiftah'] : ['rakah2']), ...(r <= 2 ? RAKAH : LATER)])
      }
      // nothing abridged: no step tells you to repeat another
      for (const s of steps) {
        for (const l of ['ar', 'en'] as const) {
          const said = [s.title[l], s.do[l], s.cue?.text[l] ?? ''].join(' ')
          expect(said, `${id} ${s.key}`).not.toMatch(/كالأولى|كالركعة|مثل الأولى|like the first/i)
        }
        expect(s.repeat ?? null).toBeNull()
        expect(s.then ?? null).toBeNull()
      }
      // the recitation of each rakah: as the table says, al-Fatiha alone and quietly after the second rakah
      expect(p.rakahs).toEqual(RECITE[p.recite.ar])
      const fatihas = steps.filter((s) => s.key === 'fatiha')
      expect(fatihas.map((s) => s.at.r)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
      fatihas.forEach((s, i) => {
        const how = p.rakahs![i]
        if (i < 2) expect(s.cue!.text.ar).toBe(how === 'jahr' ? 'الفاتحة ثم ما تيسر من القرآن، جهرًا' : 'الفاتحة ثم ما تيسر من القرآن، سرًّا')
        else expect(s.cue!.text.ar).toBe(TALAL.alone)
      })
      steps.filter((s) => s.key === 'surah').forEach((s, i) => expect((s.tag as { ar: string }).ar).toBe(p.rakahs![i] === 'jahr' ? 'جهرًا' : 'سرًّا'))
      // the sittings: the first tashahhud after the second rakah, the standing up to the third, the last with tawarruk
      const at = (k: string, r: number) => steps.find((s) => s.key === k && s.at.r === r)!
      const sujud2 = (r: number) => steps.indexOf(at('sujud2', r))
      if (n > 2) {
        const t1 = steps[sujud2(2) + 1]
        expect([t1.key, t1.at.sit, t1.cue!.text.ar, t1.title.ar]).toEqual(['tashahhud', 1, TALAL.tash1, 'التشهد الأول'])
        const s3 = steps[sujud2(2) + 2]
        expect([s3.key, s3.at.r, s3.cue!.text.ar, s3.pose]).toEqual(['rakah2', 3, TALAL.stand3, 'stand3'])
        const last = steps[sujud2(n) + 1]
        expect(last.key).toBe('tawarruk')
        expect(last.cue!.text.ar).toContain(TALAL.tawarruk)
        expect(last.cue!.text.ar).toContain(`من الركعة ${n === 3 ? 'الثالثة' : 'الرابعة'} لا تقم`)
        for (const s of steps.filter((x) => x.at.sit === 2 && x.key !== 'tawarruk')) expect([s.key, s.feet, s.pose]).toEqual([s.key, 'tawarruk', s.key === 'taslim' ? 'taslim_tw' : 'tawarruk'])
      } else {
        const last = steps[sujud2(2) + 1]
        expect([last.key, last.at.sit, last.title.ar]).toEqual(['tashahhud', 2, 'التشهد الأخير'])
        expect(last.cue!.text.ar).toBe('بعد السجدة الثانية من الركعة الثانية لا تقم، بل اجلس للتشهد الأخير')
        for (const s of steps.filter((x) => x.at.sit === 2)) expect(s.feet).toBe('sit')
      }
      // the resting sit before an even rakah only; and the second prostration in the first one's approved words
      expect(steps.filter((s) => s.key === 'istiraha').map((s) => s.at.r)).toEqual(n === 4 ? [1, 3] : [1])
      expect(at('istiraha', 1).do.ar).toBe('ترفع رأسك وتجلس جلسة خفيفة، ثم تقوم للركعة الثانية.')
      if (n === 4) expect(at('istiraha', 3).do.ar).toBe('ترفع رأسك وتجلس جلسة خفيفة، ثم تقوم للركعة الرابعة.')
      for (const s of steps.filter((x) => x.key === 'sujud2')) expect(s.do).toEqual(data.steps.find((b) => b.key === 'sujud1')!.do)
      // the map's marks: the first tashahhud on one step, the last on its four
      expect(steps.filter((s) => s.at.sit === 1).length).toBe(n > 2 ? 1 : 0)
      expect(steps.filter((s) => s.at.sit === 2).map((s) => s.key)).toEqual([n > 2 ? 'tawarruk' : 'tashahhud', ...END])
    })
  }

  it('nothing new of religious text: every text a prayer’s step shows is an approved step’s own node', () => {
    const own = new Set<unknown>()
    const walk = (o: unknown) => {
      if (Array.isArray(o)) return o.forEach(walk)
      if (!o || typeof o !== 'object') return
      own.add(o)
      Object.values(o).forEach(walk)
    }
    walk(data.steps)
    let n = 0
    for (const id of Object.keys(byId)) {
      for (const s of built(id)) {
        // the texts: the hadith positions, Ibn Baz's slices and the evidence rows, wherever they sit on the step
        const texts: unknown[] = []
        const find = (o: unknown) => {
          if (Array.isArray(o)) return o.forEach(find)
          if (!o || typeof o !== 'object') return
          if (isPos(o) || isSlice(o)) texts.push(o)
          Object.values(o).forEach(find)
        }
        find(s)
        for (const t of texts) {
          expect(own.has(t), `${id} ${s.key}`).toBe(true)
          n++
        }
      }
    }
    expect(n).toBeGreaterThan(500)
    // and the template's words are the reviewed list, none of them a text (no speech verb, no ﷺ)
    expect(Object.keys(WORDS).sort()).toEqual(Object.keys(set.words).sort())
    expect(Object.keys(WORDS).length).toBe(WORD_COUNT)
    for (const [k, w] of Object.entries(WORDS)) expect(`${w.ar} ${w.en}`, k).not.toMatch(/قال|ﷺ|صلى الله عليه وسلم|said/)
  })

  it('every ref names the approved node it says (its id), and a ref to anything else is refused', () => {
    for (const p of Object.values(byId)) for (const it of p.seq) for (const r of [...(it.ev ?? []), ...(it.rulings ?? [])]) expect(resolveRef(r, data.steps), r).not.toBeNull()
    expect(resolveRef('rakat/how/3#3101', data.steps)).toBeNull()
    expect(resolveRef('rakat/how/99#3100', data.steps)).toBeNull()
    expect(resolveRef('nosuch/how/0#3100', data.steps)).toBeNull()
  })

  it.skipIf(!HAVE_HADITH)('the speaker rule on every prayer’s steps: no excerpt after a «قال» left unlabelled', () => {
    const rows = hadithRows(new Set(Object.keys(data.hadith)))
    const reviewed = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lessons/qala-reviewed-prayer.json'), 'utf8')).items as Record<string, { who: string }>
    const owner = new Map(positions(data).map((p) => [p.node, p]))
    const textOf = (node: Pos) => cut(fieldText(rows.get(`${owner.get(node)!.id}:${owner.get(node)!.lang}`)!, node.field, node.idx)!, node.start, node.end)
    const fullOf = (hid: string) => rows.get(`${hid}:ar`)!.hadeeth as string
    for (const id of Object.keys(byId)) {
      const { checked, flagged } = speakerFlags({ ...data, steps: built(id) }, textOf, fullOf, reviewed)
      expect(checked, id).toBeGreaterThan(0)
      expect(flagged.filter((f) => f.state === 'FLAG'), id).toEqual([])
    }
  })

  it('our server’s later batches: a valid set adds its prayers; anything that does not hold together leaves the bundled set', async () => {
    const duha = { id: 'duha', batch: 2, time: null, rakat: 2, name: { ar: 'الضحى', en: 'Duha' }, recite: { ar: 'سرّ', en: 'quiet' }, rakahs: ['sirr', 'sirr'], seq: byId.fajr.seq }
    const remote = { v: 1, batch: 2, words: {}, prayers: [duha] }
    const merged = mergeSets(set, remote, data) as typeof set
    expect(merged.prayers.map((p: { id: string }) => p.id)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'duha'])
    expect(buildSteps(merged.prayers[5], merged, data.steps).length).toBe(byId.fajr.seq.length)
    // refused: an unknown step, a ref whose id is not the node's, a word not in the set, a hadith not sahih or hasan
    const bad = [
      { ...remote, prayers: [{ ...duha, seq: [{ k: 'nosuch', r: 1 }] }] },
      { ...remote, prayers: [{ ...duha, seq: [{ k: 'fatiha', r: 1, ev: ['rakat/how/3#9999'] }] }] },
      { ...remote, prayers: [{ ...duha, seq: [{ k: 'fatiha', r: 1, cue: 'cue.nosuch' }] }] },
      { ...remote, hadith: { 1: { class: 'daif', ar: { url: 'x' } } } },
      { v: 2, prayers: [duha] },
      null,
      '<!doctype html>',
    ]
    for (const b of bad) expect(mergeSets(set, b, data)).toBe(set)
    // a remote word may not change a reviewed one
    const reword = mergeSets(set, { ...remote, words: { 'cue.alone': { ar: 'نص آخر', en: 'other' } } }, data) as typeof set
    expect(reword.words['cue.alone'].ar).toBe(TALAL.alone)
    // the loader: the server's set, or the bundled one when it does not answer
    expect(await loadPrayers({ bundled: set, data, fetchJson: async () => remote })).not.toBe(set)
    expect(await loadPrayers({ bundled: set, data, fetchJson: async () => null })).toBe(set)
    expect(await loadPrayers({ bundled: set, data, fetchJson: async () => Promise.reject(new Error('offline')) })).toBe(set)
  })
})
