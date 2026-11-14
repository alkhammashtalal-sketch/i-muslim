-- «المختصر في تفسير القرآن الكريم» by source (reply 0031-add14 §3): `quranenc` (QuranEnc's *_mokhtasar keys, under
-- its published terms, shown) and `mokhtasr.com` (the publisher's API, off until their permission). The text as
-- received, with the version and key. Read by primary key only.
CREATE TABLE IF NOT EXISTS tafsir_translations (
  source TEXT NOT NULL,
  lang TEXT NOT NULL,
  sura INTEGER NOT NULL,
  aya INTEGER NOT NULL,
  text TEXT NOT NULL,
  version TEXT,
  source_key TEXT,
  PRIMARY KEY (source, lang, sura, aya)
);
