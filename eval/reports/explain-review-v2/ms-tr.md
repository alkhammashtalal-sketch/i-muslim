# Faithfulness review v2: DeepSeek V4 Flash explanations (ms + tr)

Input: `scratchpad/explain2/ms-tr.jsonl`. It has 16 lines: 6 Quran ids and 2 aqeedah ids, each in Malay (ms) and Turkish (tr). No line has `rejected` or `error` set, so all 16 were judged. I did not modify the input.

I read each `text` in full against `source_ar`. For the Quran ids that is al-Tafsir al-Muyassar; for the aqeedah ids it is the al-Usul al-Thalatha passage. For the Quran ids I also checked each text against `ayah_ar` and `ayah_en`.

## Conventions applied

- **FAITHFUL**
  - `yes`: every statement is supported by the source.
  - `minor-addition`: a small, harmless framing word or phrase, or a slight narrowing or labelling, that adds no doctrine, ruling, purpose or lesson. Still PASS.
  - `no`: the text adds a doctrine, ruling, definition, purpose, concluding lesson or moral, or it changes a condition, the addressee or a definition. FAIL.
  - Omitting part of the source is not an addition. It counts against a text only when the omission changes a ruling's conditions or scope, or a definition. Otherwise I record it as a note.
- **VERSE-TRANSLATION**: `yes` only when the text uses the verse's own address or commands in the verse's voice. A third-person description that follows the tafsir's glosses is `no`, even when it tracks the clause order closely. Hadith wording that appears unattributed inside the creed text (the branches of faith, the six pillars) does not count as quoting a hadith.
- **TERMS**: Islamic terms must use the forms of the target language. For Malay: solat, zakat, tauhid, wuduk, tayamum and so on. For Turkish: namaz, abdest, gusül, teyemmüm, oruç, zekât, tevhid and so on. **LANGUAGE**: the text is in the required language and is understandable.
- **Verdict**: PASS when FAITHFUL is `yes` or `minor-addition`, VERSE-TRANSLATION is `no`, and TERMS and LANGUAGE are `ok`. Otherwise FAIL.
- **Sentence count** outside 3–5 is a note only. All 16 texts have 3–5 sentences. The Turkish ordinals "177." and "49." in aqeedah:usul:007 tr are not sentence ends. Several Malay sentences are long run-ons, which I note below.

## Summary

| Lang | Lines | Unavailable (rejected) | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| ms | 8 | 0 | 8 | 3 | 5 | 37.5% |
| tr | 8 | 0 | 8 | 4 | 4 | 50.0% |
| **All** | 16 | 0 | 16 | 7 | 9 | 43.8% |

## Verdict table

| # | id | lang | Sent. | Faithful | Verse-translation | Terms | Language | Verdict |
|---|---|---|---|---|---|---|---|---|
| 0 | quran:2:255 | ms | 5 | minor-addition (borderline) | no | ok | ok | PASS |
| 1 | quran:2:255 | tr | 5 | yes | no | ok | ok | PASS |
| 2 | quran:112:1 | ms | 3 | **no** | no | ok | ok | **FAIL** |
| 3 | quran:112:1 | tr | 3 | **no** | no | ok | ok | **FAIL** |
| 4 | quran:51:56 | ms | 3 | **no** | no | ok | ok | **FAIL** |
| 5 | quran:51:56 | tr | 3 | minor-addition | no | ok | ok | PASS |
| 6 | quran:2:183 | ms | 4 | **no** | no | ok | ok | **FAIL** |
| 7 | quran:2:183 | tr | 4 | **no** | no | ok | ok | **FAIL** |
| 8 | quran:5:6 | ms | 5 | minor-addition (borderline) | no | ok | ok | PASS |
| 9 | quran:5:6 | tr | 4 | **no** | no | **problem** | ok | **FAIL** |
| 10 | quran:94:5 | ms | 3 | **no** | no | ok | ok | **FAIL** |
| 11 | quran:94:5 | tr | 4 | **no** | no | ok | ok | **FAIL** |
| 12 | aqeedah:usul:005 | ms | 5 | minor-addition | no | ok | ok | PASS |
| 13 | aqeedah:usul:005 | tr | 5 | minor-addition | no | ok | ok | PASS |
| 14 | aqeedah:usul:007 | ms | 5 | **no** | no | ok | ok | **FAIL** |
| 15 | aqeedah:usul:007 | tr | 4 | minor-addition | no | ok | ok | PASS |

## Per-item notes

### 0. quran:2:255 ms: PASS (minor-addition, borderline)
- **Reason:** It adds two causal links that the Muyassar does not make. The first is "Allah sahaja yang layak disembah, **kerana** Dia Maha Hidup…" (Allah alone deserves worship *because* He is Ever-Living…). The second is "menjaga kedua-duanya tidak memberatkan-Nya **kerana** Dia Maha Tinggi dan Maha Agung" (preserving them does not burden Him *because* He is Most High and Most Great). The source lists these as separate attributes. Each statement on its own is in the source, so I count the connectives as minor. This is the most borderline PASS in the file.
- **Kursi definition kept:** "tempat tapak kaki Tuhan, yang tidak diketahui hakikatnya melainkan Allah" matches موضع قدمي الرب … ولا يعلم كيفيته إلا الله.
- The other points are faithful:
  - "berani memberi syafaat" (dare to intercede) matches يتجاسر.
  - Creatures know nothing of His knowledge except what He teaches.
  - The verse is called the greatest verse and Ayat al-Kursi.
- **Omissions (notes):**
  - "Present" is dropped from past/present/future.
  - The qualifier العلي **بذاته وصفاته على جميع مخلوقاته** (high in His essence and attributes over all creation) is reduced to "Maha Tinggi". "semata-mata" is a small intensifier.
- **Verse-translation: no.** The phrases about drowsiness and sleep, and about what is in the heavens and earth, follow the tafsir's own glosses in the third person.
- Sentences 3 and 4 are long run-on sentences.

### 1. quran:2:255 tr: PASS
- **Faithful: yes.**
  - Sole deity worthy of worship.
  - Sustainer of all.
  - No drowsiness or sleep.
  - Ownership of all.
  - No intercession without His permission.
  - His knowledge covers past, present and future, and no creature knows any of it except what He reveals.
  - Kursi = "Rabbin ayaklarının konulduğu yer" (the place of the Lord's feet), whose nature only Allah knows. This matches the source.
  - Preserving them does not burden Him.
  - He combines all attributes of greatness.
  - It is the greatest verse, Ayetü'l-Kürsi.
- **Omissions (notes):** "hayat sahibi" drops "complete life befitting His majesty", and العلي بذاته… is not rendered. These are omissions, not changes.
- **Verse-translation: no.** "O'nu ne uyuklama ne de uyku tutar" is close to standard Turkish renderings of the verse. It still follows the tafsir's gloss (سنة أي نعاس، ولا نوم) and is in the third person.

### 2. quran:112:1 ms: FAIL
- **Reason:** The final sentence is an added conclusion that the source does not contain: "Ini menegaskan konsep tauhid yang murni, iaitu mengesakan Allah dalam segala aspek" (This affirms the concept of pure tawhid, i.e. singling out Allah in every aspect).
- **Other additions (notes):**
  - "nama dan sifat yang **sempurna**" adds "perfect".
  - "berkongsi **atau menyamai**" adds "or resemble/equal Him". The source only has لا يشاركه أحد فيها.
  - The glosses of ketuhanan as "Tuhan yang disembah, Pencipta dan Pengurus" render الألوهية and الربوبية. I treated them as acceptable renderings, not as the reason for failure.
- **Addressee kept:** Allah commands the Messenger ﷺ to declare. Third person throughout. **Verse-translation: no.**

### 3. quran:112:1 tr: FAIL
- **Reason:** The final sentence is an added conclusion: "Bu, tevhid inancının özüdür; hiçbir şey O'na denk tutulamaz" (This is the essence of tawhid belief; nothing can be held equal to Him).
  - "Nothing is equal to Him" brings in the idea of 112:4, which is not in this source.
  - "benzersizliğini" (His matchlessness) in sentence 1 adds the same idea.
- **Other notes:**
  - The parenthetical glosses "uluhiyet (ibadete layık olma), rububiyet (yaratma ve yönetme)" are standard renderings, noted but not the failure reason.
  - "güzel isimler ile yüce sıfatlar" adds "beautiful/exalted".
  - **Addressee kept** (the Prophet ﷺ).
- **Language note:** "Bu ayet, Peygamber Efendimiz'e … hitaben, … açıklamasını emrettiğini gösterir" leaves the subject of "emrettiğini" (Allah) unstated. It is awkward but understandable. **Verse-translation: no.**

### 4. quran:51:56 ms: FAIL
- **Reason:** It adds a definition and a new concept.
  - "ibadah yang dimaksudkan adalah tauhid, iaitu mengesakan Allah dalam segala bentuk **solat, zakat**, dan amalan lain" defines the worship as tawhid and adds examples (prayer, zakat) that are not in the source.
  - "ini adalah asas bagi setiap **mukallaf**" (this is the basis for every legally responsible person) is an added concluding claim and term.
- Sentence 1 is faithful: the creation of jinn and humans and the sending of all messengers are for one lofty purpose, worship of Allah alone.

### 5. quran:51:56 tr: PASS (minor-addition)
- Sentence 1 is faithful: creation of jinn and humans and the sending of all prophets have the sole lofty purpose of worshipping Allah alone.
- **Minor:**
  - "Bu ibadet, Allah'tan başka hiçbir varlığa yöneltilmemelidir" restates وحدي دون من سواي in a normative mood.
  - "yani tevhid esasına dayanır" labels that exclusivity as tawhid. This is a label for the source's own content, not new doctrine or a lesson.
- Sentence 3 only restates sentence 1. **Verse-translation: no.**

### 6. quran:2:183 ms: FAIL
- **Reason:** It adds a purpose and a moral.
  - "Kewajipan ini datang daripada Allah **sebagai ujian keimanan**" adds "as a test of faith".
  - "Puasa bukan sekadar menahan diri, tetapi ia adalah **latihan rohani untuk memperkukuhkan tauhid dan keikhlasan**" adds that fasting is spiritual training to strengthen tawhid and sincerity.
- **Also:** "menjadikan **puasa** sebagai perisai" makes fasting the shield. In the source the shield (وقاية) between you and sins is obedience and worship of Him alone. "Tujuan **utama**" adds "main".
- **Addressee kept:** believers who affirmed Allah and His Messenger and act on His law. The comparison with earlier nations is kept.

### 7. quran:2:183 tr: FAIL
- **Reason:** The last sentence adds a moral: "Oruç, müminin Allah'a olan bağlılığını güçlendiren bir ibadet olarak sunulur" (fasting is presented as worship that strengthens the believer's devotion to Allah). The source does not say this, and "is presented as" wrongly attributes it to the text.
- Sentences 1–3 are faithful.
  - The addressee is the believers who believe in Allah and His Messenger and act on His law.
  - Fasting is prescribed as it was for earlier nations.
  - The aim is taqwa, explained as protection from sins through obedience and worship of Him alone.

### 8. quran:5:6 ms: PASS (minor-addition, borderline)
- **Conditions kept:**
  - The ruling covers a believer who wants to pray while not in a state of purity ("tidak berwuduk").
  - All four tayamum cases are kept: ill, travelling, after relieving oneself, after intercourse with one's wife. The shared condition "dan tidak mendapat air" is also kept.
  - Mandi before solat for major impurity is kept.
  - Tayamum is a concession replacing water, a blessing to be thanked through obedience to His commands and prohibitions.
- **Minor narrowings (notes, not additions of doctrine or lessons):**
  - "menggunakan **debu** tanah" specifies dust. The source says only وجه الأرض (the surface of the earth). This is a conventional Malay rendering.
  - "hadas besar, **iaitu berjunub**" narrows the tafsir's broader الحدث الأكبر back to the verse's word junub.
  - "hingga ke siku / hingga ke buku lali" follows the verse's إلى. It does not state the tafsir's inclusive مع المرافق / مع الكعبين (elbows and ankles included).
- **Omissions (notes):** the anatomical definitions of المرفق and الكعبين, and the qualifier "travel while healthy".
- **Verse-translation: no.** It is third person ("mereka perlu…"), not the verse's commands.

### 9. quran:5:6 tr: FAIL
- **Reason (condition change):** "Hasta veya yolculukta olup su bulunamayan kişi, teyemmüm yapabilir" names only the ill and travellers.
  - It drops two of the source's four cases: after relieving oneself (قضى أحدكم حاجته) and after intercourse with one's wife (جامع زوجته).
  - As written, tayammum reads as limited to the ill and travellers. That narrows the ruling's scope.
- **Terms: problem.** "**Büyük abdest bozulması** (cünüplük)" is not a standard Turkish fiqh term.
  - "Büyük abdest bozmak" is the everyday Turkish idiom for defecating, so the phrase can be misread as "after defecation, gusül is required".
  - The standard terms are "büyük hades / hades-i ekber" or simply "cünüplük".
- **Other notes:**
  - "dirseklere kadar" leaves the inclusion of the elbows implicit, while "topuklarla birlikte" keeps it for the ankles. "topuk" is the conventional ilmihal word for كعب.
  - "(cünüplük)" narrows الحدث الأكبر, as in the ms text.
  - "Bu hükümler … kolaylık ve rahmet sağlamak içindir" extends to all the rulings an ease that the source ties to the permission of tayammum. This is minor.
  - The thanks clause drops "by obeying Him in what He commands and forbids".
- **Verse-translation: no.**

### 10. quran:94:5 ms: FAIL
- **Reason:** It changes the addressee and adds a purpose and a lesson.
  - **Addressee:** the source addresses the Prophet (فلا يثنك أذى أعدائك: let not your enemies' harm deter *you*). "gangguan daripada musuh tidak sepatutnya menghalang **seseorang**" generalises it to anyone.
  - **Purpose:** "ia diulang **untuk menguatkan keyakinan**" adds a reason for the repetition.
  - **Lesson:** "Maksudnya, **setiap** kesusahan pasti ada jalan keluar, sebagaimana yang dijanjikan oleh Allah" is an added concluding moral.
- **Verse-translation: no.** "kesulitan … akan disertai dengan kelapangan" is reported in the third person ("Teks ini menegaskan bahawa…").

### 11. quran:94:5 tr: FAIL
- **Reason:** It changes the addressee and adds a moral and a conclusion.
  - **Addressee:** "**kişiyi** tebliğ görevinden alıkoymaması" (a person) replaces the Prophet.
  - **Moral:** "Bu ifade, müminin sabrını ve güvenini tazeleyen bir müjde niteliğindedir" (glad tidings that renew the believer's patience and trust).
  - **Conclusion:** "zorlukların **geçici** olduğu ve **sonunda** rahatlama geleceği" (hardships are temporary and relief comes in the end). This also shifts the source's "with (مع) hardship is relief" to "relief comes afterwards".
  - "**her** zorluğun yanında" (beside every hardship) also generalises.
- **Verse-translation: no.** The text is framed as "Metin … vurgular".

### 12. aqeedah:usul:005 ms: PASS (minor-addition)
- **Faithful content:**
  - Knowing the religion of Islam by evidences.
  - The definition of Islam: submission to Allah with tauhid, compliance through obedience, freedom from syirik.
  - Three levels (Islam, iman, ihsan), each with pillars.
  - The five pillars.
  - The meaning of the first shahada as negation and affirmation, with no partner in worship.
  - The four-part meaning of the second shahada.
- **Minor:** "asas kedua **dalam agama Islam**" mis-frames الأصل الثاني. It is the second of the book's three principles that a person must know, not "the second foundation in the religion of Islam".
- **Omissions (notes):** the evidence verses are not summarised, and "as He has no partner in His dominion" is dropped.
- Sentences are long. **Terms ok:** solat, zakat, tauhid, syirik, syahadah, haji.

### 13. aqeedah:usul:005 tr: PASS (minor-addition)
- **Faithful content:**
  - Three levels.
  - The five pillars.
  - The meaning of the first shahada (nothing but Allah is worshipped; He is the only ilah), explained through Ibrahim's disavowal. This is the source's cited tafsir verse, described in the third person.
  - The four-part meaning of the second shahada.
  - 98:5 as the evidence for namaz and zekât.
- **Minor:** "İbrahim'in **putlardan** uzaklaşıp" says "idols". The cited verse says only مما تعبدون (what you worship).
- **Omission (note):** the source's definition of Islam (الاستسلام لله بالتوحيد…) is left out entirely. This leaves a gap but creates no false statement.
- **Orthography note:** "ramazan" is lowercase. **Terms ok:** namaz, zekât, oruç, hac, şehadet, ihsan.

### 14. aqeedah:usul:007 ms: FAIL
- **Reason:** It adds a concluding sentence and exegetical information.
  - **Concluding sentence:** "**Jadi**, keenam-enam rukun ini menjadi asas keimanan bagi seseorang Muslim" (So these six pillars are the foundation of faith for a Muslim).
  - **Exegetical addition:** "menghadap ke timur atau barat **dalam solat**" (facing east or west in prayer). Neither the source nor the cited verse mentions prayer.
  - "bukanlah **sekadar**" (not merely) softens the verse's negation. This is minor.
- **Faithful content:**
  - Seventy-odd branches.
  - The highest (the word of tauhid) and the lowest (removing harm from the road).
  - Haya' is a branch.
  - The six pillars, including takdir good and bad.
  - 54:49 as the evidence for qadar.

### 15. aqeedah:usul:007 tr: PASS (minor-addition)
- **Faithful content:**
  - Seventy-odd branches.
  - The highest is saying "la ilahe illallah". This is the creed text's own wording, so it is not counted as hadith quotation.
  - The lowest is removing harm from the road, and haya' is a branch.
  - The six pillars, including kader with its good and evil.
  - Bakara 177 as the evidence for the six pillars, and Kamer 49 for kader.
- **Minor:** "iyiliğin **sadece** doğuya veya batıya yönelmek olmadığını" (not *merely* turning east/west) softens the negation. This is a common rendering, but it adds a nuance.
- **Language note:** "bu ayet, her şeyi bir kader ile yarattığını bildirir" leaves the subject (Allah) implicit. It is awkward but understandable. **Verse-translation: no.** Both verses are described in the third person.

## Per-language summary

| Lang | Judged | PASS | FAIL | % PASS | Unavailable (rejected) |
|---|---|---|---|---|---|
| ms | 8 | 3 | 5 | 37.5% | 0 |
| tr | 8 | 4 | 4 | 50.0% | 0 |

Patterns:
- **Added concluding sentences, morals and purposes** cause most failures: 112:1 ms/tr, 51:56 ms, 2:183 ms/tr, 94:5 ms/tr, usul:007 ms.
- **94:5:** both languages generalise the Muyassar's address to the Prophet into "a person".
- **5:6 tr** drops two tayammum conditions and uses a misleading term for major impurity.
- **Verse-translation:** no text uses the verse's own address or commands in its voice.
- **Terms:** the target-language Islamic terms are otherwise correct throughout (solat/zakat/tauhid/wuduk/tayamum; namaz/abdest/gusül/teyemmüm/oruç/zekât/tevhid).

## FAIL list

(quran:112:1, ms), (quran:51:56, ms), (quran:2:183, ms), (quran:94:5, ms), (aqeedah:usul:007, ms), (quran:112:1, tr), (quran:2:183, tr), (quran:5:6, tr), (quran:94:5, tr)
