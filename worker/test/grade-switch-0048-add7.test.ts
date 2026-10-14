// 0048-add7: «هل حديث كذا صحيح؟» under its own switch. With it on, no other question takes the grade path: none of
// questions.v1, the welcome set, fresh-0048 and the organisers' twelve is read as a grade question, so their answers
// (passages, order, behaviour) are as they were by construction; the grade cases of hadith-retrieval.v1 all are.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { gradeQuestionOf } from '../src/hadith-grade'

const EVAL = path.resolve(import.meta.dirname, '../../eval')
const read = (f: string) =>
  fs
    .readFileSync(path.join(EVAL, f), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as { id: string; q: string; expected_behavior?: string })

describe('the grade path takes grade questions only (0048-add7)', () => {
  // questions.v1's q048 is itself one («هل حديث "اطلبوا العلم ولو في الصين" صحيح؟»): the one question that enters.
  const ONLY: Record<string, string[]> = { 'questions.v1.jsonl': ['q048'] }
  for (const f of ['questions.v1.jsonl', 'welcome-retrieval.v1.jsonl', 'fresh-0048.v1.jsonl', 'official12.v1.jsonl'])
    it(`${f}: no other question enters it`, () => {
      const entered = read(f).filter((x) => gradeQuestionOf(x.q) !== null)
      expect(entered.map((x) => x.id)).toEqual(ONLY[f] ?? [])
    })
  it('hadith-retrieval.v1: every grade case does', () => {
    const cases = read('hadith-retrieval.v1.jsonl').filter((x) => x.expected_behavior === 'grade' || /صحيح\?|صحيح؟/.test(x.q))
    expect(cases.length).toBeGreaterThan(0)
    for (const c of cases) expect(gradeQuestionOf(c.q), c.id).not.toBeNull()
  })
})
