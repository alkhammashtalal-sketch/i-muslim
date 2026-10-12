# Faithfulness review: DeepSeek V4 Flash explanations (ar + en)

Input: `scratchpad/explain/ar-en.jsonl` (16 lines: 6 Quran ids x 2 langs, 2 aqeedah ids x 2 langs). The input file was not modified.
Reviewer: an independent model. I read every `text` in full against `source_ar` (al-Tafsir al-Muyassar for Quran, al-Usul al-Thalatha for aqeedah), and for Quran ids also against `ayah_ar` / `ayah_en`.

## Criteria used

- **FAITHFUL**: `yes` / `minor-addition` (a small, harmless gloss or generic framing that does not change meaning) / `no` (says something not supported by the source, contradicts it, changes a ruling or a religious meaning, or adds substantive content such as a definition, ruling or lesson).
- **VERSE-TRANSLATION**: `yes` means the text reads as a rendering of the verse or hadith itself rather than an explanation of it. That covers keeping the verse's own voice (vocative, second person, imperative) together with its clause sequence, matching a standard translation's wording across clauses, or giving a clause-by-clause rendering of a hadith. Following the verse's topic order is not a violation by itself when the text is written as an explanation ("this verse tells us that ...") and uses the tafsir's glosses, because the Muyassar tafsir itself goes clause by clause. In Arabic, repeating the approved tafsir's wording is not counted as a verse paraphrase. Reverting to the Quranic wording beyond short phrases would count.
- **TERMS / LANGUAGE**: `ok` / `minor` / `problem`.
- **Verdict**: PASS if FAITHFUL is yes or minor-addition, VERSE-TRANSLATION is no, and terms and language are ok or minor. Otherwise FAIL.
- The "3-5 short sentences" length rule is recorded under **Style** but does not affect the verdict, since it is not one of the four judged criteria.

## Summary

| Lang | Lines | Null / failed generation | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| ar | 8 | 1 (`aqeedah:usul:007`, error `unavailable`) | 7 | 6 | 1 | 85.7% |
| en | 8 | 0 | 8 | 4 | 4 | 50.0% |
| **All** | 16 | 1 | 15 | 10 | 5 | 66.7% |

## Verdict table

| # | id | lang | Faithful | Verse/hadith translation | Terms | Language | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | quran:2:255 | ar | minor-addition | no (borderline) | ok | ok | PASS |
| 2 | quran:2:255 | en | minor-addition | no (borderline) | ok | ok | PASS |
| 3 | quran:112:1 | ar | minor-addition | no | ok | ok | PASS |
| 4 | quran:112:1 | en | minor-addition | no | ok | ok | PASS |
| 5 | quran:51:56 | ar | **no** | no | ok | ok | **FAIL** |
| 6 | quran:51:56 | en | minor-addition | no | ok | ok | PASS |
| 7 | quran:2:183 | ar | yes | no | ok | ok | PASS |
| 8 | quran:2:183 | en | minor-addition | **yes** | ok | ok | **FAIL** |
| 9 | quran:5:6 | ar | minor-addition | no (borderline) | ok | minor | PASS |
| 10 | quran:5:6 | en | **no** | no (borderline) | minor | ok | **FAIL** |
| 11 | quran:94:5 | ar | minor-addition | no | ok | ok | PASS |
| 12 | quran:94:5 | en | yes | **yes** | ok | ok | **FAIL** |
| 13 | aqeedah:usul:005 | ar | yes | no | ok | ok | PASS |
| 14 | aqeedah:usul:005 | en | yes | no | ok (minor gloss) | ok | PASS |
| 15 | aqeedah:usul:007 | ar | n/a (text null) | n/a | n/a | n/a | NULL |
| 16 | aqeedah:usul:007 | en | yes | **yes (hadith)** | ok | ok | **FAIL** |

## Per-item notes

### 1. quran:2:255 ar: PASS (minor-addition)
- **Faithful: minor-addition.**
  - "لا يشبهه أحد في صفاته" is not in the source. At most it spells out the source's "كما يليق بجلاله" and "الجامع لجميع صفات العظمة". It is consistent with the source and does not change meaning, but it is an inserted creedal statement.
  - "الحي الذي لا يموت" glosses the source's "له جميع معاني الحياة الكاملة". It is harmless.
  - The text leaves out the source's definition of the Kursi ("موضع قدمي الرب"). Leaving things out is acceptable. "وهو عظيم لا نعرف كيفيته" agrees with "لا يعلم كيفيته إلا الله".
- **Verse: no (borderline).** It covers the verse's clauses in order because the tafsir does. However, it is framed as explanation ("هذه الآية تخبرنا أن ...") and uses the tafsir's glosses (المستحق للعبادة، القائم على كل شيء، نعاس، الماضي والحاضر والمستقبل، لا يثقله، العلي بذاته وصفاته). The only verbatim stretch is "كرسيه وسع السماوات والأرض", which also appears verbatim in the source.
- **Terms / Language:** ok. **Style:** 5 long sentences.

### 2. quran:2:255 en: PASS (minor-addition)
- **Faithful: minor-addition.**
  - "He never gets sleepy or tired": the source denies drowsiness (سِنة/نعاس) and sleep. "Tired" replaces "sleep". Not tiring is true and appears later in the verse (لا يثقله حفظهما), but the explicit denial of sleep is lost. This is a small inaccuracy.
  - "His Kursi (a great creation, like a footstool)": the source defines the Kursi as "the place of the Lord's two feet, whose modality only Allah knows". "A great creation" is not in the source. "Footstool" is the usual English rendering of that definition. Neither changes the meaning.
- **Verse: no (borderline).** The text is written as "This verse tells us ...". Some clauses come close to the Sahih International wording ("everything in the heavens and earth belongs to Him", "No one can intercede with Him without His permission", "His Kursi ... covers the heavens and earth"), but the text uses the tafsir's glosses (past/present/future, "only what He teaches us", "greatest verse") and does not read as a translation.
- **Terms:** ok (Kursi glossed, Ayat al-Kursi). **Language:** ok.

### 3. quran:112:1 ar: PASS (minor-addition)
- **Faithful: minor-addition.** "للناس" and "الحسنى" are small glosses. "المتفرد بصفات الربوبية والأسماء الحسنى" slightly compresses the source's three categories, "الربوبية والأسماء والصفات", but is not wrong.
- **Verse: no.** The content is the tafsir's gloss. It does not reuse "هو الله أحد". It keeps the tafsir's "قل -أيها الرسول-" imperative framing.
- **Terms / Language:** ok. **Style:** a single sentence (the rule asks for 3-5) and written as an address to the Prophet rather than as an explanation for a newcomer.

### 4. quran:112:1 en: PASS (minor-addition)
- **Faithful: minor-addition.** The last sentence, "This verse teaches the core of tawhid ..., which is the foundation of Islamic belief", is generic framing that is not in the source. "Over all creation" and "perfect" are small glosses. The main content matches the source: unique in divinity, lordship, names and attributes, and none shares in them.
- **Verse: no.** **Terms:** ok (tawhid glossed). **Language:** ok.

### 5. quran:51:56 ar: FAIL
- **Faithful: no.** The source says only that jinn and humans were created, and all messengers sent, for a lofty aim: worshipping Allah alone. The text adds two sentences that define the worship ('ibadah) meant here: "العبادة هنا تعني الطاعة الكاملة والانقياد لأمره. لا يُقصد بها مجرد الصلاة أو الصيام، بل كل عمل يرضي الله". That is an interpretation of the verse's key word which the source does not contain. The text also adds the framing "هذا هو السبب الأساسي لوجودنا". Half the text is content from outside the source.
- **Verse: no.** **Terms / Language:** ok.
- **FAIL reason:** it adds a definition and scope of 'ibadah (complete obedience and submission, every deed pleasing to Allah, not only prayer or fasting) that is not in the tafsir.

### 6. quran:51:56 en: PASS (minor-addition)
- **Faithful: minor-addition.** Sentence 1 matches the source (jinn and humans, all messengers, a noble purpose, worship of Him alone without partner). Sentence 2 explains the source's "alone, none besides Me" and adds the examples "prayer and supplication". Sentence 3, "core of tawhid ... foundation of the faith", is generic framing. No new doctrine.
- **Verse: no.** The text is in the third person and includes the tafsir's additions. **Terms:** ok (tawhid glossed; "jinn" left unglossed is acceptable). **Language:** ok.

### 7. quran:2:183 ar: PASS
- **Faithful: yes.** It closely follows the tafsir: believers who accepted Allah and His Messenger and acted on His law, fasting made obligatory as on earlier nations, and taqwa explained as a shield from sins through obedience and worship of Him alone.
- **Verse: no.** The text reports the verse ("هذه الآية تخاطب المؤمنين ... وتخبرهم أن ...") using the tafsir's wording (فرض، الأمم السابقة).
- **Terms / Language:** ok. **Style:** one long sentence (the rule asks for 3-5).

### 8. quran:2:183 en: FAIL
- **Faithful: minor-addition.** "Fasting is a means to develop self-restraint" adds "self-restraint", which is not in the source. The rest is faithful.
- **Verse: YES.** Sentence 1 keeps the verse's vocative, second-person voice and its full clause sequence: "O you who have believed ..., Allah has made fasting obligatory upon you, just as He made it obligatory upon the nations before you, so that you may attain piety (taqwa)." The opening matches Sahih International word for word ("O you who have believed"), and the rest closely renders "decreed upon you is fasting as it was decreed upon those before you that you may become righteous". It reads as an English translation of the verse, expanded with the tafsir's glosses.
- **Terms:** ok (taqwa glossed). **Language:** ok.
- **FAIL reason:** the first sentence is a near-verbatim English rendering of the verse in its own vocative voice.

### 9. quran:5:6 ar: PASS (minor-addition)
- **Faithful: minor-addition.**
  - "التيمم بالتراب الطاهر" narrows the source's "فاضربوا بأيديكم وجه الأرض" (the surface of the earth) to soil or dust, and "الطاهر" comes from the verse's "طيبا". This is a small, fiqh-adjacent specification. The text also says "يضربوا بأيديهم على الأرض", which keeps the source's sense.
  - "الذين آمنوا بالله ورسوله" is a small gloss.
  - "أيديهم إلى المرفقين ... أرجلهم إلى الكعبين" goes back to the verse's "إلى" and drops the source's explicit "مع المرافق / مع الكعبين", which states that the elbows and ankles are included. Nothing new is added, but the tafsir's clarification is lost.
  - The conditions for tayammum are preserved correctly: "ولم يجدوا ماء" governs the whole list, as in the source.
- **Verse: no (borderline).** The wudu sentence necessarily uses the verse's vocabulary, as the tafsir does, but the text is framed as teaching ("تعلمهم كيفية الاستعداد للصلاة") and adds the tafsir's points (a concession, a substitute for water, thanks through obedience).
- **Terms:** ok. **Language: minor.** The pronouns shift from third person (عليهم، يغسلوا، كانوا) to second person in "وعدم التضييق عليكم".
- **Style:** 5 long sentences.

### 10. quran:5:6 en: FAIL
- **Faithful: no.** "If you are ill, traveling, or cannot find water, you may use clean earth (tayammum)" makes travel (and illness) a stand-alone ground for tayammum. The source makes these cases depend on not finding water: "أو على سفر في حال الصحة ... فلم تجدوا ماء". As written, it tells a traveller who has water that tayammum is permitted, which changes a ruling. It also drops the two hadath cases (relieving oneself, intercourse) that the source lists.
  - Smaller issues: "hands up to the elbows" and "feet up to the ankles" lose the source's "مع" (inclusion). "A state of cleanliness" for طهارة should be ritual purity.
- **Verse: no (borderline).** The wudu sentence is close to the Sahih wording but is framed as instruction after "This verse teaches Muslims how ...".
- **Terms:** minor ("cleanliness"; salah and tayammum are glossed). **Language:** ok.
- **FAIL reason:** it changes the tayammum ruling by making illness or travel sufficient on their own, while the source requires that no water be found.

### 11. quran:94:5 ar: PASS (minor-addition)
- **Faithful: minor-addition.** "فالصبر على الأذى يؤدي إلى الفرج" makes explicit a lesson (patience leads to relief) that is inferred from the source's "فلا يثنك أذى أعدائك ... فإن مع الضيق فرجًا". It is consistent with the source's causal "فإن", but the word "الصبر" is not in the source. "ومع الضيق سعة" renders the source's repetition with a synonym.
- **Verse: no.** It uses synonyms (الشدة/فرج، الضيق/سعة) rather than "العسر/يسرا".
- **Terms / Language:** ok. **Style:** a single sentence.

### 12. quran:94:5 en: FAIL
- **Faithful: yes.** The text is a literal translation of the tafsir sentence.
- **Verse: YES.** "For with hardship comes relief, and indeed with hardship comes relief" is a direct English rendering of 94:5-6 (Sahih: "with hardship [will be] ease"), including the verse pair's repetition. The whole output is one translated sentence with no explanation.
- **Terms / Language:** ok. **Style:** a single sentence.
- **FAIL reason:** the output is a translation of the verse (and of 94:6), not an explanation of it.

### 13. aqeedah:usul:005 ar: PASS
- **Faithful: yes.** It covers the second principle and its definition (submission through tawhid, obedience, freedom from shirk), the three levels, the five pillars, the negation and affirmation in "لا إله إلا الله", and the four elements of the testimony that Muhammad is the Messenger of Allah. "من الأصول الثلاثة" and "الشرعية" are trivial framing. "الابتعاد عن الشرك" for "الخلوص من الشرك" is acceptable.
- **Verse: no.** None of the proof verses is reproduced or paraphrased. Listing the five pillars is standard creed content and is not counted as a hadith quotation.
- **Terms / Language:** ok. **Style:** 5 sentences.

### 14. aqeedah:usul:005 en: PASS
- **Faithful: yes.** All the content traces to the source. The shahadah is explained as "no one deserves worship except Allah alone", which matches the source's "لا معبود بحق إلا الله وحده". "Requires obeying him ..." for the source's "معنى ... طاعته ..." (means) is a small wording shift.
- **Verse: no.**
- **Terms:** ok. Tawhid, shirk, iman, ihsan, shahadah, salah, zakah and hajj are all glossed. "zakah (charity)" is a loose gloss; "obligatory alms" would be more precise. **Language:** ok.

### 15. aqeedah:usul:007 ar: NULL
- `text` is null with `error: "unavailable"`. This is a failed generation and was not judged.

### 16. aqeedah:usul:007 en: FAIL
- **Faithful: yes.** Everything traces to the source, including the 2:177 and 54:49 references.
- **Verse/hadith: YES.**
  - Sentence 1 is a clause-by-clause English rendering of the hadith on the branches of faith (Sahih Muslim 35): "over seventy branches, the highest ... la ilaha illa Allah, the lowest ... removing harm from the path, ... modesty (haya) also being a branch of faith". It translates the hadith's wording in its original order and does not explain it.
  - Sentence 3 also restates the whole of 54:49 ("everything is created by Allah's decree").
  - The list of six pillars echoes the hadith of Jibril, but as a standard creed list it is not counted on its own.
- **Terms:** ok (iman, haya, arkan and al-qadar glossed). **Language:** ok. **Style:** 3 very long sentences.
- **FAIL reason:** it quotes and translates the hadith of the 70-odd branches of iman nearly word for word.
- **Caveat:** this violation comes from the source. al-Usul al-Thalatha itself uses the hadith's wording without attribution, so any faithful explanation will come close to it. If the app owner exempts hadith wording embedded in the approved creed text, this item would be a PASS. Regenerating may produce the same pattern unless the prompt asks for the idea (iman has many branches, from the testimony of tawhid down to small good deeds) instead of the hadith's structure.

## Observations

- **English is weaker than Arabic** (50% against 86% PASS). Two of the four English failures (2:183 and 94:5) come from the model translating the tafsir sentence directly. Because al-Muyassar is written in the verse's own voice, this produces what amounts to an English Quran translation. A prompt instruction such as "write in the third person, e.g. 'This verse tells ...'; never use 'O you who believe' or the verse's direct address" would probably fix this class of failure.
- **Arabic additions are interpretive rather than factual errors.** 51:56 ar defines worship ('ibadah). The minor additions (2:255 "لا يشبهه أحد", 94:5 "الصبر") are consistent with the tafsir's creed but are not in the text.
- **The only ruling-level error** is 5:6 en (travel or illness alone permits tayammum). The Arabic version of the same verse keeps the condition correctly.
- **Borderline PASSes to watch:** 2:255 ar and en (clause-by-clause coverage, though written as explanation), and 5:6 ar ("التراب الطاهر" for "وجه الأرض"; "إلى" instead of "مع").
- **Length rule (3-5 sentences)** is not met by 112:1 ar, 2:183 ar, 94:5 ar and 94:5 en (one sentence each).

## FAIL list (to delete from the cache)

(quran:51:56, ar), (quran:2:183, en), (quran:5:6, en), (quran:94:5, en), (aqeedah:usul:007, en)

Null generation (also not cached or usable): (aqeedah:usul:007, ar)
