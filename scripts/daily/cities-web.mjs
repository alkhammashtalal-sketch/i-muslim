// The city list the app ships (reply 0032 D, location without GPS): from data/processed/cities.json (GeoNames
// cities15000, CC BY 4.0, scripts/daily/geonames-build.mjs), every city of 50,000 people or more, and every Saudi city
// of the list (15,000 or more), most populous first. Coordinates at 3 decimals (~110 m), time zones as indexes.
// Written to web/public/geo/cities.json and committed: scripts/deploy.sh builds from a clean checkout without data/.
// Fetched by the app only when the city list is opened (not precached by the service worker: JSON is not in its
// globPatterns). «© GeoNames» with a link to geonames.org is shown with the list.
//   node scripts/daily/cities-web.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, 'data/processed/cities.json')
const OUT = path.join(ROOT, 'web/public/geo/cities.json')
const MIN = 50_000

const rows = JSON.parse(fs.readFileSync(SRC, 'utf8')).filter((r) => r[6] >= MIN || r[4] === 'SA')
const tz = [...new Set(rows.map((r) => r[5]))]
const body = JSON.stringify({
  _about: 'GeoNames cities15000 (CC BY 4.0, https://www.geonames.org/): cities of 50,000 people or more and all Saudi cities listed; [name, Arabic name or 0, lat, lng, country, time zone index].',
  tz,
  rows: rows.map((r) => [r[0], r[1] ?? 0, Number(r[2].toFixed(3)), Number(r[3].toFixed(3)), r[4], tz.indexOf(r[5])]),
})
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, body)
console.log(`${rows.length} cities (${rows.filter((r) => r[4] === 'SA').length} Saudi); ${body.length} bytes; gzip ${zlib.gzipSync(body).length}`)
