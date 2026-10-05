# الإفصاح عن استخدام الذكاء الاصطناعي — AI Use Disclosure

## في التطوير

| الأداة | الاستخدام |
| --- | --- |
| Claude (Anthropic) | إعداد الخطة والأوامر ومراجعة الوثائق |
| Claude Code (Anthropic) | كتابة الكود والإعدادات والوثائق وتنفيذ الأوامر في `commands/`، بإشراف طلال الخماش |
| Claude Code (Anthropic) | الترجمة الآلية لنصوص الواجهة ومسار البداية إلى الثماني لغات غير العربية والإنجليزية؛ وهي موسومة «ترجمة آلية» في الواجهة |
| Claude (Anthropic) | مراجعة تقارير نافذتي التنفيذ والرد عليها نيابةً عن طلال ضمن حدود `CLAUDE.md` (مجلد التنسيق `relay/` محلي لا يُلتزم)؛ وما يمنعه القسم 9 لا يأتي إلا من طلال |

كل الأوامر التي نُفّذ بها المشروع محفوظة في `commands/` للشفافية.

## في التشغيل

| الأداة | الاستخدام | ما لا تفعله |
| --- | --- | --- |
| `@cf/baai/bge-m3` عبر Cloudflare Workers AI | تضمين المقاطع وسؤال المستخدم للبحث الدلالي | لا تُنشئ نصًا |
| DeepSeek (واجهة متوافقة مع OpenAI) | استدعاء واحد لكل إجابة جديدة: ترتيب 3–5 مقاطع مسترجعة، والحكم هل تجيب السؤال، وتحديد المستوى، وكتابة شرح مبسّط منها وحدها مع شواهده | لا يكتب نصًا شرعيًا ولا يعدّله، ولا يجيب من معرفته؛ النص المعروض يأتي من قاعدة البيانات برقمه |

| DeepSeek — «اشرح لي بلغتي» | في قارئ القرآن لغير العربية: استدعاء واحد لكل (آية، لغة) يشرح التفسير الميسر وحده بلغة القارئ، ويُحفظ الناتج | لا يُرسل إليه نص الآية ولا ترجمتها، ولا يترجم الآية؛ يُرفض مخرجه إن نسخ من الآية أو تجاوز الطول |

الشرح المولّد يوسم في الواجهة «شرح مولّد من النصوص أعلاه»، والترجمة الآلية توسم «ترجمة آلية». وشرح «اشرح لي بلغتي» يوسم «شرح آلي مبسّط من التفسير الميسر» و«ترجمة آلية».

**حالة التشغيل (5 أكتوبر 2026):** DeepSeek في وضع المحاكاة (`LLM_MODE=mock`) إلى أن يضع طلال مفتاحه؛ في هذا الوضع جملة الشرح ثابتة وموسومة «وضع المحاكاة»، والمقاطع أول ما يعيده الاسترجاع.

## ما راجعه البشر

- **طلال الخماش** (صاحب القرار): الخطة، والأوامر، وقائمة المصادر الثابتة، ومراجعة مخرجات كل أمر.
- **سالم الخديدي** (المراجع الشرعي): أسئلة الاختبار ومستوياتها، والتحقق اليدوي من أحكام الأحاديث، والأسئلة الشائعة التي تحمل شارة «معتمد من المراجع الشرعي» (بالاسم والتاريخ).

---

**English summary:** Development used Claude and Claude Code under human supervision (prompts in `commands/`); Claude Code also machine-translated the interface strings into the eight languages labelled "machine translation", and a Claude session reviewed the two build windows' reports on Talal's behalf within `CLAUDE.md`. At runtime, bge-m3 (Workers AI) produces embeddings and DeepSeek makes one call per new answer to rank retrieved passages and write a cited explanation, and one call per (ayah, language) for "Explain in my language", which receives al-Muyassar only; it never writes or edits religious text, which is always shown verbatim from the database. Humans reviewed the plan, sources, test questions and any "reviewer-approved" content.
