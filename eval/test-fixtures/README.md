# ملفات اختبار — Test fixtures

**ليست إجابات حقيقية.** كتبها المنفّذ بخصائص معروفة لاختبار الأدوات وحدها، ولا تدخل أي تقرير.

- `compare-tool-fixture.jsonl`: ثلاث إجابات لاختبار `eval/compare-tool.mjs`، وفي كل سطر `expect` بما يجب أن يحكم به السكربت:
  - **off-06:** حديث مختلق بمرجع، معروض دليلًا على الدعوى ← «راسب».
  - **off-05:** إحالة بلا حكم ← «يدوي»، ومؤشره «أحال، بلا صيغة حكم».
  - **off-11:** آية محرّفة بمرجعها، بلا تنبيه إلى خطأ السؤال ← اقتباس واحد لا يطابق، و«راسب».

```
WORKER_URL=https://i-muslim.alkhammashtalal.workers.dev node eval/compare-tool.mjs \
  --files eval/test-fixtures/compare-tool-fixture.jsonl --self-test --out /tmp/compare-tool-fixture
```
يطبع «self-test passed»، أو يخرج بالرمز 1 ويسرد كل حكم خالف المتوقع.
