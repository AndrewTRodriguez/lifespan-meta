-- db/migrations/001_entries.sql
-- Creates the entries table and indexes

CREATE TABLE IF NOT EXISTS entries (
  id                              SERIAL PRIMARY KEY,
  genage_id                       TEXT NOT NULL,
  entrez_id                       TEXT NOT NULL UNIQUE,
  symbol                          TEXT NOT NULL,
  organism                        TEXT NOT NULL,
  full_name                       TEXT NOT NULL,
  protein_names                   TEXT[] NOT NULL DEFAULT '{}',
  go_mf_terms                     TEXT[] NOT NULL DEFAULT '{}',
  lifespan_effect                 TEXT NOT NULL DEFAULT '',
  longevity_influence             TEXT NOT NULL DEFAULT '',
  functional_description_raw      TEXT NOT NULL,
  functional_description_redacted TEXT NOT NULL,
  redaction_density               REAL NOT NULL DEFAULT 0,
  qc_reasons                      TEXT[] NOT NULL DEFAULT '{}',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entries_organism_idx ON entries (organism);
CREATE INDEX IF NOT EXISTS entries_longevity_influence_idx ON entries (longevity_influence);