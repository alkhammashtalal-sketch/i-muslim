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

## حدود المقارنة
- **جولة واحدة لكل أداة.** ChatGPT قد يجيب غير ذلك في جولة أخرى، والنتيجة تصف هذه الجولة وحدها.
- **لا تحكم في إعدادات ChatGPT:** النموذج الذي يختاره التطبيق، والحرارة، والبحث في الويب إن كان مفعّلًا، كلها كما هي.
- **الحديث غير مجلوب في مصادرنا،** فمراجع الحديث تُعدّ ولا يُحكم على صحتها.
- **الاقتباسات بين `{…}` لا يفحصها الكاشف الآن:** يفحص «…» و﴿…﴾ و"…" فقط. وأي آية مقتبسة بلا مرجع يليها مباشرة لا يُحكم عليها، تجنبًا للتخمين.

## الخصوصية
الأسئلة حالات اختبار من الحزمة العلمية للمنظّمين، لا بيانات مستخدمين.

---

**English:** Answers of another tool (ChatGPT) to the twelve official cases, for the comparison the organisers advised. They are collected by a team member in the ChatGPT app, in a temporary chat, with one question per message, verbatim from `eval/official12.v1.jsonl`. There is one round and the answers are copied by hand with no edit. The file records the time, the model as shown and the plan. There is no automated access to ChatGPT. Scored by `eval/compare-tool.mjs` with the same checks as `compare-general.mjs`. Limits: one round, no control over ChatGPT's settings, hadith references counted but not checked, and quotes in `{…}` not yet checked.
