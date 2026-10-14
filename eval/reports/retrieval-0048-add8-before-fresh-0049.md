# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T13:08:05.828Z على 33 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 0 | — | — | — | NaN | — | — |
| الجديد | تحقق (زوجي) | 30 | 29.9% | 42.1% | 56.7% | 0.425 | — | 3/33 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 11 | 40.9% | 81.8% | 0.564 |
| en | 13 | 21.0% | 38.5% | 0.317 |
| ur | 2 | 36.7% | 100.0% | 0.667 |
| id | 2 | 50.0% | 50.0% | 0.500 |
| tr | 1 | 0.0% | 0.0% | 0.000 |
| fr | 1 | 0.0% | 0.0% | 0.100 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (3)

- fresh49-02 (ar): ما فضل الحياء؟ — معتمد (المنسّق، 14 أكتوبر، الملحق 0048-add9 ب)
- fresh49-03 (ar): ما فضل إماطة الأذى عن الطريق؟ — معتمد (المنسّق، 14 أكتوبر، الملحق 0048-add9 ب)؛ أُضيف إلى الأحاديث المقبولة ما ذكره
- fresh49-04 (ar): ما فضل عيادة المريض؟ — معتمد (المنسّق، 14 أكتوبر، الملحق 0048-add9 ب)

## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **fresh49-08** (تحقق (زوجي)، ar) ما فضل الرفق؟ — gold: quran:3:159
  - أفضل 5: الأنبياء: 107 [ayah+tafsir+lex] · يوسف: 92 [ayah+tafsir+lex] · الأنبياء: 83 [ayah+tafsir+lex] · الأعراف: 151 [ayah+tafsir+lex] · يوسف: 64 [ayah+tafsir+lex]
- **fresh49-13** (تحقق (زوجي)، en) What is the reward for spreading the greeting of peace (salam)? — gold: quran:4:86، quran:24:61
  - أفضل 5: الأحزاب: 44 [vector+en 0.545] · الصافات: 109 [vector+en 0.470] · الصافات: 181 [vector+en 0.477] · الذاريات: 25 [vector+en 0.445] · الصافات: 120 [vector+en 0.456]
- **fresh49-14** (تحقق (زوجي)، en) What does Islam say about keeping promises? — gold: quran:17:34، quran:61:2، quran:61:3، quran:23:8
  - أفضل 5: غافر: 55 [vector 0.558] · الحجرات: 17 [en] · التوبة: 7 [vector 0.545] · الأنبياء: 38 [en] · ق: 32 [vector 0.532]
- **fresh49-16** (تحقق (زوجي)، en) What does Islam say about arrogance? — gold: quran:31:18، quran:16:23، quran:7:146
  - أفضل 5: الحجرات: 17 [vector+en 0.440] · النور: 55 [vector 0.469] · الأنفال: 49 [vector 0.464] · آل عمران: 20 [en] · غافر: 35 [vector 0.461]
- **fresh49-17** (تحقق (زوجي)، en) What does Islam say about guarding the tongue? — gold: quran:50:18، quran:17:36
  - أفضل 5: القيامة: 16 [vector+en 0.500] · طه: 27 [vector+en 0.457] · النور: 30 [vector+en 0.455] · البقرة: 238 [vector 0.508] · المؤمنون: 5 [en]
- **fresh49-18** (تحقق (زوجي)، en) What is the virtue of seeking knowledge? — gold: quran:20:114، quran:58:11، quran:39:9
  - أفضل 5: التكاثر: 5 [vector+en 0.441] · عبس: 8 [vector+en 0.430] · العلق: 4 [vector 0.561] · هود: 47 [en] · التوبة: 122 [vector 0.489]
- **fresh49-20** (تحقق (زوجي)، en) Is making dua important in Islam? — gold: quran:40:60، quran:2:186
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector 0.440] · الأنعام: 125 [en] · المزمل: 20 [vector 0.430] · الحجرات: 17 [en] · البقرة: 238 [vector 0.429]
- **fresh49-22** (تحقق (زوجي)، en) What does Islam say about trusting in Allah (tawakkul)? — gold: quran:65:3، quran:3:159، quran:8:2
  - أفضل 5: التغابن: 13 [vector+en 0.499] · التوبة: 129 [vector+en 0.494] · ابراهيم: 12 [vector 0.530] · الحجرات: 17 [en] · آل عمران: 102 [vector 0.526]
- **fresh49-27** (تحقق (زوجي)، id) Apa keutamaan sholat berjamaah? — gold: quran:2:43
  - أفضل 5: الأنعام: 72 [vector+tafsir+lex 0.436] · البقرة: 238 [vector+tafsir+lex 0.421] · الإسراء: 78 [vector+tafsir+lex 0.431] · العنكبوت: 45 [vector+lex 0.448] · هود: 114 [vector+tafsir 0.446]
- **fresh49-29** (تحقق (زوجي)، tr) Merhametli olmanın fazileti nedir? — gold: quran:21:107، quran:90:17
  - أفضل 5: فصلت: 35 [vector 0.473] · النحل: 89 [vector 0.470] · النساء: 96 [vector 0.465] · البقرة: 263 [vector 0.464] · فاطر: 2 [vector 0.462]
- **fresh49-30** (تحقق (زوجي)، fr) Quelle est la valeur de la propreté en islam ? — gold: quran:2:222، quran:9:108، quran:74:4
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector 0.464] · الأحزاب: 35 [vector 0.439] · المزمل: 20 [vector 0.429] · الحج: 26 [vector 0.426] · الإسراء: 9 [vector 0.424]
- **fresh49-31** (تحقق (زوجي)، ar) ما قصة ذي القرنين؟ — gold: quran:18:83، quran:18:84، quran:18:86، quran:18:90، quran:18:94 — **اعتذر**
  - أفضل 5: الكهف: 83 [vector+ayah+tafsir 0.473] · الكهف: 94 [vector+ayah+tafsir 0.393] · الكهف: 86 [vector+ayah+tafsir 0.443] · الكهف: 92 [vector+tafsir 0.412] · الكهف: 89 [vector+tafsir 0.421]
- **fresh49-32** (تحقق (زوجي)، en) What happened to the people of Lut? — gold: quran:11:81، quran:11:82، quran:15:73، quran:15:74، quran:7:84
  - أفضل 5: هود: 89 [vector+en 0.454] · الحج: 43 [vector+en 0.423] · الشعراء: 160 [vector+en 0.424] · النجم: 53 [vector 0.491] · المعارج: 1 [en]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| fresh49-01 ما فضل بر الوالدين؟ | answer | 0.504 | لا |
| fresh49-02 ما فضل الحياء؟ | answer | 0.498 | نعم |
| fresh49-03 ما فضل إماطة الأذى عن الطريق؟ | answer | 0.491 | نعم |
| fresh49-04 ما فضل عيادة المريض؟ | answer | 0.400 | لا |
| fresh49-05 ما حكم الكذب؟ | answer | 0.548 | لا |
| fresh49-06 كيف أتعامل مع الغضب؟ | answer | 0.504 | لا |
| fresh49-07 ما فضل صيام رمضان؟ | answer | 0.526 | لا |
| fresh49-08 ما فضل الرفق؟ | answer | 0.468 | لا |
| fresh49-09 ما خطر الحسد؟ | answer | 0.483 | لا |
| fresh49-10 ما فضل يوم الجمعة؟ | answer | 0.516 | لا |
| fresh49-11 ما معنى التوحيد؟ | answer | 0.544 | لا |
| fresh49-12 من هم قوم عاد؟ | answer | 0.522 | لا |
| fresh49-13 What is the reward for spreading the greeting of peace (salam)? | answer | 0.545 | لا |
| fresh49-14 What does Islam say about keeping promises? | answer | 0.558 | لا |
| fresh49-15 What is the virtue of good character? | answer | 0.455 | لا |
| fresh49-16 What does Islam say about arrogance? | answer | 0.469 | لا |
| fresh49-17 What does Islam say about guarding the tongue? | answer | 0.508 | لا |
| fresh49-18 What is the virtue of seeking knowledge? | answer | 0.561 | لا |
| fresh49-19 What does Islam say about gratitude to Allah? | answer | 0.539 | لا |
| fresh49-20 Is making dua important in Islam? | answer | 0.440 | لا |
| fresh49-21 What is the virtue of wudu (ablution)? | answer | 0.394 | لا |
| fresh49-22 What does Islam say about trusting in Allah (tawakkul)? | answer | 0.530 | لا |
| fresh49-23 What is tawhid? | answer | 0.393 | لا |
| fresh49-24 Who was the Prophet Musa (Moses)? | answer | 0.538 | لا |
| fresh49-25 والدین کے ساتھ حسن سلوک کی کیا فضیلت ہے؟ | answer | 0.476 | لا |
| fresh49-26 صدقہ کرنے کا کیا اجر ہے؟ | answer | 0.533 | لا |
| fresh49-27 Apa keutamaan sholat berjamaah? | answer | 0.472 | لا |
| fresh49-28 Apa keutamaan membaca shalawat kepada Nabi? | answer | 0.462 | لا |
| fresh49-29 Merhametli olmanın fazileti nedir? | answer | 0.473 | لا |
| fresh49-30 Quelle est la valeur de la propreté en islam ? | answer | 0.464 | لا |
| fresh49-31 ما قصة ذي القرنين؟ | answer | 0.473 | نعم |
| fresh49-32 What happened to the people of Lut? | answer | 0.491 | لا |
| fresh49-33 من هو نبي الله صالح؟ | answer | 0.434 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 33110
