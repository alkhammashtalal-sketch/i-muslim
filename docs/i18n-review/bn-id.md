Both translations are in good shape. Bengali has 0 critical and 3 major problems. Two of the majors are the same mistake: the referral authority is called "scientific research", when the Arabic «العلمية» here means Islamic scholarship. Indonesian has 0 critical and 0 major problems; its issues are wording and consistency only.

I read all four files in full and checked every key. Each file has 253 keys, the same as en.ts, with no keys missing or extra. Every placeholder ({n}, {s}, {a}, {ref}, {book}, {chapter}, {source}, {badge}, {level}, {from}, {to}, {m}, {c}, {page}, {name}, {sura}, {aya}) matches en.ts in both files, and no key is left in untranslated English. en.ts has no {reciter} key. Each key below is counted once, under its most severe problem. No files were modified.

====================================================================
BENGALI (bn.ts)
====================================================================

CRITICAL: none.

MAJOR

1. bn / referralButton
   Current:   বৈজ্ঞানিক গবেষণা ও ইফতা সাধারণ অধিদপ্তর
   Problem:   «البحوث العلمية» is translated as "scientific research" (বৈজ্ঞানিক), which is the wrong name for the referral authority; it means Islamic scholarship (ilm).
   Corrected: ইলমি গবেষণা ও ইফতা বিষয়ক জেনারেল প্রেসিডেন্সি

2. bn / notMuftiBody
   Current:   Muslim অ্যাপ কোনো রায় দেয় না। এটি অনুমোদিত পাঠ দেখায় এবং ফতোয়া প্রয়োজন এমন সবকিছু বৈজ্ঞানিক গবেষণা ও ইফতা সাধারণ অধিদপ্তরে পাঠায়।
   Problem:   Same wrong authority name ("scientific research") in the key statement that the app is not a mufti.
   Corrected: Muslim অ্যাপ কোনো রায় দেয় না। এটি অনুমোদিত পাঠ দেখায় এবং ফতোয়া প্রয়োজন এমন সবকিছু ইলমি গবেষণা ও ইফতা বিষয়ক জেনারেল প্রেসিডেন্সিতে পাঠায়।

3. bn / shurutNote
   Current:   এই গণনা রিসালাহ অনুযায়ী; এর কিছু খুঁটিনাটিতে আলেমদের অন্য মতও রয়েছে।
   Problem:   With no "this/the", «রিসালাহ» reads like a proper noun. A reader can take it as "the Risalah" (prophethood/the Message, or al-Shafi'i's book), not "this treatise". That gives this required caveat the opposite effect.
   Corrected: এই তালিকাটি সংশ্লিষ্ট পুস্তিকা (রিসালাহ) অনুযায়ী; এর কিছু খুঁটিনাটিতে আলেমদের অন্য মতও রয়েছে।

MINOR

4. bn / srcQuran
   Current:   কুরআন ও তার তাফসির
   Problem:   Spelled তাফসির here, but তাফসীর in tafsirMuyassar, saadiRange, tafsirInArabic and others.
   Corrected: কুরআন ও তার তাফসীর

5. bn / tafsirFrom
   Current:   ব্যবহৃত তাফসির
   Problem:   Same তাফসির/তাফসীর spelling inconsistency.
   Corrected: ব্যবহৃত তাফসীর

6. bn / srcAqeedah
   Current:   আকিদা ও মৌলিক বিষয়
   Problem:   Spelled আকিদা here but আকীদার in tabBooks.
   Corrected: আকীদা ও মৌলিক বিষয়

7. bn / booksSourceNote
   Current:   শায়খ মুহাম্মাদ ইবনে আব্দুল ওয়াহহাবের, আল-মাকতাবা আশ-শামেলা থেকে, অপরিবর্তিত, প্রতিটি পৃষ্ঠার লিংকসহ।
   Problem:   Incomplete phrase ("of Shaykh …" with no noun). শামেলা also differs from শামিলা in srcAqeedahBy.
   Corrected: শায়খ মুহাম্মাদ ইবনে আব্দুল ওয়াহহাবের রচনা, আল-মাকতাবা আশ-শামিলা থেকে, অপরিবর্তিত, প্রতিটি পৃষ্ঠার লিংকসহ।

8. bn / readerSourceNote
   Current:   কুরআনের পাঠ বাদশাহ সৌদ বিশ্ববিদ্যালয়ের মুসহাফ প্রকল্প থেকে, অপরিবর্তিত।
   Problem:   Says বাদশাহ সৌদ, but srcQuranBy says কিং সৌদ for the same university.
   Corrected: কুরআনের পাঠ কিং সৌদ বিশ্ববিদ্যালয়ের মুসহাফ প্রকল্প থেকে, অপরিবর্তিত।

9. bn / before
   Current:   আগে
   Problem:   On its own this means "earlier/first". The button actually shows the preceding passage (ar: ما قبله).
   Corrected: আগের অংশ

10. bn / after
   Current:   পরে
   Problem:   On its own this means "later". The button actually shows the following passage (ar: ما بعده).
   Corrected: পরের অংশ

11. bn / how3
   Current:   আমরা অনুমোদিত উৎসে সবচেয়ে কাছের পাঠ খুঁজি।
   Problem:   "সবচেয়ে কাছের" means physically nearest. The intended sense is "most relevant".
   Corrected: আমরা অনুমোদিত উৎসে সবচেয়ে প্রাসঙ্গিক পাঠ খুঁজি।

12. bn / levelCDesc
   Current:   মতভেদ বা ইজতিহাদের বিষয় — রেফার করা হয়, উত্তর নয়।
   Problem:   "উত্তর নয়" ("not answer") is ungrammatical; it should say "is not answered".
   Corrected: মতভেদ বা ইজতিহাদের বিষয় — রেফার করা হয়, উত্তর দেওয়া হয় না।

13. bn / levelDDesc
   Current:   ব্যক্তিগত বিষয় বা ফতোয়া — রেফার করা হয়, উত্তর নয়।
   Problem:   Same grammar problem as levelCDesc.
   Corrected: ব্যক্তিগত বিষয় বা ফতোয়া — রেফার করা হয়, উত্তর দেওয়া হয় না।

14. bn / howFoundConsidered
   Current:   যাচাই করা অংশগুলো
   Problem:   "যাচাই" is the word used for verification (loadingVerify). Here it suggests every examined passage, including unused ones, was verified.
   Corrected: বিবেচিত অংশগুলো

15. bn / howFoundCounts
   Current:   যাচাই করা অংশ: {n}। ব্যবহৃত: {m}।
   Problem:   Same "examined" vs "verified" mix-up as howFoundConsidered.
   Corrected: বিবেচিত অংশ: {n}। ব্যবহৃত: {m}।

16. bn / reportPrivacy
   Current:   আমরা কেবল অনুচ্ছেদ নম্বর ও কারণ পাঠাই — আপনার প্রশ্ন বা কোনো ব্যক্তিগত তথ্য নয়।
   Problem:   "Passage" is অনুচ্ছেদ here but অংশ in bookMeta, segmentButton and howFound* (ar uses مقطع throughout).
   Corrected: আমরা কেবল অংশের নম্বর ও কারণ পাঠাই — আপনার প্রশ্ন বা কোনো ব্যক্তিগত তথ্য নয়।

17. bn / licensesBody
   Current:   … ধর্মীয় পাঠ তাদের উৎসের এবং লিংকসহ অনুচ্ছেদ ধরে দেখানো হয়।
   Problem:   "তাদের উৎসের" is awkward for things (not people), and অনুচ্ছেদ is inconsistent with অংশ.
   Corrected: প্রকল্পের কোড MIT লাইসেন্সের অধীনে। ফন্ট: IBM Plex Sans Arabic ও Amiri (SIL Open Font License)। ধর্মীয় পাঠগুলো নিজ নিজ উৎসের, এবং প্রতিটি অংশ আলাদাভাবে লিংকসহ দেখানো হয়।

18. bn / simplify
   Current:   আমার জন্য সহজ করুন
   Problem:   Reads like a prayer ("make it easy for me"), not "simplify the text for me".
   Corrected: সহজ করে বুঝিয়ে দিন

19. bn / voiceLimit
   Current:   আজকের রেকর্ডিং শেষ হয়েছে; আপনি প্রশ্নটি লিখতে পারেন।
   Problem:   Reads as "today's recording has finished", not "today's recording limit is used up".
   Corrected: আজকের রেকর্ডিংয়ের সীমা শেষ হয়েছে; আপনি প্রশ্নটি লিখতে পারেন।

Not counted as problems:
- "Muslim" in Latin letters in appName, assistant, aboutTitle and the body texts: this is the brand name, and hi.ts does the same.
- Latin "2:255" in the search placeholder and "0.1" in the version line.
- Transliterated "সহীহ ইন্টারন্যাশনাল" in the spoken lines: correct for text-to-speech.
- "রায়", "সরকারি", "স্তম্ভ", "ব্যক্তিগত বিষয়": acceptable as written.

BENGALI SUMMARY
Keys reviewed: 253
Keys with CRITICAL: 0 | MAJOR: 3 | MINOR: 16 | no issue: 234
Score (no CRITICAL or MAJOR): 250/253 = 98.8%
Terminology: fits Bengali Muslim usage well (আয়াত, সূরা, তাফসীর, হাদিস, আকীদা, ইবাদত, ফতোয়া, মুফতি, আলেম, ইজতিহাদ, মুসহাফ, তিলাওয়াত, শায়খ, কিতাব, শরিয়াহ). The only faults are spelling inconsistencies and "বৈজ্ঞানিক" used for the scholarly authority.

====================================================================
INDONESIAN (id.ts)
====================================================================

CRITICAL: none.
MAJOR: none.

MINOR

Items 1–8 share one cause. "Approved" (ar: معتمد) is translated as "resmi" ("official") in 8 keys but as "yang diakui" in starterCardSub and speakFoundBook. "Resmi" also overstates the claim: Tafsir al-Sa'di or al-Maktabah asy-Syamilah are not "official". The fix is to use "yang diakui" everywhere (or "muktabar", as ms.ts does). Keys where "resmi" correctly means "official" are fine and stay as they are: srcFatwa "Fatwa resmi" and referralBody "lembaga resmi".

1. id / welcomeSub
   Current:   Saya menampilkan teks dari sumber resminya, beserta rujukan dan tautannya.
   Corrected: Saya menampilkan teks dari sumbernya yang diakui, beserta rujukan dan tautannya.
2. id / disclaimer
   Current:   Jawaban ini diambil dari sumber resmi dan bukan fatwa.
   Corrected: Jawaban ini diambil dari sumber yang diakui dan bukan fatwa.
3. id / abstainTitle
   Current:   Tidak ada teks resmi
   Corrected: Tidak ada teks dari sumber yang diakui
4. id / abstainBody
   Current:   Saya tidak menemukan teks dalam sumber resmi yang sesuai dengan pertanyaan Anda, dan saya tidak membuat teks sendiri.
   Corrected: Saya tidak menemukan teks yang sesuai dengan pertanyaan Anda dalam sumber yang diakui, dan saya tidak membuat teks sendiri.
5. id / sourcesIntro
   Current:   … Ia hanya menjawab dari teks resmi; …
   Corrected: Aplikasi “Muslim” adalah asisten pengetahuan berbasis sumber, bukan mufti. Ia hanya menjawab dari teks sumber yang diakui; jika tidak ada teks, ia menolak dan merujuk ke lembaga berwenang. AI hanya mengurutkan teks yang ditemukan dan menjelaskannya.
6. id / approvedSources
   Current:   Sumber resmi
   Corrected: Sumber yang diakui
7. id / how3
   Current:   Kami mencari teks terdekat di sumber resmi.
   Problem:   Also, "terdekat" means physically nearest; the intended sense is "most relevant".
   Corrected: Kami mencari teks yang paling relevan di sumber yang diakui.
8. id / notMuftiBody
   Current:   … Ia menampilkan teks resmi dan merujuk …
   Corrected: Aplikasi “Muslim” tidak mengeluarkan hukum. Ia menampilkan teks dari sumber yang diakui dan merujuk semua yang memerlukan fatwa ke Kepresidenan Umum Riset Ilmiah dan Ifta.

9. id / welcomeTitle
   Current:   Tanyakan tentang Islam, rukun, dan ibadahnya
   Problem:   "-nya" is attached only to the last word. "Islam, rukun" can also be misread as "Islam, harmony", since rukun also means harmonious.
   Corrected: Tanyakan tentang Islam, rukun-rukunnya, dan ibadahnya

10. id / levelA
   Current:   Tingkat A · Informasi baku
   Problem:   "baku" means "standard". It loses the sense of "settled / established" (مستقرة).
   Corrected: Tingkat A · Informasi mapan

11. id / levelADesc
   Current:   Informasi baku — dijawab dari teks.
   Problem:   Same as levelA.
   Corrected: Informasi yang sudah mapan — dijawab dari teks.

12. id / referralBody
   Current:   Aplikasi “Muslim” tidak memberi hukum atas kasus perorangan. …
   Problem:   "memberi hukum" is not idiomatic; the usual phrase is "menetapkan hukum".
   Corrected: Aplikasi “Muslim” tidak menetapkan hukum atas kasus perorangan. Anda dapat mengajukan pertanyaan kepada lembaga resmi yang berwenang.

13. id / srcAqeedah
   Current:   Akidah dan dasar-dasar
   Problem:   "dasar-dasar" ("basics") is left hanging; basics of what?
   Corrected: Akidah dan pokok-pokok agama

14. id / reportPrivacy
   Current:   Kami hanya mengirim nomor kutipan dan alasannya — …
   Problem:   "Passage" is "kutipan" here but "bagian" in bookMeta, segmentButton and howFound* (ar uses مقطع throughout).
   Corrected: Kami hanya mengirim nomor bagian dan alasannya — bukan pertanyaan Anda atau data pribadi.

15. id / licensesBody
   Current:   … ditampilkan per kutipan dengan tautan.
   Problem:   Same "kutipan" vs "bagian" inconsistency.
   Corrected: Kode proyek berlisensi MIT. Fon: IBM Plex Sans Arabic dan Amiri (SIL Open Font License). Teks keagamaan milik sumbernya dan ditampilkan per bagian dengan tautan.

16. id / iosStep2
   Current:   Pilih “Tambahkan ke Layar Utama”
   Problem:   As far as I know, the Indonesian iOS share-sheet label is "Tambah ke Layar Utama"; worth confirming on a device.
   Corrected: Pilih “Tambah ke Layar Utama”

17. id / explainBoxTitle
   Current:   Penjelasan mesin sederhana dari Tafsir al-Muyassar
   Problem:   Word order can be parsed as "explanation of a simple machine".
   Corrected: Penjelasan sederhana oleh mesin dari Tafsir al-Muyassar

18. id / explainFrom
   Current:   Penjelasan mesin sederhana dari {source}
   Problem:   Same word-order ambiguity.
   Corrected: Penjelasan sederhana oleh mesin dari {source}

19. id / aboutLanguages
   Current:   … dan penjelasan selain bahasa Arab dan Inggris adalah terjemahan mesin.
   Problem:   Says "explanations other than Arabic and English", missing "in languages".
   Corrected: Antarmuka tersedia dalam sepuluh bahasa, dan Anda dapat bertanya dalam bahasa apa pun; makna ayat dalam bahasa Inggris berasal dari terjemahan Sahih International, dan penjelasan dalam bahasa selain Arab dan Inggris adalah terjemahan mesin.

20. id / shurutNote
   Current:   Rincian ini sesuai dengan risalah tersebut; para ulama memiliki pendapat lain dalam sebagian rinciannya.
   Problem:   "rincian … rinciannya" repeats the same word, and "rincian" is not quite "enumeration".
   Corrected: Penyebutan ini mengikuti risalah tersebut; para ulama memiliki pendapat lain dalam sebagian rinciannya.

Not counted as problems:
- "luring" (offline): the standard term, widely known in Indonesia.
- "-ku" in explainMine and simplify: a common Indonesian style for buttons in the user's voice.
- "Kepresidenan Umum Riset Ilmiah dan Ifta": "ilmiah" correctly carries the scholarly sense in Indonesian.
- Dropping "Holy" in readQuran and tabQuran: normal Indonesian usage.

INDONESIAN SUMMARY
Keys reviewed: 253
Keys with CRITICAL: 0 | MAJOR: 0 | MINOR: 20 (8 of them are the single "resmi" issue) | no issue: 233
Score (no CRITICAL or MAJOR): 253/253 = 100%
Terminology: fits Indonesian Muslim usage very well (rukun, ibadah, ayat, surah, tafsir, hadis, akidah, ulama, ijtihad, syariah, tilawah, mushaf, kitab, Syaikh, risalah). "Masalah khilafiyah" for scholarly difference is a particularly good native choice.

====================================================================
One observation outside the bn/id scope: ar.ts uses {name} in ayahSheetTitle and askAboutAyahDraft, while en, bn and id use {s}. The component code wasn't in the upload, so I couldn't check which placeholder the code fills in.

Files reviewed:
/mnt/user-data/uploads/i-muslim/web/src/i18n/en.ts
/mnt/user-data/uploads/i-muslim/web/src/i18n/ar.ts
/mnt/user-data/uploads/i-muslim/web/src/i18n/bn.ts
/mnt/user-data/uploads/i-muslim/web/src/i18n/id.ts
