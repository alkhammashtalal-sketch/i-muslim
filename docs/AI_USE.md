# الإفصاح عن استخدام الذكاء الاصطناعي — AI Use Disclosure

## في التطوير

| الأداة | الاستخدام |
| --- | --- |
| Claude (Anthropic) | إعداد الخطة والأوامر ومراجعة الوثائق |
| Claude Code (Anthropic) | كتابة الكود والإعدادات والوثائق وتنفيذ الأوامر في `commands/`، بإشراف طلال الخماش |

كل الأوامر التي نُفّذ بها المشروع محفوظة في `commands/` للشفافية.

## في التشغيل

| الأداة | الاستخدام | ما لا تفعله |
| --- | --- | --- |
| `@cf/baai/bge-m3` عبر Cloudflare Workers AI | تضمين المقاطع وسؤال المستخدم للبحث الدلالي | لا تُنشئ نصًا |
| DeepSeek (واجهة متوافقة مع OpenAI) | استدعاء واحد لكل إجابة جديدة: ترتيب 3–5 مقاطع مسترجعة، والحكم هل تجيب السؤال، وتحديد المستوى، وكتابة شرح مبسّط منها وحدها مع شواهده | لا يكتب نصًا شرعيًا ولا يعدّله، ولا يجيب من معرفته؛ النص المعروض يأتي من قاعدة البيانات برقمه |

الشرح المولّد يوسم في الواجهة «شرح مولّد من النصوص أعلاه»، والترجمة الآلية توسم «ترجمة آلية».

**حالة التشغيل (5 أكتوبر 2026):** DeepSeek في وضع المحاكاة (`LLM_MODE=mock`) إلى أن يضع طلال مفتاحه؛ في هذا الوضع جملة الشرح ثابتة وموسومة «وضع المحاكاة»، والمقاطع أول ما يعيده الاسترجاع.

## ما راجعه البشر

- **طلال الخماش** (صاحب القرار): الخطة، والأوامر، وقائمة المصادر الثابتة، ومراجعة مخرجات كل أمر.
- **سالم الخديدي** (المراجع الشرعي): أسئلة الاختبار ومستوياتها، والتحقق اليدوي من أحكام الأحاديث، والأسئلة الشائعة التي تحمل شارة «معتمد من المراجع الشرعي» (بالاسم والتاريخ).

---

**English summary:** Development used Claude and Claude Code under human supervision (prompts in `commands/`). At runtime, bge-m3 (Workers AI) produces embeddings and DeepSeek makes one call per new answer to rank retrieved passages and write a cited explanation; it never writes or edits religious text, which is always shown verbatim from the database. Humans reviewed the plan, sources, test questions and any "reviewer-approved" content.
