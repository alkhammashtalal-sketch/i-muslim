// Reply 0071 §4.2 and add-on 0071-add1 §4: sample cards of «اسم من أسماء الله» for Talal's review, before any interface.
//   node scripts/names/review-page.mjs <reviewed.txt> <cards.json> <out.html> "الصمد,العلي,القابض الباسط,الجواد,الرحمن"
// Each card, in the order of 0071-add1:
//   1. the texts quoted as they are, first: the name; its evidence (an ayah of quran.jsonl, or a HadeethEnc row with its
//      grade and attribution as stored; a hadith HadeethEnc does not hold is named as missing, not shown); the ayah's
//      tafsir by al-Saadi (quran.jsonl) and Ibn Kathir (data/raw/ksu/tafasir/katheer.ayt), each as stored; the dua;
//   2. then the draft's «المعنى», «قراءة ميسرة» and «قراءة أعمق», under the fixed heading «شرح تعليمي أعدّه التطبيق،
//      وليس نقلًا عن العلماء», set apart in face and shape. In the app they stay behind a switch that is off.
// The texts come from cards.json (scripts/names/verify-draft.mjs), so nothing unmatched is shown.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const [draftPath, cardsPath, outPath, namesArg] = process.argv.slice(2)
const P = path.join(ROOT, 'data/processed')
const lines = (f) => fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const quran = new Map(lines('quran.jsonl').map((r) => [r.id, r]))
const hadith = new Map([...lines('hadith.jsonl'), ...lines('hadith_weak.jsonl')].filter((r) => r.lang === 'ar').map((r) => [r.id, r]))
const katheerDb = new DatabaseSync(path.join(ROOT, 'data/raw/ksu/tafasir/katheer.ayt'), { readOnly: true })
const katheer = (id) => {
  const [, s, a] = id.split(':')
  return katheerDb.prepare('SELECT text FROM katheer WHERE sura = ? AND aya = ?').get(Number(s), Number(a))?.text ?? ''
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const paras = (html) =>
  String(html ?? '')
    .split(/<\/p>|<br\s*\/?>/i)
    .map((p) => p.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim())
    .filter(Boolean)
const hadithUrl = (id) => `https://hadeethenc.com/ar/browse/hadith/${id}`

// The draft's own wording for one entry: «المعنى …», «قراءة ميسرة: …», «قراءة أعمق:» and its paragraphs.
function readingsOf(name) {
  const all = fs.readFileSync(draftPath, 'utf8').split('\n')
  const at = all.findIndex((l) => new RegExp(`^\\d{3} \\| ${name}$`).test(l))
  if (at < 0) return null
  const block = []
  for (let j = at + 1; j < all.length && !/^\d{3} \| /.test(all[j]) && !/^(سجل|الملحق:|القسم)/.test(all[j]); j++) block.push(all[j])
  const strip = (s) => s.replace(/\s*\[\d(?:، \d)?\]\s*$/u, '').replace(/^المعنى \[[^\]]*\]:\s*/u, '').trim()
  const meaning = block.find((l) => l.startsWith('المعنى'))
  const easy = block.find((l) => l.startsWith('قراءة ميسرة:'))
  const deepAt = block.findIndex((l) => l.startsWith('قراءة أعمق'))
  const deep = []
  for (let j = deepAt + 1; deepAt >= 0 && j < block.length && !/^(دعاء|ثناء|ذكر|المراجع|تنبيه)/.test(block[j]); j++) if (block[j].trim()) deep.push(strip(block[j]))
  return { meaning: meaning ? strip(meaning) : null, easy: easy ? easy.replace('قراءة ميسرة:', '').trim() : null, deep }
}

const part = (label, inner) => `<section class="part"><h3>${label}</h3>${inner}</section>`
const ayahPart = (id, label) => {
  const r = quran.get(id)
  return r ? part(label, `<p class="ayah" lang="ar">﴿${esc(r.text)}﴾</p><p class="ref">${esc(r.ref)} · <a href="${esc(r.url)}">مشروع آيات</a></p>`) : ''
}
const hadithPart = (hid, label) => {
  const r = hadith.get(String(hid).replace(/^hadith:/, ''))
  return r ? part(label, `<p class="hadith" lang="ar">${esc(r.hadeeth)}</p><p class="ref"><span class="grade">${esc(r.grade)}</span> · ${esc(r.attribution)} · <a href="${hadithUrl(r.id)}">موسوعة الأحاديث النبوية</a></p>`) : ''
}
const tafsirParts = (id) => {
  const r = quran.get(id)
  const s = paras(r?.saadi)
  const k = paras(katheer(id))
  const saadi = part('تفسير السعدي', s.length ? s.map((p) => `<p class="tafsir">${esc(p)}</p>`).join('') + `<p class="ref"><a href="${esc(r.url)}">مشروع آيات</a></p>` : '<p class="muted">لا يوجد تفسير للسعدي لهذه الآية في المصدر</p>')
  const [sura, aya] = id.split(':').slice(1)
  const kat = k.length
    ? part(
        'تفسير ابن كثير',
        `<p class="tafsir">${esc(k[0])}</p>${k.length > 1 ? `<details><summary>بقية تفسير ابن كثير للآية (${k.length - 1} فقرة)</summary>${k.slice(1).map((p) => `<p class="tafsir">${esc(p)}</p>`).join('')}</details>` : ''}<p class="ref"><a href="https://quran.ksu.edu.sa/tafseer/katheer/sura${sura}-aya${aya}.html">مشروع آيات</a></p>`,
      )
    : ''
  return saadi + kat
}

const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'))
const wanted = namesArg.split(',').map((x) => x.trim())
const body = wanted
  .map((name, i) => {
    const c = cards.find((x) => x.name === name)
    if (!c) return `<article class="card"><h2>${esc(name)}</h2><p class="muted">ليس في الملف.</p></article>`
    const quoted = []
    if (c.ayah) quoted.push(ayahPart(c.ayah, 'الشاهد'), tafsirParts(c.ayah))
    if (c.hadith) quoted.push(hadithPart(c.hadith, 'الشاهد'))
    if (c.hadithMissing)
      quoted.push(part('الشاهد', `<p class="missing">الحديث «${esc(c.hadithMissing.quote)}» (${esc(c.hadithMissing.code)}) ليس في موسوعة الأحاديث، فلا يُعرض نصه ولا حكمه هنا. وحكمه يُنقل من الدرر السنية بحروفه حين تتصل واجهتها (رد 0071 §2.5).</p>`))
    if (c.meaningAyah) quoted.push(ayahPart(c.meaningAyah, 'شاهد للمعنى من القرآن، لا للفظ الاسم'), tafsirParts(c.meaningAyah))
    // A dua that is the evidence or the meaning's ayah itself is not shown twice.
    for (const d of c.duas.filter((d) => d.id !== c.ayah && d.id !== c.meaningAyah)) quoted.push(d.kind === 'ayah' ? ayahPart(d.id, 'دعاء من القرآن') : hadithPart(d.id, 'دعاء أو ذكر من السنة'))
    const rd = readingsOf(name)
    const made = rd
      ? `<aside class="made"><p class="made-h">شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء</p>${rd.meaning ? `<p><b>المعنى:</b> ${esc(rd.meaning)}</p>` : ''}${rd.easy ? `<p><b>قراءة ميسرة:</b> ${esc(rd.easy)}</p>` : ''}${rd.deep.length ? `<p><b>قراءة أعمق:</b></p>${rd.deep.map((p) => `<p>${esc(p)}</p>`).join('')}` : ''}</aside>`
      : ''
    return `<article class="card"><header><span class="num">${i + 1}</span><h2>${esc(c.name)}</h2><span class="draft">المادة ${c.n}</span></header>${quoted.join('')}${made}</article>`
  })
  .join('\n')

const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>اسم من أسماء الله: خمس بطاقات</title>
<style>
:root{--bg:#eef2f9;--card:#fff;--ink:#1b2a4a;--muted:#5b6478;--gold:#8a6a22;--line:#d9dfeb;--link:#1d4f9c;--made:#f6f1e6;--made-line:#c9b68a}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f141d;--card:#18202d;--ink:#e8ecf4;--muted:#a7b0c2;--gold:#d7b46a;--line:#2a3445;--link:#8fb0e8;--made:#221f19;--made-line:#6f5f3c}}
:root[data-theme=dark]{--bg:#0f141d;--card:#18202d;--ink:#e8ecf4;--muted:#a7b0c2;--gold:#d7b46a;--line:#2a3445;--link:#8fb0e8;--made:#221f19;--made-line:#6f5f3c}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 "IBM Plex Sans Arabic","Geeza Pro",system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px}
h1{font-size:1.2rem;margin:8px 0}.intro{color:var(--muted);font-size:.88rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin:16px 0}
header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}h2{margin:0;font-size:1.6rem;color:var(--gold)}
.num{font-size:.8rem;color:var(--muted)}.draft{font-size:.75rem;color:var(--muted);margin-inline-start:auto}
.part{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}h3{margin:0;font-size:.8rem;color:var(--muted);font-weight:600}
.ayah{font-family:Amiri,"Traditional Arabic","Times New Roman",serif;font-size:1.5rem;line-height:2.1;margin:6px 0}
.hadith{font-family:Amiri,"Traditional Arabic",serif;font-size:1.15rem;line-height:2;margin:6px 0}
.tafsir{margin:6px 0}.ref{font-size:.8rem;color:var(--muted);margin:2px 0}.grade{color:var(--gold);font-weight:600}
.missing{color:var(--muted);font-size:.9rem;border-inline-start:3px solid var(--line);padding-inline-start:10px}
details summary{cursor:pointer;color:var(--link);font-size:.9rem}
.made{margin-top:16px;background:var(--made);border:1px dashed var(--made-line);border-radius:12px;padding:12px;font-size:.92rem;line-height:1.85}
.made-h{margin:0 0 6px;font-size:.78rem;font-weight:700;color:var(--muted);letter-spacing:0}
.muted{color:var(--muted)}a{color:var(--link)}
</style></head><body><main>
<h1>اسم من أسماء الله: ${wanted.length} بطاقات للمراجعة</h1>
<p class="intro">من <code>names-reviewed.txt</code> بعد التحقق (verify.md)، بترتيب الملحق 0071-add1. النصوص المنقولة أولًا، كلها من بياناتنا بحروفها: الآية، وتفسيرها عند السعدي وابن كثير من مشروع آيات، والحديث والدعاء من موسوعة الأحاديث بدرجتهما ومخرّجهما. ثم الشرح الذي أعدّه التطبيق، بإطار وخط يفرّقانه، وهو في التطبيق خلف مفتاح مطفأ حتى تعتمده.</p>
${body}
</main></body></html>
`
fs.writeFileSync(outPath, html)
console.log(`${wanted.length} cards → ${outPath} (${(html.length / 1024).toFixed(0)} KB)`)
