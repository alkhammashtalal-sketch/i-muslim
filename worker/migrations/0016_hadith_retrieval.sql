-- Reply 0048: hadiths in the answers (HadeethEnc's sahih and hasan, marfu' only), behind HADITH_RETRIEVAL ('off' by
-- default). A hadith is a passage (kind 'hadith', id hadith:<id>) that the Worker builds from its Arabic row in
-- `hadiths`, byte for byte (worker/src/hadith-index.ts). Its keyword indexes are its own, and its vectors are in their
-- own Vectorize index (imuslim-next-hadiths), so the answer path with the switch off reads exactly what it read before.
-- rowid = passages.rowid; rows are written and replaced by rowid only, never by the UNINDEXED id (CLAUDE.md §12).
CREATE VIRTUAL TABLE IF NOT EXISTS hadith_fts USING fts5(
  id UNINDEXED,        -- hadith:<id>
  text_search,         -- the title and the text, normalized (ftsIndexText)
  tokenize = 'unicode61'
);
-- HadeethEnc's English translation, for English questions.
CREATE VIRTUAL TABLE IF NOT EXISTS hadith_en_fts USING fts5(
  id UNINDEXED,
  text_en,
  tokenize = 'porter unicode61'
);
-- «هل حديث كذا صحيح؟» (reply 0048, Talal 14 October 09:25): every Arabic HadeethEnc row whatever its grade, to find the
-- hadith a question quotes and give its grade as written. rowid = hadiths.rowid.
CREATE VIRTUAL TABLE IF NOT EXISTS hadith_grade_fts USING fts5(
  id UNINDEXED,        -- the HadeethEnc id
  text_search,
  tokenize = 'unicode61'
);
