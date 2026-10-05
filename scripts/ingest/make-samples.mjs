// Writes small, attributed samples (≤ 20 records per source) to data/samples/ for tests.
// Full texts stay out of git (data/raw, data/processed are ignored).
//
//   node scripts/ingest/make-samples.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'data/processed', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const SAMPLE_QURAN = ['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7', '2:43', '2:183', '2:255', '2:256', '3:19', '3:97', '5:6', '9:60', '22:27', '51:56', '112:1', '112:2', '112:3'];
const quran = read('quran.jsonl').filter((r) => SAMPLE_QURAN.includes(`${r.sura}:${r.aya}`));
const aq = read('aqeedah.jsonl');
const aqeedah = [...aq.filter((r) => r.book === 'الأصول الثلاثة').slice(0, 8), ...aq.filter((r) => r.book === 'القواعد الأربع').slice(0, 3), ...aq.filter((r) => r.book === 'كتاب التوحيد').slice(0, 9)];
const dir = path.join(ROOT, 'data/samples');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'quran.sample.jsonl'), quran.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'aqeedah.sample.jsonl'), aqeedah.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'README.md'), `# عينات الاختبار

عينات صغيرة (حتى 20 سجلًا لكل مصدر) للاختبارات فقط، بالصيغة نفسها لملفات \`data/processed/\`. النصوص الكاملة لا تدخل المستودع؛ يعيد إنتاجها \`scripts/ingest/\` (انظر \`docs/SOURCES.md\`).

| الملف | السجلات | المصدر والنسبة |
| --- | --- | --- |
| \`quran.sample.jsonl\` | ${quran.length} | نص القرآن، التفسير الميسر، تفسير السعدي، ترجمة Sahih International — من ملفات برنامج «آيات»، مشروع المصحف الإلكتروني بجامعة الملك سعود (quran.ksu.edu.sa) |
| \`aqeedah.sample.jsonl\` | ${aqeedah.length} | الأصول الثلاثة والقواعد الأربع (shamela.ws/book/239، ط وزارة الشؤون الإسلامية 1421هـ)، كتاب التوحيد (shamela.ws/book/11318، مؤلفات الشيخ ج1، جامعة الإمام) — للشيخ محمد بن عبد الوهاب، عبر المكتبة الشاملة |
`);
console.log(`samples: quran ${quran.length}, aqeedah ${aqeedah.length}`);
