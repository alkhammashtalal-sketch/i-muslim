-- «المصادر والشكر» (reply 0033 §أ3). Two new tables and an index, nothing altered, so this file can run again safely.
--
-- source_checks: «نتابع إصداراتهم». The monthly job (cron "0 3 1 * *", worker/src/sources.ts) asks the sources whose
-- API gives a version (QuranEnc's /api/v1/translations/list) and writes one row per item: the Riyadh date of the check
-- (no time), the registry id (data/sources.json), the source's own key, its language, our version (what D1 serves)
-- and theirs (what their API says; NULL when the key is gone). A newer version is never applied here: the page shows
-- it as «تحديث منتظر» and it is listed for Talal. Reads by key only: the latest date (the primary key's first column),
-- then that date's rows.
CREATE TABLE IF NOT EXISTS source_checks (
  checked_at TEXT NOT NULL,
  source TEXT NOT NULL,
  key TEXT NOT NULL,
  lang TEXT,
  ours TEXT,
  theirs TEXT,
  PRIMARY KEY (checked_at, source, key)
);

-- source_reports: «أبلغ عن خطأ» and support messages (POST /api/report with `kind`; the old shape {passageId, reason}
-- keeps the table reports). The type, the place when there is one (an ayah «sura:aya», a hadith number or a passage
-- id, the language, the registry id of the source and its version), an optional note of at most 500 characters, and
-- the Riyadh date only: no time, no IP, no identifier of any kind.
CREATE TABLE IF NOT EXISTS source_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  lang TEXT,
  source TEXT,
  version TEXT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS source_reports_day ON source_reports (day);
