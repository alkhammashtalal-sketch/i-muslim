-- Translations of the meanings from QuranEnc (source ط, reply 0032 part A): each row keeps its translation's version
-- and its footnotes as received, and the translation key (for the link to its page). Rows from the Ayat archive
-- (Bengali, Malay) have no version or key.
ALTER TABLE ayah_translations ADD COLUMN version TEXT;
ALTER TABLE ayah_translations ADD COLUMN footnotes TEXT;
ALTER TABLE ayah_translations ADD COLUMN source_key TEXT;
