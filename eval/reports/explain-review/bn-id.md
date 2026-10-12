# Explanation faithfulness review: Bengali (bn) and Indonesian (id)

Input: `scratchpad/explain/bn-id.jsonl` (16 lines: 8 ids x 2 languages; not modified).
Generator under review: DeepSeek V4 Flash. Reviewer: independent judge.
Sources: Quran ids use al-Tafsir al-Muyassar (`source_ar`). Aqeedah ids use passages of al-Usul al-Thalatha.

Each text was checked against these rules:
1. **FAITHFUL**: yes / minor-addition / no, judged against `source_ar` only.
2. **VERSE/HADITH**: does the text render the verse's clauses in sequence, or quote a hadith? The comparison is with `ayah_ar` / `ayah_en`, plus the standard Indonesian (Kemenag) and Bengali (Muhiuddin Khan) translations as far as I know them; I did not fetch those translations to check.
3. **TERMS**: are Islamic terms correct, and in the forms Bengali or Indonesian Muslims actually use?
4. **LANGUAGE**: is the text correct and natural?

PASS requires all four: faithful (yes or minor-addition), no verse translation, terms ok, and language ok or minor.

## Summary

| Lang | Lines | Null / failed generations | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| bn | 8 | 0 | 8 | 3 | 5 | 37.5% |
| id | 8 | 0 | 8 | 2 | 6 | 25.0% |
| **Total** | 16 | 0 | 16 | 5 | 11 | 31.3% |

Why the 11 items failed:
- **Verse rendered clause by clause (7 items):** 2:255 bn/id, 2:183 bn, 5:6 bn/id, 94:5 bn/id.
- **Content added beyond the source (4 items):** 51:56 id, 2:183 id, aqeedah:usul:005 id, and 5:6 id. 5:6 id changes a fiqh meaning; it also renders the verse.
- **Script or term defect (1 item):** aqeedah:usul:005 bn. 2:255 bn also has a creed-level term error, on top of its verse-rendering problem.

## Per-item judgments

### quran:2:255 (Ayat al-Kursi)

**id: FAIL**
- FAITHFUL: yes. Everything stated is in the Muyassar. It leaves out two points: "no one grasps His knowledge except what He teaches" and "guarding them does not burden Him". Leaving things out is allowed.
- VERSE: **yes**. It renders about 8 of the verse's 10 clauses in the verse's own order. Several are almost word for word the standard Indonesian translation: "tidak merasa kantuk atau tidur", "seluruh isi langit serta bumi adalah milik-Nya", "Tidak ada yang berani memberi syafaat di sisi-Nya tanpa izin-Nya", "Kursi Allah meliputi langit dan bumi", "Dia Maha Tinggi serta Maha Besar".
- TERMS: ok (syafaat, Ayat Kursi).
- LANGUAGE: minor. The last sentence runs on ("…Maha Besar, dan ayat ini disebut…"). KBBI spells "Mahatinggi/Mahabesar" as one word.
- Reason: a recognisable clause-by-clause rendering of Ayat al-Kursi. The Muyassar itself follows the verse clause by clause, so the model carried that structure over.

**bn: FAIL**
- FAITHFUL: **no**. It glosses কুরসি as "(সিংহাসন)", which means throne. The source defines al-Kursi as "موضع قدمي الرب", the place of the Lord's feet (footstool), and says only Allah knows how it is. Calling it "throne" contradicts that definition and merges Kursi with 'Arsh, a distinction this creed keeps.
- VERSE: **yes**. It is even closer to the verse than the id text. It includes "সেগুলো রক্ষা করা তাঁর জন্য কঠিন নয়; তিনি সর্বোচ্চ ও মহান", which practically matches the standard Bengali translation, and it covers almost every clause in order.
- TERMS: **problem**. The কুরসি = সিংহাসন gloss (above). The other terms are fine: ইবাদত, শাফা‘আত, আয়াতুল কুরসি.
- LANGUAGE: ok.
- Reason: renders Ayat al-Kursi clause by clause, and glosses Kursi as "throne", against the source's own definition.

### quran:112:1

**id: PASS (minor-addition)**
- FAITHFUL: minor-addition.
  - The closing sentence "Ini adalah penegasan tauhid yang murni bagi setiap muslim" is not in the source. It is a harmless label.
  - "kepada manusia" and "yang sempurna" are small glosses.
- VERSE: no. It follows the tafsir, which also opens with "Say, O Messenger".
- TERMS: ok. The rububiyyah/uluhiyyah glosses are acceptable. The usual Indonesian spelling is rububiyah/uluhiyah, a trivial difference.
- LANGUAGE: ok.
- Minor-addition reason: adds a closing sentence calling this "pure tawhid for every Muslim", which is not in the source.

**bn: PASS (minor-addition)**
- FAITHFUL: minor-addition. It adds "সুন্দর" (beautiful) to "names", an echo of al-asma' al-husna. The source says only "names and attributes".
- VERSE: no.
- TERMS: ok: ইলাহ (উপাস্য), রব (প্রতিপালক).
- LANGUAGE: ok.
- Note: only 2 sentences plus the vocative, below the 3-sentence minimum, but the source is a single line.
- Minor-addition reason: the "beautiful" qualifier on the names is not in the source.

### quran:51:56

**id: FAIL**
- FAITHFUL: **no**. The source says only: jinn and mankind were created, and all messengers sent, for one lofty aim, which is to worship Allah alone. The text adds three things:
  - (a) A whole sentence defining ibadah as "segala bentuk ketaatan, seperti salat, zakah, dan tawhid". This is a definition plus examples not in the source, and it oddly lists tawhid as an example of "obedience".
  - (b) "mengenal" (to *know* Him), an interpretation the source does not give.
  - (c) "seluruh makhluk" (all creatures), which widens the source's "jinn and mankind" to all creation.
- VERSE: no.
- TERMS: **problem**. "zakah" and "tawhid" are English/Arabic romanisations. Indonesian Muslims write **zakat** and **tauhid**.
- LANGUAGE: ok.
- Reason: adds a definition of ibadah with examples and "to know Him", widens the scope to all creation, and uses non-Indonesian forms of zakat and tauhid.

**bn: PASS (minor-addition)**
- FAITHFUL: minor-addition.
  - The parenthetical "(একত্ববাদ বা তাওহিদ)" and "রাসূলদের দাওয়াতের কেন্দ্রবিন্দু" are restatements beyond the source's wording.
  - They follow from "worship Me alone" and "messengers sent for this aim", and change nothing.
- VERSE: no.
- TERMS: ok (জ্বিন, ইবাদত, তাওহিদ, দাওয়াত).
- LANGUAGE: ok.
- Minor-addition reason: the tawhid gloss and the "centre of the messengers' call" framing are small interpretive restatements.

### quran:2:183

**id: FAIL**
- FAITHFUL: **no**.
  - The third sentence, "Puasa bukan hanya menahan makan dan minum, tetapi juga melatih jiwa…", is wholly added content: a definition of fasting plus a spiritual-training claim, neither in the source.
  - Smaller point: the taqwa gloss swaps the source's "by obeying and worshipping Him alone" for "obedience and avoiding His prohibitions".
- VERSE: no. The verse is recast in the third person ("Ayat ini ditujukan kepada…") with tafsir glosses. That is borderline, but acceptable for a one-clause verse.
- TERMS: **problem (minor)**. "puasa (sawm)": Indonesian would use shaum/saum or shiyam, not the English-style "sawm".
- LANGUAGE: ok.
- Reason: adds a full sentence about what fasting is and that it "trains the soul", which is not in the source.

**bn: FAIL**
- FAITHFUL: yes. It is essentially the tafsir translated.
- VERSE: **yes**. It opens with the verse's own vocative "হে ঈমানদারগণ!" and keeps the verse's second-person clauses in order: fasting prescribed upon you, as it was upon those before you, so that you attain taqwa. This reads like a verse translation and is very close to the standard Bengali rendering.
- TERMS: ok (সিয়াম (রোজা), ফরজ, উম্মত, তাকওয়া, গুনাহ).
- LANGUAGE: minor. The apposition after "হে ঈমানদারগণ!" is clunky. Only 2 sentences.
- Reason: keeps the verse's direct address and renders its clauses in sequence, so it reads as a translation of the verse.

### quran:5:6

**id: FAIL**
- FAITHFUL: **no**.
  - (a) "bersentuhan dengan istri" means touching one's wife. The source explicitly says "جامع زوجته", intercourse with one's wife. The text has gone back to the verse's literal wording, against the source's interpretation, on a point where the fiqh schools disagree. In Shafi'i-majority Indonesia this reads as "touching your wife" being a cause that requires purification.
  - (b) "jika kalian sakit, dalam perjalanan, atau tidak menemukan air setelah buang air…" lists three alternatives. That reading lets illness or travel alone permit tayammum. The source makes "not finding water" the condition for the whole list.
  - (c) Minor: "hingga siku/mata kaki" is looser than the source's explicit "including the elbows/ankles".
- VERSE: **yes**. After the opening sentence it switches to the verse's second-person imperatives, in verse order. "Jika kalian dalam keadaan junub, maka mandilah" and "Allah tidak ingin menyulitkan kalian" practically match the standard Indonesian translation.
- TERMS: ok (salat, junub, tayamum).
- LANGUAGE: ok.
- Reason: turns the source's "intercourse" into "touching the wife", lets travel or illness alone permit tayammum, and renders the verse's imperatives clause by clause.

**bn: FAIL**
- FAITHFUL: yes, with minor points.
  - "কনুই পর্যন্ত" (up to the elbows) vs the source's "including the elbows". The ankles are correctly "গোড়ালিসহ".
  - "পবিত্র মাটি" comes from the verse, not the source.
  - "স্ত্রীর সাথে সহবাস" and the "no water" condition are both correct.
- VERSE: **yes**. It opens with "হে ঈমানদারগণ" and follows the verse clause by clause in imperatives (wash… wipe… wash… perform tayammum…). It is very close to the standard Bengali translation.
- TERMS: ok (নামাজ, মাসেহ, জানাবাত, গোসল, তায়াম্মুম, রহমত).
- LANGUAGE: minor. It uses non-honorific "তার" for Allah ("তার অনুগ্রহের", "তার আদেশ-নিষেধ"); it should be "তাঁর".
- Reason: keeps the verse's vocative and imperatives and renders it clause by clause, so it reads as a translation of the verse.

### quran:94:5

**id: FAIL**
- FAITHFUL: minor-addition. The parenthetical "(janji Allah untuk memberi kelapangan *setelah* kesusahan)" adds a "promise" framing, and "after" shifts the source's "*with* hardship".
- VERSE: **yes**. "Sesungguhnya bersama kesulitan ada kemudahan, dan bersama kesulitan ada kemudahan" is practically the standard Indonesian translation of 94:5–6. The tafsir deliberately used synonyms (ضيق/فرج), and the model turned them back into the familiar verse wording.
- TERMS: ok (risalah).
- LANGUAGE: ok. Only 2 sentences.
- Reason: reproduces the standard translation of 94:5–6 almost word for word.

**bn: FAIL**
- FAITHFUL: yes. "বিরত করবে না" works as a prohibitive in Bengali.
- VERSE: **yes**. "কারণ কষ্টের সাথে স্বস্তি রয়েছে, নিশ্চয়ই কষ্টের সাথে স্বস্তি রয়েছে" matches the standard Bengali translation of 94:5–6.
- TERMS: ok.
- LANGUAGE: minor. "শত্রুদের কষ্ট দেওয়া" is awkward; "শত্রুদের দেওয়া কষ্ট" is better. Only 2 sentences.
- Reason: reproduces the standard Bengali translation of 94:5–6.

### aqeedah:usul:005 (second principle; pillars of Islam; meaning of the shahadatayn)

**id: FAIL**
- FAITHFUL: **no**. Hajj is given "bagi yang mampu" (for those able). That condition is not in this passage; it is an added ruling, the category the rules explicitly forbid. It is correct and well known, but it is not in the source. Everything else is faithful, including the meaning of both shahadas.
- HADITH/VERSE: no. None of the cited verses is quoted or rendered.
- TERMS: **problem**.
  - "membayar zakah": Indonesian uses **zakat**.
  - "haji (ziarah ke Baitullah)": in Indonesian Islamic usage "ziarah" usually means visiting graves or sacred sites, so it is a poor gloss for hajj.
- LANGUAGE: ok. "patuh kepada-Nya dalam ketaatan" is redundant.
- Reason: adds the ruling "bagi yang mampu" to hajj, which is not in the source, and uses "zakah" instead of Indonesian "zakat".

**bn: FAIL**
- FAITHFUL: yes. The content matches the source closely, and nothing is added beyond glosses.
- HADITH/VERSE: no.
- TERMS: **problem**.
  - "ইসলাম, ঈমান এবং **ihsan**": the key term ihsan is left in Latin script inside Bengali text, without a gloss. It should be ইহসান.
  - Secondary: "হজ (পবিত্র ঘরের তীর্থযাত্রা)" uses তীর্থযাত্রা, which has Hindu connotations; Bengali Islamic writing generally avoids it for hajj.
  - "কালিমা শাহাদাহ" is usually "কালেমা শাহাদাত" in Bengali usage.
- LANGUAGE: minor. "ইসলামের দ্বীন" and the word order in "আত্মসমর্পণ করা তাওহিদের মাধ্যমে" are awkward.
- Reason: Latin-script "ihsan" left untransliterated and unglossed in the Bengali text, a visible generation defect; "তীর্থযাত্রা" for hajj is a secondary issue.

### aqeedah:usul:007 (iman; its branches and six pillars)

**id: PASS**
- FAITHFUL: yes. The branches, the highest and lowest branch, haya', the six pillars, and the proofs are all from the source.
- HADITH/VERSE: no, with one caveat (see the note on usul:007 below). The verses are only referred to, not rendered: "ayat tentang penciptaan segala sesuatu dengan ketetapan" is a one-phrase description.
- TERMS: ok (la ilaha illallah, malaikat, hari akhir, takdir).
- LANGUAGE: ok. The first sentence is long.

**bn: PASS**
- FAITHFUL: yes. It cites al-Baqarah 177 and al-Qamar 49, as the source does.
- HADITH/VERSE: no, with the same caveat.
- TERMS: ok (হায়া, রুকন, ফেরেশতা, কিতাব, আখিরাত, তাকদির).
- LANGUAGE: minor. "ইমান (ঈমান)" spells the same word two ways. Pick one; ঈমান is the common form in Islamic Bengali, and usul:005 bn uses it.

## Systemic observations (for the prompt owner)

1. **The tafsir carries the verse's structure into the explanation.**
   - For 2:255, 2:183, 5:6 and 94:5, al-Muyassar is itself a close, clause-by-clause paraphrase of the verse. The model translates the tafsir, and the result is the familiar translation of the verse, often with "O believers" and the verse's imperatives.
   - Regenerating with the same prompt will probably reproduce this.
   - Suggested prompt rule: "Write in the third person ('This verse teaches…'). Never address the reader as 'O you who believe' or repeat the verse's commands as imperatives. Summarise the teaching thematically, not in the verse's clause order."
2. **Indonesian adds more content than Bengali.** All three content-addition FAILs are id: 51:56, 2:183, usul:005. They are sermon-style extensions: what ibadah includes, what fasting really is, and hajj "for those able".
3. **Indonesian transliteration forms.** The model drifts to English/Arabic romanisation (zakah, tawhid, sawm). The prompt could state the expected Indonesian forms: zakat, tauhid, shalat/salat, shaum/puasa.
4. **Bengali defects:** a Latin-script leak (ihsan), non-honorific তার for Allah, and তীর্থযাত্রা for hajj.
5. **Note on usul:007.** The creed text itself contains, unattributed, the wording of the branches-of-faith hadith (Muslim) and the six pillars from the Jibril hadith. Both explanations render that wording closely. I did not count this as "quoting a hadith", because:
   - neither text presents it as a hadith;
   - it is the approved source's own statement;
   - it cannot be explained without stating those points.

   If the policy is meant to cover hadith wording embedded in creed texts, these two would also fail.
6. **Length.** Four items are under 3 sentences: 112:1 bn, 2:183 bn, 94:5 bn and 94:5 id. Several others (5:6 id, both usul:005) have long sentences rather than "short" ones. This was not used as a fail criterion.

## FAIL list (for cache deletion)

(quran:2:255, bn), (quran:2:183, bn), (quran:5:6, bn), (quran:94:5, bn), (aqeedah:usul:005, bn), (quran:2:255, id), (quran:51:56, id), (quran:2:183, id), (quran:5:6, id), (quran:94:5, id), (aqeedah:usul:005, id)
