// The approval board of the sky with the time of day (add-on 0071-add16): the iOS simulator's shots (sky-sim-shots.sh),
// «before» and the six times, in Arabic and in English, each cut from the top of the screen to under the date card.
//   node web/scripts/sky-board.mjs <dir of sim-*.png> <board.png>
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const [dir, out] = process.argv.slice(2)
const COLS = [
  ['before', 'قبل', 'اللوحة كما هي اليوم'],
  ['fajr', 'الفجر', '٥:٠٥ (من ٤:٣٦ إلى الشروق ٥:٥٤)'],
  ['morning', 'الضحى', '٨:٠٠ (من الشروق إلى الظهر ١١:٣٨)'],
  ['dhuhr', 'الظهر', '١٢:١٥ (إلى العصر ٢:٥٤)'],
  ['asr', 'العصر', '٣:٤٥ (إلى المغرب ٥:٢٠)'],
  ['maghrib', 'المغرب', '٥:٤٠ (إلى العشاء ٦:٥٠)'],
  ['night', 'الليل', '٩:٣٠ (من العشاء إلى الفجر)'],
]
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}`
const row = (lang) =>
  COLS.map(
    ([k, title, sub]) =>
      `<figure><div class="cut ${lang}"><img src="${img(`sim-${k}-${lang}-390.png`)}"></div><figcaption><b>${title}</b><span>${sub}</span></figcaption></figure>`,
  ).join('')
const html = `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>
body{margin:0;padding:28px 32px;background:#f3f0eb;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#1d1914}
h1{margin:0 0 4px;font-size:30px}p{margin:0 0 18px;color:#5f564a;font-size:17px}
h2{margin:18px 0 8px;font-size:20px;color:#1e3a6b}.row{display:flex;gap:14px}
figure{margin:0;width:256px}.cut{width:256px;overflow:hidden;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
.cut.ar{height:428px}.cut.en{height:441px}.cut img{width:256px;display:block}
figcaption{display:flex;flex-direction:column;align-items:center;margin-top:8px;font-size:15px}figcaption b{font-size:18px}figcaption span{color:#5f564a}
</style><h1>السماء مع الوقت: لوح الاعتماد</h1><p>من محاكي iOS (WKWebView، iPhone 16e، عرض ٣٩٠). الرياض، الخميس ٢٢ أكتوبر ٢٠٢٦. «قبل» هو البناء نفسه وطبقات السماء مطفأة.</p>
<h2>العربية</h2><div class="row">${row('ar')}</div><h2>English</h2><div class="row">${row('en')}</div></html>`
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 2 })
await page.setContent(html)
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log(out)
