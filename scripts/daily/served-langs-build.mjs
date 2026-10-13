// The languages «مسلم» serves content in, and the badges of each (reply 0033 §أ1; the rule of reply 0033-add2 §2),
// computed from the data next is built from, never from a list on a board:
//   ar   the original texts: the Quran (quran.jsonl), al-Muyassar and al-Saʿdi beside it, HadeethEnc's Arabic rows
//        with their explanation;
//   en   Sahih International beside the Quran (quran.jsonl text_en, source أ) and HadeethEnc's English rows;
//   the rest: a human translation of the meanings in data/processed/meanings.jsonl (what worker/src/meaning.ts
//        serves: QuranEnc's 27 keys, source ط, and the Ayat archive's Bengali and Malay, source أ).
// For each: the meanings (rows, source), al-Mukhtasar as QuranEnc serves it (its *_mokhtasar keys in
// data/raw/quranenc-mokhtasar, with all 114 suras fetched; Arabic and Italian are stored and never shown, so they do
// not count: worker/src/mukhtasar.ts), and HadeethEnc's rows in that language (data/processed/hadith.jsonl and
// hadith_weak.jsonl, both loaded on next and shown: the weak with their badge) with how many carry an explanation, and
// how many of those are hadiths shown in Arabic (the Arabic rows of the same two files): `of_arabic`, and its share of
// the Arabic rows, `percent`. Then the badges (scripts/daily/served-langs-rule.mjs; reply 0033-add2 §2), which say
// what is missing:
//   «كامل»                   (full)            meanings, al-Mukhtasar, and hadiths with their explanation for 90% or
//                                              more of the hadiths shown in Arabic (Arabic: the originals); alone;
//   «بدون تفسير مترجم»       (no-tafsir)       no al-Mukhtasar in that language;
//   «بعض الأحاديث بالعربية»  (some-hadith-ar)  hadiths with their explanation for less than 90%, and more than none;
//   «الأحاديث بالعربية»      (hadith-ar)       no hadith with its explanation in that language.
// Also the direction of the content's script, read from the meanings' own letters (Kurdish in QuranEnc is Central
// Kurdish in Arabic script, though CLDR's «ku» is Kurmanji in Latin letters: its own name is read under «ckb»), and
// each language's names from Intl.DisplayNames (CLDR, Node's full ICU): in itself, and in the ten interface languages.
// They are written here rather than asked of the browser, because a browser with trimmed locale data (Chrome has no
// Assamese, Uyghur or Pashto display names) answers in its own default language instead: «الأسامية» as Assamese's
// own name.
//   node scripts/daily/served-langs-build.mjs      → data/served-langs.json (tracked; checked in worker/test)
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { BADGES, badgesOf, hadithPercent } from './served-langs-rule.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const P = (...x) => path.join(ROOT, ...x)
const QURAN = P('data/processed/quran.jsonl')
const MEANINGS = P('data/processed/meanings.jsonl')
const HADITH = P('data/processed/hadith.jsonl')
const HADITH_WEAK = P('data/processed/hadith_weak.jsonl')
const MOKHTASAR = P('data/raw/quranenc-mokhtasar')
const OUT = P('data/served-langs.json')

for (const f of [QURAN, MEANINGS, HADITH, HADITH_WEAK, path.join(MOKHTASAR, 'MANIFEST.json')])
  if (!fs.existsSync(f)) throw new Error(`${path.relative(ROOT, f)} is missing (run the ingest first)`)

// The key prefix → language code, as scripts/ingest/quranenc-mokhtasar-build.mjs stores them.
const MOKHTASAR_LANG = {
  arabic: 'ar', french: 'fr', spanish: 'es', italian: 'it', bosnian: 'bs', turkish: 'tr', azeri: 'az', serbian: 'sr', uzbek: 'uz', kyrgyz: 'ky',
  indonesian: 'id', tagalog: 'tl', chinese: 'zh', uyghur: 'ug', japanese: 'ja', vietnamese: 'vi', thai: 'th', khmer: 'km', persian: 'fa',
  kurdish: 'ku', pashto: 'ps', hindi: 'hi', bengali: 'bn', telugu: 'te', malayalam: 'ml', assamese: 'as', tamil: 'ta', sinhalese: 'si', fulani: 'ff',
}
// Stored, never served (worker/src/mukhtasar.ts NOT_SHOWN).
const MOKHTASAR_NOT_SHOWN = new Set(['ar', 'it'])

async function* lines(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const l of rl) if (l.trim()) yield JSON.parse(l)
}

// Strong letters of the Arabic script (Arabic, Persian, Urdu, Pashto, Uyghur, Kurdish) against any other letter.
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/gu
const ANY_LETTER = /\p{L}/gu
const scriptOf = (texts) => {
  let arab = 0
  let all = 0
  for (const t of texts) {
    arab += (t.match(ARABIC_SCRIPT) ?? []).length
    all += (t.match(ANY_LETTER) ?? []).length
  }
  return all && arab / all > 0.5 ? 'Arab' : 'other'
}

// 1. The Quran, its two tafsirs and Sahih International (source أ).
const quran = { ayat: 0, text: 0, en: 0, muyassar: 0, saadi: 0 }
const sampleEn = []
for await (const r of lines(QURAN)) {
  if (r.kind !== 'ayah') continue
  quran.ayat++
  if (String(r.text ?? '').trim()) quran.text++
  if (String(r.text_en ?? '').trim()) {
    quran.en++
    if (sampleEn.length < 50) sampleEn.push(r.text_en)
  }
  if (String(r.muyassar ?? '').trim()) quran.muyassar++
  if (String(r.saadi ?? '').trim()) quran.saadi++
}
if (quran.ayat !== 6236) throw new Error(`quran.jsonl has ${quran.ayat} ayat, not 6236`)

// 2. The human translations of the meanings (what ayah_translations holds on next).
const meanings = new Map() // lang → { rows, source_key, translator, version, sample: [] }
for await (const r of lines(MEANINGS)) {
  if (!String(r.text ?? '').trim()) continue
  const m = meanings.get(r.lang) ?? { rows: 0, source_key: r.source_key ?? null, translator: r.translator ?? null, version: r.version ?? null, sample: [] }
  m.rows++
  if (m.sample.length < 50) m.sample.push(r.text)
  meanings.set(r.lang, m)
}

// 3. Al-Mukhtasar as QuranEnc serves it: every key with its 114 suras fetched, minus those never shown.
const manifest = JSON.parse(fs.readFileSync(path.join(MOKHTASAR, 'MANIFEST.json'), 'utf8'))
const mukhtasar = new Map() // lang → key
for (const key of Object.keys(manifest.keys)) {
  const lang = MOKHTASAR_LANG[key.replace(/_mokhtasar$/, '')]
  if (!lang) throw new Error(`no language for ${key}`)
  if (MOKHTASAR_NOT_SHOWN.has(lang)) continue
  const dir = path.join(MOKHTASAR, key)
  const suras = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{1,3}\.json$/.test(f)).length : 0
  if (suras !== 114) throw new Error(`${key}: ${suras} suras fetched, not 114`)
  mukhtasar.set(lang, key)
}

// 4. HadeethEnc rows per language (both files: what load-hadith.mjs loads on next), how many carry an explanation,
// and which ids those are; the hadiths shown in Arabic are the Arabic rows.
const hadith = new Map() // lang → { rows, explained, ids: Set of the ids with an explanation }
for (const file of [HADITH, HADITH_WEAK])
  for await (const r of lines(file)) {
    const h = hadith.get(r.lang) ?? { rows: 0, explained: 0, ids: new Set() }
    h.rows++
    if (String(r.explanation ?? '').trim()) {
      h.explained++
      h.ids.add(String(r.id))
    }
    hadith.set(r.lang, h)
  }
const shownAr = new Set()
for (const file of [HADITH, HADITH_WEAK]) for await (const r of lines(file)) if (r.lang === 'ar') shownAr.add(String(r.id))
if (!shownAr.size) throw new Error('no Arabic hadith rows')

// Names by Intl.DisplayNames, only from a locale that really resolves to that language (never a fallback locale).
const UI = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const nameIn = (locale, code) => {
  const dn = new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' })
  const got = dn.resolvedOptions().locale.split('-')[0]
  if (got !== locale.split('-')[0] && !(locale === 'tl' && got === 'fil')) throw new Error(`no ${locale} names in this ICU (${got})`)
  const n = dn.of(code)
  if (!n) throw new Error(`no name for ${code} in ${locale}`)
  return n
}

// 5. Every language with content, and its badges.
const codes = ['ar', 'en', ...[...meanings.keys()].filter((c) => c !== 'ar' && c !== 'en')]
const langs = []
for (const code of codes) {
  const h = hadith.get(code) ?? { rows: 0, explained: 0, ids: new Set() }
  const ofArabic = [...h.ids].filter((id) => shownAr.has(id)).length
  let m
  if (code === 'ar') m = { rows: quran.text, source: 'quran.ksu.edu.sa (أ): the Quran, al-Muyassar and al-Saʿdi', script: 'Arab' }
  else if (code === 'en') m = { rows: quran.en, source: 'quran.ksu.edu.sa (أ): Sahih International', script: scriptOf(sampleEn) }
  else {
    const x = meanings.get(code)
    m = { rows: x.rows, source: x.source_key ? `quranenc.com (ط): ${x.source_key} v${x.version}` : `quran.ksu.edu.sa (أ): ${x.translator}`, script: scriptOf(x.sample) }
  }
  const hasMeanings = code === 'ar' ? quran.text === 6236 && quran.muyassar > 0 && quran.saadi > 0 : m.rows > 0
  const hasMukhtasar = code === 'ar' ? true : mukhtasar.has(code)
  const badges = badgesOf({ meanings: hasMeanings, mukhtasar: hasMukhtasar, explained: ofArabic, shownAr: shownAr.size })
  const self = code === 'ku' && m.script === 'Arab' ? 'ckb' : code
  langs.push({
    code,
    ...(self !== code ? { names_as: self } : {}),
    names: { self: nameIn(self, self), ...Object.fromEntries(UI.map((u) => [u, nameIn(u, code)])) },
    dir: m.script === 'Arab' ? 'rtl' : 'ltr',
    badges,
    meanings: { rows: m.rows, source: m.source },
    mukhtasar: code === 'ar' ? 'the original (al-Muyassar and al-Saʿdi)' : (mukhtasar.get(code) ?? null),
    hadith: { rows: h.rows, explained: h.explained, of_arabic: ofArabic, percent: hadithPercent(ofArabic, shownAr.size) },
  })
}

const out = {
  icu: process.versions.icu,
  _about:
    'The languages next serves content in (reply 0033 §أ1), built by scripts/daily/served-langs-build.mjs from data/processed/quran.jsonl, meanings.jsonl, hadith.jsonl, hadith_weak.jsonl and data/raw/quranenc-mokhtasar; checked in worker/test/lang-picker.test.ts. badges (reply 0033-add2 §2, scripts/daily/served-langs-rule.mjs), saying what is missing: «full» = «كامل» (meanings, al-Mukhtasar, and hadiths with their explanation for 90% or more of the hadiths shown in Arabic; Arabic: the originals; alone), «no-tafsir» = «بدون تفسير مترجم» (no al-Mukhtasar), «some-hadith-ar» = «بعض الأحاديث بالعربية» (hadiths with their explanation for less than 90% of those shown in Arabic, and more than none), «hadith-ar» = «الأحاديث بالعربية» (none). hadith: rows and explained in that language; of_arabic, the explained rows whose hadith is shown in Arabic; percent, of_arabic over hadith_shown_ar.',
  quran: { ayat: quran.ayat, sahih_international: quran.en, muyassar: quran.muyassar, saadi: quran.saadi },
  hadith_shown_ar: shownAr.size,
  langs,
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`${langs.length} languages → ${path.relative(ROOT, OUT)}; hadiths shown in Arabic: ${shownAr.size}`)
for (const b of BADGES) console.log(`${b}: ${langs.filter((l) => l.badges.includes(b)).map((l) => l.code).join(', ') || '—'}`)
console.log('| lang | badges | hadith rows | explained | of the Arabic | percent |')
for (const l of langs) console.log(`| ${l.code} | ${l.badges.join(' + ')} | ${l.hadith.rows} | ${l.hadith.explained} | ${l.hadith.of_arabic} | ${l.hadith.percent}% |`)
