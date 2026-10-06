# نص الفيديو التعريفي (دقيقتان) — Demo Video Script (2 minutes)

**التسجيل:**
- جوال بمقاس 390×844 أو متصفح بهذا المقاس، من الرابط الحي https://i-muslim.alkhammashtalal.workers.dev
- الواجهة العربية والمظهر الفاتح، إلا المشهد 6 بالإنجليزية.
- صوت هادئ بلا موسيقى صاخبة، وحركة الشاشة بطيئة (القسم 11).

**قبل التسجيل:** سجّل المشهدين 2 و8 بعد تشغيل النموذج الحي (`LLM_MODE=live`). في الوضع التجريبي تظهر في بطاقة الإجابة جملة «وضع المحاكاة»، ولا تصلح للعرض.

**القاعدة:** لا أرقام في الكلام إلا ما هو ظاهر في التطبيق. لا ذكر للحديث النبوي، فهو لم يُجلب بعد.

**التسجيل الآلي بأمر واحد:** `node scripts/video/record-demo.mjs`
- **المخرج:** `out/demo.mp4`، خارج المستودع.
- **التسجيل:** يسجّل المشاهد التسعة من هذا الملف بترتيبها ومددها (بعد تحجيمها لتتسع لبطاقتي الافتتاح والختام). ونص كل مشهد مكتوب على الشاشة بخط التطبيق.
- **المدة:** يفشل إن زادت على 1:58.
- **يحتاج:** Google Chrome وffmpeg.
- **خيارات:** `--base` لرابط آخر، و`--voiceover ملف.m4a` لتعليق صوتي يسجّله إنسان.
- **متى:** بعد تشغيل النموذج الحي (المشهدان 2 و8).

| # | المشهد | المدة | من–إلى |
| --- | --- | --- | --- |
| 1 | المشكلة | 12 ث | 0:00–0:12 |
| 2 | سؤال مجاب: الوضوء | 20 ث | 0:12–0:32 |
| 3 | إحالة فتوى | 12 ث | 0:32–0:44 |
| 4 | اعتذار صادق | 10 ث | 0:44–0:54 |
| 5 | المصحف ولمس آية وتلاوتها | 20 ث | 0:54–1:14 |
| 6 | «اشرح لي بلغتي» بالإنجليزية | 14 ث | 1:14–1:28 |
| 7 | مسار المسلم الجديد | 12 ث | 1:28–1:40 |
| 8 | «كيف وُجدت هذه الإجابة؟» | 12 ث | 1:40–1:52 |
| 9 | الخاتمة | 8 ث | 1:52–2:00 |

---

## 1. المشكلة — 12 ثانية

**على الشاشة:** صفحة البداية: الشمسة المذهّبة وسطر «اسأل عن الإسلام وأركانه وعباداته»، ثم الأسئلة المقترحة.

**النص:** «من يسأل عن الإسلام على الإنترنت قد يجد إجابة بلا مرجع، أو نصًّا لا يُعرف مصدره. تطبيق ‹مسلم› يجيب من نصوص ثابتة معتمدة فقط، ويعرضها كما هي.»

**EN:** "Someone asking about Islam online may find an answer with no reference, or a text of unknown origin. The Muslim app answers only from fixed, approved texts, and shows them exactly as they are."

## 2. سؤال مجاب: الوضوء — 20 ثانية

**على الشاشة:**
- كتابة «كيف أتوضأ؟» ثم الإرسال.
- بطاقة الإجابة: آية المائدة 6 في إطار المصحف بخط النسخ، وتحتها «المائدة: ٦» مع «المصدر الأصلي ↗» وشارة «مطابق للمصدر».
- ثم التفسير الميسر للآية، ثم الشرح الموسوم «شرح مولّد من النصوص أعلاه».
- لقطة قريبة على الشارة والمرجع.

**النص:** «نسأل: كيف أتوضأ؟ فيعرض آية المائدة بحروفها من قاعدة البيانات، مع مرجعها ورابط صفحتها في مشروع آيات بجامعة الملك سعود، ثم التفسير الميسر لها. شارة ‹مطابق للمصدر› لا تظهر إلا بعد مطابقة النص حرفًا بحرف. والذكاء الاصطناعي يرتّب النصوص ويشرح منها فقط، ولا يكتب نصًّا شرعيًّا.»

**EN:** "We ask: how do I perform wudu? It shows the verse of al-Ma'idah letter for letter from the database, with its reference and a link to its page in King Saud University's Ayat project, then al-Tafsir al-Muyassar. The 'matches source' badge appears only after the text is compared character by character. The AI only orders the texts and explains from them; it never writes religious text."

## 3. إحالة فتوى — 12 ثانية

**على الشاشة:** كتابة «هل يجوز لي أن أفطر في رمضان لأني مريض بالسكري؟». تظهر بطاقة «هذا السؤال يحتاج فتوى من جهة مختصة» مع زر «الرئاسة العامة للبحوث العلمية والإفتاء».

**النص:** «أما سؤال الحالة الشخصية فلا يجيب عنه، ويحيل بأدب إلى الرئاسة العامة للبحوث العلمية والإفتاء. وهذه البوابة تعمل قبل أي نموذج لغوي.»

**EN:** "A question about a personal case is not answered; it is politely referred to the General Presidency of Scholarly Research and Ifta. This gate runs before any language model."

## 4. اعتذار صادق — 10 ثوانٍ

**على الشاشة:** كتابة «من فاز بكأس العالم؟». تظهر بطاقة «لم أجد نصًا في المصادر المعتمدة يطابق سؤالك، ولا أُنشئ نصوصًا من عندي.»

**النص:** «وإن لم يجد نصًّا معتمدًا، اعتذر بصدق، ولا يخترع إجابة.»

**EN:** "If there is no approved text, it says so honestly, and does not invent an answer."

## 5. المصحف ولمس آية وتلاوتها — 20 ثانية

**على الشاشة:**
- مفتاح «المكتبة»، ثم فهرس السور بنجمة ثمانية لكل رقم، ثم «البقرة».
- صفحة السورة بخرطوشة مذهّبة والبسملة.
- التمرير إلى آية الكرسي ولمسها، فتُظلَّل وتفتح لوحتها.
- في اللوحة: الآية في الإطار، ثم «التفسير الميسر»، ثم «تفسير السعدي».
- العودة إلى الآية، ولمس «استمع للآية» على قدم الإطار مع السطر الأخير: يضيء الإطار وتُتلى الآية ثانيتين، ثم «إيقاف». (الفيديو المسجّل آليًا بلا صوت: الإطار المضيء والسطر يدلان على التلاوة.)

**النص:** «وفي المكتبة يُقرأ القرآن الكريم بخط النسخ. لمس أي آية يفتح تفسيرها الميسر وتفسير السعدي ومعناها بالإنجليزية، كلها من مصادرها ومعها روابطها، وتُقرأ ما فُتح منها بلا إنترنت. تلاوة بشرية مسجّلة، والآية تضيء وهي تُتلى.»

**EN:** "In the Library, the Quran is read in naskh script. Tapping any verse opens al-Muyassar, al-Saʿdi and its English meaning, all from their sources with their links, and what you opened stays readable offline. A recorded human recitation, with the verse lit as it is recited."

## 6. «اشرح لي بلغتي» بالإنجليزية — 14 ثانية

**على الشاشة:**
- تغيير اللغة إلى English، ثم فتح البقرة: 255.
- يظهر «Meaning in English» بوسم «Sahih International» تحت الآية مباشرة.
- لمس «Explain in my language»، فيظهر صندوق «Simple machine explanation of al-Tafsir al-Muyassar» بوسم «Machine translation»، وتحته «Source: al-Tafsir al-Muyassar ↗».

**النص:** «ولغير العربية زر ‹اشرح لي بلغتي›: شرح مبسّط من التفسير الميسر وحده، موسوم ‹ترجمة آلية›. أما الآية نفسها فلا تُترجم آليًّا أبدًا؛ معناها بالإنجليزية من ترجمة صحيح إنترناشونال.»

**EN:** "For other languages there is 'Explain in my language': a simple explanation of al-Tafsir al-Muyassar only, labelled 'machine translation'. The verse itself is never machine-translated; its English meaning is Sahih International."

## 7. مسار المسلم الجديد — 14 ثانية

**على الشاشة:**
- العودة إلى العربية وصفحة البداية، ثم بطاقة «جديد على الإسلام؟ ابدأ من هنا».
- لوحة «مسار البداية» بخطواتها العشر.
- لمس «أركان الإيمان»، فيُرسل السؤال إلى المحادثة.

**النص:** «ومن كان جديدًا على الإسلام يجد مسارًا من عشر خطوات: ما الإسلام، ومن هو الله، وأركان الإيمان والإسلام، والعبادات. كل خطوة سؤال يمر بالقواعد نفسها، وتقدّمه يبقى على جهازه.»

**EN:** "Someone new to Islam finds a ten-step path: what Islam is, who Allah is, the pillars of faith and of Islam, and the acts of worship. Each step is a question that goes through the same rules, and progress stays on their device."

## 8. «كيف وُجدت هذه الإجابة؟» — 12 ثانية

**على الشاشة:** في بطاقة إجابة، لمس «كيف وُجدت هذه الإجابة؟». تظهر اللوحة بالمقاطع التي فُحصت ومراجعها، وعلى بعضها «استُعمل في الإجابة»، ثم السطور الثلاثة.

**النص:** «وتحت كل إجابة: كيف وُجدت؟ المقاطع التي فُحصت، وأيّها استُعمل، وأن الشرح مولّد منها وحدها، وكل جملة فيه بشاهدها.»

**EN:** "Under every answer: how was it found? The passages examined, which were used, and that the explanation was generated from them alone, each sentence with its citation."

## 9. الخاتمة — 10 ثوانٍ

**على الشاشة:** لوحة «المصادر» («من أين تأتي الإجابات؟»)، ثم صفحة البداية.

**النص:** «تطبيق ‹مسلم› مساعد معرفي مقيّد بالمصادر، وليس مفتيًا. القرآن وتفسيراه من جامعة الملك سعود، وكتب العقيدة من المكتبة الشاملة، والفتوى عند أهلها.»

**EN:** "The Muslim app is a source-bound knowledge assistant, not a mufti. The Quran and its tafsirs come from King Saud University, the creed books from al-Maktaba al-Shamila, and fatwas are left to those qualified to give them."
