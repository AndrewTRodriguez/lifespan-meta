// scripts/seed-entries.ts
import fs from 'node:fs';
import readline from 'node:readline';
import postgres from 'postgres';
import * as dotenv from 'node:fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Make sure .env is loaded.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function main() {
  // Create table if it doesn't exist
  await sql.unsafe(`
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
  `);
  console.log('Table ready.');

  const lines: any[] = [];
  const input = readline.createInterface({
    input: fs.createReadStream('data/processed/passed.jsonl')
  });
  for await (const line of input) lines.push(JSON.parse(line));
  console.log(`Loaded ${lines.length} entries from passed.jsonl`);

  // Insert in batches of 100
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < lines.length; i += BATCH) {
    const batch = lines.slice(i, i + BATCH);
    await sql`
      INSERT INTO entries ${sql(batch.map(e => ({
        genage_id:                       e.genage_id,
        entrez_id:                       e.entrez_id,
        symbol:                          e.symbol,
        organism:                        e.organism,
        full_name:                       e.full_name,
        protein_names:                   e.protein_names,
        go_mf_terms:                     e.go_mf_terms,
        lifespan_effect:                 e.lifespan_effect,
        longevity_influence:             e.longevity_influence,
        functional_description_raw:      e.functional_description_raw,
        functional_description_redacted: e.functional_description_redacted,
        redaction_density:               e.redaction_density,
        qc_reasons:                      e.qc_reasons,
      })))}
      ON CONFLICT (entrez_id) DO NOTHING
    `;
    inserted += batch.length;
    console.log(`Inserted ${inserted} / ${lines.length}`);
  }

  console.log('Seeding complete.');
  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
