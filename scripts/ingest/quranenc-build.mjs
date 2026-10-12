// Build data/processed/meanings.jsonl, the translations of the meanings for D1's ayah_translations (reply 0032 A):
//   27 languages from QuranEnc (data/raw/quranenc, from quranenc-fetch.mjs): text and footnotes as received, the
//   version from MANIFEST, the translator as QuranEnc's title names him in that language when it is one of our ten
//   interface languages (list-{lang}.json), else in English; the part after « - » in the title.
//   Bengali and Malay stay from the Ayat archive (data/processed/ayah_translations.jsonl from ksu-build.mjs) as they
//   are; the archive's Urdu, Indonesian, Turkish, French and Spanish are replaced by QuranEnc. English stays Sahih
//   International (passages.text_en), with no row here.
// Checks (any failure stops): 6,236 ayat per language, no empty text, exactly the (sura, aya) pairs of quran.jsonl.
//   node scripts/ingest/quranenc-build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { KEYS } from './quranenc-fetch.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/quranenc')
const PROCESSED = path.join(ROOT, 'data/processed')
const KEEP_FROM_ARCHIVE = ['bn', 'ms']
const UI = new Set(['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])

const manifest = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8'))
const lists = {}
const listOf = (loc) => (lists[loc] ??= (() => {
  const j = JSON.parse(fs.readFileSync(path.join(RAW, `list-${loc}.json`), 'utf8'))
  return new Map((j.translations ?? j).map((t) => [t.key, t.title]))
})())
const nameOf = (lang, key) => {
  const title = (UI.has(lang) ? listOf(lang) : listOf('en')).get(key) ?? listOf('en').get(key)
  if (!title) throw new Error(`no title for ${key}`)
  const i = title.lastIndexOf(' - ')
  return (i >= 0 ? title.slice(i + 3) : title).trim().replace(/\.$/, '')
}

const pairs = new Set(
  fs.readFileSync(path.join(PROCESSED, 'quran.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'ayah').map((r) => `${r.sura}:${r.aya}`),
)
if (pairs.size !== 6236) throw new Error(`quran.jsonl has ${pairs.size} ayat`)

const out = []
const check = (lang, rows) => {
  const seen = new Set(rows.map((r) => `${r.sura}:${r.aya}`))
  const empty = rows.filter((r) => !String(r.text ?? '').trim())
  const extra = [...seen].filter((k) => !pairs.has(k))
  const missing = [...pairs].filter((k) => !seen.has(k))
  if (rows.length !== 6236 || seen.size !== 6236 || empty.length || extra.length || missing.length)
    throw new Error(`${lang}: ${rows.length} rows, ${empty.length} empty, ${extra.length} extra, ${missing.length} missing`)
}
for (const [lang, key] of Object.entries(KEYS)) {
  const v = manifest.keys?.[key]
  if (!v) throw new Error(`${key} not in MANIFEST: fetch first`)
  const translator = nameOf(lang, key)
  const rows = []
  for (let s = 1; s <= 114; s++) {
    const j = JSON.parse(fs.readFileSync(path.join(RAW, key, `${s}.json`), 'utf8'))
    for (const a of j.result ?? j) rows.push({ lang, sura: Number(a.sura), aya: Number(a.aya), text: a.translation, footnotes: a.footnotes?.trim() ? a.footnotes : null, translator, version: v.version, source_key: key })
  }
  check(lang, rows)
  out.push(...rows)
  console.log(`${lang} ${key} v${v.version} · ${translator}: ${rows.length}, ${rows.filter((r) => r.footnotes).length} with footnotes`)
}
const archive = fs.readFileSync(path.join(PROCESSED, 'ayah_translations.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
for (const lang of KEEP_FROM_ARCHIVE) {
  const rows = archive.filter((r) => r.lang === lang).map((r) => ({ lang, sura: r.sura, aya: r.aya, text: r.text, footnotes: null, translator: r.translator, version: null, source_key: null }))
  check(lang, rows)
  out.push(...rows)
  console.log(`${lang} (Ayat archive) · ${rows[0].translator}: ${rows.length}`)
}
fs.writeFileSync(path.join(PROCESSED, 'meanings.jsonl'), out.map((r) => JSON.stringify(r)).join('\n') + '\n')
console.log(`meanings.jsonl: ${out.length} rows, ${new Set(out.map((r) => r.lang)).size} languages`)
