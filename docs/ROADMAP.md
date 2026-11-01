# Roadmap (add-ons 0072-add26 and 0072-add34)

Talal, 25 October 15:00: «أبغاها كلها في الإصدار هذا… اللي بعده إذا جات إبداعات غير اللي فكرنا فيها وقررناها».
So everything planned here moves into 1.1 (add-on 0072-add34 §ب11), except what needs a payment or a new account.
Each item keeps the project's rules:
- the constant sources (CLAUDE.md §2);
- an independent review of every new religious text before it is enabled;
- the first-screen lock (CLAUDE.md §8).

## In 1.1
- **From the old 1.1.1:**
  - the user's data kept by the phone's own storage, migrated once from the WebView (0072-add25), and an iCloud copy without sign-in (0072-add34 §ب2);
  - the full adhan of each prayer inside the app;
  - the app's link and QR code on the share images;
  - asking for a rating at the right moment.
- **From the old 1.2, Ramadan:**
  - the month's timetable with Fajr as the end of suhur and Ibn Baz's text under it, plus the length of the fast;
  - the iftar and suhur countdown on the lock screen;
  - the Ramadan page from 1 Sha'ban.
  - The fasting adhkar as approved (add-on 0072-add38 §1).
- **Also new in 1.1:**
  - cards for sharing;
  - the app icon «المورّقة» and its alternatives;
  - quick actions and Siri;
  - optional reminders;
  - accessibility and its store labels;
  - checked prayer-time accuracy;
  - Time Sensitive prayer alerts;
  - the Fajr alarm (iOS 26);
  - the next-prayer countdown;
  - In-App Events drafts.

## Not in 1.1
- **Moved to the next release (add-ons 0072-add45 §1 and 0072-add46):**
  - The Umrah and Hajj lessons, built on Ibn Baz's fatwas in HTML on binbaz.org.sa, with hadiths from HadeethEnc (add-on 0072-add38 §3). The evidence so far is in relay/w1/0072-review-queue/umrah-batch-1-evidence/.
  - The taraweeh, qiyam and witr lesson (the prayers' batch 2), on its approved plan (relay/w1/0072-review-queue/taraweeh-plan.html).
  - The Apple Watch app: branch watch-0072 kept unmerged, and its two bundle identifiers already registered.
- Spoken announcements by a machine voice (a paid service, declined: 0072-add24 §2).
- Starting the next-prayer countdown by push, if it needs an APNs key (an account step for Talal).

## After iOS and Android are sent (add-on 0072-add40 §3)
- The site brought up to the latest release, with the two download buttons on its welcome page.
- The stable link /get sends Android to Google Play and computers to a page with both buttons. It needs a domain of our own first, because shared content never carries workers.dev (DECISIONS.md).

## In 1.2
Talal, 31 October 23:09: «خلاص أجّلها للإصدار القادم». The 1.1 scope is closed (add-on 0072-add57 §2).
- **What the «دلائل AI» demo has and we lack (add-on 0072-add56, moved whole by 0072-add57 §1).** The idea and its ease only, not its design, texts or numbers:
  - Source search: a literal FTS5 search in D1 over our constant texts only (Quran, the tafsirs, hadith with its grade, fatwas, the four books). It uses Arabic normalisation for the index and the query, shows the original text with its diacritics, and calls no model. Its screen has one field with examples, folded options (exact phrase, type, source), results grouped by source with the match highlighted, the reference, «النص كاملًا» and copy.
  - Six suggested questions in the empty «اسأل», from the reviewed common questions in the ten languages' tables.
  - A progress line while answering, «يبحث في المصادر…» then «بُحث في N مصادر», where N comes from the real retrieval, keeping the hidden-queue rule.
  - Every citation in an answer opens its passage highlighted in context, with the full page, ayah and tafsir, or hadith and its grade, and the original link (from `passage.ts`).
  - Conversation history on the device and in iCloud KVS, never sent to us. The privacy label stays «no data collected». The Play data-safety form is reviewed after it (In-app search history).
  - «اربط مسلم بمساعدك الذكي»: a read-only MCP server at `/mcp` (Streamable HTTP, `createMcpHandler`) with `search_sources`, `get_ayah`, `get_hadith` and `get_fatwa`. It has no model, a request limit, and a page with steps taken from each platform's current documentation.
  - «سريع» and «محقق» modes: awaiting Talal's decision.
  - Not taken: marketing numbers; we state no figure about us without a measurement.
- **Full accessibility (Talal's approval, 31 October 22:57; add-on 0072-add57 §1).** The goal is all of Apple's accessibility labels except «Dark Interface», tested with users of each group. It covers:
  - VoiceOver and TalkBack complete;
  - the recorded recitation, never a machine reading of the Quran;
  - the qibla by vibration and sound;
  - voice control, and a written text for every sound;
  - Saudi Sign Language for the prayer and wudu lessons, by a certified interpreter;
  - a simplified mode;
  - the prayer and purification of the sick from the fatwas of Ibn Baz and the Permanent Committee, reviewed by the coordinator.
- **No dark mode, ever** (Talal, 1 November 08:41: «وضع الداكن ألغيه، لا نسويه أبدًا»; add-on 0072-add60 §0). Apple's «Dark Interface» label is never declared.
- **Deferred by Talal, 1 November 12:31 (add-on 0072-add62 §5; the requests ledger, relay/w1/0072-requests-ledger.md):**
  - the rest of the names' content (14 of 96 now; server batches in the card's day order);
  - prayers batch 3: Friday, the two Eids, the funeral, the eclipse, rain, istikhara, the traveller, making up a prayer;
  - «100% بدون إنترنت… زي الحرم»: the whole Mushaf, the adhkar and offline search to 15 of 20;
  - interface languages beyond the ten;
  - gentle calendar alerts, which need full calendar access;
  - one adhkar page instead of two (with «أذكار المواقف»);
  - testing AlarmKit's upper limit of alarms on a real phone (14 days stays meanwhile);
  - the QR code to a fixed `/get` on our own domain (the App Store link stays meanwhile).
- **Translations outside QuranEnc's official list** (Russian, Italian, Korean, Zulu, Shona, seen on its home page): asked for when they enter the list (add-on 0072-add62 §2).
- **Urdu AM/PM** in Latin letters inside the Urdu screen (add-on 0072-add58 §3).

## After 1.1
Only new ideas that have not been planned or decided yet.
