-- Command 05: keyword indexes over the same fixed sources (no new data).
-- All FTS rows carry an explicit rowid so a row can be replaced by rowid (an UNINDEXED id column is
-- never used in a WHERE clause: that would scan the whole table).
--   passages_fts.rowid    = passages.rowid
--   passages_en_fts.rowid = passages.rowid
--   tafsir_fts.rowid      = passages.rowid * 10 + 1 (al-Muyassar) or + 2 (al-Saadi)

-- Tafsir text (al-Muyassar, al-Saadi with HTML removed), searchable and mapped back to its ayah.
CREATE VIRTUAL TABLE IF NOT EXISTS tafsir_fts USING fts5(
  id UNINDEXED,        -- tafsir:muyassar:<sura>:<aya> | tafsir:saadi:<sura>:<aya>
  ayah_id UNINDEXED,   -- quran:<sura>:<aya>
  src UNINDEXED,       -- muyassar | saadi
  text_search,
  tokenize = 'unicode61'
);

-- English meaning (Sahih International) for English questions.
CREATE VIRTUAL TABLE IF NOT EXISTS passages_en_fts USING fts5(
  id UNINDEXED,
  text_en,
  tokenize = 'porter unicode61'
);
