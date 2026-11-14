// Positions for the reader's additions (reply 0032 C): juz and quarter starts, the 604 page starts, the sajda places,
// the Makki/Madani type of each sura (from QuranData in the KSU archive's quran-data.js, Tanzil metadata), and the
// riwaya of each of our reciters (mp3quran's reads.json, as fetched by scripts/ingest/recitation-timing.mjs), and the
// style of the recording we play (mp3quran's reciters list, the moshaf's name after « - »: «مرتل»; reply 0047 §4).
// Numbers and names only: no Quran text is written here (the quarters' first words come from D1 at run time, through
// /api/quarters). Output: web/src/v2/reading/quran-meta.json (committed).
//   node scripts/reading/build-reading.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const ROOT = path.resolve(import.meta.dirname, '../..')
const ctx = {}
vm.createContext(ctx)
vm.runInContext(`${fs.readFileSync(path.join(ROOT, 'data/raw/ksu/app/lib/quran-data.js'), 'utf8')}; this.QuranData = QuranData`, ctx)
const Q = ctx.QuranData
const pairs = (list) => list.filter((x) => Array.isArray(x) && x.length >= 2).map((x) => [Number(x[0]), Number(x[1])])
const juz = pairs(Q.Juz).slice(0, 30)
const quarters = pairs(Q.HizbQaurter).slice(0, 240)
// Page starts from the Mushaf data itself (data/processed/quran.jsonl, the `page` D1 serves and the reader shows), not
// QuranData.Page: the two differ at 56 ayat, and a page number must read the same everywhere in the app.
const pages = []
for (const line of fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(line)
  if (r.kind === 'ayah' && !pages[r.page - 1]) pages[r.page - 1] = [r.sura, r.aya]
}
if (pages.some((p) => !p)) throw new Error('a page without an ayah')
// Places only: QuranData also types each sajda (recommended/obligatory), a ruling the app does not show (reply 0032 C-8).
const sajda = pairs(Q.Sajda)
// Index 0 is empty and 115 is QuranData's end sentinel: entries 1–114 only.
const suraType = Q.Sura.slice(0, 115).map((x) => (Array.isArray(x) && x[7] ? (x[7] === 'Meccan' ? 'makki' : 'madani') : null))
const suraAyat = Q.Sura.slice(0, 115).map((x) => (Array.isArray(x) && x.length > 1 ? Number(x[1]) : 0))
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/recitation.json'), 'utf8'))
const reads = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/raw/recitation/reads.json'), 'utf8'))
const riwaya = Object.fromEntries(config.reciters.map((r) => [r.read, reads.find((x) => Number(x.id) === r.read)?.rewaya ?? null]))
const moshafs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/raw/recitation/reciters-ar.json'), 'utf8')).reciters.flatMap((x) => x.moshaf ?? [])
// The recording is the moshaf whose server we play; its name is «riwaya - style».
const style = Object.fromEntries(config.reciters.map((r) => [r.read, moshafs.find((m) => m.server === r.server)?.name?.split(' - ')[1]?.trim() ?? null]))
if (suraAyat.reduce((a, b) => a + b, 0) !== 6236 || suraType.filter(Boolean).length !== 114) throw new Error('sura table')
if (juz.length !== 30 || quarters.length !== 240 || pages.length !== 604) throw new Error(`juz ${juz.length}, quarters ${quarters.length}, pages ${pages.length}`)
const out = { about: 'scripts/reading/build-reading.mjs: QuranData (Tanzil metadata in the KSU archive) and mp3quran reads.json and reciters list. Numbers only.', juz, quarters, pages, sajda, suraType, suraAyat, riwaya, style }
fs.writeFileSync(path.join(ROOT, 'web/src/v2/reading/quran-meta.json'), JSON.stringify(out) + '\n')
console.log(`juz ${juz.length}, quarters ${quarters.length}, pages ${pages.length}, sajda ${sajda.length}, riwaya ${JSON.stringify(riwaya)}, style ${JSON.stringify(style)}`)
