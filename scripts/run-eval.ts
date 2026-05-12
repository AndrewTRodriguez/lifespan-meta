/**
 * Eval runner. Iterates eligible entries × {main, counterfactual},
 * calls solver and advisor for each, writes raw responses to results.
 *
 * Usage:
 *   pnpm tsx scripts/run-eval.ts --smoke --notes "smoke test"
 *   pnpm tsx scripts/run-eval.ts --notes "first full run"
 *   pnpm tsx scripts/run-eval.ts --resume 3
 *
 * Resumability: if a (run_id, entry_id, split) already exists in results,
 * it is skipped. Pass --resume <runId> to continue an interrupted run.
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '../lib/db';
import { runSolver, runAdvisor, MODEL } from '../lib/anthropic';
import { formatEntry, FORMAT_ENTRY_VERSION } from '../lib/format-entry';
import {
  SOLVER_VERSION,
  ADVISOR_VERSION,
  SOLVER_PROMPT_HASH,
  ADVISOR_PROMPT_HASH,
} from '../lib/prompts';
import type { Entry, Split } from '../lib/types';

const SMOKE_TEST = process.argv.includes('--smoke');
const NOTES_IDX = process.argv.indexOf('--notes');
const NOTES = NOTES_IDX >= 0 ? process.argv[NOTES_IDX + 1] : null;
const RESUME_IDX = process.argv.indexOf('--resume');
const RESUME_RUN_ID =
  RESUME_IDX >= 0 ? parseInt(process.argv[RESUME_IDX + 1], 10) : null;

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY not set in .env');
}

async function fetchEntries(): Promise<Entry[]> {
  const limit = SMOKE_TEST ? 5 : 100000;
  const rows = (await sql`
    SELECT id, symbol, organism, full_name, protein_names, go_mf_terms,
           longevity_influence,
           functional_description_redacted,
           functional_description_raw
    FROM entries
    WHERE longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
    ORDER BY id
    LIMIT ${limit}
  `) as Entry[];
  return rows;
}

async function getOrCreateRun(): Promise<{ id: number }> {
  if (RESUME_RUN_ID !== null) {
    const rows = (await sql`SELECT id FROM runs WHERE id = ${RESUME_RUN_ID}`) as any[];
    if (!rows.length) throw new Error(`Run ${RESUME_RUN_ID} not found`);
    console.log(`Resuming run ${RESUME_RUN_ID}`);
    return rows[0];
  }
  const rows = (await sql`
    INSERT INTO runs (
      model, solver_prompt_v, advisor_prompt_v,
      solver_prompt_hash, advisor_prompt_hash,
      format_entry_v, notes
    ) VALUES (
      ${MODEL}, ${SOLVER_VERSION}, ${ADVISOR_VERSION},
      ${SOLVER_PROMPT_HASH}, ${ADVISOR_PROMPT_HASH},
      ${FORMAT_ENTRY_VERSION}, ${NOTES}
    )
    RETURNING id
  `) as any[];
  console.log(`Started run ${rows[0].id}`);
  return rows[0];
}

async function alreadyDone(
  runId: number,
  entryId: number,
  split: Split,
): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM results
    WHERE run_id = ${runId} AND entry_id = ${entryId} AND split = ${split}
  `) as any[];
  return rows.length > 0;
}

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const entries = await fetchEntries();
  console.log(
    `Loaded ${entries.length} entries${SMOKE_TEST ? ' (smoke test)' : ''}`,
  );

  const run = await getOrCreateRun();

  const splits: Split[] = ['main', 'counterfactual'];
  const total = entries.length * splits.length;
  let done = 0;
  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const entry of entries) {
    for (const split of splits) {
      done++;
      if (await alreadyDone(run.id, entry.id, split)) {
        console.log(
          `[${done}/${total}] ${entry.symbol} ${split} (skip — already done)`,
        );
        succeeded++;
        continue;
      }

      const promptSent = formatEntry(entry, split);
      const callStart = Date.now();

      try {
        const solver = await runSolver(client, promptSent);
        const advisor = await runAdvisor(client, entry, promptSent, solver);
        const latency = Date.now() - callStart;

        await sql`
          INSERT INTO results (
            run_id, entry_id, split, prompt_sent, solver, advisor, api_latency_ms
          )
          VALUES (
            ${run.id}, ${entry.id}, ${split}, ${promptSent},
            ${JSON.stringify(solver)}::jsonb,
            ${JSON.stringify(advisor)}::jsonb,
            ${latency}
          )
        `;

        const correct = advisor.answer_correct ? '✓' : '✗';
        console.log(
          `[${done}/${total}] ${entry.symbol} ${split} ${correct} (${latency}ms)`,
        );
        succeeded++;
      } catch (err) {
        failed++;
        console.error(
          `[${done}/${total}] ${entry.symbol} ${split} FAILED: ${(err as Error).message}`,
        );
        // Continue. Re-run with --resume <runId> to retry failed entries.
      }
    }
  }

  await sql`UPDATE runs SET completed_at = NOW() WHERE id = ${run.id}`;
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  console.log(
    `\nRun ${run.id} done. ${succeeded}/${total} succeeded, ${failed} failed. ${m}m ${s}s elapsed.`,
  );
  if (failed > 0) {
    console.log(`To retry failed entries: pnpm tsx scripts/run-eval.ts --resume ${run.id}`);
  }
  console.log(`Next: pnpm tsx scripts/aggregate.ts ${run.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
