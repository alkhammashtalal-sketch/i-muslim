# المصادر المجلوبة — ما أخذناه ومن أين وكيف يُعاد جلبه

المصادر كلها من الثوابت في القسم 2 من `CLAUDE.md`، ولا شيء غيرها. النصوص الكاملة لا تدخل المستودع (`data/raw` و`data/processed` في `.gitignore`)؛ يعيد إنتاجها أي شخص بالأوامر أدناه. حقل `text` (وحقول المصدر الأخرى) محفوظ كما نُزّل بلا تعديل؛ التطبيع في `text_search` فقط (`scripts/ingest/lib/normalize.mjs`).

تاريخ الجلب: **5 أكتوبر 2026**. المتطلبات: Node.js 22.5 أو أحدث (لوحدة `node:sqlite` المدمجة)، و`curl` و`unzip` (موجودان في macOS). لا مكتبات خارجية.

## [أ] مشروع آيات — جامعة الملك سعود (quran.ksu.edu.sa)

ملفات تنزيل رسمية من صفحة «تحميل آيات» (`https://quran.ksu.edu.sa/ayat/?pg=download`) وصفحة الإضافات (`https://quran.ksu.edu.sa/ayat/?pg=patches`). كل ملف `.ayt` أرشيف zip أو قاعدة SQLite.

| ما أخذناه | الملف الرسمي | المسار داخله | الجدول |
| --- | --- | --- | --- |
| نص القرآن (الرسم العثماني، برواية حفص) ورقم صفحة المصحف | `https://quran.ksu.edu.sa/ayat/download/programs/Ayat-v1.4_linux.zip` (برنامج آيات 1.4) | `Ayat-v1.4.air` ← `resources/ayat.ayt` | `ayat` (`text`، `safha`) |
| أسماء السور | الحزمة نفسها | `Ayat-v1.4.air` ← `lib/quran-data.js` (`QuranData.Sura`) | — |
| التفسير الميسر | `https://quran.ksu.edu.sa/ayat/tarajem.ayt` | `tarajem/ar_muyassar.ayt` | `ar_muyassar` |
| ترجمة المعاني Sahih International | `https://quran.ksu.edu.sa/ayat/tarajem.ayt` | `tarajem/en_sahih.ayt` | `en_sahih` |
| تفسير السعدي | `https://quran.ksu.edu.sa/ayat/tafasir.ayt` | `tafasir/sa3dy.ayt` | `sa3dy` |

بصمات SHA-256 للملفات المنزّلة تُكتب في `data/raw/ksu/MANIFEST.json`.

### ترجمات معاني القرآن بسبع لغات (الأمر 22، قرار طلال 6 أكتوبر 18:08)

من الأرشيف نفسه `https://quran.ksu.edu.sa/ayat/tarajem.ayt` (بصمته في `MANIFEST.json`)، وكل ملف قاعدة SQLite بالجدول `{id, sura, aya, text}` كما في `en_sahih`. **المترجم كما يسمّيه المصدر** في `trans_name` من `Ayat-v1.4.air` ← `resources/trans.ayt` (يُقرأ آليًا في `scripts/ingest/ksu-build.mjs`):

| اللغة | المسار داخل الأرشيف | الجدول | `trans_name` في المصدر | ما يُعرض مترجمًا |
| --- | --- | --- | --- | --- |
| الأردية | `tarajem/ur_jalandhry.ayt` | `ur_jalandhry` | أردو - جالندربرى | جالندربرى |
| الإندونيسية | `tarajem/id_indonesian.ayt` | `id_indonesian` | Indonesian - Bahasa Indonesia | «أرشيف مشروع آيات» بلغة الواجهة: **المصدر يسمّي اللغة لا المترجم** |
| الملايوية | `tarajem/ms_basmeih.ayt` | `ms_basmeih` | Malay - Basmeih | Basmeih |
| التركية | `tarajem/tr_diyanet.ayt` | `tr_diyanet` | Turkish - Diyanet Isleri | Diyanet Isleri |
| الفرنسية | `tarajem/fr_hamidullah.ayt` | `fr_hamidullah` | Français - Hamidullah | Hamidullah |
| الإسبانية | `tarajem/es_navio.ayt` | `es_navio` | Spanish - Navio | Navio |
| البنغالية | `tarajem/bn_bengali.ayt` | `bn_bengali` | Bengali - Muhiuddin Khan | Muhiuddin Khan |

- **الهندية ليست في الأرشيف:** الواجهة الهندية تعرض المعنى الإنجليزي (Sahih International) كما كانت.
- 6236 آية لكل لغة، ولا نص فارغ، والأزواج `(sura, aya)` نفسها في القرآن؛ النص كما نُزّل بلا تعديل. يُحمَّل إلى الجدول `ayah_translations` في D1 (43,652 صفًا)، ولا يُفهرس للبحث.
- لا صفحة ثابتة لكل آية على الموقع لهذه الترجمات؛ مرجعها الملف أعلاه، ورابط الآية في البطاقة رابط المصدر أ نفسه.
- **إعادة الجلب:** `node scripts/ingest/ksu-fetch.mjs` ثم `node scripts/ingest/ksu-build.mjs` (يكتب `data/processed/ayah_translations.jsonl`)، ثم `node scripts/index/load-translations.mjs` (يكتب SQL) و`npx wrangler d1 execute imuslim --remote --file data/processed/ayah_translations.sql`.

**الروابط في السجلات:**
- `url` = صفحة الآية على الموقع نفسه: `https://quran.ksu.edu.sa/tafseer/saadi/sura{س}-aya{آ}.html` — تعرض نص الآية مع تفسير السعدي لها. الواجهة الرئيسية للموقع تعتمد على JavaScript ولا تعطي رابطًا ثابتًا لكل آية، فهذه أقرب صفحة ثابتة لكل آية.
- `url_en` = صفحة الترجمة الإنجليزية لصفحة المصحف: `https://quran.ksu.edu.sa/translations/english/{الصفحة}.html` (الموقع لا يعرض الترجمة آيةً آية).
- لا توجد على الموقع صفحة ثابتة للتفسير الميسر لكل آية؛ مرجعه ملف `ar_muyassar` أعلاه.
- تحققنا بفتح 3 صفحات (2:255، 112:1، 36:58): نص الآية والسعدي والترجمة مطابقة حرفيًا لما حفظناه (`data/processed/url_checks.json`).

**ملاحظات من المصدر:** ملف السعدي يعطي مدخلًا لكل آية (لذا `saadi_range` = الآية نفسها)، و50 آية مدخلها فارغ في الملف وعلى الموقع؛ تفصيلها في `data/processed/REPORT.md`. ولم نجمع أي صفحة من الموقع إلا صفحات التحقق الثلاث (و`robots.txt` يمنع المسارات `/tafseer/saadi-` و`/translations/english-` فقط، ولم نطلبها).

**إعادة الجلب:**
```
node scripts/ingest/ksu-fetch.mjs          # تنزيل واستخراج (--force لإعادة التنزيل)
node scripts/ingest/ksu-build.mjs          # → data/processed/quran.jsonl (6,236 سجلًا)
node scripts/ingest/ksu-verify-urls.mjs    # فتح 3 روابط عينة والتحقق منها
```

## [ج] المكتبة الشاملة (shamela.ws)

لا يوفر الموقع تنزيلًا رسميًا لكل كتاب (فقط برنامج المكتبة كاملًا)، فقُرئت صفحات الكتابين وحدهما. لا يوجد `robots.txt` على shamela.ws (يعيد 404)، وشروط الاستخدام تسمح بالقراءة والتوثيق. السرعة: صفحة واحدة كل ثانيتين على الأقل. HTML كل صفحة محفوظ في `data/raw/shamela/{رقم الكتاب}/`.

**الطبعات المعتمدة (اختيار طلال، 5 أكتوبر 2026):** أربعة كتب في 112 مقطعًا.

| الكتاب | الطبعة | الرابط | الصفحات المأخوذة |
| --- | --- | --- | --- |
| الأصول الثلاثة | «ثلاثة الأصول وأدلتها – وشروط الصلاة – والقواعد الأربع»، وزارة الشئون الإسلامية والأوقاف والدعوة والإرشاد، ط1 1421هـ، ترقيم موافق للمطبوع | https://shamela.ws/book/239 | قسم «الأصول الثلاثة» (صفحات الموقع 6–25) |
| شروط الصلاة وأركانها | الطبعة نفسها | https://shamela.ws/book/239 | قسم «شروط الصلاة وأركانها» (صفحات الموقع 26–39؛ الصفحة 26 عنوان القسم وحده). أُضيف بقرار طلال (5 أكتوبر 2026) |
| القواعد الأربع | الطبعة نفسها | https://shamela.ws/book/239 | قسم «القواعد الأربع» (صفحات الموقع 40–46) |
| كتاب التوحيد | «كتاب التوحيد» مطبوع ضمن مؤلفات الشيخ محمد بن عبد الوهاب، الجزء الأول، جامعة الإمام محمد بن سعود، تحقيق عبد العزيز بن عبد الرحمن السعيد وغيره، ترقيم موافق للمطبوع | https://shamela.ws/book/11318 | الكتاب كاملًا (145 صفحة) |

**سبب اختيار طبعة كتاب التوحيد:** طلب طلال طبعة الوزارة إن وُجدت، وإلا الطبعة الموافق ترقيمها للمطبوع. بحثنا في صفحة المؤلف على الشاملة (https://shamela.ws/author/152، 41 كتابًا) فلم نجد لكتاب التوحيد إلا هذه الطبعة، وهي موافقة الترقيم للمطبوع.

**ما لم يُؤخذ من الكتاب 239:** «مقدمة الناشر» وحدها. وقسم «شروط الصلاة وأركانها» أُضيف بعد قرار طلال (5 أكتوبر 2026)، بالبناء نفسه، فبقيت السجلات الـ105 السابقة كما هي بايتًا ببايت. وتُعرض مقاطعه وتحتها السطر الثابت من القاعدة 13 في `CLAUDE.md`.

**التقطيع:** كل سجل فقرات متتالية من باب واحد حتى نحو 300 كلمة. نص كل فقرة كما في الصفحة (حُذفت وسوم HTML وأزرار النسخ فقط). عناوين الشاملة بين أقواس مثل «[باب …]» تصير حقل `chapter` ولا تدخل النص، وفقرات بلا حروف (مثل «...») تُتخطى. أبواب كتاب التوحيد من فهرس الشاملة للكتاب. حواشي المحقق (تخريج الآيات والأحاديث) في حقل `footnotes` منفصلًا. `page` رقم الصفحة في المطبوع (`data-page-num`)، و`url` رابط صفحة الشاملة ومعه رقم الفقرة.

**إعادة الجلب:**
```
node scripts/ingest/shamela-fetch.mjs      # يستأنف إن انقطع
node scripts/ingest/shamela-build.mjs      # → data/processed/aqeedah.jsonl
```

## [ب] موسوعة الأحاديث النبوية المترجمة (hadeethenc.com)

حلّت محل sunnah.com في المصدر (ب) بقرار الملحق 0031-add4 (12 أكتوبر 2026). sunnah.com لم يُجلب منه شيء قط (المفتاح لم يصل).

- **ما أُخذ:** كل حديث في كل التصنيفات، بلا انتقاء، باللغات العشر (`ar` `en` `ur` `id` `ms` `tr` `fr` `es` `bn` `hi`): نص الحديث العربي وترجمته، والشرح والفوائد، والدرجة والمخرّج، كما وصلت.
- **المسارات (من التوثيق الرسمي https://hadeethenc.com/api-docs/، مجموعة Postman ‏5211979/TVev3j7q):**
  - `GET https://hadeethenc.com/api/v1/languages`
  - `GET https://hadeethenc.com/api/v1/categories/roots/?language={lang}` (قائمة الجذر تشمل أحاديث فروعه: الجذر 3 ‏«العقيدة» يعد 725 وقائمته 725)
  - `GET https://hadeethenc.com/api/v1/hadeeths/list/?language={lang}&category_id={id}&page={n}&per_page=100` ← `{data:[{id,title,translations}], meta:{current_page,last_page,total_items,per_page}}`
  - `GET https://hadeethenc.com/api/v1/hadeeths/one/?language={lang}&id={id}`. الحقول كما وصلت: في العربية `id` و`title` و`hadeeth` و`attribution` و`grade` و`explanation` و`hints` و`categories` و`translations` و`words_meanings` و`reference`؛ وفي غيرها `id` و`title` و`hadeeth` و`attribution` و`grade` و`explanation` و`hints` و`categories` و`translations` و`hadeeth_intro`، ومعها العربية `hadeeth_ar` و`hadeeth_intro_ar` و`explanation_ar` و`hints_ar` و`words_meanings_ar` و`attribution_ar` و`grade_ar`.
- **الإصدار لكل لغة** (من رأس ملف Excel الرسمي `https://hadeethenc.com/browse/download/{lang}`، 12 أكتوبر 2026): ar ‏v1.7.0، en ‏v1.25.0، ur ‏v1.36.0، id ‏v1.22.0، ms ‏v1.2.0، tr ‏v1.71.0، fr ‏v1.17.0، es ‏v1.23.0، bn ‏v1.56.0، hi ‏v1.59.0. الرأس نفسه ومعه تاريخ آخر تحديث في `data/raw/hadeethenc/MANIFEST.json`. وفي الرأس رابط فحص التحديث: `https://hadeethenc.com/{lang}/check/{lang}/{version}`.
- **الشروط السبعة بنصها من الصفحة الرئيسية (Terms and Policies):**
  > Contents of the translations can be downloaded and re-published, with the following terms and conditions:
  > 1. No modification, addition, or deletion of the content.
  > 2. Clearly referring to the publisher and the source (HadeethEnc.com).
  > 3. Mentioning the version number when re-publishing the translation.
  > 4. Keeping the transcript information inside the document.
  > 5. Notifying the source (HadeethEnc.com) of any note on the translation.
  > 6. Updating the translation according to the latest version issued from the source (HadeethEnc.com).
  > 7. Inappropriate advertisements must not be included when displaying the content of the Prophet’s Hadiths and their translations.
- **الدرجات (`tier`، من الدرجة والمخرّج العربيين):** 1 متفق عليه أو رواه البخاري أو مسلم مع «صحيح»؛ 2 «صحيح» بلا «حسن»؛ 3 «حسن» (ومنه «حسن صحيح»)؛ X ما فيه «ضعيف» أو «موضوع» أو «منكر» أو «لا يصح» أو الفارغ أو ما لا تنطبق عليه القواعد، ولا يدخل `hadith.jsonl` ويُسرد في `data/processed/hadith_excluded.json`.
- **إعادة الجلب والبناء:**

```bash
node scripts/ingest/hadeethenc-fetch.mjs     # طلب كل 1.1 ثانية؛ يستأنف؛ → data/raw/hadeethenc/{lang}/{id}.json وMANIFEST.json
node scripts/ingest/hadeethenc-build.mjs     # → data/processed/hadith.jsonl وhadith_excluded.json
```

## [هـ-صوت] mp3quran.net — التلاوة البشرية (الرمز «و» في جدول `CLAUDE.md`)

**قرار طلال (6 أكتوبر 2026، 04:48، الأمر 17):** mp3quran.net من منصات الجمعيات المذكورة في الحزمة العلمية، ويُضاف مصدرًا **للصوت فقط**. نص الآيات يبقى من (أ) كما هو.

**ما أُخذ (تاريخ الجلب 6 أكتوبر 2026):**
- توقيت بدء كل آية ونهايتها بالمللي ثانية لقارئ واحد، من `https://www.mp3quran.net/api/v3/ayat_timing?surah={n}&read=54`.
- رابط ملف كل سورة الصوتي: خادم القارئ من `https://www.mp3quran.net/api/v3/reciters` (المصحف الذي رقمه 54) + رقم السورة بثلاث خانات: `https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/001.mp3` … `114.mp3`.
- **لا نص، ولا ملفات صوتية عندنا.** الملفات تُشغَّل من خوادمهم مباشرة بضغطة المستخدم. في المستودع ملفات التوقيت وحدها: `web/public/recitation/54/{1..114}.json` و`index.json` (128 كيلوبايت)، ولا يخزّنها عامل الخدمة مسبقًا.

**اختيار القارئ** (أول من يحقق الشرطين بترتيب الأمر: رواية حفص، وتوقيت للسور الـ114):

| القارئ | رقم التوقيت | الرواية في القائمة | السور | النتيجة |
| --- | --- | --- | --- | --- |
| ماهر المعيقلي | 133 | «المصحف المجود» | 114 | تُخطّي: الرواية غير موسومة «حفص» |
| عبدالرحمن السديس | 54 | «حفص عن عاصم» (المصحف: «حفص عن عاصم - مرتل») | 114 | **المختار** |
| سعود الشريم | 31 | «حفص عن عاصم» | 114 | لم يُحتج إليه |
| مشاري العفاسي | 123 | «حفص عن عاصم» | 114 | لم يُحتج إليه |

**الفحوص (إلزامية لكل سورة، والسورة التي تفشل لا تُعرض لها تلاوة):** عدد الآيات المؤقتة يساوي عددها في D1، والآية 0 (البسملة إن جاءت) تُفصل عن الآيات؛ ورقم الآية تسلسلي؛ والبدء قبل النهاية؛ والبدء تصاعدي؛ ولا فجوة سالبة.
**النتيجة:** 114 من 114 سورة ناجحة، و6236 آية، ولا آية 0 في توقيت هذا القارئ (بسملة الفاتحة آيتها الأولى كما في D1). أقصر آية 600 مللي ثانية (الضحى 1)، وأكبر فجوة بين آيتين 20 مللي ثانية (التوبة 75).

**إعادة الجلب:**
```
node scripts/ingest/recitation-timing.mjs --force   # طلب واحد كل 400 مللي ثانية؛ الاستجابات الخام في data/raw/recitation/ (خارج git)
```
السكربت يكتب أيضًا `web/src/config/recitation.json` (رقم القارئ، والخادم، وأصله لسياسة CSP، والسور الناجحة).

**الخصوصية والأمان:** لا طلب إلى mp3quran قبل الضغط (اختبار `web/e2e/recitation.spec.ts` يتحقق من سجل الشبكة)، ولا تشغيل تلقائي، ولا تحميل مسبق. عند الضغط يطلب المتصفح الملف من `cdn.mp3quran.net` فيرون عنوان IP. وسياسة CSP تسمح بـ `media-src 'self' https://cdn.mp3quran.net` وحده.

**الاسم في الواجهة:** سطر النسبة بالعربية «التلاوة: موقع إم بي ثري قرآن» (بلا حروف لاتينية داخل النص العربي، القسم 8) وبالإنجليزية "Recitation: mp3quran.net"، برابط الموقع، بلا اسم القارئ (القاعدة 14: لا أسماء أشخاص في التطبيق) حتى يقرر طلال؛ والتبديل مفتاح واحد `SHOW_RECITER_NAME` في `web/src/quran/recitation.ts`.

## [ط] موسوعة القرآن الكريم (quranenc.com): ترجمات معاني القرآن (رد 0032)

**الشروط بنصها** (من تذييل صفحات الموقع «الشروط والسياسات»، مثل https://quranenc.com/ar/home/api، قُرئت 13 أكتوبر 2026):

> يتاح تنزيل محتوى الترجمات وإعادة نشره، بالشروط والضوابط التالية:
> 1. عدم التعديل أو الإضافة أو الحذف على المحتوى.
> 2. الإشارة بوضوح للناشر وللمصدر (QuranEnc.com).
> 3. ذكر رقم الإصدار عند إعادة نشر الترجمة.
> 4. إبقاء معلومات نسخة الترجمة الموجودة داخل المستند.
> 5. إفادة المصدر (QuranEnc.com) بأي ملاحظة على الترجمة.
> 6. تطوير الترجمات وفق النسخ الجديدة الصادرة من المصدر (QuranEnc.com).
> 7. عدم تضمين إعلانات لا تليق بترجمات معاني القرآن الكريم عند العرض.

**كيف نلتزم بها:**
- **(1) و(4):** النص والحواشي كما وصلت.
- **(2) و(3):** سطر «ترجمة معاني» فيه اسم المترجم، و«موسوعة القرآن الكريم، الإصدار X»، ورابط الترجمة.
- **(6):** إعادة الجلب مع كل إصدار (الإصدار في MANIFEST).
- **(7):** لا إعلانات في التطبيق.

**الجلب:**
- `node scripts/ingest/quranenc-fetch.mjs`: طلب في الثانية.
  - `/api/v1/translations/list` للإصدارات.
  - `/api/v1/translation/sura/{key}/{sura}` للنصوص.
- الردود الخام في `data/raw/quranenc/` خارج git، مع MANIFEST.
- المفاتيح الـ27 في السكربت كما في جدول رد 0032، وكلها موجودة في `/translations/list` (13 أكتوبر).

## الميزات اليومية: أوقات النهي وما يُحسب على الجهاز (الملحق 0031-add10)

**أوقات النهي، والنصوص التي تُعرض معها** (من أمر المنسّق، ولم تُعرض بعد):
- ابن باز، الفتوى 10693: «بعد طلوع الشمس إلى أن ترتفع قيد رمح».
- ابن باز، الفتوى 12348: وقوف الشمس «نحو ثلث ساعة، أو ربع ساعة».
- ابن عثيمين، «الشرح الممتع» 4/88: «قُبيل الزَّوال بنحو عشر دقائق».
- **لم تُتحقق بعد (13 أكتوبر):**
  - الرابطان `binbaz.org.sa/fatwas/10693` و`/12348` يحوّلان إلى فتويين في موضوعين آخرين (`/fatwas/6841` «حكم اتخاذ مكان معين في المسجد…» و`/fatwas/8363`).
  - وكذلك فتويا صفحة «لماذا لا نعرضها؟»: 15824 ← `/fatwas/11669`، و13471 ← `/fatwas/9445`.
  - فالأرقام ليست أرقام الصفحات في الموقع. وبحث الموقع يُبنى في المتصفح فلم أقرأه.
  - **لا يُعرض أي من هذه النصوص حتى تُعرف روابطها الصحيحة وتُطابق حروفها.**
- **الحساب** (`web/src/daily/forbidden.ts`):
  - من الشروق 15 دقيقة.
  - ومن الظهر −10 دقائق حتى الظهر.
  - ومن بعد صلاة العصر حتى الغروب.
- **الظهر في adhan** هو لحظة الزوال (`solarTime.transit`) مقرّبة لأقرب دقيقة. فقد يسبق الزوال بما لا يزيد على 30 ثانية. وطريقة أم القرى لا تضيف له تعديلًا، بخلاف رابطة العالم الإسلامي (+1 دقيقة).

**ما يُحسب على الجهاز ومراجعه:**
- **المواقيت:** adhan 4.4.4، طريقة أم القرى. وعشاء رمضان +30 دقيقة، لأن المكتبة لا تضيفه.
- **القبلة:** adhan `Qibla`، والانحراف المغناطيسي بـmagvar 2.2.0 (نموذج WMM2025).
  - فحص magvar على [قيم NOAA الرسمية](https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt).
  - قيم القبلة المرجعية من اختبارات adhan المنشورة (`test/qibla.test.ts`)، ومعها معادلة الاتجاه الكروي مستقلة عن المكتبة.
- **الهجري:** `Intl` بتقويم `islamic-umalqura` صراحةً. فإن غاب عن المتصفح لا يُعرض شيء (لا جدول احتياطي).
- **المدن:** GeoNames cities15000 ([الرخصة CC BY 4.0](https://download.geonames.org/export/dump/readme.txt)):
  - 34,160 مدينة.
  - الملف المختصر `data/processed/cities.json` حجمه 2.24 م.ب، و881 ك.ب مضغوطًا.
- **المساجد:** OpenStreetMap عبر Overpass، بخانة ~1 كم من الجهاز، والإسناد «© OpenStreetMap contributors».

## التحقق والعينات

```
node scripts/ingest/validate.mjs           # → data/processed/REPORT.md
node scripts/ingest/make-samples.mjs       # → data/samples/ (20 سجلًا لكل مصدر، مع النسبة)
```

## ما لم يُفهرس عمدًا

dorar.net (للتحقق اليدوي من سالم فقط)، ومصادر د (alifta.gov.sa وغيرها: إحالة فقط)، ومصادر هـ (مقارنة يدوية فقط)، وmp3quran.net (صوت فقط، لا نص يُفهرس) — حسب `CLAUDE.md`.
