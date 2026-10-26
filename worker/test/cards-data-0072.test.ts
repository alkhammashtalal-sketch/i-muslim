// Add-on 0072-add30 §1, «اصنع كروت», over all the data the cards can carry (the review of a2e7545): every text cut by
// the layout joins back to its source letter for letter, and no cut falls inside «…», {…}, ﴿…﴾, (…) or […]. The texts:
// al-Muyassar and al-Saʿdi of every ayah (data/processed/quran.jsonl), Ibn Kathir of every ayah (data/raw/ksu/tafasir/
// katheer.ayt, as worker/src/passage.ts serves it), every Arabic HadeethEnc row with its explanation
// (data/processed/hadith.jsonl), the names' quotes (data/names-enriched.json) and the salaf sayings. Each at two card
// rooms, so the sentence, the clause and the pause cuts are all used. Skipped where the data is not here (outside git).
// The fit of every card in the real faces is the Playwright spec's (web/e2e/v2-0072-cards.spec.ts).
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { layoutSectionX, MIN_SCALE, type Block, type Measure, type Section } from '../../web/src/v2/cards/model'
import { htmlParagraphs } from '../src/passage'
import salaf from '../../data/salaf-daily.json'

const ROOT = path.resolve(import.meta.dirname, '../..')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const KATHEER = path.join(ROOT, 'data/raw/ksu/tafasir/katheer.ayt')
const NAMES = path.join(ROOT, 'data/names-enriched.json')

const est = (t: string) => Math.ceil(t.length / 34) * 40 + 70
const measure = (room: number): Measure => ({ room, gap: 20, piece: (_b, t) => est(t), fits: (_b, t) => est(t) * MIN_SCALE <= room })

/** The matched pairs of the text, found apart from the layout's own code: [opener, closer] indices. Each kind alone
 *  (the nearest open mark of its kind), and the straight «"» in turn within a paragraph of an even count of it. */
function pairs(t: string): [number, number][] {
  const out: [number, number][] = []
  for (const [o, c] of [['«', '»'], ['{', '}'], ['﴿', '﴾'], ['(', ')'], ['[', ']'], ['“', '”']]) {
    const stack: number[] = []
    for (let i = 0; i < t.length; i++) if (t[i] === o) stack.push(i)
    else if (t[i] === c && stack.length) out.push([stack.pop()!, i])
  }
  let pos = 0
  for (const para of t.split('\n')) {
    const q = [...para].flatMap((ch, i) => (ch === '"' ? [pos + i] : []))
    if (q.length % 2 === 0) for (let k = 0; k < q.length; k += 2) out.push([q[k], q[k + 1]])
    pos += para.length + 1
  }
  return out
}

type Tally = { texts: number; cuts: number; left: number; bad: string[] }
function check(text: string, rooms: number[], t: Tally) {
  if (!text.trim()) return
  t.texts++
  const ps = pairs(text)
  for (const room of rooms) {
    const block: Block = { kind: 'quote', text, lang: 'ar', dir: 'rtl', source: 'المصدر' }
    const sec: Section = { id: 's', label: 's', heading: 's', blocks: [block] }
    const x = layoutSectionX(sec, measure(room))
    const pieces = x.cards.flat().map((p) => p.text)
    if (pieces.join('') !== text) t.bad.push(`join: ${text.slice(0, 40)}`)
    if (!x.fits) t.left++
    let at = 0
    for (const p of pieces.slice(0, -1)) {
      at += p.length
      t.cuts++
      const inside = ps.find(([o, c]) => o < at && at <= c)
      if (inside && t.bad.length < 20) t.bad.push(`inside ${text[inside[0]]}…${text[inside[1]]}: «${text.slice(Math.max(0, at - 25), at)}‖${text.slice(at, at + 25)}»`)
    }
  }
}
const fresh = (): Tally => ({ texts: 0, cuts: 0, left: 0, bad: [] })
const ROOMS = [700, 1400]

describe('every text the cards can carry, cut and joined back', () => {
  it.skipIf(!fs.existsSync(QURAN))('al-Muyassar and al-Saʿdi of every ayah', () => {
    const t = fresh()
    for (const line of fs.readFileSync(QURAN, 'utf8').split('\n')) {
      if (!line.trim()) continue
      const r = JSON.parse(line) as { muyassar?: string; saadi?: string }
      if (r.muyassar) check(r.muyassar, ROOMS, t)
      if (r.saadi) check(htmlParagraphs(r.saadi).join('\n'), ROOMS, t)
    }
    expect(t.bad).toEqual([])
    expect(t.texts).toBeGreaterThan(12_000)
    expect(t.cuts).toBeGreaterThan(4_000)
  }, 300_000)

  it.skipIf(!fs.existsSync(KATHEER))('Ibn Kathir of every ayah, as the server sends it', () => {
    const t = fresh()
    const db = new DatabaseSync(KATHEER, { readOnly: true })
    for (const r of db.prepare('SELECT text FROM katheer').all() as { text: string }[]) check(htmlParagraphs(String(r.text ?? '')).join('\n'), ROOMS, t)
    expect(t.bad).toEqual([])
    expect(t.texts).toBeGreaterThan(6_000) // 6236 entries, a few of them markup alone
  }, 600_000)

  it.skipIf(!fs.existsSync(HADITH))('every Arabic row of HadeethEnc: its text and its explanation', async () => {
    const t = fresh()
    const rl = readline.createInterface({ input: fs.createReadStream(HADITH, 'utf8'), crlfDelay: Infinity })
    for await (const line of rl) {
      if (!line.startsWith('{"lang":"ar"')) continue
      const r = JSON.parse(line) as { hadeeth?: string; explanation?: string }
      if (r.hadeeth) check(r.hadeeth, ROOMS, t)
      if (r.explanation) check(r.explanation, ROOMS, t)
    }
    expect(t.bad).toEqual([])
    expect(t.texts).toBeGreaterThan(5_000)
  }, 600_000)

  it.skipIf(!fs.existsSync(NAMES))('the names’ quotes and the salaf sayings', () => {
    const t = fresh()
    const j = JSON.parse(fs.readFileSync(NAMES, 'utf8')) as { entries: Record<string, { meaning?: { text: string }[]; salaf?: { text: string }[]; heart?: string }> }
    for (const e of Object.values(j.entries)) {
      for (const q of [...(e.meaning ?? []), ...(e.salaf ?? [])]) check(q.text, [300, 700], t)
      if (e.heart) check(e.heart, [300, 700], t)
    }
    for (const c of salaf.cards as { text: string }[]) check(c.text, [300, 700], t)
    expect(t.bad).toEqual([])
    expect(t.texts).toBeGreaterThan(60)
  })
})
