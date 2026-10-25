# Adhan recordings (prayer-time alert and full adhan)

Used by the app «مسلم» (add-ons 0072-add21, 0072-add24): the alert clip `adhan-short` / `adhan-fajr-short` and each
prayer's full adhan `adhan-full-*`, served from our server (`web/public/sounds/`, listed in `manifest.json` with
their SHA-256), never bundled in the app.

- **Source:** "Adhan Recordings from Doha, Qatar", Internet Archive
  https://archive.org/details/adhan.recordings.from.doha.qatar
- **Usage, as shown on the page:** Public Domain Mark 1.0
  http://creativecommons.org/publicdomain/mark/1.0/
- Recorded between 2013 and 2014 (the item's description). The muezzin is not named on the page.

## Changes made by us
- Trimmed to the words of the adhan only (the du'a, the announcer and the music after it removed).
- Level-matched (linear gain to about -16 LUFS); no limiter, compressor or noise reduction.
- Converted to CAF (IMA4) and OGG for the alert clip, and M4A (AAC) for the full adhans.
- The alert clip (19.85 s) is the opening of the Asr adhan, cut at the end of a phrase; Fajr uses the same clip.
- The Fajr full adhan joins phrases 1–10 of the Asr file (the same recording and muezzin) with the Fajr file from
  «الصلاة خير من النوم» onward, to replace a 0.28 s dropout in the Fajr file.

The measurements and the transcripts of every phrase: relay/w1/0072-alerts/adhan/README.md (outside the repository).
