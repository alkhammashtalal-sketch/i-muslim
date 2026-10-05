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

## الأقسام

- **اسأل:** محادثة بعشر لغات. الإجابة نص من المصدر بحروفه ومرجعه ورابطه، ثم التفسير الميسر للآية، ثم شرح مولّد موسوم منه وحده. ومعها لوحة «كيف وُجدت هذه الإجابة؟»: المقاطع المفحوصة وأيها استُعمل. سؤال الفتوى أو الحالة الشخصية يُحال، والمسألة الخلافية يُصرَّح بخلافها مع نصوصها.
- **المكتبة — القرآن الكريم:**
  - فهرس السور، والسورة بخط النسخ في وضعين («مصحف» و«آية آية»).
  - لمس الآية يفتح لوحتها: التفسير الميسر، وتفسير السعدي، والمعنى بالإنجليزية (Sahih International)، وروابط المصدر.
  - «اشرح لي بلغتي» لغير العربية: شرح آلي مبسّط من الميسر وحده، موسوم «ترجمة آلية».
  - يعمل بلا اتصال لما فُتح.
- **المكتبة — كتب العقيدة:** الأصول الثلاثة والقواعد الأربع وكتاب التوحيد، مقطعًا مقطعًا بنصها ورقم صفحة المطبوع ورابط الشاملة.
- **مسار البداية:** «جديد على الإسلام؟ ابدأ من هنا»: عشر خطوات، كل خطوة سؤال يمر بالمحرك نفسه. التقدم يُحفظ على الجهاز فقط.

## ما لا يفعله التطبيق

- **لا يفتي** ولا يحكم في حالة شخصية، ولا يرجّح بين أقوال أهل العلم؛ يُحيل إلى الرئاسة العامة للبحوث العلمية والإفتاء.
- **لا يكتب نصًا شرعيًا ولا يعدّله:** الآية والحديث والكتاب تُعرض من قاعدة البيانات بحروفها، والنموذج يختار أرقامها فقط.
- **لا يترجم الآيات ولا الأحاديث آليًا:** معنى الآية بالإنجليزية من Sahih International وحدها.
- **لا يجيب بلا نص:** إن لم يجد نصًا معتمدًا اعتذر وأحال، دون استدعاء النموذج.
- **لا يستعمل مصدرًا خارج القائمة الثابتة**، ولا يجمع بيانات شخصية (انظر [الخصوصية](docs/PRIVACY.md)).

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

## Sections

- **Ask:** a conversation in ten languages. Each answer shows the source text verbatim with its reference and link, then al-Muyassar for each verse, then a labelled explanation generated from those texts only. A "How was this answer found?" sheet lists the passages examined and which were used. Fatwa and personal questions are referred; disputed matters are stated as such, with their texts.
- **Library — the Holy Quran:**
  - The surah index, and each surah in naskh script in two modes ("Mushaf" and "ayah by ayah").
  - Tapping an ayah opens al-Muyassar, al-Saʿdi, the Sahih International meaning and the source links.
  - "Explain in my language" (non-Arabic): a simple machine explanation of al-Muyassar only, labelled "machine translation".
  - Readable offline once opened.
- **Library — Aqeedah books:** Thalathat al-Usul, al-Qawa'id al-Arba' and Kitab al-Tawhid, passage by passage, with the printed page and a link to al-Shamela.
- **Start here:** "New to Islam? Start here": ten steps, each one a question sent to the same engine. Progress stays on the device.

## What the app does not do

- **No fatwas:** it does not rule on personal cases or choose between scholarly views; it refers to the General Presidency of Scholarly Research and Ifta.
- **No religious text written or edited by the model:** verses, hadith and book passages are rendered verbatim from the database; the model only picks their ids.
- **No machine translation of verses or hadith:** the English meaning is Sahih International only.
- **No answer without a text:** with no approved text, it apologises and refers, without calling the model.
- **No sources outside the fixed list, and no personal data** (see [Privacy](docs/PRIVACY.md)).

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
