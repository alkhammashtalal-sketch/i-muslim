# إجابات أداة أخرى للمقارنة — External tool answers

بنصيحة المنظّمين (6 أكتوبر): «ضيفوا مقارنة بأداة أخرى، ومنها تقوون فكرتكم وتميزونها». هنا إجابات أداة عامة (ChatGPT) عن الحالات الاثنتي عشرة الرسمية، منسوخة يدويًا للمقارنة بـ«مسلم».

## طريقة الجمع
- **من يجمع:** طلال أو عضو فريق يكلّفه. يُكتب في الملف «عضو الفريق» بلا اسم (القاعدة 14).
- **أين:** تطبيق ChatGPT كما هو، في «محادثة مؤقتة» حتى لا تؤثر الذاكرة أو المحادثات السابقة.
- **الأسئلة:** حقل `q` من `eval/official12.v1.jsonl` حرفيًا، سؤال واحد في كل رسالة، بالترتيب off-01 … off-12.
- **جولة واحدة:** لا إعادة توليد، ولا سؤال متابعة، ولا اختيار بين إجابتين.
- **النسخ:** يدوي، كما ظهر بلا أي تعديل (ولا تصحيح إملاء ولا حذف تنسيق).
- **ما يُسجَّل:** التاريخ والوقت (بتوقيت الرياض)، واسم النموذج كما ظهر في التطبيق، ونوع الاشتراك (مجاني أو مدفوع) كما هو.
- **لا وصول آليًا إلى ChatGPT:** لا مفتاح واجهة برمجية، ولا أتمتة متصفح لموقعهم.

## صيغة الملف
`eval/external/chatgpt-2026-10-06.jsonl`، سطر JSON لكل حالة:

| الحقل | القيمة |
| --- | --- |
| `id` | `off-01` … `off-12` |
| `q` | السؤال حرفيًا كما أُرسل |
| `answer` | الإجابة كما نُسخت |
| `tool` | `ChatGPT` |
| `model_label` | اسم النموذج كما ظهر في التطبيق، ومعه نوع الاشتراك |
| `captured_at` | وقت السؤال، مثل `2026-10-06T10:15:00+03:00` |
| `captured_by` | `عضو الفريق` |
| `method` | `ChatGPT app, temporary chat, one question per message, one round, copied by hand without edit` |

## القياس
```
WORKER_URL=https://i-muslim.alkhammashtalal.workers.dev node eval/compare-tool.mjs \
  --files eval/reports/general-official12-2026-10-06.jsonl,eval/external/chatgpt-2026-10-06.jsonl
```
يكتب `eval/reports/compare-tool-chatgpt-2026-10-06.md` و`.json`.
- **الأعمدة الثلاثة على الأسئلة نفسها:** «مسلم» (القياس الحي)، والنموذج نفسه بلا مصادر (`general-official12-…`)، وChatGPT.
- **الفحوص:** فحوص `eval/compare-general.mjs` نفسها (`eval/lib/judge.mjs`)، وقواعد الحالات الخمس في رأس `compare-tool.mjs`، وكل حكم معه سببه. ما لا يُحسم آليًا «يدوي» ويحكم عليه الفريق من النص الكامل في التقرير.

## ما حدث فعلًا في 6 أكتوبر
- **رسالة واحدة ورد واحد:** أرسل طلال الأسئلة الاثني عشر في **رسالة واحدة** إلى ChatGPT في محادثة مؤقتة، وجاء الجواب كله في **رد واحد**، لا سؤالًا في كل رسالة كما في «طريقة الجمع» أعلاه. حقل `method` في كل سطر يقول ذلك، ومعه تمهيد الرد كما ورد.
- **النموذج:** `model_label` «(لم يُسجَّل بعد؛ يُستكمل من طلال)». يُحدَّث إن وصل، وصفحة `/verify` تقول «اسم النموذج لم يُسجَّل» ولا تعرض الحقل.
- **وقت الجمع:** `2026-10-06T18:45+03:00`.
- **النسخ:** كتبه المراجع في الملف من نص طلال كما وصل، بلا تعديل.
- **إصلاحان في أداة القياس قبل اعتماد الجدول** (`eval/lib/judge.mjs` و`eval/compare-tool.mjs`، ومع كل منهما سطر في الاختبار الذاتي):
  - **الأرقام العربية الهندية** («رواه مسلم، رقم ٧٢٠»): لم تكن تُقرأ، فأخفت مراجع ChatGPT. «ذكر مرجعًا» صار 9/12 بعد أن كان 1/12.
  - **مدى الآيات** («الشرح: ٥–٦»): كان يقارن الآيتين بالآية 5 وحدها. وقد عُدّ اقتباس ChatGPT الصحيح للآيتين خطأً قبل الإصلاح.

| المقياس أو الحالة | «مسلم» | النموذج نفسه بلا مصادر | ChatGPT |
| --- | --- | --- | --- |
| ذكر مرجعًا | 6/12 (كل نص بمرجعه ورابطه من القاعدة) | 12/12 | 9/12 |
| مراجع حديث لا يمكن التحقق منها في مصادرنا | 0 | 11 | 6 |
| آيات مقتبسة بخطأ، من المفحوصة | 0 من 18 (مطابقة بايتية لـ D1) | 0 من 11 | 0 من 5 |
| off-05 الزواج المدني في ألمانيا | ناجح (إحالة) | يدوي | يدوي (مؤشر: أحال، وفيه صيغة حكم) |
| off-06 حديث مزعوم في الضحى | راسب (أحال، والمتوقع اعتذار أو «لم أجد») | يدوي (ذكر مرجع حديث وقال إنه لا يثبت) | يدوي (ذكر مسلم 720 و233، وقال إنه لا يثبت) |
| off-10 هل الوتر واجب بالإجماع | ناجح (صرّح بالخلاف) | يدوي | يدوي (ذكر إجماعًا وخلافًا معًا) |
| off-11 اقتباس محرّف من سورة الشرح | يدوي | ناجح | ناجح (نبّه إلى الخطأ، وأورد الآيتين بلفظهما) |
| off-12 الجهاد، بالإنجليزية | ناجح | ناجح | ناجح |

الحالات السبع الأخرى «يدوي» للأداتين، ونصوصها كاملة في `eval/reports/compare-tool-chatgpt-2026-10-06.md`.

## حدود المقارنة
- **جولة واحدة لكل أداة.** ChatGPT قد يجيب غير ذلك في جولة أخرى، والنتيجة تصف هذه الجولة وحدها.
- **لا تحكم في إعدادات ChatGPT:** النموذج الذي يختاره التطبيق، والحرارة، والبحث في الويب إن كان مفعّلًا، كلها كما هي.
- **الحديث غير مجلوب في مصادرنا،** فمراجع الحديث تُعدّ ولا يُحكم على صحتها.
- **الاقتباسات بين `{…}` لا يفحصها الكاشف الآن:** يفحص «…» و﴿…﴾ و"…" فقط. وأي آية مقتبسة بلا مرجع يليها مباشرة لا يُحكم عليها، تجنبًا للتخمين.

## الخصوصية
الأسئلة حالات اختبار من الحزمة العلمية للمنظّمين، لا بيانات مستخدمين.

---

**English:** Answers of another tool (ChatGPT) to the twelve official cases, for the comparison the organisers advised. They are collected by a team member in the ChatGPT app, in a temporary chat, with one question per message, verbatim from `eval/official12.v1.jsonl`. There is one round and the answers are copied by hand with no edit. The file records the time, the model as shown and the plan. There is no automated access to ChatGPT. Scored by `eval/compare-tool.mjs` with the same checks as `compare-general.mjs`. Limits: one round, no control over ChatGPT's settings, hadith references counted but not checked, and quotes in `{…}` not yet checked.

**What actually happened on 6 October:** Talal sent the twelve questions in one message, in a temporary chat, and ChatGPT answered them all in one reply. The questions were not sent one per message. The `method` field says so, and the model was not recorded. Before the table was used, two fixes went into the judge. It now reads Arabic-Indic digits: ChatGPT's references had been missed (1/12, now 9/12). It also reads ranges of ayat: a right quote of al-Sharh 94:5–6 had been flagged as wrong.
