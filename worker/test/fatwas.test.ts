// data/fatwas.json (reply 0031-add14): the named fatwas and the book passage, copied from their pages, with full links.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const d = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/fatwas.json'), 'utf8'))

describe('named fatwas and passages', () => {
  it('the four Ibn Baz fatwas: full link (number and title slug), question and answer present', () => {
    expect(d.fatwas.map((f: { number: string }) => f.number).sort()).toEqual(['10693', '12348', '13471', '15824'])
    for (const f of d.fatwas) {
      expect(f.url).toMatch(new RegExp(`^https://binbaz\\.org\\.sa/fatwas/${f.number}/.+`))
      expect(f.question.length).toBeGreaterThan(20)
      expect(f.answer.length).toBeGreaterThan(100)
    }
  })
  it('the words the forbidden-times screen quotes are in the answers as written', () => {
    const a = (n: string) => d.fatwas.find((f: { number: string }) => f.number === n).answer
    expect(a('10693')).toContain('بعد طلوع الشمس إلى أن ترتفع قيد رمح')
    expect(a('12348')).toContain('والوقت ليس بالطويل يقارب ربع ساعة أو ثلث ساعة')
    expect(d.books[0]).toMatchObject({ volume: 4, page: 88, url: 'https://shamela.ws/book/10649/1319#p2' })
    expect(d.books[0].passage).toContain('بنحو عشر دقائق')
  })
  it('the one sentence the calendar shows from 13471 is in its answer as written (reply 0031-add16 §5)', () => {
    const a = d.fatwas.find((f: { number: string }) => f.number === '13471').answer
    expect(a).toContain('الاحتفال بالموالد ليس بمشروع، بل هو من البدع')
  })
})
