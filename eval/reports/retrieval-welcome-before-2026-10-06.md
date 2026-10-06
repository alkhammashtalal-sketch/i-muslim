# تقرير الاسترجاع — 2026-10-06

أنشأه `eval/run-retrieval.mjs` في 2026-10-06T03:12:19.408Z على 119 سؤالًا (القسم: الكل). لا استدعاء لنموذج لغوي.

## الأرقام

| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الجديد | ضبط (فردي) | 0 | — | — | — | NaN | — | — |
| الجديد | تحقق (زوجي) | 119 | 43.4% | 67.4% | 73.1% | 0.491 | — | 1/119 |

### حسب اللغة (الجديد، القسمان معًا)

| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |
| --- | --- | --- | --- | --- |
| ar | 12 | 33.3% | 58.3% | 0.459 |
| en | 12 | 32.6% | 58.3% | 0.418 |
| ur | 11 | 54.5% | 90.9% | 0.492 |
| id | 11 | 50.0% | 81.8% | 0.439 |
| ms | 11 | 51.5% | 81.8% | 0.515 |
| tr | 12 | 45.1% | 75.0% | 0.567 |
| fr | 14 | 47.0% | 71.4% | 0.599 |
| es | 12 | 40.3% | 66.7% | 0.457 |
| bn | 13 | 35.9% | 61.5% | 0.443 |
| hi | 11 | 46.2% | 90.9% | 0.502 |

### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (0)


## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: الجديد)

- **ws-pillars-ar** (تحقق (زوجي)، ar) ما هي أركان الإسلام؟ — gold: aqeedah:usul:005
  - أفضل 5: البقرة: 43 [vector+ayah+lex 0.400] · البقرة: 83 [vector+ayah+lex 0.427] · الفجر: 2 [vector+tafsir 0.455] · النور: 56 [ayah+lex] · البقرة: 110 [ayah+lex]
- **ws-iman-en** (تحقق (زوجي)، en) What are the pillars of faith? — gold: aqeedah:usul:007، quran:2:285، quran:4:136، quran:2:177
  - أفضل 5: النمل: 3 [vector+en 0.396] · الأصول الثلاثة – ص 14–15 [vector 0.441] · الفجر: 7 [en] · الأنفال: 2 [vector 0.434] · الذاريات: 20 [en]
- **ws-create-ur** (تحقق (زوجي)، ur) اللہ نے انسان کو کیوں پیدا کیا؟ — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.596] · الانسان: 2 [vector 0.589] · النساء: 28 [vector 0.585] · عبس: 19 [vector 0.578] · الرحمن: 3 [vector 0.573]
- **ws-create-ms** (تحقق (زوجي)، ms) Mengapa Allah mencipta manusia? — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.596] · النساء: 28 [vector 0.593] · الانسان: 2 [vector 0.571] · البقرة: 35 [vector 0.567] · عبس: 19 [vector 0.564]
- **ws-create-tr** (تحقق (زوجي)، tr) Allah insanı neden yarattı? — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.593] · النساء: 28 [vector 0.591] · الانسان: 2 [vector 0.579] · عبس: 19 [vector 0.570] · البقرة: 35 [vector 0.570]
- **ws-create-fr** (تحقق (زوجي)، fr) Pourquoi Dieu a-t-il créé l’être humain ? — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.587] · عبس: 19 [vector 0.567] · النساء: 28 [vector 0.561] · الرحمن: 3 [vector 0.561] · الانسان: 2 [vector 0.558]
- **ws-create-es** (تحقق (زوجي)، es) ¿Por qué creó Dios al ser humano? — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.577] · النساء: 28 [vector 0.558] · الرحمن: 3 [vector 0.553] · عبس: 19 [vector 0.552] · الانسان: 2 [vector 0.547]
- **ws-create-bn** (تحقق (زوجي)، bn) আল্লাহ মানুষকে কেন সৃষ্টি করেছেন? — gold: quran:51:56، aqeedah:usul:002، aqeedah:qawaid:001
  - أفضل 5: السجدة: 7 [vector 0.601] · النساء: 28 [vector 0.582] · الرحمن: 3 [vector 0.580] · الانسان: 2 [vector 0.580] · العلق: 2 [vector 0.575]
- **wp-allah-en** (تحقق (زوجي)، en) Who is Allah? — gold: aqeedah:usul:002، quran:112:1، quran:2:255، quran:59:22
  - أفضل 5: آل عمران: 2 [vector+en 0.531] · طه: 8 [vector+en 0.499] · النساء: 87 [vector+en 0.508] · التغابن: 13 [vector+en 0.494] · القصص: 70 [vector+en 0.518]
- **wp-iman-en** (تحقق (زوجي)، en) What are the pillars of faith (iman)? — gold: aqeedah:usul:007، quran:2:285، quran:4:136، quran:2:177
  - أفضل 5: النمل: 3 [vector+en 0.425] · الأنفال: 2 [vector 0.471] · الفجر: 7 [en] · الأصول الثلاثة – ص 14–15 [vector 0.468] · الذاريات: 20 [en]
- **wp-iman-bn** (تحقق (زوجي)، bn) ঈমানের রুকনগুলো কী কী? — gold: aqeedah:usul:007، quran:2:285، quran:4:136، quran:2:177
  - أفضل 5: الحجرات: 7 [vector 0.490] · الأنفال: 2 [vector 0.475] · النساء: 152 [vector 0.445] · آل عمران: 4 [vector 0.445] · الجن: 13 [vector 0.440]
- **wp-pillars-ar** (تحقق (زوجي)، ar) ما أركان الإسلام؟ — gold: aqeedah:usul:005
  - أفضل 5: البقرة: 43 [vector+ayah+lex 0.409] · البقرة: 83 [vector+ayah+lex 0.428] · الفجر: 2 [vector+tafsir 0.461] · النور: 56 [ayah+lex] · البقرة: 110 [ayah+lex]
- **wp-shahada-ar** (تحقق (زوجي)، ar) ما معنى الشهادتين: لا إله إلا الله، محمد رسول الله؟ — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الصافات: 35 [ayah+tafsir+lex] · الأحزاب: 40 [ayah+tafsir+lex] · الأنبياء: 107 [ayah+lex] · ابراهيم: 24 [vector+tafsir 0.487] · المرسلات: 11 [ayah+lex]
- **wp-shahada-id** (تحقق (زوجي)، id) Apa makna dua kalimat syahadat: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [vector+tafsir+lex 0.451] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.472]
- **wp-shahada-ms** (تحقق (زوجي)، ms) Apakah makna dua kalimah syahadah: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [vector+tafsir+lex 0.446] · الإسراء: 55 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.483] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex]
- **wp-shahada-tr** (تحقق (زوجي)، tr) Kelime-i şehadetin anlamı nedir: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex] · النساء: 69 [tafsir+lex]
- **wp-shahada-fr** (تحقق (زوجي)، fr) Que signifie la shahada : lā ilāha illā Allāh, Muhammadun rasūl Allāh ? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.476] · الأحزاب: 40 [tafsir+lex] · المرسلات: 11 [tafsir+lex]
- **wp-shahada-es** (تحقق (زوجي)، es) ¿Qué significa la shahada: lā ilāha illā Allāh, Muhammadun rasūl Allāh? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: الأحزاب: 7 [tafsir+lex] · الإسراء: 55 [tafsir+lex] · الأحزاب: 40 [tafsir+lex] · الأعراف: 158 [vector+tafsir 0.454] · المرسلات: 11 [tafsir+lex]
- **wp-shahada-bn** (تحقق (زوجي)، bn) শাহাদাহ «লা ইলাহা ইল্লাল্লাহ, মুহাম্মাদুর রাসূলুল্লাহ»-এর অর্থ কী? — gold: aqeedah:usul:005، quran:3:18، quran:47:19
  - أفضل 5: هود: 75 [vector 0.443] · الأعراف: 158 [vector 0.437] · النساء: 79 [vector 0.437] · الأحزاب: 7 [vector 0.436] · القلم: 25 [vector 0.434]
- **wp-salah-id** (تحقق (زوجي)، id) Mengapa umat Islam salat? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.479] · الأنعام: 72 [vector+tafsir+lex 0.472] · النساء: 103 [vector+lex 0.486] · الأنفال: 3 [tafsir+lex] · البقرة: 43 [vector+lex 0.484]
- **wp-salah-fr** (تحقق (زوجي)، fr) Pourquoi les musulmans prient-ils ? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: الأحزاب: 35 [vector 0.526] · البقرة: 153 [vector 0.517] · الأحزاب: 56 [vector 0.506] · الأحزاب: 43 [vector 0.505] · السجدة: 16 [vector 0.499]
- **wp-salah-bn** (تحقق (زوجي)، bn) মুসলিমরা কেন নামাজ পড়ে? — gold: quran:29:45، quran:20:14، quran:98:5، aqeedah:usul:005
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.473] · الإسراء: 78 [vector+tafsir+lex 0.480] · الأنعام: 72 [tafsir+lex] · النساء: 103 [vector+lex 0.504] · الأنفال: 3 [tafsir+lex]
- **wp-taharah-ar** (تحقق (زوجي)، ar) كيف يتطهر المسلم للصلاة؟ — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+ayah+tafsir+lex 0.500] · البقرة: 43 [vector+ayah+tafsir+lex 0.464] · الإسراء: 78 [vector+ayah+tafsir+lex 0.485] · الأنعام: 72 [ayah+tafsir+lex] · العنكبوت: 45 [vector+ayah+lex 0.504]
- **wp-taharah-en** (تحقق (زوجي)، en) How does a Muslim purify for prayer? — gold: quran:5:6
  - أفضل 5: المدثر: 4 [vector+en 0.467] · الحج: 26 [vector+en 0.470] · التوبة: 108 [vector+en 0.441] · عبس: 3 [vector+en 0.487] · البقرة: 125 [vector+en 0.455]
- **wp-taharah-tr** (تحقق (زوجي)، tr) Bir Müslüman namaz için nasıl temizlenir? — gold: quran:5:6
  - أفضل 5: البقرة: 238 [vector+tafsir+lex 0.454] · الأنعام: 72 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.506] · العنكبوت: 45 [vector+lex 0.473] · الأنفال: 3 [tafsir+lex]
- **wp-taharah-fr** (تحقق (زوجي)، fr) Comment un musulman se purifie-t-il pour la prière ? — gold: quran:5:6
  - أفضل 5: الأنعام: 72 [tafsir+lex] · البقرة: 238 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.488] · العنكبوت: 45 [vector+lex 0.463] · الأنفال: 3 [tafsir+lex]
- **wp-taharah-es** (تحقق (زوجي)، es) ¿Cómo se purifica un musulmán para la oración? — gold: quran:5:6
  - أفضل 5: الأنعام: 72 [tafsir+lex] · البقرة: 238 [tafsir+lex] · المدثر: 4 [vector+tafsir 0.471] · الأنفال: 3 [tafsir+lex] · العنكبوت: 45 [vector+lex 0.435]
- **wp-taharah-bn** (تحقق (زوجي)، bn) একজন মুসলিম নামাজের জন্য কীভাবে পবিত্র হয়? — gold: quran:5:6
  - أفضل 5: الأحزاب: 35 [vector 0.497] · الأحزاب: 43 [vector 0.486] · الروم: 31 [vector 0.478] · النساء: 103 [vector 0.477] · البقرة: 149 [vector 0.476]
- **wp-taharah-hi** (تحقق (زوجي)، hi) एक मुसलमान नमाज़ के लिए पाकी कैसे हासिल करता है? — gold: quran:5:6
  - أفضل 5: الأنعام: 72 [tafsir+lex] · البقرة: 238 [tafsir+lex] · البقرة: 43 [vector+lex 0.468] · النساء: 103 [vector+lex 0.439] · الأنفال: 3 [tafsir+lex]
- **wp-zakah-ar** (تحقق (زوجي)، ar) ما هي الزكاة ولمن تُعطى؟ — gold: quran:9:60، quran:9:103
  - أفضل 5: النور: 56 [vector+ayah+tafsir+lex 0.479] · البقرة: 43 [ayah+tafsir+lex] · البقرة: 110 [vector+ayah+lex 0.504] · التوبة: 11 [ayah+tafsir+lex] · النمل: 3 [vector+ayah+lex 0.553]
- **wp-zakah-en** (تحقق (زوجي)، en) What is zakah and who receives it? — gold: quran:9:60، quran:9:103
  - أفضل 5: لقمان: 4 [vector+en 0.518] · النمل: 3 [vector+en 0.509] · النور: 56 [vector+en 0.475] · البقرة: 110 [vector+en 0.486] · الحج: 41 [vector+en 0.490]
- **wp-hajj-es** (تحقق (زوجي)، es) ¿Qué es el hach y quién debe realizarlo? — gold: quran:3:97، aqeedah:usul:006، aqeedah:usul:008 — **اعتذر**
  - أفضل 5: الشعراء: 3 [vector 0.370] · التوبة: 60 [vector 0.358] · البقرة: 197 [vector 0.354] · العاديات: 11 [vector 0.349] · الفرقان: 59 [vector 0.347]

## الاعتذار (الطريقة: الجديد)

| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |
| --- | --- | --- | --- |
| ws-islam-ar ما هو الإسلام؟ | answer | 0.553 | لا |
| ws-pillars-ar ما هي أركان الإسلام؟ | answer | 0.516 | لا |
| ws-iman-ar ما أركان الإيمان؟ | answer | 0.483 | لا |
| ws-create-ar لماذا خلق الله الإنسان؟ | answer | 0.601 | لا |
| ws-islam-en What is Islam? | answer | 0.542 | لا |
| ws-pillars-en What are the pillars of Islam? | answer | 0.487 | لا |
| ws-iman-en What are the pillars of faith? | answer | 0.441 | لا |
| ws-create-en Why did God create human beings? | answer | 0.581 | لا |
| ws-islam-ur اسلام کیا ہے؟ | answer | 0.536 | لا |
| ws-pillars-ur اسلام کے ارکان کیا ہیں؟ | answer | 0.495 | لا |
| ws-iman-ur ایمان کے ارکان کیا ہیں؟ | answer | 0.504 | لا |
| ws-create-ur اللہ نے انسان کو کیوں پیدا کیا؟ | answer | 0.596 | لا |
| ws-islam-id Apa itu Islam? | answer | 0.540 | لا |
| ws-pillars-id Apa saja rukun Islam? | answer | 0.465 | لا |
| ws-iman-id Apa saja rukun iman? | answer | 0.474 | لا |
| ws-create-id Mengapa Allah menciptakan manusia? | answer | 0.595 | لا |
| ws-islam-ms Apakah itu Islam? | answer | 0.545 | لا |
| ws-pillars-ms Apakah rukun Islam? | answer | 0.441 | لا |
| ws-iman-ms Apakah rukun iman? | answer | 0.459 | لا |
| ws-create-ms Mengapa Allah mencipta manusia? | answer | 0.596 | لا |
| ws-islam-tr İslam nedir? | answer | 0.525 | لا |
| ws-pillars-tr İslam’ın şartları nelerdir? | answer | 0.513 | لا |
| ws-iman-tr İmanın şartları nelerdir? | answer | 0.530 | لا |
| ws-create-tr Allah insanı neden yarattı? | answer | 0.593 | لا |
| ws-islam-fr Qu’est-ce que l’islam ? | answer | 0.515 | لا |
| ws-pillars-fr Quels sont les piliers de l’islam ? | answer | 0.476 | لا |
| ws-iman-fr Quels sont les piliers de la foi ? | answer | 0.476 | لا |
| ws-create-fr Pourquoi Dieu a-t-il créé l’être humain ? | answer | 0.587 | لا |
| ws-islam-es ¿Qué es el islam? | answer | 0.521 | لا |
| ws-pillars-es ¿Cuáles son los pilares del islam? | answer | 0.492 | لا |
| ws-iman-es ¿Cuáles son los pilares de la fe? | answer | 0.454 | لا |
| ws-create-es ¿Por qué creó Dios al ser humano? | answer | 0.577 | لا |
| ws-islam-bn ইসলাম কী? | answer | 0.524 | لا |
| ws-pillars-bn ইসলামের স্তম্ভগুলো কী কী? | answer | 0.485 | لا |
| ws-iman-bn ঈমানের স্তম্ভগুলো কী কী? | answer | 0.506 | لا |
| ws-create-bn আল্লাহ মানুষকে কেন সৃষ্টি করেছেন? | answer | 0.601 | لا |
| ws-islam-hi इस्लाम क्या है? | answer | 0.521 | لا |
| ws-pillars-hi इस्लाम के स्तंभ क्या हैं? | answer | 0.485 | لا |
| ws-iman-hi ईमान के स्तंभ क्या हैं? | answer | 0.464 | لا |
| ws-create-hi अल्लाह ने इंसान को क्यों बनाया? | answer | 0.585 | لا |
| wp-islam-fr Qu'est-ce que l'islam ? | answer | 0.518 | لا |
| wp-allah-ar من هو الله؟ | answer | 0.565 | لا |
| wp-allah-en Who is Allah? | answer | 0.563 | لا |
| wp-allah-ur اللہ کون ہے؟ | answer | 0.545 | لا |
| wp-allah-id Siapakah Allah? | answer | 0.563 | لا |
| wp-allah-ms Siapakah Allah? | answer | 0.563 | لا |
| wp-allah-tr Allah kimdir? | answer | 0.556 | لا |
| wp-allah-fr Qui est Allah ? | answer | 0.565 | لا |
| wp-allah-es ¿Quién es Allah? | answer | 0.550 | لا |
| wp-allah-bn আল্লাহ কে? | answer | 0.561 | لا |
| wp-allah-hi अल्लाह कौन है? | answer | 0.548 | لا |
| wp-iman-en What are the pillars of faith (iman)? | answer | 0.471 | لا |
| wp-iman-fr Quels sont les piliers de la foi (iman) ? | answer | 0.504 | لا |
| wp-iman-es ¿Cuáles son los pilares de la fe (imán)? | answer | 0.501 | لا |
| wp-iman-bn ঈমানের রুকনগুলো কী কী? | answer | 0.490 | لا |
| wp-pillars-ar ما أركان الإسلام؟ | answer | 0.526 | لا |
| wp-pillars-tr İslam'ın şartları nelerdir? | answer | 0.513 | لا |
| wp-pillars-fr Quels sont les piliers de l'islam ? | answer | 0.476 | لا |
| wp-pillars-bn ইসলামের রুকনগুলো কী কী? | answer | 0.433 | لا |
| wp-shahada-ar ما معنى الشهادتين: لا إله إلا الله، محمد رسول الله؟ | answer | 0.508 | لا |
| wp-shahada-en What does the Shahadah mean: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.458 | لا |
| wp-shahada-ur شہادتین «لا إله إلا الله، محمد رسول الله» کا کیا مطلب ہے؟ | answer | 0.520 | لا |
| wp-shahada-id Apa makna dua kalimat syahadat: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.481 | لا |
| wp-shahada-ms Apakah makna dua kalimah syahadah: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.483 | لا |
| wp-shahada-tr Kelime-i şehadetin anlamı nedir: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.467 | لا |
| wp-shahada-fr Que signifie la shahada : lā ilāha illā Allāh, Muhammadun rasūl Allāh ? | answer | 0.502 | لا |
| wp-shahada-es ¿Qué significa la shahada: lā ilāha illā Allāh, Muhammadun rasūl Allāh? | answer | 0.496 | لا |
| wp-shahada-bn শাহাদাহ «লা ইলাহা ইল্লাল্লাহ, মুহাম্মাদুর রাসূলুল্লাহ»-এর অর্থ কী? | answer | 0.443 | لا |
| wp-shahada-hi शहादा «ला इलाहा इल्लल्लाह, मुहम्मदुर रसूलुल्लाह» का क्या अर्थ है? | answer | 0.459 | لا |
| wp-salah-ar لماذا يصلي المسلمون؟ | answer | 0.522 | لا |
| wp-salah-en Why do Muslims pray (salah)? | answer | 0.503 | لا |
| wp-salah-ur مسلمان نماز کیوں پڑھتے ہیں؟ | answer | 0.555 | لا |
| wp-salah-id Mengapa umat Islam salat? | answer | 0.536 | لا |
| wp-salah-ms Mengapa orang Islam bersolat? | answer | 0.502 | لا |
| wp-salah-tr Müslümanlar neden namaz kılar? | answer | 0.530 | لا |
| wp-salah-fr Pourquoi les musulmans prient-ils ? | answer | 0.526 | لا |
| wp-salah-es ¿Por qué rezan los musulmanes? | answer | 0.508 | لا |
| wp-salah-bn মুসলিমরা কেন নামাজ পড়ে? | answer | 0.535 | لا |
| wp-salah-hi मुसलमान नमाज़ क्यों पढ़ते हैं? | answer | 0.506 | لا |
| wp-taharah-ar كيف يتطهر المسلم للصلاة؟ | answer | 0.527 | لا |
| wp-taharah-en How does a Muslim purify for prayer? | answer | 0.498 | لا |
| wp-taharah-ur مسلمان نماز کے لیے طہارت کیسے حاصل کرتا ہے؟ | answer | 0.505 | لا |
| wp-taharah-id Bagaimana seorang Muslim bersuci untuk salat? | answer | 0.501 | لا |
| wp-taharah-ms Bagaimanakah seorang Muslim bersuci untuk solat? | answer | 0.513 | لا |
| wp-taharah-tr Bir Müslüman namaz için nasıl temizlenir? | answer | 0.513 | لا |
| wp-taharah-fr Comment un musulman se purifie-t-il pour la prière ? | answer | 0.508 | لا |
| wp-taharah-es ¿Cómo se purifica un musulmán para la oración? | answer | 0.516 | لا |
| wp-taharah-bn একজন মুসলিম নামাজের জন্য কীভাবে পবিত্র হয়? | answer | 0.497 | لا |
| wp-taharah-hi एक मुसलमान नमाज़ के लिए पाकी कैसे हासिल करता है? | answer | 0.468 | لا |
| wp-sawm-ar لماذا يصوم المسلمون في رمضان؟ | answer | 0.543 | لا |
| wp-sawm-en Why do Muslims fast in Ramadan? | answer | 0.483 | لا |
| wp-sawm-ur مسلمان رمضان میں روزہ کیوں رکھتے ہیں؟ | answer | 0.488 | لا |
| wp-sawm-id Mengapa umat Islam berpuasa di bulan Ramadan? | answer | 0.496 | لا |
| wp-sawm-ms Mengapa orang Islam berpuasa pada bulan Ramadan? | answer | 0.457 | لا |
| wp-sawm-tr Müslümanlar Ramazan'da neden oruç tutar? | answer | 0.478 | لا |
| wp-sawm-fr Pourquoi les musulmans jeûnent-ils pendant le Ramadan ? | answer | 0.487 | لا |
| wp-sawm-es ¿Por qué ayunan los musulmanes en Ramadán? | answer | 0.467 | لا |
| wp-sawm-bn মুসলিমরা রমজানে কেন রোজা রাখে? | answer | 0.461 | لا |
| wp-sawm-hi मुसलमान रमज़ान में रोज़ा क्यों रखते हैं? | answer | 0.451 | لا |
| wp-zakah-ar ما هي الزكاة ولمن تُعطى؟ | answer | 0.582 | لا |
| wp-zakah-en What is zakah and who receives it? | answer | 0.552 | لا |
| wp-zakah-ur زکوٰۃ کیا ہے اور کسے دی جاتی ہے؟ | answer | 0.581 | لا |
| wp-zakah-id Apa itu zakat dan kepada siapa diberikan? | answer | 0.564 | لا |
| wp-zakah-ms Apakah itu zakat dan kepada siapa ia diberikan? | answer | 0.562 | لا |
| wp-zakah-tr Zekât nedir ve kime verilir? | answer | 0.548 | لا |
| wp-zakah-fr Qu'est-ce que la zakat et à qui est-elle donnée ? | answer | 0.564 | لا |
| wp-zakah-es ¿Qué es el zakat y a quién se da? | answer | 0.534 | لا |
| wp-zakah-bn যাকাত কী এবং কাকে দেওয়া হয়? | answer | 0.496 | لا |
| wp-zakah-hi ज़कात क्या है और किसे दी जाती है? | answer | 0.533 | لا |
| wp-hajj-ar ما هو الحج وعلى من يجب؟ | answer | 0.588 | لا |
| wp-hajj-en What is Hajj and who must perform it? | answer | 0.475 | لا |
| wp-hajj-ur حج کیا ہے اور کس پر فرض ہے؟ | answer | 0.578 | لا |
| wp-hajj-id Apa itu haji dan siapa yang wajib melaksanakannya? | answer | 0.512 | لا |
| wp-hajj-ms Apakah itu haji dan siapa yang wajib menunaikannya? | answer | 0.501 | لا |
| wp-hajj-tr Hac nedir ve kimlere farzdır? | answer | 0.511 | لا |
| wp-hajj-fr Qu'est-ce que le hajj et qui doit l'accomplir ? | answer | 0.489 | لا |
| wp-hajj-es ¿Qué es el hach y quién debe realizarlo? | answer | 0.370 | نعم |
| wp-hajj-bn হজ কী এবং কার উপর ফরজ? | answer | 0.489 | لا |
| wp-hajj-hi हज क्या है और किस पर फ़र्ज़ है? | answer | 0.492 | لا |

قراءات D1 لهذا التشغيل (مجموع `rows_read`): 61286
