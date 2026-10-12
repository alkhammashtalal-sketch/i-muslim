# Faithfulness review: DeepSeek V4 Flash explanations (fr + es)

Input: `scratchpad/explain/fr-es.jsonl`, 16 lines: 6 Quran ids x 2 languages and 2 aqeedah ids x 2 languages. The input file was not modified.

Reviewer: an independent model. I read every `text` in full against `source_ar`. For Quran ids that source is al-Tafsir al-Muyassar, and for aqeedah ids it is al-Usul al-Thalatha. For Quran ids I also compared each text with `ayah_ar` and `ayah_en`, and with the standard French (Hamidullah) and Spanish renderings where that helped show verse paraphrase.

## Criteria used

- **FAITHFUL** can be `yes`, `minor-addition` or `no`.
  - `minor-addition`: a small, harmless gloss or generic framing that does not change the meaning.
  - `no`: the text states something the source does not support, contradicts the source, changes a ruling or a religious meaning, or adds substantive content such as a definition, ruling, lesson or exhortation. Leaving material out is not counted against a text unless the omission changes a ruling.
- **VERSE/HADITH TRANSLATION**: `yes` when the text reads as a rendering of the verse or hadith itself rather than an explanation of it. That includes:
  - keeping the verse's own voice (direct address, imperatives, or unframed declaratives) while following its clause order;
  - matching a standard translation's wording across several clauses;
  - reverting to the verse's wording where the tafsir worded it differently;
  - rendering a hadith clause by clause.

  Following the verse's topic order is not a violation by itself when the text is framed as an explanation ("this verse is addressed to ... / Allah made it obligatory for them ...") and uses the tafsir's glosses, because Muyassar itself goes clause by clause. Enumerating doctrinal terms, such as the five pillars or the six pillars, is not counted as quoting a hadith.
- **TERMS / LANGUAGE**: `ok`, `minor` or `problem`.
- **Verdict**: PASS when FAITHFUL is yes or minor-addition, VERSE/HADITH TRANSLATION is no, and terms and language are ok or minor. Anything else is a FAIL.
- **Length**: all 15 texts have 3 to 5 sentences, but several sentences are 35 to 51 words long, so they are not "short plain sentences". I note this under each item but it does not affect the verdict.

## Summary

| Lang | Lines | Null / failed generation | Judged | PASS | FAIL | % PASS |
|---|---|---|---|---|---|---|
| fr | 8 | 1 (`aqeedah:usul:007`, error `unavailable`) | 7 | 3 | 4 | 42.9% |
| es | 8 | 0 | 8 | 3 | 5 | 37.5% |
| **All** | 16 | 1 | 15 | 6 | 9 | 40.0% |

## Verdict table

| # | id | lang | Faithful | Verse/hadith translation | Terms | Language | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | quran:2:255 | fr | **no** | **yes** | **problem** | ok | **FAIL** |
| 2 | quran:2:255 | es | **no** | **yes** | **problem** | **problem** | **FAIL** |
| 3 | quran:112:1 | fr | minor-addition | no | minor | minor | PASS |
| 4 | quran:112:1 | es | minor-addition | no | ok | ok | PASS |
| 5 | quran:51:56 | fr | **no** | no | ok | ok | **FAIL** |
| 6 | quran:51:56 | es | **no** | no | ok | ok | **FAIL** |
| 7 | quran:2:183 | fr | yes | no | ok | minor | PASS |
| 8 | quran:2:183 | es | minor-addition | no | ok | ok | PASS |
| 9 | quran:5:6 | fr | yes (minor imprecision) | **yes** | ok | ok | **FAIL** |
| 10 | quran:5:6 | es | **no** | no (borderline) | ok | ok | **FAIL** |
| 11 | quran:94:5 | fr | minor-addition | **yes** | ok | ok | **FAIL** |
| 12 | quran:94:5 | es | minor-addition | **yes** | ok | ok | **FAIL** |
| 13 | aqeedah:usul:005 | fr | yes | no | ok | minor | PASS |
| 14 | aqeedah:usul:005 | es | yes | no (borderline) | minor | ok | PASS |
| 15 | aqeedah:usul:007 | fr | n/a (text null) | n/a | n/a | n/a | NULL |
| 16 | aqeedah:usul:007 | es | yes | **yes** (hadith) | ok | ok | **FAIL** |

## Per-item judgments

### 1. quran:2:255 / fr: FAIL
- **Faithful: no.**
  - "Son Trône (al-Kursi) s'étend sur les cieux et la terre" calls al-Kursi the Throne. The source defines it explicitly the other way: "والكرسي: هو موضع قدمي الرب -جل جلاله- ولا يعلم كيفيته إلا الله", that is, the footstool, which is distinct from the 'Arsh (Throne). The tafsir included that definition on purpose, so this gloss contradicts the source on a creedal point. Calling the verse "le verset du Trône (Ayat al-Kursi)" is the conventional French name and is fine. The problem is the gloss inside the explanation.
  - "ni sommeil ni fatigue": the source glosses سِنَة as نعاس, which means drowsiness, not fatigue.
  - "le verset le plus important" slightly weakens أعظم ("greatest"). This is harmless.
  - al-Qayyum is left out. That is an omission and is not counted.
- **Verse translation: yes.** Sentences 2 to 4 go through about 9 of the verse's 10 clauses in order, as unframed declaratives in the verse's own third-person voice. Several clauses match the standard French translation:
  - "Personne ne peut intercéder auprès de Lui sans Sa permission"
  - "sans que personne ne puisse en saisir quoi que ce soit, sauf ce qu'Il veut"
  - "Son Trône (al-Kursi) s'étend sur les cieux et la terre"
  - "ne Lui pèse pas ... Il est le Très-Haut et le Majestueux"

  Compare Hamidullah: "Son Trône «Kursiy» déborde les cieux et la terre, dont la garde ne Lui coûte aucune peine. Et Il est le Très Haut". The Throne rendering of Kursi itself follows the translation convention, not the tafsir.
- **Terms: problem** (Kursi glossed as "Trône").
- **Language: ok.** 4 sentences; one has 39 words.
- **Reason:** it glosses al-Kursi as "Trône", which contradicts the source's own definition (the footstool, not the 'Arsh), renders سِنَة as "fatigue", and sentences 2 to 4 are a clause-by-clause rendering of Ayat al-Kursi.

### 2. quran:2:255 / es: FAIL
- **Faithful: no.**
  - It has the same Kursi gloss: "Su trono (al-kursi) abarca los cielos y la tierra".
  - It renders سِنَة as "cansancio" (tiredness) instead of drowsiness.
  - The rest follows the source. "Vida perfecta" matches the tafsir, "más grandiosa del Corán" matches أعظم, and the closing naming sentence is in the source. "Su cuidado de todo lo que existe" for القائم على كل شيء is soft but acceptable.
- **Verse translation: yes.** "Nadie puede interceder ante Él sin Su permiso ... sin que nadie sepa nada de Su ciencia salvo lo que Él revela. Su trono (al-kursi) abarca los cielos y la tierra, y Él los preserva sin esfuerzo, siendo el Altísimo ..." covers the verse clause by clause, in its voice and order.
- **Terms: problem** (Kursi glossed as "trono"). The name "Aleya del Trono" is conventional and fine.
- **Language: problem.** "Nada Lo supera: ni el sueño ni el cansancio" reads as "nothing surpasses Him". The intended meaning is "neither drowsiness nor sleep overtakes Him" (no Le vence / no Le afecta). The text has 5 sentences.
- **Reason:** it glosses al-kursi as "trono", contradicting the source's definition (the footstool); it renders سِنَة as "cansancio" with the misleading "Nada Lo supera"; and it renders the verse clause by clause.

### 3. quran:112:1 / fr: PASS (minor-addition)
- **Faithful: minor-addition.** Four things are not in the source:
  - "Personne ne Lui ressemble". The source only says no one shares these with Him; non-resemblance is the content of 112:4.
  - "aux gens"
  - "parfaits"
  - The closing editorial line "C'est un rappel fondamental du tawhid (l'unicité d'Allah) pour tout croyant."

  All four are harmless, and none changes the meaning.
- **Verse translation: no.** The text is reported ("Cette parole s'adresse au Prophète pour qu'il annonce ...") and uses the tafsir's wording.
- **Terms: minor.** "unique ... dans Son adoration (uluhiyyah)" is ambiguous; French normally says "dans Sa divinité" or "dans Son droit exclusif à l'adoration".
- **Language: minor.** "que Allah" should be "qu'Allah". 3 sentences.

### 4. quran:112:1 / es: PASS (minor-addition)
- **Faithful: minor-addition.** Three things are not in the source:
  - "ni en esencia, ni en acciones, ni en nombres". This is a taxonomy (essence, actions, names) that the source does not use; the source lists uluhiyya, rububiyya, and names and attributes.
  - "que es el mensaje central del Islam".
  - "perfectos".

  All are harmless and doctrinally standard. This is at the upper edge of "minor".
- **Verse translation: no.**
- **Terms: ok** (uluhiyyah, rububiyyah, tawhid as "monoteísmo puro", Al-lah).
- **Language: ok.** 3 sentences.

### 5. quran:51:56 / fr: FAIL
- **Faithful: no.** Sentence 1 is faithful: creation of jinn and humans and the sending of all messengers have a lofty aim, the worship of Allah alone. Sentences 2 to 4 are additions:
  - a definition of 'ibada ("inclut l'obéissance, la soumission et la dévotion sincère");
  - "Elle est le fondement du tawhid", which is also doctrinally muddled;
  - "qui est la raison d'être de toute existence", which widens the source's scope from jinn and humans to all existence;
  - the normative "chaque croyant doit orienter sa vie vers cette finalité unique".

  Three of the four sentences are content the source does not have.
- **Verse translation: no.** The verse's first-person voice is recast in the third person with the tafsir's additions.
- **Terms: ok** (djinns, ibadah, tawhid).
- **Language: ok.** 4 sentences.
- **Reason:** three of four sentences add content that is not in the source: a definition of 'ibada, "fondement du tawhid", "raison d'être de toute existence" (which widens jinn and humans to all existence), and an exhortation ("chaque croyant doit ...").

### 6. quran:51:56 / es: FAIL
- **Faithful: no.** Sentence 1 is faithful. The additions are:
  - "es el objetivo central de la existencia", which widens the scope beyond jinn and humans;
  - "no se trata de un acto vacío, sino de someterse a Su voluntad", which is an added opinion;
  - "la vida de cada persona debe orientarse a cumplir este fin", which is normative;
  - "que es la esencia del tawhid".
- **Verse translation: no.**
- **Terms: ok** (yinn, ibadah, tawhid, Al-lah).
- **Language: ok.** 3 sentences.
- **Reason:** two of three sentences are added commentary: "objetivo central de la existencia" (scope widened), "no se trata de un acto vacío" (opinion), "debe orientarse" (exhortation), and "esencia del tawhid".

### 7. quran:2:183 / fr: PASS
- **Faithful: yes.** It closely follows the tafsir: "croient en Allah et en Son messager et qui suivent Sa loi", "rendu obligatoire ... aux communautés précédentes", and taqwa explained as protecting oneself from sins through obedience and worship of Allah alone.
- **Verse translation: no.** It is in the third person and uses the tafsir's wording (فرض, الأمم, the explanation of تتقون).
- **Terms: ok** (sawm, taqwa).
- **Language: minor.** "rendu obligatoire aux communautés" is slightly unidiomatic; "prescrit aux" or "imposé aux" is more natural. 3 sentences.

### 8. quran:2:183 / es: PASS (minor-addition)
- **Faithful: minor-addition.**
  - "creído sinceramente": the word "sinceramente" is added, since صدَّقوا means "affirmed or believed".
  - "acercándose a la obediencia" loosens the source's "by obedience". This is harmless.
- **Verse translation: no.**
- **Terms: ok** (sawm, taqwa, Allah).
- **Language: ok.** 3 sentences.

### 9. quran:5:6 / fr: FAIL
- **Faithful: yes, with one minor imprecision.** "jusqu'aux coudes / jusqu'aux chevilles" uses the verse's إلى instead of the tafsir's مع ("including"). That loses the tafsir's point that the elbows and ankles are included. Everything else matches the tafsir:
  - minor versus major impurity, and the full bath;
  - the cases where tayammum is allowed, including intercourse with one's wife;
  - tayammum as a mercy and concession to be thanked through obedience.
- **Verse translation: yes.** Sentences 2 to 5 keep the verse's second-person imperative voice and go through its clauses in order:
  - "lavez votre visage, vos mains jusqu'aux coudes, essuyez votre tête et lavez vos pieds jusqu'aux chevilles";
  - "Si vous êtes malade, en voyage, ou ... et que vous ne trouvez pas d'eau, alors utilisez de la terre pure ... en vous essuyant le visage et les mains";
  - "Allah ne veut pas vous imposer de difficultés".

  This is very close to Hamidullah ("lavez vos visages et vos mains jusqu'aux coudes ... recourez à la terre pure ... Allah ne veut pas vous imposer quelque gêne"). Where the tafsir and the verse word things differently (مع / إلى, وجه الأرض / صعيدا طيبا, يضيّق / حرج), the text follows the verse.
- **Terms: ok** (salah, tayammum).
- **Language: ok.** 5 sentences; one has 42 words.
- **Reason:** sentences 2 to 5 are a second-person, clause-by-clause rendering of the verse that tracks the standard French translation. The content is otherwise faithful, so only the form needs to change.

### 10. quran:5:6 / es: FAIL
- **Faithful: no.** The text moves "la relación conyugal" out of the list of cases where tayammum is allowed and into the ghusl sentence, as an example of major impurity: "Si hay una impureza mayor, como después de la relación conyugal, debe purificarse con el baño completo". The list of cases for tayammum then reads only "enfermo, de viaje, o ha ido al baño".
  - The source lists أو جامع زوجته among the cases where, lacking water, one does tayammum. The text therefore drops the ruling that tayammum replaces ghusl after intercourse when there is no water, and its wording now implies the opposite.
  - Minor additions: "pasar la mano húmeda por la cabeza" (the wet hand is not in the source). "hasta los codos/tobillos" also loses the tafsir's "including".
- **Verse translation: no (borderline).** It is recast as third-person rules ("Cuando un creyente quiera ... debe ..."), but it follows the verse's order and some of its wording.
- **Terms: ok** (salah, tayammum).
- **Language: ok.** 5 sentences; one has 38 words.
- **Reason:** it moves intercourse from the tayammum cases into the ghusl sentence, so the text no longer says (and implies the opposite) that tayammum is allowed after intercourse when there is no water, which is a ruling the source states. It also adds "mano húmeda".

### 11. quran:94:5 / fr: FAIL
- **Faithful: minor-addition.**
  - "le message de l'islam": "de l'islam" is added to الرسالة.
  - The last sentence generalises from the Prophet's mission to "toute épreuve ... pour le croyant".
  - The opening second-person line "Ne laisse pas les torts de tes ennemis te détourner de transmettre le message" never says it is addressed to the Prophet, so a new Muslim reads it as addressed to them.
- **Verse translation: yes.** "Car avec la difficulté vient un soulagement, et avec la détresse, une issue favorable" is an unframed declarative rendering of 94:5 to 94:6. "Car" mirrors فَإِنَّ, and the repetition mirrors verse 6. It is not presented as explanation ("Allah assure que ...").
- **Terms: ok.**
- **Language: ok.** 3 sentences.
- **Reason:** sentence 2 renders verses 94:5 to 94:6 directly ("Car avec la difficulté vient un soulagement ..."). The opening second-person line also does not say the Prophet is the one addressed.

### 12. quran:94:5 / es: FAIL
- **Faithful: minor-addition.** "del Islam" is added, and the last sentence generalises to "el creyente". The opening "tus enemigos" is again unframed second person with no named addressee.
- **Verse translation: yes.** "Porque junto a la dificultad viene el alivio, y ciertamente, con la estrechez hay una salida" renders 94:5 to 94:6 directly. "Porque" mirrors فَـ and "ciertamente" mirrors إِنَّ.
- **Terms: ok.**
- **Language: ok.** 3 sentences.
- **Reason:** sentence 2 renders verses 94:5 to 94:6 directly ("Porque junto a la dificultad viene el alivio, y ciertamente ..."). The opening second-person line also does not say the Prophet is the one addressed.

### 13. aqeedah:usul:005 / fr: PASS
- **Faithful: yes.** It covers the definition of Islam (submission through tawhid, obedience, freedom from shirk), the three levels, the five pillars, the meaning of "la ilaha illa Allah", and what the testimony that Muhammad is the Messenger requires (obedience, belief, avoiding what he forbade, and worshipping only as legislated). It leaves out the evidence verses, which is acceptable.
- **Verse/hadith translation: no.** The five-pillar enumeration is a list of terms, and no evidence verse is rendered.
- **Terms: ok** (tawhid, shirk, islam/iman/ihsan, shahada, salah, zakah). French sources more often write salât, zakât or chahada, but these spellings are understood.
- **Language: minor.** In "connaître la religion de l'islam avec ses preuves : cela signifie se soumettre ...", "cela" grammatically refers to *knowing*; in the source, وهو refers to Islam itself. One sentence has 49 words. 4 sentences.

### 14. aqeedah:usul:005 / es: PASS
- **Faithful: yes.** "tawhid (creer en Su unicidad)" is a reductive gloss but acceptable. The content matches the source.
- **Verse/hadith translation: no (borderline).** The last sentence, "La evidencia de la oración y el azaque es que Allah ordenó adorarle con sinceridad, establecer la salah y dar la zakah", summarises 98:5 as reported content. It covers 3 of the verse's 5 clauses, not in the verse's voice, and "establish prayer, give zakah" is a formula. I judged it a description of the evidence rather than a rendering, but it is close to the line.
- **Terms: minor.** "azaque" is the archaic Spanish dictionary word; Spanish-speaking Muslims mostly say "zakat". The text also mixes "azaque" and "zakah". "hach" is acceptable.
- **Language: ok.** 5 sentences.

### 15. aqeedah:usul:007 / fr: NULL
- `text` is null, `error: "unavailable"`. Not judged. It needs to be regenerated.

### 16. aqeedah:usul:007 / es: FAIL
- **Faithful: yes.** "más de setenta" for بضع وسبعون is acceptable. "el Día Final" and "el Último Día" are used inconsistently.
- **Verse/hadith translation: yes.**
  - Sentence 1 is a word-for-word rendering of the hadith "الإيمان بضع وسبعون شعبة، فأعلاها قول لا إله إلا الله، وأدناها إماطة الأذى عن الطريق، والحياء شعبة من الإيمان" (Muslim), with all four clauses in order. Al-Usul presents it without attribution, but it is hadith wording.
  - Sentence 3 also restates the evidence verses: 2:177's list in the verse's own order (Allah, Last Day, angels, Book, prophets), and 54:49 in full ("todo fue creado con medida"). Those restatements would be borderline on their own.
- **Terms: ok** (iman, haya (better "hayá'"), arkan, mala'ikah, kutub, rusul, qadar, birr). It uses "versículo" here and "aleya" elsewhere, which is inconsistent.
- **Language: ok.** 3 sentences, but one has 51 words.
- **Reason:** sentence 1 renders the hadith "faith has seventy-odd branches ... modesty is a branch of faith" word for word, and sentence 3 restates the evidence verses 2:177 and 54:49 clause by clause. Because the source passage is almost entirely hadith and verse text, the regeneration prompt needs to ask the model to describe this kind of passage, not translate it.

## Patterns across the set

1. **Kursi glossed as Throne (2:255, both languages).** Both explanations replace the tafsir's explicit definition (the footstool) with the popular translation's "Trône" / "trono". Both also render سِنَة as fatigue or tiredness.
2. **Padding with lessons and exhortations (51:56 both, 112:1 both).** When the source is one sentence, the model fills 3 to 4 sentences with its own commentary: definitions, "raison d'être de toute existence", "debe orientarse". In 51:56 that crosses into normative content and a wider scope, so those items fail. In 112:1 it stays at harmless framing, so those items pass with minor-addition.
3. **Short verses and legal verses where the tafsir is close to the verse (94:5, 5:6, 2:255).** Here the model slips into the verse's own voice: direct declaratives, second-person imperatives, and wording that matches the standard translation. Requiring explicit third-person framing in the prompt ("Ce verset enseigne que ..." / "Esta aleya enseña que ...") and naming the addressee when the tafsir speaks to the Prophet ("أيها الرسول" or an implied "you") would likely fix most of these.
4. **Aqeedah passages made of hadith text (007).** The source is itself hadith and verse wording, so following the source means translating a hadith. The generation prompt needs a rule for this case.
5. **Spanish house style is inconsistent.**
   - "Al-lah" (2:255, 112:1, 51:56) versus "Allah" (2:183, 5:6, 94:5, both aqeedah items).
   - "aleya" versus "versículo".
   - "azaque" versus "zakah".

   Pick one form each. None of these was failed on its own.
6. **Fix 2:255 and 5:6 / es first if you regenerate selectively.** The verse-form failures (5:6 fr, 94:5 fr/es) have otherwise near-faithful content and only need reframing. The 2:255 failures (wrong creedal gloss) and the 5:6 es failure (changed tayammum ruling) are content errors and matter more for users.

## Borderline calls (for calibration)

- **5:6 fr** fails only on verse rendering; its content is faithful.
- **94:5 fr and es** fail mainly on form. Their content is close to the source, with only minor additions.
- **2:255 fr and es** would still fail on the Kursi gloss even if the verse-rendering standard were relaxed.
- **005 es and 007 es**: I judged the evidence-verse summaries as borderline "no". 007 es fails on the hadith sentence, not on those summaries.
- **If only faithfulness were counted**, the FAILs would be 2:255 fr, 51:56 fr, 2:255 es, 51:56 es and 5:6 es.

## FAIL list (to delete from cache)

(quran:2:255, fr), (quran:51:56, fr), (quran:5:6, fr), (quran:94:5, fr), (quran:2:255, es), (quran:51:56, es), (quran:5:6, es), (quran:94:5, es), (aqeedah:usul:007, es)

Null generation, also needing regeneration: (aqeedah:usul:007, fr)
