CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  environment TEXT NOT NULL,
  model TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('queued', 'processed', 'failed')),
  payload_json TEXT NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS traces_time_idx ON traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS traces_filter_idx ON traces(environment, model, timestamp DESC);
CREATE INDEX IF NOT EXISTS traces_processing_idx ON traces(processing_status, received_at DESC);

CREATE TABLE IF NOT EXISTS spans (
  trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (trace_id, id)
);
CREATE INDEX IF NOT EXISTS spans_trace_idx ON spans(trace_id, started_at);

CREATE TABLE IF NOT EXISTS retrieval_chunks (
  trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (trace_id, id)
);

CREATE TABLE IF NOT EXISTS eval_results (
  trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  evaluator TEXT NOT NULL,
  score REAL NOT NULL,
  passed INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (trace_id, id)
);
CREATE INDEX IF NOT EXISTS eval_results_evaluator_idx ON eval_results(evaluator, passed);

CREATE TABLE IF NOT EXISTS workspace_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  metric TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS alert_rules_metric_idx ON alert_rules(metric, enabled);

CREATE TABLE IF NOT EXISTS eval_cases (
  id TEXT PRIMARY KEY,
  promoted_from_trace TEXT,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS eval_cases_promoted_idx ON eval_cases(promoted_from_trace) WHERE promoted_from_trace IS NOT NULL;

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS eval_runs_time_idx ON eval_runs(created_at DESC);

