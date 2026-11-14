// add-on 0072-add50 §1: every sentence of the current CLAUDE.md is in the short one or in one of the six skills, letter
// for letter after whitespace is made one; and the permission parts (§12 «أذن طلال مسبقًا», §13) are byte-identical.
//   node claude-md-check.mjs <old CLAUDE.md> <new CLAUDE.md> <skills dir>
import fs from 'node:fs'
import path from 'node:path'

const [oldPath, newPath, skillsDir] = process.argv.slice(2)
const old = fs.readFileSync(oldPath, 'utf8')
const neu = fs.readFileSync(newPath, 'utf8')
const skills = fs.readdirSync(skillsDir).filter((d) => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')))
const one = (s) => s.replace(/\s+/g, ' ').trim()
const corpus = one([neu, ...skills.map((d) => fs.readFileSync(path.join(skillsDir, d, 'SKILL.md'), 'utf8'))].join('\n'))

// A sentence ends at «.» «؟» «!» followed by a space, or at the end of a line; list markers and table pipes are not part
// of it, so a cell is checked as its own text.
const sentences = []
for (const line of old.split('\n')) {
  const body = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '').trim()
  if (!body || /^\|?\s*-{3}/.test(body)) continue
  const parts = body.startsWith('|') ? body.split('|').map((c) => c.trim()).filter(Boolean) : [body]
  for (const p of parts) for (const s of p.split(/(?<=[.؟!])\s+/)) if (one(s).length > 2) sentences.push(one(s))
}
const missing = sentences.filter((s) => !corpus.includes(s))

const section = (t, n) => {
  const a = t.indexOf(`\n## ${n}.`)
  const b = t.indexOf('\n## ', a + 1)
  return a < 0 ? '' : t.slice(a, b < 0 ? t.length : b)
}
const grant = (t) => section(t, 12).split('\n').find((l) => l.startsWith('- **أذن طلال مسبقًا')) ?? ''
const s13 = section(old, 13) === section(neu, 13) && section(old, 13).length > 0
const g12 = grant(old) === grant(neu) && grant(old).length > 0

console.log(`skills: ${skills.length} (${skills.join(', ')})`)
console.log(`sentences checked: ${sentences.length}`)
console.log(`missing: ${missing.length}`)
for (const m of missing) console.log(`  - ${m}`)
console.log(`§12 «أذن طلال مسبقًا» byte-identical: ${g12}`)
console.log(`§13 byte-identical: ${s13}`)
console.log(`old: ${old.split('\n').length} lines, ${Buffer.byteLength(old)} bytes; new: ${neu.split('\n').length} lines, ${Buffer.byteLength(neu)} bytes`)
process.exit(missing.length === 0 && g12 && s13 ? 0 : 1)
