-- Quran reader (command 09).

-- Sura index: 114 rows, so GET /api/suras never scans `passages`.
-- Filled once from passages (one pass over 6,236 ayah rows); re-run this INSERT after a re-index.
CREATE TABLE IF NOT EXISTS suras (
  n           INTEGER PRIMARY KEY,       -- 1..114
  name        TEXT NOT NULL,             -- Arabic name as in the KSU source (extra.sura_name)
  ayat        INTEGER NOT NULL,
  first_page  INTEGER NOT NULL           -- mushaf page of the first ayah
);

INSERT OR REPLACE INTO suras (n, name, ayat, first_page)
SELECT sura, json_extract(extra, '$.sura_name'), max(aya), min(page)
  FROM passages
 WHERE kind = 'ayah'
 GROUP BY sura;

-- "Explain in my language" (part B): one machine explanation of al-Muyassar per ayah and language.
CREATE TABLE IF NOT EXISTS explain_cache (
  id          TEXT NOT NULL,             -- quran:<sura>:<aya>
  lang        TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, lang)
);
