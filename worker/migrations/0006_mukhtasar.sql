-- «المختصر في تفسير القرآن الكريم» in the reader's language (reply 0031-add9): from the publisher's official API
-- (mokhtasr.com, with a key), behind MUKHTASAR_PUBLIC. Empty until Talal has the key; shown publicly only after the
-- written permission is in docs/permissions/. Read by primary key only: (lang, sura, aya). The text as received.
CREATE TABLE IF NOT EXISTS mukhtasar (
  lang TEXT NOT NULL,
  sura INTEGER NOT NULL,
  aya INTEGER NOT NULL,
  text TEXT NOT NULL,
  book_id INTEGER NOT NULL,
  book_title TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (lang, sura, aya)
);
