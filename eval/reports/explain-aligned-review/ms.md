# Review of al-Tafsir al-Muyassar machine translations - Malay (ms)

Translator model: DeepSeek V4 Flash. Judged sentence by sentence against the Arabic Muyassar source.

Verdict rule: PASS if FAITHFUL is yes/minor AND TERMS ok AND LANGUAGE ok or trivially minor; otherwise FAIL.

| # | id | faithful | terms | language | verdict | reason |
|---|----|----------|-------|----------|---------|--------|
| 1 | quran:3:19 | minor | ok | ok | PASS | s4: 'rububiyyah wa uluhiyyah' rendered 'ketuhanan-Nya dan keesaan-Nya' (uluhiyyah -> oneness, near-synonym shift only) |
| 2 | quran:3:85 | minor | ok | ok | PASS | added parenthetical gloss '(kebahagiaan)' on 'bahagian-bahagian' for huzuz; within the word's sense, no new information |
| 3 | quran:21:92 | yes | ok | ok | PASS |  |
| 4 | quran:2:285 | yes | ok | ok | PASS |  |
| 5 | quran:51:56 | yes | ok | ok | PASS |  |
| 6 | quran:42:13 | yes | ok | ok | PASS |  |
| 7 | quran:6:161 | yes | ok | ok | PASS |  |
| 8 | quran:42:53 | yes | ok | ok | PASS | language trivially minor: Indonesian 'yaitu' for Malay 'iaitu' in s3; 'sesuai amalnya' Indonesian-flavoured |
| 9 | quran:4:136 | yes | ok | ok | PASS |  |
| 10 | quran:2:21 | yes | ok | ok | PASS |  |
| 11 | quran:6:102 | minor | ok | ok | PASS | s2: 'subhanahu' expanded to 'Maha Suci lagi Maha Tinggi' (harmless) |
| 12 | quran:4:125 | yes | ok | ok | PASS |  |
| 13 | quran:10:25 | yes | ok | ok | PASS |  |
| 14 | quran:9:33 | yes | ok | ok | PASS |  |
| 15 | quran:16:9 | yes | ok | ok | PASS |  |
| 16 | quran:23:52 | yes | ok | ok | PASS |  |
| 17 | quran:20:8 | yes | ok | ok | PASS |  |
| 18 | quran:59:24 | minor | ok | ok | PASS | 'al-Bari' al-Munshi' al-Mujid' merged into 'Yang Mengadakan dan mewujudkan' and 'lahu subhanahu' -> 'bagi-Nya' (harmless compression); 'Dia lah' should be 'Dialah' |
| 19 | quran:2:255 | minor | ok | problem | FAIL | Garbled grammar in s1: 'Allah yang tidak berhak menerima ketuhanan dan penghambaan kecuali Dia' reads on its face as Allah not entitled to divinity; malformed 'tidak mengantuk-Nya iaitu: rasa kantuk'; broken word 'Subhanah' in s2; 'al-Qa'im ala kulli shay' rendered 'berdiri sendiri atas segala sesuatu' |
| 20 | quran:3:2 | yes | ok | ok | PASS |  |
| 21 | quran:7:180 | yes | ok | ok | PASS |  |
| 22 | quran:4:87 | yes | ok | ok | PASS |  |
| 23 | quran:64:13 | yes | ok | ok | PASS |  |
| 24 | quran:28:70 | yes | ok | ok | PASS |  |
| 25 | quran:112:1 | yes | ok | ok | PASS |  |
| 26 | quran:59:22 | yes | ok | ok | PASS | language trivially minor: Indonesian spelling 'rahasia' (Malay 'rahsia') |
| 27 | quran:6:3 | yes | ok | ok | PASS |  |
| 28 | quran:43:84 | yes | ok | ok | PASS |  |
| 29 | quran:20:98 | yes | ok | ok | PASS |  |
| 30 | quran:59:23 | minor | ok | ok | PASS | s1: 'bila mumana'ah wa la mudafa'ah' -> 'tanpa halangan dan tanpa pertahanan' (literal, meaning kept); s2: 'fi ibadatihi' -> 'dalam ibadah mereka' (pronoun shift, same sense) |
| 31 | quran:37:35 | yes | ok | ok | PASS |  |
| 32 | quran:33:40 | yes | ok | ok | PASS |  |
| 33 | quran:14:24 | yes | ok | ok | PASS |  |
| 34 | quran:21:107 | yes | ok | ok | PASS |  |
| 35 | quran:48:26 | minor | ok | ok | PASS | s2: purpose clause 'li-alla yuqirru' rendered as cause 'kerana enggan mengakui' (same gist); 'ahl hadhihi al-kalimah dun al-mushrikin' -> literal 'pemilik kalimah itu tanpa orang-orang musyrik' |
| 36 | quran:3:18 | yes | ok | ok | PASS |  |
| 37 | quran:6:19 | no | ok | ok | FAIL | s2: 'undhirakum bihi adhabahu an yahilla bikum' rendered 'memberi amaran kepada kamu dengan azab-Nya agar menimpa kamu' - 'agar' makes the punishment befalling them the PURPOSE of the warning (source: warn of His punishment befalling you / lest it befall you); meaning distorted |
| 38 | quran:48:29 | yes | ok | ok | PASS | language minor: stilted Arabic word order in s3 ('supaya Dia memarahkan dengan orang-orang mukmin ini ... orang-orang kafir') and calque in s5 ('telah wujud pada haknya sebab itu'); meaning recoverable |
| 39 | quran:7:158 | minor | ok | ok | PASS | 'bima amarakum bihi' (what he, the Messenger, commanded) rendered 'yang diperintahkan-Nya' (He = Allah) - referent shift, same content; odd coinage 'komitmenlah' |
| 40 | quran:29:45 | yes | ok | ok | PASS |  |
| 41 | quran:4:103 | yes | ok | ok | PASS |  |
| 42 | quran:2:238 | yes | ok | ok | PASS |  |
| 43 | quran:6:72 | minor | ok | ok | PASS | s1: 'nakhshahu' (fear Him) -> 'bertakwa kepada-Nya' (near-synonym) |

**Judged:** 43  **Pass:** 41  **Fail:** 2  **Pass rate:** 95.3%

## Failure causes

1. Garbled/broken Malay grammar (malformed 'tidak mengantuk-Nya', broken 'Subhanah', opening clause of Ayat al-Kursi reading as Allah not entitled to divinity) - quran:2:255.
2. A connector that changes meaning: purpose 'agar menimpa kamu' turning the warned-of punishment into the goal of the warning - quran:6:19.
3. No third failure cause. Recurring non-fatal issues: Indonesian spellings leaking into Malay ('yaitu', 'rahasia'), stilted Arabic word order / calques (48:29, 48:26), small near-synonym shifts (uluhiyyah -> keesaan, nakhshahu -> bertakwa).

## Pass IDs

quran:3:19, quran:3:85, quran:21:92, quran:2:285, quran:51:56, quran:42:13, quran:6:161, quran:42:53, quran:4:136, quran:2:21, quran:6:102, quran:4:125, quran:10:25, quran:9:33, quran:16:9, quran:23:52, quran:20:8, quran:59:24, quran:3:2, quran:7:180, quran:4:87, quran:64:13, quran:28:70, quran:112:1, quran:59:22, quran:6:3, quran:43:84, quran:20:98, quran:59:23, quran:37:35, quran:33:40, quran:14:24, quran:21:107, quran:48:26, quran:3:18, quran:48:29, quran:7:158, quran:29:45, quran:4:103, quran:2:238, quran:6:72
