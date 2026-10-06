Review of en.ts and ar.ts for «مسلم». I read all 253 keys in each file; both files have the same keys in the same order. I also checked the uploaded CLAUDE.md, DEMO_SCRIPT.md and two answer screenshots to see which strings are conditional. The component code isn't in the upload, so where a string's display condition couldn't be confirmed, I say so. Where a problem sits between the two files (a mismatch), I counted it against the language that drifted from the shared meaning, so it is counted once.

Mechanical checks:
- Latin letters inside Arabic: only logoI «شعار i», which is the allowed logo exception.
- ASCII digits in Arabic: none. ٥٠٠, ٠٫١, ٢:٢٥٥ and ٣٠ are all Arabic-Indic.
- Placeholder mismatches between files: 2 (ayahSheetTitle, askAboutAyahDraft).
- Hamza, ta marbuta and tanween: no errors found. مفتٍ, جارٍ, نصًا, ميكروفونًا, عشر خطوات and عشر لغات are all correct.

==================================================
CRITICAL (false claims about the app)
==================================================

1. Language: en + ar | Keys: srcHadith, srcHadithBy
   Current en: "Hadith" / "Bukhari · Muslim · Riyad as-Salihin · The Forty"
   Current ar: «الحديث» / «البخاري · مسلم · رياض الصالحين · الأربعون»
   Problem: Hadith is listed under "Approved sources" but is not indexed (DEMO_SCRIPT.md also says it has not been fetched yet), so this says answers come from Bukhari and Muslim when they don't. The book names are also incomplete: "The Forty"/«الأربعون» and "Bukhari · Muslim" without «صحيح».
   Conditional? It sits in the static Approved Sources list, and no condition is visible.
   Corrected: Remove both rows until hadith is indexed. If a placeholder row is wanted:
     en: "Hadith (not yet added)" / "Planned: Sahih al-Bukhari · Sahih Muslim · Riyad as-Salihin · al-Nawawi's Forty Hadith"
     ar: «الحديث (لم يُضَف بعد)» / «مخطَّط: صحيح البخاري · صحيح مسلم · رياض الصالحين · الأربعون النووية»

2. Language: en + ar | Keys: srcFatwa, srcFatwaBy
   Current en: "Official fatwas" / "Ifta · Ibn Baz · Ibn Uthaymeen"
   Current ar: «الفتاوى الرسمية» / «الإفتاء · ابن باز · ابن عثيمين»
   Problem: Fatwas are listed as an approved answer source, and naming Ibn Baz and Ibn Uthaymeen suggests their fatwas are quoted. In fact the app only refers fatwa questions to the General Presidency, and this contradicts "not a fatwa / not a mufti".
   Conditional? It sits in the static Approved Sources list.
   Corrected: Take it out of "Approved sources" and relabel it as the referral body:
     en: "Referral authority for fatwa questions" / "General Presidency of Scholarly Research and Ifta — referral only, not quoted in answers"
     ar: «جهة الإحالة في أسئلة الفتوى» / «الرئاسة العامة للبحوث العلمية والإفتاء — للإحالة فقط، ولا يُنقل منها في الإجابات»

3. Language: en + ar | Key: teamReview
   Current en: "Sharia review" | ar: «المراجعة الشرعية»
   Problem: The Team section lists a sharia-review role, but there is no sharia reviewer, so it implies a review that doesn't happen.
   Conditional? As a Team-section label it is presumably always shown; I couldn't confirm this from code.
   Corrected: Delete the row. If something must be said: en "No Sharia reviewer yet" | ar «لا يوجد مراجع شرعي بعد»

==================================================
MAJOR
==================================================

4. Language: en + ar | Key: sourcesIntro
   Current en: "...AI is used only to rank the retrieved texts and explain them."
   Current ar: «...دور الذكاء الاصطناعي ترتيب النصوص المسترجعة وشرحها فقط.»
   Problem: "Only" understates what the AI does. aiBody in the same file says bge-m3 (an AI model) finds the texts, and the AI also sets the question level, judges whether the texts answer the question, and turns voice into text.
   Corrected:
     en: "AI helps find and rank the texts, sets the question level, explains the texts and turns voice into text; it never writes or edits a religious text."
     ar: «يُستعمل الذكاء الاصطناعي في البحث عن النصوص وترتيبها، وتحديد مستوى السؤال، وشرح النصوص، وتحويل الصوت إلى نص؛ ولا يكتب نصًا شرعيًا ولا يعدّله.»

5. Language: en + ar | Key: aiBody
   Problem: The AI disclosure leaves out the speech-to-text model behind "Ask by voice". The strings voiceTranscribing, voiceLimit and voiceTooLong show transcription happens on the server, and CLAUDE.md names Workers AI Whisper.
   Corrected (append; check the model name against the worker config first):
     en: "Voice questions are turned into text by Whisper on Cloudflare Workers AI."
     ar: «ويحوّل نموذج «ويسبر» على «كلاودفلير» الأسئلة الصوتية إلى نص.»

6. Language: en | Key: askScholar
   Current en: "Ask a scholar" | ar: «اسأل مختصًا»
   Problem: The two languages don't match ("scholar" vs "specialist"). The English also suggests direct access to a scholar, while the app's own term everywhere else is "the qualified authority".
   Corrected: en "Ask the qualified authority" | ar, for consistency: «اسأل الجهة المختصة»

7. Language: ar | Key: meaningAyah
   Current ar: «معنى الآية بالإنجليزية» | en: "Meaning in English · Sahih International"
   Problem: The Arabic drops the translation's source (Sahih International), which the English shows.
   Corrected ar: «معنى الآية بالإنجليزية · ترجمة صحيح إنترناشيونال»

8. Language: ar | Key: meaningHadith (only shown with a hadith, so not currently visible)
   Current ar: «ترجمة الحديث بالإنجليزية» | en: "Translation · sunnah.com"
   Problem: The Arabic drops the source (sunnah.com), and the English lacks "hadith" and "English".
   Corrected ar: «ترجمة الحديث بالإنجليزية · موقع «سُنّة دوت كوم»» | en: "English translation of the hadith · sunnah.com"

9. Language: ar (affects en too) | Keys: ayahSheetTitle, askAboutAyahDraft
   Current ar: «{name}: {a}» and «ما معنى الآية {a} من سورة {name}؟» | en uses {s} and {a}
   Problem: The placeholder names differ, and the type check doesn't catch it. Unless the component passes both s and name, one language will show a raw "{name}" or "{s}" to the user.
   Corrected: Use the same names in both files, e.g. ar «سورة {s}، الآية {a}» and «ما معنى الآية {a} من سورة {s}؟», or change en to {name}.

10. Language: ar | Key: howFoundVerbatim
    Current ar: «...بحروفها كما نُزّلت من مصدرها...»
    Problem: «نُزِّلت» is the verb used for divine revelation. In an Islamic app it reads as "as they were revealed", applied to tafsir, translations and books. "Downloaded" is the intended meaning.
    Corrected ar: «النصوص المعروضة من قاعدة بياناتنا بحروفها كما نُقلت من مصدرها، وتظهر شارة «{badge}» بعد مطابقتها.»

==================================================
MINOR
==================================================

Arabic:
11. tagline: «مساعد معرفي موثَّق»
    Problem: «موثَّق» describes the assistant rather than the knowledge, and it doesn't match en "Sourced knowledge".
    Corrected: «معرفة موثَّقة»
12. aboutLanguages: «صحيح إنترناشونال»
    Problem: speakMeaningEn spells it «إنترناشيونال».
    Corrected: Use «صحيح إنترناشيونال» in both.
13. saadiEmpty: «...في المصدر»
    Problem: The final full stop is missing (en has one).
    Corrected: «لا يوجد تفسير للسعدي لهذه الآية في المصدر.»
14. voiceTranscribing: «جارٍ التحويل…»
    Problem: Vague ("converting"); en says "Transcribing".
    Corrected: «جارٍ تحويل الصوت إلى نص…»
15. iosStep1: «اضغط زر المشاركة أسفل المتصفح»
    Problem: Drops "Safari", which en names.
    Corrected: «اضغط زر المشاركة أسفل متصفح «سفاري»»
16. demoAbstain: «لا يوجد نص (اعتذار)»
    Problem: Drops "matching", so it overstates (en: "No matching text").
    Corrected: «لا يوجد نص مطابق (اعتذار)»
17. privacyBody: «فيرون عنوان الإنترنت لجهازك كأي موقع تزوره»
    Problem: Imprecise term for IP address, and the added clause «كأي موقع تزوره» isn't in en.
    Corrected: «فيرون عنوان بروتوكول الإنترنت لجهازك» (or add the clause to en as well).
18. askAboutBookDraft: «ما الذي يعلّمه كتاب {book}؟»
    Problem: For «كتاب التوحيد» this produces «كتاب كتاب التوحيد».
    Corrected: «ما الذي يعلّمه «{book}»؟»
19. speakMuyassar, speakMachineMuyassar: «التفسير الميسر»
    Problem: These strings are read aloud by the browser voice. Without a shadda, «الميسر» can be voiced as al-maysir (gambling).
    Corrected: «التفسير الميسَّر:» and «هذا شرح آلي مبسّط من التفسير الميسَّر.»
20. srcQuranBy: «مشروع آيات»
    Problem: readerSourceNote calls the same source «مشروع المصحف الإلكتروني».
    Corrected: «مشروع المصحف الإلكتروني (آيات)، جامعة الملك سعود»

English:
21. badgeReviewed: "Approved by Sharia reviewer"
    Problem: Missing article. (On truthfulness, see note A below.)
    Corrected: "Approved by a Sharia reviewer"
22. copyWithRef: "Copy with source"
    Problem: ar and the key name say "reference".
    Corrected: "Copy with reference"
23. errRateLimited: "Today's questions are complete."
    Problem: Unnatural English.
    Corrected: "You've reached today's question limit. We'd be glad to have your question tomorrow."
24. errBadInput: "A question can hold up to 500 characters"
    Problem: "Hold" is awkward.
    Corrected: "A question can be up to 500 characters; you could shorten it a little."
25. srcAqeedah: "Creed and fundamentals"
    Problem: tabBooks uses "Aqeedah" for the same thing.
    Corrected: "Aqeedah (creed) and fundamentals"
26. srcAqeedahBy: "Al-Maktaba al-Shamela"
    Problem: booksSourceNote spells it "al-Maktaba al-Shamila".
    Corrected: "Al-Maktaba al-Shamila"
27. tafsirMuyassar, muyassarSource: "Tafsir al-Muyassar"
    Problem: Five other keys use "al-Tafsir al-Muyassar", which is the correct form (noun and adjective, not a possessive phrase).
    Corrected: "al-Tafsir al-Muyassar" / "al-Tafsir al-Muyassar source (project file) ↗"
28. how4: "...citing each sentence."
    Problem: Reads as if the AI cites the sentences themselves.
    Corrected: "...with a citation for every sentence."
29. starterRead: "Read"
    Problem: Could be read as a button; ar «قُرئت» is a status.
    Corrected: "Already read"
30. privacyBody: «Listen»
    Problem: Arabic guillemets used in English.
    Corrected: "Listen" in English quotation marks.
31. aboutLanguages: "The meaning of the verses"
    Problem: The rest of the displayed English uses "ayah/ayat".
    Corrected: "The meaning of the ayat in English..."
32. srcQuranBy: "Ayat project, King Saud University"
    Problem: readerSourceNote calls the same source the "Mushaf project".
    Corrected: "Electronic Mushaf project (Ayat), King Saud University"

==================================================
CONDITIONAL STRINGS (not counted as false claims)
==================================================
A. badgeReviewed (en + ar): Per project rule 9 it only appears when a review record exists, and it doesn't appear in the answer screenshots. With no reviewer there should be no records, so nothing false is shown today. Any record created by mistake would make it false, so turn the badge off in code until a reviewer exists.
B. meaningHadith and speakHadithSlot: These only appear with a hadith passage, and none are indexed, so they never show. The wording itself is not false.
C. logoI «شعار i»: The allowed Latin exception for the logo.

==================================================
COULDN'T CHECK FROM THESE FILES (not counted)
==================================================
- privacyBody and aiBody say DeepSeek runs on Cloudflare Workers AI and that the question "is not sent to DeepSeek's servers". The uploaded CLAUDE.md still lists baseUrl https://api.deepseek.com. If production still calls api.deepseek.com, privacyBody is a CRITICAL false privacy claim in both languages. Check worker/src/config/llm.json before release.
- Whether srcHadith, srcFatwa and teamReview are really always shown couldn't be confirmed, because the components aren't in the upload.
- tafsirInArabic and booksInArabic are deliberately empty in ar. That's fine as long as the UI doesn't render an empty element.
- How numbers inside placeholders are formatted is decided in code. The screenshot shows Arabic-Indic digits (قريش: ٣) for ayah references.

==================================================
SUMMARY
==================================================
English (en.ts): 253 keys reviewed
  CRITICAL: 5 keys (srcHadith, srcHadithBy, srcFatwa, srcFatwaBy, teamReview)
  MAJOR: 3 keys (sourcesIntro, aiBody, askScholar)
  MINOR: 13 keys
  Keys with a CRITICAL or MAJOR issue: 8
  Score: 245/253 = 96.8%

Arabic (ar.ts): 253 keys reviewed
  CRITICAL: 5 keys (srcHadith, srcHadithBy, srcFatwa, srcFatwaBy, teamReview)
  MAJOR: 7 keys (sourcesIntro, aiBody, meaningAyah, meaningHadith, ayahSheetTitle, askAboutAyahDraft, howFoundVerbatim)
  MINOR: 11 keys
  Latin letters inside Arabic sentences: 0 (besides logoI)
  Keys with a CRITICAL or MAJOR issue: 12
  Score: 241/253 = 95.3%

Both files are clean overall: the Arabic grammar and spelling are sound and the house rules on Latin letters and digits are followed. All of the serious problems are about what the app says it does: three rows in the Sources and Team sections claim hadith, fatwa sources and sharia review that don't exist. Removing or relabelling those five keys is the priority. No source files were modified.
