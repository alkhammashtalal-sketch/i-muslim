# نسخة البداية — Starting Version

## ما سبق التحدي

- **لا كود قبل 4 أكتوبر 2026.** أول التزام في هذا المستودع كان خلال أيام التحدي.
- العرض المسلَّم عند التسجيل.
- نماذج التصميم المرجعية في `design/` (25 سبتمبر 2026).
- أمر التأسيس `CLAUDE.md` وخطط العمل في `commands/`، وأسئلة الاختبار المصطنعة في `eval/`.

## ما أُنجز خلال التحدي (4–6 أكتوبر 2026)

> وقائع من سجل git وحده. أول التزام `b1d69de` في 5 أكتوبر 06:51، ولا التزام في 4 أكتوبر. عند كتابة هذا البيان (6 أكتوبر 06:50): 162 التزامًا، بلا دمج، والتاريخ خطي. وما بعده يظهر في `git log`.

**البنية والنشر**
- تطبيق ويب قابل للتثبيت (Vite + React + TypeScript + vite-plugin-pwa) يقدّمه Cloudflare Worker واحد مع مسارات `/api/*`.
- قاعدة D1 مع FTS5، وفهرس Vectorize، وتضمين bge-m3 من Workers AI.
- ترويسات أمان وسياسة محتوى من المصدر نفسه، والاستثناء الوحيد ملف التلاوة من `cdn.mp3quran.net` عند الضغط (`media-src`).
- النشر من شجرة git نظيفة بعد فحص الأنواع والبناء والاختبارات، والمسارات الإدارية مغلقة على الرابط الحي.

**الثوابت** (`docs/SOURCES.md`)
- **القرآن:** نص القرآن والتفسير الميسر وتفسير السعدي وترجمة Sahih International من ملفات مشروع آيات الرسمية، 6,236 آية.
- **الشاملة:** الأصول الثلاثة، و«شروط الصلاة وأركانها» (قرار طلال 5 أكتوبر)، والقواعد الأربع، وكتاب التوحيد: 112 مقطعًا بأرقام صفحاتها وروابطها.
- **التلاوة البشرية:** توقيت الآيات لـ 114 سورة من mp3quran.net، والصوت يُشغَّل من خوادمهم عند الضغط ولا يُستضاف (قرار طلال 6 أكتوبر).
- **سكربتات وتقرير:** سكربتات جلب قابلة لإعادة التشغيل، وتقرير تحقق.
- **الحديث لم يُجلب:** ينتظر مفتاح sunnah.com.

**البحث**
- **الفهرسة:** المقاطع في D1 وVectorize، ومعها 7,697 مقطعًا من تفسير السعدي للبحث.
- **الاسترجاع بلا نموذج لغوي:** تطبيع ومعجم يُتحقق من ألفاظه في الثوابت، ومعجم متعدد اللغات، ودمج RRF، ومقعد محجوز للعبارة الدقيقة، وعتبة اعتذار.
- **القياس:**
  - Recall@5 في قسم التحقق 61.5% مقابل 50.0% لخط الأساس (71 سؤالًا مصطنعًا).
  - 62.5% بالمعجم متعدد اللغات (77 سؤالًا).
  - أسئلة الترحيب 40/40 (`docs/METHODOLOGY.md`).

**الإجابة**
- **محرك `/api/ask`:**
  - بوابة مستوى بلا نموذج.
  - كاش لأسئلة أ وب فقط، بمفتاح فيه رقم نسخة.
  - استدعاء نموذج واحد، والتحقق من الشواهد.
  - بطاقة تُبنى من نصوص D1 بمطابقة بايتية.
- **القواعد 11–14:**
  - النص أولًا، والشرح عند الطلب.
  - التصريح بالخلاف.
  - سطر «شروط الصلاة».
  - لا أسماء أشخاص في التطبيق.
- **النموذج الحي منذ 6 أكتوبر:**
  - DeepSeek V4 Flash على Cloudflare Workers AI، بلا حساب ولا مفتاح، والاستدلال مطفأ.
  - اختير من ستة إعدادات قيست على 105 أسئلة مصطنعة (`eval/reports/models-2026-10-06.md`).
- **الحالات الاثنتا عشرة الرسمية:** 8 ناجحة آليًا، و2 راسبتان، و2 يدويتان (`eval/reports/official12-2026-10-06-flash-off.md`).
- **المقارنة بالنموذج نفسه بلا مصادر:** ثلاث مرات (`eval/reports/compare-general-2026-10-06-run{1,2,3}.md`).
- **ما حول المحرك:** حدود يومية وشهرية، و`/api/report`، وأسئلة عدائية للاختبار.

**الواجهة**
- **المحادثة:** عشر لغات، العربية والإنجليزية مراجَعتان والثماني موسومة «ترجمة آلية»، وفيها بطاقات الإجابة والإحالة والاعتذار.
- **قارئ القرآن:**
  - فهرس، وسورة بوضعين، ولوحة الآية بالميسر والسعدي والمعنى بالإنجليزية.
  - التلاوة البشرية بزر «استمع» والآية تضيء، وفي بطاقة الإجابة أيضًا.
- **مكتبة كتب العقيدة، ومسار البداية بعشر خطوات.**
- **«بسّط لي» و«اشرح لي بلغتي»:** بالنموذج الحي، موسومان ومحفوظان في الكاش.
- **الصوت:**
  - السؤال بالصوت بـ Whisper على Workers AI، والصوت لا يُخزَّن.
  - المحادثة بالصوت بصوت الجهاز، ولا تلاوة آلية لأي آية.
- **الشفافية:**
  - لوحة «كيف وُجدت هذه الإجابة؟» وشارة الخلاف.
  - صفحة «تحقّق بنفسك» (`/verify`) بالحالات الرسمية ونتيجة القياس الحي.
- **القراءة بلا اتصال** لما فُتح.
- **الهوية:**
  - الاسم «مسلم»، وتصميم التذهيب (الإصدار 4): زخارف SVG بالكود.
  - خطا IBM Plex Sans Arabic وAmiri مستضافان ذاتيًا.

**الجودة والتوثيق**
- **الاختبارات:**
  - 131 اختبار وحدة للخادم (vitest). منها 23 تحتاج النصوص المجلوبة، فتُتخطى في نسخة نظيفة من المستودع.
  - ثلاثة ملفات Playwright على الرابط الحي.
  - فحص دخان للرابط الحي بعد كل نشر (`scripts/smoke-live.mjs`).
- **التوثيق:**
  - `docs/`: المصادر، والمنهجية، والقرارات، والشاشات، والخصوصية، والإفصاح عن الذكاء الاصطناعي، وسجل المكونات، والتشغيل والتكلفة.
  - 128 لقطة شاشة.
  - نص الفيديو وسكربت تسجيله.

**بعد 06:50 (6 أكتوبر، حتى آخر نشر `2fadee1` في 20:0x):**
- **النموذج الحي:** DeepSeek V4 Flash على Workers AI بلا مفتاح (الأمر 15)، وقياسه على الحالات الاثنتي عشرة وصفحة «تحقّق بنفسك» `/verify`.
- **«بسّط لي»:** أُوقف بعد قياسه بعشر لغات؛ لم يبلغ 90% في أي لغة.
- **«اشرح لي بلغتي»:** عاد ترجمة محاذاة للتفسير الميسر لـ45 آية، نُشر منها ما اجتاز المراجعة المستقلة وحده: 381 من 402 (الأمر 21).
- **معنى الآية بلغة القارئ:** بسبع لغات من ترجمات مشروع آيات البشرية (الأمر 22)، ولا معنى إنجليزي في الواجهة العربية (قرار طلال 19:00).
- **المقارنة:** بالنموذج نفسه بلا مصادر، وبـChatGPT على الحالات الاثنتي عشرة.
- **مسار البداية:** صيغ تُجاب.
- **الفيديو:** بتعليق صوتي بشري.
- **سجل git:** 236 التزامًا عند كتابة هذا السطر، بلا دمج، والتاريخ خطي.

**ما لم يكتمل**
- الحديث (ينتظر مفتاح sunnah.com).
- **مراجعة المراجع الشرعي:** لا يوجد محتوى بشارة «معتمد»، وقائمة المسائل الخلافية فارغة.
- ملفا الشعارين.
- **حدود النموذج الحي:** تصنيف المستوى بين أ وب ضعيف (46.7% في قسم التحقق)، وجودة الشرح المولّد عند الطلب لم تُقس (`docs/METHODOLOGY.md`).

---

**English:** No code existed before 4 October 2026. Pre-challenge material is limited to the registration presentation, the design mockups in `design/` (25 September 2026), the founding brief (`CLAUDE.md`), the work plans in `commands/`, and the synthetic test questions in `eval/`. Built during the challenge (facts from the git log only; first commit `b1d69de` on 5 October 06:51, none on 4 October; 162 linear commits when this was written on 6 October 06:50):
- **The app:** an installable web app served by one Cloudflare Worker, with D1, Vectorize and Workers AI; deployed from a clean git worktree after type checks, build and tests; admin routes closed on the live link.
- **The fixed sources:** 6,236 ayat with al-Muyassar, al-Saʿdi and Sahih International; four aqeedah treatises including «Shurut al-Salah», 112 passages; human recitation timings for 114 suras from mp3quran.net (audio played from their servers on press, not hosted). Hadith is not ingested (awaiting the sunnah.com key).
- **Retrieval:** model-free; validation Recall@5 61.5% vs 50.0% baseline (71 questions), 62.5% with the multilingual lexicon (77), welcome questions 40/40.
- **The `/api/ask` engine:** level gate, versioned cache, one model call, citation checks, cards built from stored text; rules 11–14 (text first with on-request explanations, stated differences of opinion, the prayer-conditions note, no personal names). **Live since 6 October:** DeepSeek V4 Flash on Cloudflare Workers AI (no key, reasoning off), chosen among six measured settings; the twelve official cases: 8 pass, 2 fail, 2 manual; three comparison runs with the same model without sources.
- **Interface:** ten languages; Quran reader with human recitation; aqeedah library; starter path; live "Simplify" / "Explain in my language"; voice questions (Whisper) and voice conversation (device voices, never reciting an ayah); the answer-transparency sheet and the /verify page; offline reading; the «مسلم» name and the illumination design.
- **Quality:** 131 worker unit tests (23 need the ingested texts), three Playwright files and a smoke test against the live link; 128 screenshots; full docs including operations and cost.
- **Not done:** hadith, Sharia-reviewer approvals (nothing carries the "approved" badge; the disputed list is empty), the logo files; the live model's A/B level labelling is weak (46.7% on validation) and the on-request explanations' quality is not measured.
