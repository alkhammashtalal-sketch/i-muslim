# Faithfulness review v2: DeepSeek V4 Flash explanations (ar + en)

Input: `scratchpad/explain2/ar-en.jsonl`, 16 lines: 6 Quran ids and 2 aqeedah ids, each in ar and en. I did not modify the input.
Reviewer: an independent model. I read every `text` in full against `source_ar`, which is al-Tafsir al-Muyassar for the Quran ids and the al-Usul al-Thalatha passage for the aqeedah ids. For the Quran ids I also checked each text against `ayah_ar` and `ayah_en`.

## Conventions applied

- **FAITHFUL**:
  - `yes`: every statement is supported by the source.
  - `minor-addition`: a small, harmless framing word or phrase that adds no meaning. Still PASS.
  - `no`: the text adds a doctrine, ruling, definition, purpose, concluding lesson or moral, or it changes a condition, qualifier or definition. FAIL.
  - Omitting some of the source is not an addition. It counts against the text only when it changes a ruling's conditions or a definition. Otherwise I record it as a note.
- **VERSE-TRANSLATION**: `yes` only when the text uses the verse's own address or commands in the verse's voice, or renders a verse or hadith as itself. A third-person description of what the verse says that follows the tafsir's glosses is `no`, even when it tracks the clause order. In Arabic, repeating the Muyassar's own wording is not counted. Hadith wording that appears unattributed inside the creed text (the branches of faith, the six pillars) is not counted as quoting a hadith.
- **TERMS / LANGUAGE**: `ok` / `problem`. LANGUAGE is a `problem` when the text is not in the required language.
- **Verdict**: a line is PASS when FAITHFUL is yes or minor-addition, VERSE-TRANSLATION is no, and TERMS and LANGUAGE are ok. Otherwise it is FAIL.
- **Style**: the 3-5 sentence rule is a note only. All 15 judged texts have 3-5 sentences. Several are long run-on sentences, which I note below.
- **Rejected lines**: a line with `rejected` set is UNAVAILABLE and not judged.

## Summary

| Lang | Lines | Unavailable (rejected) | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| ar | 8 | 0 | 8 | 4 | 4 | 50.0% |
| en | 8 | 1 (`quran:2:255`, `copies_meaning_en`) | 7 | 3 | 4 | 42.9% |
| **All** | 16 | 1 | 15 | 7 | 8 | 46.7% |

## Verdict table

| # | id | lang | Faithful | Verse-translation | Terms | Language | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | quran:2:255 | ar | yes | no (borderline) | ok | ok | PASS |
| 2 | quran:2:255 | en | n/a | n/a | n/a | n/a | UNAVAILABLE (rejected: copies_meaning_en) |
| 3 | quran:112:1 | ar | minor-addition | no | ok | ok | PASS |
| 4 | quran:112:1 | en | **no** | no | ok | ok | **FAIL** |
| 5 | quran:51:56 | ar | **no** | no | ok | ok | **FAIL** |
| 6 | quran:51:56 | en | minor-addition | no | ok | ok | PASS |
| 7 | quran:2:183 | ar | **no** | no | ok | ok | **FAIL** |
| 8 | quran:2:183 | en | **no** | no | ok | ok | **FAIL** |
| 9 | quran:5:6 | ar | yes | no | ok | ok | PASS |
| 10 | quran:5:6 | en | **no** | no | ok | ok | **FAIL** |
| 11 | quran:94:5 | ar | **no** | no | ok | ok | **FAIL** |
| 12 | quran:94:5 | en | **no** (borderline) | no | ok | ok | **FAIL** |
| 13 | aqeedah:usul:005 | ar | yes | no | **problem** | **problem** | **FAIL** |
| 14 | aqeedah:usul:005 | en | yes | no (borderline) | ok | ok | PASS |
| 15 | aqeedah:usul:007 | ar | yes | no | ok | ok | PASS |
| 16 | aqeedah:usul:007 | en | yes | no | ok | ok | PASS |

## Per-item notes

### 1. quran:2:255 ar: PASS
- **Faithful: yes.** Every claim maps to the Muyassar:
  - Worship is due to Him alone (the source has "لا يستحق الألوهية والعبودية إلا هو").
  - الحي, and القائم على كل شيء.
  - سنة is glossed as نعاس.
  - Everything in the heavens and earth is His dominion.
  - No intercession without His permission.
  - His knowledge covers past, present and future.
  - No one learns of His knowledge except what Allah teaches.
  - **The Kursi is defined exactly as the source does, as موضع قدمي الرب, with كيفيته known only to Allah.** It is not equated with the Throne.
  - لا يثقله حفظهما, and العلي بذاته وصفاته.
  - It is the greatest verse and is called Ayat al-Kursi. Both facts are in the source.
- Small shift: "لا يمكن لأحد أن يشفع" (no one can intercede) replaces the source's "لا يتجاسر أحد" (no one dares). This is consistent with the verse.
- Omissions, none of which changes meaning: "له جميع معاني الحياة الكاملة كما يليق بجلاله", "على جميع مخلوقاته", and the gloss of العظيم ("الجامع لجميع صفات العظمة والكبرياء"). Because of the last one, العظيم is not explained at all.
- **Verse-translation: no (borderline).** The text is third person and uses the tafsir's glosses (نعاس, ماضي/حاضر/مستقبل, موضع قدمي الرب). However, it follows the verse and tafsir clause order almost exactly. It also keeps short Quranic phrasing ("كرسيه وسع السماوات والأرض"), but the Muyassar itself repeats that phrasing verbatim. The app's guard rejected the English counterpart of this id for copying meaning, and this Arabic text is structurally similar.
- Style: 3 sentences but 82 words, so the sentences are run-ons rather than "short".

### 2. quran:2:255 en: UNAVAILABLE
- `rejected: copies_meaning_en`. Users do not see it, so I did not judge it.

### 3. quran:112:1 ar: PASS (minor-addition)
- **Faithful: minor-addition.** "ليقول للناس" names an audience ("الناس") that the tafsir does not mention, and "الخصائص الإلهية" is framing. Both are harmless.
- Everything else is from the source:
  - الألوهية is rendered as "المستحق للعبادة".
  - Uniqueness in ربوبية, أسماء and صفات.
  - No one shares in them.
  - The addressee, the Messenger ﷺ, is kept.
- **Verse-translation: no.** The text does not voice "قل". It reports in third person that the address is to the Messenger, and it puts the content before the address, so it does not follow the verse's order.

### 4. quran:112:1 en: FAIL
- **Faithful: no.** The closing clause "which is the core of tawhid (the belief in Allah's absolute unity)" adds a doctrinal characterization and conclusion that the source does not contain. The Muyassar says only that Allah is unique in divinity, lordship, names and attributes, and that no one shares them.
- The rest is faithful: the Prophet ﷺ is told to declare it, the four areas of uniqueness are listed, and no one shares them. "Prophet" for الرسول is acceptable.
- Verse-translation: no. The text says "tells the Prophet to declare" and does not voice "Say".

### 5. quran:51:56 ar: FAIL
- **Faithful: no.** Sentence 2 adds a definition of worship that is not in the source: "المقصود بالعبادة هنا هي طاعة الله والانقياد لأوامره، وليس مجرد القول أو الشعور". The Muyassar only says "عبادتي وحدي دون من سواي".
- Sentence 1 is faithful: jinn and humans were created, and all messengers were sent, for one lofty aim, which is to worship Him alone. Sentence 3 ("توحيد الله في العبادة") is an acceptable restatement.
- Verse-translation: no. The text is third person, and it includes "وأرسل جميع الرسل" from the tafsir, which the verse does not have.

### 6. quran:51:56 en: PASS (minor-addition)
- **Faithful: minor-addition.**
  - Sentences 1 and 2 match the source: the sole, lofty purpose; creating jinn and humankind and sending all the messengers; worship of Him alone, with no partner.
  - Sentence 4, "The verse does not mention any other reason or benefit beyond this pure worship", is a meta-comment that the tafsir does not have. It only restates the exclusivity already in the source ("إلا لغاية سامية") and adds no doctrine, so I counted it as minor. It is borderline.
  - Sentence 3 says "the mission of every prophet", but the source says الرسل (messengers), and sentence 1 had it right. Prophet and messenger are distinct terms. This is a minor drift that changes no ruling.
- Verse-translation: no. The text does not voice "I did not create...".

### 7. quran:2:183 ar: FAIL
- **Faithful: no.** Sentence 3 adds a concluding lesson, together with an implicit definition of fasting: "وهكذا يظهر أن الصيام ليس مجرد امتناع عن الطعام والشراب، بل هو وسيلة لتربية النفس على الخشية والالتزام بأوامر الله". None of this is in the Muyassar.
- Smaller framing: "في قلوبهم" and "حكمة عظيمة".
- The addressees are kept exactly: "صدقوا بالله ورسوله وعملوا بشرعه". The obligation "as on the nations before them" is kept, and so is the taqwa gloss ("يجعلون بينهم وبين المعاصي وقاية ... بطاعته وعبادته وحده").
- Verse-translation: no. The text reports the address in third person.

### 8. quran:2:183 en: FAIL
- **Faithful: no.** "The text emphasizes that fasting is a shared duty across earlier communities, **not a new burden**" adds a conclusion and lesson that the source does not contain. "Its goal is to cultivate God-consciousness and obedience" mostly restates the source. "Truly believed" is small framing.
- Correct points:
  - The addressees: believed in Allah and His Messenger and act by His law.
  - Fasting was obligatory as it was on the nations before.
  - Taqwa is glossed as protecting oneself from sins by obedience and by worshipping Him alone.
- Verse-translation: no. The text says "This verse addresses those who...". It does not use the vocative.

### 9. quran:5:6 ar: PASS
- **Faithful: yes.** The conditions and rulings are kept:
  - Wudu is required for whoever is not in a state of purity.
  - Washing the hands **مع المرفقين** and the feet **مع الكعبين** keeps the tafsir's "including" qualifier.
  - الحدث الأكبر requires ghusl before prayer.
  - In the four cases, when there is no water, tayammum is done by striking the ground and wiping the face and hands.
  - Allah does not want hardship in purification.
  - Tayammum is a substitute for water, out of ease and mercy.
  - The concession is a blessing that calls for thanks by obeying Him in what He commands and forbids.
- Imprecisions and omissions, none of them additions:
  - "عند القيام إلى الصلاة" leans toward the verse's wording and loses the tafsir's "إذا أردتم القيام" (intending to stand).
  - The qualifier "في حال الصحة" on travel is dropped.
  - The source's definitions of المرفق and الكعبين are dropped.
  - "الجماع" replaces "جامع زوجته".
  - "الوضوء" names the act, and "بالماء" with ghusl is implicit. Neither adds information.
  - None of these changes a ruling.
- Verse-translation: no. The text is third person, uses ruling language ("يجب", "يشرع") and does not voice the commands.
- Style: 4 sentences, 94 words, which is long.

### 10. quran:5:6 en: FAIL
- **Faithful: no.**
  - "If a person is in a state of major impurity **(such as after marital relations)**" adds an example that defines what causes major impurity. The source says only الحدث الأكبر, so this is an added definition.
  - "Hands up to the elbows ... feet up to the ankles" uses the verse's "to" (إلى) instead of the tafsir's deliberate "مع" (including the elbows and ankles). This drops a qualifier of the ruling, where the Arabic counterpart kept it.
  - Also omitted: "في حال الصحة" and the anatomical definitions. These are omissions only.
- Kept correctly:
  - The intention to pray, when not in a state of purity.
  - Ghusl before praying.
  - The four cases plus no water.
  - Tayammum by striking the earth and wiping the face and hands.
  - No hardship intended, ease and mercy, tayammum as a substitute, and gratitude through obedience.
- Verse-translation: no. The text says "It tells believers that...", in third person.
- Terms are fine: salah, ghusl, tayammum, each glossed.
- Style: 5 sentences, 147 words, which is long.

### 11. quran:94:5 ar: FAIL
- **Faithful: no.**
  - Sentence 3, "وتكرر المعنى لتثبيت القلب وطمأنته بأن الفرج قريب لا محالة", adds a purpose for the repetition and the claim that relief is **near** (قريب). Neither is in the source.
  - Sentence 4, "فالمقصود هو التحلي بالصبر والثبات في وجه الأذى", adds a concluding lesson about patience and steadfastness.
- Sentences 1 and 2 are faithful: the enemies' harm should not deter the Prophet ﷺ from spreading the message, and with hardship comes relief.
- Verse-translation: no. "وتؤكد أن مع الشدة والضيق يأتي الفرج" is reported, not voiced as the verse.

### 12. quran:94:5 en: FAIL (borderline)
- **Faithful: no.**
  - "Repeating this truth twice **to stress its certainty**" adds a purpose for the repetition.
  - "The text affirms that ease is **guaranteed** alongside difficulty, **offering comfort and encouragement in the face of opposition**" upgrades the source's plain statement to a guarantee and closes with the model's own characterization of the verse's effect.
  - The source contains only two things: "do not let the enemies' harm deter you from spreading the message", and "with hardship is relief", said twice.
  - This is milder than the Arabic version, which has an explicit patience moral. However, the whole closing sentence and the stated purpose of the repetition are interpretation that is not in the source, so it fails under the "added purpose / concluding lesson" convention.
- Sentence 1 is faithful.
- Verse-translation: no. "It emphasizes that with hardship comes relief" is reported speech using the tafsir's "relief" (فرج). It is not stated as the verse.

### 13. aqeedah:usul:005 ar: FAIL
- **Language: problem.** The Arabic slot contains an **English** text ("This text explains the second principle..."). Users of the Arabic UI would get English.
- **Terms: problem.** Because the text is in English, no Islamic term is in its Arabic form. The English is also loose: "God" for Allah; "faith" and "excellence" with no iman or ihsan; "charity" for zakah, which is obligatory alms; and "testimony of faith" for the shahada.
- Faithful: yes. The content adds nothing:
  - The second principle is knowing Islam with its evidence.
  - Islam is defined as submission with tawhid, obedience and freedom from shirk, as in the source.
  - The three levels.
  - The five pillars.
  - The meaning of the shahada, by negation and affirmation.
  - The four elements of the testimony that Muhammad ﷺ is the Messenger.
  - Omitted: "كل مرتبة لها أركان", "لا شريك له في عبادته كما أنه ليس له شريك في ملكه", and the evidence verses.
- Verse-translation: no.

### 14. aqeedah:usul:005 en: PASS
- **Faithful: yes.** All the definitions are kept:
  - Islam is submission to Allah with tawhid, obedience to Him, and freedom from shirk.
  - It has three levels, each with pillars.
  - The five pillars are listed in full, including both halves of the shahada and "the Sacred House of Allah".
  - The shahada means no deity is worthy of worship except Allah alone.
  - The testimony that Muhammad ﷺ is the Messenger requires obeying him, believing him, avoiding what he forbade, and worshipping Allah only as legislated.
- **Verse-translation: no (borderline).** The last sentence condenses al-Bayyinah 98:5 into "the command to worship Allah sincerely, establish salah, and give zakah is the upright religion". It is a third-person description of a verse that the creed text quotes, not a voiced rendering. Its wording is close to the verse, though.
- "Cites verses as evidence for the pillars" slightly generalizes. The source cites verses for the two testimonies and for salah, zakah and the tafsir of tawhid. This is acceptable.
- Terms: ok. Tawhid, shirk, iman, ihsan, shahadah, salah, zakah and hajj are all glossed. "Zakah (charity)" is a loose gloss but acceptable.
- Style: 5 sentences, but 178 words, so the sentences are not "short".

### 15. aqeedah:usul:007 ar: PASS
- **Faithful: yes.**
  - Iman is the second level.
  - Its branches.
  - The highest is قول لا إله إلا الله, the lowest is removing harm from the road, and modesty is a branch.
  - Its six pillars, including القدر خيره وشره.
  - The al-Baqarah verse is evidence for the six pillars, and the al-Qamar verse is evidence for qadar.
- "أكثر من سبعين" for "بضع وسبعون" slightly loosens the number. It is the standard rendering and is not counted.
- The branches-of-faith and six-pillars wording comes from the creed text itself, so it is not counted as hadith quotation.
- Verse-translation: no. The verses are referred to only by surah.

### 16. aqeedah:usul:007 en: PASS
- **Faithful: yes.** The content is the same as #15:
  - Iman has over seventy branches.
  - The highest is "the statement of tawhid", which relabels قول لا إله إلا الله by its well-known name without changing the meaning. The lowest is removing harm from the path, and modesty is a branch.
  - The six pillars, including al-qadar, good and evil.
  - The evidence from al-Baqarah and al-Qamar.
- Verse-translation: no. "Which mentions belief in Allah, the Last Day, the angels, the Book, and the prophets" and "which says that everything was created by decree" describe the quoted verses in third person. They accurately list only what the quoted fragment of 2:177 contains. The 54:49 description is close to the verse's meaning, but it is descriptive, not voiced.
- Terms: ok. iman, tawhid and al-qadar are each glossed.

## Cross-language observations

- **Added concluding lessons are the main failure mode.** They appear in 2:183 (ar and en), 94:5 (ar and en) and 112:1 (en). Each closes with a "so this shows..." or "the point is..." sentence that the tafsir does not contain.
- **Added definitions:** worship as "obedience, not mere words or feelings" in 51:56 ar, and major impurity "such as after marital relations" in 5:6 en.
- **Qualifier drift in 5:6 en:** "up to the elbows/ankles" reverts to the verse's wording and loses the Muyassar's "مع" (including). The Arabic counterpart kept it.
- **Wrong language:** `aqeedah:usul:005 ar` was generated in English. A language check on output would catch this.
- **Nothing breached the core definitions:** no text equated the Kursi with the Throne, changed who is addressed, or voiced a verse's commands.

## FAIL list

1. (quran:51:56, ar)
2. (quran:2:183, ar)
3. (quran:94:5, ar)
4. (aqeedah:usul:005, ar)
5. (quran:112:1, en)
6. (quran:2:183, en)
7. (quran:5:6, en)
8. (quran:94:5, en)
