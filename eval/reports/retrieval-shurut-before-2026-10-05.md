# تقرير الاسترجاع — 2026-10-05

أنشأه `eval/run-retrieval.mjs` في 2026-10-05T19:57:38.379Z على 12 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 6 | 16.7% | 33.3% | 16.7% | 0.047 | — | 0/6 |
| الجديد | تحقق (زوجي) | 6 | 0.0% | 66.7% | 0.0% | 0.067 | — | 0/6 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 7 | 14.3% | 14.3% | 0.029 |
| en | 2 | 0.0% | 0.0% | 0.121 |
| ur | 1 | 0.0% | 0.0% | 0.083 |
| id | 1 | 0.0% | 0.0% | 0.083 |
| fr | 1 | 0.0% | 0.0% | 0.077 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **s01** (ضبط (فردي)، ar) ما شروط الصلاة؟ — gold: aqeedah:shurut:001
  - أفضل 5: الأنعام: 72 [vector+ayah+tafsir+lex 0.491] · البقرة: 238 [vector+ayah+tafsir+lex 0.500] · النساء: 103 [vector+ayah+tafsir+lex 0.548] · الروم: 31 [vector+ayah+tafsir+lex 0.493] · النور: 56 [vector+ayah+tafsir+lex 0.537]
- **s02** (تحقق (زوجي)، ar) كم أركان الصلاة؟ — gold: aqeedah:shurut:003
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.450] · البقرة: 43 [vector+ayah+tafsir+lex 0.485] · النساء: 103 [vector+ayah+tafsir+lex 0.451] · الإسراء: 78 [vector+ayah+tafsir+lex 0.502] · النمل: 3 [vector+ayah+tafsir+lex 0.438]
- **s03** (ضبط (فردي)، ar) ما الذي يجب أن يتحقق قبل أن أصلي؟ — gold: aqeedah:shurut:001
  - أفضل 5: الأنعام: 72 [ayah+tafsir+lex] · البقرة: 238 [ayah+tafsir+lex] · الأنفال: 3 [ayah+tafsir+lex] · ق: 39 [ayah+tafsir] · النساء: 103 [ayah+lex]
- **s04** (تحقق (زوجي)، en) What are the conditions of prayer? — gold: aqeedah:shurut:001
  - أفضل 5: المعارج: 22 [vector+en 0.502] · النساء: 103 [vector+en 0.525] · المؤمنون: 9 [vector+en 0.493] · البقرة: 238 [vector+en 0.476] · المعارج: 23 [vector+en 0.480]
- **s05** (ضبط (فردي)، ar) ما شروط صحة الصلاة؟ — gold: aqeedah:shurut:001
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.480] · النساء: 103 [vector+ayah+tafsir+lex 0.531] · الروم: 31 [vector+ayah+tafsir+lex 0.477] · النور: 56 [vector+ayah+tafsir+lex 0.511] · العنكبوت: 45 [vector+ayah+tafsir+lex 0.469]
- **s06** (تحقق (زوجي)، ar) ما أركان الصلاة؟ — gold: aqeedah:shurut:003
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.472] · الأنعام: 72 [vector+ayah+tafsir+lex 0.454] · البقرة: 43 [vector+ayah+tafsir+lex 0.532] · النساء: 103 [vector+ayah+tafsir+lex 0.469] · الإسراء: 78 [vector+ayah+tafsir+lex 0.498]
- **s07** (ضبط (فردي)، ar) ما واجبات الصلاة؟ — gold: aqeedah:shurut:006
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.532] · الأنعام: 72 [vector+ayah+tafsir+lex 0.498] · الإسراء: 78 [vector+ayah+tafsir+lex 0.539] · النساء: 103 [vector+ayah+lex 0.532] · شروط الصلاة وأركانها – ص 39 [vector+ayah+lex 0.518]
- **s08** (تحقق (زوجي)، en) What are the pillars of prayer? — gold: aqeedah:shurut:003
  - أفضل 5: البقرة: 238 [vector+en 0.451] · النساء: 103 [vector+en 0.462] · المعارج: 23 [vector+en 0.423] · الأنفال: 3 [vector+en 0.422] · شروط الصلاة وأركانها – ص 33–34 [vector 0.495]
- **s09** (ضبط (فردي)، ur) نماز کی شرائط کیا ہیں؟ — gold: aqeedah:shurut:001
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.507] · الإسراء: 78 [vector+tafsir+lex 0.511] · الأنعام: 72 [tafsir+lex] · شروط الصلاة وأركانها – ص 39 [vector+lex 0.559] · النساء: 103 [vector+lex 0.529]
- **s10** (تحقق (زوجي)، id) Apa saja syarat sah shalat? — gold: aqeedah:shurut:001
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.472] · الإسراء: 78 [vector+tafsir+lex 0.484] · النمل: 3 [vector+tafsir+lex 0.448] · الأنعام: 72 [tafsir+lex] · النساء: 103 [vector+lex 0.488]
- **s12** (تحقق (زوجي)، fr) Quelles sont les conditions de la prière ? — gold: aqeedah:shurut:001
  - أفضل 5: الإسراء: 78 [vector+tafsir+lex 0.504] · الأنعام: 72 [tafsir+lex] · البقرة: 238 [tafsir+lex] · النساء: 103 [vector+lex 0.527] · شروط الصلاة وأركانها – ص 39 [vector+lex 0.531]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| s01 ما شروط الصلاة؟ | answer | 0.652 | لا |
| s02 كم أركان الصلاة؟ | answer | 0.639 | لا |
| s03 ما الذي يجب أن يتحقق قبل أن أصلي؟ | answer | 0.447 | لا |
| s04 What are the conditions of prayer? | answer | 0.564 | لا |
| s05 ما شروط صحة الصلاة؟ | answer | 0.612 | لا |
| s06 ما أركان الصلاة؟ | answer | 0.632 | لا |
| s07 ما واجبات الصلاة؟ | answer | 0.547 | لا |
| s08 What are the pillars of prayer? | answer | 0.495 | لا |
| s09 نماز کی شرائط کیا ہیں؟ | answer | 0.615 | لا |
| s10 Apa saja syarat sah shalat? | answer | 0.573 | لا |
| s11 ما الفرق بين أركان الصلاة وواجباتها؟ | answer | 0.616 | لا |
| s12 Quelles sont les conditions de la prière ? | answer | 0.576 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 13140
