# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T10:03:53.816Z على 30 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 0 | — | — | — | NaN | — | — |
| الجديد | تحقق (زوجي) | 30 | 20.1% | 34.5% | 53.3% | 0.494 | — | 0/30 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| en | 20 | 16.0% | 40.0% | 0.372 |
| ar | 10 | 28.4% | 80.0% | 0.740 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **fresh-01** (تحقق (زوجي)، en) What is the meaning of "There is no god but Allah"? — gold: aqeedah:usul:005، aqeedah:usul:011، quran:47:19، quran:3:18
  - أفضل 5: التغابن: 13 [vector+en 0.559] · آل عمران: 2 [vector+en 0.569] · طه: 8 [vector+en 0.541] · طه: 98 [vector+en 0.577] · النمل: 26 [vector+en 0.513]
- **fresh-02** (تحقق (زوجي)، en) Who is Allah? — gold: quran:112:1، quran:112:2، quran:112:3، quran:112:4، quran:2:255، quran:59:22، quran:59:23، quran:59:24
  - أفضل 5: آل عمران: 2 [vector+en 0.539] · التغابن: 13 [vector+en 0.498] · النساء: 87 [vector+en 0.514] · طه: 8 [vector+en 0.492] · القصص: 70 [vector+en 0.501]
- **fresh-04** (تحقق (زوجي)، en) Why did Allah create human beings? — gold: quran:51:56، quran:67:2
  - أفضل 5: الحجر: 28 [vector+en 0.575] · الروم: 20 [vector+en 0.535] · النساء: 28 [vector 0.602] · ص: 71 [en] · السجدة: 7 [vector 0.587]
- **fresh-05** (تحقق (زوجي)، en) What is the Day of Judgment? — gold: quran:82:17، quran:82:18، quran:82:19، quran:83:6، quran:1:4
  - أفضل 5: القيامة: 1 [vector+en 0.483] · الحج: 69 [vector+en 0.492] · القيامة: 6 [vector+en 0.458] · القلم: 39 [vector+en 0.457] · النبإ: 17 [vector 0.537]
- **fresh-06** (تحقق (زوجي)، en) Who are the angels? — gold: quran:66:6، quran:35:1، quran:21:26، quran:21:27، quran:2:285
  - أفضل 5: عبس: 15 [vector+en 0.524] · الصافات: 1 [vector+en 0.480] · المرسلات: 5 [vector+en 0.476] · النحل: 32 [vector+en 0.475] · النازعات: 5 [vector 0.541]
- **fresh-07** (تحقق (زوجي)، en) What is the Quran? — gold: quran:2:2، quran:2:185، quran:17:9، quran:16:89
  - أفضل 5: الواقعة: 77 [vector+en 0.553] · الحاقة: 40 [vector+en 0.549] · ص: 1 [vector+en 0.504] · الحاقة: 48 [vector+en 0.514] · التكوير: 19 [vector+en 0.537]
- **fresh-11** (تحقق (زوجي)، en) What is the reward of reading the Quran? — gold: hadith:6275، hadith:5913، quran:35:29، quran:35:30
  - أفضل 5: الإسراء: 9 [vector+en 0.536] · الأعراف: 204 [vector 0.557] · الإسراء: 14 [en] · الإنشقاق: 21 [vector 0.548] · النمل: 30 [en]
- **fresh-12** (تحقق (زوجي)، en) How should a Muslim treat neighbours? — gold: quran:4:36، hadith:5437، hadith:3709، hadith:66268
  - أفضل 5: الزمر: 12 [vector+en 0.439] · الأنعام: 163 [vector+en 0.440] · البقرة: 128 [vector+en 0.435] · الشعراء: 214 [vector 0.480] · القلم: 35 [en]
- **fresh-14** (تحقق (زوجي)، en) What is the virtue of saying "Subhan Allah"? — gold: hadith:5507، hadith:65004
  - أفضل 5: الإسراء: 43 [vector 0.503] · النمل: 26 [en] · الروم: 17 [vector 0.493] · التغابن: 13 [en] · يونس: 58 [vector 0.488]
- **fresh-15** (تحقق (زوجي)، en) What is the reward for patience? — gold: quran:39:10، quran:2:155، quran:2:156، quran:2:157، hadith:65004
  - أفضل 5: المعارج: 5 [vector+en 0.512] · المؤمنون: 111 [vector+en 0.542] · هود: 11 [vector+en 0.505] · الانسان: 12 [vector+en 0.494] · هود: 115 [vector+en 0.490]
- **fresh-18** (تحقق (زوجي)، en) What is the virtue of seeking forgiveness? — gold: quran:71:10، quran:71:11، quran:71:12، quran:3:135، hadith:4808، hadith:4809، hadith:5503
  - أفضل 5: النور: 22 [vector+en 0.499] · النساء: 110 [vector+en 0.490] · النساء: 106 [vector+en 0.488] · هود: 90 [vector+en 0.496] · المائدة: 39 [vector+en 0.487]
- **fresh-20** (تحقق (زوجي)، en) What does Islam say about kindness to animals? — gold: hadith:10100، hadith:58193
  - أفضل 5: المائدة: 3 [vector+en 0.442] · النحل: 49 [vector 0.476] · الحجرات: 17 [en] · طه: 54 [vector 0.457] · آل عمران: 20 [en]
- **fresh-22** (تحقق (زوجي)، ar) ما فضل قراءة القرآن؟ — gold: hadith:6275، hadith:5913، quran:35:29، quran:35:30
  - أفضل 5: المزمل: 4 [ayah+tafsir+lex] · الرحمن: 2 [ayah+tafsir+lex] · الفرقان: 32 [ayah+tafsir+lex] · البقرة: 121 [ayah+tafsir+lex] · النمل: 1 [vector+ayah+lex 0.540]
- **fresh-25** (تحقق (زوجي)، ar) ما جزاء الصبر؟ — gold: quran:39:10، quran:2:155، quran:2:156، quran:2:157، hadith:65004
  - أفضل 5: هود: 115 [vector+ayah+tafsir+lex 0.541] · النحل: 127 [vector+ayah+tafsir+lex 0.489] · البقرة: 153 [vector+ayah+lex 0.549] · الأنبياء: 85 [ayah+tafsir+lex] · يونس: 109 [ayah+tafsir+lex]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| fresh-01 What is the meaning of "There is no god but Allah"? | answer | 0.577 | لا |
| fresh-02 Who is Allah? | answer | 0.560 | لا |
| fresh-03 What are the pillars of faith (iman)? | answer | 0.471 | لا |
| fresh-04 Why did Allah create human beings? | answer | 0.602 | لا |
| fresh-05 What is the Day of Judgment? | answer | 0.537 | لا |
| fresh-06 Who are the angels? | answer | 0.541 | لا |
| fresh-07 What is the Quran? | answer | 0.553 | لا |
| fresh-08 Who was the Prophet Muhammad? | answer | 0.529 | لا |
| fresh-09 Is Hajj obligatory on every Muslim? | answer | 0.457 | لا |
| fresh-10 What is the virtue of praying on time? | answer | 0.529 | لا |
| fresh-11 What is the reward of reading the Quran? | answer | 0.557 | لا |
| fresh-12 How should a Muslim treat neighbours? | answer | 0.480 | لا |
| fresh-13 What does Islam say about honesty? | answer | 0.508 | لا |
| fresh-14 What is the virtue of saying "Subhan Allah"? | answer | 0.503 | لا |
| fresh-15 What is the reward for patience? | answer | 0.542 | لا |
| fresh-16 What does Islam say about caring for orphans? | answer | 0.486 | لا |
| fresh-17 Is backbiting forbidden in Islam? | answer | 0.442 | لا |
| fresh-18 What is the virtue of seeking forgiveness? | answer | 0.500 | لا |
| fresh-19 What is the reward for feeding people? | answer | 0.511 | لا |
| fresh-20 What does Islam say about kindness to animals? | answer | 0.476 | لا |
| fresh-21 ما معنى شهادة أن محمدًا رسول الله؟ | answer | 0.557 | لا |
| fresh-22 ما فضل قراءة القرآن؟ | answer | 0.575 | لا |
| fresh-23 ما حق الجار؟ | answer | 0.503 | لا |
| fresh-24 ما فضل الاستغفار؟ | answer | 0.538 | لا |
| fresh-25 ما جزاء الصبر؟ | answer | 0.556 | لا |
| fresh-26 هل الغيبة محرمة؟ | answer | 0.507 | لا |
| fresh-27 ما فضل إطعام الطعام؟ | answer | 0.550 | لا |
| fresh-28 ما فضل ذكر الله؟ | answer | 0.556 | لا |
| fresh-29 ما أركان الإيمان؟ | answer | 0.499 | لا |
| fresh-30 ما فضل كفالة اليتيم؟ | answer | 0.469 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 44012
