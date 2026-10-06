# نسخة البداية — Starting Version

## ما سبق التحدي

- **لا كود قبل 4 أكتوبر 2026.** أول التزام في هذا المستودع كان خلال أيام التحدي.
- العرض المسلَّم عند التسجيل.
- نماذج التصميم المرجعية في `design/` (25 سبتمبر 2026).
- أمر التأسيس `CLAUDE.md` وخطط العمل في `commands/`، وأسئلة الاختبار المصطنعة في `eval/`.

## ما أُنجز خلال التحدي (4–6 أكتوبر 2026)

> مسودة من سجل git حتى 5 أكتوبر (57 التزامًا)؛ تُحدَّث قبل التسليم. وقائع فقط.

**البنية والنشر**
- تطبيق ويب قابل للتثبيت (Vite + React + TypeScript + vite-plugin-pwa) يقدّمه Cloudflare Worker واحد مع مسارات `/api/*`.
- قاعدة D1 مع FTS5، وفهرس Vectorize، وتضمين bge-m3 من Workers AI.
- ترويسات أمان وسياسة محتوى من المصدر نفسه فقط.

**الثوابت** (`docs/SOURCES.md`)
- **القرآن:** نص القرآن والتفسير الميسر وتفسير السعدي وترجمة Sahih International من ملفات مشروع آيات الرسمية، 6,236 آية.
- **الشاملة:** الأصول الثلاثة والقواعد الأربع وكتاب التوحيد، 105 مقاطع بأرقام صفحاتها وروابطها.
- **سكربتات وتقرير:** سكربتات جلب قابلة لإعادة التشغيل، وتقرير تحقق.
- **الحديث لم يُجلب:** ينتظر مفتاح sunnah.com.

**البحث والإجابة**
- **الفهرسة:** المقاطع في D1 وVectorize، ومعها 7,697 مقطعًا من تفسير السعدي للبحث.
- **الاسترجاع بلا نموذج لغوي:** تطبيع ومعجم يُتحقق من ألفاظه في الثوابت، ودمج RRF، وعتبة اعتذار.
- **القياس على 71 سؤالًا مصطنعًا:** Recall@5 في قسم التحقق 61.5% مقابل 50.0% لخط الأساس (`docs/METHODOLOGY.md`).
- **محرك `/api/ask`:** بوابة مستوى بلا نموذج، وكاش لأسئلة أ وب فقط، واستدعاء نموذج واحد، والتحقق من الشواهد، وبطاقة تُبنى من نصوص D1 بمطابقة بايتية.
- **ما حول المحرك:** حدود يومية وشهرية، و`/api/report`، وأسئلة عدائية للاختبار.
- **وضع المحرك:** حي منذ 6 أكتوبر بنموذج DeepSeek V4 Flash على Cloudflare Workers AI (الأمر 15).

**الواجهة**
- محادثة بعشر لغات، العربية والإنجليزية مراجَعتان والثماني موسومة «ترجمة آلية»، وفيها بطاقات الإجابة والإحالة والاعتذار.
- قارئ القرآن: فهرس، وسورة بوضعين، ولوحة الآية بالميسر والسعدي والمعنى بالإنجليزية.
- مكتبة كتب العقيدة، ومسار البداية بعشر خطوات.
- «اشرح لي بلغتي» بالوضع التجريبي.
- لوحة «كيف وُجدت هذه الإجابة؟» وشارة الخلاف.
- القراءة بلا اتصال لما فُتح.
- الهوية: زخارف SVG في المواضع المحددة، وخطا IBM Plex Sans Arabic وAmiri مستضافان ذاتيًا.

**الجودة والتوثيق**
- **الاختبارات:** 73 اختبار وحدة للخادم (vitest)، واختبارات Playwright على الرابط الحي.
- **التوثيق:** `docs/` (المصادر، المنهجية، القرارات، الشاشات، الخصوصية، الإفصاح عن الذكاء الاصطناعي، سجل المكونات)، و85 لقطة شاشة.

**ما لم يكتمل بعد**
- الحديث (ينتظر المفتاح).
- تشغيل النموذج الحي وقياس الإجابات.
- مراجعة المراجع الشرعي للأسئلة الشائعة المعتمدة (لا يوجد محتوى بشارة «معتمد»).
- ملفا الشعارين.

---

**English:** No code existed before 4 October 2026. Pre-challenge material is limited to the registration presentation, the design mockups in `design/` (25 September 2026), the founding brief (`CLAUDE.md`), the work plans in `commands/`, and the synthetic test questions in `eval/`. Built during the challenge (draft from the git log, to be updated before submission):
- **The app:** an installable web app served by one Cloudflare Worker, with D1, Vectorize and Workers AI.
- **The fixed sources:** ingested from the official files (6,236 ayat with al-Muyassar, al-Saʿdi and Sahih International; three aqeedah books, 105 passages).
- **Retrieval:** model-free retrieval measured on 71 synthetic questions (validation Recall@5 61.5% vs 50.0% baseline).
- **The `/api/ask` engine:** level gate, cache, one model call, citation checks, cards built from stored text; live since 6 October (DeepSeek V4 Flash on Cloudflare Workers AI).
- **Reading:** the Quran reader, the aqeedah library, the starter path, explain-in-my-language, and the answer-transparency sheet.
- **Quality:** 73 worker unit tests and live Playwright tests.
- **Not done yet:** hadith (awaiting the sunnah.com key), the live model, Sharia-reviewer approvals, and the logo files.
