-- Passages: every record from data/processed/*.jsonl. `text` is stored exactly as ingested.
-- Source-specific fields (muyassar, saadi, saadi_range, url_en, footnotes, edition, …) go in `extra` JSON.
CREATE TABLE IF NOT EXISTS passages (
  id          TEXT PRIMARY KEY,          -- e.g. quran:2:255, aqeedah:tawhid:001
  source      TEXT NOT NULL,             -- ksu | shamela | sunnah
  kind        TEXT NOT NULL,             -- ayah | aqeedah | hadith
  ref         TEXT NOT NULL,             -- human reference shown under the quote
  url         TEXT NOT NULL,             -- original page
  text        TEXT NOT NULL,             -- verbatim source text
  text_en     TEXT,                      -- Sahih International / sunnah.com English, verbatim
  text_search TEXT NOT NULL,             -- normalized, search only
  embed_text  TEXT NOT NULL,             -- what was embedded
  book        TEXT,
  chapter     TEXT,
  sura        INTEGER,
  aya         INTEGER,
  page        INTEGER,
  extra       TEXT NOT NULL DEFAULT '{}',
  indexed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS passages_kind ON passages(kind);
CREATE INDEX IF NOT EXISTS passages_sura_aya ON passages(sura, aya);

-- Keyword search over text_search (already normalized, so unicode61 needs no diacritic folding).
CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
  id UNINDEXED,
  text_search,
  tokenize = 'unicode61'
);

-- Answer cache for level أ/ب questions only. Key = SHA-256 of normalized question + lang.
-- The question text itself is never stored.
CREATE TABLE IF NOT EXISTS cache (
  key         TEXT PRIMARY KEY,
  lang        TEXT NOT NULL,
  level       TEXT NOT NULL CHECK (level IN ('a', 'b')),
  answer      TEXT NOT NULL,             -- JSON answer card (passage ids + explanation)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  hits        INTEGER NOT NULL DEFAULT 0
);

-- Approved FAQ. The "approved" badge requires reviewer name and date (rule 8).
CREATE TABLE IF NOT EXISTS faq (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lang          TEXT NOT NULL,
  question      TEXT NOT NULL,           -- curated FAQ wording, not user input
  question_key  TEXT NOT NULL,           -- SHA-256 of normalized question
  answer        TEXT NOT NULL,           -- JSON answer card
  approved_by   TEXT,
  approved_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS faq_key ON faq(question_key, lang);

-- Daily per-client limit. ip_hash = SHA-256(IP + secret daily salt); the IP is never stored.
CREATE TABLE IF NOT EXISTS usage_daily (
  day      TEXT NOT NULL,                -- YYYY-MM-DD (Asia/Riyadh)
  ip_hash  TEXT NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, ip_hash)
);

-- Global monthly LLM budget.
CREATE TABLE IF NOT EXISTS usage_monthly (
  month       TEXT PRIMARY KEY,          -- YYYY-MM
  llm_calls   INTEGER NOT NULL DEFAULT 0,
  tokens_in   INTEGER NOT NULL DEFAULT 0,
  tokens_out  INTEGER NOT NULL DEFAULT 0
);

-- User reports about an answer (no question text, no IP).
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_key  TEXT,                      -- cache key of the reported answer, if any
  passage_id  TEXT,
  reason      TEXT NOT NULL,             -- fixed set chosen in the UI
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
