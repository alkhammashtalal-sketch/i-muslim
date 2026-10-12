# Faithfulness review v2: Bengali (bn) and Indonesian (id)

- **Input:** `scratchpad/explain2/bn-id.jsonl`. It has 16 lines (8 ids x 2 languages) and was not modified.
- **Generator under review:** DeepSeek V4 Flash. **Reviewer:** an independent judge.
- **Sources:**
  - Quran ids are checked against al-Tafsir al-Muyassar (`source_ar`), with `ayah_ar` and `ayah_en` for reference.
  - Aqeedah ids are checked against the al-Usul al-Thalatha passage in `source_ar`.
- **Rejected / unavailable:** none. No line has `rejected` or `error` set, and all 16 have text, so all 16 were judged.

## Conventions applied

- **FAITHFUL** is judged against `source_ar` only. Possible values:
  - **yes**: nothing material is added.
  - **minor-addition**: a small, harmless framing word or connective is added. Still PASS.
  - **no**: added doctrine, ruling, definition, condition change, purpose, concluding lesson or moral, or a change to a definition or classification the source states. FAIL.
- **Omissions** are noted but are not a FAIL, unless they change who is addressed or the scope of a condition.
- **VERSE-TRANSLATION** is "yes" only when the text speaks in the verse's own voice: its address, its commands, or its statement made as the verse's own. Third-person description of what the verse or tafsir says is "no", even when it follows the verse's clause order. This includes reported forms such as "the text says that…" and "they are told to…".
- **Embedded hadith wording:** hadith wording that appears unattributed inside the creed source is not counted as quoting a hadith. This covers the branches of faith and the six pillars.
- **Sentence count** outside 3–5 is a note only.
- **PASS** requires all of the following:
  - FAITHFUL is yes or minor-addition;
  - VERSE-TRANSLATION is no;
  - TERMS is ok;
  - LANGUAGE is ok.

## Summary

| Lang | Lines | Unavailable (rejected) | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| bn | 8 | 0 | 8 | 4 | 4 | 50.0% |
| id | 8 | 0 | 8 | 4 | 4 | 50.0% |
| **Total** | 16 | 0 | 16 | 8 | 8 | 50.0% |

| id | bn | id (Indonesian) |
|---|---|---|
| quran:2:255 | PASS | PASS (minor-addition) |
| quran:112:1 | **FAIL** | **FAIL** |
| quran:51:56 | **FAIL** | **FAIL** |
| quran:2:183 | PASS | **FAIL** |
| quran:5:6 | PASS | PASS (minor-addition) |
| quran:94:5 | **FAIL** | **FAIL** |
| aqeedah:usul:005 | PASS | PASS |
| aqeedah:usul:007 | **FAIL** | PASS |

**Why the 8 items failed:**
- **A concluding lesson, moral or significance claim was added (7 items):** 112:1 bn/id, 51:56 bn/id, 2:183 id, 94:5 bn/id.
  - This is the dominant failure. In each case it is the last one or two sentences: "inti dari tauhid", "seorang muslim harus…", "puasa bukan sekadar menahan lapar", "এই আয়াতটি মুমিনদের … শিক্ষা দেয়", "ধৈর্য ও অধ্যবসায়ের শিক্ষা", "menguatkan hati … dakwah".
- **The addressee was changed (1 item):** 94:5 id generalises the Prophet ("your enemies") to "seseorang" (anyone). It also fails for an added lesson.
- **The source's classification was misstated (1 item):** usul:007 bn calls the passage "ঈমানের দ্বিতীয় স্তর" ("the second level of iman"). The source says iman *is* the second level of the religion (islam, iman, ihsan). This is the only defect in that text.
- **Verse voice:** no item uses the verse's own voice (address or commands). All verse content is reported in the third person.
- **Terms and language:** no FAIL for either. All Indonesian terms are in Indonesian forms: shalat, zakat, tauhid, syafaat, tayamum, hadas, wudhu, syirik, ihsan. All Bengali text is in Bengali script, with no Latin leakage. The only non-Bengali character is the ﷺ ligature.

---

## Per-item judgments

### quran:2:255 (Ayat al-Kursi)

Source points:
- only Allah merits worship;
- al-Hayy, with all meanings of perfect life as befits His majesty;
- al-Qayyum;
- no drowsiness (sinah = nu'as) and no sleep;
- He owns the heavens and the earth;
- no one dares intercede except by His leave;
- His knowledge encompasses past, present and future;
- no one learns any of His knowledge except what He teaches;
- the Kursi encompasses the heavens and the earth. **Kursi = the place of the Lord's two feet**, and its modality is known only to Allah;
- guarding them does not burden Him;
- al-'Aliyy in essence and attributes;
- the greatest ayah in the Quran, named Ayat al-Kursi.

**id: PASS (minor-addition)**
- **FAITHFUL: minor-addition.** Two causal connectives are not in the source:
  - "hanya Allah yang berhak disembah … **karena** Dia adalah Yang Maha Hidup…" ("only Allah deserves worship … *because* He is the Ever-Living");
  - "segala yang ada di langit dan di bumi adalah milik-Nya, **sehingga** tidak ada seorang pun yang berani memberi syafaat…" ("everything belongs to Him, *so* no one dares intercede").

  The Muyassar lists these attributes side by side and does not link them as reason and result. No new proposition is added, only the relation between source points, so this is minor. It would be cleaner without the connectives.
- **Kursi:** the definition is kept correctly: "kursi itu adalah tempat kedua kaki Rabb, yang tidak diketahui hakikatnya kecuali oleh Allah".
- **Omissions** (not a FAIL):
  - "as befits His majesty";
  - "present" (it says only past and future);
  - al-'Aliyy / al-'Azim.
- **VERSE-TRANSLATION: no.** It follows the verse's order, but every point is a third-person description using the tafsir's glosses.
- **TERMS: ok** (syafaat, Rabb, Kursi, Ayat Kursi, Al-Qur'an).
- **LANGUAGE: ok.** 5 sentences.

**bn: PASS**
- **FAITHFUL: yes.** Every statement maps to the source:
  - only Allah merits ibadah;
  - চিরঞ্জীব (Ever-Living);
  - looks after everything;
  - no tandra or sleep;
  - ownership;
  - no intercession without permission;
  - knowledge of past, present and future;
  - no one knows except what He makes known;
  - কুরসি (পদতলের স্থান), whose true state only Allah knows. This keeps the Kursi as "place of the feet", not the Throne;
  - preserving them is not hard for Him;
  - the greatest ayah, called Ayatul Kursi.
- **Omissions:** "as befits His majesty", "two" (feet), and al-'Aliyy / al-'Azim.
- **VERSE-TRANSLATION: no.** Third person throughout.
- **TERMS: ok** (ইবাদত, কুরসি, আয়াতুল কুরসি, আল্লাহ তাআলা).
- **LANGUAGE: ok.** Minor points:
  - "জীবনীশক্তি" (vitality) is a slightly reductive rendering of "all meanings of perfect life";
  - "যার" refers to Allah where the honorific "যাঁর" is expected.
  - 6 sentences (note only).

### quran:112:1

Source:
- **Say, O Messenger**: He is Allah, unique in uluhiyyah, rububiyyah, and the names and attributes;
- no one shares with Him in them.

**id: FAIL**
- **FAITHFUL: no.**
  - **S3 adds a definition and conclusion:** "Ini adalah inti dari tauhid, yaitu mengesakan Allah dalam ibadah dan keyakinan" ("This is the essence of tauhid, i.e. singling out Allah in worship and belief").
  - **S4 adds a ruling/moral:** "Seorang muslim harus meyakini keesaan Allah tanpa membagi kemuliaan-Nya kepada siapa pun" ("A Muslim must believe…").
  - **Smaller points:**
    - it drops the addressee (the Messenger);
    - it adds "yang sempurna" (perfect) to the names and attributes;
    - it renders rububiyyah as "kekuasaan" (power), which is loose.
- **VERSE-TRANSLATION: no.**
- **TERMS: ok** (tauhid, muslim).
- **LANGUAGE: ok.** 4 sentences.
- **Reason:** adds a definition of tauhid ("inti dari tauhid … mengesakan Allah dalam ibadah dan keyakinan") and a ruling, "Seorang muslim harus meyakini…". Neither is in the source.

**bn: FAIL**
- **FAITHFUL: no.**
  - It correctly keeps the addressee: the Messenger ﷺ is told to declare.
  - It correctly keeps uluhiyyah, rububiyyah, names and attributes, and that no one shares in them.
  - **It frames these as "তাওহিদের সব দিক" ("all aspects of tawhid").** The source does not say this.
  - **It ends with a concluding claim the source does not make:** "এটি আল্লাহর একত্বের মূল নীতিকে প্রতিষ্ঠিত করে" ("it establishes the fundamental principle of Allah's oneness").
- **VERSE-TRANSLATION: no.** "রাসূলুল্লাহ ﷺ-কে বলা হয়েছে ঘোষণা করতে" ("the Messenger was told to declare") is reported, not the verse's "Say".
- **TERMS: ok** (তাওহিদ, আল-উলুহিয়্যাহ, আর-রুবুবিয়্যাহ).
- **LANGUAGE: ok.** 3 sentences.
- **Reason:** adds the "all aspects of tawhid" framing and a concluding significance claim ("establishes the core principle of Allah's oneness").

### quran:51:56

Source:
- I created jinn and humans, and sent all the messengers, only for a lofty purpose (غاية سامية);
- that purpose is worship of Me alone, not of anyone besides Me.

**id: FAIL**
- **FAITHFUL: no.**
  - S1 is faithful: it covers jinn and humans, all messengers, the lofty purpose, and worship of Allah alone.
  - **S2 adds tauhid and examples:** "Ini menegaskan inti dari tauhid, bahwa segala ibadah seperti shalat, zakat, puasa, dan lainnya harus ditujukan hanya kepada Allah" (examples and a ruling).
  - **S3 adds a claim and widens the scope:** "ibadah bukan sekadar ritual, melainkan tujuan hidup yang hakiki bagi **semua makhluk**". It widens jinn and humans to *all creatures*.
  - **S4 adds a moral:** "setiap muslim hendaknya menjadikan seluruh aktivitasnya sebagai bentuk pengabdian".
- **VERSE-TRANSLATION: no.**
- **TERMS: ok.**
- **LANGUAGE: ok.** 4 sentences.
- **Reason:** S2–S4 add worship examples (shalat, zakat, puasa) and an "inti tauhid" claim. They widen the scope to "semua makhluk" and end with a moral for every Muslim.

**bn: FAIL**
- **FAITHFUL: no.**
  - S1 is faithful.
  - **S2 adds a claim and misattributes it:** "এই সৃষ্টি ও প্রেরণ কোনো খেল বা অহেতুক কাজের জন্য নয়" ("not for play or in vain"). This is not in the source, and the text attributes it with "এখানে বলা হয়েছে" ("it is said here").
  - **S3 adds:** "তাওহিদের ওপর প্রতিষ্ঠিত থাকা" ("remaining firm on tawhid").
  - **S4 adds a lesson:** "এই আয়াতটি মুমিনদের মনে এই শিক্ষা দেয় যে, তাদের জীবনের প্রতিটি কাজ আল্লাহর সন্তুষ্টির জন্যই হওয়া উচিত".
- **VERSE-TRANSLATION: no.**
- **TERMS: ok** (ইবাদত, রাসূল, তাওহিদ, মুমিন).
- **LANGUAGE: ok.** 4 sentences.
- **Reason:** adds "not for play/in vain" (and attributes it to the text), adds "remain firm on tawhid", and ends with an added lesson about every act of a believer's life.

### quran:2:183

Source:
- addressed to those who believed in Allah and His Messenger and acted by His law;
- Allah prescribed fasting on them as on the nations before;
- so that they fear their Lord, making obedience and worship of Him alone a shield between themselves and sins.

**id: FAIL**
- **FAITHFUL: no.**
  - S1 and S2 are faithful. They keep the full addressee definition ("beriman kepada-Nya dan rasul-Nya serta mengamalkan syariat-Nya"), the earlier nations, and taqwa as obedience and worship forming a shield against sin.
  - **S3 adds a concluding lesson:** "Dengan demikian, puasa bukan sekadar menahan lapar dan haus, tetapi sarana untuk meningkatkan ketakwaan dan menjauhi larangan Allah" ("Thus fasting is not merely abstaining from hunger and thirst…").
- **VERSE-TRANSLATION: no.**
- **TERMS: ok** (puasa, syariat, bertakwa, ketakwaan).
- **LANGUAGE: ok.** 3 sentences.
- **Reason:** the final sentence adds a concluding lesson ("puasa bukan sekadar menahan lapar dan haus…") that is not in the source.

**bn: PASS**
- **FAITHFUL: yes.**
  - It keeps the full addressee definition: true belief in Allah and His Messenger, and acting by His law.
  - It covers fasting (রোজা) prescribed as it was on earlier ummahs, and taqwa explained as protecting oneself from sin through obedience and worship of Him alone.
  - "পাঠ্য অনুযায়ী" ("according to the text") is harmless framing.
- **VERSE-TRANSLATION: no.** It does not use "O you who believe" in the verse's voice.
- **TERMS: ok** (রোজা, ফরজ, উম্মত, তাকওয়া, গুনাহ, ইবাদত).
- **LANGUAGE: ok.** 3 sentences.

### quran:5:6

Source points:
- those who believe, when they intend to pray and are not in purity: wash faces, and hands **with** the elbows (*mirfaq* = the joint between forearm and upper arm); wipe heads; wash feet **with** the ankles (*ka'bayn* = the two protruding bones where shin meets foot);
- major hadath: purify by ghusl before prayer;
- tayammum conditions: ill, or travelling *while healthy*, or relieved oneself, or had intercourse with one's wife, **and** found no water. Then strike the **surface of the earth** with the hands and wipe face and hands;
- Allah does not want hardship in purification. He permitted tayammum as ease and mercy, as a substitute for water;
- the concession is part of the completion of blessings that calls for gratitude through obedience.

**id: PASS (minor-addition)**
- **FAITHFUL: minor-addition.** The conditions are all kept: intending prayer while not pure, major hadath, the four tayammum cases, and no water. Minor deviations:
  - **"debu tanah yang suci":** the tafsir says "surface of the earth". "Debu" (dust) narrows it toward one fiqh position. "Suci" comes from the verse, not the tafsir. "Debu yang suci" is the standard Indonesian rendering of *sa'id tayyib*, so this is not invented content, but it departs from the tafsir.
  - **"hingga siku":** the tafsir deliberately says *ma'a* (with, i.e. inclusive). "Hingga" (up to) is ambiguous rather than wrong.
  - **"wudhu":** used as a label for the procedure. It is not in the source. Harmless.
  - **Omissions:** the anatomical glosses of elbow and ankle (the words siku / mata kaki carry those meanings), "while healthy" for the traveller, and "as a substitute for water".
- **VERSE-TRANSLATION: no.** "Ayat ini menjelaskan tata cara wudhu bagi orang beriman…" is a description, with no "wash your faces" in the second person.
- **TERMS: ok** (wudhu, shalat, hadas besar, tayamum, bersuci, mandi).
- **LANGUAGE: ok.** 4 sentences, though long ones.
- **Minor-addition reason:** "debu" (dust) and "hingga" (up to) follow the standard verse rendering rather than the tafsir's "surface of the earth" and inclusive "with the elbows". "Wudhu" is an added label. No ruling is changed.

**bn: PASS**
- **FAITHFUL: yes.**
  - It keeps the addressee and condition: believers intending prayer without wudu.
  - It keeps the washing and wiping. "গোড়ালিসহ" keeps the inclusive "with the ankles". "কনুই পর্যন্ত" (up to the elbows) is ambiguous rather than inclusive. Note only.
  - It covers major impurity (জানাবাত, the verse's own word), ghusl before prayer, the four tayammum cases plus no water, and wiping face and hands.
  - It covers ease and mercy, no constriction, completion of blessing, and gratitude through obedience.
  - "পবিত্র মাটি" ("pure earth") takes "pure" from the verse. It is not an addition beyond the verse.
  - Omitted: "while healthy" and "as a substitute for water".
- **VERSE-TRANSLATION: no.** "তাদেরকে বলা হয়েছে যে, তারা যেন … ধোয়" ("they are told that they should wash…") is reported third person, not the verse's imperative.
- **TERMS: ok** (নামাজ, অজু, মাসেহ, গোসল, জানাবাত, তায়াম্মুম, নেয়ামত, শুকরিয়া).
- **LANGUAGE: ok.** "গোড়ালি" covers both ankle and heel in common Bengali usage. Acceptable here. 6 sentences (note only).

### quran:94:5

Source: "So let not the harm of **your** enemies [O Prophet] turn you from spreading the message; for with distress comes relief, with distress comes relief."

**id: FAIL**
- **FAITHFUL: no.**
  - **S1 changes the addressee:** "gangguan dari musuh tidak boleh menghalangi **seseorang** dalam menyebarkan risalah". The source addresses the Prophet about *his* enemies. "Seseorang" (anyone) generalises this into a rule for everyone.
  - **S2 adds a purpose:** "diulang untuk menegaskan keyakinan".
  - **S3 adds a claim and generalises:** "Ini memberi hiburan bahwa **setiap** kesusahan akan disertai jalan keluar".
  - **S4 adds a lesson:** "Maknanya menguatkan hati agar tetap teguh dalam tugas dakwah".
- **VERSE-TRANSLATION: no.** It is borderline: "Teks menegaskan bahwa bersama kesulitan pasti ada kemudahan" uses the verse's words (kesulitan / kemudahan), but it is reported as what the text says.
- **TERMS: ok** (risalah, dakwah).
- **LANGUAGE: ok.** 4 sentences.
- **Reason:** generalises the addressee from the Prophet to "seseorang" and adds a consolation and steadfastness-in-dakwah lesson that is not in the source.

**bn: FAIL**
- **FAITHFUL: no.**
  - S1 is faithful and keeps the addressee: "শত্রুদের কষ্ট যেন নবী ﷺ-কে বার্তা প্রচার থেকে বিরত না রাখে".
  - S2 is faithful but adds "জোর দেওয়ার জন্য" ("for emphasis") as the purpose of the repetition. That alone would be minor.
  - **S3 adds a lesson and widens the audience:** "এটি মুমিনদের জন্য ধৈর্য ও অধ্যবসায়ের শিক্ষা দেয়, কারণ আল্লাহর পক্ষ থেকে ত্রাণ নিশ্চিত" ("This teaches believers patience and perseverance, because relief from Allah is certain"). It moves the audience from the Prophet to believers.
- **VERSE-TRANSLATION: no.** "পাঠ্যটি বলে যে…" ("the text says that…") is reported.
- **TERMS: ok.**
- **LANGUAGE: ok.** 3 sentences.
- **Reason:** the final sentence adds a lesson of patience and perseverance for believers that the source does not contain.

### aqeedah:usul:005

Source points:
- **Second principle:** knowing the religion of Islam with evidences.
- Islam = submitting to Allah with tawhid, yielding to Him in obedience, and being free of shirk.
- Three levels: islam, iman, ihsan. Each has pillars.
- **Five pillars:** the two testimonies, prayer, zakat, Ramadan fasting, and hajj to the Sacred House.
- **Meaning of la ilaha illa Allah:** no deity rightly worshipped but Allah. "La ilaha" negates everything worshipped besides Him; "illa Allah" affirms worship for Him alone, as He has no partner in His dominion. It is explained by the Ibrahim verses (43:26–28) and 3:64.
- **Meaning of the testimony to Muhammad:** obeying his commands, believing his reports, avoiding what he forbade, and worshipping Allah only as he legislated.
- **Evidence for prayer and zakat, and the explanation of tawhid:** 98:5.

**id: PASS**
- **FAITHFUL: yes.** It covers:
  - the definition of Islam (all three parts);
  - the three levels;
  - the five pillars;
  - the negation and affirmation of la ilaha illa Allah, with the Ibrahim verses cited as the explanation;
  - all four parts of the meaning of the testimony to the Messenger;
  - the evidence for prayer and zakat.

  Small imprecision: "Dalil shalat dan zakat **serta tauhid**". The source says "the evidence for prayer and zakat, and the *explanation* (tafsir) of tawhid". Omitted: "each level has pillars", the dominion analogy, and 3:64.
- **VERSE-TRANSLATION: no.** The cited verses (43:26, 98:5) are described in the third person ("ayat tentang Nabi Ibrahim yang berlepas diri…", "perintah untuk beribadah kepada Allah dengan ikhlas…"), not quoted.
- **TERMS: ok** (tauhid, syirik, ihsan, syahadat, shalat, zakat, Baitullah, ilah, Rasulullah).
- **LANGUAGE: ok.** 5 sentences.

**bn: PASS**
- **FAITHFUL: yes.** It covers:
  - the second principle as knowing Islam with proofs;
  - the definition of Islam (all three parts);
  - the three levels, each with pillars;
  - the five pillars;
  - "আল্লাহ ছাড়া কোনো সত্য ইবাদতযোগ্য নেই", which keeps "in truth" (بحق);
  - all four parts of the testimony to the Messenger.

  Notes:
  - **"ইসলাম ধর্মের দ্বিতীয় মূল বিষয়"** ("the second fundamental of the religion of Islam") is a loose label for "the second of the three principles". It is not contradicted by the source, because the clause that follows states it correctly.
  - "পবিত্র কাবা ঘর" is a harmless rendering of Bayt Allah al-Haram.
  - Omitted: the negation and affirmation breakdown, and the evidences.
- **VERSE-TRANSLATION: no.**
- **TERMS: ok** (তাওহিদ, শিরক, ঈমান, ইহসান, কালিমা শাহাদাত, নামাজ কায়েম, যাকাত, রোজা, হজ).
- **LANGUAGE: ok.** 5 sentences.

### aqeedah:usul:007

Source points:
- **The second level is iman.** It has seventy-some branches: the highest is saying la ilaha illa Allah, the lowest is removing harm from the road, and haya' is a branch.
- **Six pillars:** Allah, angels, books, messengers, the Last Day, and qadar, good and bad.
- **Evidence for the six pillars:** 2:177.
- **Evidence for qadar:** 54:49.

The embedded branches and pillars wording is not counted as hadith quotation (per the convention).

**id: PASS**
- **FAITHFUL: yes.** It covers:
  - "lebih dari tujuh puluh cabang" (more than seventy), an acceptable rendering of بضع وسبعون;
  - the highest and lowest branches, and haya';
  - the six pillars, including takdir good and bad;
  - 2:177 and 54:49 identified as the evidences, with 54:49 tied to the sixth pillar.

  Notes:
  - "kebaikan sejati **bukan hanya** menghadap ke timur atau barat" ("not *only* facing east or west") softens the verse's "it is not righteousness that you turn…". This is a common interpretive reading, so it is a note, not an addition.
  - Omitted: that iman is the second level.
- **VERSE-TRANSLATION: no.** 2:177 and 54:49 are described in the third person ("Ayat dalam surah Al-Baqarah menunjukkan bahwa…").
- **TERMS: ok** (la ilaha illallah, rukun iman, takdir, malaikat, hari akhir, surah).
- **LANGUAGE: ok.** 4 sentences.

**bn: FAIL**
- **FAITHFUL: no.**
  - **S1 misstates the classification:** "এই পাঠটি **ঈমানের দ্বিতীয় স্তর** সম্পর্কে ব্যাখ্যা করছে" ("this text explains the second level of *iman*"). The source's heading means iman *is* the second level of the religion (after islam, before ihsan). The genitive turns it into a level within iman and implies that iman has levels, which the source does not state. This changes a classification the source gives.
  - Everything else is faithful and complete:
    - more than seventy branches, the highest and lowest, and haya';
    - the six pillars, including qadar good and bad;
    - 2:177 and 54:49, both described in the third person.
- **VERSE-TRANSLATION: no.**
  - The 2:177 description ("প্রকৃত সৎকর্মকে পূর্ব বা পশ্চিম দিকে মুখ ফেরানো নয়, বরং … ঈমান আনা হিসেবে বর্ণনা করা হয়েছে") closely tracks the verse. It is framed as "is described as", so it is third person.
- **TERMS: ok** (ঈমান, লা ইলাহা ইল্লাল্লাহ, হায়া, ফেরেশতা, কিতাব, তাকদির, সূরা বাকারা / ক্বামার).
- **LANGUAGE: ok.** 6 sentences (note only).
- **Reason:** calls the passage "the second level of iman" instead of "iman, the second level (of the religion)". This misstates the source's classification. Correcting that one phrase, for example to "দ্বীনের দ্বিতীয় স্তর ঈমান", would make it a PASS.

---

## Observations for the prompt and guard

1. **The added closing lesson is the dominant failure.** It caused 7 of the 8 FAILs. The model has a strong habit of ending with "Ini menegaskan…", "Dengan demikian…", "Seorang muslim harus…", "এই আয়াতটি … শিক্ষা দেয়" or "মূল নীতিকে প্রতিষ্ঠিত করে".
   - A guard heuristic on the final sentence could catch most of these:
     - id: dengan demikian, hendaknya, harus, inti dari, bukan sekadar, menguatkan hati, setiap muslim;
     - bn: শিক্ষা দেয়, উচিত, মূল নীতি, প্রতিষ্ঠিত করে.
   - Note that 5:6 bn legitimately uses "উচিত" because the source itself calls for gratitude. A guard should flag it for review rather than reject it outright.
2. **Indonesian adds more than Bengali.** The id lessons are longer and more sermon-like: 51:56 id has three added sentences out of four.
3. **Addressee drift on Prophet-addressed verses.** 94:5 id turns "your enemies [O Prophet]" into "seseorang". 112:1 id drops "O Messenger" entirely. 112:1 bn and 94:5 bn keep the Prophet as addressee correctly.
4. **Verse voice is solved in this run.** No text uses the verse's address or imperative. 5:6 bn and 112:1 bn use reported speech correctly ("তাদেরকে বলা হয়েছে যে…", "…-কে বলা হয়েছে ঘোষণা করতে").
5. **Terms are solved in this run.** The Indonesian forms are correct (shalat, zakat, tauhid, tayamum), with no zakah/tawhid/sawm drift. The Bengali is fully in Bengali script, and honorific তাঁর is used for Allah throughout. The one exception is relative "যার" in 2:255.
6. **Sentence count:** 2:255 bn, 5:6 bn and usul:007 bn have 6 sentences (note only).

## FAIL list

(quran:112:1, bn), (quran:51:56, bn), (quran:94:5, bn), (aqeedah:usul:007, bn), (quran:112:1, id), (quran:51:56, id), (quran:2:183, id), (quran:94:5, id)
