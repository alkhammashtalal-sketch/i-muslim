-- Reply 0072 item 13, «الإحالة بمصدر» (add-on 0069-add6 §2 ب): published fatwas of Ibn Baz (binbaz.org.sa) and
-- Ibn ʿUthaymin (binothaimeen.net) on taharah, salah, sawm and inheritance, behind the fix «fatwa-ref» (src/fatwa.ts),
-- off unless named. A personal case (level D) keeps its referral, and its card may carry one fatwa on a general question
-- of the same matter, its question and answer verbatim from this table, with its scholar and its link.
-- Rows come from data/processed/fatwas.jsonl (scripts/ingest/fatwas-build.mjs, scripts/index/fatwas-sql.mjs).
CREATE TABLE IF NOT EXISTS fatwas (
  id TEXT PRIMARY KEY,          -- fatwa:binbaz:<number> | fatwa:binothaimeen:<the site's id>
  site TEXT NOT NULL,           -- binbaz.org.sa | binothaimeen.net
  scholar TEXT NOT NULL,        -- «ابن باز» | «ابن عثيمين»: the explainer's name, allowed by CLAUDE.md §3 rule 14
  number TEXT,                  -- the site's own fatwa number, where the site shows one (binbaz.org.sa)
  title TEXT NOT NULL,          -- the site's own title, verbatim
  question TEXT NOT NULL,       -- verbatim, its paragraphs joined by a line break (HTML removed)
  answer TEXT NOT NULL,         -- verbatim, likewise
  topic TEXT NOT NULL,          -- taharah | salah | sawm | mawarith
  category TEXT NOT NULL,       -- the site's own subtopic(s), « · »-joined
  series TEXT,                  -- where it was given, as the site names it («نور على الدرب», «لقاء الباب المفتوح [104]»)
  url TEXT NOT NULL,            -- the fatwa's own page
  fetched_at TEXT NOT NULL,
  general INTEGER NOT NULL      -- 1: the question names no particular person's circumstances (fatwas-build.mjs); only
                                --    these are searched (fatwa_fts, imuslim-v11-fatwas) and offered to the model
);
-- The title and the question, normalized (ftsIndexText), for the general fatwas only. rowid = fatwas.rowid; rows are
-- written and replaced by rowid only, never by the UNINDEXED id (CLAUDE.md §12).
CREATE VIRTUAL TABLE IF NOT EXISTS fatwa_fts USING fts5(
  id UNINDEXED,
  text_search,
  tokenize = 'unicode61'
);
