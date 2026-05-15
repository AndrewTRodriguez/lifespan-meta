# 🧬 Lifespan Meta — GenAge LLM Eval

> Benchmarking how well frontier LLMs predict whether a gene's normal function promotes or opposes longevity, using the [GenAge model organisms database](https://genomics.senescence.info/genes/).

🌐 **Live dashboard:** [lifespan.andrewtrodriguez.com](https://lifespan.andrewtrodriguez.com)

## 🎯 What this is

A reproducible evaluation of Claude Sonnet 4.6 on a gene-function reasoning task. Given a gene's name, organism, and known molecular functions, the model predicts whether the gene's normal function:

- **`pro_longevity`** — promotes lifespan extension
- **`anti_longevity`** — opposes lifespan extension
- **`unclear`** — ambiguous from the available evidence

The eval has two splits:

- **`main`** — gene symbol visible (model can recognize names)
- **`counterfactual`** — gene symbol blinded (model must reason from molecular function alone)

The **gap between the two splits** is the headline finding: how much of the model's apparent capability comes from name recognition vs. mechanistic reasoning.

## 📁 Project Structure

```
.
├── app/                      # Next.js App Router (dashboard, methodology, per-entry views)
│   ├── entry/[id]/           # Per-gene detail page
│   ├── methodology/          # Eval design + hallmarks framework
│   ├── layout.tsx
│   ├── page.tsx              # Dashboard
│   ├── opengraph-image.tsx
│   ├── icon.tsx
│   └── sitemap.ts
├── components/               # Reusable UI (Badge, FilterPills, MetricCard, …)
├── lib/                      # Domain logic
│   ├── anthropic.ts          # Anthropic SDK wrapper + MODEL constant
│   ├── prompts.ts            # System prompts + tool schemas (versioned)
│   ├── format-entry.ts       # Entry → prompt template (versioned)
│   ├── format-display.ts     # Display formatting helpers
│   ├── hallmarks.ts          # López-Otín hallmarks of aging
│   ├── notable.ts            # Curated notable entries
│   ├── methodology-examples.ts
│   ├── types.ts
│   └── db.ts                 # Postgres client (Neon serverless)
├── db/
│   ├── migrations/           # SQL migrations (apply in order)
│   │   ├── 001_entries.sql
│   │   ├── 002_normalize_casing.sql
│   │   └── 003_runs_results.sql
│   └── seed/
│       └── genage_eval_dump.sql   # GenAge entries (8.6MB, ~1,845 rows)
├── scripts/                  # CLI tooling (eval runner, aggregation, kappa sampling)
│   ├── run-eval.ts           # Runs the eval (resumable)
│   ├── aggregate.ts          # Computes accuracy, contamination gap, etc.
│   ├── sample-for-kappa.ts   # Hand-grading sample for inter-rater reliability
│   ├── save-kappa.ts
│   ├── seed-entries.ts
│   ├── redact-and-qc.ts
│   ├── sample-passed.ts
│   ├── dump-db.ts
│   ├── fetch_ncbi.py         # NCBI gene fetcher
│   └── schema.sql
└── package.json
```

## 🚀 Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create `.env.local`:

```
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Initialize the database

Apply the migrations in order, then load the seed data:

```bash
psql "$DATABASE_URL" -f db/migrations/001_entries.sql
psql "$DATABASE_URL" -f db/migrations/002_normalize_casing.sql
psql "$DATABASE_URL" -f db/migrations/003_runs_results.sql
psql "$DATABASE_URL" -f db/seed/genage_eval_dump.sql
```

Sanity check:

```sql
SELECT longevity_influence, COUNT(*) FROM entries GROUP BY 1 ORDER BY 2 DESC;
```

You should see `pro_longevity`, `anti_longevity`, `unclear`, `necessary_for_fitness`, `unannotated` — all snake_case.

## 🧪 Running the Eval

### Smoke test (5 entries, ~$0.10, ~1 min)

```bash
pnpm tsx scripts/run-eval.ts --smoke --notes "smoke test"
```

### Full run (~1,385 entries × 2 splits, ~$25–50, 1–6 hours)

```bash
pnpm tsx scripts/run-eval.ts --notes "first full run, claude-sonnet-4-6"
```

The runner is **fully resumable** — it skips any `(entry, split)` pair already in `results`. To resume:

```bash
pnpm tsx scripts/run-eval.ts --resume <runId>
```

### Aggregate

```bash
pnpm tsx scripts/aggregate.ts <runId>
```

Computes accuracy, contamination gap, failure-mode counts, calibration buckets, and per-class breakdown. Writes results to `runs.aggregates`.

### Hand-grade for Cohen's kappa

```bash
pnpm tsx scripts/sample-for-kappa.ts <runId> 30
```

Produces `kappa-sample-run<N>.tsv`. Open in a spreadsheet, fill the `YOUR_*` columns, compute kappa (R: `psych::cohen.kappa`, Python: `sklearn.metrics.cohen_kappa_score`), then save:

```bash
pnpm tsx scripts/save-kappa.ts <runId> 0.74
```

### Promote a run to primary

```sql
BEGIN;
UPDATE runs SET is_primary = FALSE WHERE is_primary = TRUE;
UPDATE runs SET is_primary = TRUE WHERE id = <runId>;
COMMIT;
```

The dashboard reads `WHERE is_primary = TRUE`.

## 🔒 Locked vs. Tweakable

**Don't change without bumping a version constant** (the website stamps these onto every run):

- `lib/prompts.ts` — system prompts, tool schemas → `SOLVER_VERSION` / `ADVISOR_VERSION`
- `lib/format-entry.ts` — entry template → `FORMAT_ENTRY_VERSION`

**Safe to tweak:**

- `lib/anthropic.ts` — `MODEL` constant (try other models)
- `scripts/aggregate.ts` — aggregation logic
- `scripts/sample-for-kappa.ts` — TSV format

## 💻 Local Development

```bash
pnpm dev    # Next.js dev server on http://localhost:3000
pnpm build  # Production build
pnpm lint   # ESLint
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS
- **Database:** PostgreSQL via [Neon](https://neon.tech) serverless driver
- **Eval runtime:** [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) with Claude Sonnet 4.6
- **Tooling:** TypeScript, `tsx`, `pnpm`

## 📚 Background

The López-Otín 2023 *Hallmarks of Aging* framework underpins the per-entry analysis. Each prediction is annotated with the relevant aging pathway, surfacing where the model's reasoning aligns with or diverges from biological consensus.

> López-Otín, C., Blasco, M.A., Partridge, L., Serrano, M., & Kroemer, G. (2023). Hallmarks of aging: An expanding universe. *Cell*, 186(2), 243–278.

## 📝 License

MIT © Andrew T. Rodriguez
