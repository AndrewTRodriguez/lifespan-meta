/**
 * Generate a random sample of advisor judgments for hand-grading.
 *
 * Usage: pnpm tsx scripts/sample-for-kappa.ts <runId> [n=30]
 *
 * Output: kappa-sample-run<runId>.tsv with the model's prediction, the
 * advisor's grade, and three blank columns for your own grade.
 *
 * Workflow:
 *   1. Run this script to produce the TSV.
 *   2. Open in Excel / Google Sheets.
 *   3. Fill the YOUR_answer_correct, YOUR_failure_mode, YOUR_notes columns.
 *   4. Compute Cohen's kappa between advisor_failure_mode and YOUR_failure_mode
 *      (or between answer_correct columns — your choice; the failure_mode
 *      version is stricter).
 *   5. Run scripts/save-kappa.ts to write the value back.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { sql } from '../lib/db';

const runId = parseInt(process.argv[2], 10);
const N = parseInt(process.argv[3] ?? '30', 10);

if (!runId) {
  console.error('Usage: pnpm tsx scripts/sample-for-kappa.ts <runId> [n=30]');
  process.exit(1);
}

interface SampleRow {
  entry_id: number;
  symbol: string;
  organism: string;
  ground_truth: string;
  prompt_sent: string;
  solver: any;
  advisor: any;
}

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/[\t\n\r]/g, ' ').trim();
}

async function main() {
  const sample = (await sql`
    SELECT r.entry_id,
           e.symbol, e.organism, e.longevity_influence AS ground_truth,
           r.prompt_sent, r.solver, r.advisor
    FROM results r
    JOIN entries e ON e.id = r.entry_id
    WHERE r.run_id = ${runId} AND r.split = 'main'
    ORDER BY RANDOM()
    LIMIT ${N}
  `) as SampleRow[];

  const header = [
    'entry_id',
    'symbol',
    'organism',
    'ground_truth',
    'predicted',
    'confidence',
    'mechanism_predicted',
    'reasoning',
    'advisor_answer_correct',
    'advisor_mechanism_correct',
    'advisor_quality',
    'advisor_failure_mode',
    'advisor_notes',
    'YOUR_answer_correct',
    'YOUR_mechanism_correct',
    'YOUR_failure_mode',
    'YOUR_notes',
  ];

  const lines = [header.join('\t')];
  for (const s of sample) {
    lines.push(
      [
        s.entry_id,
        s.symbol,
        s.organism,
        s.ground_truth,
        s.solver.longevity_influence,
        s.solver.confidence,
        s.solver.mechanism_class,
        clean(s.solver.reasoning),
        s.advisor.answer_correct,
        s.advisor.mechanism_correct,
        s.advisor.reasoning_quality,
        s.advisor.failure_mode,
        clean(s.advisor.notes),
        '',
        '',
        '',
        '',
      ].join('\t'),
    );
  }

  const outPath = `kappa-sample-run${runId}.tsv`;
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath} (${N} entries).`);
  console.log('Open in Excel/Sheets and fill the YOUR_* columns.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
