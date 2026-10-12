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

## الملحق 0031-add11: (د) حَكَم بمرجع بشري، و(هـ) منع الخطأ عند التوليد

دقة المعروض = الناجح المعروض ÷ كل المعروض؛ التغطية = المعروض ÷ 402. «المعروض» ما لم يُمسَك (والبند بلا حكم يُعدّ ممسوكًا لا معروضًا). البند الممسوك يُعرض مكانه الميسر العربي مع الترجمة البشرية للآية.

| البديل | الفاشلة الممسوكة | الناجحة المرفوضة خطأً | بلا حكم | المعروض | دقة المعروض | التغطية | النيورونات | يحقق المعيار |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (أ) حَكَم بالجمل، Kimi K2.6 (الملحق 8) | 14 / 21 | 136 / 381 | 2 | 250 | 97.6% (244/250) | 62.2% | 25301 | — |
| (ب) حَكَم بالجمل، DeepSeek V4 Pro (الملحق 8) | 2 / 21 | 9 / 381 | 1 | 390 | 95.1% (371/390) | 97.0% | 32627 | — |
| (ج) أسئلة وأجوبة، Kimi K2.6 (الملحق 8) | 16 / 21 | 171 / 381 | 6 | 209 | 97.6% (204/209) | 52.0% | 101087 | — |
| (د) حَكَم بمرجع بشري، Kimi K2.6 | 16 / 21 | 126 / 381 | 0 | 260 | 98.1% (255/260) | 64.7% | 26658 | لا |

للمقارنة: عرض كل البنود بلا بوابة دقته 94.8% (381/402) وتغطيته 100%.

### (د): الفاشلة التي لم تُمسك

| البند | النتيجة | سبب الفشل كما في حكم المراجع |
| --- | --- | --- |
| quran:42:13|tr | مرّ | Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه). |
| quran:4:87|tr | مرّ | المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity. |
| quran:59:23|fr | مرّ | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |
| quran:37:35|fr | مرّ | "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer) |
| quran:3:18|hi | مرّ | 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed |

### (هـ) التوليد بمسرد من الترجمة البشرية: DeepSeek V4 Flash

العينة: الفاشلة الـ21 كلها، و40 ناجحة بالبذرة 20261013 (mulberry32). الحكم أعمى: المخرجات الجديدة من (هـ1) و(هـ2) مخلوطة بترتيب عشوائي، بلا الحكم القديم ولا اسم الطريقة، بمعيار المراجعة الأصلي (FAITHFUL وTERMS وLANGUAGE وقاعدة النجاح نفسها)، حكم عليها مراجع لم يرَ أيها كان فاشلًا.

| | صار ناجحًا من الـ21 | صار فاشلًا من الـ40 | بلا مخرج | النيورونات | يحقق المعيار (17/21 فأكثر، و1/40 فأقل) |
| --- | --- | --- | --- | --- | --- |
| (هـ1، التفكير مطفأ) | 10 / 21 | 3 / 40 | 0 | 2364 | لا |
| (هـ2، التفكير مفعّل) | 17 / 21 | 3 / 40 | 0 | 25729 | لا |

#### (هـ1) لكل بند: الجملة قبل وبعد، والحكم

**quran:3:19|fr** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor)
- سبب الفشل القديم: S4 "Allah est prompt à rendre compte" reverses سريع الحساب (swift in calling to account → quick to give account); should be "prompt à demander compte"
- ج1 قبل: La religion qu'Allah a agréée pour Ses créatures et pour laquelle Il a envoyé Ses messagers, et qu'Il n'accepte pas autre qu'elle, est l'islam, qui est la soumission à Allah seul par l'obéissance et l'abandon à Lui par l'adoration, et le suivi des messagers dans ce qu'Allah les a envoyés à chaque époque jusqu'à ce qu'ils soient scellés par Muhammad, paix et salut sur lui, après l'envoi duquel Allah n'accepte de personne une religion autre que l'islam avec lequel il a été envoyé.
- ج1 بعد: Certes, la religion qu'Allah a agréée pour Ses créatures et par laquelle Il a envoyé Ses messagers, et qu'Il n'accepte pas autre qu'elle, est l'Islam, qui est la soumission à Allah seul par l'obéissance, l'abandon à Lui par l'adoration, et le suivi des messagers dans ce qu'Allah les a envoyés à chaque époque jusqu'à ce qu'ils soient scellés par Muhammad, prière et salut sur lui, après l'envoi duquel Allah n'accepte de personne une religion autre que l'Islam avec lequel il a été envoyé.
- ج2 قبل: Et la divergence entre les gens du Livre, juifs et chrétiens, ne s'est produite, et ils ne se sont divisés en sectes et en partis, qu'après que la preuve leur a été établie par l'envoi des messagers et la descente des livres ;
- ج2 بعد: Et la divergence entre les gens du Livre, juifs et chrétiens, ne s'est produite, se divisant en sectes et en partis, qu'après que la preuve leur a été établie par l'envoi des messagers et la révélation des livres,
- ج3 قبل: par transgression et envie, recherchant les biens de ce monde.
- ج3 بعد: par agressivité et envie, recherchant la vie d'ici-bas.
- ج4 قبل: Et quiconque renie les versets révélés d'Allah et Ses signes indiquant Sa seigneurie et Sa divinité, alors Allah est prompt à rendre compte, et Il les rétribuera pour ce qu'ils faisaient.
- ج4 بعد: Et quiconque renie les signes d'Allah révélés et Ses signes indiquant Sa seigneurie et Sa divinité, alors Allah est prompt à demander compte, et Il les rétribuera pour ce qu'ils faisaient.

**quran:2:285|fr** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE ok): S1: 'nous ne croyons pas en certains et ne renions pas d'autres' shifts the negation; Arabic denies believing in some while denying others.
- سبب الفشل القديم: S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses
- ج1 قبل: Il a cru et a eu la certitude, le Messager d'Allah, Muhammad, paix et salut sur lui, en ce qui lui a été révélé de son Seigneur, et il lui est juste d'avoir la certitude, et les croyants de même ont cru et ont œuvré selon le Coran sublime, chacun d'eux a cru en Allah comme Seigneur et divinité, doté des attributs de majesté et de perfection, et qu'Allah a des anges honorables, et qu'Il a fait descendre des livres, et qu'Il a envoyé à Ses créatures des messagers, nous ne croyons pas - nous, les croyants - en certains et nous nions certains, mais nous croyons en eux tous.
- ج1 بعد: Le Messager de Dieu, Muhammad, que la prière et la paix soient sur lui, a cru et a été certain de ce qui lui a été révélé de son Seigneur, et il lui est juste d'être certain, et les croyants de même ont cru et ont agi selon le noble Coran, chacun d'eux a cru en Dieu comme Seigneur et divinité, doté des attributs de majesté et de perfection, et que Dieu a des anges honorés, et qu'Il a fait descendre des livres, et a envoyé à Ses créatures des messagers, nous ne croyons pas - nous, les croyants - en certains d'entre eux et ne renions pas d'autres, mais nous croyons en eux tous.
- ج2 قبل: Et le Messager et les croyants ont dit : Nous avons entendu, ô notre Seigneur, ce que Tu as révélé, et nous avons obéi en tout cela, nous espérons que Tu pardonnes - par Ta grâce - nos péchés, car Tu es Celui qui nous a éduqués par ce dont Tu nous as gratifiés, et vers Toi - seul - est notre retour et notre destinée.
- ج2 بعد: Et le Messager et les croyants ont dit : Nous avons entendu, ô notre Seigneur, ce que Tu as révélé, et nous avons obéi en tout cela, nous espérons que Tu pardonneras - par Ta grâce - nos péchés, car Tu es Celui qui nous a éduqués par ce dont Tu nous as gratifiés, et vers Toi - seul - est notre retour et notre destin.

**quran:2:285|bn** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE minor): S1: 'তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না' says we believe in none and deny none; negation scope reversed.
- سبب الفشل القديم: S1: 'لا نؤمن ببعضهم وننكر بعضهم' (we do not believe in some and deny others) rendered 'তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না' (we do not believe in any of them and do not deny any) - creedal clause reversed/contradictory; also 'رسول الله' reduced to 'রাসূল' and clumsy 'তার জন্য নিশ্চিত করা উচিত ছিল'
- ج1 قبل: রাসূল মুহাম্মদ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম তার রবের কাছ থেকে যা ওহি করা হয়েছে তা সত্য বলে বিশ্বাস করেছেন এবং নিশ্চিত করেছেন, এবং তার জন্য নিশ্চিত করা উচিত ছিল, এবং মুমিনরাও তেমনই সত্য বলে বিশ্বাস করেছেন এবং মহান কুরআন অনুযায়ী আমল করেছেন, তাদের প্রত্যেকে আল্লাহকে রব এবং ইলাহ হিসেবে বিশ্বাস করেছে যিনি মহিমা ও পূর্ণতার গুণে গুণান্বিত, এবং আল্লাহর রয়েছে সম্মানিত ফেরেশতারা, এবং তিনি কিতাবসমূহ নাযিল করেছেন, এবং তার সৃষ্টির কাছে রাসূলগণ পাঠিয়েছেন—আমরা মুমিনরা তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না, বরং আমরা তাদের সকলকে বিশ্বাস করি।
- ج1 بعد: রাসূল মুহাম্মদ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম বিশ্বাস করেছেন এবং নিশ্চিত করেছেন যা তাঁর রবের পক্ষ থেকে তাঁর কাছে ওহী করা হয়েছে এবং তাঁর জন্য বিশ্বাস করা উচিত, আর মুমিনগণও তেমনই বিশ্বাস করেছেন এবং মহান কুরআন অনুযায়ী আমল করেছেন, তাদের প্রত্যেকে আল্লাহকে রব ও ইলাহ হিসেবে বিশ্বাস করেছে যিনি মহিমা ও পরিপূর্ণতার গুণে গুণান্বিত, এবং আল্লাহর রয়েছে সম্মানিত ফেরেশতাগণ, এবং তিনি কিতাবসমূহ নাযিল করেছেন, এবং তাঁর সৃষ্টির প্রতি রাসূলগণ পাঠিয়েছেন—আমরা মুমিনগণ তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না, বরং আমরা তাদের সকলকে বিশ্বাস করি।
- ج2 قبل: এবং রাসূল ও মুমিনরা বলেছেন: হে আমাদের রব, আমরা শুনেছি যা আপনি ওহি করেছেন, এবং আমরা সবকিছুতে আনুগত্য করেছি, আমরা আশা করি যে আপনি—আপনার অনুগ্রহে—আমাদের গুনাহ ক্ষমা করবেন, কারণ আপনিই আমাদেরকে আপনার অনুগ্রহে লালন-পালন করেছেন, এবং আপনার দিকেই—একমাত্র—আমাদের প্রত্যাবর্তন ও পরিণতি।
- ج2 بعد: আর রাসূল ও মুমিনগণ বলেছেন: আমরা শুনেছি হে আমাদের রব, যা আপনি ওহী করেছেন, এবং আমরা সে সবকিছুতে আনুগত্য করেছি, আমরা আশা করি যে আপনি—আপনার অনুগ্রহে—আমাদের পাপ ক্ষমা করবেন, কারণ আপনিই আমাদের লালন-পালন করেছেন যা আপনি আমাদের প্রতি অনুগ্রহ করেছেন, এবং আপনারই—একমাত্র—আমাদের প্রত্যাবর্তন ও পরিণতি।

**quran:51:56|tr** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE problem): S1: 'elçileri göndermemi ... yarattım' (I created my sending) is broken; 'gibi' (such as) weakens 'which is worship of Me alone'.
- سبب الفشل القديم: The verb 'created' (خلقت) is dropped; 'cinleri ve insanları ve tüm peygamberleri göndermem' makes jinn and mankind objects of 'send' and leaves the sentence without a finite negative verb; the verse's core statement is lost.
- ج1 قبل: Ve ben cinleri ve insanları ve tüm peygamberleri göndermem, yalnızca yüce bir gaye için: yalnızca bana ibadet etmeleri için, benden başkasına değil.
- ج1 بعد: Ben cinleri ve insanları ve tüm elçileri göndermemi, yalnızca Bana kulluk etmek gibi yüce bir gaye için yarattım; Benden başkasına değil.

**quran:42:13|tr** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE problem): S1: 'size vahyettiğimiz' changes 'revealed to you, O Messenger' to 'to you people'; omits Noah's charge 'to practice and convey it'; clause garbled.
- سبب الفشل القديم: Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه).
- ج1 قبل: Allah, ey insanlar, size vahyettiğimiz dinden -ki o İslam'dır- Nuh'a tavsiye ettiği şeyi, İbrahim, Musa ve İsa'ya da tavsiye ettiğimiz şeyi meşru kıldı (bu beşi, meşhur görüşe göre, azim sahibi peygamberlerdir): Dini tevhid, Allah'a itaat ve O'ndan başkasına ibadet etmeme üzere ikame edin ve size emrettiğim din hakkında ihtilafa düşmeyin. Müşriklere, onları davet ettiğin tevhid ve ibadeti Allah'a has kılma ağır geldi. Allah, tevhid için kullarından dilediğini seçer ve O'na dönenleri itaatine çalışmak üzere muvaffak kılar.
- ج1 بعد: Allah, size -ey insanlar- size vahyettiğimiz dini -ki o İslam'dır- Nuh'a emrettiği şeyleri de size din olarak buyurmuştur; ve İbrahim'e, Musa'ya ve İsa'ya da vasiyet ettiğimiz şeyleri (bu beşi meşhur görüşe göre ulu'l-azm peygamberlerdir) ki: 'Dini tevhid ile, Allah'a itaat ve O'ndan başkasına ibadet etmeksizin ikame edin ve size emrettiğim din konusunda ayrılığa düşmeyin.' Müşriklerin gözünde, onları davet ettiğin Allah'ı birleme ve ibadeti O'na has kılma büyük göründü. Allah, yaratıklarından dilediğini tevhid için seçer ve kendisine döneni de O'na itaatle amel etmeye muvaffak kılar.

**quran:42:13|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'vous a légiféré' is awkward French for 'prescribed for you'; meaning intact.
- سبب الفشل القديم: broken French: "Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir…" (dangling preposition, unparseable clause)
- ج1 قبل: Dieu a établi pour vous, ô gens, de la religion que Nous t'avons révélée — ô Messager, à savoir l'islam — ce qu'Il a recommandé à Noé de pratiquer et de transmettre, et ce que Nous avons recommandé à Abraham, Moïse et Jésus (ces cinq sont, selon l'avis célèbre, les messagers doués de fermeté) : d'établir la religion par le monothéisme, l'obéissance à Dieu et Son adoration à Lui seul, sans autre que Lui, et de ne pas diverger dans la religion que Je vous ai ordonnée. Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir l'unicité de Dieu et la sincérité de l'adoration pour Lui. Dieu choisit pour le monothéisme qui Il veut parmi Ses créatures, et guide vers l'action selon Son obéissance celui qui revient à Lui.
- ج1 بعد: Allah vous a légiféré, ô gens, dans la religion que Nous t'avons révélée, ô Messager, à savoir l'islam, ce qu'Il avait enjoint à Noé de pratiquer et de transmettre, et ce que Nous avons enjoint à Abraham, à Moïse et à Jésus (ces cinq sont, selon l'avis connu, les prophètes doués de fermeté parmi les messagers) : «Établissez la religion par l'unicité d'Allah, l'obéissance à Allah et Son adoration sans rien d'autre que Lui, et ne divergez pas dans la religion que Je vous ai ordonnée.» Ce à quoi tu les appelles, à savoir l'unicité d'Allah et la sincérité de l'adoration envers Lui, paraît énorme aux associateurs. Allah choisit pour l'unicité qui Il veut parmi Ses créatures, et guide vers l'action dans Son obéissance celui qui revient vers Lui.

**quran:2:21|hi** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: s2: 'أوجدكم من العدم' (brought you into being from non-existence) rendered 'अस्तित्व से पैदा किया' (created you from existence) - reversed meaning
- ج1 قبل: अल्लाह की ओर से सभी मनुष्यों के लिए पुकार: कि अल्लाह की इबादत करो जिसने तुम्हें अपनी नेमतों से पाला, और उससे डरो और उसके दीन की खिलाफ़त न करो;
- ج1 بعد: अल्लाह की ओर से सभी मनुष्यों को पुकार है: कि अल्लाह की इबादत करो, जिसने अपनी नेमतों से तुम्हारा पालन-पोषण किया, और उससे डरो और उसके दीन का उल्लंघन न करो;
- ج2 قبل: क्योंकि उसने तुम्हें अस्तित्व से पैदा किया, और तुमसे पहले वालों को भी पैदा किया;
- ج2 بعد: क्योंकि उसने तुम्हें अस्तित्वहीनता से पैदा किया, और तुमसे पहले के लोगों को भी पैदा किया;
- ج3 قبل: ताकि तुम उन मुत्तक़ियों में से हो जाओ जिनसे अल्लाह राज़ी हुआ और वे उससे राज़ी हुए।
- ج3 بعد: ताकि तुम मुत्तक़ियों में से बनो, जिनसे अल्लाह राज़ी हुआ और वे उससे राज़ी हुए।

**quran:2:255|id** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor): S1: the gloss 'i.e. drowsiness' after sinah is folded into 'tidak mengantuk'; 'Maha Berdiri Sendiri' is the conventional al-Qayyum rendering.
- سبب الفشل القديم: S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet)
- ج1 قبل: Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia, Yang Maha Hidup yang memiliki semua makna kehidupan yang sempurna sebagaimana layaknya keagungan-Nya, Yang Maha Berdiri sendiri atas segala sesuatu, tidak mengantuk-Nya yaitu: kantuk, dan tidak tidur, segala yang di langit dan di bumi adalah milik-Nya, dan tidak ada seorang pun yang berani memberi syafaat di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi semua makhluk baik yang telah lalu, sekarang, dan yang akan datang, Dia mengetahui apa yang di hadapan makhluk dari perkara yang akan datang, dan apa yang di belakang mereka dari perkara yang telah lalu, dan tidak ada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Dia ajarkan dan beritahukan kepadanya.
- ج1 بعد: Allah yang tidak berhak disembah dan diibadahi kecuali Dia, Yang Maha Hidup yang memiliki segala makna kehidupan yang sempurna sesuai dengan keagungan-Nya, Yang Maha Berdiri Sendiri atas segala sesuatu, tidak mengantuk dan tidak tidur, segala yang ada di langit dan di bumi adalah milik-Nya, dan tidak ada seorang pun yang berani memberi syafa'at di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi seluruh makhluk, masa lalu, sekarang, dan masa depannya, Dia mengetahui perkara-perkara yang akan datang di hadapan makhluk, dan perkara-perkara yang telah lalu di belakang mereka, dan tidak ada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali apa yang Allah beritahukan dan perlihatkan kepadanya.
- ج2 قبل: Meliputi kursi-Nya langit dan bumi, dan kursi: adalah tempat kedua kaki Tuhan -Maha Agung kebesaran-Nya- dan tidak diketahui bagaimana bentuknya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanahu menjaga keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya atas semua makhluk-Nya, Yang Maha Mengumpulkan semua sifat keagungan dan kebesaran.
- ج2 بعد: Kursi-Nya meliputi langit dan bumi, dan kursi adalah tempat kedua kaki Rabb -Maha Agung kebesaran-Nya- dan tidak ada yang mengetahui hakikatnya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanahu memelihara keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya di atas semua makhluk-Nya, yang mengumpulkan semua sifat keagungan dan kebesaran.
- ج3 قبل: Dan ayat ini adalah ayat yang paling agung dalam Al-Qur'an, dan disebut: (Ayat Kursi).
- ج3 بعد: Dan ayat ini adalah ayat yang paling agung dalam Al-Qur'an, dan dinamakan: (Ayat Kursi).

**quran:2:255|ms** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE minor): S1: al-Qa'im 'ala kull shay' rendered 'Yang Maha Berdiri atas segala sesuatu' (Most Standing upon all things), not 'who maintains all things'.
- سبب الفشل القديم: Garbled grammar in s1: 'Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia' reads on its face as Allah not entitled to divinity; malformed 'tidak mengantuk-Nya iaitu: rasa kantuk'; broken word 'Subhanah' in s2; 'al-Qa'im ala kulli shay' rendered 'berdiri sendiri atas segala sesuatu'
- ج1 قبل: Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia, yang Maha Hidup yang memiliki semua makna kehidupan yang sempurna sebagaimana layaknya keagungan-Nya, yang berdiri sendiri atas segala sesuatu, tidak mengantuk-Nya iaitu: rasa kantuk, dan tidak tidur, segala yang di langit dan di bumi adalah milik-Nya, dan tiada seorang pun berani memberi syafaat di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi semua makhluk yang telah lalu, sekarang dan akan datang, Dia mengetahui apa yang di hadapan makhluk dari perkara yang akan datang, dan apa yang di belakang mereka dari perkara yang telah lalu, dan tiada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Dia ajarkan dan beritahukan kepadanya.
- ج1 بعد: Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia, Yang Maha Hidup yang memiliki segala makna kehidupan yang sempurna sebagaimana layaknya keagungan-Nya, Yang Maha Berdiri atas segala sesuatu, tidak mengantuk iaitu: tidak mengantuk, dan tidak tidur, segala yang ada di langit dan yang ada di bumi adalah milik-Nya, dan tidak ada seorang pun yang berani memberi syafaat di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi seluruh makhluk, yang telah lalu, yang sekarang, dan yang akan datang, Dia mengetahui apa yang ada di hadapan makhluk dari perkara yang akan datang, dan apa yang ada di belakang mereka dari perkara yang telah lalu, dan tidak ada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Allah ajarkan dan beritahukan kepadanya.
- ج2 قبل: Kursi-Nya meliputi langit dan bumi, dan kursi itu: adalah tempat tapak kaki Tuhan -Maha Mulia keagungan-Nya- dan tiada yang mengetahui hakikatnya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanah menjaga keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya atas semua makhluk-Nya, yang menghimpun semua sifat keagungan dan kebesaran.
- ج2 بعد: Kursi-Nya meliputi langit dan bumi, dan Kursi itu adalah tempat tapak kaki Tuhan - Maha Suci keagungan-Nya - dan tidak ada yang mengetahui hakikatnya kecuali Allah Subhanahu, dan tidak memberatkan-Nya menjaga keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya atas semua makhluk-Nya, yang mengumpulkan semua sifat keagungan dan kebesaran.

**quran:2:255|fr** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE minor): S2-S3: al-Kursi rendered 'Son Trône (Kursiy)' and 'le Verset du Trône'; S1 capitalised 'Lui a enseigné' points to Allah.
- سبب الفشل القديم: Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature
- ج1 قبل: Allah, qui seul mérite la divinité et l'adoration, le Vivant qui possède toutes les significations de la vie parfaite comme convient à Sa majesté, Celui qui veille sur toute chose, ni l'assoupissement, c'est-à-dire la somnolence, ni le sommeil ne Le saisissent, tout ce qui est dans les cieux et tout ce qui est sur la terre Lui appartient, et nul n'ose intercéder auprès de Lui sans Sa permission, Sa science englobe toutes les créatures, passées, présentes et futures, Il sait ce qui est devant les créatures des affaires futures, et ce qui est derrière eux des affaires passées, et nul parmi les créatures ne découvre quelque chose de Sa science sauf ce qu'Allah Lui a enseigné et Lui a révélé.
- ج1 بعد: Allah, qui seul mérite l'adoration et la servitude, est le Vivant, qui possède toutes les significations de la vie parfaite comme convient à Sa majesté, Celui qui subsiste par Lui-même sur toute chose, ni somnolence, c'est-à-dire l'assoupissement, ni sommeil ne Le saisissent, tout ce qui est dans les cieux et sur la terre Lui appartient, et personne n'ose intercéder auprès de Lui sans Sa permission, Sa science embrasse toutes les créatures, passées, présentes et futures, Il connaît ce qui est devant les créatures des affaires futures, et ce qui est derrière eux des affaires passées, et aucun des créatures ne peut accéder à quelque chose de Sa science excepté ce qu'Allah Lui a enseigné et révélé.
- ج2 قبل: Son Trône s'étend sur les cieux et la terre, et le Trône : c'est l'endroit des pieds du Seigneur - que Sa majesté soit exaltée - et nul ne connaît sa modalité sauf Allah, le Glorieux, et la préservation des deux ne Lui pèse pas, et Il est Élevé par Son essence et Ses attributs au-dessus de toutes Ses créatures, Celui qui rassemble tous les attributs de grandeur et de majesté.
- ج2 بعد: Son Trône (Kursiy) déborde les cieux et la terre, et le Trône (Kursiy) est l'emplacement des pieds du Seigneur - que Sa majesté soit exaltée - et nul ne connaît sa nature sauf Allah, le Glorieux, et la garde des cieux et de la terre ne Lui coûte aucune peine, et Il est élevé par Son essence et Ses attributs au-dessus de toutes Ses créatures, Celui qui rassemble tous les attributs de grandeur et de majesté.
- ج3 قبل: Et ce verset est le plus grand verset du Coran, et il est appelé : (le Verset du Trône).
- ج3 بعد: Et ce verset est le plus grand verset du Coran, et il est appelé : (le Verset du Trône, Ayat al-Kursiy).

**quran:2:255|es** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE ok): S3: Ayat al-Kursi rendered 'Aleya del Trono', making al-Kursi the Throne (S2 itself correctly uses 'escabel').
- سبب الفشل القديم: S2-S3: الكرسي rendered 'Trono' (Throne, = العرش) — 'Su Trono (Kursi) ... el Trono (Kursi) es el lugar de los pies del Señor' conflates al-Kursi with the Throne, contradicting the Muyassar's own gloss that the Kursi is the place of the two feet; 'Versículo del Trono' repeats it. S1: 'Dios, que no merece la divinidad y la adoración sino Él' is garbled — reads as God not deserving divinity (Arabic: none deserves divinity and worship except Him). S2: 'soberbia' (arrogance) for الكبرياء
- ج1 قبل: Dios, que no merece la divinidad y la adoración sino Él, el Viviente que posee todos los significados de la vida perfecta como corresponde a Su majestad, el que se mantiene sobre todas las cosas, no Le sobreviene somnolencia, es decir, sueño ligero, ni sueño profundo; todo lo que hay en los cielos y en la tierra Le pertenece, y nadie se atreve a interceder ante Él excepto con Su permiso; Su conocimiento abarca todas las criaturas, pasadas, presentes y futuras; sabe lo que está delante de las criaturas de asuntos futuros y lo que hay detrás de ellas de asuntos pasados, y ninguno de los seres creados accede a algo de Su conocimiento excepto por lo que Dios le ha enseñado y le ha revelado.
- ج1 بعد: Al-lah, Quien no merece la divinidad y la adoración sino Él, el Viviente, Quien posee todos los significados de la vida perfecta como corresponde a Su majestad, el Sustentador de todo, no Le afecta somnolencia, es decir, sueño ligero, ni sueño; todo lo que hay en los cielos y lo que hay en la tierra Le pertenece, y nadie se atreve a interceder ante Él excepto con Su permiso; Su conocimiento abarca todas las criaturas, su pasado, su presente y su futuro; sabe lo que está delante de las criaturas de asuntos futuros y lo que está detrás de ellas de asuntos pasados, y ninguno de los seres creados accede a algo de Su conocimiento excepto lo que Al-lah le ha enseñado y le ha revelado.
- ج2 قبل: Su Trono (Kursi) abarca los cielos y la tierra, y el Trono (Kursi) es el lugar de los pies del Señor —glorificada sea Su majestad— y nadie conoce su cualidad sino Dios, el Glorioso, y no Le pesa, Glorificado sea, preservarlos, y Él es el Altísimo por Su esencia y atributos sobre todas Sus criaturas, el que reúne todos los atributos de grandeza y soberbia.
- ج2 بعد: Su escabel abarca los cielos y la tierra, y el escabel es el lugar de los pies del Señor —glorificado sea—, y nadie conoce su cualidad sino Al-lah, el Glorificado, y no Le resulta pesado preservarlos, y Él es el Elevado por Su esencia y Sus atributos sobre todas Sus criaturas, el que reúne todos los atributos de grandeza y majestad.
- ج3 قبل: Y este versículo es el más grande versículo del Corán, y se llama: (Versículo del Trono).
- ج3 بعد: Y esta aleya es la más grandiosa del Corán, y se llama: (Aleya del Trono).

**quran:4:87|tr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- سبب الفشل القديم: المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity.
- ج1 قبل: Allah tek başına tüm yaratıklar için uluhiyyetle müteferriktir; sizi, hakkında hiçbir şüphe bulunmayan kıyamet gününde hesap ve ceza için mutlaka bir araya toplayacaktır.
- ج1 بعد: Allah, tüm yaratılmışlar için uluhiyette tek başına müteferrittir; sizi, hakkında şüphe olmayan kıyamet gününde, hesap ve karşılık için mutlaka toplayacaktır.
- ج2 قبل: Ve Allah'ın haber verdiği şeylerde sözünde O'ndan daha doğru sözlü hiç kimse yoktur.
- ج2 بعد: Ve Allah'ın haber verdiği şeylerde sözü O'ndan daha doğru kimse yoktur.

**quran:64:13|hi** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE problem): S1: 'उसकी एकता पर भरोसा करना चाहिए' makes His oneness the object of reliance; Arabic: believers in His oneness rely on Allah.
- سبب الفشل القديم: 'المؤمنون بوحدانيته' (those who believe in His oneness) rendered 'ईमानवालों को अपनी एकता में' (believers, in their own unity) - qualifier changed, new idea added
- ج1 قبل: अल्लाह अकेला है, उसके सिवा कोई सच्चा पूज्य नहीं; और अल्लाह ही पर ईमानवालों को अपनी एकता में हर मामले में भरोसा करना चाहिए।
- ج1 بعد: अल्लाह अकेला है, उसके सिवा कोई सच्चा पूज्य नहीं है, और अल्लाह ही पर ईमान वालों को उसकी एकता पर भरोसा करना चाहिए अपने सभी मामलों में।

**quran:48:26|ur** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: al-anafa (disdainful pride) rendered 'ضد' (obstinacy); nuance shift only.
- سبب الفشل القديم: s1: 'إذ جعل الذين كفروا في قلوبهم الأنفة' rendered 'جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی' - an unnamed 'they' puts the arrogance into the disbelievers' hearts instead of the disbelievers harbouring it themselves (agent changed); 'الأنفة' weakened to 'ضد'; s2: 'دون المشركين' (not the polytheists) mistranslated 'مشرکوں کے بغیر' (without the polytheists)
- ج1 قبل: جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی،
- ج1 بعد: جب کافروں نے اپنے دلوں میں ضد رکھی، ضد جاہلیت کی؛
- ج2 قبل: تاکہ وہ محمد صلی اللہ علیہ وسلم کی رسالت کو تسلیم نہ کریں، اور اسی میں سے ان کا حدیبیہ کے صلح نامے میں 'بسم اللہ الرحمن الرحیم' لکھنے سے انکار اور 'یہ وہ معاہدہ ہے جو محمد رسول اللہ نے کیا' لکھنے سے انکار تھا، تو اللہ نے اپنے رسول اور ان کے ساتھ ایمان لانے والوں پر سکون نازل کیا، اور انہیں 'لا إله إلا اللہ' کے قول کا پابند بنایا جو ہر تقویٰ کی جڑ ہے، اور رسول اللہ صلی اللہ علیہ وسلم اور ان کے ساتھ ایمان لانے والے مشرکوں سے تقویٰ کے کلمے کے زیادہ حقدار تھے، اور وہی اس کلمے کے اہل تھے مشرکوں کے بغیر۔
- ج2 بعد: تاکہ وہ محمد صلی اللہ علیہ وسلم کی رسالت کو تسلیم نہ کریں، اور اسی میں سے ان کا صلح حدیبیہ میں "بسم اللہ الرحمن الرحیم" لکھنے سے انکار اور "یہ وہ ہے جس پر محمد رسول اللہ نے مصالحت کی" لکھنے سے انکار بھی تھا، تو اللہ نے اپنے رسول اور ان کے ساتھ مومنین پر سکینت نازل فرمائی، اور انہیں "لا إله إلا اللہ" کے قول پر قائم رکھا جو ہر تقویٰ کی جڑ ہے، اور رسول اللہ صلی اللہ علیہ وسلم اور ان کے ساتھ مومنین مشرکوں سے تقویٰ کی اس بات کے زیادہ حقدار تھے، اور وہی اس بات کے اہل تھے، مشرک نہیں۔
- ج3 قبل: اور اللہ ہر چیز سے خوب واقف ہے، اس پر کوئی چیز پوشیدہ نہیں۔
- ج3 بعد: اور اللہ ہر چیز سے باخبر تھا، اس پر کوئی چیز پوشیدہ نہیں۔

**quran:6:19|id** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S2: 'azab-Nya yang akan menimpa kalian' for 'lest it befall you'; acceptable as a warning.
- سبب الفشل القديم: S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted
- ج1 قبل: Katakanlah -wahai Rasul kepada orang-orang musyrik ini-: 'Apakah sesuatu yang paling besar kesaksiannya dalam menetapkan kebenaranku dalam apa yang aku kabarkan kepada kalian bahwa aku adalah utusan Allah?'
- ج1 بعد: Katakanlah -wahai Rasul- kepada orang-orang musyrik ini: "Apakah sesuatu yang paling besar persaksiannya dalam menetapkan kebenaranku dalam apa yang aku kabarkan kepada kalian bahwa aku adalah utusan Allah?"
- ج2 قبل: Katakanlah: 'Allah menjadi saksi antara aku dan kalian', maksudnya: Dia Maha Mengetahui apa yang aku bawa kepada kalian dan apa yang kalian katakan kepadaku, dan Allah mewahyukan kepadaku Al-Qur'an ini agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian, dan memperingatkan dengannya umat-umat yang sampai kepadanya.
- ج2 بعد: Katakanlah: "Allah menjadi saksi antara aku dan kalian", yaitu: Dia Maha Mengetahui apa yang aku bawa kepada kalian dan apa yang kalian katakan kepadaku, dan Allah mewahyukan kepadaku Al-Quran ini agar dengannya aku memberi peringatan kepada kalian akan azab-Nya yang akan menimpa kalian, dan memberi peringatan dengannya kepada siapa yang sampai kepadanya dari umat-umat.
- ج3 قبل: Sesungguhnya kalian mengakui bahwa bersama Allah ada sesembahan-sesembahan lain yang kalian sekutukan dengan-Nya.
- ج3 بعد: Sesungguhnya kalian benar-benar mengakui bahwa di samping Allah ada tuhan-tuhan lain yang kalian persekutukan dengan-Nya.
- ج4 قبل: Katakanlah kepada mereka -wahai Rasul-: 'Sesungguhnya aku tidak bersaksi atas apa yang kalian akui itu, sesungguhnya Allah hanyalah Tuhan yang Maha Esa tidak ada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri dari setiap sekutu yang kalian sembah bersama-Nya.'
- ج4 بعد: Katakanlah kepada mereka -wahai Rasul-: "Sesungguhnya aku tidak bersaksi atas apa yang kalian akui itu, sesungguhnya Allah adalah Tuhan Yang Maha Esa tidak ada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri dari setiap sekutu yang kalian sembah bersama-Nya."

**quran:6:19|ms** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE ok): S2: 'memberi amaran ... dengan azab-Nya agar ia menimpa kamu' says the warning aims for the punishment to befall them; Arabic warns lest it befall them.
- سبب الفشل القديم: s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted
- ج1 قبل: Katakanlah -wahai Rasul- kepada orang-orang musyrik ini: Apakah sesuatu yang paling besar kesaksiannya dalam membuktikan kebenaranku dalam apa yang aku khabarkan kepada kamu bahawa aku adalah utusan Allah?
- ج1 بعد: Katakanlah -wahai Rasul- kepada orang-orang musyrik ini: "Apakah sesuatu yang lebih besar persaksiannya dalam menetapkan kebenaranku dalam apa yang aku khabarkan kepada kamu bahawa aku adalah utusan Allah?"
- ج2 قبل: Katakanlah: Allah menjadi saksi antara aku dan kamu, iaitu: Dia Maha Mengetahui apa yang aku bawa kepada kamu dan apa yang kamu katakan kepadaku, dan Allah mewahyukan kepadaku al-Quran ini supaya aku memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu, dan memberi amaran dengannya kepada sesiapa yang sampai kepadanya daripada kalangan umat-umat.
- ج2 بعد: Katakanlah: "Allah menjadi Saksi antara aku dengan kamu, iaitu Dia Maha Mengetahui apa yang aku bawa kepada kamu dan apa yang kamu katakan kepadaku, dan Allah mewahyukan kepadaku Al-Quran ini supaya aku memberi amaran kepadamu dengan azab-Nya agar ia menimpa kamu, dan memberi amaran dengannya kepada sesiapa yang sampai kepadanya seruan itu daripada kalangan umat-umat."
- ج3 قبل: Sesungguhnya kamu mengakui bahawa bersama Allah terdapat tuhan-tuhan lain yang kamu sekutukan dengan-Nya.
- ج3 بعد: Sesungguhnya kamu mengakui bahawa bersama-sama Allah terdapat tuhan-tuhan lain yang kamu sekutukan dengan-Nya.
- ج4 قبل: Katakanlah kepada mereka -wahai Rasul-: Sesungguhnya aku tidak bersaksi atas apa yang kamu akui itu, sesungguhnya Allah itu Tuhan yang satu, tiada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri daripada setiap sekutu yang kamu sembah bersama-Nya.
- ج4 بعد: Katakanlah kepada mereka -wahai Rasul-: "Sesungguhnya aku tidak mengakui apa yang kamu akui itu, sesungguhnya Allah adalah Tuhan Yang Maha Esa, tiada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri daripada setiap sekutu yang kamu sembah bersama-Nya."

**quran:59:23|fr** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE ok): S1: al-Mutakabbir rendered 'l'Orgueilleux' (arrogant, pejorative in French) and al-kibriya' as 'la fierté'.
- سبب الفشل القديم: divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux"
- ج1 قبل: Il est Allah, l'adoré en vérité, il n'y a de divinité que Lui, le Roi de toutes choses, qui en dispose sans opposition ni résistance, exempt de toute imperfection, pur de tout défaut, Celui qui confirme Ses messagers et Ses prophètes par les signes évidents qu'Il leur a envoyés, l'Observateur de toute Sa création dans leurs actions, le Puissant qui ne peut être vaincu, le Dominateur qui a soumis tous les serviteurs, et auquel toute la création s'est soumise, l'Orgueilleux à qui appartiennent la grandeur et la majesté.
- ج1 بعد: C'est Lui, Allah, l'adoré en vérité, celui qui n'a de divinité que Lui, le Souverain de toutes choses, qui en dispose sans opposition ni résistance, le Pur de toute imperfection, celui qui est exempt de tout défaut, celui qui confirme Ses messagers et Ses prophètes par les signes évidents qu'Il leur a envoyés, le Vigilant sur toute Sa création dans leurs œuvres, le Tout Puissant qui ne peut être vaincu, le Contraignant qui a soumis tous les serviteurs, et auquel toute la création s'est soumise, l'Orgueilleux à qui appartiennent la fierté et la grandeur.
- ج2 قبل: Allah, exalté soit-Il, est exempt de tout ce qu'ils Lui associent dans Son adoration.
- ج2 بعد: Allah, le Très Haut, est exempt de tout ce qu'ils Lui associent dans Son adoration.

**quran:37:35|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 's'enorgueillissaient contre elle' is awkward French for 'arrogantly refused it'; meaning recoverable.
- سبب الفشل القديم: "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer)
- ج1 قبل: Ces associateurs, dans la vie ici-bas, lorsqu'on leur disait : « Il n'y a de divinité qu'Allah », et qu'on les y appelait, et qu'on leur ordonnait d'abandonner ce qui la contredit, s'enorgueillissaient de cela et de celui qui l'apportait.
- ج1 بعد: Certes, ces associateurs, dans la vie d'ici-bas, lorsqu'on leur disait : « Point de divinité à part Allah », et qu'on les appelait à cette parole, et qu'on leur ordonnait d'abandonner ce qui la contredit, ils s'enorgueillissaient contre elle et contre celui qui l'apportait.

**quran:48:26|fr** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: al-anafa (disdainful pride) rendered 'la fureur'; close to the ayah's hamiyya, nuance shifted.
- سبب الفشل القديم: S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent
- ج1 قبل: Lorsqu'ils ont mis dans leurs cœurs l'orgueil, l'orgueil de l'époque de l'ignorance (al-Jahiliyya),
- ج1 بعد: Quand ceux qui ont mécru eurent mis dans leurs cœurs la fureur, [la] fureur de l'ignorance ;
- ج2 قبل: afin de ne pas reconnaître le message de Muhammad, paix et salut sur lui, et parmi cela, leur refus d'écrire dans le traité de Hudaybiyya « Au nom de Dieu, le Tout Miséricordieux, le Très Miséricordieux » et leur refus d'écrire « Ceci est ce sur quoi Muhammad, le Messager de Dieu, a conclu un pacte », Dieu a alors fait descendre la quiétude (sakina) sur Son Messager et sur les croyants avec lui, et leur a imposé la parole « Il n'y a de divinité que Dieu » (La ilaha illa Allah), qui est la tête de toute piété, et le Messager de Dieu, paix et salut sur lui, et les croyants avec lui étaient plus dignes de la parole de piété que les associateurs, et ils étaient ainsi les gens de cette parole, à l'exclusion des associateurs.
- ج2 بعد: afin qu'ils ne reconnaissent pas la mission de Muhammad, paix et salut sur lui, et parmi cela leur refus d'écrire dans le pacte de Hudaybiyya 'Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux' et leur refus d'écrire 'Ceci est ce sur quoi Muhammad, le Messager d'Allah, a conclu', alors Allah fit descendre la quiétude sur Son Messager et sur les croyants avec lui, et les obligea à la parole 'Il n'y a de divinité qu'Allah' qui est la tête de toute piété, et le Messager, paix et salut sur lui, et les croyants avec lui étaient plus dignes de la parole de piété que les associateurs, et ils étaient ainsi les gens de cette parole à l'exclusion des associateurs.
- ج3 قبل: Et Dieu est de toute chose Omniscient, rien ne Lui échappe.
- ج3 بعد: Et Allah était de toute chose Omniscient, rien ne Lui échappe.

**quran:3:18|hi** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor): S1: 'सबसे महान गवाही पर' (on the greatest testimony) for 'the greatest thing testified to'; minor.
- سبب الفشل القديم: 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed
- ج1 قبل: अल्लाह ने गवाही दी कि वह अकेला ईश्वरत्व में है, और उसने अपनी गवाही को फ़रिश्तों और ज्ञानवालों की गवाही के साथ जोड़ा, सबसे महान गवाही देने वाले पर, जो उसकी एकता और न्याय पर क़ायम होना है, उसके सिवा कोई पूज्य नहीं, वह शक्तिशाली है जिस पर उसकी इच्छा की कोई चीज़ अटक नहीं सकती, अपने कथनों और कार्यों में तत्वदर्शी है।
- ج1 بعد: अल्लाह ने गवाही दी कि वह इबादत में अकेला है, और उसने अपनी गवाही को फ़रिश्तों और ज्ञान वालों की गवाही के साथ जोड़ा, सबसे महान गवाही पर, जो उसकी तौहीद और उसका न्याय पर क़ायम होना है, उसके सिवा कोई पूज्य नहीं, वह प्रभुत्वशाली है जिस पर उसकी इच्छा की कोई चीज़ रुकावट नहीं डाल सकती, अपने कथनों और कर्मों में पूर्ण हिकमत वाला है।

**quran:6:19|fr** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE minor): S2: 'ce que vous Lui dites' (what you say to Him) for 'what you say to me'; 'châtiment qu'Il fasse descendre' blurs 'lest it befall you'.
- سبب الفشل القديم: S2 "ce que vous allez Lui dire" changes the addressee; Arabic ما أنتم قائلونه لي = what you say to me (the Messenger)
- ج1 قبل: Dis - ô Messager - à ces associateurs : quelle chose est la plus grande comme témoignage pour établir ma sincérité dans ce que je vous ai annoncé, à savoir que je suis le Messager d'Allah ?
- ج1 بعد: Dis - ô Messager - à ces associateurs : quelle est la plus grande chose en fait de témoignage pour prouver ma véracité dans ce que je vous ai annoncé, à savoir que je suis le Messager d'Allah ?
- ج2 قبل: Dis : Allah est témoin entre moi et vous, c'est-à-dire : Il sait ce avec quoi je suis venu à vous et ce que vous allez Lui dire, et Allah m'a révélé ce Coran afin que je vous avertisse par lui de Son châtiment qu'Il fera descendre sur vous, et que j'avertisse par lui ceux des nations auxquels il parvient.
- ج2 بعد: Dis : Allah est témoin entre moi et vous, c'est-à-dire : Il connaît ce avec quoi je suis venu à vous et ce que vous Lui dites, et Allah m'a révélé ce Coran afin que je vous avertisse par lui de Son châtiment qu'Il fasse descendre sur vous, et que j'avertisse par lui tous ceux qu'il atteint parmi les nations.
- ج4 قبل: Dis-leur - ô Messager - : je n'atteste pas ce que vous reconnaissez ; Allah est seulement un Dieu unique sans associé, et je suis innocent de tout associé que vous adorez avec Lui.
- ج4 بعد: Dis-leur - ô Messager - : je n'atteste pas ce que vous reconnaissez ; Allah n'est qu'une Divinité Unique, sans associé, et je désavoue tout associé que vous adorez avec Lui.

**quran:21:107|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আমি আপনাকে—হে রাসূল—সমগ্র মানবজাতির জন্য কেবল রহমতস্বরূপ পাঠিয়েছি। সুতরাং যে আপনার প্রতি ঈমান আনবে সে সৌভাগ্যবান হবে ও মুক্তি পাবে, আর যে ঈমান আনবে না সে ব্যর্থ ও ক্ষতিগ্রস্ত হবে।
- ج1 بعد: আমি আপনাকে - হে রাসূল! - সমস্ত মানুষের জন্য রহমতস্বরূপই প্রেরণ করেছি, যারা আপনার প্রতি ঈমান এনেছে তারা সৌভাগ্যবান ও মুক্তি পেয়েছে, আর যারা ঈমান আনেনি তারা ব্যর্থ ও ক্ষতিগ্রস্ত হয়েছে।

**quran:9:33|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: वही है जिसने अपने रसूल मुहम्मद सल्लल्लाहु अलैहि व सल्लम को क़ुरआन और इस्लाम के धर्म के साथ भेजा;
- ج1 بعد: वही है जिसने अपने रसूल मुहम्मद (सल्लल्लाहु अलैहि व सल्लम) को क़ुरआन और इस्लाम के धर्म के साथ भेजा;
- ج2 قبل: ताकि उसे सभी धर्मों पर प्रभुत्व दे, चाहे मुशरिकीन (बहुदेववादी) सत्य के धर्म - इस्लाम - और उसके अन्य धर्मों पर प्रभुत्व को नापसंद करें।
- ج2 بعد: ताकि उसे सभी धर्मों पर प्रभुत्व प्रदान कर दे, भले ही बहुदेववादी सत्य धर्म - इस्लाम - और उसके अन्य धर्मों पर प्रभुत्व को बुरा मानें।

**quran:42:53|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1 keeps the source's question mark on a negative statement; meaning intact.
- ج1 قبل: और जैसे हमने तुमसे पहले के नबियों पर वह़्य भेजी थी - ऐ नबी! - उसी तरह हमने तुम पर भी अपनी ओर से क़ुरआन भेजा है, तुम इससे पहले नहीं जानते थे कि पिछली किताबें क्या हैं, न ईमान, न शरीअत के आदेश?
- ج1 بعد: और जैसे हमने आपसे पहले नबियों की ओर वह्य भेजी—ऐ नबी!—उसी तरह हमने आपकी ओर अपनी ओर से क़ुरआन भेजा, आप इससे पहले न पिछली किताबों को जानते थे, न ईमान को, न शरई अहकाम को?
- ج3 قبل: और निश्चय ही तुम - ऐ रसूल! - अल्लाह की अनुमति से सीधे रास्ते की ओर मार्गदर्शन और हिदायत करते हो - और वह इस्लाम है - अल्लाह का रास्ता, जिसका आसमानों और ज़मीन में जो कुछ है उस सब पर राज्य है, उसमें उसका कोई साझीदार नहीं।
- ج3 بعد: और निश्चय आप—ऐ रसूल!—अल्लाह की इजाज़त से सीधे रास्ते की ओर दिखाते और मार्गदर्शन करते हैं—और वह इस्लाम है—अल्लाह का रास्ता जिसका आसमानों और ज़मीन में जो कुछ है सब पर राज है, इसमें उसका कोई साझीदार नहीं।
- ج4 قبل: सुन लो! ऐ लोगों! अल्लाह ही की ओर तुम्हारे सारे मामले लौटते हैं - अच्छे और बुरे - तो वह हर एक को उसके कर्म के अनुसार बदला देगा: अगर अच्छा है तो अच्छा, और अगर बुरा है तो बुरा।
- ج4 بعد: सुनो! अल्लाह ही की ओर—ऐ लोगों!—तुम्हारे सारे मामले अच्छे और बुरे लौटते हैं, तो वह हर एक को उसके काम का बदला देगा: अगर अच्छा है तो अच्छा, और अगर बुरा है तो बुरा।

**quran:2:208|ur** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S2: 'اس سے ڈرو' (fear him) for 'beware of him'; acceptable.
- ج1 قبل: اے ایمان والو! جو اللہ کو رب اور محمد کو نبی اور رسول اور اسلام کو دین مان کر ایمان لائے ہو، اسلام کے تمام احکام میں داخل ہو جاؤ، اس کے تمام احکام پر عمل کرتے ہوئے، اور ان میں سے کچھ بھی نہ چھوڑو، اور شیطان کے راستوں کی پیروی نہ کرو، جو وہ تمہیں گناہوں کی طرف بلاتا ہے۔
- ج1 بعد: اے وہ لوگو جو اللہ کو رب اور محمد کو نبی اور رسول اور اسلام کو دین مان کر ایمان لائے ہو! اسلام کے تمام احکام میں پورے پورے داخل ہو جاؤ، اس کے تمام احکام پر عمل کرتے ہوئے، اور ان میں سے کچھ بھی نہ چھوڑو، اور شیطان کے راستوں پر نہ چلو جن کی طرف وہ تمہیں گناہوں کی دعوت دیتا ہے۔
- ج2 قبل: بے شک وہ تمہارا دشمن ہے، ظاہر دشمنی والا، سو اس سے ڈرو۔
- ج2 بعد: بے شک وہ تمہارا کھلا دشمن ہے، پس اس سے ڈرو۔

**quran:59:22|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'Quien no hay dios sino Él' is ungrammatical Spanish; meaning clear.
- ج1 قبل: Él es Al-lah, glorificado y exaltado sea, el adorado con derecho, que no hay divinidad sino Él, conocedor de lo secreto y lo manifiesto, sabe lo que está oculto y lo que está presente, Él es el Misericordioso (Ar-Rahmán) cuya misericordia abarca todo, el Compasivo (Ar-Rahim) con los creyentes en Él.
- ج1 بعد: Él es Allah, glorificado y exaltado sea, el adorado con derecho, Quien no hay dios sino Él, conocedor del secreto y de lo manifiesto, sabe lo que está oculto y lo que está presente, Él es el Misericordioso, cuya misericordia abarca todo, el Compasivo con los creyentes en Él.

**quran:59:24|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Dialah Allah Subhanahu wa Ta'ala, Pencipta yang menentukan makhluk, Yang Mengadakan yang menciptakan dan mewujudkan mereka sesuai dengan hikmah-Nya, Yang Membentuk ciptaan-Nya sebagaimana Dia kehendaki, bagi-Nya Subhanahu nama-nama yang indah dan sifat-sifat yang tinggi, bertasbih kepada-Nya segala yang ada di langit dan bumi, dan Dialah Yang Maha Perkasa lagi sangat keras siksa-Nya terhadap musuh-musuh-Nya, Yang Maha Bijaksana dalam mengatur urusan makhluk-Nya.
- ج1 بعد: Dia adalah Allah Subhanahu wa Ta'ala, Pencipta yang menentukan makhluk, Yang Mengadakan yang menciptakan dan mewujudkan mereka sesuai dengan hikmah-Nya, Yang Membentuk rupa makhluk-Nya sebagaimana Dia kehendaki, bagi-Nya Subhanahu nama-nama yang baik dan sifat-sifat yang tinggi, bertasbih kepada-Nya segala yang ada di langit dan bumi, dan Dia adalah Yang Maha Perkasa yang sangat keras pembalasan-Nya terhadap musuh-musuh-Nya, Yang Maha Bijaksana dalam mengatur urusan makhluk-Nya.

**quran:21:92|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: These prophets all had one religion, Islam, which is submission to God through obedience and singling Him out for worship, and God, glory be to Him and exalted be He, is the Lord of creation, so worship Him — O people — alone, with no partner to Him.
- ج1 بعد: These prophets, all of them, had one religion, Islam, which is submission to Allah in obedience and devoting worship solely to Him, and Allah, glory be to Him and exalted is He, is the Lord of creation, so worship Him alone—O people—with no partner to Him.

**quran:4:87|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: अल्लाह अकेला है जो सारी सृष्टि के लिए ईश्वरत्व में अद्वितीय है, वह तुम्हें क़ियामत के दिन अवश्य इकट्ठा करेगा, जिसमें कोई संदेह नहीं, हिसाब और बदले के लिए।
- ج1 بعد: अल्लाह अकेला है जो सभी सृष्टि के लिए पूज्यता में अद्वितीय है, वह तुम्हें क़ियामत के दिन, जिसमें कोई संदेह नहीं, हिसाब और बदले के लिए अवश्य एकत्र करेगा।
- ج2 قبل: और अल्लाह से अधिक सत्य कथन में कोई नहीं, जो उसने बताया है।
- ج2 بعد: और अल्लाह से अधिक सच्ची बात वाला कोई नहीं, जो कुछ उसने बताया है।

**quran:33:40|ms** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Muhammad bukanlah bapa kepada mana-mana lelaki di kalangan kamu, tetapi dia adalah Rasul Allah dan penutup para nabi, maka tiada nubuwwah selepasnya sehingga hari kiamat.
- ج1 بعد: Tiadalah Muhammad itu menjadi bapa bagi seseorang dari kalangan lelaki kamu, tetapi dia adalah Rasul Allah dan penutup segala nabi, maka tiada kenabian selepasnya hingga hari kiamat.
- ج2 قبل: Dan adalah Allah Maha Mengetahui segala sesuatu daripada amalan kamu, tidak tersembunyi daripada-Nya sesuatu pun.
- ج2 بعد: Dan adalah Allah Maha Mengetahui akan segala sesuatu daripada amalan kamu, tiada tersembunyi daripada-Nya sesuatu pun.

**quran:48:29|hi** (كان ناجحًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE problem): S3: 'kathratihim' (their great number) rendered 'उनकी ज़्यादती', which reads as 'their excess/high-handedness' of the Companions.
- ج1 قبل: मुहम्मद अल्लाह के रसूल हैं, और जो उनके साथ उनके दीन पर हैं, वे काफ़िरों पर सख़्त हैं, आपस में रहमदिल हैं, तुम उन्हें देखोगे कि वे अपनी नमाज़ में अल्लाह के लिए रुकूअ और सजदा करते हैं, वे अपने रब से उम्मीद रखते हैं कि वह उन पर कृपा करे, उन्हें जन्नत में दाख़िल करे, और उनसे राज़ी हो, उनकी अल्लाह की इताअत की निशानी उनके चेहरों पर सजदे और इबादत के असर से ज़ाहिर है, यह उनकी सिफ़त तौरात में है।
- ج1 بعد: मुहम्मद अल्लाह के रसूल हैं, और जो लोग उनके साथ हैं उनके धर्म पर, काफ़िरों पर बहुत सख़्त हैं, आपस में बहुत दयालु हैं, तुम उन्हें अपनी नमाज़ में रुकू' करते हुए, सजदा करते हुए देखोगे, वे अपने रब से उम्मीद रखते हैं कि वह उन पर कृपा करे, उन्हें जन्नत में दाखिल करे, और उनसे राज़ी हो, अल्लाह की इताअत का निशान उनके चेहरों पर सजदे और इबादत के असर से ज़ाहिर है, यह उनकी सिफ़त तौरात में है।
- ج2 قبل: और इंजील में उनकी सिफ़त ऐसी है जैसे एक खेती जिसने अपना तना और शाखा निकाली, फिर उसकी शाखाएँ उसके बाद बढ़ीं, और खेती को मज़बूत किया, तो वह मज़बूत हुई और अपने तनों पर सीधी खड़ी हुई, उसका नज़ारा खूबसूरत, किसानों को अच्छा लगता है;
- ج2 بعد: और इंजील में उनकी सिफ़त उस खेती की तरह है जिसने अपना तना और शाख निकाला, फिर उसकी शाखें उसके बाद बढ़ गईं, और खेती को मज़बूत किया, तो वह मज़बूत हो गई और अपने तनों पर सीधी खड़ी हो गई, उसका नज़ारा खूबसूरत है, किसानों को अच्छा लगता है;
- ج3 قبل: ताकि इन मोमिनों की कसरत और खूबसूरत नज़ारे से काफ़िरों को ग़ैज़ आए।
- ج3 بعد: ताकि इन ईमानवालों से उनकी ज़्यादती और खूबसूरत नज़ारे की वजह से काफ़िरों को ग़ुस्सा दिलाए।
- ج4 قبل: और इसमें उस शख़्स के कुफ़्र की दलील है जो सहाबा (रज़ियल्लाहु अन्हुम) से नफ़रत करता है;
- ج4 بعد: और इसमें उस शख़्स के कुफ़्र का दलील है जो सहाबा (अल्लाह उनसे राज़ी रहे) से नफ़रत करता है;
- ج5 قبل: क्योंकि जिसे अल्लाह ने सहाबा के ज़रिए ग़ैज़ दिलाई, उसके हक़ में वह चीज़ पाई गई जो उसका सबब है, और वह कुफ़्र है।
- ج5 بعد: क्योंकि जिसे अल्लाह ने सहाबा के ज़रिए ग़ुस्सा दिलाया, उसके हक़ में वह चीज़ पाई गई जो इसका सबब है, और वह कुफ़्र है।
- ج6 قبل: अल्लाह ने उन लोगों से वादा किया है जो उनमें से अल्लाह और उसके रसूल पर ईमान लाए और उन्होंने वह अमल किया जो अल्लाह ने उन्हें हुक्म दिया, और उससे बचे जो उसने उन्हें मना किया, उनके गुनाहों की मग़फ़िरत, और बड़ा अज्र जो ख़त्म नहीं होता, और वह जन्नत है।
- ج6 بعد: अल्लाह ने उनमें से जो अल्लाह और उसके रसूल पर ईमान लाए और उन्होंने वह काम किए जो अल्लाह ने उन्हें हुक्म दिया, और उन्होंने उन चीज़ों से परहेज़ किया जिनसे उसने उन्हें मना किया, उनके गुनाहों की माफ़ी और बहुत बड़ा अज्र जो ख़त्म नहीं होता, यानी जन्नत का वादा किया।
- ج7 قبل: (और अल्लाह का वादा हक़ है, सच्चा है, जो टूटता नहीं, और जो कोई सहाबा (रज़ियल्लाहु अन्हुम) के नक़्शे क़दम पर चला, वह उनके हुक्म में है मग़फ़िरत और बड़े अज्र के हक़दार होने में, और उन्हें फ़ज़ीलत, सबक़त और कमाल हासिल है जिसमें इस उम्मत में से कोई उन तक नहीं पहुँच सकता, अल्लाह उनसे राज़ी हो और उन्हें राज़ी करे)।
- ج7 بعد: (और अल्लाह का वादा सच्चा और सच किया हुआ है, उसमें ख़िलाफ़ नहीं होता, और जो भी सहाबा (अल्लाह उनसे राज़ी रहे) के नक़्शे-क़दम पर चला, वह उनके हुक्म में है माफ़ी और बड़े अज्र के हक़दार होने में, और उन्हें फ़ज़ीलत, सबक़त और कमाल हासिल है जिसमें इस उम्मत में से कोई उनके बराबर नहीं पहुँच सकता, अल्लाह उनसे राज़ी रहे और उन्हें राज़ी करे)।

**quran:10:25|tr** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: 'min khalqih' (His creation) as 'kullarından' (His servants); slight narrowing.
- ج1 قبل: Allah sizi, dostları için hazırladığı cennetlerine çağırır ve kullarından dilediğini hidayete erdirir, onu doğru yola, yani İslam'a iletir.
- ج1 بعد: Allah sizi, dostları için hazırladığı cennetlerine çağırır ve kullarından dilediğini hidayete erdirir, onu doğru yolu, yani İslam'ı bulmaya muvaffak kılar.

**quran:48:29|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S5: 'যাকে ... অন্তর্জালা সৃষ্টি করেছেন' is slightly ungrammatical; meaning recoverable.
- ج1 قبل: মুহাম্মাদ আল্লাহর রাসূল, এবং যারা তার সাথে রয়েছে তার দ্বীনের উপর, তারা কাফিরদের প্রতি কঠোর, নিজেদের মধ্যে পরস্পরের প্রতি দয়ালু; তুমি তাদের দেখবে রুকু ও সিজদায় আল্লাহর জন্য তাদের নামাজে, তারা তাদের রবের কাছে আশা করে যে তিনি তাদের উপর অনুগ্রহ করবেন, তাদের জান্নাতে প্রবেশ করাবেন এবং তাদের প্রতি সন্তুষ্ট হবেন; তাদের আল্লাহর আনুগত্যের চিহ্ন তাদের মুখে সিজদা ও ইবাদতের প্রভাবে প্রকাশ পায়; এই তাদের বৈশিষ্ট্য তাওরাতে।
- ج1 بعد: মুহাম্মদ আল্লাহর রসূল, এবং যারা তার সাথে তার দ্বীনের উপর রয়েছে তারা কাফেরদের প্রতি কঠোর, নিজেদের মধ্যে পরস্পর সহানুভূতিশীল। তুমি তাদেরকে তাদের নামাজে আল্লাহর জন্য রুকু ও সেজদারত দেখবে, তারা তাদের রবের কাছে আশা করে যে তিনি তাদের উপর অনুগ্রহ করবেন, তাদেরকে জান্নাতে প্রবেশ করাবেন এবং তাদের উপর সন্তুষ্ট হবেন। আল্লাহর আনুগত্যের চিহ্ন তাদের মুখমন্ডলে সেজদা ও ইবাদতের প্রভাব থেকে স্পষ্ট। এই তাদের বৈশিষ্ট্য তওরাতে।
- ج2 قبل: আর তাদের বৈশিষ্ট্য ইনজিলে একটি ফসলের মতো যা তার কাণ্ড ও শাখা বের করেছে, তারপর তার শাখাগুলো পরে বহুগুণ বেড়েছে, এবং ফসলকে শক্ত করেছে, ফলে তা শক্তিশালী হয়ে তার কাণ্ডের উপর সোজা দাঁড়িয়েছে, তার দৃশ্য সুন্দর, কৃষকদের বিস্মিত করে;
- ج2 بعد: এবং তাদের বৈশিষ্ট্য ইঞ্জিলে এমন একটি চারা গাছের মতো যা তার কান্ড ও শাখা বের করেছে, অতঃপর তার শাখাগুলো পরে বহুগুণ বেড়েছে, এবং চারাকে শক্ত করেছে, ফলে তা শক্তিশালী হয়েছে এবং তার কান্ডের উপর সুন্দর দৃশ্যমান হয়ে দাঁড়িয়েছে, যা চাষীদের বিস্মিত করে।
- ج3 قبل: যাতে এই মুমিনদের দ্বারা তাদের সংখ্যাধিক্য ও সুন্দর দৃশ্যের কারণে কাফিরদের ক্রোধ জাগায়।
- ج3 بعد: যাতে এই মুমিনদের দ্বারা তাদের সংখ্যাধিক্য ও সুন্দর দৃশ্যের কারণে কাফেরদের অন্তর্জালা সৃষ্টি হয়।
- ج4 قبل: আর এতে প্রমাণ রয়েছে যে, যে সাহাবিদের (আল্লাহ তাদের প্রতি সন্তুষ্ট হন) ঘৃণা করে সে কাফির;
- ج4 بعد: এবং এতে প্রমাণ রয়েছে যে, যে সাহাবীদের (আল্লাহ তাদের উপর সন্তুষ্ট) বিদ্বেষ করে সে কাফের।
- ج5 قبل: কারণ যাকে আল্লাহ সাহাবিদের দ্বারা ক্রোধান্বিত করেছেন, তার ক্ষেত্রে সেই কারণ পাওয়া গেছে, তা হলো কুফর।
- ج5 بعد: কারণ আল্লাহ যাকে সাহাবীদের দ্বারা অন্তর্জালা সৃষ্টি করেছেন, তার ক্ষেত্রে সেই কারণ পাওয়া গেছে, তা হলো কুফর।
- ج6 قبل: আল্লাহ তাদের প্রতিশ্রুতি দিয়েছেন যারা তাদের মধ্যে আল্লাহ ও তার রাসূলের প্রতি ঈমান এনেছে এবং আল্লাহ যা আদেশ করেছেন তা করেছে এবং যা তিনি নিষেধ করেছেন তা পরিহার করেছে, তাদের পাপের ক্ষমা এবং অফুরন্ত বিশাল প্রতিদান, যা হলো জান্নাত।
- ج6 بعد: আল্লাহ তাদের মধ্যে যারা আল্লাহ ও তাঁর রসূলের উপর ঈমান এনেছে এবং আল্লাহ তাদের যা আদেশ করেছেন তা করেছে এবং যা তিনি তাদের নিষেধ করেছেন তা পরিহার করেছে, তাদেরকে তাদের গুনাহের ক্ষমা এবং অফুরন্ত বিশাল প্রতিদানের ওয়াদা দিয়েছেন, তা হলো জান্নাত।
- ج7 قبل: আর আল্লাহর প্রতিশ্রুতি সত্য, সত্যায়িত, যা ভঙ্গ হয় না; আর যে কেউ সাহাবিদের (আল্লাহ তাদের প্রতি সন্তুষ্ট হন) পদাঙ্ক অনুসরণ করেছে, সে তাদের বিধানে রয়েছে ক্ষমা ও মহান প্রতিদান পাওয়ার যোগ্যতায়; আর তাদের জন্য রয়েছে মর্যাদা, অগ্রগামিতা এবং পূর্ণতা যা এই উম্মতের কেউ তাদের কাছে পৌঁছাতে পারে না; আল্লাহ তাদের প্রতি সন্তুষ্ট হন এবং তাদের সন্তুষ্ট করেন।
- ج7 بعد: (এবং আল্লাহর ওয়াদা সত্য, সত্যায়িত, যা ভঙ্গ হয় না, এবং যে কেউ সাহাবীদের (আল্লাহ তাদের উপর সন্তুষ্ট) পদাঙ্ক অনুসরণ করে, সে তাদের বিধানে রয়েছে ক্ষমা ও মহান প্রতিদান পাওয়ার ক্ষেত্রে, এবং তাদের জন্য রয়েছে মর্যাদা, অগ্রগামিতা এবং পূর্ণতা যা এই উম্মতের কেউ তাদের কাছে পৌঁছাতে পারে না, আল্লাহ তাদের উপর সন্তুষ্ট এবং তাদেরকে সন্তুষ্ট করেছেন)।

**quran:2:238|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'presentaos' for 'stand' in prayer is slightly off; harmless.
- ج1 قبل: Mantened, oh musulmanes, las cinco oraciones obligatorias perseverando en realizarlas en sus tiempos con sus condiciones, pilares y deberes, y mantened la oración intermedia entre ellas, que es la oración del asr, y levantaos en vuestra oración obedientes a Dios, humildes y sumisos.
- ج1 بعد: Cumplid, oh musulmanes, con las cinco oraciones prescritas mediante la constancia en realizarlas en sus tiempos, con sus condiciones, pilares y obligaciones, y cumplid con la oración intermedia entre ellas, que es la oración del 'Asr, y presentaos en vuestra oración obedientes a Allah, humildes y sumisos.

**quran:23:52|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: और निस्संदेह तुम्हारा धर्म- ऐ नबियों के समूह- एक ही धर्म है और वह इस्लाम है, और मैं तुम्हारा रब हूँ, अतः मेरा डर रखो मेरे आदेशों का पालन करके और मेरी मनाहियों से बचकर।
- ج1 بعد: और निःसंदेह तुम्हारा धर्म—हे नबियों के समुदाय—एक ही धर्म है और वह इस्लाम है, और मैं तुम्हारा पालनहार हूँ, अतः मेरे आदेशों का पालन करके और मेरी मनाही से बचकर मुझसे डरो।

**quran:28:70|bn** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: 'al-jamil' (beautiful) dropped from 'beautiful praise'; minor.
- ج1 قبل: তিনিই আল্লাহ, যিনি ছাড়া কোনো সত্য ইলাহ নেই; দুনিয়া ও আখিরাতে তাঁরই জন্য সুন্দর প্রশংসা ও শুকরিয়া, তাঁরই জন্য সৃষ্টির মধ্যে বিচার ক্ষমতা, এবং মৃত্যুর পর হিসাব ও প্রতিদানের জন্য তোমাদেরকে তাঁরই দিকে ফিরিয়ে নেওয়া হবে।
- ج1 بعد: তিনিই আল্লাহ যিনি ছাড়া কোনো সত্য উপাস্য নেই, তাঁরই প্রশংসা ও শোকর দুনিয়া ও আখিরাতে, তাঁরই সৃষ্টির মধ্যে বিধান, এবং তাঁরই কাছে তোমাদের মৃত্যুর পর ফিরিয়ে আনা হবে হিসাব ও প্রতিদানের জন্য।

**quran:59:22|ms** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Dia adalah Allah Subhanahu wa Ta'ala yang disembah dengan hak, yang tiada tuhan selain Dia, Maha Mengetahui rahasia dan yang terang, mengetahui apa yang gaib dan apa yang hadir, Dia adalah Ar-Rahman yang rahmat-Nya meliputi segala sesuatu, Maha Penyayang kepada orang-orang yang beriman kepada-Nya.
- ج1 بعد: Dia lah Allah Subhanahu wa Ta'ala yang disembah dengan hak, yang tiada Tuhan selain Dia, mengetahui rahsia dan terang, mengetahui apa yang ghaib dan yang hadir, Dia lah Yang Maha Pemurah yang rahmat-Nya meliputi segala sesuatu, lagi Maha Mengasihani kepada orang-orang yang beriman kepada-Nya.

**quran:2:208|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Wahai orang-orang yang beriman kepada Allah sebagai Rabb, kepada Muhammad sebagai nabi dan rasul, dan kepada Islam sebagai agama, masuklah ke dalam seluruh syariat Islam, amalkanlah semua hukumnya, dan jangan tinggalkan sedikit pun darinya, serta jangan ikuti jalan-jalan setan dalam hal yang ia serukan kepada kalian berupa kemaksiatan.
- ج1 بعد: Wahai orang-orang yang beriman kepada Allah sebagai Rabb, kepada Muhammad sebagai nabi dan rasul, dan kepada Islam sebagai agama, masuklah kalian ke dalam seluruh syariat Islam, amalkanlah semua hukum-hukumnya, dan janganlah kalian meninggalkan sedikit pun darinya, dan janganlah kalian mengikuti jalan-jalan setan dalam hal yang ia serukan kepada kalian berupa kemaksiatan.
- ج2 قبل: Sesungguhnya ia adalah musuh yang nyata permusuhannya bagi kalian, maka waspadalah terhadapnya.
- ج2 بعد: Sesungguhnya setan itu bagi kalian adalah musuh yang nyata permusuhannya, maka berhati-hatilah kalian terhadapnya.

**quran:6:3|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Y Alá, Glorificado sea, es la divinidad adorada en los cielos y en la tierra.
- ج1 بعد: Y Allah, glorificado sea, es el Dios adorado en los cielos y en la tierra.
- ج3 قبل: y por ello, Él —Majestuoso y Altísimo— es solo Él la divinidad que merece la adoración.
- ج3 بعد: y por ello, Él —glorificado y exaltado sea— es solo Él el Dios que merece la adoración.

**quran:3:2|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: वह अल्लाह है, उसके सिवा कोई सच्चा पूज्य नहीं, वह पूर्ण जीवन से युक्त है जैसा उसकी महिमा के योग्य है, वह हर चीज़ पर क़ायम है।
- ج1 بعد: वह अल्लाह है, उसके सिवा कोई सच्चा पूज्य नहीं, जो अपनी महिमा के अनुकूल पूर्ण जीवन से युक्त है, हर चीज़ को सँभालने वाला है।

**quran:43:84|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: And He is Allah alone, the One truly worshipped in the heavens and on the earth, and He is the Wise who perfected His creation and perfected His law, the All-Knowing of everything regarding the conditions of His creation, nothing of which is hidden from Him.
- ج1 بعد: And He is Allah alone, the only deity worshipped with truth in the heaven and on the earth, and He is the Wise who perfected His creation and made His law precise, the Knowing of everything concerning the conditions of His creatures, nothing of which is hidden from Him.

**quran:42:53|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج2 قبل: But We made the Qur'an a light for people, by which We guide whom We will among Our servants to the straight path.
- ج2 بعد: But We made the Qur'an a light for the people, by which We guide whom We will among Our servants to the straight path.
- ج3 قبل: And you - O Messenger - indeed guide and direct, by Allah's permission, to a straight path - which is Islam - the path of Allah, to Whom belongs the dominion of all that is in the heavens and all that is in the earth; there is no partner for Him in that.
- ج3 بعد: And indeed you - O Messenger - guide and direct, by Allah's permission, to a straight path - which is Islam - the path of Allah, to whom belongs the dominion of all that is in the heavens and all that is on the earth; there is no partner for Him in that.
- ج4 قبل: Indeed, to Allah - O people - all your affairs return, whether good or evil, and He will recompense each according to his deed: if good, then good; and if evil, then evil.
- ج4 بعد: Indeed, to Allah - O people - all your affairs return, whether good or evil, and He will recompense each one according to his deed: if good, then good, and if evil, then evil.

**quran:6:102|tr** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S2: 'khalqih' (His creation) as 'kullarının' (His servants); slight narrowing.
- ج1 قبل: İşte bu -ey müşrikler- sizin Rabbinizdir, O celâl ve ikram sahibidir; O'ndan başka hak ilah yoktur, her şeyin yaratıcısıdır; öyleyse O'na itaat ve ibadetle boyun eğin ve teslim olun.
- ج1 بعد: İşte bu -ey müşrikler- Rabbinizdir, O yüce ve uludur, O'ndan başka hak ilah yoktur, her şeyin yaratıcısıdır; öyleyse O'na itaat ve ibadetle boyun eğin ve teslim olun.
- ج2 قبل: O, sübhândır, her şey üzerinde vekil ve koruyucudur; yaratıklarının işlerini düzenler.
- ج2 بعد: O, Sübhanehu, her şey üzerinde vekil ve koruyucudur, kullarının işlerini düzenler.

**quran:10:25|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Et Allah vous appelle à Ses jardins qu'Il a préparés pour Ses alliés, et Il guide qui Il veut parmi Ses créatures, en les accordant pour atteindre le chemin droit, qui est l'islam.
- ج1 بعد: Allah vous appelle à Ses jardins qu'Il a préparés pour Ses alliés, et Il guide qui Il veut parmi Ses créatures, en les rendant aptes à atteindre le droit chemin, qui est l'islam.

**quran:59:22|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: তিনি আল্লাহ, পবিত্র ও মহান, যিনি সত্যের সাথে উপাস্য, যিনি ছাড়া কোনো উপাস্য নেই, তিনি গোপন ও প্রকাশ্য সব জানেন, যা অদৃশ্য ও যা উপস্থিত সব জানেন, তিনি রহমান যার রহমত সব কিছুকে পরিবেষ্টিত করেছে, তিনি রহিম যিনি তাঁর প্রতি ঈমানদারদের প্রতি দয়ালু।
- ج1 بعد: তিনিই আল্লাহ তা’আলা, যিনি সত্যিকার উপাস্য, তিনি ব্যতীত কোনো উপাস্য নেই; তিনি গোপন ও প্রকাশ্য বিষয় জানেন, যা অদৃশ্য ও যা দৃশ্যমান সব জানেন; তিনি পরম দয়ালু, যার রহমত সবকিছুকে পরিবেষ্টন করেছে, এবং তিনি বিশ্বাসীদের প্রতি অত্যন্ত দয়ালু।

**quran:6:102|id** (كان ناجحًا) → **FAIL** (FAITHFUL minor، TERMS ok، LANGUAGE problem): S2: 'Dia Maha Suci atas segala sesuatu sebagai wakil' makes 'Most Holy over all things' the predicate; the Wakil/Hafiz clause is garbled.
- ج2 قبل: Dan Dia Maha Suci lagi Maha Tinggi adalah Pemelihara dan Penjaga atas segala sesuatu, yang mengatur urusan makhluk-Nya.
- ج2 بعد: Dan Dia Maha Suci atas segala sesuatu sebagai wakil dan penjaga, yang mengatur urusan makhluk-Nya.

**quran:21:92|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Ces prophètes, tous, ont une seule religion, l'Islam, qui est la soumission à Allah par l'obéissance et Lui vouer exclusivement le culte, et Allah, gloire et exalté soit-Il, est le Seigneur de la création, adorez-Le donc - ô gens - seul, sans associé.
- ج1 بعد: Ces prophètes, tous, ont une seule religion, l'Islam, qui est la soumission à Allah par l'obéissance et Lui vouer exclusivement le culte, et Allah, gloire et pureté à Lui, est le Seigneur des créatures. Adorez-Le donc — ô gens — Seul, sans associé.

**quran:4:87|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আল্লাহ একাই সমস্ত সৃষ্টির জন্য একমাত্র উপাস্য, তিনি কিয়ামতের দিন তোমাদের অবশ্যই একত্রিত করবেন, যাতে কোনো সন্দেহ নেই, হিসাব ও প্রতিদানের জন্য।
- ج1 بعد: আল্লাহই একমাত্র সত্তা যিনি সকল সৃষ্টির জন্য এককভাবে উপাস্য, তিনি অবশ্যই তোমাদেরকে কেয়ামতের দিন একত্রিত করবেন, যাতে কোনো সন্দেহ নেই, হিসাব ও প্রতিদানের জন্য।
- ج2 قبل: এবং আল্লাহর চেয়ে সত্যবাদী কেউ নেই, যা তিনি সংবাদ দিয়েছেন তাতে।
- ج2 بعد: আর আল্লাহর চেয়ে বেশি সত্যবাদী কেউ নেই তাঁর বর্ণিত কথায়।

**quran:7:158|tr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: De ki -ey Resul- bütün insanlara: Ben, Allah'ın size hepinize gönderdiği Resulüyüm; bazınıza değil hepinize, O ki göklerin ve yerin ve içindekilerin mülkü O'nundur, ulûhiyet ve ibadet ancak O'na olmalıdır, şanı yücedir, yaratıkları var etmeye, yok etmeye ve diriltmeye kadirdir; öyleyse Allah'a iman edin ve O'nun birliğini ikrar edin, O'nun Resulü Muhammed'e -sallallahu aleyhi ve sellem- iman edin, o ümmî peygambere ki Allah'a ve Rabbinden kendisine indirilene ve kendinden önceki peygamberlere indirilene iman eder; ve bu Resul'e uyun ve size emrettiği Allah'a itaat amellerini yerine getirmeye bağlanın, doğru yola muvaffak olmayı umarak.
- ج1 بعد: De ki -ey Resul- bütün insanlara: Ben, hepinize -bazınıza değil de hepinize- gönderilmiş Allah'ın elçisiyim; O ki göklerin ve yerin ve içindekilerin mülkü O'nundur, ilahlık ve ibadet ancak O'na -şanı yücedir- layıktır, yaratmayı, yok etmeyi ve diriltmeyi yapmaya kadirdir; öyleyse Allah'a iman edin ve birliğini ikrar edin, Resulü Muhammed'e -sallallahu aleyhi ve sellem- iman edin; o ümmî peygamberdir ki Allah'a, Rabbinden kendisine indirilene ve kendisinden önceki peygamberlere indirilene iman eder; ve bu Resul'e uyun, size emrettiği Allah'a itaat işlerini yapmayı ilke edinin; umulur ki doğru yola iletilirsiniz.

**quran:2:208|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Ô vous qui avez cru en Allah comme Seigneur, en Muhammad comme Prophète et Messager, et en l'Islam comme religion, entrez dans toutes les lois de l'Islam, en agissant selon tous ses préceptes, et n'en délaissez rien, et ne suivez pas les voies du diable dans ce qu'il vous appelle à faire de péchés.
- ج1 بعد: Ô vous qui avez cru en Allah comme Seigneur, en Muhammad comme Prophète et Messager, et en l'Islam comme religion, entrez pleinement dans toutes les lois de l'Islam, en agissant selon tous ses préceptes, et n'en délaissez rien, et ne suivez pas les voies du diable dans ce qu'il vous appelle à commettre comme péchés.
- ج2 قبل: Certes, il est pour vous un ennemi dont l'hostilité est manifeste, alors méfiez-vous de lui.
- ج2 بعد: Il est certes pour vous un ennemi dont l'inimitié est manifeste, alors méfiez-vous de lui.

**quran:3:18|ms** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: 'qiyamuhu bil-'adl' (upholding justice) as 'keadilan-Nya' (His justice); harmless.
- ج1 قبل: Allah bersaksi bahawa Dia sahaja yang berhak disembah, dan Dia menggandingkan kesaksian-Nya dengan kesaksian para malaikat dan ahli ilmu, atas seagung-agung perkara yang disaksikan, iaitu tauhid kepada-Nya dan keadilan-Nya, tiada tuhan selain Dia, Yang Maha Perkasa yang tidak ada sesuatu pun yang menghalangi kehendak-Nya, Yang Maha Bijaksana dalam segala perkataan dan perbuatan-Nya.
- ج1 بعد: Allah menyaksikan bahawa Dia sahaja yang berhak disembah, dan Dia menggandingkan penyaksian-Nya dengan penyaksian para malaikat dan orang-orang yang berilmu, terhadap perkara yang paling agung yang disaksikan, iaitu keesaan-Nya dan keadilan-Nya, tiada Tuhan melainkan Dia, Yang Maha Perkasa yang tidak ada sesuatu pun yang menghalang kehendak-Nya, Yang Maha Bijaksana dalam perkataan dan perbuatan-Nya.

**quran:33:40|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Muhammad itu bukanlah bapak bagi seorang laki-laki di antara kalian, tetapi dia adalah utusan Allah dan penutup para nabi, maka tidak ada kenabian setelahnya hingga hari kiamat.
- ج1 بعد: Muhammad itu sekali-kali bukanlah bapak dari seorang laki-laki di antara kamu, tetapi dia adalah Rasulullah dan penutup nabi-nabi, maka tidak ada kenabian setelahnya hingga hari kiamat.
- ج2 قبل: Dan Allah Maha Mengetahui segala sesuatu dari amal perbuatan kalian, tidak ada sesuatu pun yang tersembunyi bagi-Nya.
- ج2 بعد: Dan adalah Allah Maha Mengetahui segala sesuatu dari amal perbuatan kalian, tidak ada sesuatu pun yang tersembunyi bagi-Nya.

**quran:42:53|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Dan sebagaimana Kami mewahyukan kepada para nabi sebelum kamu -wahai Nabi- Kami mewahyukan kepadamu Al-Qur'an dari sisi Kami, kamu tidak mengetahui sebelumnya apa itu kitab-kitab sebelumnya, tidak pula iman, dan tidak pula syariat-syariat ilahi?
- ج1 بعد: Dan sebagaimana Kami mewahyukan kepada para nabi sebelummu -wahai Nabi- Kami mewahyukan kepadamu Al-Qur'an dari sisi Kami, kamu tidak mengetahui sebelumnya apa itu kitab-kitab terdahulu, tidak pula iman, dan tidak pula syariat-syariat Ilahi.
- ج4 قبل: Ingatlah, hanya kepada Allah -wahai manusia- kembali semua urusan kalian dari kebaikan dan keburukan, maka Dia memberi balasan kepada setiap orang sesuai amalnya: jika baik maka baik, dan jika buruk maka buruk.
- ج4 بعد: Ketahuilah, kepada Allah -wahai manusia- kembali semua urusan kalian dari kebaikan dan keburukan, maka Dia memberi balasan kepada masing-masing sesuai amalnya: jika baik maka baik, dan jika buruk maka buruk.

**quran:7:180|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আর আল্লাহই সুবহানাহু ওয়া তা'আলার রয়েছে সুন্দরতম নামসমূহ, যা তাঁর পূর্ণ মহত্ত্বের ওপর দালালাত করে, আর তাঁর প্রতিটি নামই সুন্দর। তাই তোমরা তাঁর নামসমূহের মাধ্যমে তাঁর কাছে যা চাও তা চাও, আর তাদেরকে ছেড়ে দাও যারা তাঁর নামসমূহে পরিবর্তন করে—বৃদ্ধি, হ্রাস বা বিকৃতির মাধ্যমে—যেমন এমন নামে ডাকা হয় যারা তা পাওয়ার যোগ্য নয়, যেমন মুশরিকরা তাদের উপাস্যদেরকে সেসব নামে ডাকে, অথবা সেসব নামের এমন অর্থ নির্ধারণ করে যা আল্লাহ বা তাঁর রাসূল চাননি। সুতরাং তারা শীঘ্রই তাদের মন্দ কাজের প্রতিফল পাবে যা তারা দুনিয়ায় করত—আল্লাহর প্রতি কুফরি, তাঁর নামসমূহে ইলহাদ এবং তাঁর রাসূলকে মিথ্যা প্রতিপন্ন করা।
- ج1 بعد: আল্লাহ সুবহানাহু ওয়া তা'আলার জন্য রয়েছে সবচেয়ে সুন্দর নামসমূহ, যা তাঁর মহান মহিমার পূর্ণতা নির্দেশ করে, এবং তাঁর প্রতিটি নামই সুন্দর। অতএব, তোমরা তাঁর কাছে তাঁর নামসমূহ দিয়ে যা চাও তা প্রার্থনা কর, এবং তাদেরকে পরিত্যাগ কর যারা তাঁর নামসমূহে পরিবর্তন করে—বৃদ্ধি, হ্রাস বা বিকৃতির মাধ্যমে, যেমন অযোগ্য ব্যক্তিকে সেই নামে ডাকা হয়, যেমন মুশরিকরা তাদের উপাস্যদেরকে সেই নামে ডাকে, অথবা এমন অর্থ নির্ধারণ করা যা আল্লাহ বা তাঁর রাসূল চাননি। সুতরাং তারা শীঘ্রই তাদের মন্দ কাজের প্রতিফল পাবে যা তারা দুনিয়ায় করত—আল্লাহর সাথে কুফরি করা, তাঁর নামসমূহে ইলহাদ করা এবং তাঁর রাসূলকে মিথ্যা বলা।

**quran:2:208|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: হে ঈমানদারগণ, যারা আল্লাহকে রব এবং মুহাম্মদকে নবী ও রাসূল এবং ইসলামকে দ্বীন হিসেবে বিশ্বাস করেছ, তোমরা ইসলামের সকল বিধানে প্রবেশ কর, তার সকল বিধান অনুযায়ী আমল কর, এবং তা থেকে কিছুই বাদ দিও না, আর শয়তানের পথ অনুসরণ করো না, যা সে তোমাদেরকে গুনাহের দিকে আহ্বান করে।
- ج1 بعد: হে ঈমানদারগণ! যারা আল্লাহকে রব এবং মুহাম্মদকে নবী ও রাসূল এবং ইসলামকে দীন হিসেবে বিশ্বাস করেছ, তোমরা ইসলামের সকল বিধানের মধ্যে প্রবেশ কর, তার সকল বিধান অনুযায়ী আমল কর, এবং তা থেকে কিছুই বাদ দিও না, আর শয়তানের পথ অনুসরণ করো না যা সে তোমাদেরকে গুনাহের দিকে আহ্বান করে।

**quran:9:33|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: He is the One who sent His Messenger Muhammad, peace be upon him, with the Quran and the religion of Islam;
- ج1 بعد: It is He who sent His Messenger Muhammad, peace be upon him, with the Quran and the religion of Islam;

**quran:29:45|ur** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: اس قرآن میں سے جو کچھ آپ پر نازل کیا گیا ہے اسے پڑھیں اور اس پر عمل کریں، اور نماز کو اس کی حدود کے ساتھ ادا کریں، کیونکہ نماز کی پابندی نمازی کو گناہوں اور برائیوں میں پڑنے سے روکتی ہے۔
- ج1 بعد: اس قرآن میں سے جو کچھ تم پر نازل کیا گیا ہے اسے پڑھو اور اس پر عمل کرو، اور نماز کو اس کی حدود کے ساتھ ادا کرو، بے شک نماز کی پابندی اس کے ادا کرنے والے کو گناہوں اور برے کاموں میں پڑنے سے روکتی ہے۔
- ج2 قبل: یہ اس لیے ہے کہ جو شخص نماز قائم کرتا ہے اور اس کے ارکان و شرائط کو مکمل کرتا ہے، اس کا دل روشن ہوتا ہے، اس کا ایمان بڑھتا ہے، نیکی کی اس کی خواہش مضبوط ہوتی ہے، اور برائی کی خواہش کم یا ختم ہو جاتی ہے، اور نماز اور دیگر عبادات میں اللہ کا ذکر ہر چیز سے بڑا، عظیم اور افضل ہے۔
- ج2 بعد: یہ اس لیے کہ جو شخص اسے قائم رکھتا ہے اور اس کے ارکان اور شرائط کو مکمل کرتا ہے، اس کا دل روشن ہو جاتا ہے، اس کا ایمان بڑھتا ہے، نیکی کی اس کی خواہش مضبوط ہوتی ہے، اور برائی کی اس کی خواہش کم یا ختم ہو جاتی ہے، اور نماز میں اور اس کے علاوہ اللہ کا ذکر ہر چیز سے بڑا، افضل اور اعظم ہے۔
- ج3 قبل: اور اللہ جانتا ہے جو کچھ تم نیکی یا برائی کرتے ہو، چنانچہ وہ تمہیں اس کا مکمل اور پورا بدلہ دے گا۔
- ج3 بعد: اور اللہ جانتا ہے جو تم نیکی اور برائی کرتے ہو، چنانچہ وہ تمہیں اس کا مکمل اور بھرپور بدلہ دے گا۔

**quran:16:9|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আর আল্লাহর উপরই রয়েছে সরল পথের বিবরণ দেওয়া, যা তোমাদের হেদায়েতের জন্য, আর তা হলো ইসলাম, আর পথগুলোর মধ্যে কিছু বক্র পথ রয়েছে যা হেদায়েতে পৌঁছায় না, আর তা হলো ইসলামের বিপরীত সব মতবাদ ও দল।
- ج1 بعد: আর আল্লাহর উপরই সোজা পথের বিবরণ দেওয়া, তোমাদের হিদায়াতের জন্য, আর তা হলো ইসলাম, আর কিছু পথ আছে যা বক্র, যা হিদায়াত পর্যন্ত পৌঁছায় না, আর তা হলো ইসলামের বিপরীত সব মত ও দল।
- ج2 قبل: আর আল্লাহ যদি চাইতেন তোমাদের হেদায়েত দিতে, তবে তিনি তোমাদের সবাইকে ঈমানের দিকে হেদায়েত দিতেন।
- ج2 بعد: আর আল্লাহ যদি তোমাদের হিদায়াত চাইতেন, তবে তিনি তোমাদের সবাইকে ঈমানের দিকে হিদায়াত দিতেন।

**quran:23:52|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Et certes, votre religion—ô communauté des prophètes—est une seule religion, et c'est l'Islam, et Je suis votre Seigneur, donc craignez-Moi en obéissant à Mes ordres et en évitant Mes interdictions.
- ج1 بعد: Et certes, votre religion — ô communauté des prophètes — est une seule religion, et c'est l'islam, et Je suis votre Seigneur : craignez-Moi donc en obéissant à Mes ordres et en évitant Mes interdits.

**quran:59:23|ur** (كان ناجحًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE minor): S1: 'متکبر ہے' reads in Urdu as 'He is arrogant' for al-Mutakabbir; also 'جو انہوں نے بھیجے' shifts who sent the signs.
- ج1 قبل: وہ اللہ ہے جو حق کے ساتھ معبود ہے، جس کے سوا کوئی معبود نہیں، جو تمام چیزوں کا مالک ہے، ان میں بغیر کسی مزاحمت اور دفع کے تصرف کرنے والا ہے، ہر نقص سے پاک ہے، جو ہر عیب سے سالم ہے، اپنے رسولوں اور نبیوں کی تصدیق کرنے والا ہے ان چیزوں کے ساتھ جو اس نے انہیں بھیج کر واضح نشانیاں دیں، اپنی تمام مخلوق کے اعمال پر نگران ہے، غالب ہے جسے مغلوب نہیں کیا جا سکتا، جبار ہے جس نے تمام بندوں کو قہر کیا، اور باقی تمام مخلوق اس کے آگے جھک گئی، متکبر ہے جس کے لیے بڑائی اور عظمت ہے۔
- ج1 بعد: وہی اللہ ہے جس کی عبادت حق کے ساتھ کی جاتی ہے، جس کے سوا کوئی معبود نہیں، وہ تمام چیزوں کا بادشاہ ہے، ان میں بلا کسی مزاحمت اور دفع کے تصرف کرنے والا ہے، ہر نقص سے پاک ہے، جو ہر عیب سے سالم ہے، اپنے رسولوں اور انبیاء کو ان معجزات و روشن دلیلوں کے ساتھ تصدیق کرنے والا ہے جو انہوں نے بھیجے، اپنی تمام مخلوق کے اعمال پر نگہبان ہے، غالب ہے جسے کوئی مغلوب نہیں کر سکتا، جبار ہے جس نے تمام بندوں کو قہر کیا اور باقی مخلوق اس کے سامنے جھک گئی، متکبر ہے جس کے لیے بڑائی اور عظمت ہے۔
- ج2 قبل: اللہ تعالیٰ ہر اس چیز سے پاک ہے جو لوگ اس کی عبادت میں اس کے ساتھ شریک کرتے ہیں۔
- ج2 بعد: اللہ تعالیٰ اس سے پاک ہے جو لوگ اس کی عبادت میں اس کے ساتھ شریک کرتے ہیں۔

**quran:2:238|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Jagalah -wahai kaum muslimin- shalat-shalat fardhu yang lima dengan terus-menerus melaksanakannya pada waktunya beserta syarat-syarat, rukun-rukun, dan kewajiban-kewajibannya, dan jagalah shalat yang pertengahan di antara shalat-shalat itu yaitu shalat Ashar, dan berdirilah dalam shalat kalian dengan taat kepada Allah, khusyuk dan rendah diri.
- ج1 بعد: Peliharalah -wahai kaum muslimin- shalat-shalat lima waktu yang wajib dengan terus-menerus melaksanakannya pada waktunya beserta syarat-syarat, rukun-rukun, dan kewajiban-kewajibannya, dan peliharalah shalat yang pertengahan di antara shalat-shalat tersebut yaitu shalat Asar, dan berdirilah dalam shalat kalian dalam keadaan taat kepada Allah, khusyuk dan rendah diri.


#### (هـ2) لكل بند: الجملة قبل وبعد، والحكم

**quran:3:19|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S3: baghy rendered 'agressivité' rather than 'injustice/transgression'; minor.
- سبب الفشل القديم: S4 "Allah est prompt à rendre compte" reverses سريع الحساب (swift in calling to account → quick to give account); should be "prompt à demander compte"
- ج1 قبل: La religion qu'Allah a agréée pour Ses créatures et pour laquelle Il a envoyé Ses messagers, et qu'Il n'accepte pas autre qu'elle, est l'islam, qui est la soumission à Allah seul par l'obéissance et l'abandon à Lui par l'adoration, et le suivi des messagers dans ce qu'Allah les a envoyés à chaque époque jusqu'à ce qu'ils soient scellés par Muhammad, paix et salut sur lui, après l'envoi duquel Allah n'accepte de personne une religion autre que l'islam avec lequel il a été envoyé.
- ج1 بعد: Certes, la religion qu'Allah a agréée pour Sa création, par laquelle Il a envoyé Ses messagers, et dont Il n'accepte aucune autre, est l'Islam : c'est la soumission à Allah seul par l'obéissance, l'abandon à Lui dans l'adoration, et le suivi des messagers dans ce pour quoi Allah les a envoyés en tout temps, jusqu'à ce qu'ils aient été scellés par Muhammad (que la prière et la paix soient sur lui), après l'envoi duquel Allah n'accepte de personne une religion autre que l'Islam avec lequel il a été envoyé.
- ج2 قبل: Et la divergence entre les gens du Livre, juifs et chrétiens, ne s'est produite, et ils ne se sont divisés en sectes et en partis, qu'après que la preuve leur a été établie par l'envoi des messagers et la descente des livres ;
- ج2 بعد: Et la divergence entre les gens du Livre, juifs et chrétiens, ne s'est produite, et ils ne se sont divisés en sectes et en factions, qu'après que la preuve eut été établie contre eux par l'envoi des messagers et la révélation des livres ;
- ج3 قبل: par transgression et envie, recherchant les biens de ce monde.
- ج3 بعد: Par agressivité, par envie, et par recherche des biens d'ici-bas.
- ج4 قبل: Et quiconque renie les versets révélés d'Allah et Ses signes indiquant Sa seigneurie et Sa divinité, alors Allah est prompt à rendre compte, et Il les rétribuera pour ce qu'ils faisaient.
- ج4 بعد: Et quiconque renie les signes d'Allah révélés et Ses signes indiquant Sa seigneurie et Sa divinité, alors Allah est prompt à demander compte, et Il les rétribuera selon ce qu'ils faisaient.

**quran:2:285|fr** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE ok): S1: 'ne croyons pas à certains d'entre eux et n'en rejetons pas d'autres' shifts the negation; Arabic: we do not believe in some while denying others.
- سبب الفشل القديم: S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses
- ج1 قبل: Il a cru et a eu la certitude, le Messager d'Allah, Muhammad, paix et salut sur lui, en ce qui lui a été révélé de son Seigneur, et il lui est juste d'avoir la certitude, et les croyants de même ont cru et ont œuvré selon le Coran sublime, chacun d'eux a cru en Allah comme Seigneur et divinité, doté des attributs de majesté et de perfection, et qu'Allah a des anges honorables, et qu'Il a fait descendre des livres, et qu'Il a envoyé à Ses créatures des messagers, nous ne croyons pas - nous, les croyants - en certains et nous nions certains, mais nous croyons en eux tous.
- ج1 بعد: Le Messager d'Allah, Muhammad, que la prière et le salut soient sur lui, a cru avec certitude et a été convaincu de ce qui lui a été révélé de son Seigneur, et il lui convient d'être convaincu ; et les croyants, de même, ont cru et ont agi selon le noble Coran ; chacun d'eux a cru en Allah comme Seigneur et Dieu, doté des attributs de majesté et de perfection, et qu'Allah a des anges honorables, et qu'Il a fait descendre des livres, et qu'Il a envoyé à Ses créatures des messagers — nous, les croyants, ne croyons pas à certains d'entre eux et n'en rejetons pas d'autres, mais nous croyons à tous.
- ج2 قبل: Et le Messager et les croyants ont dit : Nous avons entendu, ô notre Seigneur, ce que Tu as révélé, et nous avons obéi en tout cela, nous espérons que Tu pardonnes - par Ta grâce - nos péchés, car Tu es Celui qui nous a éduqués par ce dont Tu nous as gratifiés, et vers Toi - seul - est notre retour et notre destinée.
- ج2 بعد: Et le Messager et les croyants ont dit : « Nous avons entendu, ô notre Seigneur, ce que Tu as révélé, et nous avons obéi en tout cela ; nous espérons que Tu pardonnes, par Ta grâce, nos péchés, car c'est Toi qui nous as éduqués par ce dont Tu nous as comblés, et vers Toi, seul, est notre retour et notre destinée. »

**quran:2:285|bn** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: S1: 'لا نؤمن ببعضهم وننكر بعضهم' (we do not believe in some and deny others) rendered 'তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না' (we do not believe in any of them and do not deny any) - creedal clause reversed/contradictory; also 'رسول الله' reduced to 'রাসূল' and clumsy 'তার জন্য নিশ্চিত করা উচিত ছিল'
- ج1 قبل: রাসূল মুহাম্মদ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম তার রবের কাছ থেকে যা ওহি করা হয়েছে তা সত্য বলে বিশ্বাস করেছেন এবং নিশ্চিত করেছেন, এবং তার জন্য নিশ্চিত করা উচিত ছিল, এবং মুমিনরাও তেমনই সত্য বলে বিশ্বাস করেছেন এবং মহান কুরআন অনুযায়ী আমল করেছেন, তাদের প্রত্যেকে আল্লাহকে রব এবং ইলাহ হিসেবে বিশ্বাস করেছে যিনি মহিমা ও পূর্ণতার গুণে গুণান্বিত, এবং আল্লাহর রয়েছে সম্মানিত ফেরেশতারা, এবং তিনি কিতাবসমূহ নাযিল করেছেন, এবং তার সৃষ্টির কাছে রাসূলগণ পাঠিয়েছেন—আমরা মুমিনরা তাদের কাউকে বিশ্বাস করি না এবং কাউকে অস্বীকার করি না, বরং আমরা তাদের সকলকে বিশ্বাস করি।
- ج1 بعد: রসূলুল্লাহ মুহাম্মদ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম তাঁর রবের পক্ষ থেকে তাঁর কাছে যা ওহী করা হয়েছে তা সত্যায়ন করেছেন এবং দৃঢ় বিশ্বাস করেছেন, আর তাঁর বিশ্বাস করাই ছিল সঙ্গত; এবং মুমিনগণও তেমনই সত্যায়ন করেছেন এবং মহান কুরআন অনুযায়ী আমল করেছেন। তাদের প্রত্যেকে আল্লাহকে রব ও ইলাহ হিসেবে সত্যায়ন করেছেন, যিনি মহিমা ও পরিপূর্ণতার গুণাবলিতে গুণান্বিত, এবং নিশ্চয়ই আল্লাহর সম্মানিত ফেরেশতারা রয়েছেন, এবং তিনি কিতাবসমূহ নাযিল করেছেন, এবং তাঁর সৃষ্টির কাছে রসূলগণ পাঠিয়েছেন। আমরা -মুমিনগণ- তাদের কতককে বিশ্বাস করা এবং কতককে অস্বীকার করা - এমনটা করি না; বরং আমরা তাদের সকলকে বিশ্বাস করি।
- ج2 قبل: এবং রাসূল ও মুমিনরা বলেছেন: হে আমাদের রব, আমরা শুনেছি যা আপনি ওহি করেছেন, এবং আমরা সবকিছুতে আনুগত্য করেছি, আমরা আশা করি যে আপনি—আপনার অনুগ্রহে—আমাদের গুনাহ ক্ষমা করবেন, কারণ আপনিই আমাদেরকে আপনার অনুগ্রহে লালন-পালন করেছেন, এবং আপনার দিকেই—একমাত্র—আমাদের প্রত্যাবর্তন ও পরিণতি।
- ج2 بعد: আর রসূল ও মুমিনগণ বলেছেন: হে আমাদের পালনকর্তা! আপনি যা ওহী করেছেন তা আমরা শুনেছি এবং সে সবকিছুতে আমরা আনুগত্য করেছি। আমরা আশা করি যে, আপনি -আপনার অনুগ্রহে- আমাদের গুনাহ ক্ষমা করবেন। কারণ আপনিই তো আমাদের প্রতি অনুগ্রহ দান করে আমাদের লালন-পালন করেছেন। এবং আপনারই -একমাত্র আপনারই- দিকে আমাদের প্রত্যাবর্তন ও পরিণতি।

**quran:51:56|tr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: The verb 'created' (خلقت) is dropped; 'cinleri ve insanları ve tüm peygamberleri göndermem' makes jinn and mankind objects of 'send' and leaves the sentence without a finite negative verb; the verse's core statement is lost.
- ج1 قبل: Ve ben cinleri ve insanları ve tüm peygamberleri göndermem, yalnızca yüce bir gaye için: yalnızca bana ibadet etmeleri için, benden başkasına değil.
- ج1 بعد: Ben cinleri ve insanları yaratmadım ve bütün resulleri göndermedim; ancak yüce bir gaye için: o da yalnızca Bana kulluk etmeleridir, benden başkasına değil.

**quran:42:13|tr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: Addressee changed: 'size vahyettiğimiz dinden' says the religion was revealed to the people (plural) and drops 'O Messenger' (أوحيناه إليك أيها الرسول); also omits 'that Noah practise and convey it' (أن يعمله ويبلغه).
- ج1 قبل: Allah, ey insanlar, size vahyettiğimiz dinden -ki o İslam'dır- Nuh'a tavsiye ettiği şeyi, İbrahim, Musa ve İsa'ya da tavsiye ettiğimiz şeyi meşru kıldı (bu beşi, meşhur görüşe göre, azim sahibi peygamberlerdir): Dini tevhid, Allah'a itaat ve O'ndan başkasına ibadet etmeme üzere ikame edin ve size emrettiğim din hakkında ihtilafa düşmeyin. Müşriklere, onları davet ettiğin tevhid ve ibadeti Allah'a has kılma ağır geldi. Allah, tevhid için kullarından dilediğini seçer ve O'na dönenleri itaatine çalışmak üzere muvaffak kılar.
- ج1 بعد: Allah size – ey insanlar – sana – ey peygamber – vahyettiğimiz dinden, ki o İslam'dır, Nuh'a onu yapmasını ve tebliğ etmesini vasiyet ettiği şeyleri ve İbrahim'e, Musa'ya ve İsa'ya da vasiyet ettiğimiz şeyleri (bu beşi meşhur görüşe göre azim sahibi peygamberlerdir) şeriat kıldı: Dini tevhid ile, Allah'a itaat ve O'ndan başkasına ibadet etmeksizin yalnız O'na ibadet ile ayakta tutun; size emrettiğim din hakkında ayrılığa düşmeyin; müşriklerin, onları Allah'ı birlemeye ve ibadeti yalnız O'na halis kılmaya çağırman ağırlarına gitti; Allah, yaratıklarından dilediğini tevhid için seçer ve kendisine döneni de O'na itaat etme işine muvaffak kılar.

**quran:42:13|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'vous a légiféré' is awkward; '(unicité de Dieu)' gloss harmless.
- سبب الفشل القديم: broken French: "Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir…" (dangling preposition, unparseable clause)
- ج1 قبل: Dieu a établi pour vous, ô gens, de la religion que Nous t'avons révélée — ô Messager, à savoir l'islam — ce qu'Il a recommandé à Noé de pratiquer et de transmettre, et ce que Nous avons recommandé à Abraham, Moïse et Jésus (ces cinq sont, selon l'avis célèbre, les messagers doués de fermeté) : d'établir la religion par le monothéisme, l'obéissance à Dieu et Son adoration à Lui seul, sans autre que Lui, et de ne pas diverger dans la religion que Je vous ai ordonnée. Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir l'unicité de Dieu et la sincérité de l'adoration pour Lui. Dieu choisit pour le monothéisme qui Il veut parmi Ses créatures, et guide vers l'action selon Son obéissance celui qui revient à Lui.
- ج1 بعد: Allah vous a légiféré, ô gens, de la religion que Nous t'avons révélée, ô Messager, et qui est l'islam, ce qu'Il a recommandé à Noé de pratiquer et de transmettre, et ce que Nous avons recommandé à Abraham, Moïse et Jésus (ces cinq sont, selon l'avis le plus connu, les messagers doués de fermeté) : établissez la religion par le tawhid (unicité de Dieu), l'obéissance à Allah et Son adoration sans rien d'autre que Lui, et ne divergez pas dans la religion que Je vous ai ordonnée. Ce à quoi tu les appelles, à savoir l'unicité d'Allah et la sincérité de l'adoration pour Lui, a paru énorme aux associateurs. Allah choisit pour le tawhid qui Il veut parmi Ses créatures, et Il accorde la réussite pour l'œuvre de Son obéissance à celui qui revient vers Lui.

**quran:2:21|hi** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: s2: 'أوجدكم من العدم' (brought you into being from non-existence) rendered 'अस्तित्व से पैदा किया' (created you from existence) - reversed meaning
- ج1 قبل: अल्लाह की ओर से सभी मनुष्यों के लिए पुकार: कि अल्लाह की इबादत करो जिसने तुम्हें अपनी नेमतों से पाला, और उससे डरो और उसके दीन की खिलाफ़त न करो;
- ج1 بعد: यह अल्लाह की ओर से सभी इंसानों के लिए एक पुकार है: कि अल्लाह की इबादत करो, जिसने अपनी नेमतों से तुम्हें पाला, और उससे डरो और उसके दीन का विरोध मत करो।
- ج2 قبل: क्योंकि उसने तुम्हें अस्तित्व से पैदा किया, और तुमसे पहले वालों को भी पैदा किया;
- ج2 بعد: क्योंकि उसने तुम्हें शून्य से पैदा किया, और तुमसे पहले के लोगों को भी पैदा किया।
- ج3 قبل: ताकि तुम उन मुत्तक़ियों में से हो जाओ जिनसे अल्लाह राज़ी हुआ और वे उससे राज़ी हुए।
- ج3 بعد: ताकि तुम उन परहेज़गारों में से हो जाओ, जिनसे अल्लाह राज़ी है और वे उससे राज़ी हैं।

**quran:2:255|id** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor): S2: kayfiyyah rendered 'hakikatnya' (its reality) rather than 'its how'; acceptable.
- سبب الفشل القديم: S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet)
- ج1 قبل: Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia, Yang Maha Hidup yang memiliki semua makna kehidupan yang sempurna sebagaimana layaknya keagungan-Nya, Yang Maha Berdiri sendiri atas segala sesuatu, tidak mengantuk-Nya yaitu: kantuk, dan tidak tidur, segala yang di langit dan di bumi adalah milik-Nya, dan tidak ada seorang pun yang berani memberi syafaat di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi semua makhluk baik yang telah lalu, sekarang, dan yang akan datang, Dia mengetahui apa yang di hadapan makhluk dari perkara yang akan datang, dan apa yang di belakang mereka dari perkara yang telah lalu, dan tidak ada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Dia ajarkan dan beritahukan kepadanya.
- ج1 بعد: Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia, Yang Hidup yang memiliki semua makna kehidupan yang sempurna sebagaimana layak dengan keagungan-Nya, Yang terus menerus mengurus segala sesuatu, tidak menguasai-Nya kantuk, yaitu: ngantuk, dan tidak tidur, semua yang ada di langit dan di bumi adalah milik-Nya, dan tidak ada seorang pun yang berani memberi syafa'at di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi seluruh makhluk, masa lampau, masa sekarang, dan masa depannya, Dia mengetahui apa yang di hadapan para makhluk berupa perkara-perkara yang akan datang, dan apa yang di belakang mereka berupa perkara-perkara yang telah lalu, dan tidak ada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Allah ajarkan kepadanya dan Allah perlihatkan kepadanya.
- ج2 قبل: Meliputi kursi-Nya langit dan bumi, dan kursi: adalah tempat kedua kaki Tuhan -Maha Agung kebesaran-Nya- dan tidak diketahui bagaimana bentuknya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanahu menjaga keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya atas semua makhluk-Nya, Yang Maha Mengumpulkan semua sifat keagungan dan kebesaran.
- ج2 بعد: Kursi-Nya meliputi langit dan bumi, dan Kursi adalah tempat kedua kaki Rabb -Maha Agung kebesaran-Nya- dan tidak ada yang mengetahui hakikatnya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanahu memelihara keduanya, dan Dia Maha Tinggi dengan zat dan sifat-sifat-Nya di atas seluruh makhluk-Nya, Yang mengumpulkan semua sifat keagungan dan kebesaran.
- ج3 قبل: Dan ayat ini adalah ayat yang paling agung dalam Al-Qur'an, dan disebut: (Ayat Kursi).
- ج3 بعد: Dan ayat ini adalah ayat yang paling agung dalam Al-Qur'an, dan dinamakan: (Ayat Kursi).

**quran:2:255|ms** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S2: kayfiyyah as 'hakikatnya' (its reality); acceptable.
- سبب الفشل القديم: Garbled grammar in s1: 'Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia' reads on its face as Allah not entitled to divinity; malformed 'tidak mengantuk-Nya iaitu: rasa kantuk'; broken word 'Subhanah' in s2; 'al-Qa'im ala kulli shay' rendered 'berdiri sendiri atas segala sesuatu'
- ج1 قبل: Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia, yang Maha Hidup yang memiliki semua makna kehidupan yang sempurna sebagaimana layaknya keagungan-Nya, yang berdiri sendiri atas segala sesuatu, tidak mengantuk-Nya iaitu: rasa kantuk, dan tidak tidur, segala yang di langit dan di bumi adalah milik-Nya, dan tiada seorang pun berani memberi syafaat di sisi-Nya kecuali dengan izin-Nya, ilmu-Nya meliputi semua makhluk yang telah lalu, sekarang dan akan datang, Dia mengetahui apa yang di hadapan makhluk dari perkara yang akan datang, dan apa yang di belakang mereka dari perkara yang telah lalu, dan tiada seorang pun dari makhluk yang mengetahui sesuatu dari ilmu-Nya kecuali dengan apa yang Dia ajarkan dan beritahukan kepadanya.
- ج1 بعد: Allah yang tiada yang berhak menerima ketuhanan dan pengabdian melainkan Dia, Yang Tetap hidup yang bagi-Nya semua makna kehidupan yang sempurna sebagaimana layak dengan keagungan-Nya, yang mentadbirkan segala sesuatu, tidak menguasai-Nya kantuk, iaitu mengantuk, dan tidak juga tidur, segala yang ada di langit dan yang ada di bumi adalah milik-Nya, dan tiada sesiapa yang berani memberi syafaat di sisi-Nya melainkan dengan izin-Nya, ilmu-Nya meliputi seluruh makhluk, yang telah lalu, yang sekarang, dan yang akan datang, Dia mengetahui apa yang di hadapan makhluk-makhluk dari perkara-perkara yang akan datang, dan apa yang di belakang mereka dari perkara-perkara yang telah lalu, dan tiada seorang pun dari makhluk yang dapat mengetahui sesuatu dari ilmu-Nya melainkan dengan apa yang Allah ajarkan kepadanya dan beritahukan kepadanya.
- ج2 قبل: Kursi-Nya meliputi langit dan bumi, dan kursi itu: adalah tempat tapak kaki Tuhan -Maha Mulia keagungan-Nya- dan tiada yang mengetahui hakikatnya kecuali Allah Subhanahu, dan tidak memberatkan-Nya Subhanah menjaga keduanya, dan Dia Maha Tinggi dengan zat dan sifat-Nya atas semua makhluk-Nya, yang menghimpun semua sifat keagungan dan kebesaran.
- ج2 بعد: Luasnya Kursi-Nya meliputi langit dan bumi, dan Kursi itu ialah tempat kedua kaki Tuhan -Maha Suci keagungan-Nya-, dan tiada yang mengetahui hakikatnya melainkan Allah Subhanahu, dan tidak memberatkan-Nya Subhanahu menjaga serta memelihara keduanya, dan Dia Maha Tinggi dengan zat dan sifat-sifat-Nya atas semua makhluk-Nya, yang menghimpunkan semua sifat keagungan dan kebesaran.
- ج3 قبل: Dan ayat ini adalah ayat yang paling agung dalam Al-Quran, dan dinamakan: (Ayat Kursi).
- ج3 بعد: Dan ayat ini adalah ayat yang paling agung dalam Al-Quran, dan dinamakan: (Ayat al-Kursi).

**quran:2:255|fr** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE minor): S2: al-Kursi rendered 'Son Trône (Kursiy)'; S1 'ce qu'Allah Lui a enseigné' capitalises Lui, pointing to Allah instead of the creature.
- سبب الفشل القديم: Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature
- ج1 قبل: Allah, qui seul mérite la divinité et l'adoration, le Vivant qui possède toutes les significations de la vie parfaite comme convient à Sa majesté, Celui qui veille sur toute chose, ni l'assoupissement, c'est-à-dire la somnolence, ni le sommeil ne Le saisissent, tout ce qui est dans les cieux et tout ce qui est sur la terre Lui appartient, et nul n'ose intercéder auprès de Lui sans Sa permission, Sa science englobe toutes les créatures, passées, présentes et futures, Il sait ce qui est devant les créatures des affaires futures, et ce qui est derrière eux des affaires passées, et nul parmi les créatures ne découvre quelque chose de Sa science sauf ce qu'Allah Lui a enseigné et Lui a révélé.
- ج1 بعد: Allah, qui ne mérite la divinité et l'adoration que Lui seul, est le Vivant qui possède toutes les significations de la vie parfaite comme il convient à Sa majesté, Celui qui veille sur toute chose ; ni somnolence, c'est-à-dire l'assoupissement, ni sommeil ne Le saisissent ; tout ce qui est dans les cieux et sur la terre Lui appartient ; nul n'ose intercéder auprès de Lui sans Sa permission ; Sa science embrasse toutes les créatures, leur passé, leur présent et leur avenir ; Il sait ce qui est devant les créatures comme affaires futures, et ce qui est derrière eux comme affaires passées ; et nul parmi les créatures n'accède à quoi que ce soit de Sa science, sauf par ce qu'Allah Lui a enseigné et Lui a fait connaître.
- ج2 قبل: Son Trône s'étend sur les cieux et la terre, et le Trône : c'est l'endroit des pieds du Seigneur - que Sa majesté soit exaltée - et nul ne connaît sa modalité sauf Allah, le Glorieux, et la préservation des deux ne Lui pèse pas, et Il est Élevé par Son essence et Ses attributs au-dessus de toutes Ses créatures, Celui qui rassemble tous les attributs de grandeur et de majesté.
- ج2 بعد: Son Trône (Kursiy) englobe les cieux et la terre ; et le Kursiy est l'emplacement des deux pieds du Seigneur - gloire à Sa majesté - et nul ne connaît sa réalité (comment il est) sauf Allah, le Glorifié ; et leur garde ne Lui coûte aucune peine, à Lui le Glorifié ; et Il est le Très-Haut par Son essence et Ses attributs au-dessus de toutes Ses créatures, Celui qui réunit tous les attributs de grandeur et de majesté.
- ج3 قبل: Et ce verset est le plus grand verset du Coran, et il est appelé : (le Verset du Trône).
- ج3 بعد: Et ce verset est le plus grand verset du Coran, et il est appelé : (Âyat al-Kursî).

**quran:2:255|es** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S2: kayfiyyah as 'su naturaleza'; al-Kursi correctly 'Escabel', not Throne.
- سبب الفشل القديم: S2-S3: الكرسي rendered 'Trono' (Throne, = العرش) — 'Su Trono (Kursi) ... el Trono (Kursi) es el lugar de los pies del Señor' conflates al-Kursi with the Throne, contradicting the Muyassar's own gloss that the Kursi is the place of the two feet; 'Versículo del Trono' repeats it. S1: 'Dios, que no merece la divinidad y la adoración sino Él' is garbled — reads as God not deserving divinity (Arabic: none deserves divinity and worship except Him). S2: 'soberbia' (arrogance) for الكبرياء
- ج1 قبل: Dios, que no merece la divinidad y la adoración sino Él, el Viviente que posee todos los significados de la vida perfecta como corresponde a Su majestad, el que se mantiene sobre todas las cosas, no Le sobreviene somnolencia, es decir, sueño ligero, ni sueño profundo; todo lo que hay en los cielos y en la tierra Le pertenece, y nadie se atreve a interceder ante Él excepto con Su permiso; Su conocimiento abarca todas las criaturas, pasadas, presentes y futuras; sabe lo que está delante de las criaturas de asuntos futuros y lo que hay detrás de ellas de asuntos pasados, y ninguno de los seres creados accede a algo de Su conocimiento excepto por lo que Dios le ha enseñado y le ha revelado.
- ج1 بعد: Allah, Quien no merece la divinidad y la adoración sino Él, el Viviente, Quien posee todos los significados de la vida completa como corresponde a Su majestad, el Sustentador de todo, no Le afecta la somnolencia, es decir, el sueño ligero, ni el sueño; todo lo que hay en los cielos y lo que hay en la tierra es Suyo, y nadie se atreve a interceder ante Él excepto con Su permiso; Su conocimiento abarca todas las criaturas, su pasado, su presente y su futuro; sabe lo que tienen por delante de asuntos futuros y lo que tienen por detrás de asuntos pasados, y ningún ser creado accede a nada de Su conocimiento excepto en lo que Allah le ha enseñado y le ha mostrado.
- ج2 قبل: Su Trono (Kursi) abarca los cielos y la tierra, y el Trono (Kursi) es el lugar de los pies del Señor —glorificada sea Su majestad— y nadie conoce su cualidad sino Dios, el Glorioso, y no Le pesa, Glorificado sea, preservarlos, y Él es el Altísimo por Su esencia y atributos sobre todas Sus criaturas, el que reúne todos los atributos de grandeza y soberbia.
- ج2 بعد: Su Escabel abarca los cielos y la tierra, y el Escabel es el lugar de los pies del Señor -glorificada sea Su majestad-, y nadie conoce su naturaleza excepto Allah, glorificado sea, y no Le causa fatiga, glorificado sea, mantenerlos, y Él es el Elevado por Su esencia y Sus atributos sobre todas Sus criaturas, el que reúne todas las cualidades de grandeza y majestad.
- ج3 قبل: Y este versículo es el más grande versículo del Corán, y se llama: (Versículo del Trono).
- ج3 بعد: Y esta aleya es la aleya más grandiosa del Corán, y se llama: (Aleya del Escabel).

**quran:4:87|tr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- سبب الفشل القديم: المتفرد بالألوهية (sole possessor of divinity) rendered 'uluhiyyetle müteferriktir'; Turkish 'müteferrik' means scattered/various, a false cognate producing a wrong statement about Allah's divinity.
- ج1 قبل: Allah tek başına tüm yaratıklar için uluhiyyetle müteferriktir; sizi, hakkında hiçbir şüphe bulunmayan kıyamet gününde hesap ve ceza için mutlaka bir araya toplayacaktır.
- ج1 بعد: Allah, bütün yaratılmışlar için ulûhiyette tek ve eşsizdir; sizi, hakkında şüphe olmayan kıyamet gününde hesap ve karşılık için mutlaka toplayacaktır.
- ج2 قبل: Ve Allah'ın haber verdiği şeylerde sözünde O'ndan daha doğru sözlü hiç kimse yoktur.
- ج2 بعد: Allah'ın haber verdiği şeylerde, söz olarak O'ndan daha doğru sözlü hiç kimse yoktur.

**quran:64:13|hi** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: 'المؤمنون بوحدانيته' (those who believe in His oneness) rendered 'ईमानवालों को अपनी एकता में' (believers, in their own unity) - qualifier changed, new idea added
- ج1 قبل: अल्लाह अकेला है, उसके सिवा कोई सच्चा पूज्य नहीं; और अल्लाह ही पर ईमानवालों को अपनी एकता में हर मामले में भरोसा करना चाहिए।
- ج1 بعد: अल्लाह अकेला है, उसके सिवा कोई सच्चा पूज्य नहीं; और अल्लाह ही पर तौहीद को मानने वाले ईमान वालों को अपने सभी मामलों में भरोसा करना चाहिए।

**quran:48:26|ur** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: s1: 'إذ جعل الذين كفروا في قلوبهم الأنفة' rendered 'جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی' - an unnamed 'they' puts the arrogance into the disbelievers' hearts instead of the disbelievers harbouring it themselves (agent changed); 'الأنفة' weakened to 'ضد'; s2: 'دون المشركين' (not the polytheists) mistranslated 'مشرکوں کے بغیر' (without the polytheists)
- ج1 قبل: جب انہوں نے کفر کرنے والوں کے دلوں میں جاہلیت کی ضد رکھی،
- ج1 بعد: جب کافروں نے اپنے دلوں میں تکبر رکھا، جاہلیت کا تکبر۔
- ج2 قبل: تاکہ وہ محمد صلی اللہ علیہ وسلم کی رسالت کو تسلیم نہ کریں، اور اسی میں سے ان کا حدیبیہ کے صلح نامے میں 'بسم اللہ الرحمن الرحیم' لکھنے سے انکار اور 'یہ وہ معاہدہ ہے جو محمد رسول اللہ نے کیا' لکھنے سے انکار تھا، تو اللہ نے اپنے رسول اور ان کے ساتھ ایمان لانے والوں پر سکون نازل کیا، اور انہیں 'لا إله إلا اللہ' کے قول کا پابند بنایا جو ہر تقویٰ کی جڑ ہے، اور رسول اللہ صلی اللہ علیہ وسلم اور ان کے ساتھ ایمان لانے والے مشرکوں سے تقویٰ کے کلمے کے زیادہ حقدار تھے، اور وہی اس کلمے کے اہل تھے مشرکوں کے بغیر۔
- ج2 بعد: تاکہ وہ محمد صلی اللہ علیہ وسلم کی رسالت کو تسلیم نہ کریں، اور اس میں سے یہ تھا کہ انہوں نے صلح حدیبیہ میں 'بسم اللہ الرحمن الرحیم' لکھنے سے انکار کیا، اور انہوں نے یہ لکھنے سے بھی انکار کیا کہ 'یہ وہ ہے جس پر محمد رسول اللہ نے صلح کی'، پھر خدا نے اپنے پیغمبر اور ان کے ساتھ مومنین پر تسکین نازل فرمائی، اور انہیں 'لا الہ الا اللہ' کے قول کا پابند بنایا جو ہر تقویٰ کی جڑ ہے، اور پیغمبر صلی اللہ علیہ وسلم اور ان کے ساتھ مومنین مشرکوں سے زیادہ پرہیزگاری کی بات کے حقدار تھے، اور وہی اس بات کے اہل تھے، مشرک نہیں۔
- ج3 قبل: اور اللہ ہر چیز سے خوب واقف ہے، اس پر کوئی چیز پوشیدہ نہیں۔
- ج3 بعد: اور خدا ہر چیز سے خبردار ہے، اس پر کوئی چیز پوشیدہ نہیں۔

**quran:6:19|id** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S2: 'azab-Nya yang akan menimpa kamu' for 'lest it befall you'; acceptable as a warning.
- سبب الفشل القديم: S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted
- ج1 قبل: Katakanlah -wahai Rasul kepada orang-orang musyrik ini-: 'Apakah sesuatu yang paling besar kesaksiannya dalam menetapkan kebenaranku dalam apa yang aku kabarkan kepada kalian bahwa aku adalah utusan Allah?'
- ج1 بعد: Katakanlah -wahai Rasul kepada orang-orang musyrik ini-: "Apakah sesuatu yang paling besar persaksiannya dalam menetapkan kebenaranku dalam apa yang aku kabarkan kepada kamu bahwa aku adalah utusan Allah?"
- ج2 قبل: Katakanlah: 'Allah menjadi saksi antara aku dan kalian', maksudnya: Dia Maha Mengetahui apa yang aku bawa kepada kalian dan apa yang kalian katakan kepadaku, dan Allah mewahyukan kepadaku Al-Qur'an ini agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian, dan memperingatkan dengannya umat-umat yang sampai kepadanya.
- ج2 بعد: Katakanlah: "Allah menjadi saksi antara aku dan kamu", yaitu Dia mengetahui apa yang aku bawa kepadamu dan apa yang kamu katakan kepadaku, dan Allah mewahyukan kepadaku Al-Quran ini agar aku memberi peringatan kepadamu dengannya akan azab-Nya yang akan menimpa kamu, dan memberi peringatan dengannya kepada siapa pun dari umat-umat yang sampai kepadanya.
- ج3 قبل: Sesungguhnya kalian mengakui bahwa bersama Allah ada sesembahan-sesembahan lain yang kalian sekutukan dengan-Nya.
- ج3 بعد: Sesungguhnya kamu benar-benar mengakui bahwa di samping Allah ada tuhan-tuhan lain yang kamu persekutukan dengan-Nya.
- ج4 قبل: Katakanlah kepada mereka -wahai Rasul-: 'Sesungguhnya aku tidak bersaksi atas apa yang kalian akui itu, sesungguhnya Allah hanyalah Tuhan yang Maha Esa tidak ada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri dari setiap sekutu yang kalian sembah bersama-Nya.'
- ج4 بعد: Katakanlah kepada mereka -wahai Rasul-: "Sesungguhnya aku tidak bersaksi atas apa yang kamu akui itu. Sesungguhnya Allah adalah Tuhan Yang Maha Esa, tidak ada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri dari setiap sekutu yang kamu sembah bersama-Nya."

**quran:6:19|ms** (كان فاشلًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE ok): S2: 'memberi amaran ... tentang azab-Nya supaya ia menimpa kamu' makes the punishment befalling them the warning's purpose; Arabic warns lest it befall.
- سبب الفشل القديم: s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted
- ج1 قبل: Katakanlah -wahai Rasul- kepada orang-orang musyrik ini: Apakah sesuatu yang paling besar kesaksiannya dalam membuktikan kebenaranku dalam apa yang aku khabarkan kepada kamu bahawa aku adalah utusan Allah?
- ج1 بعد: Katakanlah -wahai Rasul kepada orang-orang musyrik ini-: Apakah sesuatu yang lebih besar persaksiannya dalam menetapkan kebenaranku terhadap apa yang aku khabarkan kepada kamu bahawa aku ini utusan Allah?
- ج2 قبل: Katakanlah: Allah menjadi saksi antara aku dan kamu, iaitu: Dia Maha Mengetahui apa yang aku bawa kepada kamu dan apa yang kamu katakan kepadaku, dan Allah mewahyukan kepadaku al-Quran ini supaya aku memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu, dan memberi amaran dengannya kepada sesiapa yang sampai kepadanya daripada kalangan umat-umat.
- ج2 بعد: Katakanlah: Allah menjadi Saksi antaraku dengan kamu, maksudnya: Dia Maha Mengetahui apa yang aku bawa kepada kamu dan apa yang kamu akan katakan kepadaku, dan Allah mewahyukan kepadaku Al-Quran ini supaya aku memberi amaran dengannya kepada kamu tentang azab-Nya supaya ia menimpa kamu, dan memberi amaran dengannya kepada sesiapa yang telah sampai kepadanya seruan itu daripada kalangan umat-umat.
- ج3 قبل: Sesungguhnya kamu mengakui bahawa bersama Allah terdapat tuhan-tuhan lain yang kamu sekutukan dengan-Nya.
- ج3 بعد: Sesungguhnya kamu benar-benar mengakui bahawa bersama-sama Allah ada tuhan-tuhan lain yang kamu sekutukan dengan-Nya.
- ج4 قبل: Katakanlah kepada mereka -wahai Rasul-: Sesungguhnya aku tidak bersaksi atas apa yang kamu akui itu, sesungguhnya Allah itu Tuhan yang satu, tiada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri daripada setiap sekutu yang kamu sembah bersama-Nya.
- ج4 بعد: Katakanlah kepada mereka -wahai Rasul-: Sesungguhnya aku tidak menjadi saksi terhadap apa yang kamu akui itu, hanyasanya Allah Tuhan Yang Maha Esa, tiada sekutu bagi-Nya, dan sesungguhnya aku berlepas diri daripada setiap sekutu yang kamu sembah bersama-Nya.

**quran:59:23|fr** (كان فاشلًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE ok): S1: al-Mutakabbir rendered 'l'Orgueilleux' and al-kibriya' as 'l'orgueil' (arrogance, pejorative in French).
- سبب الفشل القديم: divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux"
- ج1 قبل: Il est Allah, l'adoré en vérité, il n'y a de divinité que Lui, le Roi de toutes choses, qui en dispose sans opposition ni résistance, exempt de toute imperfection, pur de tout défaut, Celui qui confirme Ses messagers et Ses prophètes par les signes évidents qu'Il leur a envoyés, l'Observateur de toute Sa création dans leurs actions, le Puissant qui ne peut être vaincu, le Dominateur qui a soumis tous les serviteurs, et auquel toute la création s'est soumise, l'Orgueilleux à qui appartiennent la grandeur et la majesté.
- ج1 بعد: C'est Lui, Allah, l'adoré en vérité, Celui qui n'a nulle divinité autre que Lui, le Souverain de toutes choses, Celui qui en dispose sans empêchement ni résistance, exempt de toute imperfection, qui est sain de tout défaut, Celui qui confirme Ses messagers et Ses prophètes par les signes évidents avec lesquels Il les a envoyés, le Vigilant sur toute Sa création dans leurs œuvres, le Tout Puissant qui ne saurait être vaincu, le Contraignant qui a dominé tous les serviteurs, et à qui toute la création s'est soumise, l'Orgueilleux, à qui appartiennent l'orgueil et la grandeur.
- ج2 قبل: Allah, exalté soit-Il, est exempt de tout ce qu'ils Lui associent dans Son adoration.
- ج2 بعد: Allah, exalté soit-Il, transcende tout ce qu'ils Lui associent dans Son adoration.

**quran:37:35|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'ils étaient ordonnés d'abandonner' is non-idiomatic French; meaning intact.
- سبب الفشل القديم: "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer)
- ج1 قبل: Ces associateurs, dans la vie ici-bas, lorsqu'on leur disait : « Il n'y a de divinité qu'Allah », et qu'on les y appelait, et qu'on leur ordonnait d'abandonner ce qui la contredit, s'enorgueillissaient de cela et de celui qui l'apportait.
- ج1 بعد: En vérité, ces associateurs, lorsqu'on leur disait dans la vie ici-bas : « Point de divinité à part Allah », et qu'ils étaient appelés à elle, et qu'ils étaient ordonnés d'abandonner ce qui la contredit, ils se gonflaient d'orgueil envers elle et envers celui qui l'avait apportée.

**quran:48:26|fr** (كان فاشلًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: al-anafa (disdainful pride) rendered 'la fureur'; nuance shifted, not reversed.
- سبب الفشل القديم: S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent
- ج1 قبل: Lorsqu'ils ont mis dans leurs cœurs l'orgueil, l'orgueil de l'époque de l'ignorance (al-Jahiliyya),
- ج1 بعد: Quand ceux qui ont mécru eurent mis dans leurs cœurs la fureur, la fureur de l'ignorance ;
- ج2 قبل: afin de ne pas reconnaître le message de Muhammad, paix et salut sur lui, et parmi cela, leur refus d'écrire dans le traité de Hudaybiyya « Au nom de Dieu, le Tout Miséricordieux, le Très Miséricordieux » et leur refus d'écrire « Ceci est ce sur quoi Muhammad, le Messager de Dieu, a conclu un pacte », Dieu a alors fait descendre la quiétude (sakina) sur Son Messager et sur les croyants avec lui, et leur a imposé la parole « Il n'y a de divinité que Dieu » (La ilaha illa Allah), qui est la tête de toute piété, et le Messager de Dieu, paix et salut sur lui, et les croyants avec lui étaient plus dignes de la parole de piété que les associateurs, et ils étaient ainsi les gens de cette parole, à l'exclusion des associateurs.
- ج2 بعد: Afin de ne pas reconnaître la mission de Muhammad (que la prière et la paix d'Allah soient sur lui), et de cela, leur refus d'écrire dans le pacte de Hudaybiyya : « Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux », et ils refusèrent d'écrire : « Ceci est ce sur quoi Muhammad, Messager d'Allah, a conclu » ; alors Allah fit descendre Sa quiétude sur Son Messager et sur les croyants avec lui, et les obligea à la parole « Il n'y a de divinité qu'Allah », qui est la tête de toute piété ; or le Messager (que la prière et la paix d'Allah soient sur lui) et les croyants avec lui étaient plus dignes de la parole de piété que les associateurs, et ils étaient, de même, les gens de cette parole, à l'exclusion des associateurs.
- ج3 قبل: Et Dieu est de toute chose Omniscient, rien ne Lui échappe.
- ج3 بعد: Et Allah est Omniscient de toute chose, rien ne Lui est caché.

**quran:3:18|hi** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- سبب الفشل القديم: 'على أجلِّ مشهود عليه' (upon the greatest matter testified to) rendered 'सबसे महान गवाही देने वाले पर' (upon the greatest witness-giver) - witness/witnessed reversed
- ج1 قبل: अल्लाह ने गवाही दी कि वह अकेला ईश्वरत्व में है, और उसने अपनी गवाही को फ़रिश्तों और ज्ञानवालों की गवाही के साथ जोड़ा, सबसे महान गवाही देने वाले पर, जो उसकी एकता और न्याय पर क़ायम होना है, उसके सिवा कोई पूज्य नहीं, वह शक्तिशाली है जिस पर उसकी इच्छा की कोई चीज़ अटक नहीं सकती, अपने कथनों और कार्यों में तत्वदर्शी है।
- ج1 بعد: अल्लाह ने गवाही दी कि वह अकेला है पूज्य होने में, और उसने अपनी गवाही को फ़रिश्तों और ज्ञान वालों की गवाही के साथ जोड़ा, सबसे महान उस विषय पर जिस पर गवाही दी गई, और वह है उसका तौहीद और उसका न्याय को क़ायम करना, उसके सिवा कोई पूज्य नहीं, प्रभुत्वशाली जिस पर उसकी इच्छा की कोई चीज़ असंभव नहीं, अपने कथनों और कार्यों में हिकमत वाला।

**quran:6:19|fr** (كان فاشلًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- سبب الفشل القديم: S2 "ce que vous allez Lui dire" changes the addressee; Arabic ما أنتم قائلونه لي = what you say to me (the Messenger)
- ج1 قبل: Dis - ô Messager - à ces associateurs : quelle chose est la plus grande comme témoignage pour établir ma sincérité dans ce que je vous ai annoncé, à savoir que je suis le Messager d'Allah ?
- ج1 بعد: Dis - ô Messager, à ces polythéistes - : quelle chose est plus grande en fait de témoignage pour établir ma sincérité dans ce que je vous ai annoncé, que je suis le Messager d'Allah ?
- ج2 قبل: Dis : Allah est témoin entre moi et vous, c'est-à-dire : Il sait ce avec quoi je suis venu à vous et ce que vous allez Lui dire, et Allah m'a révélé ce Coran afin que je vous avertisse par lui de Son châtiment qu'Il fera descendre sur vous, et que j'avertisse par lui ceux des nations auxquels il parvient.
- ج2 بعد: Dis : Allah est témoin entre moi et vous, c'est-à-dire qu'Il sait ce avec quoi je suis venu à vous et ce que vous me dites ; et Allah m'a révélé ce Coran afin que je vous avertisse par lui de Son châtiment, qu'il s'abatte sur vous, et afin que j'avertisse par lui ceux des nations qu'il atteindra.
- ج4 قبل: Dis-leur - ô Messager - : je n'atteste pas ce que vous reconnaissez ; Allah est seulement un Dieu unique sans associé, et je suis innocent de tout associé que vous adorez avec Lui.
- ج4 بعد: Dis-leur - ô Messager - : je n'atteste pas ce que vous reconnaissez ; Allah est seulement un Dieu unique, sans associé, et je désavoue tout associé que vous adorez avec Lui.

**quran:21:107|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আমি আপনাকে—হে রাসূল—সমগ্র মানবজাতির জন্য কেবল রহমতস্বরূপ পাঠিয়েছি। সুতরাং যে আপনার প্রতি ঈমান আনবে সে সৌভাগ্যবান হবে ও মুক্তি পাবে, আর যে ঈমান আনবে না সে ব্যর্থ ও ক্ষতিগ্রস্ত হবে।
- ج1 بعد: আমি আপনাকে - হে রাসূল - সকল মানুষের জন্য রহমতস্বরূপই প্রেরণ করেছি, সুতরাং যে আপনার প্রতি ঈমান আনবে, সে সুখী হবে এবং নাজাত পাবে, আর যে ঈমান আনবে না, সে ব্যর্থ ও ক্ষতিগ্রস্ত হবে।

**quran:9:33|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: वही है जिसने अपने रसूल मुहम्मद सल्लल्लाहु अलैहि व सल्लम को क़ुरआन और इस्लाम के धर्म के साथ भेजा;
- ج1 بعد: वही है जिसने अपने रसूल मुहम्मद (सल्लल्लाहु अलैहि व सल्लम) को क़ुरआन और इस्लाम धर्म के साथ भेजा;
- ج2 قبل: ताकि उसे सभी धर्मों पर प्रभुत्व दे, चाहे मुशरिकीन (बहुदेववादी) सत्य के धर्म - इस्लाम - और उसके अन्य धर्मों पर प्रभुत्व को नापसंद करें।
- ج2 بعد: ताकि उसे सभी धर्मों पर प्रभुत्व प्रदान कर दे, भले ही बहुदेववादी सत्य धर्म (इस्लाम) और उसके सभी धर्मों पर प्रभुत्व को नापसंद करें।

**quran:42:53|hi** (كان ناجحًا) → **FAIL** (FAITHFUL no، TERMS ok، LANGUAGE ok): S1: 'क्या आप इससे पहले नहीं जानते थे' makes it a rhetorical 'did you not know?', implying he knew; Arabic states he did not know.
- ج1 قبل: और जैसे हमने तुमसे पहले के नबियों पर वह़्य भेजी थी - ऐ नबी! - उसी तरह हमने तुम पर भी अपनी ओर से क़ुरआन भेजा है, तुम इससे पहले नहीं जानते थे कि पिछली किताबें क्या हैं, न ईमान, न शरीअत के आदेश?
- ج1 بعد: और जैसे हमने आपसे पहले नबियों की ओर वह्य भेजी - ऐ नबी - हमने आपकी ओर अपनी ओर से क़ुरआन भेजा। क्या आप इससे पहले नहीं जानते थे कि पिछली किताबें क्या हैं, न ईमान, न ईश्वरीय शरीअतें?
- ج2 قبل: लेकिन हमने क़ुरआन को लोगों के लिए रोशनी बनाया, जिससे हम अपने बंदों में से जिसे चाहते हैं सीधे रास्ते की ओर मार्गदर्शन करते हैं।
- ج2 بعد: लेकिन हमने क़ुरआन को लोगों के लिए प्रकाश बनाया, जिसके द्वारा हम अपने बंदों में से जिसे चाहते हैं सीधे मार्ग की ओर मार्गदर्शन करते हैं।
- ج3 قبل: और निश्चय ही तुम - ऐ रसूल! - अल्लाह की अनुमति से सीधे रास्ते की ओर मार्गदर्शन और हिदायत करते हो - और वह इस्लाम है - अल्लाह का रास्ता, जिसका आसमानों और ज़मीन में जो कुछ है उस सब पर राज्य है, उसमें उसका कोई साझीदार नहीं।
- ج3 بعد: और निश्चय ही आप - ऐ रसूल - अल्लाह की अनुमति से सीधे मार्ग की ओर मार्गदर्शन करते हैं और राह दिखाते हैं - जो इस्लाम है - अल्लाह का मार्ग, जिसका आकाशों और धरती की सभी चीज़ों पर राज्य है। उसमें उसका कोई साझी नहीं।
- ج4 قبل: सुन लो! ऐ लोगों! अल्लाह ही की ओर तुम्हारे सारे मामले लौटते हैं - अच्छे और बुरे - तो वह हर एक को उसके कर्म के अनुसार बदला देगा: अगर अच्छा है तो अच्छा, और अगर बुरा है तो बुरा।
- ج4 بعد: सुनो! ऐ लोगों! तुम्हारे सारे मामले अल्लाह ही की ओर लौटते हैं - अच्छे और बुरे - तो वह हर एक को उसके कर्म के अनुसार बदला देगा: यदि अच्छा हो तो अच्छा, और यदि बुरा हो तो बुरा।

**quran:2:208|ur** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: اے ایمان والو! جو اللہ کو رب اور محمد کو نبی اور رسول اور اسلام کو دین مان کر ایمان لائے ہو، اسلام کے تمام احکام میں داخل ہو جاؤ، اس کے تمام احکام پر عمل کرتے ہوئے، اور ان میں سے کچھ بھی نہ چھوڑو، اور شیطان کے راستوں کی پیروی نہ کرو، جو وہ تمہیں گناہوں کی طرف بلاتا ہے۔
- ج1 بعد: مومنو! جو اللہ کو رب، محمد کو نبی اور رسول، اور اسلام کو دین مان کر ایمان لائے ہو، اسلام کی تمام شریعتوں میں داخل ہو جاؤ، اس کے تمام احکام پر عمل کرتے ہوئے، اور ان میں سے کسی چیز کو نہ چھوڑو، اور شیطان کے راستوں پر نہ چلو جو تمہیں گناہوں کی طرف بلاتا ہے۔
- ج2 قبل: بے شک وہ تمہارا دشمن ہے، ظاہر دشمنی والا، سو اس سے ڈرو۔
- ج2 بعد: بے شک وہ تمہارا صریح دشمن ہے، پس اس سے بچو۔

**quran:59:22|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'Quien no hay dios sino Él' is ungrammatical Spanish; meaning clear.
- ج1 قبل: Él es Al-lah, glorificado y exaltado sea, el adorado con derecho, que no hay divinidad sino Él, conocedor de lo secreto y lo manifiesto, sabe lo que está oculto y lo que está presente, Él es el Misericordioso (Ar-Rahmán) cuya misericordia abarca todo, el Compasivo (Ar-Rahim) con los creyentes en Él.
- ج1 بعد: Él es Allah, glorificado y exaltado, el adorado con derecho, Quien no hay dios sino Él, Conocedor de lo secreto y lo público, conoce lo ausente y lo presente, Él es el Misericordioso cuya misericordia abarca todas las cosas, el Compasivo con los creyentes en Él.

**quran:59:24|id** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok): S1: glosses of al-Bari' (al-munshi', al-mujid) set out as separate 'Yang ...' titles; harmless.
- ج1 قبل: Dialah Allah Subhanahu wa Ta'ala, Pencipta yang menentukan makhluk, Yang Mengadakan yang menciptakan dan mewujudkan mereka sesuai dengan hikmah-Nya, Yang Membentuk ciptaan-Nya sebagaimana Dia kehendaki, bagi-Nya Subhanahu nama-nama yang indah dan sifat-sifat yang tinggi, bertasbih kepada-Nya segala yang ada di langit dan bumi, dan Dialah Yang Maha Perkasa lagi sangat keras siksa-Nya terhadap musuh-musuh-Nya, Yang Maha Bijaksana dalam mengatur urusan makhluk-Nya.
- ج1 بعد: Dia adalah Allah Subhanahu wa Ta'ala, Yang Menciptakan lagi Yang Menentukan makhluk, Yang Mengadakan, Yang Memunculkan, Yang Mewujudkan mereka sesuai dengan hikmah-Nya, Yang Membentuk Rupa makhluk-Nya sebagaimana Dia kehendaki; bagi-Nya Subhanahu asmaul husna dan sifat-sifat yang tinggi; bertasbih kepada-Nya semua yang ada di langit dan bumi; dan Dialah Yang Maha Perkasa, sangat keras pembalasan-Nya terhadap musuh-musuh-Nya, lagi Maha Bijaksana dalam mengatur urusan makhluk-Nya.

**quran:21:92|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: These prophets all had one religion, Islam, which is submission to God through obedience and singling Him out for worship, and God, glory be to Him and exalted be He, is the Lord of creation, so worship Him — O people — alone, with no partner to Him.
- ج1 بعد: These prophets, all of them, their religion is one, Islam, and it is submission to Allah with obedience and devoting worship exclusively to Him, and Allah, Glorified and Exalted, is the Lord of creation, so worship Him - O people - alone, with no partner for Him.

**quran:4:87|hi** (كان ناجحًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE ok): S1: Yawm al-Qiyamah rendered 'प्रलय के दिन' (day of cosmic dissolution, Hindu term) instead of qiyamat/Day of Resurrection.
- ج1 قبل: अल्लाह अकेला है जो सारी सृष्टि के लिए ईश्वरत्व में अद्वितीय है, वह तुम्हें क़ियामत के दिन अवश्य इकट्ठा करेगा, जिसमें कोई संदेह नहीं, हिसाब और बदले के लिए।
- ج1 بعد: अल्लाह अकेला ही सभी सृष्टि के लिए पूज्य होने में अद्वितीय है, वह तुम्हें प्रलय के दिन अवश्य एकत्र करेगा, जिसमें कोई संदेह नहीं, हिसाब और बदले के लिए।
- ج2 قبل: और अल्लाह से अधिक सत्य कथन में कोई नहीं, जो उसने बताया है।
- ج2 بعد: और अल्लाह से अधिक सच्ची बात वाला कोई नहीं, उसने जो कुछ बताया उसमें।

**quran:33:40|ms** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: Muhammad bukanlah bapa kepada mana-mana lelaki di kalangan kamu, tetapi dia adalah Rasul Allah dan penutup para nabi, maka tiada nubuwwah selepasnya sehingga hari kiamat.
- ج1 بعد: Bukanlah Muhammad itu bapa bagi seseorang daripada lelaki kamu, tetapi dia adalah Rasul Allah dan kesudahan segala Nabi-nabi, maka tiada kenabian selepasnya hingga hari kiamat.
- ج2 قبل: Dan adalah Allah Maha Mengetahui segala sesuatu daripada amalan kamu, tidak tersembunyi daripada-Nya sesuatu pun.
- ج2 بعد: Dan adalah Allah Maha Mengetahui akan segala sesuatu daripada amalan kamu, tiada sesuatu pun yang tersembunyi daripada-Nya.

**quran:48:29|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: मुहम्मद अल्लाह के रसूल हैं, और जो उनके साथ उनके दीन पर हैं, वे काफ़िरों पर सख़्त हैं, आपस में रहमदिल हैं, तुम उन्हें देखोगे कि वे अपनी नमाज़ में अल्लाह के लिए रुकूअ और सजदा करते हैं, वे अपने रब से उम्मीद रखते हैं कि वह उन पर कृपा करे, उन्हें जन्नत में दाख़िल करे, और उनसे राज़ी हो, उनकी अल्लाह की इताअत की निशानी उनके चेहरों पर सजदे और इबादत के असर से ज़ाहिर है, यह उनकी सिफ़त तौरात में है।
- ج1 بعد: मुहम्मद अल्लाह के रसूल हैं, और जो लोग उनके साथ हैं, उनके दीन पर, काफ़िरों पर बहुत सख़्त हैं, आपस में बहुत दयालु हैं। तुम उन्हें रुकू' करते हुए, सजदा करते हुए, अल्लाह के लिए अपनी नमाज़ में देखोगे। वे अपने रब से उम्मीद रखते हैं कि वह उन पर अनुग्रह करे, उन्हें जन्नत में दाखिल करे और उनसे प्रसन्न हो जाए। अल्लाह की आज्ञाकारिता की निशानी उनके चेहरों पर सजदे और इबादत के असर से ज़ाहिर है। यह उनका विवरण तौरात में है।
- ج2 قبل: और इंजील में उनकी सिफ़त ऐसी है जैसे एक खेती जिसने अपना तना और शाखा निकाली, फिर उसकी शाखाएँ उसके बाद बढ़ीं, और खेती को मज़बूत किया, तो वह मज़बूत हुई और अपने तनों पर सीधी खड़ी हुई, उसका नज़ारा खूबसूरत, किसानों को अच्छा लगता है;
- ج2 بعد: और उनका विवरण इंजील में ऐसा है जैसे खेती की विशेषता जिसने अपना तना और शाखा निकाली, फिर उसकी शाखाएँ उसके बाद बढ़ गईं, और उसने खेती को मज़बूत किया, तो वह मज़बूत हो गई और अपने तनों पर सीधी खड़ी हो गई, उसका दृश्य सुंदर था, किसानों को खुश करती है।
- ج3 قبل: ताकि इन मोमिनों की कसरत और खूबसूरत नज़ारे से काफ़िरों को ग़ैज़ आए।
- ج3 بعد: ताकि इन मोमिनों के द्वारा, उनकी बहुतायत और उनके दृश्य की सुंदरता के कारण, काफ़िरों को गुस्सा दिलाए।
- ج4 قبل: और इसमें उस शख़्स के कुफ़्र की दलील है जो सहाबा (रज़ियल्लाहु अन्हुम) से नफ़रत करता है;
- ج4 بعد: और इसमें उस व्यक्ति के कुफ़्र का प्रमाण है जो सहाबा से नफ़रत करता है—अल्लाह उनसे राज़ी हो—।
- ج5 قبل: क्योंकि जिसे अल्लाह ने सहाबा के ज़रिए ग़ैज़ दिलाई, उसके हक़ में वह चीज़ पाई गई जो उसका सबब है, और वह कुफ़्र है।
- ج5 بعد: क्योंकि जिसे अल्लाह ने सहाबा के द्वारा गुस्सा दिलाया, तो उसके मामले में उसका कारण पाया गया, और वह कुफ़्र है।
- ج6 قبل: अल्लाह ने उन लोगों से वादा किया है जो उनमें से अल्लाह और उसके रसूल पर ईमान लाए और उन्होंने वह अमल किया जो अल्लाह ने उन्हें हुक्म दिया, और उससे बचे जो उसने उन्हें मना किया, उनके गुनाहों की मग़फ़िरत, और बड़ा अज्र जो ख़त्म नहीं होता, और वह जन्नत है।
- ج6 بعد: अल्लाह ने उनमें से जो लोग अल्लाह और उसके रसूल पर ईमान लाए और जो अल्लाह ने उन्हें आदेश दिया उस पर अमल किया, और जिससे उसने उन्हें मना किया उससे बचे, उनके लिए उनके गुनाहों की क्षमा और बहुत बड़ा प्रतिफल जो कभी समाप्त नहीं होता, का वादा किया है, और वह जन्नत है।
- ج7 قبل: (और अल्लाह का वादा हक़ है, सच्चा है, जो टूटता नहीं, और जो कोई सहाबा (रज़ियल्लाहु अन्हुम) के नक़्शे क़दम पर चला, वह उनके हुक्म में है मग़फ़िरत और बड़े अज्र के हक़दार होने में, और उन्हें फ़ज़ीलत, सबक़त और कमाल हासिल है जिसमें इस उम्मत में से कोई उन तक नहीं पहुँच सकता, अल्लाह उनसे राज़ी हो और उन्हें राज़ी करे)।
- ج7 بعد: (और अल्लाह का वादा सत्य है, सच्चा है, जो टूटता नहीं, और हर वह व्यक्ति जिसने सहाबा के नक्शे-क़दम पर चला—अल्लाह उनसे राज़ी हो—तो वह उनके हुक्म में है, क्षमा और महान प्रतिफल का हक़दार होने में, और उन्हीं के लिए है फ़ज़ीलत, अग्रता और पूर्णता, जिसमें इस उम्मत में से कोई उन तक नहीं पहुँच सकता, अल्लाह उनसे राज़ी हो और उन्हें राज़ी करे।)

**quran:10:25|tr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: awliya' left as 'evliyası' (can suggest saints in Turkish); acceptable.
- ج1 قبل: Allah sizi, dostları için hazırladığı cennetlerine çağırır ve kullarından dilediğini hidayete erdirir, onu doğru yola, yani İslam'a iletir.
- ج1 بعد: Ve Allah sizi, evliyası için hazırladığı cennetlerine çağırır, yarattıklarından dilediğini hidayete erdirir, böylece onu doğru yola ulaşmaya muvaffak eder ve o İslam'dır.

**quran:48:29|bn** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE ok)
- ج1 قبل: মুহাম্মাদ আল্লাহর রাসূল, এবং যারা তার সাথে রয়েছে তার দ্বীনের উপর, তারা কাফিরদের প্রতি কঠোর, নিজেদের মধ্যে পরস্পরের প্রতি দয়ালু; তুমি তাদের দেখবে রুকু ও সিজদায় আল্লাহর জন্য তাদের নামাজে, তারা তাদের রবের কাছে আশা করে যে তিনি তাদের উপর অনুগ্রহ করবেন, তাদের জান্নাতে প্রবেশ করাবেন এবং তাদের প্রতি সন্তুষ্ট হবেন; তাদের আল্লাহর আনুগত্যের চিহ্ন তাদের মুখে সিজদা ও ইবাদতের প্রভাবে প্রকাশ পায়; এই তাদের বৈশিষ্ট্য তাওরাতে।
- ج1 بعد: মুহাম্মদ আল্লাহর রসূল, এবং যারা তার ধর্মে তার সাথে রয়েছে তারা কাফেরদের প্রতি কঠোর, নিজেদের মধ্যে পরস্পর সহানুভূতিশীল। আপনি তাদেরকে তাদের নামাজে আল্লাহর জন্য রুকু ও সেজদারত দেখবেন, তারা তাদের রবের কাছে আশা করে যে তিনি তাদের প্রতি অনুগ্রহ করবেন, তাদের জান্নাতে প্রবেশ করাবেন এবং তাদের প্রতি সন্তুষ্ট হবেন। আল্লাহর আনুগত্যের চিহ্ন সেজদা ও ইবাদতের প্রভাবে তাদের মুখমন্ডলে প্রকাশমান। এটি তওরাতে তাদের বৈশিষ্ট্য।
- ج2 قبل: আর তাদের বৈশিষ্ট্য ইনজিলে একটি ফসলের মতো যা তার কাণ্ড ও শাখা বের করেছে, তারপর তার শাখাগুলো পরে বহুগুণ বেড়েছে, এবং ফসলকে শক্ত করেছে, ফলে তা শক্তিশালী হয়ে তার কাণ্ডের উপর সোজা দাঁড়িয়েছে, তার দৃশ্য সুন্দর, কৃষকদের বিস্মিত করে;
- ج2 بعد: এবং ইঞ্জিলে তাদের বৈশিষ্ট্য এমন একটি চারা গাছের মতো যা তার কান্ড ও শাখা নির্গত করে, অতঃপর তার শাখাগুলো এরপর বহুগুণে বেড়ে যায় এবং চারাকে শক্ত করে, ফলে তা শক্তিশালী হয় এবং নিজের কান্ডের উপর সুন্দর রূপে দাঁড়িয়ে যায়, যা চাষীদের বিস্মিত করে।
- ج3 قبل: যাতে এই মুমিনদের দ্বারা তাদের সংখ্যাধিক্য ও সুন্দর দৃশ্যের কারণে কাফিরদের ক্রোধ জাগায়।
- ج3 بعد: যাতে তিনি এই মুমিনদের দ্বারা, তাদের সংখ্যাধিক্য ও রূপের সৌন্দর্যের কারণে, কাফেরদের ক্রুদ্ধ করেন।
- ج4 قبل: আর এতে প্রমাণ রয়েছে যে, যে সাহাবিদের (আল্লাহ তাদের প্রতি সন্তুষ্ট হন) ঘৃণা করে সে কাফির;
- ج4 بعد: এবং এতে সেই ব্যক্তির কুফরের প্রমাণ রয়েছে যে সাহাবীদের (রাদিয়াল্লাহু আনহুম) ঘৃণা করে।
- ج5 قبل: কারণ যাকে আল্লাহ সাহাবিদের দ্বারা ক্রোধান্বিত করেছেন, তার ক্ষেত্রে সেই কারণ পাওয়া গেছে, তা হলো কুফর।
- ج5 بعد: কারণ আল্লাহ যাকে সাহাবীদের দ্বারা ক্রুদ্ধ করেছেন, তার ব্যাপারে সেই কারণ বিদ্যমান, আর তা হলো কুফর।
- ج6 قبل: আল্লাহ তাদের প্রতিশ্রুতি দিয়েছেন যারা তাদের মধ্যে আল্লাহ ও তার রাসূলের প্রতি ঈমান এনেছে এবং আল্লাহ যা আদেশ করেছেন তা করেছে এবং যা তিনি নিষেধ করেছেন তা পরিহার করেছে, তাদের পাপের ক্ষমা এবং অফুরন্ত বিশাল প্রতিদান, যা হলো জান্নাত।
- ج6 بعد: আল্লাহ তাদের মধ্যে যারা আল্লাহ ও তাঁর রসূলের প্রতি ঈমান এনেছে এবং আল্লাহ যা তাদেরকে আদেশ করেছেন তা করেছে এবং যা তিনি তাদেরকে নিষেধ করেছেন তা বর্জন করেছে, তাদের পাপের ক্ষমা এবং একটি মহান পুরস্কারের ওয়াদা করেছেন যা কখনো ছিন্ন হয় না, আর তা হলো জান্নাত।
- ج7 قبل: আর আল্লাহর প্রতিশ্রুতি সত্য, সত্যায়িত, যা ভঙ্গ হয় না; আর যে কেউ সাহাবিদের (আল্লাহ তাদের প্রতি সন্তুষ্ট হন) পদাঙ্ক অনুসরণ করেছে, সে তাদের বিধানে রয়েছে ক্ষমা ও মহান প্রতিদান পাওয়ার যোগ্যতায়; আর তাদের জন্য রয়েছে মর্যাদা, অগ্রগামিতা এবং পূর্ণতা যা এই উম্মতের কেউ তাদের কাছে পৌঁছাতে পারে না; আল্লাহ তাদের প্রতি সন্তুষ্ট হন এবং তাদের সন্তুষ্ট করেন।
- ج7 بعد: (আর আল্লাহর ওয়াদা সত্য, সত্যায়িত, যা ভঙ্গ হয় না। এবং যে কেউ সাহাবীদের (রাদিয়াল্লাহু আনহুম) পদাঙ্ক অনুসরণ করে, সে তাদেরই বিধানে রয়েছে ক্ষমা ও মহান পুরস্কার পাওয়ার ক্ষেত্রে। আর তাদের জন্য রয়েছে মর্যাদা, অগ্রগামিতা এবং পূর্ণতা, যা এই উম্মতের কেউ তাদের সাথে মিলতে পারে না। আল্লাহ তাদের প্রতি সন্তুষ্ট হন এবং তাদেরকে সন্তুষ্ট করেন।)

**quran:2:238|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S1: 'levantaos' (get up) for 'stand' is slightly off; harmless.
- ج1 قبل: Mantened, oh musulmanes, las cinco oraciones obligatorias perseverando en realizarlas en sus tiempos con sus condiciones, pilares y deberes, y mantened la oración intermedia entre ellas, que es la oración del asr, y levantaos en vuestra oración obedientes a Dios, humildes y sumisos.
- ج1 بعد: Cumplid -oh musulmanes- con las cinco oraciones prescritas, perseverando en realizarlas en sus tiempos, con sus condiciones, pilares y deberes; y cumplid con la oración intermedia entre ellas, que es la oración del 'asr; y levantaos en vuestra oración obedientes a Allah, humildes y sumisos.

**quran:23:52|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: और निस्संदेह तुम्हारा धर्म- ऐ नबियों के समूह- एक ही धर्म है और वह इस्लाम है, और मैं तुम्हारा रब हूँ, अतः मेरा डर रखो मेरे आदेशों का पालन करके और मेरी मनाहियों से बचकर।
- ج1 بعد: और निःसंदेह तुम्हारा धर्म - ऐ नबियों के समुदाय! - एक ही धर्म है और वही इस्लाम है, और मैं तुम्हारा पालनहार हूँ, अतः मेरे आदेशों का पालन करके और मेरी मनाहियों से बचकर मुझसे डरो।

**quran:28:70|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: তিনিই আল্লাহ, যিনি ছাড়া কোনো সত্য ইলাহ নেই; দুনিয়া ও আখিরাতে তাঁরই জন্য সুন্দর প্রশংসা ও শুকরিয়া, তাঁরই জন্য সৃষ্টির মধ্যে বিচার ক্ষমতা, এবং মৃত্যুর পর হিসাব ও প্রতিদানের জন্য তোমাদেরকে তাঁরই দিকে ফিরিয়ে নেওয়া হবে।
- ج1 بعد: তিনিই আল্লাহ, তিনি ব্যতীত কোনো সত্য উপাস্য নেই, ইহকাল ও পরকালে তাঁরই সুন্দর প্রশংসা ও শোকর, এবং তাঁরই সৃষ্টির মধ্যে বিচার, আর তোমাদের মৃত্যুর পর হিসাব ও প্রতিদানের জন্য তোমরা তাঁরই কাছে প্রত্যাবর্তিত হবে।

**quran:59:22|ms** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Dia adalah Allah Subhanahu wa Ta'ala yang disembah dengan hak, yang tiada tuhan selain Dia, Maha Mengetahui rahasia dan yang terang, mengetahui apa yang gaib dan apa yang hadir, Dia adalah Ar-Rahman yang rahmat-Nya meliputi segala sesuatu, Maha Penyayang kepada orang-orang yang beriman kepada-Nya.
- ج1 بعد: Dialah Allah, Maha Suci dan Maha Tinggi, yang berhak disembah, yang tidak ada Tuhan melainkan Dia, Yang Mengetahui rahsia dan yang nyata, Dia mengetahui apa yang ghaib dan apa yang hadir, Dialah Yang Maha Pemurah yang rahmat-Nya meliputi segala sesuatu, Maha Mengasihani kepada ahli iman kepada-Nya.

**quran:2:208|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Wahai orang-orang yang beriman kepada Allah sebagai Rabb, kepada Muhammad sebagai nabi dan rasul, dan kepada Islam sebagai agama, masuklah ke dalam seluruh syariat Islam, amalkanlah semua hukumnya, dan jangan tinggalkan sedikit pun darinya, serta jangan ikuti jalan-jalan setan dalam hal yang ia serukan kepada kalian berupa kemaksiatan.
- ج1 بعد: Wahai orang-orang yang beriman kepada Allah sebagai Rabb, dan kepada Muhammad sebagai nabi dan rasul, dan kepada Islam sebagai agama, masuklah ke dalam seluruh syariat Islam, dengan mengamalkan semua hukum-hukumnya, dan janganlah kalian meninggalkan sedikit pun darinya, dan janganlah kalian mengikuti jalan-jalan syaitan dalam apa yang ia serukan kepada kalian berupa kemaksiatan.
- ج2 قبل: Sesungguhnya ia adalah musuh yang nyata permusuhannya bagi kalian, maka waspadalah terhadapnya.
- ج2 بعد: Sesungguhnya dia adalah musuh bagi kalian yang nyata permusuhannya, maka waspadalah terhadapnya.

**quran:6:3|es** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor): S2: 'vuestro secreto y vuestra manifestación' is awkward Spanish for 'what you hide and declare'.
- ج1 قبل: Y Alá, Glorificado sea, es la divinidad adorada en los cielos y en la tierra.
- ج1 بعد: Y Allah, glorificado sea, es la divinidad adorada en los cielos y en la tierra.
- ج2 قبل: Y entre las pruebas de su divinidad está que Él conoce todo lo que ocultáis —oh, gente— y lo que manifestáis, y conoce todas vuestras obras, sean buenas o malas;
- ج2 بعد: Y entre las pruebas de Su divinidad está que Él conoce todo vuestro secreto y vuestra manifestación, -oh, gentes- y conoce todas vuestras obras, de bien o de mal.
- ج3 قبل: y por ello, Él —Majestuoso y Altísimo— es solo Él la divinidad que merece la adoración.
- ج3 بعد: Y por eso, Él -Glorioso y Altísimo- es, solo Él, la divinidad que merece la adoración.

**quran:3:2|hi** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: वह अल्लाह है, उसके सिवा कोई सच्चा पूज्य नहीं, वह पूर्ण जीवन से युक्त है जैसा उसकी महिमा के योग्य है, वह हर चीज़ पर क़ायम है।
- ج1 بعد: वह अल्लाह है, उसके सिवा कोई सच्चा पूज्य नहीं, जो पूर्ण जीवन से युक्त है जैसा उसकी महिमा के योग्य है, हर चीज़ को सँभालने (क़ायम रखने) वाला है।

**quran:43:84|en** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor): S1: 'worshipped with truth' compressed to 'the only deity'; 'the Knowing of all things from' is awkward.
- ج1 قبل: And He is Allah alone, the One truly worshipped in the heavens and on the earth, and He is the Wise who perfected His creation and perfected His law, the All-Knowing of everything regarding the conditions of His creation, nothing of which is hidden from Him.
- ج1 بعد: And He is Allāh alone, the only deity in the heaven and on the earth, and He is the Wise who perfected His creation and perfected His legislation, the Knowing of all things from the conditions of His creation; nothing of it is hidden from Him.

**quran:42:53|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: And just as We revealed to the prophets before you - O Prophet - We revealed to you a Qur'an from Us; you did not know before it what the previous scriptures were, nor faith, nor the divine laws?
- ج1 بعد: And just as We revealed to the prophets before you - O Prophet - We revealed to you a Qur'an from Us; you did not know before it what the previous scriptures were, nor faith, nor the divine laws.
- ج2 قبل: But We made the Qur'an a light for people, by which We guide whom We will among Our servants to the straight path.
- ج2 بعد: But We made the Qur'an a light for the people, by which We guide whom We will from Our servants to the straight path.
- ج3 قبل: And you - O Messenger - indeed guide and direct, by Allah's permission, to a straight path - which is Islam - the path of Allah, to Whom belongs the dominion of all that is in the heavens and all that is in the earth; there is no partner for Him in that.
- ج3 بعد: And indeed you - O Messenger - surely guide and direct, by the permission of Allāh, to a straight path - which is Islam - the path of Allāh, to whom belongs whatever is in the heavens and whatever is on the earth; there is no partner for Him in that.
- ج4 قبل: Indeed, to Allah - O people - all your affairs return, whether good or evil, and He will recompense each according to his deed: if good, then good; and if evil, then evil.
- ج4 بعد: Unquestionably, to Allāh - O people - all your affairs return, whether good or evil, and He will recompense each one according to his deed: if good, then good; and if evil, then evil.

**quran:6:102|tr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: İşte bu -ey müşrikler- sizin Rabbinizdir, O celâl ve ikram sahibidir; O'ndan başka hak ilah yoktur, her şeyin yaratıcısıdır; öyleyse O'na itaat ve ibadetle boyun eğin ve teslim olun.
- ج1 بعد: İşte -ey müşrikler- O, sizin Rabbinizdir, yüce ve uludur; O'ndan başka hakkıyla ibadet edilen yoktur, her şeyin yaratanıdır. Öyleyse O'na itaat ve ibadetle boyun eğin ve teslim olun.
- ج2 قبل: O, sübhândır, her şey üzerinde vekil ve koruyucudur; yaratıklarının işlerini düzenler.
- ج2 بعد: Ve O, Sübhan'dır; her şey üzerinde vekil ve Hafîz'dir, yaratıklarının işlerini düzenler.

**quran:10:25|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Et Allah vous appelle à Ses jardins qu'Il a préparés pour Ses alliés, et Il guide qui Il veut parmi Ses créatures, en les accordant pour atteindre le chemin droit, qui est l'islam.
- ج1 بعد: Et Allah vous appelle à Ses jardins qu'Il a préparés pour Ses alliés, et Il guide qui Il veut parmi Ses créatures, et Il lui accorde le succès pour atteindre le droit chemin, qui est l'Islam.

**quran:59:22|bn** (كان ناجحًا) → **FAIL** (FAITHFUL minor، TERMS problem، LANGUAGE ok): S1: al-Rahim rendered 'অসীম দাতা' (boundless giver), a different attribute, instead of Most Merciful.
- ج1 قبل: তিনি আল্লাহ, পবিত্র ও মহান, যিনি সত্যের সাথে উপাস্য, যিনি ছাড়া কোনো উপাস্য নেই, তিনি গোপন ও প্রকাশ্য সব জানেন, যা অদৃশ্য ও যা উপস্থিত সব জানেন, তিনি রহমান যার রহমত সব কিছুকে পরিবেষ্টিত করেছে, তিনি রহিম যিনি তাঁর প্রতি ঈমানদারদের প্রতি দয়ালু।
- ج1 بعد: তিনিই আল্লাহ, তিনি পবিত্র ও মহান, যিনি সত্যের সাথে উপাস্য, তিনি ছাড়া কোনো উপাস্য নেই, তিনি গোপন ও প্রকাশ্য বিষয়ে জ্ঞানী, তিনি জানেন যা অদৃশ্য এবং যা বিদ্যমান, তিনিই পরম দয়ালু যাঁর রহমত সবকিছুকে পরিবেষ্টন করেছে, তিনি অসীম দাতা, যারা তাঁর প্রতি ঈমান এনেছে তাদের প্রতি।

**quran:6:102|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Itu adalah -wahai orang-orang musyrik- Tuhan kalian Yang Maha Agung, tidak ada sesembahan yang benar selain Dia, Pencipta segala sesuatu, maka tunduklah dan patuhlah kepada-Nya dengan ketaatan dan ibadah.
- ج1 بعد: Yang demikian itu -wahai orang-orang musyrik- adalah Tuhan kamu Yang Maha Agung lagi Maha Tinggi, tidak ada sesembahan yang berhak disembah selain Dia, Pencipta segala sesuatu, maka tunduk dan patuhlah kepada-Nya dengan ketaatan dan ibadah.
- ج2 قبل: Dan Dia Maha Suci lagi Maha Tinggi adalah Pemelihara dan Penjaga atas segala sesuatu, yang mengatur urusan makhluk-Nya.
- ج2 بعد: Dan Dia -Maha Suci- atas segala sesuatu adalah Pemelihara dan Penjaga, mengatur urusan makhluk-Nya.

**quran:21:92|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Ces prophètes, tous, ont une seule religion, l'Islam, qui est la soumission à Allah par l'obéissance et Lui vouer exclusivement le culte, et Allah, gloire et exalté soit-Il, est le Seigneur de la création, adorez-Le donc - ô gens - seul, sans associé.
- ج1 بعد: Tous ces prophètes ont une seule religion, l'islam, qui est la soumission à Allah par l'obéissance et l'adoration exclusive de Lui ; et Allah, glorifié et exalté, est le Seigneur des créatures : adorez-Le donc, ô gens, Seul, sans associé.

**quran:4:87|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আল্লাহ একাই সমস্ত সৃষ্টির জন্য একমাত্র উপাস্য, তিনি কিয়ামতের দিন তোমাদের অবশ্যই একত্রিত করবেন, যাতে কোনো সন্দেহ নেই, হিসাব ও প্রতিদানের জন্য।
- ج1 بعد: আল্লাহ একাই সমস্ত সৃষ্টির জন্য উপাস্য হওয়ার ক্ষেত্রে অদ্বিতীয়; তিনি অবশ্যই তোমাদেরকে সমবেত করবেন কেয়ামতের দিনে, যাতে কোনো সন্দেহ নেই, হিসাব ও প্রতিদানের জন্য।
- ج2 قبل: এবং আল্লাহর চেয়ে সত্যবাদী কেউ নেই, যা তিনি সংবাদ দিয়েছেন তাতে।
- ج2 بعد: আর আল্লাহ যা সংবাদ দিয়েছেন, তাতে তাঁর চেয়ে বেশি সত্যবাদী কেউ নেই।

**quran:7:158|tr** (كان ناجحًا) → **PASS** (FAITHFUL minor، TERMS ok، LANGUAGE minor): S1 reordered; 'var eden, yok eden ve dirilten' drops 'able to' (al-qadir); harmless.
- ج1 قبل: De ki -ey Resul- bütün insanlara: Ben, Allah'ın size hepinize gönderdiği Resulüyüm; bazınıza değil hepinize, O ki göklerin ve yerin ve içindekilerin mülkü O'nundur, ulûhiyet ve ibadet ancak O'na olmalıdır, şanı yücedir, yaratıkları var etmeye, yok etmeye ve diriltmeye kadirdir; öyleyse Allah'a iman edin ve O'nun birliğini ikrar edin, O'nun Resulü Muhammed'e -sallallahu aleyhi ve sellem- iman edin, o ümmî peygambere ki Allah'a ve Rabbinden kendisine indirilene ve kendinden önceki peygamberlere indirilene iman eder; ve bu Resul'e uyun ve size emrettiği Allah'a itaat amellerini yerine getirmeye bağlanın, doğru yola muvaffak olmayı umarak.
- ج1 بعد: De ki -ey peygamber- bütün insanlara: Ben, göklerin ve yerin ve içindekilerin hükümranı olan, şanı yüce olan, ilahlık ve ibadet ancak kendisine yapılması gereken, yaratıkları var eden, yok eden ve dirilten Allah'ın, hepinize -bazınıza değil- gönderdiği peygamberiyim. Öyleyse Allah'a iman edin ve tevhidini ikrar edin; O'nun peygamberi Muhammed'e -sallallahu aleyhi ve sellem- ki o, Allah'a, Rabbinden kendisine indirilene ve kendisinden önceki peygamberlere indirilene iman eden, okuyup yazması olmayan peygamberdir- iman edin; bu peygambere uyun ve size emrettiği Allah'a itaat işlerini yapmaya devam edin; umulur ki doğru yola ulaşırsınız.

**quran:2:208|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Ô vous qui avez cru en Allah comme Seigneur, en Muhammad comme Prophète et Messager, et en l'Islam comme religion, entrez dans toutes les lois de l'Islam, en agissant selon tous ses préceptes, et n'en délaissez rien, et ne suivez pas les voies du diable dans ce qu'il vous appelle à faire de péchés.
- ج1 بعد: Ô vous qui avez cru en Allah comme Seigneur, en Muhammad comme prophète et messager, et en l'Islam comme religion, entrez dans toutes les lois de l'Islam, en appliquant tous ses commandements, et n'en laissez rien de côté, et ne suivez pas les voies du diable dans ce à quoi il vous appelle comme péchés.
- ج2 قبل: Certes, il est pour vous un ennemi dont l'hostilité est manifeste, alors méfiez-vous de lui.
- ج2 بعد: Il est certes pour vous un ennemi déclaré, alors méfiez-vous de lui.

**quran:3:18|ms** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok): S1: al-'Aziz as 'Maha Kuasa' rather than 'Maha Perkasa'; matches the tafsir's gloss.
- ج1 قبل: Allah bersaksi bahawa Dia sahaja yang berhak disembah, dan Dia menggandingkan kesaksian-Nya dengan kesaksian para malaikat dan ahli ilmu, atas seagung-agung perkara yang disaksikan, iaitu tauhid kepada-Nya dan keadilan-Nya, tiada tuhan selain Dia, Yang Maha Perkasa yang tidak ada sesuatu pun yang menghalangi kehendak-Nya, Yang Maha Bijaksana dalam segala perkataan dan perbuatan-Nya.
- ج1 بعد: Allah memberi kesaksian bahawa Dia Maha Esa dalam ketuhanan, dan Dia menggandingkan kesaksianNya dengan kesaksian para malaikat dan orang-orang berilmu, terhadap perkara yang paling mulia yang dipersaksikan, iaitu tauhid kepadaNya dan penegakan keadilan olehNya; tiada Tuhan (yang berhak disembah) melainkan Dia, Yang Maha Kuasa, yang tidak ada sesuatu pun yang dikehendakiNya itu terhalang bagiNya, lagi Maha Bijaksana dalam perkataan-perkataanNya dan perbuatan-perbuatanNya.

**quran:33:40|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Muhammad itu bukanlah bapak bagi seorang laki-laki di antara kalian, tetapi dia adalah utusan Allah dan penutup para nabi, maka tidak ada kenabian setelahnya hingga hari kiamat.
- ج1 بعد: Muhammad itu sekali-kali bukanlah bapak dari seorang laki-laki di antara kamu, tetapi dia adalah Rasulullah dan penutup nabi-nabi, maka tidak ada kenabian setelahnya sampai hari kiamat.
- ج2 قبل: Dan Allah Maha Mengetahui segala sesuatu dari amal perbuatan kalian, tidak ada sesuatu pun yang tersembunyi bagi-Nya.
- ج2 بعد: Dan adalah Allah Maha Mengetahui segala sesuatu dari amal-amal kalian, tidak ada sesuatu pun yang tersembunyi bagi-Nya.

**quran:42:53|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Dan sebagaimana Kami mewahyukan kepada para nabi sebelum kamu -wahai Nabi- Kami mewahyukan kepadamu Al-Qur'an dari sisi Kami, kamu tidak mengetahui sebelumnya apa itu kitab-kitab sebelumnya, tidak pula iman, dan tidak pula syariat-syariat ilahi?
- ج1 بعد: Dan sebagaimana Kami wahyukan kepada para nabi sebelum kamu -wahai Nabi- Kami wahyukan kepadamu Al-Qur'an dari sisi Kami, kamu tidak mengetahui sebelumnya apa itu kitab-kitab sebelumnya, tidak pula iman, dan tidak pula syariat-syariat Ilahi?
- ج2 قبل: Akan tetapi Kami menjadikan Al-Qur'an sebagai cahaya bagi manusia, Kami memberi petunjuk dengannya kepada siapa yang Kami kehendaki di antara hamba-hamba Kami menuju jalan yang lurus.
- ج2 بعد: Akan tetapi Kami menjadikan Al-Qur'an sebagai cahaya bagi manusia, Kami memberi petunjuk dengannya kepada siapa yang Kami kehendaki di antara hamba-hamba Kami ke jalan yang lurus.
- ج3 قبل: Dan sesungguhnya kamu -wahai Rasul- benar-benar menunjukkan dan membimbing dengan izin Allah menuju jalan yang lurus -yaitu Islam- jalan Allah yang memiliki kerajaan segala apa yang ada di langit dan apa yang ada di bumi, tidak ada sekutu bagi-Nya dalam hal itu.
- ج3 بعد: Dan sesungguhnya kamu -wahai Rasul- benar-benar menunjukkan dan memberi petunjuk dengan izin Allah ke jalan yang lurus -yaitu Islam- yaitu jalan Allah yang kepunyaan-Nya segala apa yang ada di langit dan apa yang ada di bumi, tidak ada sekutu bagi-Nya dalam hal itu.
- ج4 قبل: Ingatlah, hanya kepada Allah -wahai manusia- kembali semua urusan kalian dari kebaikan dan keburukan, maka Dia memberi balasan kepada setiap orang sesuai amalnya: jika baik maka baik, dan jika buruk maka buruk.
- ج4 بعد: Ingatlah, kepada Allah -wahai manusia- kembali semua urusan kalian dari kebaikan dan keburukan, maka Dia memberi balasan kepada masing-masing sesuai amalnya: jika baik maka baik, dan jika buruk maka buruk.

**quran:7:180|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আর আল্লাহই সুবহানাহু ওয়া তা'আলার রয়েছে সুন্দরতম নামসমূহ, যা তাঁর পূর্ণ মহত্ত্বের ওপর দালালাত করে, আর তাঁর প্রতিটি নামই সুন্দর। তাই তোমরা তাঁর নামসমূহের মাধ্যমে তাঁর কাছে যা চাও তা চাও, আর তাদেরকে ছেড়ে দাও যারা তাঁর নামসমূহে পরিবর্তন করে—বৃদ্ধি, হ্রাস বা বিকৃতির মাধ্যমে—যেমন এমন নামে ডাকা হয় যারা তা পাওয়ার যোগ্য নয়, যেমন মুশরিকরা তাদের উপাস্যদেরকে সেসব নামে ডাকে, অথবা সেসব নামের এমন অর্থ নির্ধারণ করে যা আল্লাহ বা তাঁর রাসূল চাননি। সুতরাং তারা শীঘ্রই তাদের মন্দ কাজের প্রতিফল পাবে যা তারা দুনিয়ায় করত—আল্লাহর প্রতি কুফরি, তাঁর নামসমূহে ইলহাদ এবং তাঁর রাসূলকে মিথ্যা প্রতিপন্ন করা।
- ج1 بعد: আর পবিত্র ও মহান আল্লাহর জন্য রয়েছে সব উত্তম নাম, যা তাঁর পরিপূর্ণ মহত্ত্বের প্রমাণ বহন করে, এবং তাঁর প্রতিটি নামই সুন্দর; তাই তোমরা তাঁর নাম ধরেই তাঁর কাছে যা চাও তা প্রার্থনা করো, আর তাদেরকে বর্জন কর, যারা তাঁর নামের মধ্যে পরিবর্তন করে বাড়িয়ে বা কমিয়ে বা বিকৃত করে, যেমন এমন কাউকে সে নামে ডাকা হয় যে তার যোগ্য নয়, যেমন মুশরিকরা তাদের উপাস্যদেরকে সে নামে ডাকে, অথবা এমন অর্থ দেওয়া হয় যা আল্লাহ ও তাঁর রাসূল ইচ্ছা করেননি; তারা শীঘ্রই তাদের মন্দ কাজের প্রতিফল পাবে, যা তারা দুনিয়ায় করত: আল্লাহর সাথে কুফরি, তাঁর নামের ব্যাপারে বাঁকা পথে চলা এবং তাঁর রাসূলকে মিথ্যা বলা।

**quran:2:208|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: হে ঈমানদারগণ, যারা আল্লাহকে রব এবং মুহাম্মদকে নবী ও রাসূল এবং ইসলামকে দ্বীন হিসেবে বিশ্বাস করেছ, তোমরা ইসলামের সকল বিধানে প্রবেশ কর, তার সকল বিধান অনুযায়ী আমল কর, এবং তা থেকে কিছুই বাদ দিও না, আর শয়তানের পথ অনুসরণ করো না, যা সে তোমাদেরকে গুনাহের দিকে আহ্বান করে।
- ج1 بعد: হে ঈমানদারগণ! যারা আল্লাহকে রব হিসেবে, মুহাম্মাদকে নবী ও রাসূল হিসেবে এবং ইসলামকে দ্বীন হিসেবে ঈমান এনেছ, তোমরা ইসলামের সকল শরীয়তে প্রবেশ কর, তার সকল বিধানের উপর আমলকারী হয়ে, এবং তা থেকে কিছুই বাদ দিও না, আর শয়তানের পথসমূহ অনুসরণ করো না, যেগুলোর মাধ্যমে সে তোমাদেরকে গুনাহের দিকে আহ্বান করে।
- ج2 قبل: নিশ্চয়ই সে তোমাদের প্রকাশ্য শত্রু, তাই তার থেকে সাবধান থাকো।
- ج2 بعد: নিশ্চয়ই সে তোমাদের জন্য শত্রু, যার শত্রুতা প্রকাশ্য; সুতরাং তোমরা তার থেকে সাবধান হও।

**quran:9:33|en** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: He is the One who sent His Messenger Muhammad, peace be upon him, with the Quran and the religion of Islam;
- ج1 بعد: He is the One who sent His Messenger Muhammad (peace be upon him) with the Qur'an and the religion of Islam;
- ج2 قبل: to make it prevail over all religions, even if the polytheists dislike the religion of truth—Islam—and its prevalence over the religions.
- ج2 بعد: to make it prevail over all religions, even if those who associate others with Allāh dislike the religion of truth - Islam - and its prevalence over the religions.

**quran:29:45|ur** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE minor)
- ج1 قبل: اس قرآن میں سے جو کچھ آپ پر نازل کیا گیا ہے اسے پڑھیں اور اس پر عمل کریں، اور نماز کو اس کی حدود کے ساتھ ادا کریں، کیونکہ نماز کی پابندی نمازی کو گناہوں اور برائیوں میں پڑنے سے روکتی ہے۔
- ج1 بعد: پڑھو اس قرآن میں سے جو تمہاری طرف نازل کیا گیا ہے، اور اس پر عمل کرو، اور نماز کو اس کی حدود کے ساتھ ادا کرو۔ بے شک نماز کی پابندی اس کے ادا کرنے والے کو گناہوں اور برے کاموں میں پڑنے سے روکتی ہے۔
- ج2 قبل: یہ اس لیے ہے کہ جو شخص نماز قائم کرتا ہے اور اس کے ارکان و شرائط کو مکمل کرتا ہے، اس کا دل روشن ہوتا ہے، اس کا ایمان بڑھتا ہے، نیکی کی اس کی خواہش مضبوط ہوتی ہے، اور برائی کی خواہش کم یا ختم ہو جاتی ہے، اور نماز اور دیگر عبادات میں اللہ کا ذکر ہر چیز سے بڑا، عظیم اور افضل ہے۔
- ج2 بعد: اور یہ اس لیے کہ جو اس کو قائم رکھتا ہے، اس کے ارکان اور شرائط کو مکمل کرتا ہے، اس کا دل روشن ہوتا ہے، اس کا ایمان بڑھتا ہے، خیر کی اس کی رغبت مضبوط ہوتی ہے، اور شر کی اس کی رغبت کم ہوتی ہے یا ختم ہو جاتی ہے۔ اور نماز میں اور اس کے علاوہ خدا کا ذکر ہر چیز سے عظیم تر، بڑا اور بہتر ہے۔
- ج3 قبل: اور اللہ جانتا ہے جو کچھ تم نیکی یا برائی کرتے ہو، چنانچہ وہ تمہیں اس کا مکمل اور پورا بدلہ دے گا۔
- ج3 بعد: اور خدا جانتا ہے جو کچھ تم خیر اور شر میں سے کرتے ہو، پس وہ تمہیں اس پر سب سے کامل اور سب سے پورا بدلہ دے گا۔

**quran:16:9|bn** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: আর আল্লাহর উপরই রয়েছে সরল পথের বিবরণ দেওয়া, যা তোমাদের হেদায়েতের জন্য, আর তা হলো ইসলাম, আর পথগুলোর মধ্যে কিছু বক্র পথ রয়েছে যা হেদায়েতে পৌঁছায় না, আর তা হলো ইসলামের বিপরীত সব মতবাদ ও দল।
- ج1 بعد: আর আল্লাহর দায়িত্ব হলো সরল পথ বর্ণনা করা তোমাদের হিদায়াতের জন্য, আর তা হলো ইসলাম। আর পথগুলোর মধ্যে কিছু পথ বক্র, যা হিদায়াতের দিকে পৌঁছায় না, আর তা হলো ইসলামের বিপরীত সব ধর্ম ও মতবাদ।
- ج2 قبل: আর আল্লাহ যদি চাইতেন তোমাদের হেদায়েত দিতে, তবে তিনি তোমাদের সবাইকে ঈমানের দিকে হেদায়েত দিতেন।
- ج2 بعد: আর আল্লাহ যদি তোমাদের হিদায়াত ইচ্ছা করতেন, তবে তিনি তোমাদের সবাইকে ঈমানের দিকে পরিচালিত করতেন।

**quran:23:52|fr** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Et certes, votre religion—ô communauté des prophètes—est une seule religion, et c'est l'Islam, et Je suis votre Seigneur, donc craignez-Moi en obéissant à Mes ordres et en évitant Mes interdictions.
- ج1 بعد: Et certes, votre religion — ô vous, les prophètes — est une seule religion, et c'est l'Islam, et Je suis votre Seigneur, craignez-Moi donc en obéissant à Mes commandements et en évitant Mes interdits.

**quran:59:23|ur** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: وہ اللہ ہے جو حق کے ساتھ معبود ہے، جس کے سوا کوئی معبود نہیں، جو تمام چیزوں کا مالک ہے، ان میں بغیر کسی مزاحمت اور دفع کے تصرف کرنے والا ہے، ہر نقص سے پاک ہے، جو ہر عیب سے سالم ہے، اپنے رسولوں اور نبیوں کی تصدیق کرنے والا ہے ان چیزوں کے ساتھ جو اس نے انہیں بھیج کر واضح نشانیاں دیں، اپنی تمام مخلوق کے اعمال پر نگران ہے، غالب ہے جسے مغلوب نہیں کیا جا سکتا، جبار ہے جس نے تمام بندوں کو قہر کیا، اور باقی تمام مخلوق اس کے آگے جھک گئی، متکبر ہے جس کے لیے بڑائی اور عظمت ہے۔
- ج1 بعد: وہ اللہ ہے جو معبود برحق ہے، جس کے سوا کوئی عبادت کے لائق نہیں، سب چیزوں کا بادشاہ، ان میں بغیر کسی روک ٹوک اور مزاحمت کے تصرف کرنے والا، ہر نقص سے پاک، جو ہر عیب سے سالم ہے، اپنے رسولوں اور انبیاء کی تصدیق کرنے والا ان روشن نشانیوں کے ساتھ جو اس نے ان کے ساتھ بھیجیں، اپنی تمام مخلوق کے اعمال پر نگہبان، غالب جو کبھی مغلوب نہیں ہوتا، جبار جو تمام بندوں پر غالب ہے اور ساری مخلوق اس کے آگے جھکی ہوئی ہے، بڑائی والا جس کے لیے کبریائی اور عظمت ہے۔
- ج2 قبل: اللہ تعالیٰ ہر اس چیز سے پاک ہے جو لوگ اس کی عبادت میں اس کے ساتھ شریک کرتے ہیں۔
- ج2 بعد: اللہ تعالیٰ ہر اس چیز سے پاک ہے جسے لوگ اس کی عبادت میں اس کے ساتھ شریک کرتے ہیں۔

**quran:2:238|id** (كان ناجحًا) → **PASS** (FAITHFUL yes، TERMS ok، LANGUAGE ok)
- ج1 قبل: Jagalah -wahai kaum muslimin- shalat-shalat fardhu yang lima dengan terus-menerus melaksanakannya pada waktunya beserta syarat-syarat, rukun-rukun, dan kewajiban-kewajibannya, dan jagalah shalat yang pertengahan di antara shalat-shalat itu yaitu shalat Ashar, dan berdirilah dalam shalat kalian dengan taat kepada Allah, khusyuk dan rendah diri.
- ج1 بعد: Peliharalah -wahai kaum muslimin- shalat-shalat lima yang diwajibkan dengan terus-menerus melaksanakannya pada waktu-waktunya dengan syarat-syaratnya, rukun-rukunnya, dan kewajiban-kewajibannya, dan peliharalah shalat yang pertengahan di antara shalat-shalat itu, yaitu shalat Asar, dan berdirilah dalam shalat kalian dalam keadaan taat kepada Allah, khusyu' dan rendah diri.


**تنبيه على المراجع:** المراجع الأعمى غير مراجعي الحكم الأصلي على الـ402. فبعض «الفاشل الجديد» كان في الترجمة القديمة نفسها وحكم عليه المراجع الأصلي بالنجاح: في (هـ2) «क्या» في `quran:42:53|hi`، وفي (هـ1) «متکبر ہے» في `quran:59:23|ur`. والباقي جديد في المخرجات نفسها: في (هـ2) «प्रलय के दिन» في `quran:4:87|hi` و«অসীম দাতা» في `quran:59:22|bn`؛ وفي (هـ1) `quran:6:102|id` و`quran:48:29|hi`. فحتى بحساب الجديد وحده، (هـ2) 2/40 فوق حد 1/40.

نيورونات الملحق 11 كلها: 64164 (≈ $0.706) من سقف 136000.
