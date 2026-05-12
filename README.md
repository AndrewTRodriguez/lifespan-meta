# Eval runner

Code for running the GenAge longevity-influence eval. Drop these files into your existing project at `C:\Users\atomr\lifespan-meta`. The directory layout matches what the runner expects:

```
lifespan-meta/
├── db/migrations/
│   ├── 002_normalize_casing.sql       (new)
│   └── 003_runs_results.sql           (new)
├── lib/
│   ├── db.ts                          (new)
│   ├── format-entry.ts                (new)
│   ├── prompts.ts                     (new)
│   ├── anthropic.ts                   (new)
│   └── types.ts                       (new)
└── scripts/
    ├── run-eval.ts                    (new)
    ├── aggregate.ts                   (new)
    ├── sample-for-kappa.ts            (new)
    └── save-kappa.ts                  (new)
```

## One-time setup

1. **Install missing dependencies** (skip any you already have):
   ```bash
   pnpm add @anthropic-ai/sdk dotenv
   pnpm add -D tsx
   ```

2. **Confirm `.env` has both keys**:
   ```
   DATABASE_URL=postgres://...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Apply the migrations** in order:
   ```bash
   psql "%DATABASE_URL%" -f db/migrations/002_normalize_casing.sql
   psql "%DATABASE_URL%" -f db/migrations/003_runs_results.sql
   ```
   (On Windows PowerShell use `$env:DATABASE_URL` instead of `%DATABASE_URL%`. Or just paste the URL.)

4. **Sanity-check the casing migration**:
   ```sql
   SELECT longevity_influence, COUNT(*) FROM entries GROUP BY 1 ORDER BY 2 DESC;
   ```
   You should see `pro_longevity`, `anti_longevity`, `unclear`, `necessary_for_fitness`, `unannotated` — all snake_case.

## Run order

### Step 1: smoke test (5 entries, ~$0.10, ~1 minute)

```bash
pnpm tsx scripts/run-eval.ts --smoke --notes "smoke test"
```

Watch the output. You should see lines like `[1/10] aak-2 main ✓ (3214ms)`. If anything looks wrong (unexpected errors, failures, weird outputs), debug before the full run.

After smoke, inspect a row to confirm the JSON shapes are sane:
```sql
SELECT entry_id, split, solver->'longevity_influence', advisor->'failure_mode'
FROM results
WHERE run_id = (SELECT id FROM runs WHERE notes = 'smoke test' ORDER BY id DESC LIMIT 1)
LIMIT 4;
```

If you want to throw away the smoke run before the full one:
```sql
DELETE FROM runs WHERE notes = 'smoke test';
```
(Cascade deletes the matching results rows automatically.)

### Step 2: full run

```bash
pnpm tsx scripts/run-eval.ts --notes "first full run, claude-sonnet-4-6"
```

This will iterate ~1,385 eligible entries × 2 splits × 2 calls = ~5,540 Sonnet calls. Costs roughly $25–50 depending on output token counts. Wall time depends on your Anthropic rate-limit tier; expect anywhere from 1 to 6 hours. Tier 1 (50 RPM default) is the slow case.

The runner prints progress per call and is **fully resumable** — it skips any (entry, split) already in the results table. If the script crashes or you Ctrl+C, just re-run it with `--resume <runId>`:

```bash
pnpm tsx scripts/run-eval.ts --resume 2
```

(Find the run ID in the runner's first line of output, or via `SELECT id, notes FROM runs ORDER BY id DESC;`.)

### Step 3: aggregate

```bash
pnpm tsx scripts/aggregate.ts 2
```

Computes accuracy, contamination gap, failure-mode counts, calibration buckets, per-class breakdown, and writes them to `runs.aggregates` for that run. Prints the JSON to stdout for inspection.

You can re-run aggregate any time without side effects (it preserves the kappa value if already set).

### Step 4: hand-grade for kappa

```bash
pnpm tsx scripts/sample-for-kappa.ts 2 30
```

Produces `kappa-sample-run2.tsv`. Open in Excel/Sheets, fill the `YOUR_*` columns for all 30 rows. Compute Cohen's kappa between `advisor_failure_mode` and `YOUR_failure_mode` (the strict version) — most stats packages have this built in (R: `psych::cohen.kappa`, Python: `sklearn.metrics.cohen_kappa_score`, online calculators if you want quick).

Then save it:
```bash
pnpm tsx scripts/save-kappa.ts 2 0.74
```

(Replace `0.74` with your actual value.)

### Step 5: mark as primary

When you're happy with the run, promote it to be the dashboard's primary:

```sql
BEGIN;
UPDATE runs SET is_primary = FALSE WHERE is_primary = TRUE;
UPDATE runs SET is_primary = TRUE WHERE id = 2;
COMMIT;
```

The website (when built) reads `WHERE is_primary = TRUE`.

## What's locked vs. what's tweakable

**Don't change without bumping a version string:**
- `lib/prompts.ts` — system prompts, tool schemas (bump `SOLVER_VERSION` / `ADVISOR_VERSION`)
- `lib/format-entry.ts` — the entry template (bump `FORMAT_ENTRY_VERSION`)

These are stamped onto every `runs` row so old runs stay reproducible. The SHA-256 hashes of the prompts are computed automatically and also stored.

**Safe to tweak:**
- `lib/anthropic.ts` — `MODEL` constant if you want to test other models
- Aggregation logic in `scripts/aggregate.ts`
- TSV format in `scripts/sample-for-kappa.ts`

## Notes on resumability

A few subtleties worth knowing:

- Failed entries (API errors, network blips) are logged but don't halt the run. They just won't have a `results` row, so re-running with `--resume` will retry them.
- If you Ctrl+C mid-call, the in-flight call is lost but anything already inserted is durable.
- The `runs.completed_at` timestamp is set only when the runner finishes naturally. A resumed run updates `completed_at` again at the end.
- If you want to abandon a run entirely, just `DELETE FROM runs WHERE id = <id>` — the foreign key cascade clears the results.

## What the runner does NOT do

- Doesn't filter `necessary_for_fitness` or `unannotated` entries — those are excluded by the WHERE clause in `fetchEntries`. Final eval N is the count of pro_longevity + anti_longevity + unclear (1,385 from your data).
- Doesn't compute kappa — that's manual, on the TSV sample.
- Doesn't deploy or build any UI — the runner just produces data the website reads.
