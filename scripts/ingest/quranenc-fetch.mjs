// Translations of the meanings of the Quran from QuranEnc (source ط, reply 0032 part A), through its official API,
// one request a second: for each key, /translation/sura/{key}/{sura} for the 114 suras. Raw responses are kept as
// received in data/raw/quranenc/{key}/{sura}.json (outside git); data/raw/quranenc/MANIFEST.json records each key's
// version and last update from /translations/list, the time of the fetch, and every file's sha256. Resumable (a file
// already present and parsable is not fetched again). Any 429 stops the run.
//   node scripts/ingest/quranenc-fetch.mjs
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/quranenc')
export const KEYS = {
  fr: 'french_rashid', es: 'spanish_garcia', tr: 'turkish_rwwad', id: 'indonesian_affairs', ur: 'urdu_junagarhi', hi: 'hindi_omari',
  fa: 'persian_ih', ps: 'pashto_rwwad', ug: 'uyghur_saleh', ku: 'kurdish_bamoki', zh: 'chinese_makin', ta: 'tamil_omar', ml: 'malayalam_kunhi',
  ff: 'fulani_rwwad', ja: 'japanese_saeedsato', vi: 'vietnamese_rwwad', th: 'thai_rwwad', km: 'khmer_rwwad', tl: 'tagalog_rwwad',
  bs: 'bosnian_rwwad', sr: 'serbian_rwwad', az: 'azeri_musayev', uz: 'uzbek_rwwad', ky: 'kyrgyz_hakimov', si: 'sinhalese_mahir',
  te: 'telugu_muhammad', as: 'assamese_rafeeq',
}
const PACE_MS = 1000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function get(url) {
  const wait = last + PACE_MS - Date.now()
  if (wait > 0) await sleep(wait)
  last = Date.now()
  const r = await fetch(url, { headers: { 'user-agent': 'Muslim-app/1.0 (+https://github.com/alkhammashtalal-sketch/i-muslim)' } })
  if (r.status === 429) throw new Error(`429 at ${url}: stopped`)
  if (!r.ok) throw new Error(`${r.status} at ${url}`)
  return r.text()
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  fs.mkdirSync(RAW, { recursive: true })
  const list = JSON.parse(await get('https://quranenc.com/api/v1/translations/list'))
  // The titles localised in our ten interface languages (the translator's name as QuranEnc writes it in each).
  for (const loc of ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']) {
    const f = path.join(RAW, `list-${loc}.json`)
    if (!fs.existsSync(f)) fs.writeFileSync(f, await get(`https://quranenc.com/api/v1/translations/list?localization=${loc}`))
  }
  const byKey = new Map((list.translations ?? list).map((t) => [t.key, t]))
  const manifest = { fetched_at: new Date().toISOString(), api: 'https://quranenc.com/api/v1/', keys: {}, files: {} }
  const missing = Object.values(KEYS).filter((k) => !byKey.has(k))
  if (missing.length) throw new Error(`keys not in /translations/list: ${missing.join(', ')} (stop: no substitute is chosen)`)
  for (const [lang, key] of Object.entries(KEYS)) {
    const t = byKey.get(key)
    manifest.keys[key] = { lang, version: t.version, last_update: t.last_update, title: t.title, language_iso_code: t.language_iso_code }
    fs.mkdirSync(path.join(RAW, key), { recursive: true })
    for (let s = 1; s <= 114; s++) {
      const f = path.join(RAW, key, `${s}.json`)
      let body = null
      if (fs.existsSync(f)) {
        try {
          JSON.parse(fs.readFileSync(f, 'utf8'))
          body = fs.readFileSync(f, 'utf8')
        } catch {}
      }
      if (!body) {
        body = await get(`https://quranenc.com/api/v1/translation/sura/${key}/${s}`)
        JSON.parse(body)
        fs.writeFileSync(f, body)
      }
      manifest.files[`${key}/${s}.json`] = crypto.createHash('sha256').update(body).digest('hex')
    }
    console.log(`${lang} ${key} v${t.version}: 114 suras`)
    fs.writeFileSync(path.join(RAW, 'MANIFEST.json'), JSON.stringify(manifest, null, 1))
  }
  console.log('done')
}
