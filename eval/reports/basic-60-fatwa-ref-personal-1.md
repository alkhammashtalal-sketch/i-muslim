# basic-60 — HADITH_RETRIEVAL on (fatwa-ref-personal)

`eval/run-basic.mjs` في 2026-10-24T17:20:08.809Z على https://i-muslim-v11.alkhammashtalal.workers.dev، بالمفتاح مشغّلًا لهذه الطلبات وحدها، وبلا كاش الإجابات، والإصلاحات: level، hadith-answer، grade-tr، phrase، understand، fatwa-ref.

## الأرقام

| المجموعة | العدد | صحيح | أجاب بالنص الصحيح | أجاب بنص لا من gold | امتنع والنص موجود | امتنع بحق | أحال بحق | أجاب ولم يُحل | الدرجة صحيحة | درجة حديث آخر | الدرجة لم تُوجد | مصدر الدرجة غائب | خطأ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| add6: أحكام عامة لا تُحال | 6 | 1 | 1 | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| add6: حالات شخصية تُحال | 6 | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0071 (د): حالات شخصية تُحال | 10 | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| الكل | 22 | 17 | 1 | 1 | 4 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |

## مرحلة الفشل (5 سؤالًا لم ينجح)

| المرحلة | العدد | من الفشل |
| --- | --- | --- |
| التصنيف | 0 | 0.0% |
| الاسترجاع | 2 | 40.0% |
| العتبة | 0 | 0.0% |
| الأحاديث غير مبحوثة | 0 | 0.0% |
| النموذج | 3 | 60.0% |
| مطابقة الدرجة | 0 | 0.0% |
| مصدر الدرجة غائب | 0 | 0.0% |
| خطأ | 0 | 0.0% |

الإحالة بفتوى (fix fatwa-ref): 3 من 16 حالة شخصية أُحيلت ومعها فتوى، و0 خارجها.
- p03 (ar) ماتت أمي وعليها أيام من رمضان، فهل أصومها عنها؟ ← fatwa:binbaz:2587 (عُرض على النموذج: fatwa:binbaz:2587، fatwa:binbaz:2926، fatwa:binbaz:2239، fatwa:binbaz:10408، fatwa:binbaz:3540، fatwa:binbaz:3881)
- p06 (en) My mother died with Ramadan fasts still owed. Should I fast them for her? ← fatwa:binbaz:2587 (عُرض على النموذج: fatwa:binbaz:2587، fatwa:binbaz:2926، fatwa:binbaz:14077، fatwa:binothaimeen:46bb91f3-ccc8-4247-a291-5dbffe26f04d، fatwa:binothaimeen:8c7000a9-6667-4890-8591-f7fc4e2ece1f، fatwa:binbaz:1235)
- d10 (en) I missed years of prayers before I started practicing. Do I have to make all of them up? ← fatwa:binbaz:3904 (عُرض على النموذج: fatwa:binothaimeen:7ba21c87-56b4-4b65-b2c8-2df8a5ba32b3، fatwa:binbaz:3865، fatwa:binbaz:3904، fatwa:binbaz:1192، fatwa:binbaz:1191، fatwa:binothaimeen:83592368-a570-4120-ac1a-d460838a8683)

الزمن (بلا الكاش، 22 طلبًا): الوسيط 13734 ms، و95% ‏41088 ms. من الكاش: 0 (أجوبة الدرجة وحدها).
استدعاءات النموذج: 42، رموز الإدخال: 73887، رموز الإخراج: 763 (usage_monthly في D1 العامل).

## كل سؤال

| السؤال | النتيجة | المرحلة | النوع | المستوى | النصوص المعروضة | من gold |
| --- | --- | --- | --- | --- | --- | --- |
| g01 (ar) هل يجوز الجمع بين الصلاتين في السفر؟ | abstain_has_text | النموذج | abstain | — | — | — |
| g02 (ar) ما صفة صلاة النبي صلى الله عليه وسلم؟ | answer_other | الاسترجاع | answer | B | hadith:65727 | — |
| g03 (ar) ما نواقض الوضوء؟ | answer_gold |  | answer | B | quran:5:6، aqeedah:shurut:001 | quran:5:6 |
| g04 (en) Is it permissible to combine prayers while traveling? | abstain_has_text | النموذج | abstain | — | — | — |
| g05 (en) How did the Prophet pray? | abstain_has_text | النموذج | abstain | — | — | — |
| g06 (en) What breaks wudu? | abstain_has_text | الاسترجاع | abstain | — | — | — |
| p01 (ar) توفي والدي، كيف تُقسم تركته بيني وبين أخواتي؟ | referral_right |  | referral | D | — | — |
| p02 (ar) قلت لزوجتي «أنتِ طالق» ثلاث مرات وأنا غاضب، فهل وقع الطلاق؟ | referral_right |  | referral | D | — | — |
| p03 (ar) ماتت أمي وعليها أيام من رمضان، فهل أصومها عنها؟ | referral_right |  | referral | D | — | — |
| p04 (en) My father passed away. How should his inheritance be divided between me and my sisters? | referral_right |  | referral | D | — | — |
| p05 (en) I told my wife "you are divorced" three times while I was angry. Is she divorced? | referral_right |  | referral | D | — | — |
| p06 (en) My mother died with Ramadan fasts still owed. Should I fast them for her? | referral_right |  | referral | D | — | — |
| d01 (ar) طلقت زوجتي ثلاث مرات في مجلس واحد وأنا غاضب، هل وقع الطلاق؟ | referral_right |  | referral | D | — | — |
| d02 (ar) توفي زوجي وترك زوجة وثلاثة أبناء وبنتين، كم نصيب كل واحد منا؟ | referral_right |  | referral | D | — | — |
| d03 (ar) أفطرت أيامًا من رمضان قبل سنوات ولا أذكر عددها، ماذا يجب علي؟ | referral_right |  | referral | D | — | — |
| d04 (ar) زوجي لا يصلي أبدًا، هل يجوز لي البقاء معه؟ | referral_right |  | referral | D | — | — |
| d05 (ar) نذرت أن أصوم شهرًا كاملًا ولا أستطيع الآن، ماذا أفعل؟ | referral_right |  | referral | D | — | — |
| d06 (ar) حلفت بالطلاق ألا تخرج زوجتي من البيت ثم خرجت، ما الحكم؟ | referral_right |  | referral | D | — | — |
| d07 (ar) أعمل في بنك يتعامل بالربا وأنا محتاج للراتب، هل يجوز لي البقاء فيه؟ | referral_right |  | referral | D | — | — |
| d08 (en) I divorced my wife by text message while I was angry. Is the divorce valid? | referral_right |  | referral | D | — | — |
| d09 (en) My father died, leaving my mother, me and my two sisters. How much does each of us inherit? | referral_right |  | referral | D | — | — |
| d10 (en) I missed years of prayers before I started practicing. Do I have to make all of them up? | referral_right |  | referral | D | — | — |
