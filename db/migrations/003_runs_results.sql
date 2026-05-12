-- Runs table: one row per execution of scripts/run-eval.ts.
CREATE TABLE IF NOT EXISTS runs (
  id                  SERIAL PRIMARY KEY,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  model               TEXT NOT NULL,
  solver_prompt_v     TEXT NOT NULL,
  advisor_prompt_v    TEXT NOT NULL,
  solver_prompt_hash  TEXT NOT NULL,
  advisor_prompt_hash TEXT NOT NULL,
  format_entry_v      TEXT NOT NULL,
  notes               TEXT,
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  aggregates          JSONB
);

-- Exactly one primary run at a time.
CREATE UNIQUE INDEX IF NOT EXISTS runs_one_primary_idx
  ON runs(is_primary) WHERE is_primary = TRUE;

-- Results table: one row per (run, entry, split).
CREATE TABLE IF NOT EXISTS results (
  run_id          INT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  entry_id        INT NOT NULL REFERENCES entries(id),
  split           TEXT NOT NULL CHECK (split IN ('main', 'counterfactual')),
  prompt_sent     TEXT NOT NULL,
  solver          JSONB NOT NULL,
  advisor         JSONB NOT NULL,
  api_latency_ms  INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, entry_id, split)
);

CREATE INDEX IF NOT EXISTS results_failure_mode_idx
  ON results ((advisor->>'failure_mode'));

CREATE INDEX IF NOT EXISTS results_entry_idx
  ON results (entry_id);
