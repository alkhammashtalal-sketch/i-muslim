// The Android app's widget and shortcut resources (reply 0067), made from what the app and the iPhone's widgets already
// have, never drawn anew:
//   - res/font: the iPhone widgets' IBM Plex Sans Arabic and Amiri (web/ios/App/MuslimWidgets/Fonts, OFL), byte for byte;
//   - res/drawable-nodpi/widget_{sky,paper,medallion}.png: the iPhone widgets' pictures (MuslimWidgets/Assets.xcassets),
//     byte for byte;
//   - res/drawable/mq_*.xml: the situations' line drawings of web/src/v2/daily/mawaqif/icons.tsx as Android vectors (the
//     same paths, stroke 1.6, round ends), and «كل الأذكار»'s four squares (the iPhone widget's mq-all);
//   - res/values*/widget_strings.xml: the widgets' names and descriptions in Android's widget list, the text before the
//     app has written any data, and the recitation notification's channel and buttons, in the app's ten languages
//     (web/src/native/widget-strings.ts and data/mawaqif.json; Arabic is the default, as the app's).
//   - res/drawable-nodpi/widget_preview_*.webp (and drawable-en-nodpi): the widget list's pictures, from the iPhone
//     widgets' renders of reply 0051 (out/v2-shots/0051/render-ar, render-en), made smaller in headless Chrome.
// Nothing here reads the web or the network.
//
//   cd web && node scripts/android-widgets.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { WIDGET_STRINGS } from '../src/native/widget-strings.ts'

const WEB = path.resolve(import.meta.dirname, '..')
const ROOT = path.resolve(WEB, '..')
const RES = path.join(WEB, 'android/app/src/main/res')
const IOS = path.join(WEB, 'ios/App/MuslimWidgets')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
/** Android's resource folder of each language (Indonesian keeps Android's old code «in»). */
const DIR = (l) => (l === 'ar' ? 'values' : `values-${l === 'id' ? 'in' : l}`)
const KINDS = ['next', 'times', 'date', 'ayah', 'hadith', 'tasbih', 'adhkar', 'mawaqif']
const MQ = ['travel', 'sleep', 'waking', 'home', 'mosque', 'food', 'distress']

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

// 1. Fonts and pictures, as the iPhone's widgets have them.
const FONTS = {
  'IBMPlexSansArabic-Regular.ttf': 'plex_regular.ttf',
  'IBMPlexSansArabic-Medium.ttf': 'plex_medium.ttf',
  'IBMPlexSansArabic-SemiBold.ttf': 'plex_semibold.ttf',
  'IBMPlexSansArabic-Bold.ttf': 'plex_bold.ttf',
  'Amiri-Regular.ttf': 'amiri_regular.ttf',
  'Amiri-Bold.ttf': 'amiri_bold.ttf',
}
for (const [from, to] of Object.entries(FONTS)) fs.copyFileSync(path.join(IOS, 'Fonts', from), path.join(RES, 'font', to), fs.constants.COPYFILE_FICLONE)
for (const name of ['sky', 'paper', 'medallion']) {
  fs.mkdirSync(path.join(RES, 'drawable-nodpi'), { recursive: true })
  fs.copyFileSync(path.join(IOS, `Assets.xcassets/${name}.imageset/${name}.png`), path.join(RES, `drawable-nodpi/widget_${name}.png`))
}

// 2. The situations' icons as vectors.
const icons = fs.readFileSync(path.join(WEB, 'src/v2/daily/mawaqif/icons.tsx'), 'utf8')
const body = icons.slice(icons.indexOf('const PATHS'), icons.indexOf('export const SituationIcon'))
const entries = [...body.matchAll(/^ {2}'?([\w-]+)'?: ([\s\S]*?)(?=^ {2}'?[\w-]+'?: |^\}$)/gm)]
const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const n = (x) => Number(x)
const circle = (cx, cy, rx, ry) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0z`
const rect = (x, y, w, h, r) =>
  r ? `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z` : `M${x},${y}h${w}v${h}h${-w}z`
function shapes(src) {
  const out = []
  for (const m of src.matchAll(/<(path|circle|ellipse|rect)\s([^>]*?)\/>/g)) {
    const a = attrs(m[2])
    if (m[1] === 'path') out.push(a.d)
    else if (m[1] === 'circle') out.push(circle(n(a.cx), n(a.cy), n(a.r), n(a.r)))
    else if (m[1] === 'ellipse') out.push(circle(n(a.cx), n(a.cy), n(a.rx), n(a.ry)))
    else out.push(rect(n(a.x), n(a.y), n(a.width), n(a.height), n(a.rx ?? 0)))
  }
  return out
}
const vector = (name, paths) =>
  `<?xml version="1.0" encoding="utf-8"?>
<!-- «${name}»: web/src/v2/daily/mawaqif/icons.tsx, made by web/scripts/android-widgets.mjs (reply 0067). -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${paths.map((d) => `    <path\n        android:pathData="${d}"\n        android:fillColor="#00000000"\n        android:strokeColor="#FF000000"\n        android:strokeWidth="1.6"\n        android:strokeLineCap="round"\n        android:strokeLineJoin="round" />`).join('\n')}
</vector>
`
let made = 0
for (const [, name, src] of entries) {
  const p = shapes(src)
  if (!p.length) continue
  write(path.join(RES, `drawable/mq_${name.replace(/-/g, '_')}.xml`), vector(name, p))
  made++
}
write(path.join(RES, 'drawable/mq_grid.xml'), vector('grid', [rect(4.5, 4.5, 6, 6, 1.5), rect(13.5, 4.5, 6, 6, 1.5), rect(4.5, 13.5, 6, 6, 1.5), rect(13.5, 13.5, 6, 6, 1.5)]))

// 3. The strings, in the ten languages.
const mawaqif = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mawaqif.json'), 'utf8'))
const MEDIA = {
  ar: ['التلاوة', 'تشغيل', 'إيقاف مؤقت', 'التالي', 'إيقاف'],
  en: ['Recitation', 'Play', 'Pause', 'Next', 'Stop'],
  ur: ['تلاوت', 'چلائیں', 'روکیں', 'اگلا', 'بند کریں'],
  id: ['Tilawah', 'Putar', 'Jeda', 'Berikutnya', 'Berhenti'],
  ms: ['Tilawah', 'Main', 'Jeda', 'Seterusnya', 'Henti'],
  tr: ['Tilavet', 'Oynat', 'Duraklat', 'Sonraki', 'Durdur'],
  fr: ['Récitation', 'Lire', 'Pause', 'Suivant', 'Arrêter'],
  es: ['Recitación', 'Reproducir', 'Pausa', 'Siguiente', 'Detener'],
  bn: ['তিলাওয়াত', 'চালান', 'বিরতি', 'পরবর্তী', 'থামান'],
  hi: ['तिलावत', 'चलाएँ', 'रोकें', 'अगला', 'बंद करें'],
}
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/^([@?])/, '\\$1')
for (const l of LANGS) {
  const w = WIDGET_STRINGS[l]
  const lines = []
  for (const k of KINDS) {
    lines.push(`    <string name="widget_${k}_name">${esc(w.names[k].name)}</string>`)
    lines.push(`    <string name="widget_${k}_desc">${esc(w.names[k].desc)}</string>`)
  }
  lines.push(`    <string name="widget_open_app">${esc(w.openApp)}</string>`)
  for (const id of MQ) lines.push(`    <string name="widget_mq_${id}">${esc(mawaqif.situations.find((x) => x.id === id).name[l])}</string>`)
  lines.push(`    <string name="widget_mq_all">${esc(w.allAdhkar)}</string>`)
  const [ch, play, pause, next, stop] = MEDIA[l]
  lines.push(`    <string name="media_channel">${esc(ch)}</string>`, `    <string name="media_play">${esc(play)}</string>`, `    <string name="media_pause">${esc(pause)}</string>`, `    <string name="media_next">${esc(next)}</string>`, `    <string name="media_stop">${esc(stop)}</string>`)
  write(
    path.join(RES, DIR(l), 'widget_strings.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<!-- Made by web/scripts/android-widgets.mjs from web/src/native/widget-strings.ts and data/mawaqif.json (reply 0067). -->\n<resources>\n${lines.join('\n')}\n</resources>\n`,
  )
}

// 4. The widget list's pictures: the iPhone widgets' renders (reply 0051), smaller.
const RENDERS = { ar: path.join(ROOT, 'out/v2-shots/0051/render-ar'), en: path.join(ROOT, 'out/v2-shots/0051/render-en') }
const FILE = { next: 'next-small', times: 'times-large', date: 'date-small', ayah: 'ayah-medium', hadith: 'hadith-medium', tasbih: 'tasbih-small', adhkar: 'adhkar-small', mawaqif: 'mawaqif-large' }
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
let previews = 0
for (const [l, dir] of Object.entries(RENDERS)) {
  for (const k of KINDS) {
    const src = path.join(dir, `${FILE[k]}${l === 'en' ? '-en' : ''}.png`)
    if (!fs.existsSync(src)) throw new Error(`no render ${src}`)
    const b64 = fs.readFileSync(src).toString('base64')
    const webp = await page.evaluate(async ({ b64, width }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const w = Math.min(width, img.width)
      const h = Math.round((img.height * w) / img.width)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const x = c.getContext('2d')
      x.imageSmoothingQuality = 'high'
      x.drawImage(img, 0, 0, w, h)
      return c.toDataURL('image/webp', 0.86).split(',')[1]
    }, { b64, width: FILE[k].endsWith('small') ? 300 : 600 })
    write(path.join(RES, `drawable-${l === 'en' ? 'en-' : ''}nodpi/widget_preview_${k}.webp`), Buffer.from(webp, 'base64'))
    previews++
  }
}
await browser.close()
console.log(`android-widgets: ${Object.keys(FONTS).length} fonts, 3 pictures, ${made + 1} icons, ${LANGS.length} languages, ${previews} previews`)
