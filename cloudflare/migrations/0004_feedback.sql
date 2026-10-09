CREATE TABLE IF NOT EXISTS trace_feedback (
  trace_id TEXT PRIMARY KEY REFERENCES traces(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
