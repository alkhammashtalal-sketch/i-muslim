I reviewed all 253 keys in each file and found no CRITICAL issues. French and Spanish each have 2 keys with a MAJOR problem. French has 16 keys with MINOR issues and Spanish has 13. The placeholders in both files match en.ts exactly; I checked this with a script. No key named {reciter} exists in these files. No English text is left untranslated: the strings identical to English are names or words that are the same in both languages (Muslim, Mushaf, Sources, Hadith, Auto, Page {n}, p. {n}). No files were modified.

FRENCH (fr.ts)

CRITICAL: none.

MAJOR
1. fr | levelCDesc
   Current: Divergence savante ou ijtihad — orientée, sans réponse.
   Problem: Without "vers …", "orientée" does not clearly say "referred" and can read as "biased". It also agrees with "divergence", not with the question.
   Fix: Divergence entre savants ou ijtihad — question renvoyée vers l’autorité compétente, sans réponse.
2. fr | levelDDesc
   Current: Cas personnel ou fatwa — orientée, sans réponse.
   Problem: Same problem. "orientée" agrees with neither noun ("cas" is masculine), so it is unclear that the question is referred.
   Fix: Cas personnel ou fatwa — question renvoyée vers l’autorité compétente, sans réponse.

MINOR
3. fr | notMuftiBody
   Current: L’application Muslim n’émet pas de jugements. … vers la Présidence générale de la recherche scientifique et de l’Ifta.
   Problem: "n’émet pas de jugements" can read as "does not judge (people)" rather than "does not issue rulings". It also has the same institution-name issue as item 11.
   Fix: L’application Muslim ne rend aucun avis juridique. Elle affiche des textes approuvés et oriente tout ce qui nécessite une fatwa vers la Présidence générale des recherches scientifiques et de l’Ifta.
4. fr | levelB
   Current: Niveau B · Nécessite des détails
   Problem: It reads as if the user must supply more details. The Arabic تحتاج تفصيلًا means the answer needs elaboration from the text.
   Fix: Niveau B · Nécessite une explication détaillée
5. fr | levelBDesc
   Current: Information nécessitant des détails — réponse à partir du texte.
   Problem: It leaves out "from the text" and has the same ambiguity as levelB.
   Fix: Information qui nécessite une explication détaillée tirée du texte — réponse à partir du texte.
6. fr | levelC
   Current: Niveau C · Divergence savante
   Problem: As an adjective, "savante" means "erudite", so this is a calque. The usual phrase is "divergence entre savants".
   Fix: Niveau C · Divergence entre savants
7. fr | footer
   Current: Assistant de connaissance fondé sur les sources · pas un mufti · assisté par IA
   Problem: "fondé sur" means "based on", which loses "source-bound" (restricted to the sources). "connaissance" should be plural.
   Fix: Assistant de connaissances limité aux sources · pas un mufti · assisté par IA
8. fr | badgeReviewed
   Current: Approuvé par le réviseur religieux
   Problem: "Sharia reviewer" (المراجع الشرعي) becomes the generic "religious reviewer", so the Islamic term is lost.
   Fix: Approuvé par le réviseur en charia
9. fr | teamReview
   Current: Révision religieuse
   Problem: Same loss of "Sharia" as item 8, which also makes the two keys inconsistent.
   Fix: Révision charia
10. fr | privacyBody
    Current: …«Écouter» récupère la récitation sur les serveurs de mp3quran.net uniquement quand vous appuyez, qui voient donc votre adresse IP…
    Problem: There are no spaces inside the guillemets, unlike everywhere else in the file. The clause "qui voient…" is cut off from "serveurs".
    Fix (rest of the string unchanged): …« Écouter » récupère la récitation sur les serveurs de mp3quran.net uniquement lorsque vous appuyez dessus ; ces serveurs voient donc votre adresse IP…
11. fr | referralButton
    Current: Présidence générale de la recherche scientifique et de l’Ifta
    Problem: The usual French name uses the plural, as in "Comité permanent des recherches scientifiques et de l’iftâ".
    Fix: Présidence générale des recherches scientifiques et de l’Ifta
12. fr | speakFoundBook
    Current: J'ai trouvé pour vous un texte dans un livre reconnu. Le voici en arabe.
    Problem: "reconnu" (recognised) is inconsistent with "approuvé", which the file uses for "approved" everywhere else.
    Fix: J’ai trouvé pour vous un texte dans un livre approuvé. Le voici en arabe.
13. fr | disputedText
    Current: Les savants ont plus d’un avis sur cette question
    Problem: The phrasing is unnatural and can read as each scholar holding several views.
    Fix: Il existe plus d’un avis parmi les savants sur cette question
14. fr | srcHadithBy
    Current: Bukhari · Muslim · Riyad as-Salihin · Les Quarante
    Problem: In French, "Les Quarante" normally means the Académie française. The collection is known as the Forty Hadiths.
    Fix: Bukhari · Muslim · Riyad as-Salihin · Les Quarante Hadiths
15. fr | booksSourceNote
    Current: Du cheikh Muhammad ibn Abd al-Wahhab, depuis al-Maktaba al-Shamila, sans modification, avec un lien vers chaque page.
    Problem: Using "depuis" for "from" is a calque, and the sentence reads choppily.
    Fix: Ouvrages du cheikh Muhammad ibn Abd al-Wahhab, tirés d’al-Maktaba al-Shamila sans modification, avec un lien vers chaque page.
16. fr | simplify
    Current: Simplifie pour moi
    Problem: This is the only "tu" imperative in a file that otherwise uses "vous" or infinitives (e.g. "Expliquer dans ma langue").
    Fix: Simplifier pour moi
17. fr | voiceAsk
    Current: Poser à la voix
    Problem: The verb has no object, and "à la voix" is not idiomatic.
    Fix: Poser une question à l’oral
18. fr | speakAyahRef
    Current: sourate {sura}, verset {aya}
    Problem: The lowercase start suggests it is inserted into speakFound ("…un texte dans {ref}."), which would give "dans sourate 2…" without an article. I couldn't confirm this from the uploaded files, so it needs checking in the code.
    Fix: la sourate {sura}, verset {aya}

French typography across the file (not counted per key above):
- Spaces before ; : ? and inside « » are present in every key except privacyBody. They are all ordinary spaces (U+0020), so "?" or "»" can wrap onto a new line on its own. Use U+202F or U+00A0 instead; this affects about 30 keys.
- Apostrophes are mixed. 21 keys use the straight ' and the rest use ’: readerSourceNote, footnotes, askAboutBookDraft, starterCardTitle, starterIntro, howFoundVerbatim, howFoundGenerated, explainUnavailable, shurutNote, voiceUnclear, voiceUnsupported, voiceCancel, voiceNoMic, voiceTooLong, voiceFailed, voiceSendingSoon, voiceNoVoice, speakFound, speakFoundBook, speakMachineMuyassar, speakLinkOnScreen. The ' in "Sa'di" stands for the Arabic ʿayn and is fine.

French summary
- Keys reviewed: 253
- Keys with CRITICAL: 0. MAJOR: 2. MINOR: 16, plus 20 more keys whose only issue is the straight apostrophe.
- Score: 251/253 = 99.2%.
- Terminology: it matches francophone Muslim usage well (sourate, verset, tafsir, hadith, fatwa, mufti, cheikh, aqida, ijtihad, savants, actes d’adoration, Mushaf, Saint Coran). The only weak spots are "divergence savante" and "religieux" where "charia" is meant.

SPANISH (es.ts)

CRITICAL: none.

MAJOR
1. es | levelC
   Current: Nivel C · Diferencia académica
   Problem: "académica" means university/academia, and "cuestión académica" also means "purely theoretical". This is a matter of difference among the ulama, and the file says "sabios" everywhere else.
   Fix: Nivel C · Discrepancia entre los sabios
2. es | levelCDesc
   Current: Diferencia académica o iytihad — se remite, no se responde.
   Problem: Same wrong term as levelC.
   Fix: Discrepancia entre los sabios o iytihad — se remite, no se responde.

MINOR
3. es | levelB
   Current: Nivel B · Requiere detalle
   Problem: It reads as if the user must supply details. The Arabic تحتاج تفصيلًا means the answer needs elaboration from the text.
   Fix: Nivel B · Requiere explicación detallada
4. es | levelBDesc
   Current: Información que requiere detalle — se responde desde el texto.
   Problem: It leaves out "from the text" and has the same ambiguity as levelB.
   Fix: Información que requiere una explicación detallada del texto — se responde desde el texto.
5. es | footer
   Current: Asistente de conocimiento basado en fuentes · no es un muftí · con ayuda de IA
   Problem: "basado en" means "based on", which loses "source-bound" (restricted to the sources).
   Fix: Asistente de conocimiento limitado a las fuentes · no es un muftí · con ayuda de IA
6. es | simpleModeHint
   Current: Lo eliges tú; nunca suponemos tu origen.
   Problem: "origen" suggests ethnic or national origin. The source means religious or personal background.
   Fix: Lo eliges tú; nunca intentamos adivinar tu trasfondo.
7. es | badgeReviewed
   Current: Aprobado por el revisor religioso
   Problem: "Sharia reviewer" becomes the generic "religious reviewer", so the Islamic term is lost.
   Fix: Aprobado por el revisor de la sharía
8. es | teamReview
   Current: Revisión religiosa
   Problem: Same loss of "Sharia" as item 7.
   Fix: Revisión de la sharía
9. es | speakFoundBook
   Current: Encontré un texto para ti en un libro reconocido. Aquí está en árabe.
   Problem: "reconocido" (recognised) is inconsistent with "aprobado", which the file uses for "approved" everywhere else.
   Fix: Encontré un texto para ti en un libro aprobado. Aquí está en árabe.
10. es | booksSourceNote
    Current: Del jeque Muhammad ibn Abd al-Wahhab, de al-Maktaba al-Shamila, sin cambios, con un enlace a cada página.
    Problem: "jeque" suggests a tribal or Gulf chief, whereas Spanish-speaking Muslims usually write "sheij" for a scholar. "Del…, de…" is also awkward.
    Fix: Obras del sheij Muhammad ibn Abd al-Wahhab, tomadas de al-Maktaba al-Shamila sin cambios, con un enlace a cada página.
11. es | disputedText
    Current: Los sabios tienen más de una opinión sobre esta cuestión
    Problem: It can read as each scholar holding several opinions.
    Fix: Hay más de una opinión entre los sabios sobre esta cuestión
12. es | errRateLimited
    Current: Se ha completado el número de preguntas de hoy; nos alegrará recibir tu pregunta mañana.
    Problem: "completar el número" is a calque of the Arabic and sounds unnatural.
    Fix: Se ha alcanzado el límite de preguntas de hoy; nos alegrará recibir tu pregunta mañana.
13. es | srcHadithBy
    Current: Bujari · Muslim · Riyad as-Salihin · Los Cuarenta
    Problem: "Los Cuarenta" on its own is unclear.
    Fix: Bujari · Muslim · Riyad as-Salihin · Los Cuarenta Hadices
14. es | readerSourceNote
    Current: …de la Universidad Rey Saud, sin cambios.
    Problem: It is spelled without the accent here but "Rey Saúd" in srcQuranBy.
    Fix: Texto del Corán del proyecto Mushaf de la Universidad Rey Saúd, sin cambios.
15. es | speakAyahRef
    Current: sura {sura}, aleya {aya}
    Problem: If it is inserted into speakFound ("…en {ref}."), it gives "en sura 2…" without an article. This is the same unconfirmed assumption as French item 18.
    Fix: la sura {sura}, aleya {aya}

Spanish typography across the file (not counted per key above):
- Quotation marks are mixed. langNote, iosStep2, iosStep3 and installFallback use “ ”, while privacyBody, askAboutSegmentDraft, starterSimpleHint and howFoundVerbatim use « ». The RAE recommends « » as the first level.

Spanish summary
- Keys reviewed: 253
- Keys with CRITICAL: 0. MAJOR: 2. MINOR: 13, plus 4 more keys whose only issue is the quotation marks.
- Score: 251/253 = 99.2%.
- Terminology: it largely matches Hispanic Muslim usage (sura, aleya, tafsir, hadiz, fetua, muftí, aqida, iytihad, sabios, Sagrado Corán, Bujari, Ibn Uzaimín). The real error is "académica" for scholarly difference; "jeque" and "religioso" where "sharía" is meant are weaker choices.

Outside the scope of this review: ar.ts uses {name} instead of {s} in ayahSheetTitle and askAboutAyahDraft. That only works if the code passes both placeholders, so it is worth checking.
