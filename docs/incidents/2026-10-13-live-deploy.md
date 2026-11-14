# حادث: نشر على العامل الحي `i-muslim` بأمر Pages (13 أكتوبر 2026)

الملحق 0033-add1، البند 3. كل ما هنا من أوامر قراءة (`wrangler deployments list`، و`wrangler versions view`، و`wrangler pages project list`) ومن كود wrangler والمستودع. ولم يُرسل أي طلب إلى الرابط الحي، ولم يُستعلم D1 الحي.

## الخلاصة
- **ماذا حدث:** أمر إنشاء مشروع Pages للجزء (ج) من رد 0033 نشر نسخة جديدة على العامل الحي المجمَّد `i-muslim` بنسبة 100%. وكانت النسخة الجديدة كود `next` وواجهته، مربوطة بموارد الحي.
- **مدته:** نحو 69 دقيقة، من 11:33:40 إلى 12:42:18 بتوقيت الرياض.
- **الإصلاح:** أعاده طلال بالاسترجاع من لوحة Cloudflare إلى النسخة المجمَّدة `9c7e6771`.

## 1. الأمر
- **بنصه:** `npx wrangler pages project create i-muslim --production-branch main`
- **مجلد التشغيل:** `/Users/talal/i-muslim/worker`، وفيه `wrangler.jsonc`.
- **نسخة wrangler:** 4.147.0.
- **الوقت:** 11:33 بتوقيت الرياض.
- **من شغّله:** النافذة 1 (Claude Code)، مباشرة لا عبر `scripts/deploy.sh`، فلم يمر بالحارس `FREEZE`.

## 2. لماذا نشر أمرُ Pages عاملًا
**ما لا يذكره `--help`:** نص `wrangler pages project create --help` في 4.147.0 يقول «Create a new Cloudflare Pages project»، ولا يذكر أي نشر على Workers.

**ما يفعله الكود:** السلوك في كود wrangler نفسه (`node_modules/wrangler/wrangler-dist/cli.js`، الوحدة `src/pages/delegate-to-workers.ts`).
- **متى يُحوَّل الأمر:** الدالة `maybeDelegatePagesToWorkers` تُحوّل الأمر إلى «Cloudflare Pages الجديدة، وهي الآن جزء من Workers» بشروط:
  - أن يكتشف wrangler أن من يشغّله وكيل ذكاء اصطناعي (`detectAgent().isAgent`).
  - ألا يكون في المجلد `functions/` ولا `_worker.js` ولا `_routes.json`.
  - ألا يوجد مشروع Pages بالاسم نفسه.
  - ألا يُعطى `--force`.
  - فإن لم يكن المشغّل وكيلًا، لا يُحوَّل الأمر.
- **كيف يُنفَّذ التحويل:** بالدالة `runPagesToWorkersDeploy`.
  - تشغّل معالج `wrangler deploy` نفسه بالاسم `--name i-muslim`، وبلا `--env` (`env: void 0`).
  - وتقرأ الإعداد من المجلد الحالي (`readConfig(deployArgs)`).
  - فقرأت `worker/wrangler.jsonc` بإعداده الأعلى، وهو إعداد الحي، ونشرت عاملًا باسم المشروع، وهو اسم العامل الحي.
- **لم يتحقق wrangler من وجود عامل بهذا الاسم:** فحصه `pagesProjectExists` يسأل عن مشروع Pages فقط.
- **رسالة wrangler بعد النشر:** طبع رسالة موجهة إلى الوكلاء، تطلب أن يُخبَر المستخدم بأن مشروعه «حي». لم تُتبع، وكتبتُ لطلال أن الحي تغيّر.
- **سجل التغييرات:** حزمة wrangler المثبتة لا تحمل `CHANGELOG.md`، فالمصدر الكود أعلاه. يُرجع إلى سجل wrangler الرسمي عند التحديث.

## 3. ما الذي نُشر (النسخة `6e29cacc-e94c-4f10-8ce9-094009d4e6f4`)
**مصدر المعلومات:** من `wrangler versions view` و`wrangler deployments list`.

**الكود:**
- `worker/src` كما في `next` عند الالتزام `2d8d8eb`.
- وهو كود `5b92af9` نفسه، المنشور على next بالإصدار `8c6d8cb6` بعد الملحق 17. الفرق بينهما `docs/DECISIONS.md` فقط.
- المعالجات: `fetch` و`scheduled`. النسخة المجمّدة فيها `fetch` وحده.

**الأصول:**
- `web/dist` في مجلد العمل وقتها، أي واجهة النسخة الثانية كما بُنيت لفحوص الملحق 17.
- قُدّمت على الرابط الحي نحو 69 دقيقة.

**الإعداد:** الإعداد الأعلى في `worker/wrangler.jsonc`.
- الربطات:
  - D1 `imuslim` (`2cbc4d13-…`).
  - Vectorize `imuslim-passages`.
  - AI.
  - ASSETS.
- الأسرار: `ADMIN_TOKEN` و`IP_SALT` نفسها.
- المتغيرات:
  - `ADMIN_ENABLED=false`، و`LLM_MODE=live`، و`EXPLAIN_MODE=on_demand`، و`READER_EXPLAIN=false`.
  - وزيد عليها `MUKHTASAR_PUBLIC=false` و`MUKHTASAR_QURANENC=true`، وليسا في المجمّدة.

**المسارات والمُشغِّلات:**
- لم يتغير شيء: الإعداد الأعلى بلا `routes` ولا `crons`.
- و«Deployed i-muslim triggers» في المخرج هو رابط workers.dev نفسه.
- لا مُشغِّل مجدول على الحي، فلم يعمل `scheduled` فيه.

## 4. المدة
| | UTC | الرياض |
| --- | --- | --- |
| رفع النسخة ونشرها 100% | 08:33:39–08:33:40 | 11:33:40 |
| الاسترجاع إلى `9c7e6771` (طلال من لوحة Cloudflare) | 09:42:18 | 12:42:18 |

**المدة:** 68 دقيقة و38 ثانية.

**أمرا طلال بعلامة `!`:** لم يغيّرا شيئًا. ظهرا في النافذة أمرين، ولم يصل مخرجهما، والسجل بعدهما بلا نشر جديد.

## 5. ما كان يمكن أن يكتبه ذلك الكود في D1 الحي وVectorize (من قراءة الكود فقط)
**الطريقة:** كل أمر كتابة في `worker/src` عند `5b92af9`.

**ما كان ممكنًا، وكله بطلب مستخدم:**
- **`usage_daily`:** عدّاد الحد اليومي، عند السؤال والشرح والصوت والبلاغ (`ask.ts:162`، و`report.ts:28`).
- **`cache`:** إجابات أسئلة أ وب، إضافة وتحديث وحذف (`ask.ts:220`، و`ask.ts:223`، و`ask.ts:302`). ما كُتب فيها في تلك المدة كتبه كود next، وقد تقرؤه النسخة المجمّدة بعد الاسترجاع.
- **`explain_cache`:** نص «بسّط لي» و«اشرح لي بلغتي» المولّد (`explain.ts:262`).
- **`usage_monthly`:** عدّاد استدعاءات النموذج الشهري (`llm.ts:54`).
- **`reports`:** بلاغ من بطاقة الإجابة (`report.ts:34`).

**ما لم يكن ممكنًا:**
- **`push_subs`:** المسار يعيد 404 قبل D1، لأن الحي بلا مفاتيح VAPID. والمُشغِّل المجدول غير موجود على الحي.
- **مسارات الإدارة (`admin.ts`):** فيها الكتابة الوحيدة على Vectorize (`upsert`)، وهي مغلقة بـ`ADMIN_ENABLED=false`، وتطلب `ADMIN_TOKEN`.
- **Vectorize خارج الإدارة:** استعلامات قراءة فقط.
- **مسارات كود next التي تقرأ جداول ليست في الحي** (`hadiths`، و`ayah_translations`، و`tafsir_translations`، و`push_subs`): تقرأ ولا تكتب، وكانت تُرجع خطأ أو «لا شيء».

**هل كُتب شيء فعلًا:** لا أعرف. هذا يحتاج قراءة من D1 الحي، ولم أفعل. وهذا أمر قراءة أقترحه، والقرار للمنسّق. الأعمدة `created_at` بتوقيت UTC (`datetime('now')`)، وغير مفهرسة، فالأمر يمسح الجداول الثلاثة مرة واحدة:

```
npx wrangler d1 execute imuslim --remote --json --command "SELECT 'cache' AS t, count(*) AS n FROM cache WHERE created_at BETWEEN '2026-10-13 08:33:39' AND '2026-10-13 09:42:18' UNION ALL SELECT 'explain_cache', count(*) FROM explain_cache WHERE created_at BETWEEN '2026-10-13 08:33:39' AND '2026-10-13 09:42:18' UNION ALL SELECT 'reports', count(*) FROM reports WHERE created_at BETWEEN '2026-10-13 08:33:39' AND '2026-10-13 09:42:18'"
```

**محاولة الفحص (الملحق 0033-add2 §1، 13 أكتوبر 15:53):** أذن المنسّق بتشغيل الأمر أعلاه بنصه مرة واحدة. منعه مصنّف الأذونات في Claude Code (قراءة إنتاج)، فلم يُشغَّل ولم يُلتف عليه. فالجواب ما زال «لا أعرف»، والأمر في STATUS لطلال يشغّله بنفسه إن أراد.

**ما لا يُعرف من الجداول:**
- **`usage_daily` و`usage_monthly`:** عدّادات بلا وقت دقيق، فلا يُعرف منها ما زاد في تلك المدة.
- **صفوف `cache` الجديدة:** إن وُجدت، يُقرر في حذفها، لأنها من كود غير المجمّد.

## 6. هل أُنشئ مشروع Pages باسم `i-muslim`
- **لا.** `wrangler pages project list` يعرض المشروعين القائمين `i-secur` و`i-secure` فقط.
- الأمر حُوّل كله إلى نشر Workers، ولم يُنشئ مشروع Pages.

## 7. ما بعد الحادث في النافذة 1
**الكتابات على `imuslim-next` (لا الحي):** أنجزتُها بعد كتابة الملحق 0033-add1 (11:58) وقبل أن أقرأه (12:48):
- ترحيلات 0012 و0013 و0014.
- تحميل «تأكد من فهمك»: 20,656 صف كتابة.
- طلب لغة تجريبي واحد، ثم حذفه.
- جلسات `wrangler dev --remote` على next.

**أوقفتُ الكتابة على Cloudflare** حين قرأتُه، حتى انتهت بنوده 2–4.

**الوقاية:**
- `scripts/wr.sh` يلف wrangler ويرفض كل أمر كتابة إلا بـ`--env next` أو لعامل الموقع `i-muslim-site` (البند 4).
- قاعدته في `CLAUDE.md` §13.
