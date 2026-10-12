# Faithfulness review: Urdu (ur) and Hindi (hi) explanations

Input: `scratchpad/explain/ur-hi.jsonl` (16 lines: 8 ur, 8 hi; 12 Quran, 4 aqeedah). Generator: DeepSeek V4 Flash. The input file was not modified.

Every explanation was compared with its `source_ar` (al-Tafsir al-Muyassar for Quran ids, al-Usul al-Thalatha for aqeedah ids). For Quran ids it was also compared with `ayah_ar` / `ayah_en`. I also scanned each text for stray characters, sentence count, and Latin-script insertions.

## Summary

| Lang | Lines | Null/failed generations | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| ur | 8 | 0 | 8 | 4 | 4 | 50% |
| hi | 8 | 0 | 8 | 4 | 4 | 50% |
| **All** | 16 | 0 | 16 | 8 | 8 | 50% |

None of the 16 `error` fields is set.

## Standard applied for "verse translation"

Tafsir al-Muyassar often restates the verse in light paraphrase, so any faithful explanation of a short verse repeats some of the verse's content. I applied the rubric as follows:

- **Violation:** the explanation goes through a multi-clause verse clause by clause, in order, with wording that reads as a translation. Examples are 2:255, which renders almost all ten clauses of Ayat al-Kursi, and 5:6, which gives the wudu/tayammum commands in sequence.
- **Not a violation:** a short (one-sentence) verse whose meaning is restated through the tafsir's own glosses in reported or explanatory form. Examples are 2:183, 112:1, 51:56 and 94:5. Where the form comes close to quoting, I mark the item **borderline** below.
- The same standard applies to hadith wording embedded in the source; see usul:007.

## Per-item judgments

Key: F = Faithful (yes / minor-addition / no), VT = verse/hadith translation, T = terms, L = language.

### quran:2:255 (Ayat al-Kursi)

**ur: FAIL** (F: no, VT: yes, T: problem, L: minor)
- Glosses the Kursi as "عرش کا حصہ" (part of the Throne). The source defines it as «موضع قدمي الرب» and says only Allah knows its nature. Calling it part of the Arsh contradicts the source on a point of creed.
- The text renders nearly every clause of the verse in order, in near-translation wording: "اسے نیند یا اونگھ نہیں آتی ... ان کی حفاظت اس پر بوجھ نہیں ڈالتی، وہ بلند اور عظیم ہے".
- Grammar: "اس کا کرسی" should be "اس کی کرسی".

**hi: FAIL** (F: no, VT: yes, T: problem, L: minor)
- Glosses कुर्सी as "सिंहासन" (throne). This conflates the Kursi with the Arsh and contradicts the source's definition.
- Like the Urdu, it is a clause-by-clause rendering of the whole verse.
- Language: "उसका कुर्सी" should be "उसकी कुर्सी". The text has 6 sentences, more than the 5 allowed.

### quran:112:1

**ur: PASS** (F: minor-addition, VT: no, T: ok, L: ok)
- Minor addition: "نہ کوئی اس جیسا ہے" echoes 112:4 rather than this source, although it is implied by "unique in His names and attributes". "یہ توحید کا بنیادی اعلان ہے" is an added label. Neither changes the meaning.
- Small grammar slip: "اس میں کوئی شریک نہیں" should be "ان میں".

**hi: PASS, borderline** (F: minor-addition, VT: no (borderline), T: ok, L: ok)
- Minor addition: "जो हर मुसलमान के लिए जरूरी है" (necessary for every Muslim) is a normative line not in the source. It is harmless.
- Borderline translation: "कहो: वही अल्लाह है ... अकेला है" renders قل هو الله أحد word for word in direct speech. It does follow the tafsir's own structure («قل -أيها الرسول-: هو الله المتفرد...») with the tafsir's content inserted, so I did not count it as a violation. Regenerate if you want a stricter standard.

### quran:51:56

**ur: FAIL** (F: no, VT: no, T: ok (minor), L: problem)
- Overgeneralises: "ہر مخلوق کی تخلیق کا مرکزی مقصد توحید ..." says the purpose applies to *every creature*. The source speaks only of jinn and humans, plus the sending of the messengers.
- The divine honorific is corrupted. "تعالی٪" contains U+066A ARABIC PERCENT SIGN in place of the superscript alef.
- Grammar: "اکیلا اللہ کی عبادت" should be "اکیلے اللہ کی عبادت".
- Latin-script insertions "(ibadah)" and "(tawhid)".

**hi: FAIL** (F: no, VT: no, T: ok, L: ok)
- Adds doctrine that is not in the source: "इसका मतलब यह नहीं कि अल्लाह को इबादत की ज़रूरत है, बल्कि यह इंसान और जिन्न की फ़ितरत के अनुसार उनकी भलाई के लिए है" (that Allah does not need worship, and that worship is for their benefit according to their fitrah).
- "जो सभी नबियों का संदेश रहा है" stretches the source a little.

### quran:2:183

**ur: PASS, borderline** (F: yes, VT: no (borderline), T: ok, L: minor)
- Faithful to the source, including the tafsir's definition of the believers and its explanation of taqwa.
- Borderline on translation: it follows the verse's clause order, but it explains each clause through the tafsir's glosses.
- Language slips:
  - "جنہوں نے ... ایمان لایا" should be "جو ... ایمان لائے".
  - "پہلے امتوں" should be "پہلی امتوں".
  - The person switches from "ان پر" to "تم".
- Latin-script insertions "(sawm)" and "(taqwa)".

**hi: PASS, borderline** (F: minor-addition, VT: no (borderline), T: ok, L: minor)
- Minor addition: the closing line "यह रोज़ा सिर्फ़ एक इबादत नहीं, बल्कि तक़वा सीखने का ज़रिया है" is editorial, though consistent with the source.
- Same borderline on clause order as the Urdu.
- Language: "जिन्होंने ... ईमान लाया" should be "जो ... ईमान लाए". "कानून" for شرعه is acceptable; "शरीअत" would be better.

### quran:5:6

**ur: FAIL** (F: minor-addition, VT: yes, T: ok, L: problem)
- Renders the verse clause by clause in the imperative: "اپنے چہرے اور ہاتھ کہنیوں تک دھوؤ، اپنے سروں کا مسح کرو، اور اپنے پاؤں ٹخنوں تک دھوؤ ... صاف مٹی سے تیمم کرو ...". This reads like a standard Urdu translation of the verse.
- "صاف مٹی" comes from the verse's صعيدا طيبا. The source says only «وجه الأرض».
- The divine honorific is corrupted. "تعالی٬" contains U+066C ARABIC THOUSANDS SEPARATOR.
- Grammar: "بڑا ناپاکی" should be "بڑی ناپاکی".

**hi: FAIL** (F: minor-addition, VT: yes, T: ok (minor), L: ok)
- Renders the verse in sequence in reported speech: "...अपने चेहरे और हाथों को कोहनियों तक धोएं, अपने सिर का मसह करें, और अपने पैरों को टखनों तक धोएं ...", then janabah, then tayammum, then "no hardship".
- "पाक मिट्टी" comes from the verse, not the source. "दूसरे कारणों" loosely collapses the source's specific conditions (relieving oneself, intercourse).
- Latin-script parentheticals, including the odd "अल्लाह (Allah)".
- This item fails **only** on the verse-translation criterion. If you relax that criterion for legal verses, it would pass.

### quran:94:5

**ur: FAIL** (F: no, VT: no, T: ok, L: minor)
- The address is never attributed to the Prophet ﷺ. "اللہ تعالیٰ آپ کو تسلی دیتا ہے کہ دشمنوں کی ایذاء آپ کو پیغام پھیلانے سے نہ روکے" therefore reads as Allah addressing the *reader* about spreading the Message, which changes who is addressed.
- "ہر مشکل کے بعد آسانی ہے" says *after*, where the source has مع (*with*).
- Adds an unsourced moral line extending the verse to believers: "یہ وعدہ مومنوں کے لیے صبر اور استقامت کی ترغیب ہے".
- Only 2 sentences; 3 to 5 are required.

**hi: FAIL** (F: minor-addition (upper edge), VT: no, T: problem, L: minor)
- Term: "फ्रज (राहत)" is a garbled transliteration of فرج (faraj). Hindi- and Urdu-speaking Muslims don't use it, and as written it sits close to *farj*, which in Arabic means private parts.
- Unsourced closing sentence: "यह मुसलमानों के लिए धैर्य और भरोसे की शिक्षा है कि मुश्किलें अस्थायी हैं और अल्लाह की मदद जरूर आती है". It extends to all Muslims a reassurance that the source addresses to the Prophet.
- The person switches from "अपने पैगंबर को" to "आपको".

### aqeedah:usul:005 (the second principle, pillars of Islam)

**ur: PASS** (F: yes, VT: no, T: ok, L: minor)
- Accurate.
- It omits the definition of Islam and the fourth element of the meaning of the second shahada («وأن لا يُعبد الله إلا بما شرع»). These are omissions only, not additions.
- It describes al-Bayyinah 98:5 without translating it.
- Minor language: "دوسرا اصل" should be "دوسری اصل" or "دوسرا اصول". "اسلام کے دین" would read better as "دینِ اسلام".
- Latin-script insertions "(salah)" and "(zakah)".
- "شہادت" on its own usually means martyrdom in Urdu, but here it is glossed correctly.

**hi: PASS** (F: minor-addition, VT: no, T: ok (minor), L: ok)
- Complete and accurate, including all four meanings of the second shahada.
- "(काबा)" is a harmless gloss of بيت الله الحرام.
- Minor terms:
  - "नमाज़ (सलाह)": सलाह reads as the Hindi word for "advice"; "सलात" would be better.
  - "पूजा/पूज्य" for عبادة/معبود appears in some Hindi Islamic literature, but most Muslims say "इबादत/माबूद".

### aqeedah:usul:007 (the second level, Iman)

**ur: PASS, borderline** (F: yes, VT/hadith: no (borderline), T: ok, L: ok)
- Accurate. It cites al-Baqarah 177 and al-Qamar 49 as evidence without translating them.
- Borderline on the hadith criterion: the first sentence restates, nearly verbatim, the source's opening line, which is the wording of the known hadith on the branches of iman. The source gives it without attribution. Because it is a restatement of the approved source and not an added hadith, I did not count it.

**hi: PASS, borderline** (F: yes, VT/hadith: no (borderline), T: ok (minor), L: ok)
- Accurate.
- "कई शाखाएँ" drops the "seventy-odd" specificity, which is a loss, not an addition. "ईमान यानी अल्लाह पर विश्वास" is a narrow but acceptable gloss.
- Same hadith borderline as the Urdu.
- Minor terms: "भाग्य" for qadar carries a fate/luck connotation (it is followed by "(qadar)", and later "क़दर (taqdir)"; "तक़दीर" is the usual Muslim term). The text has heavy Latin-script parentheticals.

## Borderline PASS items (regenerate only if you want a stricter line)

- (quran:112:1, hi): direct-speech "कहो: वही अल्लाह है ... अकेला है" plus "हर मुसलमान के लिए जरूरी".
- (quran:2:183, ur), (quran:2:183, hi): follow the verse's clause order, glossed with the tafsir.
- (aqeedah:usul:007, ur), (aqeedah:usul:007, hi): restate the source's unattributed hadith wording.

## Patterns worth fixing in the prompt or pipeline

1. **Added "lesson" closers** cause most of the faithfulness problems: 51:56 hi, 94:5 ur and hi, 2:183 hi, 112:1 ur and hi. The model tends to end with a moral or theological takeaway that is not in the source.
2. **Kursi glossed as Throne** in both languages (2:255). This is a creed-level error and worth a regression check.
3. **Corrupted "تعالیٰ"** in 2 of 8 Urdu texts: U+066A in 51:56 and U+066C in 5:6, where U+0670 should be. A post-generation check for U+066A and U+066C in ur output would catch this.
4. **Latin-script transliterations** inside Urdu and Hindi text in 5 of 8 ur and 3 of 8 hi. These terms already exist natively in both scripts. The instruction "keep Islamic terms in Arabic transliteration" probably needs a per-language clarification, for example "in the target script".
5. **Grammatical gender errors** in Urdu and Hindi: کرسی, ناپاکی, امتوں, اصل.
6. **Long legal verses** (5:6): the source itself goes through the verse clause by clause. To pass, the explanation must describe the rulings (for example "the verse sets out wudu: ...") instead of restating them as commands.

## FAIL list (for cache deletion)

(quran:2:255, ur), (quran:2:255, hi), (quran:51:56, ur), (quran:51:56, hi), (quran:5:6, ur), (quran:5:6, hi), (quran:94:5, ur), (quran:94:5, hi)
