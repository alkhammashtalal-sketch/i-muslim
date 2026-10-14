# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T12:59:50.289Z على 27 سؤالًا (القسم: الضبط فقط). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 23 | 4.3% | 4.3% | 4.3% | 0.043 | — | 4/23 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 16 | 6.3% | 6.3% | 0.063 |
| en | 4 | 0.0% | 0.0% | 0.000 |
| ur | 1 | 0.0% | 0.0% | 0.000 |
| fr | 1 | 0.0% | 0.0% | 0.000 |
| bn | 1 | 0.0% | 0.0% | 0.000 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **h001** (ضبط (فردي)، ar) ما أركان الإسلام؟ — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+ayah+lex 0.516] · الفجر: 2 [vector+tafsir 0.455] · المؤمنون: 52 [vector+tafsir 0.430] · آل عمران: 85 [vector+ayah 0.404] · البقرة: 132 [vector+tafsir 0.439]
- **h003** (ضبط (فردي)، ar) هل تُقبل الأعمال بلا نية؟ — gold: hadith:4560، hadith:66511
  - أفضل 5: غافر: 14 [ayah+tafsir+lex] · غافر: 65 [ayah+tafsir+lex] · العنكبوت: 65 [ayah+lex] · الأعراف: 29 [ayah+lex] · ابراهيم: 40 [ayah+tafsir]
- **h005** (ضبط (فردي)، ar) ما فضل صلاة الجماعة على صلاة الفرد؟ — gold: hadith:3441
  - أفضل 5: الأنعام: 72 [ayah+tafsir+lex] · البقرة: 238 [ayah+tafsir+lex] · طه: 14 [vector+ayah+lex 0.443] · العنكبوت: 45 [vector+ayah+lex 0.449] · البقرة: 43 [ayah+tafsir+lex]
- **h007** (ضبط (فردي)، ar) هل السواك سنة عند الصلاة؟ — gold: hadith:3364، hadith:8374
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.420] · النساء: 103 [vector+ayah+tafsir+lex 0.416] · الأنعام: 72 [ayah+tafsir+lex] · الإسراء: 78 [vector+ayah+tafsir 0.445] · البقرة: 43 [vector+ayah+lex 0.440]
- **h009** (ضبط (فردي)، ar) متى تُطلب ليلة القدر؟ — gold: hadith:4540، hadith:4545، hadith:4202
  - أفضل 5: القدر: 3 [vector+ayah+tafsir+lex 0.534] · القدر: 2 [vector+ayah+tafsir+lex 0.497] · القدر: 1 [vector+ayah+tafsir+lex 0.539] · الدخان: 3 [vector+ayah+tafsir 0.478] · الدخان: 4 [vector+tafsir 0.504]
- **h011** (ضبط (فردي)، ar) من أحق الناس بحسن صحبتي؟ — gold: hadith:4182 — **اعتذر**
  - أفضل 5: يونس: 53 [ayah+tafsir] · التوبة: 62 [ayah+tafsir] · آل عمران: 68 [vector+tafsir 0.417] · الأنعام: 81 [ayah+tafsir] · التوبة: 13 [ayah+tafsir]
- **h013** (ضبط (فردي)، ar) ما منزلة حسن الخلق في الإيمان؟ — gold: hadith:5792
  - أفضل 5: الرعد: 29 [vector+ayah+tafsir 0.457] · القلم: 4 [ayah+lex] · البقرة: 285 [ayah+lex] · الأصول الثلاثة – ص 16–17 [ayah+lex] · البقرة: 83 [ayah+lex]
- **h015** (ضبط (فردي)، ar) ما جزاء الرحمة بالناس؟ — gold: hadith:8289
  - أفضل 5: الإسراء: 24 [vector+ayah+tafsir+lex 0.500] · الأنبياء: 107 [ayah+tafsir+lex] · يوسف: 92 [ayah+tafsir+lex] · الأنعام: 12 [ayah+tafsir+lex] · النجم: 41 [ayah+lex]
- **h017** (ضبط (فردي)، ar) هل من الإيمان أن أحب لغيري ما أحب لنفسي؟ — gold: hadith:4717، hadith:66520
  - أفضل 5: طه: 41 [vector+ayah+tafsir 0.465] · البقرة: 285 [ayah+tafsir+lex] · كتاب التوحيد – ص 88–90 [vector+ayah+lex 0.458] · التوبة: 23 [vector+ayah+lex 0.446] · الأصول الثلاثة – ص 16–17 [ayah+lex]
- **h019** (ضبط (فردي)، ar) ما فضل العمرة؟ — gold: hadith:65626
  - أفضل 5: البقرة: 196 [ayah+lex] · الجمعة: 4 [vector+ayah 0.460] · فاطر: 11 [ayah+tafsir] · البقرة: 158 [vector+tafsir 0.459] · الحديد: 29 [ayah+tafsir]
- **h021** (ضبط (فردي)، ar) ما شعب الإيمان؟ — gold: hadith:3276، hadith:6468
  - أفضل 5: البقرة: 285 [ayah+tafsir+lex] · التوبة: 23 [vector+ayah+lex 0.427] · النساء: 136 [ayah+tafsir+lex] · الحجرات: 7 [vector+ayah+lex 0.411] · المرسلات: 30 [ayah+tafsir]
- **h023** (ضبط (فردي)، ar) ما فضل الرفق؟ — gold: hadith:5796
  - أفضل 5: الأنبياء: 107 [ayah+tafsir+lex] · يوسف: 92 [ayah+tafsir+lex] · الأنبياء: 83 [ayah+tafsir+lex] · الأعراف: 151 [ayah+tafsir+lex] · يوسف: 64 [ayah+tafsir+lex]
- **h025** (ضبط (فردي)، ar) كيف تنتشر المحبة بين المسلمين؟ — gold: hadith:3361، hadith:5520 — **اعتذر**
  - أفضل 5: الذاريات: 36 [ayah+tafsir] · النور: 19 [vector+tafsir 0.473] · القلم: 35 [ayah+tafsir] · النساء: 125 [vector+tafsir 0.468] · الأنفال: 72 [vector 0.507]
- **h027** (ضبط (فردي)، ar) ما عقوبة من لا يؤدي زكاة الذهب والفضة؟ — gold: hadith:6611
  - أفضل 5: النور: 56 [vector+ayah+tafsir+lex 0.419] · التوبة: 34 [vector+ayah+tafsir 0.461] · البقرة: 43 [ayah+tafsir+lex] · التوبة: 11 [ayah+tafsir+lex] · فصلت: 7 [vector+ayah+lex 0.513]
- **h029** (ضبط (فردي)، ar) ما معنى «الدين النصيحة»؟ — gold: hadith:4309، hadith:66516 — **اعتذر**
  - أفضل 5: البينة: 5 [vector+ayah+tafsir 0.427] · غافر: 44 [vector+tafsir 0.443] · الأعراف: 62 [vector+tafsir 0.433] · الإنفطار: 17 [ayah+tafsir] · الإنفطار: 15 [ayah+tafsir]
- **h031** (ضبط (فردي)، en) What are the five pillars of Islam? — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+lex 0.459] · البقرة: 208 [vector+en 0.399] · آل عمران: 19 [vector+en 0.377] · الفجر: 7 [en] · الشورى: 13 [vector 0.435]
- **h033** (ضبط (فردي)، en) What is the reward of fasting Ramadan? — gold: hadith:4196
  - أفضل 5: البقرة: 185 [vector+en 0.484] · الأحزاب: 35 [vector+en 0.479] · البقرة: 184 [vector+en 0.426] · النساء: 146 [vector+en 0.423] · البقرة: 183 [en]
- **h035** (ضبط (فردي)، en) Who deserves my good company the most? — gold: hadith:4182
  - أفضل 5: الشعراء: 84 [vector 0.485] · الواقعة: 39 [en] · الحديد: 11 [vector 0.467] · الواقعة: 13 [en] · آل عمران: 68 [vector 0.456]
- **h037** (ضبط (فردي)، en) Is smiling a charity? — gold: hadith:66237
  - أفضل 5: ص: 73 [vector 0.397] · المؤمنون: 104 [en] · الحشر: 24 [vector 0.394] · التوبة: 75 [en] · الماعون: 6 [vector 0.373]
- **h039** (ضبط (فردي)، ur) اسلام کے ارکان کیا ہیں؟ — gold: hadith:65000، hadith:66512
  - أفضل 5: الأصول الثلاثة – ص 14–15 [vector+lex 0.503] · الفجر: 2 [tafsir] · شروط الصلاة وأركانها – ص 33–34 [vector 0.453] · الطور: 4 [tafsir] · البقرة: 208 [vector 0.439]
- **h041** (ضبط (فردي)، fr) Quelle est la récompense du jeûne du Ramadan ? — gold: hadith:4196
  - أفضل 5: البقرة: 185 [vector+tafsir+lex 0.470] · البقرة: 183 [tafsir+lex] · البقرة: 187 [tafsir+lex] · فصلت: 28 [vector 0.453] · البقرة: 184 [tafsir]
- **h043** (ضبط (فردي)، bn) সদকা কি সম্পদ কমায়? — gold: hadith:5512 — **اعتذر**
  - أفضل 5: الليل: 18 [vector 0.381] · الليل: 17 [vector 0.381] · النجم: 34 [vector 0.373] · النساء: 38 [vector 0.373] · الأحزاب: 71 [vector 0.372]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| h001 ما أركان الإسلام؟ | answer | 0.516 | لا |
| h003 هل تُقبل الأعمال بلا نية؟ | answer | 0.447 | لا |
| h005 ما فضل صلاة الجماعة على صلاة الفرد؟ | answer | 0.500 | لا |
| h007 هل السواك سنة عند الصلاة؟ | answer | 0.448 | لا |
| h009 متى تُطلب ليلة القدر؟ | answer | 0.539 | لا |
| h011 من أحق الناس بحسن صحبتي؟ | answer | 0.417 | نعم |
| h013 ما منزلة حسن الخلق في الإيمان؟ | answer | 0.518 | لا |
| h015 ما جزاء الرحمة بالناس؟ | answer | 0.544 | لا |
| h017 هل من الإيمان أن أحب لغيري ما أحب لنفسي؟ | answer | 0.473 | لا |
| h019 ما فضل العمرة؟ | answer | 0.476 | لا |
| h021 ما شعب الإيمان؟ | answer | 0.460 | لا |
| h023 ما فضل الرفق؟ | answer | 0.468 | لا |
| h025 كيف تنتشر المحبة بين المسلمين؟ | answer | 0.507 | نعم |
| h027 ما عقوبة من لا يؤدي زكاة الذهب والفضة؟ | answer | 0.513 | لا |
| h029 ما معنى «الدين النصيحة»؟ | answer | 0.464 | نعم |
| h031 What are the five pillars of Islam? | answer | 0.459 | لا |
| h033 What is the reward of fasting Ramadan? | answer | 0.484 | لا |
| h035 Who deserves my good company the most? | answer | 0.485 | لا |
| h037 Is smiling a charity? | answer | 0.397 | لا |
| h039 اسلام کے ارکان کیا ہیں؟ | answer | 0.503 | لا |
| h041 Quelle est la récompense du jeûne du Ramadan ? | answer | 0.470 | لا |
| h043 সদকা কি সম্পদ কমায়? | answer | 0.381 | نعم |
| h045 كيف أتوضأ؟ | answer | 0.474 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 40138
