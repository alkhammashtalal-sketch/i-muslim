# Explanation faithfulness review: Malay (ms) and Turkish (tr)

Input: `scratchpad/explain/ms-tr.jsonl` (16 lines: 8 ids x 2 languages; not modified).
Generator under review: DeepSeek V4 Flash. Reviewer: independent judge.
Sources: Quran ids use al-Tafsir al-Muyassar (`source_ar`). Aqeedah ids use passages of al-Usul al-Thalatha.

Each text was checked against these rules:
1. **FAITHFUL**: yes / minor-addition / no, judged against `source_ar` only. Leaving things out is allowed; adding things is not.
2. **VERSE/HADITH**: does the text translate or closely paraphrase the verse, or quote a verse or hadith? The comparison is with `ayah_ar` / `ayah_en`, plus the standard Malay (Abdullah Basmeih, *Tafsir Pimpinan ar-Rahman*) and Turkish (Diyanet meali) translations as far as I know them. I did not fetch those translations to check.
3. **TERMS**: are Islamic terms correct, and in the forms Malaysian or Turkish Muslims actually use?
4. **LANGUAGE**: is the text correct and natural?

PASS requires all four: faithful (yes or minor-addition), no verse translation, terms ok, and language ok or minor.

**How I applied the verse test.** A faithful explanation of a one-clause verse has to state what the verse means, so covering the same points is not enough to fail. I counted a text as rendering the verse when it did any of these:
- (a) It keeps the verse's own speech form: "O you who believe", the command "Say", or Allah's "I/We".
- (b) It reproduces most of the verse's clauses in order, in wording close to a standard translation.
- (c) It quotes the verse.

A text that recasts the verse in the third person ("This verse explains…") and states the rulings or teaching in the tafsir's terms was not counted, even when it necessarily covers the same points.

## Summary

| Lang | Lines | Null / failed generations | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| ms | 8 | 0 | 8 | 4 | 4 | 50.0% |
| tr | 8 | 0 | 8 | 0 | 8 | 0.0% |
| **Total** | 16 | 0 | 16 | 4 | 12 | 25.0% |

Why the 12 items failed (the main reason for each):
- **Verse rendered or quoted (9 items):** 2:255 ms/tr, 112:1 ms/tr, 2:183 ms/tr, 94:5 ms/tr, and aqeedah:usul:007 tr, which quotes al-Qamar 54:49 in quotation marks.
- **Content added beyond the source (1 item):** 51:56 tr. 94:5 tr also adds content, on top of rendering the verse.
- **Term defect (1 item):** 5:6 tr.
- **Language or generation defect (1 item):** aqeedah:usul:005 tr. This is the most borderline FAIL: a one-word manual fix would make it pass.

## Per-item judgments

### quran:2:255 (Ayat al-Kursi)

**ms: FAIL**
- FAITHFUL: minor-addition. Every point is in the Muyassar, with two small shifts:
  - "…tidak merasa berat untuk memeliharanya **kerana** sifat-Nya yang Maha Tinggi dan Maha Agung" makes "not burdened" a *consequence* of "Most High, Most Great". The source does not draw that causal link.
  - "manusia" (humans) narrows the source's "الخلق" (all creation).
  - The text leaves out the source's definition of the Kursi, which is allowed.
- VERSE: **yes**. It walks through about 10 of the verse's clauses in the verse's order. Several are close to the standard Malay translation: "tanpa rasa mengantuk atau tidur", "Segala yang ada di langit dan di bumi adalah milik-Nya", "tiada sesiapa boleh memberi syafaat melainkan dengan izin-Nya", "Kursi-Nya meliputi langit dan bumi", "tidak merasa berat untuk memeliharanya", "Maha Tinggi dan Maha Agung".
- TERMS: ok.
  - syafaat, Kursi, Ayat al-Kursi are fine. Malaysians often just say "Ayat Kursi", a trivial difference.
  - "Maha Menjaga segala sesuatu" is acceptable for al-Qayyum (القائم على كل شيء).
- LANGUAGE: ok. The sentences are long (89 words in 4 sentences), and the last runs on after a semicolon.
- Reason: a recognisable clause-by-clause rendering of Ayat al-Kursi. The Muyassar itself follows the verse clause by clause, and the model carried that structure over.

**tr: FAIL**
- FAITHFUL: yes. "(c.c.)" is a normal Turkish honorific. "büyüklük sıfatlarının tümünü kendinde toplar" correctly renders "الجامع لجميع صفات العظمة". "geçmişi, şimdiyi ve geleceği" matches the source.
- VERSE: **yes**. It covers every clause in order. "O'nu ne uyuklama ne de uyku tutar" and "O'nun kürsüsü gökleri ve yeri kaplar ve bunları korumak O'na ağır gelmez" practically match the Diyanet meal.
- TERMS: ok (ilah, şefaat, kürsü, Ayetü'l-Kürsi).
- LANGUAGE: ok. It has 6 sentences, one over the limit of 5.
- Reason: a clause-by-clause rendering of Ayat al-Kursi, partly in the Diyanet wording.

### quran:112:1

**ms: FAIL**
- FAITHFUL: minor-addition.
  - "kepada manusia" (to people) and "yang sempurna" are small glosses.
  - "atau menyerupai-Nya" (or resemble Him) goes beyond the source's "لا يشاركه أحد فيها" (none shares with Him in them).
  - The closing sentence, "Ini adalah pengakuan tauhid yang menjadi asas keimanan seorang Muslim", is not in the source.
  - Rububiyyah comes out as "dijadikan Tuhan" ("taken as God"). That really restates uluhiyyah, so lordship (creating and governing) is not clearly conveyed. This is imprecise, not contrary to the source.
- VERSE: **yes**. It opens with the verse's own command to the Prophet: "Wahai Rasulullah, **katakanlah** … bahawa Allah SWT itu **Esa**". That is "Say", "Allah" and "One" in the verse's voice, close to Basmeih's "Katakanlah (wahai Muhammad): (Tuhanku) ialah Allah Yang Maha Esa". A new Muslim reads this as Allah addressing the Prophet, which is the verse, not an explanation of it.
- TERMS: ok (Allah SWT, ketuhanan, tauhid).
- LANGUAGE: minor. "berhak disembah, dijadikan Tuhan, dan memiliki…" is awkward.
- Reason: keeps the verse's imperative "Say" and renders the whole verse in its own voice.

**tr: FAIL**
- FAITHFUL: minor-addition. "benzersiz" (incomparable) and the closing "Bu, tevhid … inancının temelini açıklar" are not in the source. The rububiyet gloss "(yaratıcılık ve yönetme)" is the standard meaning.
- VERSE: **yes**. "Ey Resul, **de ki: O, Allah'tır**; … **tek**…" is the Diyanet meal of 112:1 ("De ki: O, Allah'tır, bir tektir") with the tafsir gloss inserted.
- TERMS: ok (uluhiyet, rububiyet, tevhid, Resul).
- LANGUAGE: ok.
- Reason: reproduces the Turkish meal wording "de ki: O, Allah'tır … tek".
- Consistency note: the bn-id review passed its 112:1 texts on the grounds that the tafsir also opens with "Say, O Messenger". I did not accept that reasoning, because the bn-id review itself failed 2:183 bn for keeping the tafsir's vocative. See the end of this report for what the counts would be under its reading.

### quran:51:56

**ms: PASS (minor-addition)**
- FAITHFUL: minor-addition.
  - Sentence 1 matches the source: jinn and humans were created, and all messengers sent, for one noble aim (tujuan yang mulia), which is to worship Allah alone.
  - Sentence 2, "Ini adalah inti ajaran tauhid yang menjadi asas kehidupan seorang Muslim", is added commentary.
- VERSE: no. The verse is recast in the third person and in positive form, with the tafsir's "sent all messengers" inserted. It does not follow the verse's "I did not create … except".
- TERMS: ok (jin, rasul, beribadah, tauhid). "menciptakan" leans Indonesian (Malaysian usage prefers "mencipta"), but it is acceptable.
- LANGUAGE: ok. Only 2 sentences, below the minimum of 3.
- Minor-addition reason: the closing sentence calling this "the core of tauhid and the foundation of a Muslim's life" is not in the source.

**tr: FAIL**
- FAITHFUL: **no**. The source is one sentence; three of the four sentences go beyond it.
  - (a) "İnsan ve cinlerin varlık sebebi, **O'nu tanımak** ve O'na kulluk etmektir" adds *knowing* Allah (ma'rifah) as part of the purpose of creation. This interpretation comes from other tafsir traditions; it is not in the source.
  - (b) "Bu, tevhid inancının temelidir; yani ibadetin yalnızca Allah'a has kılınmasıdır" is added commentary.
  - (c) "Bu gaye dışında hiçbir amaç yaratılışın özünde yer almaz" restates the source's exclusivity as a broader claim about creation.
- VERSE: no.
- TERMS: ok (ibadet, kulluk, tevhid, ortak koşmak).
- LANGUAGE: ok.
- Reason: adds "to know Him" as a purpose of creation, plus two sentences of tawhid commentary that are not in the source.

### quran:2:183

**ms: FAIL**
- FAITHFUL: yes. The text is a close and faithful rendering of the tafsir:
  - the believers are described as "beriman kepada Allah dan Rasul-Nya serta mengamalkan syariat-Nya";
  - fasting was obligatory on the nations before;
  - taqwa is glossed as obedience and worship of Allah alone serving as a shield against sin.
- VERSE: **yes**. It opens with the verse's vocative "Wahai orang-orang yang beriman" and keeps the second-person "kamu". It renders the verse's clauses in order: fasting prescribed on you, as on those before you, so that you attain taqwa. This is very close to Basmeih ("Wahai orang-orang yang beriman! Kamu diwajibkan berpuasa sebagaimana diwajibkan atas orang-orang yang dahulu daripada kamu, supaya kamu bertaqwa").
- TERMS: ok (syariat, berpuasa, ketakwaan, maksiat).
- LANGUAGE: ok. Only 2 sentences.
- Reason: keeps the verse's direct address and renders its clauses in sequence, so it reads as a translation of the verse.

**tr: FAIL**
- FAITHFUL: yes.
- VERSE: **yes**. "Ey Allah'a ve Resulüne iman edip … amel edenler! Allah, sizden önceki ümmetlere farz kıldığı gibi size de orucu farz kıldı. Bu, takva sahibi olmanız…" is the Diyanet meal ("Ey iman edenler! Oruç, sizden öncekilere farz kılındığı gibi size de farz kılındı. Umulur ki korunursunuz") with the tafsir's glosses inserted.
- TERMS: ok (şeriat, ümmet, farz, oruç, takva).
- LANGUAGE: ok.
- Reason: keeps the verse's vocative and renders its clauses in sequence.

### quran:5:6

**ms: PASS (minor-addition)**
- FAITHFUL: minor-addition.
  - "tanah yang **suci**" takes "suci" (ṭayyib) from the verse; the source says only "the surface of the earth".
  - "tangan hingga siku" and "kaki hingga buku lali" are looser than the source's explicit "**including** the elbows/ankles" (مع). Malaysian fiqh usage normally reads "hingga siku" as inclusive, so this is minor.
  - The text leaves out the source's condition "when not in a state of purity", which is allowed.
  - Correct on the points that matter:
    - major ritual impurity (hadath besar) requires mandi wajib before prayer;
    - the tayammum cases include "selepas bersetubuh", which matches "جامع زوجته";
    - the no-water condition applies to the whole list;
    - tayammum is a rukhsah that replaces water, and the blessing is thanked by obeying Allah's commands and prohibitions.
- VERSE: no, though borderline. The verse is recast as a third-person description ("Ayat ini menerangkan cara berwudhu … iaitu membasuh…"), the commands become described rulings, and the tafsir's interpretation is used (mandi wajib, bersetubuh, rukhsah). It necessarily lists the wudu steps in the verse's order, which a legal verse makes unavoidable, but there is no vocative and no imperative.
- TERMS: ok. berwudhu, solat, junub, hadath besar, mandi wajib, tayammum and rukhsah are all used in Malaysia. DBP spells them wuduk, hadas and tayamum, a trivial difference.
- LANGUAGE: ok. The sentences are long (94 words).
- Minor-addition reason: "tanah yang suci" comes from the verse, not the source; "hingga siku/buku lali" is looser than the source's "including".

**tr: FAIL**
- FAITHFUL: minor-addition.
  - "temiz toprakla" comes from the verse.
  - "…almak **farzdır**" is a fiqh label, but the source's imperative supports it.
  - For tayammum the text names only "Hasta veya yolcu olup su bulamayan kişi". It drops the source's two other cases, relieving oneself and intercourse. That is an omission, which is allowed, but it makes tayammum look like it is only for the sick and travellers.
- VERSE: no. It is written as a third-person description ("Bu ayet … kurallarını açıklar").
- TERMS: **problem**.
  - (a) "Büyük bir kirlilik (janabah)" ("a major dirtiness") misdescribes janabah, the major ritual impurity (الحدث الأكبر). Janabah is a ritual state, not physical dirt. Turkish usage is "cünüplük" or "büyük hades".
  - (b) "tam boy abdest (ghusl)" should be Turkish "boy abdesti (gusül)".
  - (c) "namaz (salah)" and "(rukhsah)" are English-style romanisations. Turkish Muslims say namaz, which needs no gloss, and "ruhsat". Janabah, ghusl, salah and rukhsah are not forms used in Turkish.
- LANGUAGE: minor. "Allah, bu kolaylıkla (rukhsah) size zorluk değil, kolaylık ve rahmet diler" is clumsy.
- Reason: renders janabah as "büyük bir kirlilik" and uses English-style janabah, ghusl, salah and rukhsah instead of the Turkish cünüplük, gusül, namaz and ruhsat.

### quran:94:5

**ms: FAIL**
- FAITHFUL: minor-addition.
  - The parenthetical "(pengulangan ini menegaskan bahawa setiap kesusahan pasti disertai jalan keluar)" comments on the repetition, which the source does not do.
  - The first sentence addresses the reader with "-mu" ("musuh-musuhmu", "menghalangimu") and never says that the addressee is the Prophet ﷺ. In the app, the reader will take it as addressed to them.
- VERSE: **yes**. "Sesungguhnya bersama kesulitan itu ada kemudahan, dan bersama kesulitan itu ada kemudahan" is a word-for-word rendering of 94:5–6 (إنّ = sesungguhnya, مع = bersama, العسر/يسر = kesulitan/kemudahan) and the familiar popular wording. The tafsir deliberately used the synonyms ضيق and فرج (distress and relief); the model went back to the verse's own words.
- TERMS: ok (risalah).
- LANGUAGE: ok. Only 2 sentences.
- Reason: reproduces the verse (94:5–6) almost word for word.

**tr: FAIL**
- FAITHFUL: minor-addition, close to "no":
  - "Bu, Allah'ın vaadidir ve müminlere sabır ve güven aşılar" is a claim about what the verse does, and it is not in the source;
  - "her sıkıntının **ardından** bir ferahlık gelir" changes the source's "**with** distress" (مع) to "after".
- VERSE: **yes**. "Çünkü her zorlukla birlikte bir kolaylık vardır" is close to the Diyanet meal ("Şüphesiz güçlükle beraber bir kolaylık vardır").
- TERMS: ok (tebliğ, sallallahu aleyhi ve sellem, mümin).
- LANGUAGE: minor. The text switches to the second person inside reported speech: "peygamberimize hitaben, düşmanların eziyetlerinin **seni** tebliğden alıkoymaması". It should be "onu".
- Reason: reproduces the verse, adds "this is Allah's promise and instils patience and trust", and turns "with hardship" into "after hardship".

### aqeedah:usul:005 (second principle; pillars of Islam; meaning of the shahadatayn)

**ms: PASS**
- FAITHFUL: yes.
  - Everything is from the source:
    - the definition of Islam (submission with tawhid, compliance through obedience, freedom from shirk);
    - the three levels;
    - the five pillars;
    - the meaning of both shahadas.
  - "Asas kedua dalam agama Islam" slightly reframes "the second principle (of the three)", which is harmless.
  - The glosses "(sembahyang)", "(sedekah wajib)" and "(Kaabah)" are fine.
- VERSE/HADITH: no. None of the five cited verses is rendered.
- TERMS: ok, with one minor point. "zakah" and "tawhid" are English-style romanisations; Malaysian usage is **zakat** and **tauhid**, and the model itself writes "tauhid" in 51:56 ms and 112:1 ms. I judged this minor because the terms are correct, glossed, and follow the app's "Arabic transliteration" rule. I recommend normalising them. A strict reading of the "forms Malaysians use" criterion would turn this item into a FAIL.
- LANGUAGE: minor.
  - "syahadah kepada Rasulullah" is awkward; "syahadah bahawa Muhammad Rasulullah" is better.
  - It is ambiguous whether "…melalui dalil-dalilnya, yang bermaksud…" refers to Islam or to "knowing Islam".

**tr: FAIL**
- FAITHFUL: yes.
- VERSE/HADITH: no.
- TERMS: minor.
  - "tawhid" should be Turkish "tevhid", which the model uses in 112:1 tr and 51:56 tr.
  - "hac etmek" is normally written "haccetmek".
  - "şehadet etmek" is ok; "kelime-i şehadet getirmek" is more usual.
- LANGUAGE: **problem**. The core definition of Islam does not parse: "bu, **Allah'a (tawhid) ile** teslim olmak". The term sits unglossed in parentheses with "ile" left dangling. It should read "Allah'a tevhid ile teslim olmak".
- Reason: a visible generation defect, an ungrammatical and unglossed term, in the sentence that defines Islam. This is borderline: a one-word manual edit would make it PASS, so patching may be better than regenerating.

### aqeedah:usul:007 (iman; its branches and six pillars)

**ms: PASS**
- FAITHFUL: yes. It covers, all from the source:
  - "lebih daripada tujuh puluh cabang" for بضع وسبعون;
  - the highest branch (saying la ilaha illa Allah) and the lowest (removing harm from the road);
  - malu as a branch of iman;
  - the six pillars, including takdir both good and bad;
  - the two proofs.
- VERSE/HADITH: no, but borderline. The proof verses are only described: "ayat tentang kebaikan yang merangkumi iman kepada Allah, hari akhirat, malaikat, kitab, dan nabi-nabi" and "ayat lain yang **menyatakan bahawa** segala sesuatu diciptakan dengan takdir". The second is close to the meaning of 54:49, but it is reported in the third person as what the verse says, not quoted or given in the verse's voice. The bn-id review treated the matching phrase the same way. The tr text, by contrast, quotes the verse (below).
- TERMS: ok (kalimah la ilaha illa Allah, rukun iman, malaikat, hari akhirat, takdir).
- LANGUAGE: ok. "membuang halangan dari jalan" is acceptable; "membuang gangguan/duri dari jalan" is more usual.

**tr: FAIL**
- FAITHFUL: yes.
- VERSE: **yes**. "kaderin delili ise **'Biz her şeyi bir ölçüye göre yarattık'** ayetidir" quotes al-Qamar 54:49 in quotation marks, in Allah's first person. That is a direct verse translation, close to the Diyanet meal ("Şüphesiz biz her şeyi bir ölçüye göre yarattık").
- TERMS: ok, with minor points. The traditional phrase is "yetmiş küsur **şube**", not "bölüm". "rükün (şart)", "haya" and "hayrıyla şerriyle kader" are fine.
- LANGUAGE: ok.
- Reason: quotes a Turkish translation of al-Qamar 54:49.

## Systemic observations (for the prompt owner)

1. **The tafsir carries the verse's structure into the explanation.** This is the same pattern as in the bn-id review.
   - Where al-Muyassar opens with the verse's own vocative or imperative (2:183 "يا أيها الذين…", 112:1 "قل -أيها الرسول-"), the model kept it in both languages.
   - Where the tafsir is a close paraphrase of the verse (2:255, 94:5), the model rendered it clause by clause.
   - Where the model framed the text as "Ayat ini menerangkan…" / "Bu ayet … açıklar" and stated the teaching (5:6, 51:56), it passed the verse test.
   - Suggested prompt rule: "Write in the third person ('This verse teaches…'). Never use 'O you who believe' or 'Say'. Do not restate the verse's sentences; summarise its teaching thematically. Do not quote or translate proof verses; say only what they prove."
2. **Closing commentary sentences.** Six of the 12 Quran texts end with an unsourced "moral" sentence:
   - 112:1 ms/tr: tauhid is the basis of faith;
   - 51:56 ms/tr: core of tauhid and the purpose of existence;
   - 94:5 ms/tr: a comment on the repetition, and "Allah's promise, instils patience".

   Turkish goes further (51:56 tr adds ma'rifah). Suggested prompt rule: "Do not add a concluding lesson or comment."
3. **Term forms.** The rule "keep Islamic terms in Arabic transliteration" pushes the model toward English-style romanisation:
   - Turkish uses janabah, ghusl, salah, rukhsah and tawhid instead of cünüplük, gusül, namaz, ruhsat and tevhid.
   - Malay uses zakah and tawhid instead of zakat and tauhid.

   The model is inconsistent within a single language. A per-language list of preferred term forms in the prompt would fix this.
4. **Generation glitch.** usul:005 tr has a broken parenthetical ("Allah'a (tawhid) ile"). It is worth a regex or spot check for "(term) ile" patterns in Turkish output.
5. **Hadith wording embedded in usul:007.** As in the bn-id review: the creed text contains, unattributed, the wording of the branches-of-faith hadith and the six pillars from the Jibril hadith. Both ms and tr render it closely. I did not count that as quoting a hadith. If the policy is meant to cover hadith wording embedded in creed texts, usul:007 ms would also fail.
6. **Length.** I did not use length as a fail criterion.
   - Under 3 sentences: 51:56 ms, 2:183 ms, 94:5 ms.
   - Over 5 sentences: 2:255 tr (6).
   - Long rather than "short" sentences: 2:255 ms (89 words), 5:6 ms (94 words), usul:005 ms (107 words), usul:005 tr (92 words), usul:007 ms (93 words).
7. **Cross-review consistency (112:1).** If you adopt the bn-id review's reading, which treats the tafsir's "Say, O Messenger" as acceptable:
   - 112:1 ms and 112:1 tr both become PASS (minor-addition);
   - the counts become ms 5/8 (62.5%), tr 1/8 (12.5%).

   I kept them as FAIL because both keep the verse's own command, and the tr is the Diyanet wording word for word.

## FAIL list (for cache deletion)

(quran:2:255, ms), (quran:112:1, ms), (quran:2:183, ms), (quran:94:5, ms), (quran:2:255, tr), (quran:112:1, tr), (quran:51:56, tr), (quran:2:183, tr), (quran:5:6, tr), (quran:94:5, tr), (aqeedah:usul:005, tr), (aqeedah:usul:007, tr)
