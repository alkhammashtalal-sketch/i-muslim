-- Translations of the meanings of the Quran in seven of our languages, from the same Ayat archive (KSU) as Sahih
-- International: ur, id, ms, tr, fr, es, bn (Talal's decision of 6 October 18:08; command 22). Read by primary key
-- only: (lang, sura, aya). The translator as the project names it.
CREATE TABLE IF NOT EXISTS ayah_translations (
  lang TEXT NOT NULL,
  sura INTEGER NOT NULL,
  aya INTEGER NOT NULL,
  text TEXT NOT NULL,
  translator TEXT NOT NULL,
  PRIMARY KEY (lang, sura, aya)
);
