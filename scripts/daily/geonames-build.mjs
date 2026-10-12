// The city list for users who do not share their location (reply 0031-add10, §4): GeoNames cities15000 (every city
// over 15,000 people), CC BY 4.0, «© GeoNames» with a link to geonames.org shown wherever the list is used.
//   curl -o data/raw/geonames/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
//   (cd data/raw/geonames && unzip -o cities15000.zip) && node scripts/daily/geonames-build.mjs
// Writes data/processed/cities.json: rows [name, arabicName|null, lat, lng, countryCode, timeZone, population], the
// coordinates at 4 decimals (~11 m). The Arabic name is the first Arabic-script alternate name GeoNames lists, for
// search; the time zone is GeoNames' own (§4: «المنطقة الزمنية من الملف نفسه»).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, 'data/raw/geonames/cities15000.txt')
const OUT = path.join(ROOT, 'data/processed/cities.json')
const ARABIC = /^[؀-ۿ\s]+$/

const rows = fs
  .readFileSync(SRC, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'))
  .map((f) => [f[1], (f[3] ?? '').split(',').find((n) => ARABIC.test(n)) ?? null, Number((+f[4]).toFixed(4)), Number((+f[5]).toFixed(4)), f[8], f[17], Number(f[14])])
  .sort((a, b) => b[6] - a[6])
const body = JSON.stringify(rows)
fs.writeFileSync(OUT, body)
console.log(`${rows.length} cities; ${body.length} bytes; gzip ${zlib.gzipSync(body).length} bytes; with an Arabic name ${rows.filter((r) => r[1]).length}`)
