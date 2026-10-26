// The reminders' hadiths in the build, by the approved rule (add-on 0072-add48, which approved
// relay/w1/0072-review-queue/reminders.html; add-on 0072-add30 §5). Run after `vite build` (npm run build, build:native).
//   node scripts/reminders-dist-check.mjs [dist]
// 1. data/reminders.json holds exactly the four approved entries, each unchanged since the approval (its id, version,
//    quotes, grade and takhrij lines, hashed below): a new or edited text fails here until it is reviewed again.
// 2. They ship: each approved Arabic quote is in the build's code (REMINDER_VIRTUE is on), and in the app's offline copy
//    each of the four ids has its files (dist/offline/hadith/, the native build).
// 3. Nothing else ships by the reminders: none of the hadiths behind the days not reminded, 10603 (the two Eids) and
//    65519 (Tashreeq), which the review saw as evidence and which are not shown. data/reminders.json names no other
//    hadith; the code that carries the reminders (the chunks holding their quotes) has none of those two's words
//    (diacritics set aside); and the offline copy has no file of theirs. Elsewhere the app has its own reviewed use of
//    them: the calendar's «أيام التشريق» carries 65519's words as its evidence (data/calendar-events.json), so the
//    words are looked for in the reminders' code only.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.resolve(web, process.argv[2] ?? 'dist')
/** The approved entries (add-on 0072-add48): kind → id and the SHA-256 of the entry as data/reminders.json holds it. */
const APPROVED = {
  friday: ['65928', 'a40fd59879691adc27d652fa4087e96efadf20cf6f406769b5eaec3dc10426b3'],
  fastBid: ['10108', 'c6a7180713af4092678c97241c46837f8f7aba40b4303a42a09188f023b164ff'],
  fastMonThu: ['5908', '93008c5e213ca7957f34c45b5610c3c8f7ea06b208a5799a6d27259fa296d846'],
  nameDay: ['64673', '662c21a41afd6d2a21ffcd3a5dc43a408c7cb30ffb0df879623fa5dd896a5c00'],
}
/** Not shown, not shipped by the reminders: the evidence for the days with no reminder, and words of each. */
const NOT_SHIPPED = { 10603: 'ولا صوم في يومين', 65519: 'أيام التشريق أيام أكل وشرب' }

const fail = []
const data = JSON.parse(fs.readFileSync(path.join(web, '../data/reminders.json'), 'utf8'))
const kinds = Object.keys(data.hadiths)
if (JSON.stringify(kinds.sort()) !== JSON.stringify(Object.keys(APPROVED).sort())) fail.push(`data/reminders.json: reminders ${kinds.join(', ')}, approved ${Object.keys(APPROVED).join(', ')}`)
for (const [k, [id, sha]] of Object.entries(APPROVED)) {
  const h = data.hadiths[k]
  if (!h) continue
  if (h.id !== id) fail.push(`data/reminders.json: ${k} is ${h.id}, approved ${id}`)
  const got = crypto.createHash('sha256').update(JSON.stringify(h)).digest('hex')
  if (got !== sha) fail.push(`data/reminders.json: ${k} (${h.id}) changed since its approval (sha256 ${got.slice(0, 12)}…)`)
}

if (!fs.existsSync(dist)) {
  console.error(`reminders-dist-check: ${dist} is missing (build first)`)
  process.exit(2)
}
const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(js|mjs|json|html|css|txt|map|webmanifest)$/.test(e.name)) files.push(p)
  }
}
walk(dist)
const strip = (s) => s.replace(/[ً-ْٰـ]/g, '')
const codeFiles = files.filter((f) => /\.(js|mjs)$/.test(f) && !f.includes(`${path.sep}offline${path.sep}`))
const code = codeFiles.map((f) => fs.readFileSync(f, 'utf8'))
const ownIds = new Set(JSON.stringify(data.hadiths).match(/"id":"\d+"/g) ?? [])
if (ownIds.size !== Object.keys(APPROVED).length) fail.push(`data/reminders.json: hadith ids ${[...ownIds].join(', ')}`)
const holders = new Set()
for (const [k, [id]] of Object.entries(APPROVED)) {
  const q = data.hadiths[k]?.quote.ar
  const at = code.findIndex((s) => q && s.includes(q))
  if (at < 0) fail.push(`${k} (${id}): its approved quote is not in the build's code (REMINDER_VIRTUE off?)`)
  else holders.add(at)
}
for (const i of holders)
  for (const [id, w] of Object.entries(NOT_SHIPPED)) {
    // The whole chunk (bells-*.js today). Should a later build fold it into a chunk that also holds the calendar, this
    // fails on the calendar's own words: look, then narrow it here, rather than let the reminders carry them.
    if (strip(code[i]).includes(w)) fail.push(`the reminders' code (${path.relative(web, codeFiles[i])}): words of ${id} («${w}»)`)
  }
const hadithDir = path.join(dist, 'offline/hadith')
if (fs.existsSync(hadithDir)) {
  const have = new Set(fs.readdirSync(hadithDir).map((f) => f.split('.')[0]))
  for (const [k, [id]] of Object.entries(APPROVED)) if (!have.has(id)) fail.push(`dist/offline/hadith: no ${id} (${k}) in the app's copy`)
  for (const id of Object.keys(NOT_SHIPPED)) if (have.has(id)) fail.push(`dist/offline/hadith: ${id} is in the app's copy`)
}

if (fail.length) {
  console.error(`reminders-dist-check: the build does not carry the approved reminders and only them:\n  ${[...new Set(fail)].join('\n  ')}`)
  process.exit(1)
}
console.log(`reminders-dist-check: the 4 approved hadiths (${Object.values(APPROVED).map((a) => a[0]).join(', ')}) ship as approved, and 10603 and 65519 do not, in ${files.length} files of ${path.relative(web, dist)}`)
