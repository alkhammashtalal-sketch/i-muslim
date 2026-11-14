# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T10:04:12.734Z على 30 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 0 | — | — | — | NaN | — | — |
| الجديد | تحقق (زوجي) | 30 | 23.2% | 39.2% | 53.3% | 0.462 | — | 0/30 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| en | 20 | 18.1% | 40.0% | 0.360 |
| ar | 10 | 33.4% | 80.0% | 0.667 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **fresh-01** (تحقق (زوجي)، en) What is the meaning of "There is no god but Allah"? — gold: aqeedah:usul:005، aqeedah:usul:011، quran:47:19، quran:3:18
  - أفضل 5: التغابن: 13 [vector+en 0.559] · آل عمران: 2 [vector+en 0.569] · متفق عليه [hadith_vec+hadith_en 0.623] · طه: 8 [vector+en 0.541] · رواه مسلم [hadith_vec+hadith_en 0.601]
- **fresh-02** (تحقق (زوجي)، en) Who is Allah? — gold: quran:112:1، quran:112:2، quran:112:3، quran:112:4، quran:2:255، quran:59:22، quran:59:23، quran:59:24
  - أفضل 5: آل عمران: 2 [vector+en 0.539] · التغابن: 13 [vector+en 0.498] · رواه مسلم [hadith_vec+hadith_en 0.524] · النساء: 87 [vector+en 0.514] · طه: 8 [vector+en 0.492]
- **fresh-04** (تحقق (زوجي)، en) Why did Allah create human beings? — gold: quran:51:56، quran:67:2
  - أفضل 5: الحجر: 28 [vector+en 0.575] · الروم: 20 [vector+en 0.535] · رواه مسلم [hadith_vec+hadith_en 0.580] · رواه البخاري في خلق أفعال العباد وابن أبي عاصم في السنة وابن منده في كتاب التوحيد [hadith_vec+hadith_en 0.627] · رواه الترمذي وابن حبان [hadith_vec+hadith_en 0.598]
- **fresh-05** (تحقق (زوجي)، en) What is the Day of Judgment? — gold: quran:82:17، quran:82:18، quran:82:19، quran:83:6، quran:1:4
  - أفضل 5: القيامة: 1 [vector+en 0.483] · الحج: 69 [vector+en 0.492] · رواه مسلم [hadith_vec+hadith_en 0.546] · رواه مسلم، ولفظة: "في الدنيا" لا توجد في مسلم، ولعل النووي أخذها من ابن الأثير، انظر: جامع الأصول (8/472 رقم6242) [hadith_vec+hadith_en 0.497] · القيامة: 6 [vector+en 0.458]
- **fresh-06** (تحقق (زوجي)، en) Who are the angels? — gold: quran:66:6، quran:35:1، quran:21:26، quran:21:27، quran:2:285
  - أفضل 5: عبس: 15 [vector+en 0.524] · الصافات: 1 [vector+en 0.480] · صحيح مسلم [hadith_vec+hadith_en 0.503] · رواه مسلم [hadith_vec+hadith_en 0.496] · رواه النسائي وأحمد والدارمي [hadith_vec+hadith_en 0.523]
- **fresh-07** (تحقق (زوجي)، en) What is the Quran? — gold: quran:2:2، quran:2:185، quran:17:9، quran:16:89
  - أفضل 5: الواقعة: 77 [vector+en 0.553] · الحاقة: 40 [vector+en 0.549] · متفق عليه [hadith_vec+hadith_en 0.542] · ص: 1 [vector+en 0.504] · رواه مسلم في جملة حديثٍ طويلٍ [hadith_vec+hadith_en 0.533]
- **fresh-09** (تحقق (زوجي)، en) Is Hajj obligatory on every Muslim? — gold: quran:3:97، aqeedah:usul:006، hadith:65000
  - أفضل 5: البقرة: 197 [vector+en 0.457] · الحج: 27 [vector+en 0.449] · متفق عليه [hadith_vec+hadith_en 0.498] · متفق عليه [hadith_vec+hadith_en 0.528] · البقرة: 196 [vector+en 0.443]
- **fresh-11** (تحقق (زوجي)، en) What is the reward of reading the Quran? — gold: hadith:6275، hadith:5913، quran:35:29، quran:35:30
  - أفضل 5: الإسراء: 9 [vector+en 0.536] · الأعراف: 204 [vector 0.557] · متفق عليه [hadith_vec+hadith_en 0.672] · رواه مسلم [hadith_vec+hadith_en 0.626] · رواه أبو داود والترمذي والنسائي في الكبرى وأحمد [hadith_vec+hadith_en 0.596]
- **fresh-12** (تحقق (زوجي)، en) How should a Muslim treat neighbours? — gold: quran:4:36، hadith:5437، hadith:3709، hadith:66268
  - أفضل 5: الزمر: 12 [vector+en 0.439] · الأنعام: 163 [vector+en 0.440] · رواه مسلم [hadith_vec+hadith_en 0.601] · رواه أبو داود وابن ماجه وأحمد [hadith_vec+hadith_en 0.557] · البقرة: 128 [vector+en 0.435]
- **fresh-13** (تحقق (زوجي)، en) What does Islam say about honesty? — gold: hadith:5504، quran:9:119، quran:33:70
  - أفضل 5: الشورى: 24 [vector+en 0.479] · البقرة: 208 [vector+en 0.471] · رواه أبو داود وأحمد والنسائي في الكبرى [hadith_vec+hadith_en 0.561] · رواه مسلم وأحمد [hadith_vec+hadith_en 0.560] · رواه مسلم [hadith_vec+hadith_en 0.544]
- **fresh-15** (تحقق (زوجي)، en) What is the reward for patience? — gold: quran:39:10، quran:2:155، quran:2:156، quran:2:157، hadith:65004
  - أفضل 5: المعارج: 5 [vector+en 0.512] · المؤمنون: 111 [vector+en 0.542] · متفق عليه [hadith_vec+hadith_en 0.541] · هود: 11 [vector+en 0.505] · رواه مسلم [hadith_vec+hadith_en 0.542]
- **fresh-20** (تحقق (زوجي)، en) What does Islam say about kindness to animals? — gold: hadith:10100، hadith:58193
  - أفضل 5: المائدة: 3 [vector+en 0.442] · النحل: 49 [vector 0.476] · رواه مسلم [hadith_vec+hadith_en 0.545] · الحجرات: 17 [en] · متفق عليه [hadith_vec 0.549]
- **fresh-22** (تحقق (زوجي)، ar) ما فضل قراءة القرآن؟ — gold: hadith:6275، hadith:5913، quran:35:29، quran:35:30
  - أفضل 5: النمل: 1 [vector+ayah+lex 0.540] · القمر: 17 [vector+ayah+lex 0.536] · المزمل: 4 [ayah+tafsir+lex] · الرحمن: 2 [ayah+tafsir+lex] · الفرقان: 32 [ayah+tafsir+lex]
- **fresh-25** (تحقق (زوجي)، ar) ما جزاء الصبر؟ — gold: quran:39:10، quran:2:155، quran:2:156، quran:2:157، hadith:65004
  - أفضل 5: هود: 115 [vector+ayah+tafsir+lex 0.541] · البقرة: 153 [vector+ayah+lex 0.549] · النحل: 127 [vector+ayah+tafsir+lex 0.489] · الأنبياء: 85 [ayah+tafsir+lex] · يونس: 109 [ayah+tafsir+lex]

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

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 76948
