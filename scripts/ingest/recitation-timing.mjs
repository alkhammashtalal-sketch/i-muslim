// Human recitation for every ayah (commands 17 and 20, Talal's decisions of 6 October): ayah timings from
// mp3quran.net, a platform listed in the challenge's scientific package. Audio only: the ayah text stays from source
// (أ). The audio files are not copied or hosted here; the app plays them from mp3quran's own servers.
//
//   node scripts/ingest/recitation-timing.mjs [--force]
//
// 1. Reciters, in this order, at most six: Abdulrahman al-Sudais, Saud al-Shuraim, Mishary al-Afasy, then whoever
//    qualifies of Mahmoud Khalil al-Husary, Abdulbasit Abdulsamad, Muhammad Siddiq al-Minshawi, Ahmad al-Ajmi,
//    Nasser al-Qatami, Yasser al-Dosari. A reciter qualifies with a timed moshaf in /api/v3/ayat_timing/reads labelled
//    with the Hafs narration and timings for all 114 suras, every one of which passes the checks below. No narration
//    is guessed (Maher al-Muaiqly's only timed moshaf is labelled «المصحف المجود», so he is not on the list).
// 2. The sura audio: the reciter's server from /api/v3/reciters (the moshaf of that read) + the sura in three digits.
//    Names in Arabic and English as mp3quran gives them (/reciters?language=ar and language=eng), never our own.
// 3. Checks for each sura: as many timed ayat as in D1 (data/processed/quran.jsonl; an "ayah 0" is the basmala and is
//    kept apart), start < end, starts increasing, no negative gap.
// Output: web/public/recitation/{read}/{sura}.json and index.json (not precached by the service worker), and
// web/src/config/recitation.json. Raw API responses are kept in data/raw/recitation/ (not in git).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const RAW = path.join(ROOT, 'data/raw/recitation')
const API = 'https://www.mp3quran.net/api/v3'
const ORDER = [
  'عبدالرحمن السديس',
  'سعود الشريم',
  'مشاري العفاسي',
  'محمود خليل الحصري',
  'عبدالباسط عبدالصمد',
  'محمد صديق المنشاوي',
  'أحمد بن علي العجمي',
  'ناصر القطامي',
  'ياسر الدوسري',
]
const MAX = 6
const force = process.argv.includes('--force')
fs.mkdirSync(RAW, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getJson(url, file) {
  const p = path.join(RAW, file)
  if (!force && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  for (let attempt = 1; ; attempt++) {
    // A dropped connection is retried like an HTTP error (the raw cache lets a run resume where it stopped).
    const r = await fetch(url, { headers: { 'user-agent': 'muslim-app-ingest/1.0 (timings only; one request at a time)' } }).catch((e) => {
      if (attempt >= 3) throw e
      return null
    })
    if (!r) {
      await sleep(2000 * attempt)
      continue
    }
    if (r.ok) {
      const body = await r.text()
      fs.writeFileSync(p, body)
      await sleep(400)
      return JSON.parse(body)
    }
    if (attempt >= 3) throw new Error(`${url}: HTTP ${r.status}`)
    await sleep(2000 * attempt)
  }
}
const fold = (s) => s.replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/\s+/g, '')

const reads = await getJson(`${API}/ayat_timing/reads`, 'reads.json')
const recitersAr = (await getJson(`${API}/reciters?language=ar`, 'reciters-ar.json')).reciters
const recitersEn = (await getJson(`${API}/reciters?language=eng`, 'reciters-eng.json')).reciters
const counts = new Map()
for (const line of fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(line)
  counts.set(r.sura, Math.max(counts.get(r.sura) ?? 0, r.aya))
}

/** The 114 suras of a read, checked; the failures with their reasons. */
async function timings(read) {
  const files = []
  const failed = []
  for (let n = 1; n <= 114; n++) {
    const t = await getJson(`${API}/ayat_timing?surah=${n}&read=${read}`, `t-${read}-${n}.json`)
    const basmala = t.find((x) => Number(x.ayah) === 0)
    const ayat = t.filter((x) => Number(x.ayah) > 0).map((x) => [Number(x.ayah), Number(x.start_time), Number(x.end_time)])
    const problems = []
    if (ayat.length !== counts.get(n)) problems.push(`${ayat.length} timed ayat, D1 has ${counts.get(n)}`)
    ayat.forEach(([a, s, e], i) => {
      if (a !== i + 1) problems.push(`ayah ${a} at position ${i + 1}`)
      if (!(s < e)) problems.push(`ayah ${a}: start ${s} ≥ end ${e}`)
      if (i && s < ayat[i - 1][1]) problems.push(`ayah ${a}: start before the previous ayah's`)
      if (i && s < ayat[i - 1][2]) problems.push(`ayah ${a}: negative gap ${s - ayat[i - 1][2]} ms`)
    })
    if (problems.length) failed.push({ sura: n, problems: problems.slice(0, 3) })
    else files.push({ n, ayat, basmala })
  }
  return { files, failed }
}

const chosen = []
const table = []
for (const name of ORDER) {
  if (chosen.length >= MAX) {
    table.push({ name, result: 'not needed (six chosen)' })
    continue
  }
  const all = reads.filter((x) => fold(x.name) === fold(name))
  const r = all.find((x) => /حفص/.test(x.rewaya) && Number(x.soar_count) === 114)
  if (!r) {
    table.push({ name, result: all.length ? `skipped: ${all.map((x) => `read ${x.id} «${x.rewaya}», ${x.soar_count} suras`).join('; ')}` : 'not in the timing list' })
    continue
  }
  const moshafAr = recitersAr.flatMap((x) => x.moshaf.map((m) => ({ ...m, reciter: x }))).find((m) => m.id === r.id)
  if (!moshafAr) {
    table.push({ name, read: r.id, result: 'skipped: no moshaf with this id in /reciters' })
    continue
  }
  const en = recitersEn.find((x) => x.id === moshafAr.reciter.id)?.name ?? null
  const server = moshafAr.server.endsWith('/') ? moshafAr.server : `${moshafAr.server}/`
  const { files, failed } = await timings(r.id)
  if (failed.length) {
    table.push({ name, read: r.id, result: `skipped: ${failed.length} sura(s) fail the checks (${failed.slice(0, 3).map((f) => `${f.sura}: ${f.problems[0]}`).join('; ')})` })
    continue
  }
  const out = path.join(ROOT, 'web/public/recitation', String(r.id))
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  for (const f of files) {
    const file = { sura: f.n, read: r.id, audio: `${server}${String(f.n).padStart(3, '0')}.mp3`, ayat: f.ayat }
    if (f.basmala) file.basmala = [Number(f.basmala.start_time), Number(f.basmala.end_time)]
    fs.writeFileSync(path.join(out, `${f.n}.json`), JSON.stringify(file))
  }
  const index = {
    about: 'Generated by scripts/ingest/recitation-timing.mjs from mp3quran.net (audio only; played from their servers).',
    fetched: new Date().toISOString().slice(0, 10),
    read: r.id,
    reciter: { ar: moshafAr.reciter.name, en },
    moshaf: moshafAr.name,
    server,
    source: 'https://www.mp3quran.net',
    suras: files.map((f) => f.n),
  }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1) + '\n')
  const bytes = fs.readdirSync(out).reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0)
  chosen.push({ read: r.id, name: { ar: moshafAr.reciter.name, en }, server, suras: files.map((f) => f.n), bytes })
  table.push({ name, read: r.id, result: `chosen: «${moshafAr.name}», 114/114, ${(bytes / 1024).toFixed(0)} KB, ${server}` })
}

// Folders of reciters no longer chosen are removed, so the app never offers a recitation that was not checked.
for (const d of fs.readdirSync(path.join(ROOT, 'web/public/recitation'))) {
  if (/^\d+$/.test(d) && !chosen.some((c) => String(c.read) === d)) fs.rmSync(path.join(ROOT, 'web/public/recitation', d), { recursive: true, force: true })
}
const origins = [...new Set(chosen.map((c) => new URL(c.server).origin))]
fs.writeFileSync(
  path.join(ROOT, 'web/src/config/recitation.json'),
  JSON.stringify({
    about: 'Generated by scripts/ingest/recitation-timing.mjs from mp3quran.net (audio only; played from their servers). The first reciter is the default.',
    site: 'https://www.mp3quran.net',
    origins,
    reciters: chosen.map(({ bytes: _bytes, ...c }) => c),
  }) + '\n',
)
for (const r of table) console.log(`${r.name}${r.read ? ` (read ${r.read})` : ''}: ${r.result}`)
console.log(`chosen ${chosen.length}: ${chosen.map((c) => c.read).join(', ')}; audio origins: ${origins.join(', ')}; timing files ${(chosen.reduce((s, c) => s + c.bytes, 0) / 1024).toFixed(0)} KB in all`)
