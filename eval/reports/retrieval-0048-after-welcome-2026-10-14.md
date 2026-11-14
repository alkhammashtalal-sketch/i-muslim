# تقرير الاسترجاع — 2026-10-14

أنشأه `eval/run-retrieval.mjs` في 2026-10-14T07:11:34.085Z على 119 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 0 | — | — | — | NaN | — | — |
| الجديد | تحقق (زوجي) | 119 | 47.2% | 73.7% | 78.2% | 0.565 | — | 1/119 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 12 | 47.2% | 75.0% | 0.595 |
| en | 12 | 34.7% | 58.3% | 0.420 |
| ur | 11 | 60.6% | 90.9% | 0.566 |
| id | 11 | 50.0% | 81.8% | 0.598 |
| ms | 11 | 50.0% | 90.9% | 0.593 |
| tr | 12 | 45.8% | 83.3% | 0.591 |
| fr | 14 | 54.2% | 78.6% | 0.634 |
| es | 12 | 43.8% | 66.7% | 0.582 |
| bn | 13 | 40.4% | 76.9% | 0.465 |
| hi | 11 | 46.2% | 81.8% | 0.609 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **wp-allah-en** (تحقق (زوجي)، en) Who is Allah? — gold: aqeedah:usul:002، quran:112:1، quran:2:255، quran:59:22
  - أفضل 5: آل عمران: 2 [vector+en 0.539] · رواه مسلم [hadith_vec+hadith_en 0.524] · التغابن: 13 [vector+en 0.498] · النساء: 87 [vector+en 0.514] · طه: 8 [vector+en 0.492]
- **wp-shahada-ar** (تحقق (زوجي)، ar) ما معنى الشهادتين: لا إله إلا الله، محمد رسول الله؟ — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الصافات: 35 [ayah+tafsir+lex] · الأحزاب: 40 [ayah+tafsir+lex] · ابراهيم: 24 [vector+tafsir 0.504] · الأنبياء: 107 [ayah+lex] · متفق عليه [hadith_vec+hadith 0.608]
- **wp-shahada-en** (تحقق (زوجي)، en) What does the Shahadah mean: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: رواه مسلم [hadith_vec+hadith_en 0.549] · رواه مسلم [hadith_vec+hadith_en 0.540] · رواه مسلم [hadith_vec+hadith_en 0.561] · رواه مسلم [hadith_vec+hadith_en 0.531] · متفق عليه [hadith_vec+hadith_en 0.524]
- **wp-shahada-id** (تحقق (زوجي)، id) Apa makna dua kalimat syahadat: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.480]
- **wp-shahada-ms** (تحقق (زوجي)، ms) Apakah makna dua kalimah syahadah: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.484] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex]
- **wp-shahada-tr** (تحقق (زوجي)، tr) Kelime-i şehadetin anlamı nedir: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · النساء: 69 [tafsir+lex]
- **wp-shahada-fr** (تحقق (زوجي)، fr) Que signifie la shahada : lā ilāha illā Allāh, Muhammadun rasūl Allāh ? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: النساء: 69 [vector+tafsir+lex 0.448] · الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex]
- **wp-shahada-es** (تحقق (زوجي)، es) ¿Qué significa la shahada: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · النساء: 69 [tafsir+lex]
- **wp-shahada-bn** (تحقق (زوجي)، bn) শাহাদাহ «লা ইলাহা ইল্লাল্লাহ, মুহাম্মাদুর রাসূলুল্লাহ»-এর অর্থ কী? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: ابراهيم: 24 [vector 0.449] · النساء: 79 [vector 0.444] · هود: 59 [vector 0.443] · النساء: 69 [vector 0.441] · هود: 75 [vector 0.439]
- **wp-shahada-hi** (تحقق (زوجي)، hi) शहादा «ला इलाहा इल्लल्लाह, मुहम्मदुर रसूलुल्लाह» का क्या अर्थ है? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: النور: 54 [vector 0.465] · هود: 66 [vector 0.461] · هود: 2 [vector 0.459] · التوبة: 40 [vector 0.459] · الأحزاب: 45 [vector 0.457]
- **wp-salah-ur** (تحقق (زوجي)، ur) مسلمان نماز کیوں پڑھتے ہیں؟ — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.499] · الإسراء: 78 [vector+tafsir+lex 0.511] · الأنعام: 72 [tafsir+lex] · هود: 114 [vector+tafsir 0.508] · النساء: 103 [vector+lex 0.504]
- **wp-salah-id** (تحقق (زوجي)، id) Mengapa umat Islam salat? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.489] · الأنعام: 72 [vector+tafsir+lex 0.478] · البقرة: 43 [vector+lex 0.507] · النساء: 103 [vector+lex 0.493] · الأنفال: 3 [tafsir+lex]
- **wp-salah-fr** (تحقق (زوجي)، fr) Pourquoi les musulmans prient-ils ? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 153 [vector 0.519] · الأحزاب: 35 [vector 0.513] · السجدة: 16 [vector 0.512] · الأحزاب: 43 [vector 0.508] · الأحزاب: 56 [vector 0.502]
- **wp-salah-es** (تحقق (زوجي)، es) ¿Por qué rezan los musulmanes? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: الأحزاب: 35 [vector 0.503] · الفرقان: 64 [vector 0.501] · السجدة: 16 [vector 0.500] · الأحزاب: 43 [vector 0.492] · البقرة: 43 [vector 0.489]
- **wp-salah-bn** (تحقق (زوجي)، bn) মুসলিমরা কেন নামাজ পড়ে? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.487] · الإسراء: 78 [vector+tafsir+lex 0.493] · الأنعام: 72 [tafsir+lex] · النساء: 103 [vector+lex 0.512] · البقرة: 43 [vector+lex 0.507]
- **wp-taharah-ar** (تحقق (زوجي)، ar) كيف يتطهر المسلم للصلاة؟ — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.504] · الإسراء: 78 [vector+ayah+tafsir+lex 0.483] · الأنعام: 72 [ayah+tafsir+lex] · البقرة: 43 [ayah+tafsir+lex] · النساء: 103 [vector+ayah+lex 0.474]
- **wp-taharah-en** (تحقق (زوجي)، en) How does a Muslim purify for prayer? — gold: quran:5:6
  - أفضل 5: المدثر: 4 [vector+en 0.481] · متفق عليه [hadith_vec+hadith_en 0.562] · الحج: 26 [vector+en 0.464] · عبس: 3 [vector+en 0.487] · الأعلى: 14 [vector+en 0.451]
- **wp-taharah-tr** (تحقق (زوجي)، tr) Bir Müslüman namaz için nasıl temizlenir? — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.460] · الأنعام: 72 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.515] · العنكبوت: 45 [vector+lex 0.462] · الأنفال: 3 [tafsir+lex]
- **wp-taharah-fr** (تحقق (زوجي)، fr) Comment un musulman se purifie-t-il pour la prière ? — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.447] · الأنعام: 72 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.501] · الأنفال: 3 [tafsir+lex] · العنكبوت: 45 [vector+lex 0.448]
- **wp-taharah-es** (تحقق (زوجي)، es) ¿Cómo se purifica un musulmán para la oración? — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.432] · الأنعام: 72 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.472] · الأنفال: 3 [tafsir+lex] · الإسراء: 78 [tafsir+lex]
- **wp-taharah-bn** (تحقق (زوجي)، bn) একজন মুসলিম নামাজের জন্য কীভাবে পবিত্র হয়? — gold: quran:5:6
  - أفضل 5: الأحزاب: 43 [vector 0.493] · الأحزاب: 35 [vector 0.492] · البقرة: 149 [vector 0.485] · شروط الصلاة وأركانها – ص 37–38 [vector 0.483] · البقرة: 153 [vector 0.481]
- **wp-taharah-hi** (تحقق (زوجي)، hi) एक मुसलमान नमाज़ के लिए पाकी कैसे हासिल करता है? — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.428] · الإسراء: 78 [vector+tafsir+lex 0.438] · الأنعام: 72 [tafsir+lex] · البقرة: 43 [vector+lex 0.482] · النساء: 103 [vector+lex 0.438]
- **wp-zakah-ar** (تحقق (زوجي)، ar) ما هي الزكاة ولمن تُعطى؟ — gold: quran:9:60، quran:9:103
  - أفضل 5: النور: 56 [vector+ayah+tafsir+lex 0.484] · البقرة: 43 [ayah+tafsir+lex] · البقرة: 110 [vector+ayah+lex 0.506] · التوبة: 11 [ayah+tafsir+lex] · الحج: 41 [vector+ayah+lex 0.486]
- **wp-zakah-en** (تحقق (زوجي)، en) What is zakah and who receives it? — gold: quran:9:60، quran:9:103
  - أفضل 5: النور: 56 [vector+en 0.493] · لقمان: 4 [vector+en 0.515] · النمل: 3 [vector+en 0.513] · متفق عليه [hadith_vec+hadith_en 0.571] · الحج: 41 [vector+en 0.496]
- **wp-hajj-en** (تحقق (زوجي)، en) What is Hajj and who must perform it? — gold: quran:3:97، aqeedah:usul:006، aqeedah:usul:008
  - أفضل 5: متفق عليه بروايتيه [hadith_vec+hadith_en 0.533] · البقرة: 197 [vector+en 0.492] · البقرة: 196 [vector+en 0.464] · متفق عليه [hadith_vec+hadith_en 0.552] · البقرة: 158 [vector+en 0.401]
- **wp-hajj-es** (تحقق (زوجي)، es) ¿Qué es el hach y quién debe realizarlo? — gold: quran:3:97، aqeedah:usul:006، aqeedah:usul:008 — **اعتذر**
  - أفضل 5: الحديد: 24 [vector 0.362] · التوبة: 60 [vector 0.356] · الشعراء: 3 [vector 0.355] · الفرقان: 59 [vector 0.352] · البقرة: 197 [vector 0.351]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| ws-islam-ar ما هو الإسلام؟ | answer | 0.551 | لا |
| ws-pillars-ar ما هي أركان الإسلام؟ | answer | 0.507 | لا |
| ws-iman-ar ما أركان الإيمان؟ | answer | 0.499 | لا |
| ws-create-ar لماذا خلق الله الإنسان؟ | answer | 0.604 | لا |
| ws-islam-en What is Islam? | answer | 0.542 | لا |
| ws-pillars-en What are the pillars of Islam? | answer | 0.487 | لا |
| ws-iman-en What are the pillars of faith? | answer | 0.447 | لا |
| ws-create-en Why did God create human beings? | answer | 0.591 | لا |
| ws-islam-ur اسلام کیا ہے؟ | answer | 0.527 | لا |
| ws-pillars-ur اسلام کے ارکان کیا ہیں؟ | answer | 0.503 | لا |
| ws-iman-ur ایمان کے ارکان کیا ہیں؟ | answer | 0.504 | لا |
| ws-create-ur اللہ نے انسان کو کیوں پیدا کیا؟ | answer | 0.597 | لا |
| ws-islam-id Apa itu Islam? | answer | 0.541 | لا |
| ws-pillars-id Apa saja rukun Islam? | answer | 0.466 | لا |
| ws-iman-id Apa saja rukun iman? | answer | 0.487 | لا |
| ws-create-id Mengapa Allah menciptakan manusia? | answer | 0.604 | لا |
| ws-islam-ms Apakah itu Islam? | answer | 0.547 | لا |
| ws-pillars-ms Apakah rukun Islam? | answer | 0.445 | لا |
| ws-iman-ms Apakah rukun iman? | answer | 0.470 | لا |
| ws-create-ms Mengapa Allah mencipta manusia? | answer | 0.601 | لا |
| ws-islam-tr İslam nedir? | answer | 0.530 | لا |
| ws-pillars-tr İslam’ın şartları nelerdir? | answer | 0.515 | لا |
| ws-iman-tr İmanın şartları nelerdir? | answer | 0.527 | لا |
| ws-create-tr Allah insanı neden yarattı? | answer | 0.598 | لا |
| ws-islam-fr Qu’est-ce que l’islam ? | answer | 0.524 | لا |
| ws-pillars-fr Quels sont les piliers de l’islam ? | answer | 0.476 | لا |
| ws-iman-fr Quels sont les piliers de la foi ? | answer | 0.477 | لا |
| ws-create-fr Pourquoi Dieu a-t-il créé l’être humain ? | answer | 0.582 | لا |
| ws-islam-es ¿Qué es el islam? | answer | 0.522 | لا |
| ws-pillars-es ¿Cuáles son los pilares del islam? | answer | 0.489 | لا |
| ws-iman-es ¿Cuáles son los pilares de la fe? | answer | 0.456 | لا |
| ws-create-es ¿Por qué creó Dios al ser humano? | answer | 0.577 | لا |
| ws-islam-bn ইসলাম কী? | answer | 0.524 | لا |
| ws-pillars-bn ইসলামের স্তম্ভগুলো কী কী? | answer | 0.500 | لا |
| ws-iman-bn ঈমানের স্তম্ভগুলো কী কী? | answer | 0.512 | لا |
| ws-create-bn আল্লাহ মানুষকে কেন সৃষ্টি করেছেন? | answer | 0.600 | لا |
| ws-islam-hi इस्लाम क्या है? | answer | 0.523 | لا |
| ws-pillars-hi इस्लाम के स्तंभ क्या हैं? | answer | 0.498 | لا |
| ws-iman-hi ईमान के स्तंभ क्या हैं? | answer | 0.468 | لا |
| ws-create-hi अल्लाह ने इंसान को क्यों बनाया? | answer | 0.591 | لا |
| wp-islam-fr Qu'est-ce que l'islam ? | answer | 0.526 | لا |
| wp-allah-ar من هو الله؟ | answer | 0.567 | لا |
| wp-allah-en Who is Allah? | answer | 0.560 | لا |
| wp-allah-ur اللہ کون ہے؟ | answer | 0.550 | لا |
| wp-allah-id Siapakah Allah? | answer | 0.562 | لا |
| wp-allah-ms Siapakah Allah? | answer | 0.562 | لا |
| wp-allah-tr Allah kimdir? | answer | 0.558 | لا |
| wp-allah-fr Qui est Allah ? | answer | 0.562 | لا |
| wp-allah-es ¿Quién es Allah? | answer | 0.548 | لا |
| wp-allah-bn আল্লাহ কে? | answer | 0.559 | لا |
| wp-allah-hi अल्लाह कौन है? | answer | 0.545 | لا |
| wp-iman-en What are the pillars of faith (iman)? | answer | 0.471 | لا |
| wp-iman-fr Quels sont les piliers de la foi (iman) ? | answer | 0.506 | لا |
| wp-iman-es ¿Cuáles son los pilares de la fe (imán)? | answer | 0.496 | لا |
| wp-iman-bn ঈমানের রুকনগুলো কী কী? | answer | 0.492 | لا |
| wp-pillars-ar ما أركان الإسلام؟ | answer | 0.516 | لا |
| wp-pillars-tr İslam'ın şartları nelerdir? | answer | 0.514 | لا |
| wp-pillars-fr Quels sont les piliers de l'islam ? | answer | 0.475 | لا |
| wp-pillars-bn ইসলামের রুকনগুলো কী কী? | answer | 0.428 | لا |
| wp-shahada-ar ما معنى الشهادتين: لا إله إلا الله، محمد رسول الله؟ | answer | 0.513 | لا |
| wp-shahada-en What does the Shahadah mean: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.453 | لا |
| wp-shahada-ur شہادتین «لا إله إلا الله، محمد رسول الله» کا کیا مطلب ہے؟ | answer | 0.534 | لا |
| wp-shahada-id Apa makna dua kalimat syahadat: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.485 | لا |
| wp-shahada-ms Apakah makna dua kalimah syahadah: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.488 | لا |
| wp-shahada-tr Kelime-i şehadetin anlamı nedir: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.472 | لا |
| wp-shahada-fr Que signifie la shahada : lā ilāha illā Allāh, Muhammadun rasūl Allāh ? | answer | 0.505 | لا |
| wp-shahada-es ¿Qué significa la shahada: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.494 | لا |
| wp-shahada-bn শাহাদাহ «লা ইলাহা ইল্লাল্লাহ, মুহাম্মাদুর রাসূলুল্লাহ»-এর অর্থ কী? | answer | 0.449 | لا |
| wp-shahada-hi शहादा «ला इलाहा इल्लल्लाह, मुहम्मदुर रसूलुल्लाह» का क्या अर्थ है? | answer | 0.465 | لا |
| wp-salah-ar لماذا يصلي المسلمون؟ | answer | 0.529 | لا |
| wp-salah-en Why do Muslims pray (salah)? | answer | 0.499 | لا |
| wp-salah-ur مسلمان نماز کیوں پڑھتے ہیں؟ | answer | 0.553 | لا |
| wp-salah-id Mengapa umat Islam salat? | answer | 0.532 | لا |
| wp-salah-ms Mengapa orang Islam bersolat? | answer | 0.512 | لا |
| wp-salah-tr Müslümanlar neden namaz kılar? | answer | 0.542 | لا |
| wp-salah-fr Pourquoi les musulmans prient-ils ? | answer | 0.519 | لا |
| wp-salah-es ¿Por qué rezan los musulmanes? | answer | 0.503 | لا |
| wp-salah-bn মুসলিমরা কেন নামাজ পড়ে? | answer | 0.533 | لا |
| wp-salah-hi मुसलमान नमाज़ क्यों पढ़ते हैं? | answer | 0.512 | لا |
| wp-taharah-ar كيف يتطهر المسلم للصلاة؟ | answer | 0.534 | لا |
| wp-taharah-en How does a Muslim purify for prayer? | answer | 0.496 | لا |
| wp-taharah-ur مسلمان نماز کے لیے طہارت کیسے حاصل کرتا ہے؟ | answer | 0.502 | لا |
| wp-taharah-id Bagaimana seorang Muslim bersuci untuk salat? | answer | 0.508 | لا |
| wp-taharah-ms Bagaimanakah seorang Muslim bersuci untuk solat? | answer | 0.512 | لا |
| wp-taharah-tr Bir Müslüman namaz için nasıl temizlenir? | answer | 0.523 | لا |
| wp-taharah-fr Comment un musulman se purifie-t-il pour la prière ? | answer | 0.506 | لا |
| wp-taharah-es ¿Cómo se purifica un musulmán para la oración? | answer | 0.520 | لا |
| wp-taharah-bn একজন মুসলিম নামাজের জন্য কীভাবে পবিত্র হয়? | answer | 0.493 | لا |
| wp-taharah-hi एक मुसलमान नमाज़ के लिए पाकी कैसे हासिल करता है? | answer | 0.482 | لا |
| wp-sawm-ar لماذا يصوم المسلمون في رمضان؟ | answer | 0.562 | لا |
| wp-sawm-en Why do Muslims fast in Ramadan? | answer | 0.498 | لا |
| wp-sawm-ur مسلمان رمضان میں روزہ کیوں رکھتے ہیں؟ | answer | 0.507 | لا |
| wp-sawm-id Mengapa umat Islam berpuasa di bulan Ramadan? | answer | 0.509 | لا |
| wp-sawm-ms Mengapa orang Islam berpuasa pada bulan Ramadan? | answer | 0.496 | لا |
| wp-sawm-tr Müslümanlar Ramazan'da neden oruç tutar? | answer | 0.489 | لا |
| wp-sawm-fr Pourquoi les musulmans jeûnent-ils pendant le Ramadan ? | answer | 0.512 | لا |
| wp-sawm-es ¿Por qué ayunan los musulmanes en Ramadán? | answer | 0.481 | لا |
| wp-sawm-bn মুসলিমরা রমজানে কেন রোজা রাখে? | answer | 0.468 | لا |
| wp-sawm-hi मुसलमान रमज़ान में रोज़ा क्यों रखते हैं? | answer | 0.464 | لا |
| wp-zakah-ar ما هي الزكاة ولمن تُعطى؟ | answer | 0.577 | لا |
| wp-zakah-en What is zakah and who receives it? | answer | 0.562 | لا |
| wp-zakah-ur زکوٰۃ کیا ہے اور کسے دی جاتی ہے؟ | answer | 0.573 | لا |
| wp-zakah-id Apa itu zakat dan kepada siapa diberikan? | answer | 0.577 | لا |
| wp-zakah-ms Apakah itu zakat dan kepada siapa ia diberikan? | answer | 0.573 | لا |
| wp-zakah-tr Zekât nedir ve kime verilir? | answer | 0.557 | لا |
| wp-zakah-fr Qu'est-ce que la zakat et à qui est-elle donnée ? | answer | 0.572 | لا |
| wp-zakah-es ¿Qué es el zakat y a quién se da? | answer | 0.548 | لا |
| wp-zakah-bn যাকাত কী এবং কাকে দেওয়া হয়? | answer | 0.491 | لا |
| wp-zakah-hi ज़कात क्या है और किसे दी जाती है? | answer | 0.535 | لا |
| wp-hajj-ar ما هو الحج وعلى من يجب؟ | answer | 0.595 | لا |
| wp-hajj-en What is Hajj and who must perform it? | answer | 0.492 | لا |
| wp-hajj-ur حج کیا ہے اور کس پر فرض ہے؟ | answer | 0.579 | لا |
| wp-hajj-id Apa itu haji dan siapa yang wajib melaksanakannya? | answer | 0.511 | لا |
| wp-hajj-ms Apakah itu haji dan siapa yang wajib menunaikannya? | answer | 0.500 | لا |
| wp-hajj-tr Hac nedir ve kimlere farzdır? | answer | 0.509 | لا |
| wp-hajj-fr Qu'est-ce que le hajj et qui doit l'accomplir ? | answer | 0.505 | لا |
| wp-hajj-es ¿Qué es el hach y quién debe realizarlo? | answer | 0.362 | نعم |
| wp-hajj-bn হজ কী এবং কার উপর ফরজ? | answer | 0.485 | لا |
| wp-hajj-hi हज क्या है और किस पर फ़र्ज़ है? | answer | 0.502 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 88400
