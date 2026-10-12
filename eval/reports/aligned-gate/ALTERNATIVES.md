# بدائل بوابة الترجمات المحاذاة: مقارنة على الـ402 المحكوم عليها (الملحق 0031-add8)

معيار النجاح (من المنسّق): إمساك 19 من 21 فاشلة على الأقل، ورفض خاطئ لا يتجاوز 40 من 381.
النماذج: (أ) و(ج) `@cf/moonshotai/kimi-k2.6`، (ب) `@cf/deepseek-ai/deepseek-v4-pro-0813`؛ الحرارة 0، JSON، بلا تفكير.


| البديل | البنود المقيسة | الفاشلة الممسوكة | الناجحة المرفوضة خطأً | أخطاء بلا حكم | النيورونات | التكلفة | يحقق المعيار |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (أ) حَكَم بالجمل | 402 / 402 | 14 / 21 | 136 / 381 | 2 | 25301 | $0.278 | لا (أيًّا كانت البنود بلا حكم) |
| (ب) حَكَم بالجمل، النموذج الثاني | 402 / 402 | 2 / 21 | 9 / 381 | 1 | 32627 | $0.359 | لا (أيًّا كانت البنود بلا حكم) |
| (ج) أسئلة وأجوبة | 402 / 402 | 16 / 21 | 171 / 381 | 6 | 101087 | $1.112 | لا (أيًّا كانت البنود بلا حكم) |

## (أ) حَكَم بالجمل: الفاشلة التي لم تُمسك

| البند | النتيجة | سبب الفشل كما في حكم المراجع |
| --- | --- | --- |
| quran:42:13|tr | مرّ | Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه). |
| quran:4:87|tr | مرّ | المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity. |
| quran:64:13|hi | مرّ | 'المؤمنون بوحدانيته' (those who believe in His oneness) rendered 'ईमानवालों को अपनी एकता में' (believers, in their own unity) - qualifier changed, new idea added |
| quran:59:23|fr | مرّ | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |
| quran:37:35|fr | مرّ | "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer) |
| quran:48:26|fr | خطأ: unreadable: {"verdicts": [{"n": 1, "same": false, "reason": "Arabic has 'الأنَفَة' twice, translation has 'orgueil' twice but omits  | S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent |
| quran:3:18|hi | مرّ | 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed |

## (ب) حَكَم بالجمل، النموذج الثاني: الفاشلة التي لم تُمسك

| البند | النتيجة | سبب الفشل كما في حكم المراجع |
| --- | --- | --- |
| quran:3:19|fr | مرّ | S4 "Allah est prompt à rendre compte" reverses سريع الحساب (swift in calling to account → quick to give account); should be "prompt à demander compte" |
| quran:2:285|fr | مرّ | S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses |
| quran:2:285|bn | مرّ | S1: 'لا نؤمن ببعضهم وننكر بعضهم' (we do not believe in some and deny others) rendered 'তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না' (we do not believe in any of them and do not deny any) - creedal clause reversed/contradictory; also 'رسول الله' reduced to 'রাসূল' and clumsy 'তার জন্য নিশ্চিত করা উচিত ছিল' |
| quran:42:13|tr | مرّ | Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه). |
| quran:42:13|fr | مرّ | broken French: "Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir…" (dangling preposition, unparseable clause) |
| quran:2:255|id | مرّ | S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet) |
| quran:2:255|ms | مرّ | Garbled grammar in s1: 'Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia' reads on its face as Allah not entitled to divinity; malformed 'tidak mengantuk-Nya iaitu: rasa kantuk'; broken word 'Subhanah' in s2; 'al-Qa'im ala kulli shay' rendered 'berdiri sendiri atas segala sesuatu' |
| quran:2:255|fr | مرّ | Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature |
| quran:2:255|es | مرّ | S2-S3: الكرسي rendered 'Trono' (Throne, = العرش) — 'Su Trono (Kursi) ... el Trono (Kursi) es el lugar de los pies del Señor' conflates al-Kursi with the Throne, contradicting the Muyassar's own gloss that the Kursi is the place of the two feet; 'Versículo del Trono' repeats it. S1: 'Dios, que no merece la divinidad y la adoración sino Él' is garbled — reads as God not deserving divinity (Arabic: none deserves divinity and worship except Him). S2: 'soberbia' (arrogance) for الكبرياء |
| quran:4:87|tr | مرّ | المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity. |
| quran:64:13|hi | مرّ | 'المؤمنون بوحدانيته' (those who believe in His oneness) rendered 'ईमानवालों को अपनी एकता में' (believers, in their own unity) - qualifier changed, new idea added |
| quran:48:26|ur | مرّ | s1: 'إذ جعل الذين كفروا في قلوبهم الأنفة' rendered 'جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی' - an unnamed 'they' puts the arrogance into the disbelievers' hearts instead of the disbelievers harbouring it themselves (agent changed); 'الأنفة' weakened to 'ضد'; s2: 'دون المشركين' (not the polytheists) mistranslated 'مشرکوں کے بغیر' (without the polytheists) |
| quran:6:19|id | مرّ | S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted |
| quran:6:19|ms | مرّ | s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted |
| quran:59:23|fr | مرّ | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |
| quran:37:35|fr | مرّ | "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer) |
| quran:48:26|fr | مرّ | S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent |
| quran:3:18|hi | مرّ | 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed |
| quran:6:19|fr | مرّ | S2 "ce que vous allez Lui dire" changes the addressee; Arabic ما أنتم قائلونه لي = what you say to me (the Messenger) |

## (ج) أسئلة وأجوبة: الفاشلة التي لم تُمسك

| البند | النتيجة | سبب الفشل كما في حكم المراجع |
| --- | --- | --- |
| quran:2:285|fr | مرّ | S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses |
| quran:2:255|id | مرّ | S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet) |
| quran:2:255|fr | مرّ | Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature |
| quran:6:19|ms | مرّ | s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted |
| quran:59:23|fr | مرّ | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |

مجموع النيورونات في القياس كله، ومعه تجربة أولى أُوقفت (3353 نيورون، مخرجات مقطوعة): 162369 (≈ $1.786 بسعر ما فوق الحصة المجانية).
