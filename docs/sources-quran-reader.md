# مصادر ميزات قارئ القرآن في 1.1 (الملحق 0072-add60)

كل مصدر برخصته، مقروءة من صفحتها يوم الاستعمال، برابطها ونصها. وما منعته رخصته لا يُستعمل ولا يُلتف عليه (القاعدة في الملحق، والقسم 2 من `CLAUDE.md`).
البنود 1–4 لوكيليها (أ) و(ج) في أقسامهما من هذا الملف. وهنا البنود 5 و6 و7 (الوكيل ب).

## البند 5: الخط والحجم

| المصدر | الرابط | الرخصة بنصها | قُرئت |
| --- | --- | --- | --- |
| Amiri (الموجود في التطبيق، `@fontsource/amiri` 5.3.0) | https://fontsource.org/fonts/amiri | «This Font Software is licensed under the SIL Open Font License, Version 1.1.» (ملف `LICENSE` في الحزمة) | 1 نوفمبر 2026 |
| Amiri Quran (`@fontsource/amiri-quran` 5.3.0، جديد) | https://fontsource.org/fonts/amiri-quran | «Copyright 2010-2022 The Amiri Project Authors (https://github.com/aliftype/amiri). This Font Software is licensed under the SIL Open Font License, Version 1.1.» (ملف `LICENSE` في الحزمة، و`"license": "OFL-1.1"` في سجل npm) | 1 نوفمبر 2026 |

- **الاستعمال:** الخطان من عائلة أميري وحدها، كما يقضي القسم 8 من `CLAUDE.md` (الآيات بخط النسخ أميري). مستضافان ذاتيًا، والقسم العربي وحده (`unicode-range`)، والمسافة فيهما لعلامات الوقف.
- **التغطية:** حروف نص المصحف كلها في D1 (55 محرفًا مختلفًا في `quran.jsonl`) موجودة في الخطين، فُحصت بـ fontTools في 1 نوفمبر.
- **النص لا يتغير:** يُرسم بالخط والحجم المختارين، ولا يُعدَّل منه حرف. والأرقام في علامة الآية وحدها (هندية «١٢٣» افتراضيًا، أو عربية «123»).
- **ما لم يُضف:** خطوط مجمع الملك فهد (KFGQPC وغيرها) بانتظار قرار طلال، فلا تُضاف هنا.

## البند 6: القرّاء

**المصدر (و):** mp3quran.net، معتمد بقرار طلال 6 أكتوبر.

- **الرخصة:** https://www.mp3quran.net/ar/privacy (و https://www.mp3quran.net/eng/privacy)، قُرئت 1 نوفمبر 2026:
  > الحقوق: جميع الحقوق متاحة للجميع و يحق لأي زائر أو مطور استخدام اي مادة أو رابط من الموقع
  >
  > Copyrights: All rights are available to everyone, and we allow any visitor or developer to copy any material or use any link on the websites
- **الواجهة:** https://www.mp3quran.net/ar/api، قُرئت 1 نوفمبر 2026، ولا شروط فيها غير ما سبق.
- **ما يُؤخذ:**
  - توقيت الآيات من `/api/v3/ayat_timing/reads` و`/api/v3/ayat_timing?surah=&read=`.
  - خادم القارئ واسمه بالعربية والإنجليزية من `/api/v3/reciters`.
  - حجم ملف كل سورة بطلب HEAD.
- **قاعدة القائمة:** كل قراءة موقوتة موسومة «حفص» بسورها الـ114، وكل سورة فيها تجتاز فحوص التوقيت.
  - الستة الأوائل كما كانوا، والسديس أولهم وهو الافتراضي.
  - ثم البقية بترتيب mp3quran، بلا انتقاء منا ولا حذف.
  - ولا رواية تُخمَّن: «المصحف المجود» وورش وقالون وغيرها خارجها.
- **النتيجة (1 نوفمبر 2026):** 86 قارئًا، كلهم برواية حفص، من 96 قراءة مرشحة. والعشرة الباقون تُخطّوا لأن سورة أو أكثر فشلت في الفحص، ولا تُعرض تلاوة لم تُفحص:
  - سعود الشريم (31): عدد الآيات المؤقتة في التوبة ويوسف والطلاق يخالف D1.
  - محمود خليل الحصري (118): الفاتحة 6 آيات مؤقتة، وفي D1 سبع.
  - محمد صديق المنشاوي (112): التوبة 128 آية مؤقتة، وفي D1 129.
  - إبراهيم الأخضر (1)، وعبدالله بصفر (60)، وعلي حجاج السويسي (77): بدء آية لا يسبق نهايتها.
  - عبدالله عواد الجهني (62)، وعبدالمحسن القاسم (67)، ونبيل الرفاعي (87)، وعلي الحذيفي (74): عدد الآيات المؤقتة يخالف D1.
  - والسجل كاملًا في مخرجات `scripts/ingest/recitation-timing.mjs`.
- **الحجم:** ملفات التوقيت 11.4 ميغابايت في `web/public/recitation/` (9890 ملفًا). ومجموع تلاوات القراء الـ86 كاملة 140.6 غيغابايت على خوادمهم، لا يُنزَّل منها شيء إلا بضغطة.
- **الصوت:** ملفات mp3quran نفسها على `cdn.mp3quran.net`.
  - تُشغَّل بضغطة المستخدم، وتُنزَّل بضغطته: سورة، أو نطاق من سورة إلى سورة، أو المصحف كاملًا.
  - الحجم يظهر قبل البدء، ولا يُستضاف عندنا شيء منها.
- **المفضلة:** النجمة في `muslim.reading.v1` (`favReciters`)، وهو مما يُنسخ إلى iCloud في الآيفون (`web/src/storage/cloud.ts`).

## البند 7: ترجمات المعاني والمختصر

**المصدر (ط):** quranenc.com، معتمد (الملحق 0031-add14؛ `docs/permissions/quranenc-terms.md`).

- **الشروط:** من تذييل https://quranenc.com/ar/home/api، قُرئت 1 نوفمبر 2026، ولم تتغير عن 13 أكتوبر:
  > يتاح تنزيل محتوى الترجمات وإعادة نشره، بالشروط والضوابط التالية:
  > 1. عدم التعديل أو الإضافة أو الحذف على المحتوى.
  > 2. الإشارة بوضوح للناشر وللمصدر (QuranEnc.com).
  > 3. ذكر رقم الإصدار عند إعادة نشر الترجمة.
  > 4. إبقاء معلومات نسخة الترجمة الموجودة داخل المستند.
  > 5. إفادة المصدر (QuranEnc.com) بأي ملاحظة على الترجمة.
  > 6. تطوير الترجمات وفق النسخ الجديدة الصادرة من المصدر (QuranEnc.com).
  > 7. عدم تضمين إعلانات لا تليق بترجمات معاني القرآن الكريم عند العرض.
- **القائمة الرسمية:** https://quranenc.com/api/v1/translations/list، قُرئت 1 نوفمبر 2026. فيها 76 ترجمة في 56 لغة.
- **اللغات الجديدة (28):** كل لغة في القائمة غير الـ31 المخدومة اليوم، بمفتاح واحد لكل لغة.
  - **قاعدة الاختيار:** ترجمة مركز رواد الترجمة (`*_rwwad`) حيث تعددت الترجمات، كأغلب الـ27، وإلا الأحدث تحديثًا.
  - aa `afar_hamza`، ak `asante_harun`، am `amharic_sadiq`، ceb `bisayan_rwwad`، de `german_rwwad`، gu `gujarati_omari`، ha `hausa_gummi`.
  - hr `croatian_rwwad`، kn `kannada_hamza`، ln `lingala_zakaria`، lt `lithuanian_rwwad`، mdh `maguindanao_rwwad`، mk `macedonian_group`.
  - mos `moore_rwwad`، nl `dutch_center`، nqo `ankobambara_dayyan`، om `oromo_rwwad`، pa `punjabi_arif`، pt `portuguese_nasr`، rn `ikirundi_gehiti`.
  - ro `romanian_project`، rw `kinyarwanda_assoc`، so `somali_yacob`، sq `albanian_rwwad`، sv `swedish_rwwad`، sw `swahili_rwwad`، tg `tajik_arifi`، yo `yoruba_mikail`.
  - **الأفريقية منها (13):** العفرية، والأكانية، والأمهرية، والهوسا، واللينغالا، والمورية، وإنكو (البمبارا بحرف إنكو)، والأورومية، والكيروندية، والكينيارواندية، والصومالية، والسواحيلية، واليوروبا.
- **المختصر:** مفاتيح `*_mokhtasar` في صفحة الموسوعة الرئيسية اليوم هي الـ29 نفسها المجلوبة في 13 أكتوبر، فلا لغة جديدة له.
- **العرض:**
  - «ترجمة معاني» باسم المترجم كما في عنوان الموسوعة، ورقم الإصدار، ورابط الترجمة.
  - لا تُترجم آليًا ولا تُعدَّل ولا تُفهرس.
  - لغات الواجهة تبقى العشر: اللغة الجديدة لغة محتوى، وواجهتها الإنجليزية، كما في رد 0033 §أ1.
- **للسؤال لا للاستعمال:** ترجمات في صفحة الموسوعة الرئيسية وليست في قائمتها الرسمية `/translations/list`.
  - منها الروسية والإيطالية والكورية والكازاخية والزولو والشونا والشيشيوا واللوغندية واللوهيا والمالاغاشية والدغبانية والياؤو.
  - ومنها الجورجية واليونانية والعبرية والأوكرانية والبيلاروسية والبلغارية والشركسية والماراتية والنيبالية والدرية والكرمانجية والإيرانونية.
  - وبعضها موسوم «جارٍ العمل عليها».
  - لم تُجلب، لأن السكربت لا يأخذ إلا ما في القائمة الرسمية. وإدخالها قرار لطلال.

## البند 1: خطوط المجمع وصفحات المصحف (الوكيل ج)، لم يُبنَ منه شيء

**الموافقة:** الملحق 0072-add62 §4. QCF V2 «بشرط رخصته الرسمية من موقعه، وإن لم تُوجد فلا»، وورش «من طبعة المجمع وحدها إن وُجدت»، وخط «حفص العثماني» استثناءً من §8 «بشرط رخصته». قُرئ كل ما يلي من مواقع المجمع نفسها يوم 1 نوفمبر 2026، ولا تُعدّ النسخ عند غيره (GitHub، Arch، Debian، QUL) رخصة.

### ما في مواقع المجمع
- **موقع الخطوط:** https://fonts.qurancomplex.gov.sa/ وفيه «الخطوط» و«القراءات العشر» https://fonts.qurancomplex.gov.sa/ten-readings و«المدرجات». لا صفحة شروط فيه. وتذييل كل صفحة: «جميع الحقوق محفوظة لمجمع الملك فهد لطباعة المصحف الشريف © 2022».
- **سياسة مواقع المجمع:** https://policy.qurancomplex.gov.sa/ (ويحيل إليها https://qurancomplex.gov.sa/privacypolicy/)، فقرة «ترخيص الاستخدام»:
  > إن جميع محتويات مواقع مجمع الملك فهد لطباعة المصحف الشريف ، بما فيها النصوص والرسوم والصور ومصنفات البيانات، وقوائم العناوين، كل ذلك ملكٌ لمجمع الملك فهد، تحميه قوانين حقوق التأليف والنشر السعودية والدولية، باستثناء بعض الخدمات، والملفات الحاسوبية، والأدوات البرمجية، وغيرها التي يصـرِّح المجمع بإتاحتها للاستخدام العام.

### 1. خط «حفص العثماني» (KFGQPC HAFS Uthmanic Script): الرخصة تسمح، والنص لا يُرسم في الآيفون، فلم يُشحن
- **الملف:** صفحة https://fonts.qurancomplex.gov.sa/hafs-reading، الإصدار 3.0 (`KFGQPC-Hafs-V30.zip`، 827 كيلوبايت: ملف الخط `KFGQPC Hafs V30.ttf` 301,356 بايت، وملف Word بالمصحف كاملًا). والإصدار 2.1 (`UthmanicHafs_v2-1.zip`) برخصته نفسها حرفًا بحرف.
- **الرخصة:** لا نص لها في الصفحة. نصها داخل ملف الخط الرسمي (جدول `name`، المعرّف 13)، بحروفه:
  > ELECTRONIC END-USER LICENSE AGREEMENT
  > By installing this Font You accept all the terms and conditions of this Agreement.
  > Copyright (c) 2010 by King Fahd Glorious Quran Printing Complex (KFGQPC), AlMadinah AlMunawarrah, Kingdom of Saudi Arabia. All Rights Reserved. KFGQPC retains full title and ownership of this Typeface both as artwork and font software. This Agreement does not grant you any intellectual property rights in the Font.
  > Permission is hereby granted, Free of Cost, to any person obtaining a copy of this Font accompanying this license, the rights to Use, Copy, Distribute, subject to the following conditions:
  > 1. The Font Software cannot be Sold, Modified, Altered, Translated, Reverse Engineered, Decompiled, Disassembled, Reproduced or Attempted to discover the Source Code of this Font in no means.
  > 2. The Font Software is provided "AS IS", and KFGQPC makes no warranties as to its use or performance, fitness for a particular purpose. […]
  - وحقل الحقوق (المعرّف 0): «All rights reserved. This Font is the property of King Fahd Glorious Quran Printing Complex, and may not be reproduced, modified without the express written approval of King Fahd Glorious Quran Printing Complex.»
  - و`fsType` = 0 (التضمين مسموح في علامة الخط).
  - **القراءة:** الاستعمال والنسخ والتوزيع مجانًا مسموحة، فالحزم في التطبيق جائز بالملف كما هو. والممنوع: البيع، والتعديل، فلا تقطيع (subset) ولا تحويل إلى woff2. وفي البند 1 كلمة «Reproduced» بجانب «Copy, Distribute»، وهو سؤال لطلال إن احتيج إليه.
- **التغطية:** حروف `quran.jsonl` 55 محرفًا. الخط فيه 54، وليس فيه **U+0622 «آ» (ألف المد)**، وهي في (أ) 1,511 مرة في 1,286 آية و315 كلمة مختلفة. والخط يكتبها حرفين: U+0627 ثم U+0653 (المدة).
- **الرسم بالنص نفسه، بلا تبديل حرف:**
  - HarfBuzz (كروم وأندرويد): يفكّ «آ» إلى حرفيه المتكافئين في يونيكود، فلا مربع ولا خط بديل في الآيات الـ6,236، والكلمات الـ315 مطابقة بكسل لكسل لنسختها المفكوكة.
  - **WebKit (محرك الآيفون، Playwright WebKit على ماك):** الكلمات الـ315 كلها تختلف. يرسم «آ» بخط بديل فتنقطع الكلمة، مثل «وَبِالْآخِرَةِ» (البقرة 4) تظهر «وَبِالْ آ خِرَةِ»، و«آمَنُوا» و«الْآخِرِ» و«آمَنَّا» و«آمِنُوا».
  - إصلاحه يحتاج نصًا آخر (U+0622 ← U+0627 U+0653) أو تعديل الخط، وكلاهما ممنوع: الأول طبقة نص غير (أ)، والثاني يمنعه البند 1 من الرخصة.
- **فلم يُشحن ولم يُضف إلى «الخط والحجم»،** وبقي الخطان أميري وأميري قرآن.

### 2. صفحات المصحف بخطوط QCF V2: لا رخصة في مواقع المجمع، فلم تُبنَ
- لا تنشر مواقع المجمع خطوط QCF V2 (خط لكل صفحة من 604)، ولا رخصة لها: ليست في موقع الخطوط، ولا في صفحة التطبيقات https://qurancomplex.gov.sa/apps/، ولا في «خدمة تضمين المحتوى» https://qurancomplex.gov.sa/embed-isdarat/ (إطارات iframe لكتب مصورة على موقعهم، لا ملفات).
- أقرب ما في المجمع: برنامج «مصحف المدينة النبوية للنشر الحاسوبي» لويندوز https://nashr.qurancomplex.gov.sa/ (الإصدار 3.16، 134 ميغابايت)، «يتضمن خط الرسم العثماني الموافق لمصحف المدينة النبوية بروايتي حفص وورش»، وليس في صفحته نص رخصة لإعادة توزيع خطوطه. فلم يُنزَّل.
- النسخ المعروفة من QCF V2 (Quran.com وQUL) عند غير المجمع، فلا تُعدّ رخصة بشرط طلال.
- **ولو وُجدت الرخصة:** خطوط QCF ترمّز كل كلمة برمز خاص (منطقة الاستعمال الخاص) لا بحروفها، فالنص المرسوم طبقة رموز غير `quran.jsonl`، ويحتاج جدول تحويل من خارج المجمع.

### 3. ورش: طبعة المجمع موجودة، ونصها ليس من (أ)، فلم تُبنَ
- **الموجود:** «الخط الحاسوبي (يونيكود) لرواية ورش 3.0» https://fonts.qurancomplex.gov.sa/warsh-reading (`KFGQPC-Warsh-V30.zip`، 1.05 ميغابايت: الخط وملف Word بالمصحف كاملًا برواية ورش)، برخصة الخط نفسها نصًا (حقوقه 2008، ورقم الإيداع 1430/7270).
- **المانع:** نص ورش ليس في (أ)؛ مصدرنا للنص القرآني حفص وحده. ونص ملف Word من qurancomplex.gov.sa، وهو في الجدول (هـ) «مقارنة يدوية فقط، لا تُفهرس». فإدخاله مصدرًا جديدًا للنص قرار لطلال.

## الملحق 0072-add62 §3: القرّاء العشرة المستبعدون (الوكيل ج)، لم يعد منهم أحد

**القرّاء:** الشريم (31)، والحصري (118)، والمنشاوي (112)، والأخضر (1)، وبصفر (60)، والسويسي (77)، والجهني (62)، والقاسم (67)، ونبيل الرفاعي (87)، والحذيفي (74). قُرئت رخصة كل مصدر ثانٍ يوم 1 نوفمبر 2026:

| المصدر | من فيه من العشرة | الرخصة بنصها | النتيجة |
| --- | --- | --- | --- |
| Quran.com (`api.quran.com/api/qdc/audio`، والصوت على `download.quranicaudio.com`) | الشريم (10)، والحصري (6)، والمنشاوي (9) | https://quran.com/terms-and-conditions (آخر تحديث 28 يوليو 2026): §1.4 «available by means of the Service FOR YOUR PERSONAL, NON-COMMERCIAL USE ONLY»؛ §2.2 (vi) «distribute or link the Service to multiple Mobile Devices or other services» و(viii) «use the Service for data mining, scraping, crawling, redirecting, or compiling a collection of listings or data for any purpose»؛ §2.3 «you will not copy, reproduce, alter, modify, create derivative works from, rent, lease, loan, sell, distribute or publicly display any of the Content (except for your own personal, non commercial use) accessed by the Service without the prior written consent of Quran.com» | **لا تسمح** بأخذ التوقيت إلى تطبيق آخر ولا بربط صوتها |
| QuranicAudio.com (مضيف ملفات Quran.com) | — | https://quranicaudio.com/about: «Mp3s on this site may be downloaded and used for personal use free of charge. However, you may not use these files for commercial purposes as many of these files have rules and regulations that prevent their sale except by the publishing companies.» | استعمال شخصي فقط؛ لا إذن لتطبيق |
| EveryAyah.com | بصفر، والحصري، والحذيفي، والأخضر، والمنشاوي، وغيرهم (ملف لكل آية) | لا نص رخصة ولا شروط في https://everyayah.com/ ولا في `/data/` ولا في صفحة التلاوات؛ و«Contact Us» يحيل إلى quran.zendesk.com | **لا رخصة مكتوبة**، فلا يُستعمل (المعيار نفسه الذي أوقف موارد QUL) |
| Quran Foundation API (المصدر «ك»، بحساب طلال) | لم يُتحقق بلا مفاتيح؛ وهي خلفية Quran.com، فالمتوقع الثلاثة أنفسهم | https://api-docs.quran.foundation/legal/developer-terms (آخر تحديث 2026-10-11): «QF Content: Quran text, translations, metadata, audio […]»؛ §2.2 «Developer may display QF Content to end users within the Application»؛ §3.1 «Cache or store QF Content longer than 1 week unless it is obtained and maintained through the Content Sync APIs […]»؛ «The Content Sync storage exception does not itself authorize distributing a prepackaged database or build-time bundle of QF Content.» وفي Content Sync مجموعة `chapter_recitations`: «Chapter audio file rows and associated verse and word timing segment rows.» | **تسمح بشروط:** من الخادم وحده بتوكن، ولا حزم للتوقيت في التطبيق، ومزامنة كل 7 أيام، والإنتاج لم يُمنح بعد (Prelive). ولا مفاتيح محلية للتجربة. ولم يُبنَ: قرار لطلال |

- **فحص التوقيت** (الفحوص نفسها في `scripts/ingest/recitation-timing.mjs`)، على العينة التي قُرئت وحدها، لأن شروط Quran.com تمنع جمع البيانات:
  - الحصري: الفاتحة 7 آيات (في mp3quran 6)، والتوبة 129، بلا خلل.
  - المنشاوي: التوبة 129 (في mp3quran 128)، بلا خلل.
  - الشريم: التوبة 129، لكن بدء كل آية قبل نهاية سابقتها بنحو 9 مللي ثانية (9:2 تبدأ 8371 وسابقتها تنتهي 8380)، فيفشل في «لا فجوة سالبة» كما هو.
- **السبعة الباقون** (الأخضر، وبصفر، والسويسي، والجهني، والقاسم، والرفاعي، والحذيفي) ليسوا في قائمة Quran.com، وتلاواتهم المفردة عند EveryAyah بلا رخصة.

## الملحق 0072-add62 §3: صور القرّاء (الوكيل ج)

**القاعدة:** صورة لكل قارئ من مصدر برخصة تسمح: صفحة القارئ في مصدر الصوت نفسه، أو ويكيميديا كومنز برخصتها، مع الإسناد في «المصادر والشكر». ولا صورة مولّدة لشخص حقيقي. قُرئ كل ما يلي يوم 1 نوفمبر 2026.

- **mp3quran.net:** لا صور للقرّاء. صفحة القارئ (مثل https://www.mp3quran.net/ar/sds) فيها شعار الموقع وصور إصدارات فقط، و`/api/v3/reciters` بلا حقل صورة.
- **ويكيميديا كومنز:** بحثٌ واحد في ويكي بيانات (الصورة P18 لكل قارئ باسمه العربي)، وبحث في ملفات كومنز باسمه العربي والإنجليزي، للقرّاء الثمانين الذين لا صورة لهم. وقُرئت رخصة كل ملف من صفحته (`extmetadata`).

### المضافة (9)، كلها CC BY-SA 4.0، والقص يبقى تحتها
| القارئ (رقم mp3quran) | الملف | المؤلف كما في كومنز | ملاحظة |
| --- | --- | --- | --- |
| أحمد نعينع (9) | https://commons.wikimedia.org/wiki/File:DrAhmedNeinaa.jpg | NeinaaQari، «Own work» | |
| الزين محمد أحمد (13) | https://commons.wikimedia.org/wiki/File:الزين_محمد_أحمد.png | Hammam haom، «Own work» | صورة مفرّغة أصلًا، تشبه لقطة تلفاز |
| سعد الغامدي (30) | https://commons.wikimedia.org/wiki/File:Saad_al_Ghamdi.jpg | «الشيخ هيثم الدخين»، «Own work» | اسم الرافع اسم قارئ آخر، وتاريخها «1970-01-01»: توثيق ضعيف |
| شيرزاد عبدالرحمن طاهر (38) | https://commons.wikimedia.org/wiki/File:الشيخ_المقرئ_شيرزاد_عبدالرحمن_طاهر_الأمين_العام_لمجمع_القران_الكريم_بالشارقة.jpg | Sherzaad1، «Own work» | |
| صابر عبدالحكم (39) | https://commons.wikimedia.org/wiki/File:المقرئ_صابر_عبد_الحكم_أيمن_ذو_الغنى.jpg | Ayman dhū alghiná، «Own work» | صورة لاثنين؛ قُصّ القارئ وحده، والآخر أيمن ذو الغنى كما في صوره الأخرى على كومنز |
| صلاح البدير (43) | https://commons.wikimedia.org/wiki/File:Salah_Ibn_Mohammed_Al_Budair.jpg | Salah Al Budair، «Own work» | الرافع باسم الشيخ نفسه |
| عبدالعزيز الأحمد (55) | https://commons.wikimedia.org/wiki/File:صورة_شخصية_عبد_العزيز_الأحمد.jpg | Ayman dhū alghiná، «Own work» | مصوّر صورة القطامي نفسه |
| رعد محمد الكردي (221) | https://commons.wikimedia.org/wiki/File:Raad_Mohammad_Al_Kurdi.png | Radi omar، «Own work» | الأصل 300×350 |
| عبدالرشيد صوفي (258) | https://commons.wikimedia.org/wiki/File:Abdul-Rachid_Soufi.png | Abdul Rachid Soufi (المصدر والمؤلف)، `{{self|cc-by-sa-4.0}}` و`{{PD-Somalia}}` | الرافع باسم الشيخ نفسه |

- **المعالجة:** كما في الصور المعتمدة (رد 0054 أ1): قص إلى الرأس والكتفين، وتفريغ على أبيض بـ rembg 2.0.61 ونموذج `u2net_human_seg`، و336×336، وJPEG بجودة 90 (جداول التكميم نفسها في الصور الست). وصورة نعينع مُسحت منها بقية الأريكة خلف كتفه يدويًا من القناع. ولا تعديل غير ذلك، ولا توليد.
- **الإسناد:** صف لكل صورة في `data/sources.json` (مجموعة «التلاوة» في «المصادر والشكر»)، باسم المؤلف والرخصة ورابط الملف، بالعشر؛ وصف في `docs/COMPONENTS.csv`.

### وُجدت ولم تُستعمل
- **رخصة مكتوبة من الرافع لصورة أخذها من موقع آخر، والمؤلف «Unknown author»:**
  - عبدالبارئ الثبيتي (49): https://commons.wikimedia.org/wiki/File:Abdulbari_ath-Thubaity_delivering_sermon_at_Prophet's_Mosque_Medina.jpg، CC BY-SA 4.0، المصدر peopleofmadina.com.
  - عبدالله المطرود (59): https://commons.wikimedia.org/wiki/File:Abdullah_Al_Matroud.jpg، CC BY-SA 4.0، المصدر tvquran.com.
  - عبدالله البعيجان (58): https://commons.wikimedia.org/wiki/File:Abdullah_Al-Baijan.jpg، CC0، المصدر almowaten.net.
  - علي جابر (76): ثلاثة ملفات CC BY-SA 3.0 مصدرها alijaber.net، و`File:الشيخ_علي_جابر.png` CC0 «Own work» بتاريخ 2025 للشيخ المتوفى 2005، وعليها آثار ترميم آلي، فلم تُستعمل.
- **الهوية غير مؤكدة:** عادل ريان (48): `File:الشيخ_عادل_ريان_2013-11-02_16-56.jpg` (CC BY-SA 3.0) فيها ثلاثة رجال بلا تعيين.
- **دون جودة الصور المعتمدة:** أحمد عيسى المعصراوي (289): `File:Ahmed_elmasrwy.png` (CC BY 3.0، من يوتيوب) 190×371 والوجه نحو 40 بكسل؛ ومنصور السالمي (245): `File:Mansurahsalme.jpg` (CC BY-SA 4.0) لقطة فيديو والميكروفون على الفم.
