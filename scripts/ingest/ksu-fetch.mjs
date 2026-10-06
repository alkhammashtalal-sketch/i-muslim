// [أ] Downloads the official KSU Ayat packages (quran.ksu.edu.sa/ayat) into data/raw/ksu/
// and extracts the four files we use. Requires: curl, unzip (both ship with macOS).
//
//   node scripts/ingest/ksu-fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { download } from './lib/http.mjs';
import { TRANSLATIONS } from './lib/ksu-translations.mjs';


const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'data/raw/ksu');

export const KSU_PACKAGES = [
  {
    file: 'Ayat-v1.4_linux.zip',
    url: 'https://quran.ksu.edu.sa/ayat/download/programs/Ayat-v1.4_linux.zip',
    // The desktop program bundle; the Quran text DB lives inside the .air package.
    extract: [['Ayat-v1.4_linux.zip', 'Ayat-v1.4.air'], ['Ayat-v1.4.air', 'resources/ayat.ayt', 'app'], ['Ayat-v1.4.air', 'lib/quran-data.js', 'app'], ['Ayat-v1.4.air', 'resources/trans.ayt', 'app']],
  },
  {
    file: 'tafasir.ayt',
    url: 'https://quran.ksu.edu.sa/ayat/tafasir.ayt',
    extract: [['tafasir.ayt', 'tafasir/sa3dy.ayt']],
  },
  {
    file: 'tarajem.ayt',
    url: 'https://quran.ksu.edu.sa/ayat/tarajem.ayt',
    extract: [['tarajem.ayt', 'tarajem/ar_muyassar.ayt'], ['tarajem.ayt', 'tarajem/en_sahih.ayt'], ...TRANSLATIONS.map((t) => ['tarajem.ayt', `tarajem/${t.key}.ayt`])],
  },
];

const sha256 = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');

fs.mkdirSync(RAW, { recursive: true });
const manifest = { fetched_at: new Date().toISOString(), files: {} };
for (const pkg of KSU_PACKAGES) {
  const dest = path.join(RAW, pkg.file);
  if (!fs.existsSync(dest) || process.argv.includes('--force')) {
    console.log(`download ${pkg.url}`);
    download(pkg.url, dest);
  } else console.log(`exists   ${pkg.file}`);
  for (const [archive, member, subdir] of pkg.extract) {
    const outDir = subdir ? path.join(RAW, subdir) : RAW;
    fs.mkdirSync(outDir, { recursive: true });
    execFileSync('unzip', ['-o', '-q', path.join(RAW, archive), member, '-d', outDir]);
  }
}
for (const f of ['Ayat-v1.4_linux.zip', 'tafasir.ayt', 'tarajem.ayt', 'app/resources/ayat.ayt', 'app/resources/trans.ayt', 'app/lib/quran-data.js', 'tafasir/sa3dy.ayt', 'tarajem/ar_muyassar.ayt', 'tarajem/en_sahih.ayt', ...TRANSLATIONS.map((t) => `tarajem/${t.key}.ayt`)]) {
  const p = path.join(RAW, f);
  manifest.files[f] = { bytes: fs.statSync(p).size, sha256: sha256(p) };
}
fs.writeFileSync(path.join(RAW, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log('ok → data/raw/ksu/MANIFEST.json');
