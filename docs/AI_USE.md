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
| DeepSeek V4 Flash (`@cf/deepseek-ai/deepseek-v4-flash-0731`) مستضافًا على Cloudflare Workers AI، بلا حساب DeepSeek ولا مفتاح (الأمر 15) | استدعاء واحد لكل إجابة جديدة: اختيار المقاطع التي تجيب السؤال من 3–5 مقاطع مسترجعة، والحكم هل تجيبه، وتحديد المستوى. في الوضع الافتراضي `on_demand` لا يكتب نصًا معروضًا (القاعدة 12)؛ وفي الوضعين الآخرين يكتب شرحًا مبسّطًا منها وحدها مع شواهده. الحرارة 0، ومخرج JSON، والاستدلال مطفأ (`docs/DECISIONS.md`) | لا يكتب نصًا شرعيًا ولا يعدّله، ولا يجيب من معرفته؛ النص المعروض يأتي من قاعدة البيانات برقمه |
| DeepSeek V4 Flash (Workers AI) — «اشرح لي بلغتي» (ترجمة مراجَعة، الأمر 21) | **مسبقًا لا في التشغيل:** ترجمة التفسير الميسر جملةً بجملة إلى اللغات التسع غير العربية لـ 45 آية مختارة (`eval/explain-set.v1.json`)، على معاينة. ثم حكم عليها مراجعون مستقلون (نماذج Claude غير المولّد)، ونُشر الناجح ملفات ثابتة (`web/public/explain/`). و«بسّط لي» (الشرح الحر) **موقوف منذ 6 أكتوبر 16:00** (القرار 103) | لا يُستدعى من التطبيق؛ لا يترجم الآية ولا يشرح من عنده؛ والترجمة موسومة «ترجمة آلية للتفسير الميسر · اجتازت مراجعة مستقلة»، ولا تدّعي مراجعة بشرية |
| `@cf/openai/whisper-large-v3-turbo` عبر Cloudflare Workers AI | «اسأل بصوتك»: يحوّل تسجيل السؤال (حتى 30 ثانية) إلى نص في حقل السؤال، والمستخدم يراجعه ويرسله | لا يقرأ ولا يتلو شيئًا؛ للإدخال فقط، والصوت لا يُخزَّن |
| أصوات الجهاز (`speechSynthesis` في المتصفح، ليست خدمتنا) | «محادثة صوتية» يختارها المستخدم: تقرأ من الرد المرجعَ والتفسير الميسر ومعنى الآية بالإنجليزية والشرح الآلي الموسوم والنصوص الثابتة | **لا تقرأ نص أي آية أبدًا** ولا نص حديث؛ يُقال مكانه «آية كريمة تراها على الشاشة» (`web/src/trust/speakable.ts` واختباراته على القرآن كاملًا) |

الشرح المولّد يوسم في الواجهة «شرح مولّد من النصوص أعلاه»، والترجمة الآلية توسم «ترجمة آلية». وشرح «اشرح لي بلغتي» يوسم «شرح آلي مبسّط من التفسير الميسر» و«ترجمة آلية».

**حالة التشغيل:** حتى 6 أكتوبر 2026 كان النموذج في وضع المحاكاة (`LLM_MODE=mock`) لتعذّر فتح حساب DeepSeek. ومنذ الأمر 15 يعمل النموذج نفسه على Cloudflare Workers AI (`LLM_MODE=live`)، ويُعالج السؤال على خوادم Cloudflare ولا يُرسل إلى خوادم DeepSeek. القياس قبل التشغيل في `eval/reports/models-2026-10-06.md`.

## ما راجعه البشر

- **طلال الخماش** (صاحب القرار): الخطة، والأوامر، وقائمة المصادر الثابتة، ومراجعة مخرجات كل أمر.
- **سالم الخديدي** (المراجع الشرعي): أسئلة الاختبار ومستوياتها، والتحقق اليدوي من أحكام الأحاديث، والأسئلة الشائعة التي تحمل شارة «معتمد من المراجع الشرعي» (بالاسم والتاريخ).

---

**معنى الآية بسبع لغات (الأمر 22) ليس من الذكاء الاصطناعي:** ترجمات بشرية منشورة من أرشيف مشروع آيات، تُعرض بحروفها باسم مترجمها.

**English summary:** The ayah meanings in seven languages (command 22) involve no AI: published human translations from the Ayat archive, shown verbatim with their translator. Development used Claude and Claude Code under human supervision (prompts in `commands/`); Claude Code also machine-translated the interface strings into the eight languages labelled "machine translation", and a Claude session reviewed the two build windows' reports on Talal's behalf within `CLAUDE.md`. At runtime, bge-m3 (Workers AI) produces embeddings and DeepSeek V4 Flash, hosted on Cloudflare Workers AI (no DeepSeek account or key; questions are processed on Cloudflare and not sent to DeepSeek's servers; command 15), makes one call per new answer to choose the retrieved passages that answer the question and its level (in the default on_demand mode it writes no displayed text; in the other modes a cited explanation), and one call per (ayah, language) for "Explain in my language", which receives al-Muyassar only; Workers AI Whisper turns a recorded voice question into text for the user to review (input only, audio not stored); in the opt-in voice conversation the device's own voices read the reference, al-Muyassar, the English meaning and the labelled machine explanation — never the text of an ayah or a hadith; it never writes or edits religious text, which is always shown verbatim from the database. Humans reviewed the plan, sources, test questions and any "reviewer-approved" content.
