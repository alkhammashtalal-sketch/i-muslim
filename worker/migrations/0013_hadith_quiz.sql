-- «تأكد من فهمك» (reply 0033 §أ2): the questions of a hadith in one language, as JSON, computed at load time by
-- scripts/index/hadith-quiz.mjs (via load-hadith.mjs) and read with the row by primary key (id, lang). NULL when the
-- row has no benefits, is weak, mawdu or mixed, or no question kept three valid wrong options.
ALTER TABLE hadiths ADD COLUMN quiz TEXT;
