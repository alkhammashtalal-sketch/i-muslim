-- Reply 0037 §4.1 and §5. Additions only: one index and one table, nothing altered or dropped, so this file can run
-- again safely.
--
-- reports_created_at: the daily retention job (worker/src/retention.ts) deletes the answer card's reports (table reports,
-- migration 0001; its created_at is the Riyadh date since 0014) once older than six months, through this index
-- (CLAUDE.md §12: no table scan; the DELETE names it with INDEXED BY). source_reports already has source_reports_day
-- (0014), and usage_daily's primary key begins with day.
CREATE INDEX IF NOT EXISTS reports_created_at ON reports (created_at);

-- recordings_monthly: the global monthly count of /api/transcribe recordings (limits.json monthlyRecordings, 20,000), one
-- row per Riyadh month (YYYY-MM), raised by one statement per recording while under the cap (worker/src/limits.ts
-- takeRecording). A number only: no audio, no text, no key of any device.
CREATE TABLE IF NOT EXISTS recordings_monthly (
  month TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
