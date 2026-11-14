// The Hijri (Umm al-Qura) month and era names of the app's ten languages, from CLDR (reply 0067), for the Android app:
// Android's web view writes the Gregorian month names and «BC» for an Umm al-Qura date in every language but Arabic
// («May 4, 1448 BC» for «Jumada I 4, 1448 AH»; checked on WebView 113 and 145), where the iPhone and the browsers write
// CLDR's own. Made with Node's full ICU (its CLDR version is written into the file); web/src/native/android/hijri.ts
// puts these names in the web view's own parts, in its own order and digits.
//   cd web && node scripts/android-hijri-names.mjs
import fs from 'node:fs'
import path from 'node:path'

const WEB = path.resolve(import.meta.dirname, '..')
const LANGS = ['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const num = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone: 'UTC' })
const monthOf = (d) => Number(num.formatToParts(d).find((p) => p.type === 'month').value)
// A day in each of the twelve months.
const days = new Map()
for (let t = Date.UTC(2026, 0, 1, 12); days.size < 12; t += 86_400_000) {
  const d = new Date(t)
  if (!days.has(monthOf(d))) days.set(monthOf(d), d)
}
const part = (tag, opts, d, type) => new Intl.DateTimeFormat(tag, { ...opts, timeZone: 'UTC' }).formatToParts(d).find((p) => p.type === type)?.value ?? ''
const out = {}
for (const l of LANGS) {
  const tag = `${l}-u-ca-islamic-umalqura`
  const months = (style) => Array.from({ length: 12 }, (_, i) => part(tag, { month: style, day: 'numeric', year: 'numeric' }, days.get(i + 1), 'month'))
  out[l] = { long: months('long'), short: months('short'), era: part(tag, { day: 'numeric', month: 'long', year: 'numeric' }, days.get(1), 'era') }
}
const q = (t) => `'${t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const file = path.join(WEB, 'src/native/android/hijri-names.ts')
fs.writeFileSync(
  file,
  `// Made by web/scripts/android-hijri-names.mjs from CLDR ${process.versions.cldr} (ICU ${process.versions.icu}, Node ${process.versions.node}): the Umm al-Qura month
// names (long and short) and the era of each language but Arabic, as CLDR writes them for the iPhone and the browsers.
export const HIJRI_NAMES: Record<string, { long: string[]; short: string[]; era: string }> = {
${Object.entries(out).map(([l, v]) => `  ${l}: {\n    long: [${v.long.map(q).join(', ')}],\n    short: [${v.short.map(q).join(', ')}],\n    era: ${q(v.era)},\n  },`).join('\n')}
}
`,
)
console.log(`android-hijri-names: ${LANGS.length} languages, CLDR ${process.versions.cldr} → ${path.relative(WEB, file)}`)
