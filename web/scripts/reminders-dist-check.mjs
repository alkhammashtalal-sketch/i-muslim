// The reminders' hadiths stay out of the app until the coordinator approves them (add-on 0072-add30 §5, 0072-add34
// §أ3; the Opus review of c9b80f1): with REMINDER_VIRTUE off (no VITE_REMINDER_VIRTUE=1), no file of the build may hold
// any of their quotes, in any language, raw or \u-escaped. Run after `vite build` (npm run build, build:native).
// One place is not this branch's: the adhkar categories of the app's offline copy (dist/offline/adhkar/*, from D1's
// categories, web/scripts/native-offline-gen.ts) carry their own hadiths whole, and 65928 is one of category 302's
// adhkar since before the reminders. There the check asks only that no reminder hadith comes by the reminders: none
// of their ids in dist/offline/hadith/ (reminderHadithIds() is empty while REMINDER_VIRTUE is off).
//   node scripts/reminders-dist-check.mjs [dist]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.resolve(web, process.argv[2] ?? 'dist')
if (process.env.VITE_REMINDER_VIRTUE === '1') {
  console.log('reminders-dist-check: VITE_REMINDER_VIRTUE=1, the hadiths are meant to be in this build: skipped')
  process.exit(0)
}
const data = JSON.parse(fs.readFileSync(path.join(web, '../data/reminders.json'), 'utf8'))
const esc = (s) => s.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
const needles = []
for (const [k, h] of Object.entries(data.hadiths))
  for (const [lang, q] of Object.entries(h.quote)) {
    // A fragment long enough to be the hadith's own words: the first 24 characters of the quote.
    const f = q.slice(0, 24)
    needles.push({ k, lang, f }, { k, lang, f: esc(f) }, { k, lang, f: esc(f).toUpperCase().replace(/\\U/g, '\\u') })
  }
const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(js|mjs|json|html|css|txt|map|webmanifest)$/.test(e.name)) files.push(p)
  }
}
if (!fs.existsSync(dist)) {
  console.error(`reminders-dist-check: ${dist} is missing (build first)`)
  process.exit(2)
}
walk(dist)
const found = []
const ids = new Set(Object.values(data.hadiths).map((h) => h.id))
const hadithDir = path.join(dist, 'offline/hadith')
if (fs.existsSync(hadithDir))
  for (const f of fs.readdirSync(hadithDir)) if (ids.has(f.split('.')[0])) found.push(`${path.relative(web, path.join(hadithDir, f))}: a reminder hadith in the app's copy`)
const adhkarDir = path.join(dist, 'offline/adhkar') + path.sep
for (const f of files) {
  if (f.startsWith(adhkarDir)) continue
  const s = fs.readFileSync(f, 'utf8')
  for (const n of needles) if (s.includes(n.f)) found.push(`${path.relative(web, f)}: ${n.k} (${n.lang}) «${n.f}»`)
}
if (found.length) {
  console.error(`reminders-dist-check: the reminders' hadiths are in the build while REMINDER_VIRTUE is off:\n  ${[...new Set(found)].join('\n  ')}`)
  process.exit(1)
}
console.log(`reminders-dist-check: none of the ${Object.keys(data.hadiths).length} hadiths' quotes in ${files.length} files of ${path.relative(web, dist)}`)
