# Faithfulness review: French and Spanish explanations (DeepSeek V4 Flash)

Input: `scratchpad/explain2/fr-es.jsonl` (16 lines: 8 fr, 8 es). Not modified.
No line has `rejected` or `error` set, so all 16 were judged and 0 are unavailable.

## Method

- **Faithfulness** is checked against `source_ar` only (al-Tafsir al-Muyassar for Quran ids, the al-Usul al-Thalatha passage for aqeedah ids). The verse text is used only to spot verse translation.
- **FAITHFUL**: `yes` means nothing was added or changed. `minor-addition` means a small harmless framing word or intensifier, still a PASS. `no` means added doctrine, ruling, definition, condition change, addressee change, purpose or concluding lesson, which is a FAIL.
- **Omissions** are recorded as notes, not FAILs, because a 3–5 sentence cap cannot hold long sources. Omitted definitions are pointed out by name so they can be reviewed.
- **VERSE-TRANSLATION**: `yes` only when the text uses the verse's own address or commands in its voice. A third-person description of what a verse says is `no`, per the unified conventions.
- **TERMS / LANGUAGE**: a `problem` leads to FAIL only when it misstates meaning or makes the text unusable for the reader. Cosmetic issues are marked `minor` and do not change the verdict.
- **Sentence count**: all 16 texts have 3–5 sentences, so there are no count notes.

## Per-item judgments

### 1. quran:2:255 (fr)
- FAITHFUL: yes · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: PASS**
- What it keeps: the source's definition of the Kursi ("le lieu de Ses pieds", with its nature known only to Him). It glosses Kursi as "Siège", not the Throne. It also keeps the intercession condition and the "greatest verse / Ayat al-Kursi" statement.
- Notes:
  - It leaves out the closing attributes from the source: "al-'Ali by His essence and attributes over all creation, combining all attributes of greatness".
  - "la préservation de l'univers" slightly widens "their preservation (heavens and earth)".
  - "Cette parole" is used where the source says "this verse".

### 2. quran:2:255 (es)
- FAITHFUL: yes (imprecise wording noted) · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: PASS**
- What it keeps: the Kursi definition ("el lugar de Sus pies").
- Notes:
  - "siendo Él quien permite cualquier intercesión" weakens "no one dares intercede except by His permission", though the dependence on His permission is kept.
  - "nadie puede acceder a Su ciencia sin Su permiso" replaces "except what Allah taught them and informed them of".
  - "cuya forma solo Él conoce" uses "forma" (shape or manner) for كيفية, where "modalidad/naturaleza" would be cleaner.
  - Like the French, it leaves out the closing al-'Ali al-'Azim attributes.

### 3. quran:112:1 (fr)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** It adds a categorization, "qu'elles soient essentielles ou descriptives", and an added conclusion, "affirme le principe du tawhid … comme fondement de la foi". Neither is in the source.

### 4. quran:112:1 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** It adds "ni en esencia ni en acciones". That brings in an essence/actions framework the source does not have; the source lists divinity, lordship, names and attributes. It also widens the point to "exclusividad absoluta … en todo lo que Le pertenece".

### 5. quran:51:56 (fr)
- FAITHFUL: minor-addition · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: PASS (minor-addition).** The last sentence ("Le texte insiste … ne concerne aucune autre créature ou divinité") repeats the exclusivity point in a slightly ambiguous way. Read in context, it restates "عبادتي وحدي دون من سواي" and makes no new claim.

### 6. quran:51:56 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** It makes up three additions:
  - a definition of worship that the source does not give: "someterse y obedecer a Allah con sinceridad, reconociendo Su unicidad";
  - a wider claim, "meta final de toda la existencia", where the source speaks only of jinn and humans;
  - a meta-comment, "sin mencionar otras razones o beneficios".

### 7. quran:2:183 (fr)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** The addressees and the taqwa gloss are correct. The final sentence adds a concluding lesson that is not in the source: "fait partie de la continuité des enseignements divins".

### 8. quran:2:183 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** The final sentence adds a new "fin último" (ultimate purpose): "fortalecer la conciencia de Dios en el creyente". This differs from the source's taqwa gloss of protection from sins through obedience and worship of Him alone, which the text had already given correctly. "creído sinceramente" is a small extra word.

### 9. quran:5:6 (fr)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** "passer les mains humides sur la tête" adds a ruling detail, wet hands, to the head-wiping. The source says only "امسحوا رؤوسكم".
- Notes:
  - It drops the source's definitions of المرفق (the joint between forearm and upper arm) and الكعبين (the two protruding bones where shin meets foot).
  - "jusqu'aux coudes" replaces the tafsir's "مع المرافق" (elbows included).
  - It drops the qualifier "على سفر في حال الصحة" (on a journey while healthy).
  - "terre propre" comes from the verse, not the tafsir.
- What it keeps: the condition "sans être en état de pureté", the addressees, and the strike-and-wipe description of tayammum.

### 10. quran:5:6 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** "pasando la mano húmeda por la cabeza" adds the same wet-hand ruling detail.
- Notes:
  - It has the same omissions as the French: the elbow and ankle definitions, "مع المرافق" and "في حال الصحة".
  - "tocar el suelo" softens اضربوا ("strike").
- What it keeps: the purity condition, the conditions for tayammum, and the closing mercy/gratitude point.

### 11. quran:94:5 (fr)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** It changes the addressee. The source addresses the Prophet ("فلا يثنك … عن نشر الرسالة"), but sentence 1 says the passage encourages "le croyant". It also adds "toujours" and a purpose for the repetition ("pour la renforcer").

### 12. quran:94:5 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: FAIL.** It ends with a conclusion the source does not contain: "la ayuda de Dios está cerca para quien persevera en su misión". This also adds a condition and widens who it applies to. Smaller additions: "opresión", "siempre" and "mensaje del Islam". The addressee (the Prophet) is correct.

### 13. aqeedah:usul:005 (fr)
- FAITHFUL: yes · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: PASS**
- What it keeps: the three levels, the five pillars, the meaning of the first shahada, the four elements of the second shahada, and the use of 98:5 as the evidence for prayer and zakat.
- Notes:
  - It leaves out the source's definition of Islam (الاستسلام لله بالتوحيد والانقياد له بالطاعة والخلوص من الشرك). This is a notable omitted definition.
  - It leaves out the negation/affirmation breakdown and the "no partner in His dominion" comparison.
  - "selon ce qu'il a légiféré" (lowercase "il") is ambiguous, as the Arabic "بما شرع" also is.

### 14. aqeedah:usul:005 (es)
- FAITHFUL: yes · VERSE-TRANSLATION: no · TERMS: ok · LANGUAGE: ok
- **Verdict: PASS**
- What it keeps: the definition of Islam (all three parts), the three levels, the five pillars, and the meanings of both shahadas, including the negation/affirmation.
- Notes: it leaves out the 98:5 evidence and "of Allah" after "Casa Sagrada". "Ihsan (perfección)" is acceptable, though "excelencia" is more usual.

### 15. aqeedah:usul:007 (fr)
- FAITHFUL: yes · VERSE-TRANSLATION: no (borderline, see note) · TERMS: ok · LANGUAGE: problem (minor)
- **Verdict: PASS**
- What it keeps: the branches-of-faith wording (unattributed in the source, so it is not counted as hadith), the six pillars and both proofs.
- Notes:
  - The book title is left in Arabic script, «الأصول الثلاثة», inside French text. "Les trois fondements" or "al-Usul ath-Thalatha" would serve the reader better.
  - The description of 2:177 closely follows the verse's wording, but in third person, so it is allowed under the unified conventions.

### 16. aqeedah:usul:007 (es)
- FAITHFUL: no · VERSE-TRANSLATION: no (borderline, see 15) · TERMS: minor ("Alá", "imán") · LANGUAGE: ok
- **Verdict: FAIL.** It changes the meaning of the cited 2:177 proof. "la verdadera virtud **no es solo** orientarse hacia el este o el oeste" turns "it is not righteousness to face east or west" into "not only", which implies facing east or west is part of righteousness. This is the most borderline FAIL in the set.
- Notes:
  - "Alá" is the general Spanish form. Hispanophone Muslim usage, and the other es items, prefer Allah or Al-lah.
  - "imán" can be read as imam or magnet, though "(fe)" clarifies it.
  - The rest is faithful: the branches, the six pillars, qadar with its good and bad, and the 54:49 proof.

## Summary table

| # | id | lang | FAITHFUL | VERSE-TR | TERMS | LANG | Verdict |
|---|----|------|----------|----------|-------|------|---------|
| 1 | quran:2:255 | fr | yes | no | ok | ok | PASS |
| 2 | quran:2:255 | es | yes | no | ok | ok | PASS |
| 3 | quran:112:1 | fr | no | no | ok | ok | FAIL |
| 4 | quran:112:1 | es | no | no | ok | ok | FAIL |
| 5 | quran:51:56 | fr | minor-addition | no | ok | ok | PASS |
| 6 | quran:51:56 | es | no | no | ok | ok | FAIL |
| 7 | quran:2:183 | fr | no | no | ok | ok | FAIL |
| 8 | quran:2:183 | es | no | no | ok | ok | FAIL |
| 9 | quran:5:6 | fr | no | no | ok | ok | FAIL |
| 10 | quran:5:6 | es | no | no | ok | ok | FAIL |
| 11 | quran:94:5 | fr | no | no | ok | ok | FAIL |
| 12 | quran:94:5 | es | no | no | ok | ok | FAIL |
| 13 | aqeedah:usul:005 | fr | yes | no | ok | ok | PASS |
| 14 | aqeedah:usul:005 | es | yes | no | ok | ok | PASS |
| 15 | aqeedah:usul:007 | fr | yes | no* | ok | minor | PASS |
| 16 | aqeedah:usul:007 | es | no | no* | minor | ok | FAIL |

\* Close third-person paraphrase of a cited verse. Allowed under the unified conventions.

## Per-language results

| lang | judged | PASS | FAIL | % PASS | unavailable (rejected) |
|------|--------|------|------|--------|------------------------|
| fr | 8 | 4 | 4 | 50.0% | 0 |
| es | 8 | 2 | 6 | 25.0% | 0 |
| total | 16 | 6 | 10 | 37.5% | 0 |

No item used the verse's own address or commands. Every FAIL is a faithfulness failure: something was added or changed.

How the failures break down:
- **Added concluding lesson or purpose**: 7 items. 112:1 fr, 2:183 fr, 2:183 es and 94:5 es add a closing lesson or purpose. 51:56 es adds a definition of worship. 112:1 fr/es add essence/actions categories.
- **Added ruling detail**: 2 items. Both 5:6 versions add "wet hands" to the head-wiping.
- **Changed addressee**: 1 item. 94:5 fr says "the believer" where the source addresses the Prophet.
- **Altered meaning of a cited proof**: 1 item. usul:007 es adds "solo".

Notable omissions that were not counted as FAILs:
- the al-'Ali al-'Azim attributes (2:255, both languages);
- the elbow and ankle definitions and "مع المرافق" (5:6, both);
- the definition of Islam (usul:005 fr).

## FAIL list

(quran:112:1, fr)
(quran:112:1, es)
(quran:51:56, es)
(quran:2:183, fr)
(quran:2:183, es)
(quran:5:6, fr)
(quran:5:6, es)
(quran:94:5, fr)
(quran:94:5, es)
(aqeedah:usul:007, es)
