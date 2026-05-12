// scripts/dump-db.ts
// Exports entries, runs, and results tables to a SQL insert file
import fs from 'node:fs';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

function escape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) {
    const inner = val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
    return `ARRAY[${inner}]`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function dumpTable(out: fs.WriteStream, table: string, rows: any[]) {
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows, skipping`);
    return;
  }
  const cols = Object.keys(rows[0]);
  out.write(`\n-- ${table} (${rows.length} rows)\n`);
  for (const row of rows) {
    const values = cols.map(c => escape(row[c])).join(', ');
    out.write(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
  }
  console.log(`  ${table}: ${rows.length} rows written`);
}

async function main() {
  const out = fs.createWriteStream('genage_eval_dump.sql');
  out.write('-- GenAge eval dump\n');
  out.write('-- Apply migrations first, then restore this file\n\n');
  out.write('SET session_replication_role = replica; -- disable FK checks during load\n');

  const entries = await sql`SELECT * FROM entries ORDER BY id`;
  await dumpTable(out, 'entries', entries);

  const runs = await sql`SELECT * FROM runs ORDER BY id`;
  await dumpTable(out, 'runs', runs);

  const results = await sql`SELECT * FROM results ORDER BY run_id, entry_id, split`;
  await dumpTable(out, 'results', results);

  out.write('\nSET session_replication_role = DEFAULT;\n');
  out.end();

  console.log('\nDone. Output: genage_eval_dump.sql');
  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});