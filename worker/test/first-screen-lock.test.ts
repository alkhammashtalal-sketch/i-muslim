import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The visual lock's references (add-on 0072-add28 §4; CLAUDE.md §8): the welcome page, its language picker and the first
// screen of «يومك», taken from build 17 (1071514). They change only with the coordinator's approval line in relay, named
// in web/e2e/first-screen-lock.json beside each image's hash: an image changed without that record fails here.
const WEB = path.resolve(__dirname, '../../web')
const DIR = path.join(WEB, 'e2e/v2-0072-first-screen-lock.spec.ts-snapshots')
const LOCK = JSON.parse(fs.readFileSync(path.join(WEB, 'e2e/first-screen-lock.json'), 'utf8')) as {
  approval: string
  from: string
  files: Record<string, string>
}

describe('the first screens are locked to their approved references', () => {
  it('the record names its approval and the build the references come from', () => {
    expect(LOCK.approval).toMatch(/^relay\/w1\/\S+\.md/)
    expect(LOCK.from).toMatch(/^[0-9a-f]{7}$/)
  })
  it('the six references (three screens, two phones) are there, each with the hash the record approves', () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()
    expect(files).toEqual(Object.keys(LOCK.files).sort())
    for (const kind of ['welcome', 'language', 'today']) for (const size of ['16promax', 'se']) expect(files.some((f) => f.startsWith(`${kind}-${size}-`)), `${kind} ${size}`).toBe(true)
    for (const f of files) expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex'), f).toBe(LOCK.files[f])
  })
})
