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

## After 1.1
Only new ideas that have not been planned or decided yet.
