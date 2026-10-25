// Writes the bundled definitions of «علّمني الصلاة» for each prayer (add-on 0072-add13): batch 1, the five prayers,
// from the one template (web/src/lessons/prayer/template.js) over the approved lesson's data
// (web/src/lessons/prayer-data.json), in the shape our server will send later batches in (prayers.js validates both).
// worker/test/lessons-0072.test.ts holds the file to the template, so the two never drift apart.
//
//   node scripts/lessons/prayer-texts.mjs   → web/src/lessons/prayer/prayers-texts.json (add-on 0072-add17)
//   node scripts/lessons/prayers.mjs        → web/src/lessons/prayer/prayers-batch-1.json
import fs from 'node:fs'
import path from 'node:path'
import { definitions } from '../../web/src/lessons/prayer/template.js'
import { validate } from '../../web/src/lessons/prayer/prayers.js'

const ROOT = path.resolve(import.meta.dirname, '../..')
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/lessons/prayer-data.json'), 'utf8'))
// the set's own texts (add-on 0072-add17), written by scripts/lessons/prayer-texts.mjs from Ibn Baz's live pages
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/lessons/prayer/prayers-texts.json'), 'utf8'))
const set = definitions(data, texts)
const errs = validate(set, data)
if (errs.length) {
  console.error(errs.join('\n'))
  process.exit(1)
}
const out = { _generated: { by: 'scripts/lessons/prayers.mjs', from: 'web/src/lessons/prayer/template.js' }, ...set }
fs.writeFileSync(path.join(ROOT, 'web/src/lessons/prayer/prayers-batch-1.json'), JSON.stringify(out, null, 1) + '\n')
for (const p of set.prayers) console.log(`${p.id}: ${p.rakat} rakahs, ${p.seq.length} steps alone or as imam, ${p.follower.length} as a follower`)
