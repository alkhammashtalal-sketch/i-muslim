// Validates data/processed/*.jsonl and writes data/processed/REPORT.md.
//
//   node scripts/ingest/validate.mjs [--seed=42]
import fs from 'node:fs';
import path from 'node:path';
import { stripTags } from './lib/normalize.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const P = path.join(ROOT, 'data/processed');
const seed = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 42);
const load = (f) => (fs.existsSync(path.join(P, f)) ? fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : null);

const quran = load('quran.jsonl') ?? [];
const aqeedah = load('aqeedah.jsonl') ?? [];
const hadith = load('hadith.jsonl');
const urlChecks = fs.existsSync(path.join(P, 'url_checks.json')) ? JSON.parse(fs.readFileSync(path.join(P, 'url_checks.json'), 'utf8')) : [];

const errors = []; // open problems
const notes = []; // described, known source facts

// ---------- Quran
const suras = new Set(quran.map((r) => r.sura));
if (suras.size !== 114) errors.push(`عدد السور ${suras.size} وليس 114`);
if (quran.length !== 6236) errors.push(`عدد الآيات ${quran.length} وليس 6,236`);
const QFIELDS = ['text', 'text_en', 'muyassar', 'saadi', 'url', 'ref', 'sura_name', 'text_search', 'embed_text'];
const qMissing = {};
for (const r of quran) for (const f of QFIELDS) if (!r[f] || !String(r[f]).trim()) (qMissing[f] ??= []).push(r.id);
for (const [f, ids] of Object.entries(qMissing)) errors.push(`${ids.length} آية بلا \`${f}\`: ${ids.slice(0, 10).join('، ')}`);
const saadiEmpty = quran.filter((r) => stripTags(r.saadi ?? '') === '');
if (saadiEmpty.length) {
  const allFromSource = saadiEmpty.every((r) => r.saadi_empty_in_source);
  (allFromSource ? notes : errors).push(
    `تفسير السعدي فارغ لـ ${saadiEmpty.length} آية **في ملف المصدر نفسه** (\`<p></p>\` في sa3dy.ayt، وصفحة الموقع للآية تعرض بلا تفسير أيضًا، تحقّقنا من 4:61). ` +
      `لم نُلحقها بالآية المجاورة لأن ذلك اجتهاد لا يثبت من الملف. الآيات: ${saadiEmpty.map((r) => `${r.sura}:${r.aya}`).join(' ')}. ` +
      `**يحتاج قرارًا من طلال/سالم:** تبقى بلا سعدي (ويُكتفى بالميسر)، أو يحدد سالم يدويًا أي مقطع يشملها.`,
  );
}

// ---------- Aqeedah
const perBook = {};
for (const r of aqeedah) {
  perBook[r.book] ??= { records: 0, pages: new Set(), words: 0 };
  perBook[r.book].records++;
  for (let p = r.page; p <= r.page_end; p++) perBook[r.book].pages.add(p);
  perBook[r.book].words += r.text.split(/\s+/).length;
}
for (const b of ['الأصول الثلاثة', 'شروط الصلاة وأركانها', 'القواعد الأربع', 'كتاب التوحيد']) if (!perBook[b]) errors.push(`لا سجلات لكتاب «${b}»`);
for (const r of aqeedah) {
  for (const f of ['text', 'url', 'ref', 'chapter', 'text_search', 'embed_text']) if (!r[f]) errors.push(`${r.id} بلا \`${f}\``);
  if (!Number.isFinite(r.page) || r.page <= 0) errors.push(`${r.id} رقم صفحة غير صالح: ${r.page}`);
}

// ---------- Generic: duplicates, odd characters
const all = [...quran, ...aqeedah, ...(hadith ?? [])];
const idCount = new Map();
for (const r of all) idCount.set(r.id, (idCount.get(r.id) ?? 0) + 1);
const dupIds = [...idCount].filter(([, n]) => n > 1);
if (dupIds.length) errors.push(`أرقام مكررة: ${dupIds.map(([k]) => k).join('، ')}`);

const byText = new Map();
for (const r of all) byText.set(r.text, [...(byText.get(r.text) ?? []), r.id]);
const dupTexts = [...byText.values()].filter((ids) => ids.length > 1);
const dupQuran = dupTexts.filter((ids) => ids.every((i) => i.startsWith('quran:')));
const dupOther = dupTexts.filter((ids) => !ids.every((i) => i.startsWith('quran:')));
if (dupQuran.length) notes.push(`${dupQuran.length} نصًا قرآنيًا يتكرر بحروفه في أكثر من موضع (طبيعي في القرآن، مثل «فبأي آلاء ربكما تكذبان»)؛ كل آية سجل مستقل برقمها. أمثلة: ${dupQuran.slice(0, 3).map((x) => x.join(' = ')).join('؛ ')}`);
if (dupOther.length) errors.push(`نصوص مكررة في غير القرآن: ${dupOther.map((x) => x.join(' = ')).join('؛ ')}`);

// Characters: Arabic fields may hold Arabic letters/marks, digits, punctuation, whitespace.
const ARABIC_OK = /[؀-ۿݐ-ݿࢠ-ࣿ\s0-9.,;:!?()[\]{}"'«»\-–—_*/…٪]/u;
const EN_OK = /[\x20-\x7E\s‘’“”–—…À-ſʿʾ]/u;
const odd = new Map(); // char -> {count, field, examples}
const scan = (r, field, ok) => {
  const v = r[field];
  if (!v) return;
  for (const ch of stripTags(v)) {
    if (ok.test(ch)) continue;
    const k = `${field}|U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} «${ch}»`;
    const e = odd.get(k) ?? { n: 0, ex: [] };
    e.n++;
    if (e.ex.length < 3 && !e.ex.includes(r.id)) e.ex.push(r.id);
    odd.set(k, e);
  }
};
for (const r of quran) { scan(r, 'text', ARABIC_OK); scan(r, 'muyassar', ARABIC_OK); scan(r, 'saadi', ARABIC_OK); scan(r, 'text_en', EN_OK); }
for (const r of aqeedah) scan(r, 'text', ARABIC_OK);
const CONTROL = /U\+(00[01][0-9A-F]|007F|FFFD)/;
const INVISIBLE = /U\+(200[B-F]|FEFF)/;
const oddRows = [...odd].sort((a, b) => b[1].n - a[1].n);
const bad = oddRows.filter(([k]) => CONTROL.test(k));
if (bad.length) errors.push(`محارف تحكم أو استبدال في النصوص: ${bad.map(([k, v]) => `${k} ×${v.n} (${v.ex.join('، ')})`).join('؛ ')}`);
const invisible = oddRows.filter(([k]) => INVISIBLE.test(k));
if (invisible.length) notes.push(`علامات اتجاه/وصل غير مرئية من المصدر: ${invisible.map(([k, v]) => `${k} ×${v.n}`).join('؛ ')}. تبقى في الحقول المعروضة كما هي، وتُحذف من \`text_search\` فقط.`);
// Known corruption inside source files (kept verbatim; flagged for the reviewer).
const ENTITY_JUNK = /&;|&#?\w+;/;
for (const r of quran) for (const f of ['saadi', 'muyassar', 'text_en']) if (ENTITY_JUNK.test(r[f] ?? '')) notes.push(`خلل في ملف المصدر في \`${f}\` لـ ${r.id}: «…${(r[f].match(/.{0,30}(&;|&#?\w+;).{0,30}/) ?? [''])[0]}…» — بقي كما هو في المصدر؛ يُنبَّه سالم، وتُعرض الصفحة الأصلية ${r.url}.`);

// ---------- URL checks
const urlBad = urlChecks.filter((c) => !c.ok);
if (urlChecks.length < 3) errors.push('لم تُشغَّل فحوص الروابط الثلاثة (ksu-verify-urls.mjs)');
if (urlBad.length) errors.push(`روابط عينة لا تطابق: ${urlBad.map((c) => c.key).join('، ')}`);

// ---------- Samples (deterministic)
let s = seed;
const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr, n) => { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]); return out; };
const qs = pick(quran, 10), as = pick(aqeedah, 10);
const cut = (t, n = 400) => { const x = stripTags(t).replace(/\n/g, ' / '); return x.length > n ? x.slice(0, n) + ' …' : x; };

// ---------- Write report
const L = [];
L.push('# تقرير التحقق من الثوابت المجلوبة', '');
L.push(`أنشأه \`scripts/ingest/validate.mjs\` في ${new Date().toISOString()} (بذرة العينة ${seed}).`, '');
L.push('## الخلاصة', '');
L.push(`- **أخطاء مفتوحة: ${errors.length}**`);
L.push(`- ملاحظات موصوفة من المصدر: ${notes.length}`, '');
if (errors.length) { L.push('## أخطاء مفتوحة', ''); errors.forEach((e) => L.push(`- ${e}`)); L.push(''); }
if (notes.length) { L.push('## ملاحظات موصوفة (من المصدر، لم نعدّلها)', ''); notes.forEach((e) => L.push(`- ${e}`)); L.push(''); }

L.push('## [أ] القرآن — `quran.jsonl`', '');
L.push('| البند | القيمة |', '| --- | --- |');
L.push(`| السور | ${suras.size} |`, `| الآيات | ${quran.length.toLocaleString('en')} |`);
for (const f of QFIELDS) L.push(`| آيات بلا \`${f}\` | ${(qMissing[f] ?? []).length} |`);
L.push(`| آيات تفسير السعدي فيها فارغ في المصدر | ${saadiEmpty.length} |`, '');
L.push('### فحص الروابط على الموقع', '', '| الآية | الرابط | نص الآية | السعدي | الترجمة | النتيجة |', '| --- | --- | --- | --- | --- | --- |');
for (const c of urlChecks) L.push(`| ${c.key} | ${c.url} | ${c.ayah_text_on_page ? '✓' : '✗'} | ${c.saadi_on_page ? '✓' : '✗'} | ${c.en_on_page ? '✓' : '✗'} (${c.url_en}) | ${c.ok ? 'مطابق' : 'غير مطابق'} |`);
L.push('');

L.push('## [ج] الشاملة — `aqeedah.jsonl`', '', '| الكتاب | السجلات | الصفحات المغطاة | الكلمات |', '| --- | --- | --- | --- |');
for (const [b, v] of Object.entries(perBook)) { const pg = [...v.pages].sort((x, y) => x - y); L.push(`| ${b} | ${v.records} | ${pg[0]}–${pg.at(-1)} (${pg.length}) | ${v.words.toLocaleString('en')} |`); }
L.push(`| **المجموع** | ${aqeedah.length} | | |`, '');

L.push('## [ب] الحديث', '');
L.push(hadith ? `\`hadith.jsonl\`: ${hadith.length} سجلًا.` : '**الحديث بانتظار المفتاح** (`SUNNAH_API_KEY` غير موجود في البيئة؛ لم يُجلب شيء من sunnah.com).', '');

L.push('## محارف خارج المجموعات المتوقعة (للاطلاع)', '');
L.push('المتوقع للحقول العربية: الحروف والعلامات العربية والأرقام وعلامات الترقيم الشائعة؛ وللإنجليزية: ASCII وعلامات الاقتباس الطباعية. ما يلي ظهر خارجها، وهو كما في المصدر:', '');
if (!oddRows.length) L.push('لا شيء.');
else { L.push('| الحقل والمحرف | المرات | أمثلة |', '| --- | --- | --- |'); oddRows.slice(0, 40).forEach(([k, v]) => L.push(`| ${k.replace('|', ' ')} | ${v.n} | ${v.ex.join('، ')} |`)); }
L.push('');

L.push('## عينة للمراجعة البشرية (20 سجلًا)', '', '### قرآن (10)', '');
for (const r of qs) L.push(`- **${r.ref}** — ${r.url}`, `  > ${r.text}`, `  - EN: ${cut(r.text_en, 250)}`, `  - الميسر: ${cut(r.muyassar, 250)}`, `  - السعدي: ${cut(r.saadi, 250)}`, '');
L.push('### الشاملة (10)', '');
for (const r of as) L.push(`- **${r.ref}** — ${r.chapter} — ${r.url}`, `  > ${cut(r.text)}`, '');
fs.writeFileSync(path.join(P, 'REPORT.md'), L.join('\n'));
console.log(`REPORT.md: ${errors.length} open errors, ${notes.length} notes`);
errors.forEach((e) => console.log('  ERR', e.slice(0, 200)));
