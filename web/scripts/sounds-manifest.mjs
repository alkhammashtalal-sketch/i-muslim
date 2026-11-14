// The server's list of the alerts' sounds (add-ons 0072-add20 §1, 0072-add21 §3), web/public/sounds/manifest.json,
// made from the recordings' production record (relay/w1/0072-alerts/adhan/manifest.json, outside the repository):
//   node web/scripts/sounds-manifest.mjs <record.json>              print it, every sound approved: false
//   node web/scripts/sounds-manifest.mjs <record.json> --approved   only after Talal has listened and said so
//   … --write                                                       write web/public/sounds/manifest.json
// The audio files themselves are copied into web/public/sounds/ in the same step, never before the approval.
import fs from 'node:fs'
import path from 'node:path'
import { fromProductionRecord } from '../src/native/alert-sounds.ts'

const [record, ...flags] = process.argv.slice(2)
if (!record) {
  console.error('sounds-manifest: <record.json> [--approved] [--write]')
  process.exit(2)
}
const m = fromProductionRecord(JSON.parse(fs.readFileSync(record, 'utf8')), flags.includes('--approved'))
const text = JSON.stringify(m, null, 1) + '\n'
if (flags.includes('--write')) {
  const out = path.resolve(import.meta.dirname, '../public/sounds/manifest.json')
  fs.writeFileSync(out, text)
  console.log(out)
} else process.stdout.write(text)
