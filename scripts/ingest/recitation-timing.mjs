// Human recitation for every ayah (command 17, Talal's decision of 6 October): ayah timings from mp3quran.net, a
// platform listed in the challenge's scientific package. Audio only: the ayah text stays from source (أ). The audio
// files are not copied or hosted here; the app plays them from mp3quran's own servers, on the user's press only.
//
//   node scripts/ingest/recitation-timing.mjs [--force]
//
// 1. Reciter: the first of Maher al-Muaiqly, Abdulrahman al-Sudais, Saud al-Shuraim, Mishary al-Afasy found in
//    /api/v3/ayat_timing/reads with the Hafs narration and timings for all 114 suras. Stops if none qualifies.
// 2. The sura audio: the reciter's server from /api/v3/reciters (the moshaf of that read) + the sura number in three
//    digits + .mp3.
// 3. Checks for each sura: as many timed ayat as in D1 (data/processed/quran.jsonl; an "ayah 0" is the basmala and is
//    kept apart), start < end, starts increasing, no negative gap. A sura that fails gets no recitation.
// Output: web/public/recitation/{read}/{sura}.json and index.json (not precached by the service worker). Raw API
// responses are kept in data/raw/recitation/ (not in git).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const RAW = path.join(ROOT, 'data/raw/recitation')
const API = 'https://www.mp3quran.net/api/v3'
const PREFERRED = ['ماهر المعيقلي', 'عبدالرحمن السديس', 'سعود الشريم', 'مشاري العفاسي']
const force = process.argv.includes('--force')
fs.mkdirSync(RAW, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getJson(url, file) {
  const p = path.join(RAW, file)
  if (!force && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, { headers: { 'user-agent': 'muslim-app-ingest/1.0 (timings only; one request at a time)' } })
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
const fold = (s) => s.replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/\s+/g, '')

// 1. The reciter.
const reads = await getJson(`${API}/ayat_timing/reads`, 'reads.json')
const considered = []
let read = null
for (const name of PREFERRED) {
  const r = reads.find((x) => fold(x.name) === fold(name))
  if (!r) {
    considered.push(`${name}: not in the timing list`)
    continue
  }
  const hafs = /حفص/.test(r.rewaya)
  const all = Number(r.soar_count) === 114
  considered.push(`${name} (read ${r.id}): narration «${r.rewaya}», ${r.soar_count} suras timed${hafs && all ? ' — chosen' : ` — skipped (${!hafs ? 'not labelled Hafs' : 'not all 114 suras'})`}`)
  if (hafs && all) {
    read = r
    break
  }
}
for (const c of considered) console.log(c)
if (!read) {
  console.error('STOP: none of the four reciters has the Hafs narration with timings for all 114 suras.')
  process.exit(1)
}

// 2. Its server, from /reciters (the moshaf whose id is the read).
const reciters = (await getJson(`${API}/reciters?language=ar`, 'reciters-ar.json')).reciters
const moshaf = reciters.flatMap((x) => x.moshaf.map((m) => ({ ...m, reciter: x.name }))).find((m) => m.id === read.id)
if (!moshaf) throw new Error(`no moshaf ${read.id} in /reciters`)
const server = moshaf.server.endsWith('/') ? moshaf.server : `${moshaf.server}/`
if (read.folder_url && read.folder_url !== server) console.warn(`note: timing folder ${read.folder_url} differs from the reciters server ${server}`)
// The reciter's name in English, for the attribution line (shown only if Talal allows a name in the app: rule 14).
const nameEn = (await getJson(`${API}/reciters?language=eng`, 'reciters-eng.json')).reciters.find((x) => x.moshaf.some((m) => m.id === read.id))?.name

// 3. Timings, checked against D1's ayah counts.
const counts = new Map()
for (const line of fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(line)
  counts.set(r.sura, Math.max(counts.get(r.sura) ?? 0, r.aya))
}
const out = path.join(ROOT, 'web/public/recitation', String(read.id))
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
const ok = []
const failed = []
for (let n = 1; n <= 114; n++) {
  const t = await getJson(`${API}/ayat_timing?surah=${n}&read=${read.id}`, `t-${read.id}-${n}.json`)
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
  if (problems.length) {
    failed.push({ sura: n, problems: problems.slice(0, 5) })
    continue
  }
  const file = { sura: n, read: read.id, audio: `${server}${String(n).padStart(3, '0')}.mp3`, ayat }
  if (basmala) file.basmala = [Number(basmala.start_time), Number(basmala.end_time)]
  fs.writeFileSync(path.join(out, `${n}.json`), JSON.stringify(file))
  ok.push(n)
}
const index = {
  about: 'Generated by scripts/ingest/recitation-timing.mjs from mp3quran.net (audio only; played from their servers on the user\'s press).',
  fetched: new Date().toISOString().slice(0, 10),
  read: read.id,
  reciter: read.name,
  rewaya: moshaf.name,
  server,
  source: 'https://www.mp3quran.net',
  suras: ok,
  failed: failed.map((f) => f.sura),
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1) + '\n')
// What the app needs at build time: the read, the audio origin (for media-src), and the suras that passed the checks.
fs.writeFileSync(
  path.join(ROOT, 'web/src/config/recitation.json'),
  JSON.stringify({
    about: index.about,
    read: read.id,
    reciter: { ar: read.name, en: nameEn ?? null },
    server,
    origin: new URL(server).origin,
    site: 'https://www.mp3quran.net',
    suras: ok,
  }) + '\n',
)
console.log(`reciter: ${read.name} (read ${read.id}, «${moshaf.name}»), server ${server}`)
console.log(`suras with checked timings: ${ok.length}/114${failed.length ? `; failed: ${failed.map((f) => `${f.sura} (${f.problems.join('; ')})`).join(' | ')}` : ''}`)
const bytes = fs.readdirSync(out).reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0)
console.log(`written ${path.relative(ROOT, out)}: ${fs.readdirSync(out).length} files, ${(bytes / 1024).toFixed(0)} KB`)
