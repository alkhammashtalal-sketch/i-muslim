# basic-60 — HADITH_RETRIEVAL on (fix-hadith-answer)

`eval/run-basic.mjs` في 2026-10-22T06:27:31.167Z على https://i-muslim-v11.alkhammashtalal.workers.dev، بالمفتاح مشغّلًا لهذه الطلبات وحدها، وبلا كاش الإجابات، والإصلاحات: hadith-answer.

## الأرقام

| المجموعة | العدد | صحيح | أجاب بالنص الصحيح | أجاب بنص لا من gold | امتنع والنص موجود | امتنع بحق | أحال بحق | أجاب ولم يُحل | الدرجة صحيحة | درجة حديث آخر | الدرجة لم تُوجد | مصدر الدرجة غائب | خطأ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| الأساسية بالعربية | 40 | 26 | 26 | 10 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| الأساسية بالإنجليزية | 20 | 13 | 13 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| الأساسية كلها | 60 | 39 | 39 | 17 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| add6: أحكام عامة لا تُحال | 6 | 1 | 1 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| add6: حالات شخصية تُحال | 6 | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0071 (أ): نص ناقص أو تقريبي | 10 | 8 | 8 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0071 (ب): هل الحديث صحيح؟ | 13 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 4 | 4 | 0 |
| 0071 (ج): أحكام عامة لا تُحال | 10 | 6 | 6 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0071 (د): حالات شخصية تُحال | 10 | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| الكل | 115 | 75 | 54 | 17 | 14 | 0 | 16 | 0 | 5 | 0 | 4 | 4 | 1 |

## مرحلة الفشل (40 سؤالًا لم ينجح)

| المرحلة | العدد | من الفشل |
| --- | --- | --- |
| التصنيف | 4 | 10.0% |
| الاسترجاع | 19 | 47.5% |
| العتبة | 0 | 0.0% |
| الأحاديث غير مبحوثة | 0 | 0.0% |
| النموذج | 8 | 20.0% |
| مطابقة الدرجة | 4 | 10.0% |
| مصدر الدرجة غائب | 4 | 10.0% |
| خطأ | 1 | 2.5% |

الزمن (بلا الكاش، 110 طلبًا): الوسيط 2673 ms، و95% ‏12297 ms. من الكاش: 5 (أجوبة الدرجة وحدها).
أُعيد 3 سؤالًا فشل طلبه أو استدعاء نموذجه في التشغيل الأول، مرة واحدة: b14، b22، b25.
استدعاءات النموذج: 153 في التشغيل الأول و3 في الإعادة، ورموز الإدخال 421679 و7215، والإخراج 4411 و124 (usage_monthly في D1 العامل).

## كل سؤال

| السؤال | النتيجة | المرحلة | النوع | المستوى | النصوص المعروضة | من gold |
| --- | --- | --- | --- | --- | --- | --- |
| b01 (ar) ما هو الإسلام؟ | answer_gold |  | answer | A | quran:3:19، quran:3:85، quran:21:92، quran:9:33، hadith:65000، aqeedah:usul:005 | quran:3:19، aqeedah:usul:005 |
| b02 (ar) ما أركان الإسلام؟ | answer_gold |  | answer | A | hadith:65000، hadith:4563، aqeedah:usul:005 | hadith:65000، hadith:4563، aqeedah:usul:005 |
| b03 (ar) ما أركان الإيمان؟ | answer_gold |  | answer | A | quran:2:285، aqeedah:usul:007 | quran:2:285، aqeedah:usul:007 |
| b04 (ar) ما معنى الإحسان؟ | answer_gold |  | answer | A | quran:16:90، quran:3:134، quran:55:60، hadith:4563، aqeedah:usul:008، aqeedah:usul:005 | hadith:4563، aqeedah:usul:008 |
| b05 (ar) كيف أصلي؟ | answer_other | الاسترجاع | answer | B | quran:4:103، quran:2:238، quran:6:72، quran:8:3، quran:27:3 | — |
| b06 (ar) كيف أتوضأ؟ | answer_gold |  | answer | B | quran:5:6، aqeedah:shurut:001 | quran:5:6 |
| b07 (ar) ما شروط الصلاة؟ | answer_gold |  | answer | A | aqeedah:shurut:001 | aqeedah:shurut:001 |
| b08 (ar) ما أركان الصلاة؟ | answer_gold |  | answer | B | aqeedah:shurut:003 | aqeedah:shurut:003 |
| b09 (ar) كم عدد الصلوات المفروضة في اليوم والليلة؟ | answer_other | النموذج | answer | A | quran:17:78، quran:11:114، quran:2:238، aqeedah:usul:009 | — |
| b10 (ar) ما أوقات الصلوات الخمس؟ | answer_gold |  | answer | A | quran:17:78، quran:4:103، quran:11:114، quran:2:238 | quran:17:78 |
| b11 (ar) كيف أتيمم؟ | answer_gold |  | answer | B | quran:5:6، quran:4:43 | quran:5:6، quran:4:43 |
| b12 (ar) كيف أغتسل من الجنابة؟ | answer_gold |  | answer | B | quran:5:6، quran:4:43 | quran:5:6، quran:4:43 |
| b13 (ar) ما فضل الوضوء؟ | answer_other | النموذج | answer | B | quran:5:6 | — |
| b14 (ar) كيف أدخل في الإسلام؟ | answer_other | الاسترجاع | answer | A | quran:3:85، quran:23:73، quran:49:17 | — |
| b15 (ar) ما معنى لا إله إلا الله؟ | answer_gold |  | answer | A | quran:47:19، quran:37:35، aqeedah:tawhid:012، aqeedah:tawhid:004، aqeedah:tawhid:009 | quran:47:19 |
| b16 (ar) ما معنى شهادة أن محمدًا رسول الله؟ | answer_gold |  | answer | A | aqeedah:usul:005 | aqeedah:usul:005 |
| b17 (ar) من هو النبي محمد صلى الله عليه وسلم؟ | answer_other | الاسترجاع | answer | A | quran:21:107، quran:33:56، quran:3:68 | — |
| b18 (ar) هل الإسلام أقدم دين؟ | abstain_has_text | الاسترجاع | abstain | — | — | — |
| b19 (ar) ما هو القرآن؟ | answer_other | الاسترجاع | answer | A | quran:55:2، quran:27:6، quran:25:32، quran:73:4، quran:2:121 | — |
| b20 (ar) لماذا خلقنا الله؟ | answer_gold |  | answer | A | quran:51:56 | quran:51:56 |
| b21 (ar) ما هو التوحيد؟ | answer_other | الاسترجاع | answer | A | aqeedah:tawhid:011، aqeedah:tawhid:004، aqeedah:tawhid:012 | — |
| b22 (ar) ما هو الشرك؟ | answer_gold |  | answer | A | quran:31:13، quran:4:116، quran:4:48، aqeedah:tawhid:008، aqeedah:tawhid:021 | quran:31:13، quran:4:48 |
| b23 (ar) لماذا يصوم المسلمون رمضان؟ | answer_gold |  | answer | A | quran:2:183، quran:2:185، aqeedah:usul:006 | quran:2:183، quran:2:185، aqeedah:usul:006 |
| b24 (ar) ما فضل صيام رمضان؟ | answer_gold |  | answer | A | quran:2:183، quran:2:185 | quran:2:183 |
| b25 (ar) متى يبدأ صيام رمضان؟ | error | خطأ | abstain | — | — | — |
| b26 (ar) ما الذي يفطر الصائم؟ | answer_gold |  | answer | B | quran:2:187، quran:2:185، quran:2:184، hadith:4546 | quran:2:187 |
| b27 (ar) ما هي الزكاة؟ | answer_gold |  | answer | A | quran:2:43، quran:24:56، quran:2:110، quran:31:4، quran:98:5 | quran:2:43 |
| b28 (ar) ما نصاب الزكاة؟ | abstain_has_text | الاسترجاع | abstain | — | — | — |
| b29 (ar) ما زكاة الفطر؟ | abstain_has_text | النموذج | abstain | — | — | — |
| b30 (ar) ما هو الحج؟ | answer_gold |  | answer | A | quran:3:97، quran:2:197، quran:2:196، quran:2:158 | quran:3:97، quran:2:196 |
| b31 (ar) ما فضل الحج؟ | answer_other | الاسترجاع | answer | A | quran:2:197، quran:3:97، quran:2:196 | — |
| b32 (ar) كيف أؤدي العمرة؟ | answer_gold |  | answer | B | quran:2:196، quran:2:158، quran:22:29 | quran:2:196، quran:2:158 |
| b33 (ar) من هم الملائكة؟ | answer_other | النموذج | answer | A | quran:22:75، quran:70:4، quran:97:4، quran:15:8، quran:25:22 | — |
| b34 (ar) من هو عيسى عليه السلام في الإسلام؟ | answer_other | الاسترجاع | answer | A | quran:3:45، quran:19:34، quran:4:157، quran:2:87، quran:5:112 | — |
| b35 (ar) ما حكم بر الوالدين؟ | answer_gold |  | answer | A | quran:17:23، quran:4:36، quran:2:83، quran:6:151 | quran:17:23 |
| b36 (ar) هل الخمر حرام؟ | answer_gold |  | answer | A | quran:5:90، quran:5:91، quran:2:219 | quran:5:90، quran:5:91 |
| b37 (ar) ما الأطعمة المحرمة في الإسلام؟ | answer_gold |  | answer | A | quran:5:3، quran:16:115، quran:2:168 | quran:5:3 |
| b38 (ar) ما صلاة الجمعة؟ | answer_gold |  | answer | A | quran:62:9 | quran:62:9 |
| b39 (ar) ما ليلة القدر؟ | answer_gold |  | answer | A | quran:97:1، quran:97:2، quran:97:3، quran:44:3، quran:44:4 | quran:97:1، quran:97:3، quran:44:3 |
| b40 (ar) هل يغفر الله جميع الذنوب؟ | answer_gold |  | answer | A | quran:39:53، quran:3:135، quran:71:10، quran:8:69، quran:74:56 | quran:39:53 |
| e01 (en) What is Islam? | answer_gold |  | answer | A | quran:3:19، quran:3:85، quran:2:208، aqeedah:usul:005 | quran:3:19، aqeedah:usul:005 |
| e02 (en) What are the five pillars of Islam? | answer_gold |  | answer | A | hadith:65000، aqeedah:usul:005 | hadith:65000، aqeedah:usul:005 |
| e03 (en) How do I pray? | answer_other | الاسترجاع | answer | B | quran:2:239، quran:20:14، quran:31:17، quran:30:31، quran:96:10 | — |
| e04 (en) How do I perform wudu (ablution)? | answer_gold |  | answer | B | quran:5:6 | quran:5:6 |
| e05 (en) Who is the Prophet Muhammad? | answer_gold |  | answer | A | quran:33:40، quran:21:107، quran:53:56، quran:37:37، hadith:10861، hadith:10860 | quran:33:40 |
| e06 (en) What is the Quran? | answer_other | الاسترجاع | answer | A | quran:56:77، quran:69:40، quran:85:21، quran:38:1، quran:81:19 | — |
| e07 (en) Is Islam the oldest religion? | answer_gold |  | answer | A | quran:3:19، quran:23:52، quran:4:125 | quran:3:19 |
| e08 (en) How do I become a Muslim? | answer_gold |  | answer | A | quran:2:128، quran:2:208، quran:39:12، quran:27:31، quran:49:17، hadith:4563 | hadith:4563 |
| e09 (en) What does the shahada mean? | answer_gold |  | answer | A | aqeedah:usul:005 | aqeedah:usul:005 |
| e10 (en) Why do Muslims fast during Ramadan? | answer_gold |  | answer | A | quran:2:183، quran:2:185 | quran:2:183، quran:2:185 |
| e11 (en) What is zakat? | answer_other | الاسترجاع | answer | A | quran:98:5، quran:2:110، quran:24:56، quran:27:3، quran:31:4 | — |
| e12 (en) What is Hajj? | answer_gold |  | answer | A | quran:3:97، quran:2:197، quran:2:196، quran:22:27، quran:2:158 | quran:3:97، quran:2:196، quran:22:27 |
| e13 (en) What do Muslims believe about Jesus? | answer_other | الاسترجاع | answer | A | quran:3:84، quran:4:157، quran:3:52، quran:5:112، quran:9:31، hadith:65025 | — |
| e14 (en) What is the purpose of life in Islam? | answer_gold |  | answer | A | quran:51:56 | quran:51:56 |
| e15 (en) Who is Allah? | answer_other | الاسترجاع | answer | A | quran:3:2، quran:20:8، quran:64:13، quran:4:87، quran:28:70 | — |
| e16 (en) Do Muslims believe in angels? | answer_other | الاسترجاع | answer | A | quran:2:98، quran:66:4، quran:3:80، quran:53:27، quran:15:8 | — |
| e17 (en) Is alcohol forbidden in Islam? | answer_gold |  | answer | A | quran:5:90، quran:2:219، quran:5:91 | quran:5:90، quran:5:91 |
| e18 (en) What breaks the fast? | answer_gold |  | answer | B | quran:2:187 | quran:2:187 |
| e19 (en) How many times a day do Muslims pray? | answer_other | الاسترجاع | answer | A | quran:11:114، quran:4:103، quran:2:238 | — |
| e20 (en) Does Allah forgive all sins? | answer_gold |  | answer | A | quran:39:53 | quran:39:53 |
| g01 (ar) هل يجوز الجمع بين الصلاتين في السفر؟ | abstain_has_text | التصنيف | referral | D | — | — |
| g02 (ar) ما صفة صلاة النبي صلى الله عليه وسلم؟ | abstain_has_text | الاسترجاع | abstain | — | — | — |
| g03 (ar) ما نواقض الوضوء؟ | answer_gold |  | answer | B | quran:5:6، quran:4:43، aqeedah:shurut:001 | quran:5:6 |
| g04 (en) Is it permissible to combine prayers while traveling? | abstain_has_text | التصنيف | referral | D | — | — |
| g05 (en) How did the Prophet pray? | abstain_has_text | النموذج | abstain | — | — | — |
| g06 (en) What breaks wudu? | abstain_has_text | الاسترجاع | abstain | — | — | — |
| p01 (ar) توفي والدي، كيف تُقسم تركته بيني وبين أخواتي؟ | referral_right |  | referral | D | — | — |
| p02 (ar) قلت لزوجتي «أنتِ طالق» ثلاث مرات وأنا غاضب، فهل وقع الطلاق؟ | referral_right |  | referral | D | — | — |
| p03 (ar) ماتت أمي وعليها أيام من رمضان، فهل أصومها عنها؟ | referral_right |  | referral | D | — | — |
| p04 (en) My father passed away. How should his inheritance be divided between me and my sisters? | referral_right |  | referral | D | — | — |
| p05 (en) I told my wife "you are divorced" three times while I was angry. Is she divorced? | referral_right |  | referral | D | — | — |
| p06 (en) My mother died with Ramadan fasts still owed. Should I fast them for her? | referral_right |  | referral | D | — | — |
| t01 (ar) حديث الدين النصيحة | answer_gold |  | answer | A | hadith:4309 | hadith:4309 |
| t02 (ar) آية لا يكلف الله نفسا | answer_gold |  | answer | A | quran:2:286، quran:65:7، quran:23:62، quran:7:42 | quran:2:286، quran:65:7 |
| t03 (ar) حديث انما الاعمال بالنيات | abstain_has_text | النموذج | abstain | — | — | — |
| t04 (ar) ايه الكرسي | answer_gold |  | answer | A | quran:2:255 | quran:2:255 |
| t05 (ar) حديث لا يؤمن احدكم حتى يحب لاخيه | answer_gold |  | answer | A | hadith:4717 | hadith:4717 |
| t06 (ar) اية الا بذكر الله تطمئن القلوب | answer_gold |  | answer | A | quran:13:28 | quran:13:28 |
| t07 (ar) حديث اتق الله حيث ما كنت | answer_gold |  | answer | A | hadith:4302 | hadith:4302 |
| t08 (en) What is the hadith that says actions are judged by intentions? | answer_gold |  | answer | A | hadith:4560 | hadith:4560 |
| t09 (en) the verse that says Allah does not burden a soul beyond what it can bear | answer_gold |  | answer | A | quran:2:286 | quran:2:286 |
| t10 (en) hadith do not get angry | abstain_has_text | النموذج | abstain | — | — | — |
| s01 (ar) هل حديث "إنما الأعمال بالنيات" صحيح؟ | grade_right |  | grade | — | hadith:4560 | hadith:4560 |
| s02 (ar) هل حديث الدين النصيحة صحيح؟ | grade_right |  | grade | — | hadith:4309 | hadith:4309 |
| s03 (ar) ما درجة حديث "من حسن إسلام المرء تركه ما لا يعنيه"؟ | grade_right |  | grade | — | hadith:65255 | hadith:65255 |
| s04 (ar) هل حديث "لا تغضب" صحيح؟ | grade_right |  | grade | — | hadith:4709 | hadith:4709 |
| s05 (ar) هل حديث "يحسب ما خانوك وعصوك وكذبوك وعقابك إياهم" صحيح؟ | grade_right |  | grade | — | hadith:65065 | hadith:65065 |
| s06 (ar) هل حديث "اطلبوا العلم ولو في الصين" صحيح؟ | grade_source_missing | مصدر الدرجة غائب | referral | C | — | — |
| s07 (ar) هل حديث "حب الوطن من الإيمان" صحيح؟ | grade_source_missing | مصدر الدرجة غائب | referral | C | — | — |
| s08 (ar) هل حديث "اختلاف أمتي رحمة" صحيح؟ | grade_source_missing | مصدر الدرجة غائب | referral | C | — | — |
| s09 (en) Is the hadith "Actions are judged by intentions" authentic? | grade_not_found | مطابقة الدرجة | referral | C | — | — |
| s10 (en) Is the hadith "Seek knowledge even as far as China" authentic? | grade_source_missing | مصدر الدرجة غائب | referral | C | — | — |
| s11 (en) Is it a hadith, but the deeds with intentions are correct? | grade_not_found | مطابقة الدرجة | abstain | — | — | — |
| s12 (ur) کیا یہ حدیث صحیح ہے: اعمال کا دار و مدار نیتوں پر ہے | grade_not_found | مطابقة الدرجة | abstain | — | — | — |
| s13 (id) Apakah hadits "Sesungguhnya semua amalan itu tergantung niat-niatnya" shahih? | grade_not_found | مطابقة الدرجة | answer | B | hadith:4560 | hadith:4560 |
| c01 (ar) هل يجوز المسح على الخفين؟ | abstain_has_text | التصنيف | referral | D | — | — |
| c02 (ar) ما فضل صيام يوم عرفة؟ | abstain_has_text | النموذج | abstain | — | — | — |
| c03 (ar) هل يجوز للمسافر أن يفطر في رمضان؟ | abstain_has_text | التصنيف | referral | D | — | — |
| c04 (ar) ما حكم الربا؟ | answer_gold |  | answer | A | quran:2:275، quran:2:276، quran:3:130، quran:4:161، quran:2:278 | quran:2:275، quran:3:130، quran:2:278 |
| c05 (ar) ما حكم أكل لحم الخنزير؟ | answer_gold |  | answer | A | quran:16:115، quran:2:173، quran:5:3، quran:6:145 | quran:16:115، quran:2:173، quran:5:3، quran:6:145 |
| c06 (ar) ما حكم الغيبة؟ | answer_gold |  | answer | A | quran:49:12، hadith:5326 | quran:49:12، hadith:5326 |
| c07 (ar) هل تقضي الحائض الصوم والصلاة؟ | answer_gold |  | answer | B | hadith:3449 | hadith:3449 |
| c08 (en) Is backbiting forbidden in Islam? | answer_gold |  | answer | A | quran:49:12 | quran:49:12 |
| c09 (en) Can I wipe over my leather socks (khuffs) in wudu instead of washing my feet? | abstain_has_text | الاسترجاع | abstain | — | — | — |
| c10 (en) Is riba (interest) forbidden in Islam? | answer_gold |  | answer | A | quran:2:275، quran:2:276، quran:30:39، quran:2:188 | quran:2:275 |
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
