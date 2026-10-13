-- Requests for a language the app does not serve yet (reply 0033 §أ1): only the language's name as typed, normalised
-- on the device (shared/lang-norm.ts), and how many asked for it in a month. No IP, no exact time, no identifier of
-- any kind: one row per (text, month), its count raised by each request (POST /api/lang-request, worker/src/lang-request.ts).
CREATE TABLE IF NOT EXISTS lang_requests (
  text  TEXT NOT NULL,              -- the normalised name, 2 to 40 letters and spaces
  month TEXT NOT NULL,              -- YYYY-MM (Riyadh)
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (text, month)
) WITHOUT ROWID;
