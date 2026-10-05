# الخصوصية — Privacy

- **لا حسابات ولا تسجيل دخول.**
- **لا نجمع بيانات شخصية.** لا نستنتج دين المستخدم أو خلفيته.
- **الحد اليومي:** نحسب بصمة SHA-256 لعنوان IP مع ملح يومي سري، ولا نخزّن العنوان نفسه.
- **الأسئلة تُرسل إلى مزود النموذج اللغوي** (DeepSeek) لإعداد الإجابة، مع المقاطع المسترجعة فقط، دون أي معرّف للمستخدم.
- **الكاش** يحفظ السؤال بعد تطبيعه وإجابته، بلا أي هوية، ولأسئلة المستويين أ وب فقط.
- **لا سجلات تحتوي نص الأسئلة.**
- الإعدادات (اللغة، الشرح المبسّط) تُحفظ في متصفحك فقط.

---

**English:** No accounts and no personal data. Daily rate limiting uses a salted, daily-rotating SHA-256 hash of the IP; the IP itself is never stored. Questions are sent to the LLM provider (DeepSeek) with the retrieved passages only, without any user identifier. The cache stores the normalized question and its answer with no identity, for level A/B questions only. Logs never contain question text. Preferences stay in your browser.
