# الخصوصية — Privacy

- **لا حسابات ولا تسجيل دخول.**
- **لا نجمع بيانات شخصية.** لا نستنتج دين المستخدم أو خلفيته.
- **الحد اليومي:** مفتاح الجهاز بصمة HMAC-SHA256 لعنوان IP مع تاريخ اليوم بسرّ لا يُنشر، فيتغير كل يوم ولا يمكن الرجوع منه إلى العنوان. العنوان نفسه لا يُخزَّن.
- **الأسئلة تُرسل إلى مزود النموذج اللغوي** (DeepSeek) لاختيار المقاطع التي تجيبها، مع المقاطع المسترجعة فقط، دون أي معرّف للمستخدم. أسئلة الفتوى والحالات الشخصية تُحال من بوابة المستوى قبل أن تصل إليه.
- **زر «بسّط لي» / «اشرح لي بلغتي»** يرسل نص التفسير أو المقطع ولغتك فقط، لا سؤالك.
- **«اشرح لي بلغتي»** (قارئ القرآن، لغير العربية): يُرسل إلى مزود النموذج نص التفسير الميسر للآية فقط، بلا سؤال ولا أي معرّف للمستخدم. والناتج يُحفظ مرة لكل آية ولغة، ولا شيء فيه من المستخدم.
- **الكاش** لأسئلة المستويين أ وب فقط، ويحفظ بصمة SHA-256 للسؤال بعد تطبيعه (لا نص السؤال)، وأرقام المقاطع (والشرح المولّد في الوضع الذي يظهره). نص الآية أو الحديث يُقرأ من قاعدة البيانات في كل مرة.
- **الإبلاغ عن خطأ** يحفظ رقم المقطع والسبب فقط، بلا نص السؤال ولا العنوان.
- **لا سجلات تحتوي نص الأسئلة أو العناوين.**
- **لا طرف ثالث في الصفحة:** لا خطوط ولا سكربتات ولا تحليلات من خوادم أخرى (سياسة أمان المحتوى تمنعها)، وروابط المصادر تُفتح بلا ترويسة «المُحيل» (Referrer).
- **في متصفحك فقط** (`localStorage`): الإعدادات (اللغة، والمظهر، وحجم الخط، والشرح المبسّط)، وطريقة القراءة وآخر موضع في المصحف، والخطوات المقروءة في مسار البداية. ويحفظ عامل الخدمة صفحات المصحف والكتب التي فتحتها لتُقرأ بلا اتصال. لا يُرسل شيء من هذا إلى الخادم.

---

**English:** No accounts and no personal data. Daily rate limiting uses a device key computed as HMAC-SHA256 of the IP and the date with a secret, so it changes daily and cannot be traced back; the IP itself is never stored. Questions are sent to the LLM provider (DeepSeek) to choose the passages that answer them, with the retrieved passages only and without any user identifier; fatwa-type and personal questions are referred by the level gate before reaching it. The "Simplify / Explain in my language" button sends the tafsir or passage text and your language only, not your question. The cache (level A/B only) stores a SHA-256 hash of the normalized question — not the question — plus passage ids and the generated explanation; religious text is read from the database every time. Error reports store the passage id and the reason only. Logs never contain question text or IPs. No third party is loaded by the page (no external fonts, scripts or analytics; the Content-Security-Policy blocks them), and source links open without a Referer header. "Explain in my language" in the Quran reader sends only the al-Muyassar text of the ayah to the LLM provider (no question, no identifier); its result is stored once per ayah and language and holds nothing from the user. Stored only in your browser (localStorage), never sent to the server: settings (language, theme, font size, simple explanations), the reading mode and last position in the Mushaf, and the starter-path steps you read; the service worker also keeps the Mushaf and book pages you opened, for offline reading.
