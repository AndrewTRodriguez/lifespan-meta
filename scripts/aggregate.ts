/**
 * Aggregate the results of a run into the runs.aggregates JSONB column.
 *
 * Usage: pnpm tsx scripts/aggregate.ts <runId>
 */
import 'dotenv/config';
import { sql } from '../lib/db';
import type { SolverOutput, AdvisorOutput } from '../lib/types';

interface ResultRow {
  entry_id: number;
  solver: SolverOutput;
  advisor: AdvisorOutput;
}

const runId = parseInt(process.argv[2], 10);
if (!runId) {
  console.error('Usage: pnpm tsx scripts/aggregate.ts <runId>');
  process.exit(1);
}

async function main() {
  const main = (await sql`
    SELECT entry_id, solver, advisor FROM results
    WHERE run_id = ${runId} AND split = 'main'
  `) as ResultRow[];

  const counter = (await sql`
    SELECT entry_id, solver, advisor FROM results
    WHERE run_id = ${runId} AND split = 'counterfactual'
  `) as ResultRow[];

  if (main.length === 0) {
    console.error(`Run ${runId} has no main-split results.`);
    process.exit(1);
  }

  const acc = (rows: ResultRow[]) =>
    rows.length === 0
      ? 0
      : rows.filter((r) => r.advisor.answer_correct).length / rows.length;

  const mechAcc = (rows: ResultRow[]) =>
    rows.length === 0
      ? 0
      : rows.filter((r) => r.advisor.mechanism_correct).length / rows.length;

  // Failure mode distribution on main split
  const failureCounts: Record<string, number> = {};
  for (const r of main) {
    const fm = r.advisor.failure_mode;
    failureCounts[fm] = (failureCounts[fm] || 0) + 1;
  }

  // Calibration buckets on main split
  const buckets = [
    { lo: 0.0, hi: 0.2 },
    { lo: 0.2, hi: 0.4 },
    { lo: 0.4, hi: 0.6 },
    { lo: 0.6, hi: 0.8 },
    { lo: 0.8, hi: 1.01 },
  ];
  const calibration = buckets.map((b) => {
    const inBucket = main.filter(
      (r) => r.solver.confidence >= b.lo && r.solver.confidence < b.hi,
    );
    return {
      confidence_bin: `${b.lo.toFixed(1)}-${b.hi === 1.01 ? '1.0' : b.hi.toFixed(1)}`,
      n: inBucket.length,
      accuracy:
        inBucket.length === 0
          ? 0
          : inBucket.filter((r) => r.advisor.answer_correct).length /
            inBucket.length,
    };
  });

  // Per-class breakdown of accuracy on main split (helps catch class imbalance issues)
  const classBreakdown: Record<string, { n: number; accuracy: number }> = {};
  for (const cls of ['pro_longevity', 'anti_longevity', 'unclear']) {
    const inClass = main.filter((r) => r.solver.longevity_influence === cls);
    classBreakdown[cls] = {
      n: inClass.length,
      accuracy:
        inClass.length === 0
          ? 0
          : inClass.filter((r) => r.advisor.answer_correct).length /
            inClass.length,
    };
  }

  // Existing kappa value (preserved across re-runs of this aggregator)
  const existingRows = (await sql`
    SELECT aggregates FROM runs WHERE id = ${runId}
  `) as any[];
  const existingKappa =
    existingRows[0]?.aggregates?.advisor_kappa_vs_expert ?? null;

  const aggregates = {
    total_entries: main.length,
    main_accuracy: acc(main),
    counterfactual_accuracy: acc(counter),
    contamination_gap_pp: Math.round((acc(main) - acc(counter)) * 100),
    mechanism_accuracy_main: mechAcc(main),
    advisor_kappa_vs_expert: existingKappa,
    failure_mode_counts: failureCounts,
    calibration_buckets: calibration,
    class_breakdown_main: classBreakdown,
    aggregated_at: new Date().toISOString(),
  };

  await sql`
    UPDATE runs
    SET aggregates = ${JSON.stringify(aggregates)}::jsonb
    WHERE id = ${runId}
  `;
  console.log(JSON.stringify(aggregates, null, 2));
  console.log(`\nWritten to runs.aggregates for run ${runId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
