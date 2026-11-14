// HadeethEnc's own titles of its categories (source ب), for the source line of «قصص من السنة» (reply 0036 part ب):
// the line names the chapters a step's stories were taken from by their ids, and the names come from here, never
// typed. Copied as received from data/raw/hadeethenc/categories-list-ar.json (the saved response of
// https://hadeethenc.com/api/v1/categories/list/?language=ar); only the Arabic list is held, so the names are Arabic
// in every language. Every category is kept, so a step's chapters chosen later need no new run.
//   node scripts/index/hadith-categories.mjs
// writes worker/src/config/hadith-categories.json. It stops if a title is empty or an id repeats.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, 'data/raw/hadeethenc/categories-list-ar.json')
const OUT = path.join(ROOT, 'worker/src/config/hadith-categories.json')

const tree = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const titles = {}
for (const c of [...tree].sort((a, b) => Number(a.id) - Number(b.id))) {
  const id = String(c.id)
  if (!/^\d{1,5}$/.test(id)) throw new Error(`category id «${id}» is not a number`)
  if (id in titles) throw new Error(`category ${id} twice`)
  if (typeof c.title !== 'string' || !c.title.trim()) throw new Error(`category ${id}: no title`)
  titles[id] = c.title
}
const out = {
  _about:
    "HadeethEnc's own titles of its categories, as received (scripts/index/hadith-categories.mjs). The source line of «قصص من السنة» names a step's chapters from here by id (reply 0036 part ب).",
  source: 'https://hadeethenc.com/api/v1/categories/list/?language=ar',
  lang: 'ar',
  titles,
}
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`)
console.log(`${Object.keys(titles).length} categories → ${path.relative(ROOT, OUT)}`)
