I read all four files in full and checked all 253 keys in ms.ts and tr.ts against en.ts and ar.ts. Both files have every key. Every placeholder is kept exactly ({n}, {m}, {s}, {a}, {ref}, {from}, {to}, {c}, {book}, {page}, {chapter}, {name}, {badge}, {level}, {source}, {sura}, {aya}). This version of en.ts has no {reciter} key. No English was left untranslated: the only English left is product, source and brand names, plus "Demo", which is a normal Malay word. I did not modify any files.

Neither file has a CRITICAL or MAJOR issue. "Not a mufti", "not a fatwa", the referral wording, the Sharia-reviewer badge, the level labels and the "AI never writes religious text" lines are all correct in both languages. Every issue below is MINOR.

==================== MALAY (ms) ====================

CRITICAL: none
MAJOR: none

MINOR:

1. ms | footer
   Current: 'Pembantu pengetahuan berasaskan sumber · bukan mufti · dibantu AI'
   Problem: "berasaskan sumber" means "source-based". It loses "bound/restricted to sources" (مقيّد بالمصادر), which is the app's core claim.
   Corrected: 'Pembantu pengetahuan terikat pada sumber · bukan mufti · dibantu AI'

2. ms | sourcesIntro
   Current: 'Aplikasi “Muslim” ialah pembantu pengetahuan berasaskan sumber, bukan mufti. Ia hanya menjawab daripada teks muktabar; jika tiada teks, ia menolak dan merujuk kepada pihak berkuasa. AI hanya menyusun teks yang ditemui dan menerangkannya.'
   Problem: It has the same weak "berasaskan sumber". It also drops "qualified" and "you", so it reads as "refers to the authorities".
   Corrected: 'Aplikasi “Muslim” ialah pembantu pengetahuan yang terikat pada sumber, bukan mufti. Ia hanya menjawab daripada teks muktabar; jika tiada teks, ia menolak dan merujuk anda kepada pihak berkuasa yang berkelayakan. AI hanya menyusun teks yang ditemui dan menerangkannya.'

3. ms | referralTitle
   Current: 'Soalan ini memerlukan fatwa daripada pihak berkuasa'
   Problem: It drops "qualified". Bare "pihak berkuasa" reads as generic "the authorities", and it does not match speakLinkOnScreen.
   Corrected: 'Soalan ini memerlukan fatwa daripada pihak berkuasa yang berkelayakan'

4. ms | abstainButton
   Current: 'Tanya pihak berkuasa ↗'
   Problem: Same dropped "qualified".
   Corrected: 'Tanya pihak berkuasa yang berkelayakan ↗'

5. ms | how2
   Current: 'Soalan yang memerlukan fatwa terus dirujuk kepada pihak berkuasa.'
   Problem: Same dropped "qualified".
   Corrected: 'Soalan yang memerlukan fatwa terus dirujuk kepada pihak berkuasa yang berkelayakan.'

6. ms | referralButton
   Current: 'Presidensi Umum Penyelidikan Ilmiah dan Ifta'
   Problem: "Presidensi" is not usual Malaysian Malay; it reads as an Indonesian-style borrowing, so readers may not readily recognise the body.
   Corrected: 'Jabatan Am Penyelidikan Ilmiah dan Ifta'

7. ms | notMuftiBody
   Current: 'Aplikasi “Muslim” tidak mengeluarkan hukum. Ia memaparkan teks muktabar dan merujuk semua yang memerlukan fatwa kepada Presidensi Umum Penyelidikan Ilmiah dan Ifta.'
   Problem: Same "Presidensi" issue as referralButton.
   Corrected: 'Aplikasi “Muslim” tidak mengeluarkan hukum. Ia memaparkan teks muktabar dan merujuk semua yang memerlukan fatwa kepada Jabatan Am Penyelidikan Ilmiah dan Ifta.'

8. ms | errRateLimited
   Current: 'Bilangan soalan untuk hari ini telah lengkap; kami gembira menerima soalan anda esok.'
   Problem: "telah lengkap" is a word-for-word copy of "complete" and sounds unnatural for a quota.
   Corrected: 'Had soalan untuk hari ini telah dicapai; kami gembira menerima soalan anda esok.'

9. ms | how4
   Current: 'AI menyusun teks tersebut dan menulis penerangan ringkas daripadanya sahaja, setiap ayat dengan rujukannya.'
   Problem: "ayat" here means "sentence", but in a Quran app it reads as "verse", so the meaning is ambiguous.
   Corrected: 'AI menyusun teks tersebut dan menulis penerangan ringkas daripadanya sahaja, setiap ayat penerangan disertakan rujukannya.'

10. ms | howFoundGenerated
    Current: 'Penjelasan dijana oleh AI daripada bahagian-bahagian ini sahaja, dan setiap ayat merujuk salah satu daripadanya.'
    Problem: It has the same sentence/verse ambiguity in "ayat". It also uses "Penjelasan" where the UI elsewhere uses "Penerangan".
    Corrected: 'Penerangan dijana oleh AI daripada bahagian-bahagian ini sahaja, dan setiap ayat penerangan merujuk salah satu daripadanya.'

11. ms | simplify
    Current: 'Ringkaskan untuk saya'
    Problem: "Ringkaskan" means summarise/shorten, not simplify. It also does not match "dipermudah" in the speakMachine* keys.
    Corrected: 'Permudahkan untuk saya'

12. ms | bookMeta
    Current: '{c} bab · {s} bahagian'
    Problem: In a book, "bahagian" usually means a Part larger than a chapter, so "5 bab · 40 bahagian" is confusing. Passages are called "petikan" elsewhere (reportPrivacy, licensesBody).
    Corrected: '{c} bab · {s} petikan'
    Optionally use "petikan" in the other segment keys too (segmentButton, askAboutSegment, howFoundConsidered, howFoundCounts, bookNotFound).

13. ms | starterCardSub
    Current: 'Sepuluh langkah ringkas. Setiap langkah satu soalan, dijawab daripada sumber yang diiktiraf.'
    Problem: "Approved sources" is "sumber muktabar" everywhere else in the file.
    Corrected: 'Sepuluh langkah ringkas. Setiap langkah satu soalan, dijawab daripada sumber muktabar.'

14. ms | speakFoundBook
    Current: 'Saya menemui teks untuk anda dalam kitab yang diiktiraf. Inilah teksnya dalam bahasa Arab.'
    Problem: Same mismatch: "diiktiraf" instead of "muktabar".
    Corrected: 'Saya menemui teks untuk anda dalam kitab muktabar. Inilah teksnya dalam bahasa Arab.'

15. ms | speakMachineMuyassar
    Current: 'Ini penjelasan mesin yang dipermudah daripada al-Tafsir al-Muyassar.'
    Problem: The spoken label says "penjelasan mesin", but the on-screen label (machineExplanation, explainBoxTitle) is "Penerangan mesin".
    Corrected: 'Ini penerangan mesin yang dipermudah daripada al-Tafsir al-Muyassar.'

16. ms | speakMachinePassage
    Current: 'Ini penjelasan mesin yang dipermudah daripada teks ini.'
    Problem: Same penjelasan/penerangan mismatch.
    Corrected: 'Ini penerangan mesin yang dipermudah daripada petikan ini.'

17. ms | speakMachineAnswer
    Current: 'Ini penjelasan mesin yang dijana daripada teks yang dipaparkan.'
    Problem: Same penjelasan/penerangan mismatch.
    Corrected: 'Ini penerangan mesin yang dijana daripada teks yang dipaparkan.'

MALAY SUMMARY
- Keys reviewed: 253
- Keys with CRITICAL: 0
- Keys with MAJOR: 0
- Keys with MINOR: 17
- Score: 100% (253 of 253 keys have no CRITICAL or MAJOR issue)
- Terminology: The Islamic terms fit Malaysian Muslim usage well (hukum, fatwa, mufti, ulama, isu khilaf, ijtihad, akidah, syariah, tafsir, surah, ayat, hadis, kitab/sumber muktabar, Syeikh, Riyadhus Solihin, asy-Syamilah). The general UI vocabulary is genuinely Malaysian, not Indonesian (Tetapan, Kongsi, pautan, pelayar, peranti, ralat, baharu, Automatik, luar talian, Soalan lazim). The one Indonesian-style item is "Presidensi". I compared against id.ts: the Malay file is an independent Malaysian translation, not a copy of the Indonesian one.

==================== TURKISH (tr) ====================

CRITICAL: none
MAJOR: none

MINOR:

1. tr | badgeVerified
   Current: 'Kaynakla uyumlu'
   Problem: "uyumlu" means "compatible/consistent with", which is weaker than the exact character-by-character match the badge certifies. This string also feeds {badge} in howFoundVerbatim.
   Corrected: 'Kaynakla birebir aynı'

2. tr | abstainBody
   Current: 'Onaylı kaynaklarda sorunuzla eşleşen bir metin bulamadım ve kendiliğimden metin üretmem.'
   Problem: "kendiliğimden" means "of my own accord / spontaneously", which suggests text could be produced if asked. The source means "I don't create texts of my own" (من عندي).
   Corrected: 'Onaylı kaynaklarda sorunuzla eşleşen bir metin bulamadım ve kendimden metin üretmem.'

3. tr | simpleMode
   Current: 'İslam’a yeni olanlar için sade açıklama'
   Problem: This is a word-for-word copy of "new to Islam" and is unnatural in Turkish.
   Corrected: 'İslam’ı yeni tanıyanlar için sade açıklama'

4. tr | simpleModeHint
   Current: 'Bunu siz seçersiniz; geçmişinizi asla tahmin etmeyiz.'
   Problem: "geçmişiniz" reads as "your past/history", which sounds odd and a little intrusive here.
   Corrected: 'Bunu siz seçersiniz; sizin hakkınızda asla tahminde bulunmayız.'

5. tr | demoTitle
   Current: 'Deneme soruları'
   Problem: In Turkish, "deneme soruları" usually means practice-exam questions.
   Corrected: 'Örnek sorular'

6. tr | starterCardTitle
   Current: "İslam'a yeni mi başladınız? Buradan başlayın"
   Problem: "İslam'a başlamak" is not idiomatic, because Islam is not an activity one "starts". "başladınız / başlayın" is also repetitive.
   Corrected: "İslam'ı yeni mi tanıyorsunuz? Buradan başlayın"

7. tr | bookMeta
   Current: '{c} bölüm · {s} kısım'
   Problem: "bölüm" and "kısım" are near-synonyms, so the two counts are unclear. Passages are called "pasaj" elsewhere (reportPrivacy, licensesBody).
   Corrected: '{c} bölüm · {s} pasaj'
   Optionally use "pasaj" in the other segment keys too.

8. tr | howFoundLevel
   Current: 'Soru düzeyi: {level}.'
   Problem: It uses "düzey", while levelA–D and levelsTitle use "Seviye".
   Corrected: 'Soru seviyesi: {level}.'

9. tr | shurutNote
   Current: 'Bu sayım risaledeki gibidir; âlimlerin bazı ayrıntılarında başka görüşleri de vardır.'
   Problem: The word order makes the reader first parse "âlimlerin bazı ayrıntıları" as "the scholars' details".
   Corrected: 'Bu sayım risaledeki gibidir; bazı ayrıntılarında âlimlerin başka görüşleri de vardır.'

10. tr | speakFoundBook
    Current: 'Sizin için kabul görmüş bir kitapta bir metin buldum. İşte Arapça metni.'
    Problem: "Approved" is "onaylı" everywhere else in the file.
    Corrected: 'Sizin için onaylı bir kitapta bir metin buldum. İşte Arapça metni.'

11. tr | how5
    Current: 'Orijinal metni veritabanımızdan harfi harfine, referansı ve bağlantısıyla gösteririz.'
    Problem: It spells "veritabanı" here but "veri tabanı" in howFoundVerbatim. TDK uses "veri tabanı".
    Corrected: 'Orijinal metni veri tabanımızdan harfi harfine, referansı ve bağlantısıyla gösteririz.'

TURKISH SUMMARY
- Keys reviewed: 253
- Keys with CRITICAL: 0
- Keys with MAJOR: 0
- Keys with MINOR: 11
- Score: 100% (253 of 253 keys have no CRITICAL or MAJOR issue)
- Terminology: It fits Turkish (Diyanet-style) Muslim usage very well: ayet, sure, tefsir, meal, fetva, müftü, âlim, ihtilaflı mesele, içtihat, akaid/akide, şer'î, tilavet, and "İslam'ın şartları" for the pillars. Names use standard Turkish transliterations (Buhârî, Müslim, Riyâzü's-Sâlihîn, et-Tefsîru'l-Müyesser, İbn Bâz, İbn Useymîn, el-Mektebetü'ş-Şâmile, İlmî Araştırmalar ve İfta Genel Başkanlığı).

==================== NOTES ====================

- One check depends on code that was not uploaded. Several Turkish strings put an ordinal after the placeholder: "{n}. sure", "{s}. sure, {a}. ayet", "{sura}. sure, {aya}. ayet", "{s}. surenin {a}. ayeti". These are only correct if the placeholders receive numbers. That looks right: CLAUDE.md treats sura/aya as numeric database columns, and ar.ts uses a separate {name} for the surah name. If a surah name were ever passed in, these Turkish strings would break.
- The app name "Muslim" is kept as a brand in both files, matching English.
