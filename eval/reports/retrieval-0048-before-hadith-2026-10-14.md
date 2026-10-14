# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T06:48:12.519Z على 54 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 23 | 4.3% | 4.3% | 4.3% | 0.043 | — | 4/23 |
| الجديد | تحقق (زوجي) | 22 | 0.0% | 0.0% | 0.0% | 0.000 | 1/1 | 0/23 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 31 | 3.2% | 3.2% | 0.032 |
| en | 8 | 0.0% | 0.0% | 0.000 |
| ur | 1 | 0.0% | 0.0% | 0.000 |
| id | 1 | 0.0% | 0.0% | 0.000 |
| fr | 1 | 0.0% | 0.0% | 0.000 |
| tr | 1 | 0.0% | 0.0% | 0.000 |
| bn | 1 | 0.0% | 0.0% | 0.000 |
| hi | 1 | 0.0% | 0.0% | 0.000 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (1)

- h046 (en): What is zakat? — ضابط: آيات الزكاة الخمس كما في q الأصلي

## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **h001** (ضبط (فردي)، ar) ما أركان الإسلام؟ — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+ayah+lex 0.516] · الفجر: 2 [vector+tafsir 0.455] · المؤمنون: 52 [vector+tafsir 0.430] · آل عمران: 85 [vector+ayah 0.404] · البقرة: 132 [vector+tafsir 0.439]
- **h002** (تحقق (زوجي)، ar) ما معنى الإحسان؟ — gold: hadith:4563
  - أفضل 5: الرحمن: 60 [vector+ayah+tafsir+lex 0.471] · الأصول الثلاثة – ص 17–19 [vector+ayah+lex 0.550] · النحل: 90 [ayah+lex] · الأصول الثلاثة – ص 14–15 [ayah+lex] · آل عمران: 134 [vector+tafsir 0.536]
- **h003** (ضبط (فردي)، ar) هل تُقبل الأعمال بلا نية؟ — gold: hadith:4560، hadith:66511
  - أفضل 5: غافر: 14 [ayah+tafsir+lex] · غافر: 65 [ayah+tafsir+lex] · العنكبوت: 65 [ayah+lex] · الأعراف: 29 [ayah+lex] · ابراهيم: 40 [ayah+tafsir]
- **h004** (تحقق (زوجي)، ar) ما أحب الأعمال إلى الله؟ — gold: hadith:3365
  - أفضل 5: يوسف: 8 [ayah+tafsir] · الأنعام: 76 [ayah+tafsir] · يوسف: 33 [ayah+tafsir] · الروم: 45 [vector+tafsir 0.462] · البقرة: 218 [vector 0.533]
- **h005** (ضبط (فردي)، ar) ما فضل صلاة الجماعة على صلاة الفرد؟ — gold: hadith:3441
  - أفضل 5: الأنعام: 72 [ayah+tafsir+lex] · البقرة: 238 [ayah+tafsir+lex] · طه: 14 [vector+ayah+lex 0.443] · العنكبوت: 45 [vector+ayah+lex 0.449] · البقرة: 43 [ayah+tafsir+lex]
- **h006** (تحقق (زوجي)، ar) ما فضل الوضوء؟ — gold: hadith:6263، hadith:65004، hadith:66526
  - أفضل 5: المائدة: 6 [ayah+tafsir+lex] · الحديد: 29 [ayah+tafsir] · آل عمران: 74 [ayah+tafsir] · النور: 14 [ayah+tafsir] · الحديد: 21 [ayah+tafsir]
- **h007** (ضبط (فردي)، ar) هل السواك سنة عند الصلاة؟ — gold: hadith:3364، hadith:8374
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.420] · النساء: 103 [vector+ayah+tafsir+lex 0.416] · الأنعام: 72 [ayah+tafsir+lex] · الإسراء: 78 [vector+ayah+tafsir 0.445] · البقرة: 43 [vector+ayah+lex 0.440]
- **h008** (تحقق (زوجي)، ar) ما فضل صيام رمضان؟ — gold: hadith:4196
  - أفضل 5: البقرة: 185 [vector+ayah+tafsir+lex 0.526] · البقرة: 183 [vector+ayah+tafsir+lex 0.463] · البقرة: 187 [vector+ayah+tafsir+lex 0.434] · البقرة: 184 [vector+tafsir 0.472] · الأصول الثلاثة – ص 16 [ayah+lex]
- **h009** (ضبط (فردي)، ar) متى تُطلب ليلة القدر؟ — gold: hadith:4540، hadith:4545، hadith:4202
  - أفضل 5: القدر: 3 [vector+ayah+tafsir+lex 0.534] · القدر: 2 [vector+ayah+tafsir+lex 0.497] · القدر: 1 [vector+ayah+tafsir+lex 0.539] · الدخان: 3 [vector+ayah+tafsir 0.478] · الدخان: 4 [vector+tafsir 0.504]
- **h010** (تحقق (زوجي)، ar) هل الصدقة تنقص المال؟ — gold: hadith:5512
  - أفضل 5: البقرة: 262 [vector+ayah+lex 0.469] · الحديد: 7 [ayah+tafsir+lex] · الروم: 39 [vector+tafsir 0.508] · التوبة: 53 [ayah+lex] · التغابن: 16 [tafsir+lex]
- **h011** (ضبط (فردي)، ar) من أحق الناس بحسن صحبتي؟ — gold: hadith:4182 — **اعتذر**
  - أفضل 5: يونس: 53 [ayah+tafsir] · التوبة: 62 [ayah+tafsir] · آل عمران: 68 [vector+tafsir 0.417] · الأنعام: 81 [ayah+tafsir] · التوبة: 13 [ayah+tafsir]
- **h012** (تحقق (زوجي)، ar) بماذا أوصى النبي ﷺ من طلب منه الوصية في الغضب؟ — gold: hadith:4709
  - أفضل 5: الأنبياء: 107 [ayah+lex] · البقرة: 180 [ayah+tafsir] · البقرة: 182 [vector+tafsir 0.514] · آل عمران: 134 [ayah+lex] · النحل: 127 [vector 0.548]
- **h013** (ضبط (فردي)، ar) ما منزلة حسن الخلق في الإيمان؟ — gold: hadith:5792
  - أفضل 5: الرعد: 29 [vector+ayah+tafsir 0.457] · القلم: 4 [ayah+lex] · البقرة: 285 [ayah+lex] · الأصول الثلاثة – ص 16–17 [ayah+lex] · البقرة: 83 [ayah+lex]
- **h014** (تحقق (زوجي)، ar) ما فضل الصدق؟ — gold: hadith:5504
  - أفضل 5: الأحقاف: 16 [vector+ayah+tafsir+lex 0.453] · التوبة: 119 [ayah+tafsir+lex] · الزمر: 33 [vector+ayah+tafsir 0.469] · مريم: 41 [vector+tafsir 0.463] · الأحزاب: 24 [vector+tafsir 0.479]
- **h015** (ضبط (فردي)، ar) ما جزاء الرحمة بالناس؟ — gold: hadith:8289
  - أفضل 5: الإسراء: 24 [vector+ayah+tafsir+lex 0.500] · الأنبياء: 107 [ayah+tafsir+lex] · يوسف: 92 [ayah+tafsir+lex] · الأنعام: 12 [ayah+tafsir+lex] · النجم: 41 [ayah+lex]
- **h016** (تحقق (زوجي)، ar) متى يتكلم المسلم ومتى يسكت؟ — gold: hadith:5437
  - أفضل 5: النبإ: 38 [vector+ayah 0.498] · آل عمران: 46 [vector 0.530] · الروم: 35 [ayah] · النحل: 94 [tafsir] · مريم: 26 [vector 0.508]
- **h017** (ضبط (فردي)، ar) هل من الإيمان أن أحب لغيري ما أحب لنفسي؟ — gold: hadith:4717، hadith:66520
  - أفضل 5: طه: 41 [vector+ayah+tafsir 0.465] · البقرة: 285 [ayah+tafsir+lex] · كتاب التوحيد – ص 88–90 [vector+ayah+lex 0.458] · التوبة: 23 [vector+ayah+lex 0.446] · الأصول الثلاثة – ص 16–17 [ayah+lex]
- **h018** (تحقق (زوجي)، ar) ما فضل طلب العلم؟ — gold: hadith:4801، hadith:4191
  - أفضل 5: العلق: 1 [ayah+tafsir+lex] · الزمر: 9 [ayah+tafsir+lex] · البقرة: 34 [vector+tafsir 0.516] · الجمعة: 4 [vector+ayah 0.458] · العلق: 4 [vector 0.570]
- **h019** (ضبط (فردي)، ar) ما فضل العمرة؟ — gold: hadith:65626
  - أفضل 5: البقرة: 196 [ayah+lex] · الجمعة: 4 [vector+ayah 0.460] · فاطر: 11 [ayah+tafsir] · البقرة: 158 [vector+tafsir 0.459] · الحديد: 29 [ayah+tafsir]
- **h020** (تحقق (زوجي)، ar) هل التبسم صدقة؟ — gold: hadith:66237
  - أفضل 5: المجادلة: 12 [vector+ayah+tafsir 0.464] · الفرقان: 67 [ayah+tafsir+lex] · النساء: 38 [ayah+tafsir+lex] · النمل: 19 [vector+tafsir 0.513] · البقرة: 262 [ayah+lex]
- **h021** (ضبط (فردي)، ar) ما شعب الإيمان؟ — gold: hadith:3276، hadith:6468
  - أفضل 5: البقرة: 285 [ayah+tafsir+lex] · التوبة: 23 [vector+ayah+lex 0.427] · النساء: 136 [ayah+tafsir+lex] · الحجرات: 7 [vector+ayah+lex 0.411] · المرسلات: 30 [ayah+tafsir]
- **h022** (تحقق (زوجي)، ar) ما فضل صلة الرحم؟ — gold: hadith:5372
  - أفضل 5: الإسراء: 26 [ayah+tafsir+lex] · المرسلات: 21 [vector+tafsir 0.485] · الروم: 38 [ayah+lex] · النساء: 1 [ayah+lex] · الجمعة: 4 [vector+ayah 0.433]
- **h023** (ضبط (فردي)، ar) ما فضل الرفق؟ — gold: hadith:5796
  - أفضل 5: الأنبياء: 107 [ayah+tafsir+lex] · يوسف: 92 [ayah+tafsir+lex] · الأنبياء: 83 [ayah+tafsir+lex] · الأعراف: 151 [ayah+tafsir+lex] · يوسف: 64 [ayah+tafsir+lex]
- **h024** (تحقق (زوجي)، ar) ما منزلة الدعاء؟ — gold: hadith:5496
  - أفضل 5: النمل: 80 [ayah+tafsir+lex] · آل عمران: 38 [ayah+tafsir+lex] · ابراهيم: 39 [ayah+tafsir+lex] · الروم: 52 [ayah+tafsir+lex] · شروط الصلاة وأركانها – ص 37–38 [vector+ayah+lex 0.466]
- **h025** (ضبط (فردي)، ar) كيف تنتشر المحبة بين المسلمين؟ — gold: hadith:3361، hadith:5520 — **اعتذر**
  - أفضل 5: الذاريات: 36 [ayah+tafsir] · النور: 19 [vector+tafsir 0.473] · القلم: 35 [ayah+tafsir] · النساء: 125 [vector+tafsir 0.468] · الأنفال: 72 [vector 0.507]
- **h026** (تحقق (زوجي)، ar) ما فضل سنة الفجر؟ — gold: hadith:66400
  - أفضل 5: الإسراء: 78 [vector+ayah+tafsir+lex 0.407] · هود: 114 [vector+ayah+tafsir+lex 0.388] · القدر: 5 [vector+ayah+tafsir 0.468] · الفجر: 1 [vector+ayah+tafsir 0.460] · محمد: 33 [ayah+tafsir+lex]
- **h027** (ضبط (فردي)، ar) ما عقوبة من لا يؤدي زكاة الذهب والفضة؟ — gold: hadith:6611
  - أفضل 5: النور: 56 [vector+ayah+tafsir+lex 0.419] · التوبة: 34 [vector+ayah+tafsir 0.461] · البقرة: 43 [ayah+tafsir+lex] · التوبة: 11 [ayah+tafsir+lex] · فصلت: 7 [vector+ayah+lex 0.513]
- **h028** (تحقق (زوجي)، ar) هل يفرح الله بتوبة عبده؟ — gold: hadith:4313
  - أفضل 5: البروج: 14 [vector+tafsir 0.627] · التوبة: 104 [vector+tafsir 0.545] · مريم: 2 [ayah+tafsir] · النجم: 10 [ayah+tafsir] · آل عمران: 188 [ayah+tafsir]
- **h029** (ضبط (فردي)، ar) ما معنى «الدين النصيحة»؟ — gold: hadith:4309، hadith:66516 — **اعتذر**
  - أفضل 5: البينة: 5 [vector+ayah+tafsir 0.427] · غافر: 44 [vector+tafsir 0.443] · الأعراف: 62 [vector+tafsir 0.433] · الإنفطار: 17 [ayah+tafsir] · الإنفطار: 15 [ayah+tafsir]
- **h030** (تحقق (زوجي)، ar) ما الذي يحسن به إسلام المرء؟ — gold: hadith:65255
  - أفضل 5: عبس: 34 [ayah+tafsir] · النبإ: 40 [ayah+tafsir] · الأنفال: 24 [ayah+tafsir] · لقمان: 22 [vector+tafsir 0.523] · النساء: 125 [vector 0.528]
- **h031** (ضبط (فردي)، en) What are the five pillars of Islam? — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+lex 0.459] · البقرة: 208 [vector+en 0.399] · آل عمران: 19 [vector+en 0.377] · الفجر: 7 [en] · الشورى: 13 [vector 0.435]
- **h032** (تحقق (زوجي)، en) Are deeds judged by intentions? — gold: hadith:4560، hadith:66511
  - أفضل 5: العنكبوت: 4 [vector+en 0.472] · المائدة: 47 [vector+en 0.445] · النساء: 105 [vector+en 0.434] · البقرة: 269 [vector 0.480] · البقرة: 139 [en]
- **h033** (ضبط (فردي)، en) What is the reward of fasting Ramadan? — gold: hadith:4196
  - أفضل 5: البقرة: 185 [vector+en 0.484] · الأحزاب: 35 [vector+en 0.479] · البقرة: 184 [vector+en 0.426] · النساء: 146 [vector+en 0.423] · البقرة: 183 [en]
- **h034** (تحقق (زوجي)، en) Does charity decrease wealth? — gold: hadith:5512
  - أفضل 5: البقرة: 276 [vector+en 0.441] · الطلاق: 7 [vector+en 0.421] · البقرة: 273 [vector+en 0.446] · التوبة: 79 [vector+en 0.423] · الفجر: 20 [vector+en 0.465]
- **h035** (ضبط (فردي)، en) Who deserves my good company the most? — gold: hadith:4182
  - أفضل 5: الشعراء: 84 [vector 0.485] · الواقعة: 39 [en] · الحديد: 11 [vector 0.467] · الواقعة: 13 [en] · آل عمران: 68 [vector 0.456]
- **h036** (تحقق (زوجي)، en) What did the Prophet say about anger? — gold: hadith:4709
  - أفضل 5: التوبة: 73 [vector 0.512] · الصافات: 37 [en] · ابراهيم: 44 [vector 0.507] · مريم: 51 [en] · الأنفال: 65 [vector 0.505]
- **h037** (ضبط (فردي)، en) Is smiling a charity? — gold: hadith:66237
  - أفضل 5: ص: 73 [vector 0.397] · المؤمنون: 104 [en] · الحشر: 24 [vector 0.394] · التوبة: 75 [en] · الماعون: 6 [vector 0.373]
- **h038** (تحقق (زوجي)، en) What is the virtue of praying in congregation? — gold: hadith:3441
  - أفضل 5: الروم: 31 [vector+en 0.484] · الأنعام: 72 [vector+en 0.462] · لقمان: 17 [vector+en 0.466] · العنكبوت: 45 [vector+en 0.456] · المؤمنون: 2 [vector 0.498]
- **h039** (ضبط (فردي)، ur) اسلام کے ارکان کیا ہیں؟ — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+lex 0.503] · الفجر: 2 [tafsir] · شروط الصلاة وأركانها – ص 33–34 [vector 0.453] · الطور: 4 [tafsir] · البقرة: 208 [vector 0.439]
- **h040** (تحقق (زوجي)، id) Apa keutamaan silaturahmi? — gold: hadith:5372
  - أفضل 5: الصافات: 44 [vector 0.437] · الصافات: 50 [vector 0.426] · آل عمران: 103 [vector 0.421] · الحجر: 47 [vector 0.419] · غافر: 15 [vector 0.417]
- **h041** (ضبط (فردي)، fr) Quelle est la récompense du jeûne du Ramadan ? — gold: hadith:4196
  - أفضل 5: البقرة: 185 [vector+tafsir+lex 0.470] · البقرة: 183 [tafsir+lex] · البقرة: 187 [tafsir+lex] · فصلت: 28 [vector 0.453] · البقرة: 184 [tafsir]
- **h042** (تحقق (زوجي)، tr) Öfke hakkında Peygamber ne buyurdu? — gold: hadith:4709
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · النساء: 69 [tafsir+lex]
- **h043** (ضبط (فردي)، bn) সদকা কি সম্পদ কমায়? — gold: hadith:5512 — **اعتذر**
  - أفضل 5: الليل: 18 [vector 0.381] · الليل: 17 [vector 0.381] · النجم: 34 [vector 0.373] · النساء: 38 [vector 0.373] · الأحزاب: 71 [vector 0.372]
- **h044** (تحقق (زوجي)، hi) क्या मुस्कुराना सदक़ा है? — gold: hadith:66237
  - أفضل 5: النجم: 61 [vector 0.490] · النجم: 60 [vector 0.475] · النمل: 19 [vector 0.469] · عبس: 39 [vector 0.463] · آل عمران: 120 [vector 0.447]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| h001 ما أركان الإسلام؟ | answer | 0.516 | لا |
| h002 ما معنى الإحسان؟ | answer | 0.550 | لا |
| h003 هل تُقبل الأعمال بلا نية؟ | answer | 0.447 | لا |
| h004 ما أحب الأعمال إلى الله؟ | answer | 0.533 | لا |
| h005 ما فضل صلاة الجماعة على صلاة الفرد؟ | answer | 0.500 | لا |
| h006 ما فضل الوضوء؟ | answer | 0.546 | لا |
| h007 هل السواك سنة عند الصلاة؟ | answer | 0.448 | لا |
| h008 ما فضل صيام رمضان؟ | answer | 0.526 | لا |
| h009 متى تُطلب ليلة القدر؟ | answer | 0.539 | لا |
| h010 هل الصدقة تنقص المال؟ | answer | 0.528 | لا |
| h011 من أحق الناس بحسن صحبتي؟ | answer | 0.417 | نعم |
| h012 بماذا أوصى النبي ﷺ من طلب منه الوصية في الغضب؟ | answer | 0.548 | لا |
| h013 ما منزلة حسن الخلق في الإيمان؟ | answer | 0.518 | لا |
| h014 ما فضل الصدق؟ | answer | 0.517 | لا |
| h015 ما جزاء الرحمة بالناس؟ | answer | 0.544 | لا |
| h016 متى يتكلم المسلم ومتى يسكت؟ | answer | 0.530 | لا |
| h017 هل من الإيمان أن أحب لغيري ما أحب لنفسي؟ | answer | 0.473 | لا |
| h018 ما فضل طلب العلم؟ | answer | 0.570 | لا |
| h019 ما فضل العمرة؟ | answer | 0.476 | لا |
| h020 هل التبسم صدقة؟ | answer | 0.513 | لا |
| h021 ما شعب الإيمان؟ | answer | 0.460 | لا |
| h022 ما فضل صلة الرحم؟ | answer | 0.485 | لا |
| h023 ما فضل الرفق؟ | answer | 0.468 | لا |
| h024 ما منزلة الدعاء؟ | answer | 0.516 | لا |
| h025 كيف تنتشر المحبة بين المسلمين؟ | answer | 0.507 | نعم |
| h026 ما فضل سنة الفجر؟ | answer | 0.468 | لا |
| h027 ما عقوبة من لا يؤدي زكاة الذهب والفضة؟ | answer | 0.513 | لا |
| h028 هل يفرح الله بتوبة عبده؟ | answer | 0.627 | لا |
| h029 ما معنى «الدين النصيحة»؟ | answer | 0.464 | نعم |
| h030 ما الذي يحسن به إسلام المرء؟ | answer | 0.528 | لا |
| h031 What are the five pillars of Islam? | answer | 0.459 | لا |
| h032 Are deeds judged by intentions? | answer | 0.480 | لا |
| h033 What is the reward of fasting Ramadan? | answer | 0.484 | لا |
| h034 Does charity decrease wealth? | answer | 0.465 | لا |
| h035 Who deserves my good company the most? | answer | 0.485 | لا |
| h036 What did the Prophet say about anger? | answer | 0.512 | لا |
| h037 Is smiling a charity? | answer | 0.397 | لا |
| h038 What is the virtue of praying in congregation? | answer | 0.498 | لا |
| h039 اسلام کے ارکان کیا ہیں؟ | answer | 0.503 | لا |
| h040 Apa keutamaan silaturahmi? | answer | 0.437 | لا |
| h041 Quelle est la récompense du jeûne du Ramadan ? | answer | 0.470 | لا |
| h042 Öfke hakkında Peygamber ne buyurdu? | answer | 0.508 | لا |
| h043 সদকা কি সম্পদ কমায়? | answer | 0.381 | نعم |
| h044 क्या मुस्कुराना सदक़ा है? | answer | 0.490 | لا |
| h045 كيف أتوضأ؟ | answer | 0.474 | لا |
| h046 What is zakat? | answer | 0.505 | لا |
| h050 من مؤسس شركة أبل؟ | abstain | 0.385 | نعم |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 60658
