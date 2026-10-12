// Human reference translations for English and Hindi on the 45 ayat of the judged set (reply 0031-add11), from
// QuranEnc's official API, one request a second: english_saheeh and hindi_omari. The other seven languages take their
// reference from data/processed/ayah_translations.jsonl. Writes eval/aligned-gate/refs-en-hi.jsonl (key, version, url);
// 45 ayat per translation is more than the 20-item sample rule, so the file stays out of git.
//   node eval/aligned-gate/fetch-refs-en-hi.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'eval/aligned-gate/refs-en-hi.jsonl')
const KEYS = { en: 'english_saheeh', hi: 'hindi_omari' }
const ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/explain-set.v1.json'), 'utf8')).ayat.map((a) => a.id)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const versions = {}
for (const [lang, key] of Object.entries(KEYS)) {
  const l = await (await fetch(`https://quranenc.com/api/v1/translations/list/${lang}`)).json()
  versions[key] = (l.translations ?? l).find((t) => t.key === key)?.version ?? null
  await sleep(1000)
}
const rows = []
for (const id of ids) {
  const [, s, a] = id.split(':')
  for (const [lang, key] of Object.entries(KEYS)) {
    const url = `https://quranenc.com/api/v1/translation/aya/${key}/${s}/${a}`
    const r = await fetch(url)
    if (r.status === 429) throw new Error('429 from QuranEnc: stopped')
    const j = await r.json()
    rows.push({ id, lang, key, version: versions[key], url, text: j.result?.translation ?? null, footnotes: j.result?.footnotes ?? null })
    await sleep(1000)
  }
}
fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
console.log(`${rows.length} references (${rows.filter((r) => r.text).length} with text); versions ${JSON.stringify(versions)}`)
