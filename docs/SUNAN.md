# The fard and the regular sunnahs under each prayer

Add-on 0072-add59 (Talal's choice of 1 November 2026, 05:38, «النسخة الواضحة»): a small line under each prayer's name
gives the sunnah before it, the fard and the sunnah after it. It is shown in the large «مواقيت اليوم» widget on iOS and
Android and on the prayer times page of the app and the web (`web/src/v2/daily/PrayerTimes.tsx`), from one table
(`web/src/v2/daily/sunan.ts`) and one set of words (`web/src/native/widget-strings.ts`, `sunan`, in the ten languages:
Arabic and English reviewed, the eight others machine translation like the rest of the interface).

| Prayer | The line in Arabic |
|---|---|
| الفجر | «٢ قبلها ✦ الفرض ٢» |
| الظهر | «٤ قبلها ✦ الفرض ٤ ✦ ٢ بعدها» |
| العصر | «الفرض ٤» |
| المغرب | «الفرض ٣ ✦ ٢ بعدها» |
| العشاء | «الفرض ٤ ✦ ٢ بعدها» |

The add-on wrote «·» between the parts; in Arabic the app writes «✦» (add-on 0072-add23 §4.4, `arabic-marks.ts`
`sepOf`), since «·» beside Arabic-Indic digits reads as a zero: «الفرض ٣ · ٢ بعدها» as «٣٠٢». Other languages keep «·».

- Sunrise, the middle of the night and the last third have no line.
- Friday: nothing changes, and nothing of its own is written (this add-on).
- No sunnah is written for Asr, and none before Maghrib: hadith 11253 («صلوا قبل المغرب ركعتين») is in our data, and
  its own explanation says the two rak'ahs «ليستا من السنن الرواتب المؤكدة».
- The numbers are in each language's digits, as the app writes them; VoiceOver and TalkBack read the row as one, for
  example «الظهر، ١٢:٠٢ م، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها».

## The evidence (each copied from our data)

All three hadiths are in `data/processed/hadith.jsonl` (HadeethEnc, source ب) and the fatwa in
`data/processed/fatwas.jsonl` (binbaz.org.sa, source د). `worker/test/sunan-0072.test.ts` checks the numbers,
attributions and grades below against those files when they are present.

### HadeethEnc 65715 (Umm Habiba: the twelve)

- Link: https://hadeethenc.com/ar/browse/hadith/65715 (in the app: `/hadith/65715`)
- Attribution (as in our data): «رواه مسلم»
- Grade (as in our data): «صحيح»
- Reference (as in our data): صحيح مسلم (1/ 503) (728)، البحر المحيط الثجاج في شرح صحيح الإمام مسلم بن الحجاج (15/ 412).
- Text, verbatim from `data/processed/hadith.jsonl` (`lang: ar`, version v1.7.0):

> عن النعمان بن سالم عن عمرو بن أوس عن عنبسة بن أبي سفيان عن أم حبيبة زوج النبي صلى الله عليه وسلم أنها قالت: سمعت رسول الله صلى الله عليه وسلم يقول: «ما من عبد مسلم يصلي لله كل يوم ثنتي عشرة ركعةً تطوعًا غير فريضة إلا بنى الله له بيتًا في الجنة، أو إلا بني له بيت في الجنة» قالت أم حبيبة: فما برحت أصليهن بعد. وقال عمرو: ما برحت أصليهن بعد. وقال النعمان مثل ذلك.

Its explanation in our data names the twelve:

> والرواتب ركعتان قبل الفجر، وأربع قبل الظهر، وركعتان بعدها، وركعتان بعد المغرب، وركعتان بعد العشاء.

### HadeethEnc 11249 (Aisha: four before Dhuhr, two before Fajr)

- Link: https://hadeethenc.com/ar/browse/hadith/11249 (in the app: `/hadith/11249`)
- Attribution (as in our data): «رواه البخاري»
- Grade (as in our data): «صحيح»
- Reference (as in our data): صحيح البخاري (2/ 59) (1182). / توضيح الأحكام مِن بلوغ المرام، لعبد الله البسام (2/ 379).
- Text, verbatim from `data/processed/hadith.jsonl` (`lang: ar`, version v1.7.0):

> عن عائشةَ أُمِّ المُؤْمِنينَ رضي الله عنها: أن النبي صلى الله عليه وسلم كان لا يَدع أربعا قَبل الظهر وركعتين قبل الغَدَاة.

### HadeethEnc 3062 (Ibn Umar: the ten)

- Link: https://hadeethenc.com/ar/browse/hadith/3062 (in the app: `/hadith/3062`)
- Attribution (as in our data): «متفق عليه بجميع رواياته»
- Grade (as in our data): «صحيح»
- Reference (as in our data): صحيح البخاري (2/ 58-59) (1180، 1181). / صحيح مسلم (2/ 601) (882). / تيسير العلام شرح عمدة الأحكام، للبسام (ص112).
- Text, verbatim from `data/processed/hadith.jsonl` (`lang: ar`, version v1.7.0):

> عَنِ ابْنِ عُمَرَ رَضِيَ اللَّهُ عَنْهُمَا قَالَ: حَفِظْتُ مِنَ النَّبِيِّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ عَشْرَ رَكَعَاتٍ: رَكْعَتَيْنِ قَبْلَ الظُّهْرِ، وَرَكْعَتَيْنِ بَعْدَهَا، وَرَكْعَتَيْنِ بَعْدَ المَغْرِبِ فِي بَيْتِهِ، وَرَكْعَتَيْنِ بَعْدَ العِشَاءِ فِي بَيْتِهِ، وَرَكْعَتَيْنِ قَبْلَ صَلاَةِ الصُّبْحِ، وَكَانَتْ سَاعَةً لاَ يُدْخَلُ عَلَى النَّبِيِّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ فِيهَا، حَدَّثَتْنِي حَفْصَةُ أَنَّهُ كَانَ إِذَا أَذَّنَ المُؤَذِّنُ وَطَلَعَ الفَجْرُ صَلَّى رَكْعَتَيْنِ، وَفِي لَفْظٍ: أَنَّ النَّبِيَّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ كَانَ يُصَلِّي بَعْدَ الْجُمُعَةِ رَكْعَتَيْنِ.

### Ibn Baz, fatwa 1432

- Link: https://binbaz.org.sa/fatwas/1432/درجة-حديث-رحم-الله-رجلا-صلى-قبل-الظهر-اربعا
- Title (as on the site): «درجة حديث: «رحم الله رجلاً صلى قبل الظهر أربعاً»»
- Series: فتاوى الجامع الكبير; category: صلاة التطوع
- The two sentences this line rests on, verbatim from `data/processed/fatwas.jsonl`:

> أما الظهر فالرواتب في الظهر ست أربعًا قبلها، وثنتين بعدها

> وصلاة أربع قبل العصر مستحبة، وليست راتبة

The add-on quotes the first as «الرواتب في الظهر ست: أربعًا قبلها، وثنتين بعدها»; the fatwa's own text has no colon
and begins «أما الظهر فالرواتب…», as above. The full answer:

> هذا الحديث حديث صحيح عن أم حبيبة -رضي الله عنها- بنت أبي سفيان أن النبي -عليه الصلاة والسلام- قال: من صلى أربعًا قبل الظهر، وأربعًا بعدها؛ حرمه الله على النار رواه أحمد، وأهل السنن الأربعة بإسناد جيد.
> أما حديث رحم الله.. فهذا في العصر رحم الله امرأ صلى أربعًا قبل العصر وهو حديث جيد أيضًا.
> وصلاة أربع قبل العصر مستحبة، وليست راتبة، أما الظهر فالرواتب في الظهر ست أربعًا قبلها، وثنتين بعدها.
> أما أربعًا بعدها فليست راتبة، لكن مستحبة بعدها، وإن صلى ثنتين بعدها، وأربعًا قبلها فهذه الراتبة، وإن صلى أربعًا قبلها وأربعًا بعدها؛ كان أفضل، وأفضل.

## Where the sources are shown in the app

The prayer times page has a line under the times, «السنن الرواتب ✦ الأحاديث والفتوى», that opens a sheet with
the three hadiths, each by its HadeethEnc `title` (in the interface's language where our data has it, else the Arabic
one marked as Arabic; 65715 is in Arabic only), its attribution and grade as HadeethEnc gives them, and a button to its
page in the app; and Ibn Baz's fatwa as «فتوى ابن باز ١٤٣٢» (the sheikh and the number in the language's digits) with
its series «فتاوى الجامع الكبير» and its link. The fatwa's own title, «درجة حديث: «رحم الله رجلاً صلى قبل الظهر
أربعاً»», is not shown: under a list of four before Dhuhr it would read as a hadith for it, while the fatwa says that
wording is about Asr. The widgets carry no links of their own; a tap opens the times page.

## Colours and contrast (measured)

On the widgets' paper (`relay/w1/0072-review-queue/sunan.html` has the numbers per render; text-free paper pixels of
the rendered widget, iPhone 16 Pro Max at 3x):

| Colour | Use | On the paper's mean (#ede4ce) | On its darkest 1% (#e7dcc7) |
|---|---|---|---|
| #1e3a6b lapis | the fard | 8.86:1 | 8.26:1 |
| #8c6d2a (asked for) | the sunnahs | 3.83:1, under 4.5:1 | 3.57:1 |
| #795d24 (used) | the sunnahs and the separators | 4.87:1 | 4.54:1 |

#795d24 is the same gold a little deeper (×0.86), and the app's own AA dark gold (`--gold-dark`). The times page uses
`--primary` (#1e3a6b) and `--gold-dark` (#795d24): 11.2:1 and 6.2:1 on the card, 8.6:1 and 4.7:1 on the next prayer's
blue tint. On the next prayer's gold pill the line is white, as the prayer's name there; the rows already past are
faded to half, as the whole row always was.
