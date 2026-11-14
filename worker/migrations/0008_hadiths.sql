-- HadeethEnc (source ب, reply 0032 B): one row per hadith per language, the fields as received, plus the derived
-- class and tier (scripts/ingest/hadeethenc-build.mjs) and the language's version. Sahih and hasan (tiers 1-3), and
-- the weak, mawdu and mixed (tier X, shown only with their badge, after the sahih, never as an answer: rule 10).
-- Grades left for review are not loaded. Reads by key: (id, lang); by (lang, tier, seq) for the card of the day; by
-- category through hadith_categories.
CREATE TABLE IF NOT EXISTS hadiths (
  id TEXT NOT NULL,
  lang TEXT NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  intro TEXT,
  attribution TEXT,
  grade TEXT,
  explanation TEXT,
  hints TEXT,
  words_meanings TEXT,
  reference TEXT,
  text_ar TEXT,
  grade_ar TEXT,
  attribution_ar TEXT,
  categories TEXT,
  class TEXT NOT NULL,
  tier TEXT NOT NULL,
  version TEXT,
  seq INTEGER,
  PRIMARY KEY (id, lang)
);
-- The card of the day: tier-1 Arabic rows numbered 0..N-1 in id order (seq), read by (lang, tier, seq).
CREATE INDEX IF NOT EXISTS hadiths_day ON hadiths (lang, tier, seq);
CREATE TABLE IF NOT EXISTS hadith_categories (
  category TEXT NOT NULL,
  id TEXT NOT NULL,
  tier TEXT NOT NULL,
  PRIMARY KEY (category, id)
);
