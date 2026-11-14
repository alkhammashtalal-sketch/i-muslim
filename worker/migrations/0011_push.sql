-- Prayer bells and the daily-portion reminder by Web Push (reply 0032 part E). One row per subscription, deleted when
-- the user turns the bells off or the push service says the subscription is gone. Only what the timing needs: the
-- subscription, a cell of 0.1° (about 11 km; never the exact position), the time zone, the calculation settings, the
-- enabled prayers, the reminder time, the language of the texts. next_at (epoch ms) is the next due bell, read by the
-- every-minute cron through its index.
CREATE TABLE IF NOT EXISTS push_subs (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  cell_lat REAL NOT NULL,
  cell_lng REAL NOT NULL,
  tz TEXT NOT NULL,
  method TEXT NOT NULL,
  asr TEXT NOT NULL,
  adjust TEXT NOT NULL,
  prayers TEXT NOT NULL,
  ward TEXT,
  lang TEXT NOT NULL,
  next_at INTEGER NOT NULL,
  next_kind TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subs_due ON push_subs (next_at);
