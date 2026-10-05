# i مسلم

**الرابط الحي:** https://i-muslim.alkhammashtalal.workers.dev

<p>
  <img src="docs/screenshots/live-mobile-answer.png" width="260" alt="إجابة موثّقة: نص الآية بحروفه في إطار المصحف مع مرجعه">
  <img src="docs/screenshots/live-mobile-referral-abstain.png" width="260" alt="إحالة سؤال الفتوى إلى الجهة المختصة، واعتذار حين لا يوجد نص">
</p>

> **الحالة الآن:** الإجابة من المحرك الحقيقي (بوابة المستوى، الاسترجاع، التحقق، النص من قاعدة البيانات). النموذج اللغوي في **وضع المحاكاة** إلى أن يُضاف مفتاحه، فجملة الشرح موسومة «وضع المحاكاة» ولا تعبّر عن فهم للسؤال.

## الفكرة

«i مسلم» مساعد معرفي مقيّد بالمصادر، **ليس مفتيًا**. تطبيق ويب قابل للتثبيت يجيب عن أسئلة التعريف بالإسلام وأركانه وعباداته من نصوص ثابتة فقط، ويعرض النص الأصلي بحروفه مع مرجعه ورابطه، ويُحيل إلى الجهة المختصة (alifta.gov.sa) حين يكون السؤال فتوى أو حين لا يجد نصًا. النموذج اللغوي لا يكتب نصًا شرعيًا؛ يختار أرقام المقاطع ويكتب شرحًا منها بشواهده، والنص يُعرض من قاعدة البيانات كما هو.

مشاركة في تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي 2026 — المسار الأول «الحوار المعرفي والإجابات الموثوقة».

## كيف يعمل

1. **بوابة المستوى بلا نموذج:** أسئلة الحالة الشخصية والفتوى والخلاف تُحال فورًا إلى الجهة المختصة، ولا تُخزَّن.
2. **الاسترجاع:** بحث بالمعنى (bge-m3 في Vectorize) وبالكلمات (FTS5 على الآيات والتفسيرين والترجمة الإنجليزية) مع معجم يربط الصياغة اليومية بألفاظ المصادر؛ وإن لم يتجاوز شيء العتبة فاعتذار بلا استدعاء للنموذج. الأرقام في [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).
3. **استدعاء واحد للنموذج** يعيد أرقام المقاطع والمستوى وجملًا قصيرة، كل جملة بشاهدها، ويُعامل نص السؤال بيانات لا تعليمات.
4. **التحقق:** رقم غير مرسَل يُحذف، والجملة بلا شاهد تُحذف، والجملة التي تنسخ نص آية أو حديث تُحذف، والمستوى ج أو د إحالة بلا نص.
5. **البطاقة من قاعدة البيانات:** نص الآية أو الحديث أو كتاب العقيدة بحروفه، وشارة «مطابق للمصدر» بعد مقارنة بايتية، والتفسير الميسر للآية قبل أي نص مولّد.

## التشغيل المحلي

المتطلبات: Node.js 22.5 أو أعلى، وحساب Cloudflare.

```bash
# الواجهة
cd web && npm install && npm run build

# الخادم (يقدّم web/dist ومسارات /api/*)
cd ../worker && npm install
npx wrangler login
npx wrangler dev
# ثم افتح http://localhost:8787 و http://localhost:8787/api/health
```

- واجهة ببيانات تجريبية للتطوير فقط: `cd web && VITE_ASK_MODE=mock npm run dev` (لا تدخل البيانات التجريبية حزمة الإنتاج).
- اختبارات الخادم: `cd worker && npx vitest run`. اختبار الواجهة الشامل على الرابط الحي (Playwright بمتصفح Chrome المثبّت): `cd web && npx playwright test`.
- الأسرار (`LLM_API_KEY`، `IP_SALT`، `ADMIN_TOKEN`) لا تُحفظ في المستودع، وتُضاف بـ `npx wrangler secret put`، ومحليًا في `worker/.dev.vars` (خارج git).

## المصادر

القرآن الكريم والتفسير الميسر وتفسير السعدي وترجمة Sahih International من مشروع آيات بجامعة الملك سعود؛ والأصول الثلاثة والقواعد الأربع وكتاب التوحيد من المكتبة الشاملة؛ والأحاديث من sunnah.com عبر واجهتهم البرمجية (لم تُجلب بعد)؛ والإحالة إلى alifta.gov.sa. القائمة الكاملة وأساسها النظامي في [`docs/COMPONENTS.csv`](docs/COMPONENTS.csv)، وطريقة الجلب في [`docs/SOURCES.md`](docs/SOURCES.md). النصوص لا تُنشر كاملة في هذا المستودع؛ يجلبها سكربت `scripts/ingest/`.

## الرخصة

كود المشروع برخصة [MIT](LICENSE). النصوص الشرعية ليست جزءًا من المستودع ولا تشملها الرخصة.

انظر أيضًا: [المنهجية](docs/METHODOLOGY.md) · [القرارات التقنية](docs/DECISIONS.md) · [الإفصاح عن الذكاء الاصطناعي](docs/AI_USE.md) · [الخصوصية](docs/PRIVACY.md) · [نسخة البداية](docs/STARTING_VERSION.md)

---

# i Muslim (English)

**Live:** https://i-muslim.alkhammashtalal.workers.dev

> **Status:** answers come from the real engine (level gate, retrieval, verification, text from the database). The language model runs in **mock mode** until its key is added, so the explanation sentence is labelled "mock mode" and does not reflect an understanding of the question.

## Idea

"i Muslim" is a source-bound knowledge assistant, **not a mufti**. An installable web app (PWA) that answers introductory questions about Islam, its pillars and acts of worship from a fixed set of sources only. It shows the original text verbatim with its reference and link, and refers fatwa-type questions (or questions with no matching text) to alifta.gov.sa. The LLM never writes religious text: it picks passage IDs and writes a cited explanation from them, while the text itself is rendered from the database exactly as stored.

Entry to the 2026 AI for Islamic Content Challenge — Track 1, "Knowledge Dialogue and Trustworthy Answers".

## How it works

1. **Level gate, no model:** personal-case, fatwa and disputed questions are referred at once and never cached.
2. **Retrieval:** meaning search (bge-m3 in Vectorize) plus keyword search (FTS5 over verses, both tafsirs and the English meanings), with a lexicon from everyday wording to the sources' terms; below the threshold the app apologises without calling the model. Numbers in [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).
3. **One model call** returns passage ids, the level and short sentences, each citing a passage; the question is treated as data, not instructions.
4. **Verification:** ids that were not sent are dropped, sentences without a citation are dropped, sentences copying a verse or hadith are dropped, and level C/D becomes a referral with no text.
5. **Card from the database:** the verse, hadith or creed text verbatim, a "matches source" badge after a byte comparison, and al-Muyassar for each verse before any generated text.

## Run locally

Requires Node.js 22.5+ and a Cloudflare account.

```bash
cd web && npm install && npm run build
cd ../worker && npm install
npx wrangler login
npx wrangler dev   # http://localhost:8787 and /api/health
```

Demo data for UI work only: `cd web && VITE_ASK_MODE=mock npm run dev` (never in the production bundle). Worker tests: `cd worker && npx vitest run`. End-to-end on the live link: `cd web && npx playwright test`. Secrets (`LLM_API_KEY`, `IP_SALT`, `ADMIN_TOKEN`) are never committed; use `npx wrangler secret put`, or `worker/.dev.vars` locally (git-ignored).

## Sources

Quran, Tafsir al-Muyassar, Tafsir al-Saadi and Sahih International from the Ayat project (King Saud University); Thalathat al-Usul, al-Qawa'id al-Arba' and Kitab al-Tawhid from al-Maktaba al-Shamela; hadith from sunnah.com via its API (not fetched yet); referrals to alifta.gov.sa. Full list and legal basis in [`docs/COMPONENTS.csv`](docs/COMPONENTS.csv). Full source texts are not published in this repository; they are fetched by `scripts/ingest/`.

## License

Project code is [MIT](LICENSE). Religious source texts are not part of this repository and not covered by the license.
