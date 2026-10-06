# Urdu + Hindi review (reviewer agent, 6 Oct 2026): fix list

All 253 keys in each file checked against en.ts and ar.ts.
- Every key is present.
- Placeholders match.
- No English is left untranslated.

## URDU (ur.ts): score 250/253 = 98.8%

### CRITICAL
- **levelCDesc**
  - Current: «اختلافی یا اجتہادی مسئلہ — رہنمائی کی جاتی ہے، جواب نہیں۔»
  - Problem: «رہنمائی» is what a mufti gives ("guidance"). The line says the app guides users on disputed matters, the opposite of referral.
  - Fix: «اختلافی یا اجتہادی مسئلہ — مجاز ادارے کی طرف بھیجا جاتا ہے، جواب نہیں دیا جاتا۔»
- **levelDDesc**
  - Current: «ذاتی معاملہ یا فتویٰ — رہنمائی کی جاتی ہے، جواب نہیں۔»
  - Problem: It says the app gives guidance on personal fatwa cases, which contradicts "not a mufti".
  - Fix: «ذاتی معاملہ یا فتویٰ — مجاز ادارے کی طرف بھیجا جاتا ہے، جواب نہیں دیا جاتا۔»

### MAJOR
- **demoReferral:** «فتویٰ کا سوال (رہنمائی)» → «فتویٰ کا سوال (مجاز ادارے سے رجوع)»

### MINOR
- **footer** → «ماخذ تک محدود معلوماتی معاون · مفتی نہیں · مصنوعی ذہانت کی مدد سے»
- **logoPalm** → «کھجور کے درخت کا لوگو»
- **levelA** → «درجہ الف · مسلّمہ معلومات»
- **levelADesc** → «مسلّمہ معلومات — متن سے جواب دیا جاتا ہے۔»
- **fromCache** → «محفوظ شدہ جواب»
- **referralBody** → ««مسلم» ایپ انفرادی معاملات میں شرعی حکم نہیں بتاتی۔ آپ اپنا سوال سرکاری مجاز ادارے کے سامنے رکھ سکتے ہیں۔»
- **referralButton** → «الرئاسۃ العامۃ للبحوث العلمیۃ والافتاء»
- **errMonthlyCap** → «سروس عارضی طور پر رکی ہوئی ہے۔ اکثر پوچھے جانے والے سوالات اب بھی دستیاب ہیں۔»
- **sourcesIntro:** change the word order «ایپ «مسلم»» to ««مسلم» ایپ».
- **aboutTitle** → ««مسلم» ایپ کے بارے میں»
- **srcQuranBy** → «آیات منصوبہ، شاہ سعود یونیورسٹی» (to match readerSourceNote)
- **simpleModeHint** → «یہ آپ خود منتخب کرتے ہیں؛ ہم کبھی آپ کے پس منظر کا اندازہ نہیں لگاتے۔»
- **demoAnswer** → «باحوالہ جواب»
- **before / after** → «اس سے پہلے» / «اس کے بعد»
- **notMuftiBody** → ««مسلم» ایپ شرعی احکام جاری نہیں کرتی۔ یہ معتبر متون دکھاتی ہے اور فتویٰ طلب ہر بات کو الرئاسۃ العامۃ للبحوث العلمیۃ والافتاء کی طرف بھیجتی ہے۔»
- **aiTitle** → «مصنوعی ذہانت کے استعمال کی وضاحت»
- **booksSourceNote** → «شیخ محمد بن عبد الوہاب کی کتب، المکتبۃ الشاملہ سے، بغیر تبدیلی کے، ہر صفحے کے لنک کے ساتھ۔»
- **starterCardTitle** → «اسلام میں نئے ہیں؟ یہاں سے شروع کریں»
- **starterCardSub** → «دس مختصر مراحل۔ ہر مرحلہ ایک سوال ہے جس کا جواب معتبر ماخذ سے دکھایا جاتا ہے۔»
- **howFoundLevel** → «سوال کا درجہ: {level}۔»
- **shurutNote** → «یہ شمار رسالے کے مطابق ہے، اور اس کی بعض تفصیلات میں اہلِ علم کے دوسرے اقوال بھی ہیں۔»
- **speakAyahRef** → «سورت {sura}، آیت {aya}»
- **speakLinkOnScreen** → «مجاز ادارے کا لنک آپ کی اسکرین پر ہے۔»

## HINDI (hi.ts): score 251/253 = 99.2%

### CRITICAL
None.

### MAJOR
- **referralButton**
  - Current: «वैज्ञानिक अनुसंधान और इफ़्ता का सामान्य अध्यक्षता कार्यालय»
  - Problem: «العلمية» is translated as "scientific", which misnames the religious authority.
  - Fix: «इल्मी शोध और इफ़्ता की जनरल प्रेसीडेंसी»
- **notMuftiBody** → «मुस्लिम ऐप कोई शरई हुक्म जारी नहीं करता। यह स्वीकृत पाठ दिखाता है और फ़तवे की ज़रूरत वाली हर बात को इल्मी शोध और इफ़्ता की जनरल प्रेसीडेंसी की ओर भेजता है।»

### MINOR
- **footer** → «स्रोतों तक सीमित ज्ञान सहायक · मुफ़्ती नहीं · एआई-सहायित»
- **referralBody:** use «शरई हुक्म» instead of «निर्णय».
- **errMonthlyCap** → «सेवा अस्थायी रूप से रुकी है। अक्सर पूछे जाने वाले प्रश्न अभी भी उपलब्ध हैं।»
- **demoAbstain** → «कोई पाठ नहीं (उत्तर से इनकार)»
- **levelBDesc** → «ऐसी जानकारी जिसे पाठ से विवरण की ज़रूरत है — पाठ से उत्तर दिया जाता है।»
- **booksSourceNote:** «मक्तबा» → «मकतबा» (to match srcAqeedahBy)
- **starterCardSub:** «मान्य» → «स्वीकृत»
- **howFoundGenerated:** «कृत्रिम बुद्धिमत्ता» → «एआई»
- **disputedText, shurutNote:** «विद्वानों» → «उलमा»
- **speakFoundBook** → «आपके लिए एक स्वीकृत किताब में एक पाठ मिला। यह उसका अरबी पाठ है।»
- **Sura spelling:** use «सूरह» in every key. It is more common in Hindi Islamic content, and «सूरत» can be read as "face" or as the city.

## Shared note
hi.ts (and bn.ts) keep the app name "Muslim" in Latin script inside sentences, and window 2's check flags this too. Use «मुस्लिम» in Hindi and «মুসলিম» in Bengali.
