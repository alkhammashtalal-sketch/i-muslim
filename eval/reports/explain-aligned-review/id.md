# Aligned review — al-Tafsir al-Muyassar → Indonesian (`id`)

Input: `explain3/id.jsonl` — 45 lines, judged sentence by sentence against `source_sentences`.

**Judged:** 45  **Pass:** 43  **Fail:** 2  **Pass rate:** 95.6%

| # | id | faithful | terms | language | verdict | reason |
|---|----|----------|-------|----------|---------|--------|
| 1 | quran:3:19 | yes | ok | ok | **PASS** |  |
| 2 | quran:3:85 | minor | ok | ok | **PASS** | S1: parenthetical gloss '(kebahagiaan)' added to 'bagian-bagian' for حظوظها; clarifying only, no new content |
| 3 | quran:21:92 | yes | ok | ok | **PASS** |  |
| 4 | quran:2:285 | yes | ok | minor | **PASS** | S1: predicate-first inversion 'Membenarkan dan meyakini Rasulullah ... terhadap apa yang diwahyukan' is a stiff Arabic calque but grammatical and understandable |
| 5 | quran:51:56 | yes | ok | ok | **PASS** |  |
| 6 | quran:2:208 | yes | ok | ok | **PASS** |  |
| 7 | quran:42:13 | yes | ok | ok | **PASS** |  |
| 8 | quran:6:161 | yes | ok | ok | **PASS** |  |
| 9 | quran:42:53 | yes | ok | ok | **PASS** |  |
| 10 | quran:4:136 | yes | ok | ok | **PASS** |  |
| 11 | quran:2:21 | yes | ok | ok | **PASS** |  |
| 12 | quran:6:102 | yes | ok | ok | **PASS** |  |
| 13 | quran:4:125 | minor | ok | ok | **PASS** | S1 'condong dari' (unidiomatic for مائلا عن, meaning still 'turning away from'); S3 'sifat kekasih (khullah)' imprecise for صفة الخُلّة but glossed with the Arabic term, same meaning |
| 14 | quran:10:25 | yes | ok | ok | **PASS** |  |
| 15 | quran:9:33 | yes | ok | ok | **PASS** |  |
| 16 | quran:16:9 | yes | ok | ok | **PASS** |  |
| 17 | quran:23:52 | yes | ok | ok | **PASS** |  |
| 18 | quran:20:8 | yes | ok | ok | **PASS** |  |
| 19 | quran:59:24 | yes | ok | ok | **PASS** |  |
| 20 | quran:2:255 | yes | ok | problem | **FAIL** | S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet) |
| 21 | quran:3:2 | yes | ok | ok | **PASS** |  |
| 22 | quran:7:180 | yes | ok | minor | **PASS** | Opening 'Dan bagi Allah ... memiliki nama-nama' doubles the possessive marker (bagi + memiliki); trivial |
| 23 | quran:4:87 | yes | ok | ok | **PASS** |  |
| 24 | quran:64:13 | yes | ok | ok | **PASS** |  |
| 25 | quran:28:70 | yes | ok | ok | **PASS** |  |
| 26 | quran:112:1 | yes | ok | ok | **PASS** |  |
| 27 | quran:59:22 | yes | ok | ok | **PASS** |  |
| 28 | quran:6:3 | minor | ok | ok | **PASS** | S2 'bukti-bukti keesaan-Nya' (proofs of His oneness) for دلائل ألوهيته (proofs of His divinity); near-synonym in this context, no doctrinal shift |
| 29 | quran:43:84 | yes | ok | ok | **PASS** |  |
| 30 | quran:20:98 | yes | ok | ok | **PASS** |  |
| 31 | quran:59:23 | yes | ok | ok | **PASS** |  |
| 32 | quran:37:35 | yes | ok | ok | **PASS** |  |
| 33 | quran:33:40 | yes | ok | ok | **PASS** |  |
| 34 | quran:14:24 | yes | ok | ok | **PASS** |  |
| 35 | quran:21:107 | yes | ok | ok | **PASS** |  |
| 36 | quran:48:26 | minor | ok | ok | **PASS** | S2 'pemilik kalimat itu tanpa orang-orang musyrik' renders دون المشركين over-literally ('without' instead of 'not/rather than the polytheists'); sense recoverable |
| 37 | quran:3:18 | yes | ok | ok | **PASS** |  |
| 38 | quran:6:19 | no | ok | ok | **FAIL** | S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted |
| 39 | quran:48:29 | minor | ok | ok | **PASS** | S7 'pendahuluan' (= preface) is a weak word choice for السبق (precedence); the surrounding phrase 'keutamaan ... dan kesempurnaan' keeps the sense |
| 40 | quran:7:158 | yes | ok | ok | **PASS** |  |
| 41 | quran:29:45 | yes | ok | ok | **PASS** |  |
| 42 | quran:4:103 | yes | ok | ok | **PASS** |  |
| 43 | quran:2:238 | yes | ok | ok | **PASS** |  |
| 44 | quran:6:72 | minor | ok | ok | **PASS** | S1 'kita' (inclusive we) for أُمرنا where the speaker addresses disbelievers; exclusive 'kami' would be precise, meaning otherwise intact |
| 45 | quran:24:56 | yes | ok | ok | **PASS** |  |

## Failures

- **quran:2:255** — S1 garbled Indonesian: 'Allah yang tidak berhak menerima ketuhanan dan peribadatan kecuali Dia' (literally 'Allah who is not entitled to divinity... except Him') and 'tidak mengantuk-Nya yaitu: kantuk' (ungrammatical, -Nya on a verb) make key clauses of Ayat al-Kursi unreadable; content itself faithful (Kursi = place of the two feet)
- **quran:6:19** — S2: 'agar aku memperingatkan kalian dengan azab-Nya agar menimpa kalian' turns أنذركم به عذابه أن يحل بكم into 'warn you ... so that it befalls you' — purpose reversed/distorted

## Notes

- Islamic terminology throughout uses the forms Indonesian Muslims use (shalat, zakat, tauhid, syariat, hisab, hujjah, Rabb, Ilah, shallallahu 'alaihi wa sallam, radhiyallahu 'anhum, Subhanahu wa Ta'ala, Ayat Kursi, Laa ilaaha illallah); no TERMS problems found.
- Doctrinally sensitive points were rendered correctly: al-Kursi as the place of the two feet (2:255), khullah affirmed as an attribute of Allah (4:125), the middle prayer identified as Ashar (2:238), 'no prophethood after him' (33:40), and the five Ulul-Azmi with 'according to the well-known view' (42:13).
- Recurring minor patterns (not failing on their own): small parenthetical glosses, over-literal renderings of Arabic particles (دون, عن), and stiff predicate-first word order copied from Arabic.
- The only language FAIL (2:255) is a readability failure in the most-read verse: two clauses are ungrammatical calques even though the content is faithful.
- The only faithfulness FAIL (6:19) is a reversed purpose clause ('warn you so that the punishment befalls you').
