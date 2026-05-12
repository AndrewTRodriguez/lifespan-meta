# Aging biology eval — Website Handoff (v3)

A handoff document for engineers (or AI coding agents) building the public-facing site for the Aging biology eval project. By Andrew T. Rodriguez, Ph.D.

If you're picking this up cold: read sections 1–4 to understand what you're building, section 5 to understand the data shape, then jump to section 11 (work breakdown). The eval has already been run; you're building the site that displays the results. Section 14 (decisions log) settles what's locked vs. what's tweakable.

---

## 1. What you're building

A Next.js site, deployed to Vercel, that presents an evaluation of Claude Sonnet 4.6 on a gene-function reasoning task drawn from the GenAge model organisms database. The task: given a gene's name, organism, and known molecular functions, predict whether the gene's normal function promotes longevity (`pro_longevity`), opposes longevity (`anti_longevity`), or is unclear, and identify the relevant aging pathway (one of the López-Otín 2023 hallmarks of aging).

The eval has two splits — a normal one (`main`) and one where the gene symbol is blinded (`counterfactual`). The gap between the two is the headline finding: how much of the model's apparent capability comes from recognizing gene names vs. reasoning about biology.

The site has three pages:

- A **dashboard** showing aggregate results and the contamination gap.
- A **per-entry view** showing the prompt, the model's prediction, the ground truth, and the advisor's grade for each gene. Filterable by hallmark of aging and failure mode.
- A **methodology page** explaining the eval design, the hallmarks of aging framework, the data pipeline, and the limitations.

All pages are public and read-only. Eval runs are executed locally by Andrew via a script; **the website never makes Anthropic API calls.**

## 2. Project status when this handoff was written

**Done:**

GenAge model organisms CSV downloaded and parsed (2,202 entries).
NCBI E-utilities pipeline fetches per-gene functional annotations.
Redaction + automated QC drops 356 entries (insufficient annotation, sparse content, or over-redacted), leaving 1,846 clean entries.
1,846 entries seeded into Neon Postgres.
Casing normalized: pro_longevity / anti_longevity / unclear / necessary_for_fitness / unannotated (snake_case).
Eval runner built, tested, and completed. Run 2 is the primary run (is_primary = TRUE), covering 1,385 eligible entries × 2 splits = 2,770 results. 0 failed calls.
Aggregates computed and written to runs.aggregates: 44.8% main accuracy, 41.9% counterfactual accuracy, 3pp contamination gap.
Solver and advisor system prompts and tool schemas locked.
SQL dump (genage_eval_dump.sql) committed to repo.
Cohen's kappa hand-grading pending (Andrew, separate from website work).

**Remaining (your job):**

Build the three website pages.
Deploy to Vercel.
Write the GitHub README focused on engineering setup.

The data pipeline scripts (`scripts/parse-genage.ts`, `scripts/fetch_ncbi.py`, `scripts/redact-and-qc.ts`, `scripts/seed-entries.ts`) and the eval runner (`scripts/run-eval.ts`, `scripts/aggregate.ts`, `scripts/sample-for-kappa.ts`, `scripts/save-kappa.ts`) already exist in the repo. **Do not modify any of these without Andrew's sign-off** — they're the science of the eval.

## 3. The eval methodology, in one page

Two model calls per entry per split:

**Solver call.** Claude Sonnet 4.6 is given the redacted entry (gene symbol or `GENE-X` placeholder, organism, GO Molecular Function terms + protein names with lifespan-effect language stripped) and predicts: `longevity_influence` (one of three values), confidence (0–1), `mechanism_class` (one of the 12 López-Otín 2023 hallmarks plus `other` and `unclear`), `reasoning`, and `key_pathways`.

**Advisor call.** A separate Sonnet 4.6 call is given the entry, the ground truth from GenAge, and the solver's output. It grades correctness, mechanism accuracy, reasoning quality (1–5), and assigns a `failure_mode` from a fixed taxonomy (`correct`, `right_answer_wrong_reasoning`, `confident_wrong`, `appropriately_uncertain`, `hallucinated_specifics`, `overhedged`, `other_wrong`).

Both calls use forced tool-use to guarantee structured JSON output. Temperature 0. Model pinned to `claude-sonnet-4-6`. Schema supports re-running across model versions over time.

For the engineering work you don't need to deeply understand the biology — you need to faithfully render the data the runner produces. Section 5 describes the database tables; section 6 describes how to render them.

## 4. Architecture overview

```
                      ┌─────────────────────────────────┐
                      │  GenAge model organisms CSV     │
                      │  (downloaded once, in repo)     │
                      └────────────────┬────────────────┘
                                       │
                              parse + NCBI fetch +
                              redact + QC + seed
                                       │
                                       ▼
   ┌──────────────────────────────────────────────────────────┐
   │                  Postgres (Neon on Vercel)                │
   │             entries · runs · results                      │
   └──────────────────────────────────────────────────────────┘
              ▲                                       ▲
              │                                       │
   scripts/run-eval.ts                       app/ (Next.js — YOUR WORK)
   (Andrew runs locally,                              │
    DATABASE_URL pulled                       Server Components
    via vercel env pull)                      read at request time
              │                               via SQL queries
              │                               (with ISR caching)
        Anthropic API
        (solver + advisor)
```

The website never executes the eval. It only reads the `entries`, `runs`, and `results` tables and renders them.

## 5. Database schema

Three tables. The schema lives at `db/migrations/*.sql` in the repo. You'll apply these against your own Neon database, then restore Andrew's data dump.

### `entries` (1,846 rows)

```sql
CREATE TABLE entries (
  id                              SERIAL PRIMARY KEY,
  genage_id                       INTEGER,
  entrez_id                       TEXT,
  symbol                          TEXT NOT NULL,
  organism                        TEXT NOT NULL,
  full_name                       TEXT,
  protein_names                   TEXT[],
  go_mf_terms                     TEXT[],
  lifespan_effect                 TEXT,            -- raw GenAge value, not used in eval
  longevity_influence             TEXT NOT NULL,   -- snake_case, see distribution below
  functional_description_raw      TEXT NOT NULL,   -- composed from name + protein names + GO MF
  functional_description_redacted TEXT NOT NULL,   -- with lifespan/aging terms stripped
  redaction_density               REAL,
  qc_reasons                      TEXT[],
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Distribution of `longevity_influence`:
- `anti_longevity` — 878
- `pro_longevity` — 481
- `necessary_for_fitness` — 430 *(excluded from eval)*
- `unannotated` — 30 *(excluded from eval)*
- `unclear` — 26

Eligible eval entries: **1,385** (the three values used: `pro_longevity`, `anti_longevity`, `unclear`). Filter the website's queries to these three values everywhere — the other two are noise from the curator's process.

### `runs`

```sql
CREATE TABLE runs (
  id                  SERIAL PRIMARY KEY,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  model               TEXT NOT NULL,                -- e.g. 'claude-sonnet-4-6'
  solver_prompt_v     TEXT NOT NULL,                -- e.g. 'v1'
  advisor_prompt_v    TEXT NOT NULL,
  solver_prompt_hash  TEXT NOT NULL,                -- SHA-256 of system prompt + tool schema
  advisor_prompt_hash TEXT NOT NULL,
  format_entry_v      TEXT NOT NULL,
  notes               TEXT,
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  aggregates          JSONB                         -- pre-computed dashboard stats
);

CREATE UNIQUE INDEX runs_one_primary_idx ON runs(is_primary) WHERE is_primary = TRUE;
```

Exactly one run is `is_primary = TRUE` at any time. The dashboard renders that run. New runs default to `FALSE`; Andrew flips the flag to promote a new run to be the headline.

### `results`

```sql
CREATE TABLE results (
  run_id          INT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  entry_id        INT NOT NULL REFERENCES entries(id),
  split           TEXT NOT NULL CHECK (split IN ('main', 'counterfactual')),
  prompt_sent     TEXT NOT NULL,                    -- exact text sent to the model
  solver          JSONB NOT NULL,                   -- the full solver tool_use input
  advisor         JSONB NOT NULL,                   -- the full advisor tool_use input
  api_latency_ms  INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, entry_id, split)
);

CREATE INDEX results_failure_mode_idx ON results ((advisor->>'failure_mode'));
CREATE INDEX results_entry_idx ON results (entry_id);
```

Expected `solver` JSONB shape:
```json
{
  "longevity_influence": "anti_longevity",
  "confidence": 0.85,
  "mechanism_class": "deregulated_nutrient_sensing",
  "reasoning": "Insulin/IGF-1 receptor homolog. Reduced IIS extends lifespan via DAF-16/FoxO derepression...",
  "key_pathways": ["insulin/IGF-1 signaling", "DAF-16/FoxO"]
}
```

Expected `advisor` JSONB shape:
```json
{
  "answer_correct": true,
  "mechanism_correct": true,
  "reasoning_quality": 5,
  "failure_mode": "correct",
  "notes": "Identifies IIS pathway and DAF-16 dependency correctly.",
  "ground_truth_questionable": false
}
```

Expected `aggregates` JSONB shape on the primary run:
```json
{
  "total_entries": 1385,
  "main_accuracy": 0.82,
  "counterfactual_accuracy": 0.58,
  "contamination_gap_pp": 24,
  "mechanism_accuracy_main": 0.71,
  "advisor_kappa_vs_expert": 0.74,
  "failure_mode_counts": {
    "correct": 928,
    "right_answer_wrong_reasoning": 194,
    "confident_wrong": 125,
    "hallucinated_specifics": 69,
    "appropriately_uncertain": 41,
    "overhedged": 14,
    "other_wrong": 14
  },
  "calibration_buckets": [
    { "confidence_bin": "0.0-0.2", "n": 12, "accuracy": 0.17 },
    { "confidence_bin": "0.2-0.4", "n": 89, "accuracy": 0.44 },
    { "confidence_bin": "0.4-0.6", "n": 156, "accuracy": 0.62 },
    { "confidence_bin": "0.6-0.8", "n": 421, "accuracy": 0.78 },
    { "confidence_bin": "0.8-1.0", "n": 707, "accuracy": 0.91 }
  ],
  "class_breakdown_main": {
    "pro_longevity": { "n": 481, "accuracy": 0.74 },
    "anti_longevity": { "n": 878, "accuracy": 0.86 },
    "unclear": { "n": 26, "accuracy": 0.42 }
  }
}
```

Numbers above are illustrative; actual values come from Andrew's run.

## 6. Page specs

### 6.1 Dashboard — `app/page.tsx`

Reads the row from `runs` where `is_primary = TRUE` and renders its `aggregates` JSON. Server Component. Use ISR with `export const revalidate = 3600` (Neon free tier sleeps after inactivity; ISR protects against the cold-start hit on a reviewer's first visit).

Layout, top to bottom:

1. **Header.** `Aging biology eval` (h1). Tagline: `Probing Claude's reasoning about gene effects on lifespan` (secondary text). Byline: `by Andrew T. Rodriguez, Ph.D.` (smaller, muted). Below the byline: `<model> · <total_entries> entries · run YYYY-MM-DD` (caption text).

2. **Contamination gap callout.** Large card with the primary tint background. Shows `contamination_gap_pp` as a big negative number (e.g. `−24 pp`) at 48px. Below it: "Accuracy drop when the gene symbol is blinded" (small secondary text). One-paragraph plain-language explanation: the difference between accuracy on the main split (where the model sees the real gene symbol) and the counterfactual split (where the symbol is replaced with `GENE-X`) measures how much of the model's apparent capability comes from recognizing names vs. reasoning about biology.

3. **Metric cards (4-up grid).** Main split accuracy, counterfactual accuracy, mechanism accuracy on main split, advisor κ vs. expert. Standard metric card pattern: 13px secondary label, 24px/500 number, 12px tertiary footnote.

4. **Failure mode breakdown.** Horizontal bars, one per mode, ordered by count descending. Each bar shows mode name (left), filled bar (middle), count + percentage (right). Color ramp:
   - `correct`, `appropriately_uncertain` → green
   - `right_answer_wrong_reasoning`, `overhedged` → amber
   - `confident_wrong`, `hallucinated_specifics` → red
   - `other_wrong` → neutral gray
   
   Each bar is a link to `/entry?failure_mode=<mode>`.

5. **Per-class accuracy strip.** Three small inline metric pills showing accuracy for each `longevity_influence` class on the main split, pulled from `aggregates.class_breakdown_main`. Helps catch class-imbalance pathologies. Format: `pro_longevity: 74% (481)` style.

6. **Notable entries.** A list of 3–5 entries to feature. For v1, hardcode the entry IDs in `lib/notable.ts`:
   ```typescript
   export const NOTABLE_ENTRY_IDS: number[] = [/* fill with first 5 alphabetical IDs */];
   ```
   Each row shows symbol, organism, and links to `/entry/{id}`. Andrew updates this list manually as he annotates more entries; no DB column needed for v1.

### 6.2 Per-entry list — `app/entry/page.tsx`

A filterable browseable list of entries. The dashboard's failure-mode bars link here.

Layout:

1. **Header.** `Browse entries` (h2). Active filter summary if any (e.g., "Showing entries with failure mode: confident wrong (125 results)").

2. **Filter bar.** Two filter controls, AND-combined, reflected in URL params:
   - **Mechanism filter** — horizontal pill bar with the 12 hallmarks plus `other` and `unclear`. Filters by `entries.ground_truth_mechanism`. Active pill is filled with primary blue + white text; inactive pills are white bg + border.
   - **Failure mode filter** — pill bar with the 7 failure modes. Filters by `results.advisor->>'failure_mode'` for the primary run, main split.
   - URL params: `?mechanism=mitochondrial_dysfunction&failure_mode=confident_wrong`. "Clear filters" link visible when any filter is active.

3. **List.** Compact rows, one per entry. Each shows:
   - Symbol (monospace, primary blue)
   - Organism (small, secondary)
   - Predicted `longevity_influence` (badge, color-coded)
   - Ground truth `longevity_influence` (badge, color-coded)
   - Failure mode (small tag, color-coded)
   - Click anywhere → `/entry/{id}` (preserving filter params).

4. **Empty state.** "No entries match these filters." with a "Clear filters" button.

Note: `entries.ground_truth_mechanism` doesn't exist in the schema as a column. **Mechanism for filter purposes comes from the model's prediction in the primary run's main-split result** (`results.solver->>'mechanism_class'`). This is by design — the eval doesn't have a curator-assigned mechanism for every entry, and the model's predicted mechanism is what we're studying anyway. Document this clearly on the methodology page.

### 6.3 Per-entry view — `app/entry/[id]/page.tsx`

Generates static params for all eligible entries at build (`generateStaticParams`). Reads the entry from `entries`, the result rows for both splits from the primary run.

Layout:

1. **Header.** Symbol (h1, monospace), organism (h2, secondary). Prev/next nav respecting active filters from query params. Breadcrumb back to dashboard.

2. **Split tabs.** `main` | `counterfactual`. URL query param `?split=main`. Default to `main`. Both splits' data is shown only one at a time.

3. **What the model saw.** Card with monospace text showing the exact `prompt_sent`. Below it, a `<details>` toggle: "View unredacted entry" — reveals `functional_description_raw`.

4. **Solver output.** Card with:
   - Predicted `longevity_influence` as a colored badge (green for `pro_longevity`, red for `anti_longevity`, gray for `unclear` — see design system)
   - Confidence as a small horizontal bar (0–1, primary blue fill)
   - `mechanism_class` as a tag (use snake_case → display name from `lib/hallmarks.ts`)
   - Reasoning as paragraph text
   - `key_pathways` as inline tags

5. **Ground truth — collapsible.** Card with header "Ground truth (GenAge)" and an expand/collapse toggle. Default state controlled by URL param `?reveal=open` (default) or `?reveal=closed`. When expanded:
   - `longevity_influence` (the GenAge curator's reconciled judgment) as a colored badge
   - `lifespan_effect` (the raw GenAge value, e.g. "Increase") as a small tag
   - Brief contextual note: "GenAge curators classify each gene's normal function as promoting (Pro-Longevity) or opposing (Anti-Longevity) longevity, based on synthesis across studies. Loss-of-function effects can vary from this depending on the manipulation."

6. **Advisor judgment — always visible.** Card with:
   - `answer_correct` (✓ green, ✗ red)
   - `mechanism_correct` (✓ green, ✗ red)
   - `reasoning_quality` (1–5 dots, primary blue filled / border outlined)
   - `failure_mode` (colored tag)
   - Notes (paragraph text)
   - If `ground_truth_questionable` is true, show a small amber banner: "The advisor flagged this ground-truth label as potentially questionable."

7. **Raw API trace toggle.** `<details>` element labeled "Raw API responses". On expand, shows the full `solver` JSONB and `advisor` JSONB pretty-printed. Monospace, small, in `var(--color-bg-muted)`.

The reveal pattern (collapsible ground truth, advisor always visible) is deliberate: it gives engaged readers a "predict it yourself" affordance without making skimming painful, and preserves the credibility-anchoring role of the advisor judgment.

**Empty/error states:**
- Bad ID → `notFound()` (Next.js 404).
- One split missing a result row (rare but possible if the runner failed mid-entry) → in that split's tab, show "No result for this split yet." instead of the cards. Other split renders normally.

### 6.4 Methodology page — `app/methodology/page.tsx`

A static written page explaining the eval. No data fetching beyond reading `lib/notable.ts` and `lib/methodology-examples.ts` for inline example links.

Use a narrower content width (720px) than the dashboard/per-entry pages (1024px) — long-form reading wants ~65–75 characters per line.

Sections, in order:

1. **The contamination problem.** Two paragraphs. Frame for biologists: when a model's training data may include the answers, you can't tell if it's reasoning or remembering. The standard ML-eval issue, why it matters here.

2. **The two splits.** Why `main` and `counterfactual` exist; what the gap measures. A small inline diagram showing the same gene in both forms.

3. **Solver and advisor.** The two-call pattern. Hand-coded SVG diagram showing entry → solver → solver output → advisor (with ground truth) → grade.

4. **Mechanism classes: the hallmarks of aging.** A one-paragraph intro explaining the López-Otín 2023 framework. Then a vertical list of all 12 hallmarks plus `other` and `unclear`. For each: hallmark name (h3), one-sentence paraphrase from `lib/hallmarks.ts` (paragraph). Inline citation: "(López-Otín et al. 2023)". Paraphrases are pre-populated with original summaries; Andrew may revise post-launch. Icons deferred to v2.

5. **Data pipeline.** Three paragraphs. Briefly: started from GenAge model organisms (2,202 entries); fetched per-gene functional annotations from NCBI Gene via E-utilities (Official Full Name, protein names, GO Molecular Function terms only — explicitly excluding RefSeq summaries and Biological Process GO terms because they leak lifespan/aging language); applied automated redaction with a forbidden-terms list (longevity, lifespan, aging, life-extension, senescence, etc.); ran four QC layers (no GO terms, sparse content, high redaction density, post-redaction leakage); 1,846 entries passed. Mention the 30-entry hand-graded spot check.

6. **Ground truth.** Where the labels come from (GenAge curators). Note the curator's `Longevity Influence` is a reconciled judgment of the gene's normal-function role across multiple studies, not a direct prediction of any single manipulation's outcome. The eval predicts on this reconciled axis because it's the cleaner cross-study signal. Note that mechanism class on the per-entry list filter comes from the model's predicted mechanism (see section 6.2 note).

7. **Validating the advisor.** How Andrew hand-graded 30 random advisor judgments and computed Cohen's kappa. Report the κ value inline (read from `aggregates.advisor_kappa_vs_expert`).

8. **Limitations.** Honestly stated. At minimum: input is GO MF + protein names only (richer functional descriptions might give different results); single eval run on one model version; advisor is itself an LLM; mechanism classification is fuzzy at boundaries; counterfactual blinding only blinds the symbol, not subtle phrasing tells in functional descriptions; the 12-class hallmark enum forces categorization on genes with multiple pleiotropic roles.

9. **Citation.** López-Otín, C., Blasco, M.A., Partridge, L., Serrano, M., & Kroemer, G. (2023). Hallmarks of aging: An expanding universe. *Cell*, 186(2), 243–278. Link to the *Cell* page; if a free preprint or author-archived version exists, link both.

## 7. The mechanism enum and display names

Single source of truth: `lib/hallmarks.ts`. Used everywhere — solver prompt, advisor prompt, methodology page, per-entry tags, filter pills.

```typescript
// lib/hallmarks.ts
//
// The 12 hallmarks defined by López-Otín, Blasco, Partridge, Serrano, and Kroemer
// in "Hallmarks of aging: An expanding universe" (Cell, 2023). Paraphrases below
// are original summaries; consult the paper for authoritative definitions.
//
// Andrew can revise any of these post-launch by editing this file.

export const HALLMARKS = {
  genomic_instability: {
    displayName: 'Genomic instability',
    paraphrase:
      'Accumulation of DNA damage and mutations over time, including double-strand breaks, base modifications, and chromosomal rearrangements that erode genome integrity.',
  },
  telomere_attrition: {
    displayName: 'Telomere attrition',
    paraphrase:
      'Progressive shortening of the protective DNA-protein caps at chromosome ends, eventually triggering replicative arrest or apoptosis when telomeres become critically short.',
  },
  epigenetic_alterations: {
    displayName: 'Epigenetic alterations',
    paraphrase:
      'Age-related drift in DNA methylation patterns, histone modifications, and chromatin organization that reshapes gene expression independently of changes to the underlying DNA sequence.',
  },
  loss_of_proteostasis: {
    displayName: 'Loss of proteostasis',
    paraphrase:
      'Decline in the cellular machinery that folds, refolds, and degrades proteins, leading to accumulation of misfolded and aggregated species.',
  },
  disabled_macroautophagy: {
    displayName: 'Disabled macroautophagy',
    paraphrase:
      'Reduced capacity for the bulk lysosomal degradation pathway that clears damaged organelles and protein aggregates, allowing cellular waste to accumulate.',
  },
  deregulated_nutrient_sensing: {
    displayName: 'Deregulated nutrient sensing',
    paraphrase:
      'Dysfunction of conserved pathways (insulin/IGF-1, mTOR, AMPK, sirtuins) that detect nutrient availability and coordinate cell growth, metabolism, and stress resistance.',
  },
  mitochondrial_dysfunction: {
    displayName: 'Mitochondrial dysfunction',
    paraphrase:
      'Decline in mitochondrial efficiency that lowers ATP output, raises reactive oxygen species (ROS), and disrupts the metabolic and signaling roles of these organelles.',
  },
  cellular_senescence: {
    displayName: 'Cellular senescence',
    paraphrase:
      'Accumulation of cells that have permanently exited the cell cycle but persist in tissues, often secreting inflammatory factors that affect surrounding cells.',
  },
  stem_cell_exhaustion: {
    displayName: 'Stem cell exhaustion',
    paraphrase:
      'Decline in the number and regenerative capacity of tissue-resident stem cells, undermining tissue maintenance and repair across the lifespan.',
  },
  altered_intercellular_communication: {
    displayName: 'Altered intercellular communication',
    paraphrase:
      'Disruption of signaling between cells, tissues, and organs — including neuroendocrine, paracrine, and immune signals — that coordinates organism-wide homeostasis.',
  },
  chronic_inflammation: {
    displayName: 'Chronic inflammation',
    paraphrase:
      'Persistent low-grade systemic inflammation ("inflammaging") that accompanies older age and contributes to many age-related diseases.',
  },
  dysbiosis: {
    displayName: 'Dysbiosis',
    paraphrase:
      'Disruption of the composition and function of resident microbial communities, particularly in the gut, with downstream effects on metabolism, immunity, and aging.',
  },
  other: {
    displayName: 'Other',
    paraphrase: 'Mechanisms outside the López-Otín 2023 hallmarks framework.',
  },
  unclear: {
    displayName: 'Unclear',
    paraphrase: "The model couldn't confidently assign a primary mechanism.",
  },
} as const;

export type HallmarkKey = keyof typeof HALLMARKS;
```

Paraphrases are pre-filled with original summaries based on López-Otín 2023. They're starting points — Andrew can revise any of them post-launch by editing this file. The methodology page reads from this same source, so updating here updates everywhere.

## 8. Project name and branding

- **Title:** Aging biology eval (sentence case throughout, never Title Case)
- **Tagline:** Probing Claude's reasoning about gene effects on lifespan
- **Byline:** by Andrew T. Rodriguez, Ph.D. (preserve the periods)
- **Brand color:** primary blue `#0067AC`

OG image and favicon: use Next.js's built-in `app/opengraph-image.tsx` and `app/icon.tsx` to generate them programmatically from text. White background, primary blue rectangle on the left with the title in white, byline in slate gray. No image assets to manage. To replace later, drop `opengraph-image.png` and `icon.png` into `app/` — Next.js will use those instead automatically.

## 9. Design system

### Typography

Inter via `next/font/google`, weights 400/500/600/700, with `--font-sans` CSS variable.

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

Monospace: system stack `ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", monospace`. Used for gene symbols, code blocks, JSON.

Type scale (sentence case throughout):

| Use | Size | Weight | Line height |
|---|---|---|---|
| Page title (h1) | 28px | 600 | 1.3 |
| Section heading (h2) | 20px | 600 | 1.4 |
| Subsection (h3) | 16px | 600 | 1.4 |
| Body | 15px | 400 | 1.6 |
| Small | 13px | 400 | 1.5 |
| Caption | 12px | 400 | 1.4 |
| Metric number | 28px | 600 | 1.0 |
| Headline metric (contamination gap) | 48px | 600 | 1.0 |

### Color tokens

Add to `app/globals.css`:

```css
:root {
  /* Primary palette derived from #0067AC */
  --color-primary: #0067AC;
  --color-primary-hover: #005590;
  --color-primary-active: #004478;
  --color-primary-tint: #E6F0F7;
  --color-primary-dark: #003860;

  /* Neutrals */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F8FAFC;
  --color-bg-muted: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-text: #0F172A;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94A3B8;

  /* Semantic */
  --color-success: #16A34A;
  --color-success-bg: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-bg: #FEF3C7;
  --color-error: #DC2626;
  --color-error-bg: #FEE2E2;
  --color-neutral: #64748B;
  --color-neutral-bg: #F1F5F9;
}
```

Usage rules:
- Primary blue is the only chrome color — links, active filter pills, headings, the contamination callout background, focus rings.
- Semantic colors are reserved for outcomes (longevity influence badges, failure mode tags, ✓/✗ marks, advisor judgments).
- All other UI uses neutrals.
- No dark mode in v1.

Longevity influence badge mapping:
- `pro_longevity` → green
- `anti_longevity` → red
- `unclear` → amber

Failure mode tag mapping:
- `correct` → green
- `appropriately_uncertain` → green (lighter)
- `right_answer_wrong_reasoning` → amber
- `overhedged` → amber
- `confident_wrong` → red
- `hallucinated_specifics` → red
- `other_wrong` → neutral gray

### Layout

Max content width:
- Dashboard, per-entry list, per-entry view: 1024px
- Methodology page: 720px

Page padding: 24px on mobile, 48px on desktop. Vertical rhythm: 32px between major page sections, 16px between cards within a section.

### Spacing scale

Tailwind defaults (4px base). Use these specifically: 4, 8, 12, 16, 24, 32, 48px.

### Border radius

- 4px: badges, tags, chips
- 8px: buttons, inputs, metric cards, regular cards
- 12px: large callout cards (contamination gap), hero elements

### Components

- **Metric card.** White bg, `0.5px solid var(--color-border)` border, 8px radius, 16px padding. Label 13px secondary above, 24px/600 number below.
- **Headline metric (contamination gap).** Primary tint bg, no border, 12px radius, 24px padding. Number 48px/600 in `--color-primary-dark`.
- **Filter pill (inactive).** White bg, 0.5px border, 6px y / 12px x padding, full radius, 13px text.
- **Filter pill (active).** Primary blue bg, white text.
- **Badge (longevity influence).** Light variant of semantic color as bg, dark variant as text, 4px radius, 4px y / 8px x padding, 12px/500 text.
- **Failure mode tag.** Same shape as badge, semantic color from mapping above.
- **Failure mode bar.** `var(--color-bg-muted)` track, filled segment in semantic color, 14px tall, 4px radius.
- **Confidence bar.** Same shape as failure mode bar, primary blue fill.
- **Reasoning quality.** 5 dots in a row. Filled in primary blue, unfilled in `--color-border`.
- **Code block.** `--color-bg-muted` bg, monospace, 13px, 12px padding, 4px radius, no border.
- **Buttons.** Primary (filled blue, white text) for primary actions; secondary (white bg, border, text in `--color-text`) for everything else. 36px tall, 16px horizontal padding, 8px radius.

### Responsive breakpoints

- Mobile: < 640px (single column)
- Tablet: 640–1024px (2-column metric cards)
- Desktop: > 1024px (4-column metric cards)

## 10. Folder structure

```
lifespan-meta/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # dashboard
│   ├── entry/
│   │   ├── page.tsx                # filterable list
│   │   └── [id]/
│   │       └── page.tsx            # per-entry view
│   ├── methodology/
│   │   └── page.tsx
│   ├── opengraph-image.tsx
│   ├── icon.tsx
│   ├── globals.css
│   └── not-found.tsx
├── components/                     # shared React components (your call on structure)
│   ├── MetricCard.tsx
│   ├── Badge.tsx
│   ├── FilterPills.tsx
│   ├── Collapsible.tsx
│   └── ...
├── lib/
│   ├── db.ts                       # already exists
│   ├── types.ts                    # already exists (extend as needed for UI)
│   ├── hallmarks.ts                # NEW — see section 7
│   ├── notable.ts                  # NEW — hardcoded notable entry IDs
│   ├── methodology-examples.ts     # NEW — entry IDs for inline examples
│   ├── format-display.ts           # NEW — helpers for badge text, color mapping
│   ├── prompts.ts                  # already exists, do not modify
│   ├── format-entry.ts             # already exists, do not modify
│   └── anthropic.ts                # already exists, do not modify
├── scripts/                        # all already exist, do not modify
│   ├── parse-genage.ts
│   ├── fetch_ncbi.py
│   ├── redact-and-qc.ts
│   ├── seed-entries.ts
│   ├── run-eval.ts
│   ├── aggregate.ts
│   ├── sample-for-kappa.ts
│   └── save-kappa.ts
├── db/
│   └── migrations/                 # all already exist
│       ├── 001_entries.sql
│       ├── 002_normalize_casing.sql
│       └── 003_runs_results.sql
├── public/                         # add favicon.png and og.png here later if desired
├── .env.local                      # gitignored
├── .gitignore
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

## 11. Work breakdown

Tasks grouped by area. Within each group, tasks are dependency-ordered. Most groups can run in parallel.

### Group A — Setup (engineer)

- Verify the existing project at `lifespan-meta` builds (`pnpm install`, `pnpm dev`).
- Verify the database connection works (`DATABASE_URL` set in `.env.local`).
- Confirm the primary run exists: `SELECT id, model, completed_at FROM runs WHERE is_primary = TRUE`. If none, ask Andrew to mark one primary before proceeding.

### Group B — Library files (engineer)

- Create `lib/hallmarks.ts` per section 7 (paraphrases pre-drafted; Andrew may revise).
- Create `lib/notable.ts` with `NOTABLE_ENTRY_IDS = [first 5 alphabetical entry IDs you find via SELECT]`.
- Create `lib/methodology-examples.ts` similarly.
- Create `lib/format-display.ts` with helpers: `longevityInfluenceColor(value)`, `failureModeColor(value)`, `displayLongevity(value)`, etc. Single source of truth for the color/text mappings in section 9.
- Extend `lib/types.ts` with any UI-specific types needed (e.g. `ResultRow`, `RunAggregates`).

### Group C — Dashboard (engineer)

- Build `app/page.tsx` per section 6.1.
- Header, contamination callout, metric cards, failure-mode bars, per-class accuracy strip, notable entries.
- ISR with `revalidate = 3600`.
- Empty state if no primary run: "No completed eval run yet. The dashboard will populate once an eval has been run and marked primary."
- Verify mobile layout at 380px and 760px.

### Group D — Per-entry list (engineer)

- Build `app/entry/page.tsx` per section 6.2.
- Filter pills (mechanism + failure mode), AND-combined via URL params.
- List rendering with badges and links to per-entry view.
- Empty state when no entries match.

### Group E — Per-entry view (engineer)

- Build `app/entry/[id]/page.tsx` per section 6.3.
- `generateStaticParams` over all eligible entries (filter to the three valid `longevity_influence` values).
- Layout cards: prompt, solver, ground truth (collapsible), advisor (always visible), raw API trace.
- Prev/next nav respecting filter URL params.
- 404 for bad IDs; "no result for this split" empty state.

### Group F — Methodology page (engineer + Andrew)

- Engineer: build `app/methodology/page.tsx` with all 9 sections per section 6.4.
- Engineer: hand-code the SVG flow diagram (entry → solver → solver output → advisor → grade).
- Engineer: render the hallmarks list reading from `lib/hallmarks.ts` (paraphrases already drafted; Andrew may revise post-launch).
- Andrew (optional, post-launch): revise the 12 hallmark paraphrases in `lib/hallmarks.ts` if desired.
- Andrew: write the methodology page prose for sections 1–3, 5–8.
- Andrew: confirm the López-Otín citation links — find a free preprint version if one exists, link both.

### Group G — Polish (engineer)

- `app/opengraph-image.tsx` per section 8.
- `app/icon.tsx` per section 8.
- `app/not-found.tsx` with a sensible 404.
- `app/sitemap.ts`.
- Add `metadata.title` and `metadata.description` to each page.
- Verify ISR caching by checking response headers on production.

### Group H — Deployment (engineer)

- Push to GitHub.
- Vercel project setup: link the repo, install Neon Marketplace integration (auto-injects `DATABASE_URL`).
- Apply migrations to the production Neon database (see section 13 setup steps).
- Restore Andrew's data dump (see section 13).
- Trigger production deploy.
- Run through the checklist in section 13.

### Group I — Final content (Andrew)

- After deploy, update `lib/notable.ts` with hand-picked entry IDs to feature on the dashboard, push the change.
- Write the README on the GitHub repo focused on engineering setup and pointing at the methodology page on the deployed site for the science.

## 12. Environment variables (.env.example)

The deployed website needs only one env var. The local development environment for running the eval needs two.

Create `.env.local` (gitignored) at the project root with:

```
# Required for the website (deployed and local dev).
# Postgres connection string. Auto-injected by Vercel × Neon Marketplace integration in production.
# For local dev: pull via `vercel env pull .env.local`, or grab from the Neon dashboard.
DATABASE_URL=postgres://username:password@host.neon.tech/dbname?sslmode=require

# Required ONLY for running the eval locally (scripts/run-eval.ts).
# NOT needed by the deployed website. Do NOT set in Vercel.
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

A minimal `.env.example` checked into the repo (no real values):

```
DATABASE_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...   # only needed to run scripts/run-eval.ts locally
```

The `ANTHROPIC_API_KEY` should NEVER be set in Vercel's environment variable settings. The website has no path that calls the Anthropic API. If Vercel preview deployments need the variable for build steps, that's a sign something's wrong — the website should build without it.

## 13. Local setup and deployment

### Receiving the project

If you're picking this up from Andrew, you should have:

1. **The GitHub repo URL.**
2. **A SQL dump** (`genage_eval_dump.sql`) containing entries + runs + results. Andrew generates this with:
   ```bash
   pg_dump --no-owner --no-privileges --data-only \
     --table=entries --table=runs --table=results \
     "$DATABASE_URL" > genage_eval_dump.sql
   ```
3. **This handoff document.**

### Local setup

```bash
# Clone and install
git clone <repo>
cd lifespan-meta
pnpm install

# Link to your own Vercel project (you'll create this)
vercel link

# Install the Neon Marketplace integration via the Vercel dashboard
# (Settings → Integrations → Browse Marketplace → Neon)
# This creates a Neon Postgres database and auto-injects DATABASE_URL.

# Pull env vars
vercel env pull .env.local

# Apply schema migrations
psql "$DATABASE_URL" -f db/migrations/001_entries.sql
psql "$DATABASE_URL" -f db/migrations/002_normalize_casing.sql
psql "$DATABASE_URL" -f db/migrations/003_runs_results.sql

# Restore Andrew's data dump
psql "$DATABASE_URL" -f genage_eval_dump.sql

# Reset SERIAL sequences (the dump inserts explicit IDs; the counters need to catch up)
psql "$DATABASE_URL" -c "SELECT setval('entries_id_seq', (SELECT MAX(id) FROM entries));"
psql "$DATABASE_URL" -c "SELECT setval('runs_id_seq', (SELECT MAX(id) FROM runs));"

# Verify the data is there
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM entries;"
psql "$DATABASE_URL" -c "SELECT id, model, is_primary, completed_at FROM runs;"

# Run the dev server
pnpm dev
```

### Deployment

Vercel deploys on every push to `main`. Preview deployments on pull requests can get their own database branch (Neon × Vercel branching — configure in the Neon dashboard).

Production checklist:

- [ ] Repo pushed to GitHub.
- [ ] Vercel project linked, Neon integration installed.
- [ ] `DATABASE_URL` auto-injected for `production` environment.
- [ ] `ANTHROPIC_API_KEY` is NOT set in any Vercel environment.
- [ ] All three migrations applied to production Neon DB.
- [ ] SQL dump restored to production Neon DB.
- [ ] SERIAL sequences reset (see commands above).
- [ ] At least one `runs` row with `is_primary = TRUE` (otherwise dashboard shows empty state).
- [ ] `lib/hallmarks.ts` paraphrases reviewed (pre-filled with drafted summaries; revise if desired before launch).
- [ ] OG image renders correctly on `https://www.opengraph.xyz/`.
- [ ] Mobile layout verified at 380px and 760px widths.
- [ ] Site loads from a clean browser without errors.

## 14. Decisions and open items

### Decided (do not relitigate)

- **Sonnet 4.6 for the initial run.** Schema supports re-running across model versions; additional runs go in as new `runs` rows.
- **Forced tool-use for structured output**, not the structured-outputs beta header.
- **Temperature 0** on both solver and advisor.
- **Advisor sees confidence.** Bleed-through risk deemed acceptable; will validate via hand-grading.
- **`necessary_for_fitness` and `unannotated` excluded from the eval** at the SQL filter level.
- **Two splits in v1: `main` and `counterfactual`.** Post-cutoff and expert-holdout splits are v2.
- **Mechanism enum = López-Otín 2023 hallmarks of aging.** 12 hallmarks plus `other` and `unclear`.
- **Build-time data fetching** for dashboard and per-entry pages, with ISR. No `/api` routes.
- **Vercel + Neon via Marketplace integration.** Single billing/dashboard.
- **No auth.** Site is fully public read-only.
- **No live demo page.** Per-entry view with raw-trace toggle provides equivalent credibility without API cost.
- **Local-only eval execution.** Runner runs on Andrew's laptop with `pnpm tsx scripts/run-eval.ts`.
- **Reveal toggle pattern.** Ground truth collapsible (default open, controllable via `?reveal=` URL param). Advisor always visible.
- **Mechanism filter via predicted mechanism** (not curator-assigned, since GenAge doesn't have a per-gene mechanism field).
- **No icons for hallmarks in v1.** Names alone.
- **Multi-run comparison page deferred to v2.** v1 ships with the primary run only.
- **Notable entries hardcoded in `lib/notable.ts`** for v1.
- **GitHub repo public from day 1.**
- **README on GitHub focuses on engineering setup; methodology lives on the deployed site.**
- **No expert annotations table or feature.** Removed for v1 simplicity.
- **Prediction target = Longevity Influence** (curator's reconciled judgment), not direction-of-manipulation.
- **Inter font** via `next/font/google`.
- **Primary blue = `#0067AC`.**
- **No dark mode in v1.**
- **Sentence case throughout** (page titles, labels, buttons — never Title Case).

### Engineer's call (no need to ask Andrew)

- **Migration tool.** Drizzle, Kysely, raw `.sql` files via `psql` — pick what you're fastest with.
- **Component library structure.** How to organize MetricCard, Badge, FilterPills, etc.
- **Styling approach.** Tailwind utility classes, CSS modules, or inline styles — your call. CSS variables are pre-defined in section 9; use them.
- **SVG diagram on methodology page.** Engineer designs in their preferred style using the brand colors.
- **404 page copy.** Standard friendly 404 with a link back to the dashboard.

## 15. Glossary

For engineers new to ML evals.

- **Eval / evaluation.** A standardized test of a model's capability on a defined task. Same logical role as an assay in biology.
- **Solver.** The model under test. Receives a prompt, produces a prediction.
- **Advisor.** A second model call (or human grader) that scores the solver's output. Sometimes called a "judge" or "critic."
- **Split.** A subset of the test data designed to isolate a specific factor. Here we have `main` (normal) and `counterfactual` (gene symbol blinded).
- **Contamination.** When the test data leaks into the training data, inflating apparent capability. The counterfactual split is the control for this.
- **Failure mode.** A category of incorrect output. The taxonomy here is fixed; see section 5 for the full list.
- **Calibration.** Whether a model's stated confidence matches its actual accuracy.
- **κ (Cohen's kappa).** A statistic for inter-rater agreement. Used to validate the advisor against Andrew's hand grades. >0.7 is considered strong agreement.
- **Tool use / forced tool use.** A Claude API feature where the model is required to call a specified function. Used here to guarantee structured JSON output matching a schema.
- **Hallmarks of aging.** A widely-cited framework (López-Otín et al. 2023) of 12 biological processes implicated in aging. Used as the mechanism class enum.
- **Run.** One execution of `scripts/run-eval.ts`, producing one `runs` row and ~2,770 `results` rows (1,385 eligible entries × 2 splits).
- **Primary run.** The run featured on the dashboard, marked by `is_primary = TRUE`. Exactly one at a time.
- **Longevity Influence.** GenAge's curator-assigned label for whether a gene's normal function promotes longevity, opposes longevity, or is unclear/conflicting. The eval's prediction target.
- **GO Molecular Function (GO MF).** Gene Ontology subontology covering biochemical activity (e.g. "protein kinase activity"). Used as the model's input — deliberately distinct from GO Biological Process, which often contains lifespan-related terms that would leak the answer.

---

*Last updated: 2026-05-10. Questions: ping Andrew directly.*
