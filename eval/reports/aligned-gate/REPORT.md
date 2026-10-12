# بوابة آلية للترجمات المحاذاة: قياس على البنود المحكوم عليها (الملحق 0031-add4، الجزء ب)

البنود: 402 (ناجحة 381، فاشلة 21). البند يُمسك حين تقل درجته عن العتبة.

توزيع الدرجات: الإشارة 1 في الفاشلة وسيطها 0.781 وفي الناجحة 0.821؛ الإشارة 2 في الفاشلة 0.895 وفي الناجحة 0.886.

## الإشارة 1: تشابه bge-m3 بين الجملة العربية وترجمتها

| العتبة | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |
| --- | --- | --- |
| 0.50 | 0 / 21 | 0 / 381 |
| 0.55 | 0 / 21 | 0 / 381 |
| 0.60 | 0 / 21 | 0 / 381 |
| 0.65 | 1 / 21 | 0 / 381 |
| 0.70 | 1 / 21 | 5 / 381 |
| 0.72 | 2 / 21 | 15 / 381 |
| 0.75 | 6 / 21 | 45 / 381 |
| 0.78 | 10 / 21 | 90 / 381 |
| 0.80 | 11 / 21 | 125 / 381 |
| 0.82 | 17 / 21 | 184 / 381 |
| 0.85 | 19 / 21 | 293 / 381 |
| 0.88 | 21 / 21 | 363 / 381 |
| 0.90 | 21 / 21 | 380 / 381 |

## الإشارة 2: الترجمة العكسية ثم تشابه bge-m3 مع الأصل العربي

| العتبة | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |
| --- | --- | --- |
| 0.50 | 0 / 21 | 1 / 381 |
| 0.55 | 0 / 21 | 1 / 381 |
| 0.60 | 0 / 21 | 8 / 381 |
| 0.65 | 1 / 21 | 20 / 381 |
| 0.70 | 2 / 21 | 38 / 381 |
| 0.72 | 2 / 21 | 59 / 381 |
| 0.75 | 5 / 21 | 86 / 381 |
| 0.78 | 6 / 21 | 122 / 381 |
| 0.80 | 6 / 21 | 133 / 381 |
| 0.82 | 6 / 21 | 148 / 381 |
| 0.85 | 8 / 21 | 164 / 381 |
| 0.88 | 8 / 21 | 185 / 381 |
| 0.90 | 12 / 21 | 206 / 381 |

## الإشارتان معًا (يُمسك البند إذا قلّت أي منهما عن عتبتها)

| العتبتان (1، 2) | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |
| --- | --- | --- |
| 0.50، 0.50 | 0 / 21 | 1 / 381 |
| 0.50، 0.55 | 0 / 21 | 1 / 381 |
| 0.55، 0.50 | 0 / 21 | 1 / 381 |
| 0.55، 0.55 | 0 / 21 | 1 / 381 |
| 0.55، 0.60 | 0 / 21 | 8 / 381 |
| 0.60، 0.55 | 0 / 21 | 1 / 381 |
| 0.60، 0.60 | 0 / 21 | 8 / 381 |
| 0.60، 0.65 | 1 / 21 | 20 / 381 |
| 0.65، 0.60 | 1 / 21 | 8 / 381 |
| 0.65، 0.65 | 2 / 21 | 20 / 381 |
| 0.65، 0.70 | 3 / 21 | 38 / 381 |
| 0.70، 0.65 | 2 / 21 | 24 / 381 |
| 0.70، 0.70 | 3 / 21 | 42 / 381 |
| 0.70، 0.72 | 3 / 21 | 63 / 381 |
| 0.70، 0.75 | 5 / 21 | 90 / 381 |
| 0.72، 0.70 | 4 / 21 | 50 / 381 |
| 0.72، 0.72 | 4 / 21 | 71 / 381 |
| 0.72، 0.75 | 6 / 21 | 97 / 381 |
| 0.75، 0.70 | 6 / 21 | 76 / 381 |
| 0.75، 0.72 | 6 / 21 | 93 / 381 |
| 0.75، 0.75 | 8 / 21 | 119 / 381 |
| 0.75، 0.78 | 9 / 21 | 151 / 381 |
| 0.75، 0.80 | 9 / 21 | 161 / 381 |
| 0.78، 0.75 | 12 / 21 | 154 / 381 |
| 0.78، 0.78 | 12 / 21 | 185 / 381 |
| 0.78، 0.80 | 12 / 21 | 195 / 381 |
| 0.78، 0.82 | 12 / 21 | 207 / 381 |
| 0.80، 0.75 | 13 / 21 | 176 / 381 |
| 0.80، 0.78 | 13 / 21 | 205 / 381 |
| 0.80، 0.80 | 13 / 21 | 215 / 381 |
| 0.80، 0.82 | 13 / 21 | 227 / 381 |
| 0.80، 0.85 | 13 / 21 | 234 / 381 |
| 0.82، 0.78 | 19 / 21 | 243 / 381 |
| 0.82، 0.80 | 19 / 21 | 252 / 381 |
| 0.82، 0.82 | 19 / 21 | 264 / 381 |
| 0.82، 0.85 | 19 / 21 | 270 / 381 |
| 0.85، 0.80 | 20 / 21 | 328 / 381 |
| 0.85، 0.82 | 20 / 21 | 333 / 381 |
| 0.85، 0.85 | 20 / 21 | 336 / 381 |
| 0.85، 0.88 | 20 / 21 | 338 / 381 |
| 0.85، 0.90 | 20 / 21 | 339 / 381 |
| 0.88، 0.85 | 21 / 21 | 374 / 381 |
| 0.88، 0.88 | 21 / 21 | 374 / 381 |
| 0.88، 0.90 | 21 / 21 | 374 / 381 |
| 0.90، 0.85 | 21 / 21 | 380 / 381 |
| 0.90، 0.88 | 21 / 21 | 380 / 381 |
| 0.90، 0.90 | 21 / 21 | 380 / 381 |

## كل البنود الفاشلة ودرجاتها

| البند | الإشارة 1 | الإشارة 2 | سبب الفشل كما في حكم المراجع |
| --- | --- | --- | --- |
| quran:48:26|ur | 0.732 | 0.601 | s1: 'إذ جعل الذين كفروا في قلوبهم الأنفة' rendered 'جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی' - an unnamed 'they' puts the arrogance into the disbelievers' hearts instead of the disbelievers harbouring it themselves (agent changed); 'الأنفة' weakened to 'ضد'; s2: 'دون المشركين' (not the polytheists) mistranslated 'مشرکوں کے بغیر' (without the polytheists) |
| quran:51:56|tr | 0.736 | 0.664 | The verb 'created' (خلقت) is dropped; 'cinleri ve insanları ve tüm peygamberleri göndermem' makes jinn and mankind objects of 'send' and leaves the sentence without a finite negative verb; the verse's core statement is lost. |
| quran:48:26|fr | 0.626 | 0.731 | S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent |
| quran:64:13|hi | 0.842 | 0.747 | 'المؤمنون بوحدانيته' (those who believe in His oneness) rendered 'ईमानवालों को अपनी एकता में' (believers, in their own unity) - qualifier changed, new idea added |
| quran:2:285|bn | 0.855 | 0.748 | S1: 'لا نؤمن ببعضهم وننكر بعضهم' (we do not believe in some and deny others) rendered 'তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না' (we do not believe in any of them and do not deny any) - creedal clause reversed/contradictory; also 'رسول الله' reduced to 'রাসূল' and clumsy 'তার জন্য নিশ্চিত করা উচিত ছিল' |
| quran:3:18|hi | 0.766 | 0.779 | 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed |
| quran:3:19|fr | 0.720 | 0.845 | S4 "Allah est prompt à rendre compte" reverses سريع الحساب (swift in calling to account → quick to give account); should be "prompt à demander compte" |
| quran:2:21|hi | 0.713 | 0.846 | s2: 'أوجدكم من العدم' (brought you into being from non-existence) rendered 'अस्तित्व से पैदा किया' (created you from existence) - reversed meaning |
| quran:59:23|fr | 0.760 | 0.893 | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |
| quran:6:19|ms | 0.811 | 0.893 | s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted |
| quran:6:19|fr | 0.816 | 0.895 | S2 "ce que vous allez Lui dire" changes the addressee; Arabic ما أنتم قائلونه لي = what you say to me (the Messenger) |
| quran:6:19|id | 0.818 | 0.899 | S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted |
| quran:4:87|tr | 0.769 | 0.933 | المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity. |
| quran:37:35|fr | 0.743 | 0.937 | "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer) |
| quran:2:285|fr | 0.855 | 0.941 | S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses |
| quran:2:255|id | 0.806 | 0.955 | S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet) |
| quran:42:13|tr | 0.807 | 0.956 | Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه). |
| quran:2:255|es | 0.781 | 0.959 | S2-S3: الكرسي rendered 'Trono' (Throne, = العرش) — 'Su Trono (Kursi) ... el Trono (Kursi) es el lugar de los pies del Señor' conflates al-Kursi with the Throne, contradicting the Muyassar's own gloss that the Kursi is the place of the two feet; 'Versículo del Trono' repeats it. S1: 'Dios, que no merece la divinidad y la adoración sino Él' is garbled — reads as God not deserving divinity (Arabic: none deserves divinity and worship except Him). S2: 'soberbia' (arrogance) for الكبرياء |
| quran:2:255|fr | 0.774 | 0.962 | Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature |
| quran:42:13|fr | 0.841 | 0.965 | broken French: "Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir…" (dangling preposition, unparseable clause) |
| quran:2:255|ms | 0.809 | 0.967 | Garbled grammar in s1: 'Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia' reads on its face as Allah not entitled to divinity; malformed 'tidak mengantuk-Nya iaitu: rasa kantuk'; broken word 'Subhanah' in s2; 'al-Qa'im ala kulli shay' rendered 'berdiri sendiri atas segala sesuatu' |

## التكلفة

نداءات النموذج في هذا التشغيل: 406 (والمحفوظة من قبل 0)؛ مجموع الرموز في كل الترجمات العكسية: مدخلات 95224، مخرجات 59203، ونيورونات 10903 كما أعادها Workers AI (≈ $0.120 بسعر ما فوق الحصة المجانية). نداءات التضمين: 31 (1540 نصًا).
