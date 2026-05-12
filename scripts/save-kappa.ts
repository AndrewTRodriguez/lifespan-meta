/**
 * Save the computed Cohen's kappa value to runs.aggregates.
 *
 * Usage: pnpm tsx scripts/save-kappa.ts <runId> <kappaValue>
 *
 * Example: pnpm tsx scripts/save-kappa.ts 3 0.74
 */
import 'dotenv/config';
import { sql } from '../lib/db';

const runId = parseInt(process.argv[2], 10);
const kappa = parseFloat(process.argv[3]);

if (!runId || isNaN(kappa)) {
  console.error('Usage: pnpm tsx scripts/save-kappa.ts <runId> <kappaValue>');
  process.exit(1);
}

async function main() {
  const rows = (await sql`SELECT aggregates FROM runs WHERE id = ${runId}`) as any[];
  if (!rows.length) throw new Error(`Run ${runId} not found`);
  const updated = {
    ...(rows[0].aggregates ?? {}),
    advisor_kappa_vs_expert: kappa,
  };
  await sql`
    UPDATE runs
    SET aggregates = ${JSON.stringify(updated)}::jsonb
    WHERE id = ${runId}
  `;
  console.log(`Saved κ = ${kappa} for run ${runId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
