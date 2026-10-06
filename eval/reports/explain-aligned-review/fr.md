# Review of al-Tafsir al-Muyassar machine translations — French (fr)

Translator model: DeepSeek V4 Flash. Reviewer: independent judge, sentence-by-sentence against `source_sentences`.

**Judged:** 45  **Pass:** 37  **Fail:** 8  **Pass rate:** 82.2%

Criteria: FAITHFUL (yes/minor/no) · TERMS (ok/problem) · LANGUAGE (ok/minor/problem). Verdict PASS requires FAITHFUL yes or minor, TERMS ok, LANGUAGE ok or trivially minor. Parenthetical transliteration glosses such as "(salat)" or "(tawhid)" were treated as harmless (minor), not as added information.

| id | faithful | terms | language | verdict | reason |
|---|---|---|---|---|---|
| quran:3:19 | no | ok | ok | FAIL | S4 "Allah est prompt à rendre compte" reverses سريع الحساب (swift in calling to account → quick to give account); should be "prompt à demander compte" |
| quran:3:85 | minor | ok | ok | PASS | added transliteration gloss "(tawhid)"; otherwise faithful |
| quran:21:92 | yes | ok | ok | PASS | — |
| quran:2:285 | no | ok | ok | FAIL | S1 negation scope: "nous ne croyons pas en certains et nous nions certains" affirms that believers deny some messengers; the Arabic لا negates both clauses |
| quran:51:56 | yes | ok | ok | PASS | — |
| quran:2:208 | yes | ok | ok | PASS | — |
| quran:42:13 | yes | ok | problem | FAIL | broken French: "Cela est devenu grave pour les associateurs ce que tu les appelles à, à savoir…" (dangling preposition, unparseable clause) |
| quran:6:161 | minor | ok | ok | PASS | gloss "(tawhid)"; mixes "Allah" and "Dieu" in one sentence |
| quran:42:53 | yes | ok | ok | PASS | — |
| quran:4:136 | yes | ok | ok | PASS | — |
| quran:2:21 | yes | ok | ok | PASS | — |
| quran:6:102 | yes | ok | ok | PASS | — |
| quran:4:125 | minor | ok | ok | PASS | gloss "(khulla)" |
| quran:10:25 | minor | ok | ok | PASS | "en les accordant pour atteindre le chemin droit" is an awkward rendering of فيوفقه لإصابة (grants him success in reaching); gist intact |
| quran:9:33 | yes | ok | ok | PASS | — |
| quran:16:9 | yes | ok | ok | PASS | — |
| quran:23:52 | yes | ok | ok | PASS | — |
| quran:20:8 | minor | ok | ok | PASS | calque "Celui qui n'a de divinité en vérité que Lui" for لا معبود بحق إلا هو is awkward (reads as if Allah has a deity) but meaning is clear |
| quran:59:24 | minor | ok | ok | PASS | "le Producteur" is an unusual literal rendering of البارئ (not the form French Muslims usually use), not pejorative; rest faithful |
| quran:2:255 | no | problem | ok | FAIL | Kursi rendered "Trône" (= ʿArsh), so "le Trône : c'est l'endroit des pieds du Seigneur" conflates the Kursi with the Throne; also "ce qu'Allah Lui a enseigné" capitalises the pronoun that refers to the creature |
| quran:3:2 | yes | ok | ok | PASS | — |
| quran:7:180 | yes | ok | ok | PASS | — |
| quran:4:87 | yes | ok | ok | PASS | — |
| quran:64:13 | minor | ok | ok | PASS | لا معبود بحق سواه rendered twice as a redundant doublet ("Allah seul est digne d'adoration, nul autre que Lui ne mérite…"); same meaning |
| quran:28:70 | minor | ok | ok | PASS | calque "qui n'a d'autre divinité méritant l'adoration en vérité que Lui" is awkward; meaning clear |
| quran:112:1 | yes | ok | ok | PASS | — |
| quran:59:22 | minor | ok | ok | PASS | glosses "(ar-Rahman)", "(ar-Rahim)"; "connaisseur du secret et du public" is odd for السر والعلن but same sense |
| quran:6:3 | yes | ok | ok | PASS | — |
| quran:43:84 | yes | ok | ok | PASS | — |
| quran:20:98 | yes | ok | ok | PASS | — |
| quran:59:23 | yes | problem | ok | FAIL | divine name المتكبر rendered "l'Orgueilleux" (pejorative: arrogant/prideful, a vice in French); French Muslims use "le Superbe" / "le Majestueux" |
| quran:37:35 | no | ok | ok | FAIL | "s'enorgueillissaient de cela et de celui qui l'apportait" = took pride in it and in its bearer; reverses يستكبرون عنها وعلى من جاء بها (arrogantly rejected it and scorned its bearer) |
| quran:33:40 | yes | ok | ok | PASS | — |
| quran:14:24 | yes | ok | ok | PASS | — |
| quran:21:107 | yes | ok | ok | PASS | — |
| quran:48:26 | no | ok | ok | FAIL | S1 omits the subject الذين كفروا ("ceux qui ont mécru"): "Lorsqu'ils ont mis dans leurs cœurs…" leaves "ils" with no referent |
| quran:3:18 | yes | ok | ok | PASS | — |
| quran:6:19 | no | ok | ok | FAIL | S2 "ce que vous allez Lui dire" changes the addressee; Arabic ما أنتم قائلونه لي = what you say to me (the Messenger) |
| quran:48:29 | yes | ok | minor | PASS | S7 nonstandard word "méritance" and pleonastic "que nul de cette communauté ne peut les égaler"; meaning intact |
| quran:7:158 | yes | ok | ok | PASS | — |
| quran:29:45 | minor | ok | ok | PASS | gloss "(salat)" |
| quran:4:103 | yes | ok | ok | PASS | — |
| quran:2:238 | minor | ok | ok | PASS | gloss "(asr)" |
| quran:6:72 | minor | ok | ok | PASS | gloss "(salat)" |
| quran:24:56 | minor | ok | ok | PASS | glosses "(salat)", "(zakat)" |

## Most common failure causes

1. Reversed or shifted meaning of a clause (4): quran:3:19 "prompt à rendre compte"; quran:2:285 negation scope; quran:37:35 "s'enorgueillir de"; quran:6:19 addressee changed ("Lui dire").
2. Islamic term / divine-name problems (2): quran:2:255 Kursi rendered "Trône"; quran:59:23 المتكبر rendered "l'Orgueilleux".
3. Broken grammar or omitted subject (2): quran:42:13 unparseable clause; quran:48:26 subject الذين كفروا dropped.

## Pass IDs

quran:3:85, quran:21:92, quran:51:56, quran:2:208, quran:6:161, quran:42:53, quran:4:136, quran:2:21, quran:6:102, quran:4:125, quran:10:25, quran:9:33, quran:16:9, quran:23:52, quran:20:8, quran:59:24, quran:3:2, quran:7:180, quran:4:87, quran:64:13, quran:28:70, quran:112:1, quran:59:22, quran:6:3, quran:43:84, quran:20:98, quran:33:40, quran:14:24, quran:21:107, quran:3:18, quran:48:29, quran:7:158, quran:29:45, quran:4:103, quran:2:238, quran:6:72, quran:24:56
