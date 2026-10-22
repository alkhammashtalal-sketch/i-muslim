-- Tafsir books beyond the two kept in passages.extra (al-Muyassar, al-Saadi): reply 0071 §5, Talal 22 October 05:06.
-- Ibn Kathir from the Ayat project (tafasir.ayt → tafasir/katheer.ayt), one entry an ayah, its text as the file holds it
-- (simple HTML paragraphs). A table of its own, read by key (book, sura, aya), so the answer path that reads passages
-- does not carry its long entries. Added only; nothing changes in the other tables.
CREATE TABLE IF NOT EXISTS tafsir_books (
  book TEXT NOT NULL,
  sura INTEGER NOT NULL,
  aya INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (book, sura, aya)
);
