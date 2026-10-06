// Completeness of the ten interface languages (reviewer's message, 6 October 12:15).
//
//   node scripts/i18n-check.mjs [--strict]
//
// For web/src/i18n/*.ts and every other string module (recitation, voice mode, verify, sources bar, suggestions,
// starter path), against English:
//   missing   a key of English absent or empty in another language;
//   vars      the placeholders ({n}, {name}, …) differ;
//   same      the text equals English in another language (not translated), except names and symbols;
//   latin     Latin letters inside an Arabic, Urdu, Hindi or Bengali text, except named exceptions.
// Prints the share of complete texts per language and every problem by its key. --strict exits 1 on missing/vars.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'web/src')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const NON_LATIN = new Set(['ar', 'ur', 'hi', 'bn'])
const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href)

// Names and symbols that are the same in every language, or Latin by nature (exceptions, by name).
const KEEP = [
  /^https?:\/\//,
  /mp3quran\.net/,
  /^Sahih International$/,
  /DeepSeek/,
  /Workers AI|Cloudflare|Whisper|GitHub/,
  /^i$|\bi\b(?= ?logo|$)/, // the «i» mark
]
const LATIN_OK_KEYS = new Set(['logoI'])
// Deliberate, by design (named): Arabic needs no «the tafsir is in Arabic» note, and Arabic titles use the sura's name
// where the others use its number.
const EMPTY_BY_DESIGN = new Set(['ar:tafsirInArabic', 'ar:booksInArabic', 'ar:packageArabic'])
const VARS_BY_DESIGN = new Set(['ar:ayahSheetTitle', 'ar:askAboutAyahDraft'])
// Plural forms: only «other» is required; a language uses the forms its plural rules have.
const pluralForm = (key) => /\.(zero|one|two|few|many)$/.test(key)
const keepText = (s) => KEEP.some((r) => r.test(s))
// Latin runs that are allowed inside a non-Latin text: links, the platform's name, the «i» mark, a placeholder.
const stripAllowed = (s) =>
  s
    .replace(/https?:\/\/\S+/g, '')
    .replace(/mp3quran\.net|sunnah\.com/gi, '')
    .replace(/Sahih International/g, '')
    .replace(/IBM Plex Sans Arabic|Amiri|SIL Open Font License|\bOFL\b|\bMIT\b/g, '')
    .replace(/\{[a-zA-Z]+\}/g, '')
    .replace(/(^|[^A-Za-z])i([^A-Za-z]|$)/g, '$1$2')
const vars = (s) => [...String(s).matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort().join(',')

/** Flattens a strings object into key → text (nested objects and arrays by dotted keys). */
function flat(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    if (k.startsWith('_')) continue
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flat(v, key, out)
    else out[key] = v
  }
  return out
}

const sets = []
// 1. i18n/*.ts: one module per language.
const i18n = {}
for (const l of LANGS) i18n[l] = flat((await imp(`i18n/${l}.ts`)).default)
sets.push({ name: 'i18n', byLang: i18n })
// 2. The other modules: Record<Lang, …>.
const records = [
  ['quran/recitation-strings.ts', 'RECITATION'],
  ['voice/voicemode-strings.ts', 'VOICE_MODE'],
  ['verify/strings.ts', 'VERIFY'],
  ['components/witness-strings.ts', 'WITNESS'],
  ['trust/reviewed-strings.ts', 'REVIEWED'],
  ['voice/mic-strings.ts', 'MIC'],
  ['trust/level-strings.ts', 'LEVELS'],
  ['config/suggestions.ts', 'SUGGESTIONS'],
]
for (const [file, name] of records) {
  const m = (await imp(file))[name]
  sets.push({ name: file, byLang: Object.fromEntries(LANGS.map((l) => [l, flat(m[l])])) })
}
// 3. The starter path: steps × {title, q} × language.
const steps = JSON.parse(fs.readFileSync(path.join(SRC, 'config/starter-path.json'), 'utf8')).steps
sets.push({
  name: 'config/starter-path.json',
  byLang: Object.fromEntries(LANGS.map((l) => [l, Object.fromEntries(steps.flatMap((s) => [[`${s.id}.title`, s.title[l]], [`${s.id}.q`, s.q[l]]]))])),
})

const problems = []
const tally = Object.fromEntries(LANGS.map((l) => [l, { total: 0, ok: 0 }]))
for (const set of sets) {
  const en = set.byLang.en
  const keys = new Set([...Object.keys(en), ...LANGS.flatMap((l) => Object.keys(set.byLang[l] ?? {}).filter((k) => !pluralForm(k) || k.endsWith('.other')))])
  for (const key of keys) {
    if (pluralForm(key)) continue
    const enText = en[key] ?? ''
    for (const l of LANGS) {
      const t = set.byLang[l]?.[key]
      tally[l].total++
      const add = (kind, detail) => problems.push({ set: set.name, lang: l, key, kind, detail })
      let ok = true
      if (t === undefined || t === null || String(t).trim() === '') {
        if (EMPTY_BY_DESIGN.has(`${l}:${key}`)) tally[l].ok++
        else add('missing', '')
        continue
      }
      if (vars(t) !== vars(enText) && !VARS_BY_DESIGN.has(`${l}:${key}`)) {
        add('vars', `${vars(t) || '—'} ≠ en ${vars(enText) || '—'}`)
        ok = false
      }
      if (l !== 'en' && t === enText && /[A-Za-z]{3,}/.test(t) && !keepText(t)) {
        add('same', String(t).slice(0, 70))
        ok = false
      }
      if (NON_LATIN.has(l) && !LATIN_OK_KEYS.has(key) && /[A-Za-z]{2,}/.test(stripAllowed(String(t))) && !keepText(String(t))) {
        add('latin', String(t).slice(0, 90))
        ok = false
      }
      if (ok) tally[l].ok++
    }
  }
}

console.log('Completeness (texts with no problem / all texts), against English:\n')
console.log('| language | complete | missing | vars | same as English | Latin in text |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const l of LANGS) {
  const p = problems.filter((x) => x.lang === l)
  const c = (k) => p.filter((x) => x.kind === k).length
  console.log(`| ${l} | ${((100 * tally[l].ok) / tally[l].total).toFixed(1)}% (${tally[l].ok}/${tally[l].total}) | ${c('missing')} | ${c('vars')} | ${c('same')} | ${c('latin')} |`)
}
for (const kind of ['missing', 'vars', 'same', 'latin']) {
  const p = problems.filter((x) => x.kind === kind)
  if (!p.length) continue
  console.log(`\n## ${kind} (${p.length})\n`)
  for (const x of p) console.log(`- ${x.lang} · ${x.set} · ${x.key}${x.detail ? ` — ${x.detail}` : ''}`)
}
if (process.argv.includes('--strict') && problems.some((x) => x.kind === 'missing' || x.kind === 'vars')) process.exit(1)
