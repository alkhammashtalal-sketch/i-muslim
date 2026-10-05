# eval — أسئلة الاختبار

- `questions.v1.jsonl`: 71 سؤالًا مصطنعًا (53 بالعربية و18 بتسع لغات أخرى). الحقول: `id`، `lang`، `q`، `expected_level` (A–D، وN لخارج النطاق)، `expected_behavior` (answer، refer، abstain، answer_or_abstain، refer_or_abstain)، `topic`، `gold` (أرقام آيات متوقعة حيث تكون واضحة)، `note`.
- `REVIEW_FOR_SALEM.md`: الجدول نفسه للمراجعة الشرعية. لا تُعتمد النتائج النهائية قبل مراجعة سالم للمستويات والسلوك المتوقع.
- حالات المنظّم الاثنتا عشرة تُضاف في `official_cases.jsonl` حين تصل من موارد لوحة المشارك.
- لا بيانات مستخدمين حقيقيين في هذا المجلد.
