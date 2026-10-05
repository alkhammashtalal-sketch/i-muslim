# الخصوصية — Privacy

- **لا حسابات ولا تسجيل دخول.**
- **لا نجمع بيانات شخصية.** لا نستنتج دين المستخدم أو خلفيته.
- **الحد اليومي:** مفتاح الجهاز بصمة HMAC-SHA256 لعنوان IP مع تاريخ اليوم بسرّ لا يُنشر، فيتغير كل يوم ولا يمكن الرجوع منه إلى العنوان. العنوان نفسه لا يُخزَّن.
- **الأسئلة تُرسل إلى مزود النموذج اللغوي** (DeepSeek) لإعداد الإجابة، مع المقاطع المسترجعة فقط، دون أي معرّف للمستخدم. أسئلة الفتوى والحالات الشخصية تُحال من بوابة المستوى قبل أن تصل إليه.
- **الكاش** لأسئلة المستويين أ وب فقط، ويحفظ بصمة SHA-256 للسؤال بعد تطبيعه (لا نص السؤال)، وأرقام المقاطع والشرح المولّد. نص الآية أو الحديث يُقرأ من قاعدة البيانات في كل مرة.
- **الإبلاغ عن خطأ** يحفظ رقم المقطع والسبب فقط، بلا نص السؤال ولا العنوان.
- **لا سجلات تحتوي نص الأسئلة أو العناوين.**
- **لا طرف ثالث في الصفحة:** لا خطوط ولا سكربتات ولا تحليلات من خوادم أخرى (سياسة أمان المحتوى تمنعها)، وروابط المصادر تُفتح بلا ترويسة «المُحيل» (Referrer).
- الإعدادات (اللغة، الشرح المبسّط) تُحفظ في متصفحك فقط.

---

**English:** No accounts and no personal data. Daily rate limiting uses a device key computed as HMAC-SHA256 of the IP and the date with a secret, so it changes daily and cannot be traced back; the IP itself is never stored. Questions are sent to the LLM provider (DeepSeek) with the retrieved passages only, without any user identifier; fatwa-type and personal questions are referred by the level gate before reaching it. The cache (level A/B only) stores a SHA-256 hash of the normalized question — not the question — plus passage ids and the generated explanation; religious text is read from the database every time. Error reports store the passage id and the reason only. Logs never contain question text or IPs. No third party is loaded by the page (no external fonts, scripts or analytics; the Content-Security-Policy blocks them), and source links open without a Referer header. Preferences stay in your browser.
