import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import type { RunRow, FailureMode, LongevityInfluence } from '@/lib/types';
import { MetricCard } from '@/components/MetricCard';
import { FailureModeBar } from '@/components/FailureModeBar';
import { NOTABLE_ENTRY_IDS } from '@/lib/notable';
import { formatPercentInt, displayLongevity, longevityInfluenceColor, displayOrganism, formatGeneSymbol } from '@/lib/format-display';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Aging biology eval',
  description: "Probing Claude's reasoning about gene effects on lifespan",
};

interface NotableEntry {
  id: number;
  symbol: string;
  organism: string;
}

interface ClassBreakdownRow {
  ground_truth: LongevityInfluence;
  n: string;
  correct: string;
  pct: string;
}

async function getPrimaryRun(): Promise<RunRow | undefined> {
  const rows = (await sql`
    SELECT id, model, completed_at, is_primary, aggregates
    FROM runs
    WHERE is_primary = TRUE
    LIMIT 1
  `) as unknown as RunRow[];
  return rows[0];
}

async function getClassBreakdown(): Promise<ClassBreakdownRow[]> {
  const rows = await sql`
    SELECT
      e.longevity_influence AS ground_truth,
      COUNT(*) AS n,
      SUM(CASE WHEN (r.advisor->>'answer_correct')::boolean THEN 1 ELSE 0 END) AS correct,
      ROUND(100.0 * SUM(CASE WHEN (r.advisor->>'answer_correct')::boolean THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct
    FROM results r
    JOIN entries e ON e.id = r.entry_id
    WHERE r.run_id = (SELECT id FROM runs WHERE is_primary = TRUE LIMIT 1)
      AND r.split = 'main'
    GROUP BY e.longevity_influence
  `;
  return rows as unknown as ClassBreakdownRow[];
}

async function getNotableEntries(): Promise<NotableEntry[]> {
  const rows = (await sql`
    SELECT id, symbol, organism
    FROM entries
    WHERE id = ANY(${NOTABLE_ENTRY_IDS})
  `) as unknown as NotableEntry[];
  return NOTABLE_ENTRY_IDS
    .map(id => rows.find(e => e.id === id))
    .filter((e): e is NotableEntry => e !== undefined);
}

export default async function DashboardPage() {
  const [run, notableEntries, classBreakdown] = await Promise.all([
    getPrimaryRun(),
    getNotableEntries(),
    getClassBreakdown(),
  ]);

  if (!run?.aggregates) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-[28px] font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Aging biology eval
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          No completed eval run yet. The dashboard will populate once an eval has been
          run and marked primary.
        </p>
      </main>
    );
  }

  const agg = run.aggregates;
  const completedDate = run.completed_at
    ? new Date(run.completed_at).toISOString().slice(0, 10)
    : 'unknown';

  const failureModes = (Object.entries(agg.failure_mode_counts) as [FailureMode, number][])
    .sort(([, a], [, b]) => b - a);
  const failureModeTotal = failureModes.reduce((sum, [, n]) => sum + n, 0);

  const classOrder: LongevityInfluence[] = ['pro_longevity', 'anti_longevity', 'unclear'];

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-12 py-12">

      {/* Header */}
      <section className="mb-8">
        <h1 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
          Aging biology eval
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
          Probing Claude&apos;s reasoning about gene effects on lifespan
        </p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>
          by{' '}
          <Link
            href="https://andrewtrodriguez.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Andrew T. Rodriguez, Ph.D.
          </Link>
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Evaluating {run.model} · {agg.total_entries.toLocaleString()} entries · run {completedDate}
        </p>
      </section>

      {/* Intro paragraph */}
      <section className="mb-8">
        <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-text)' }}>
          A 1,379-gene evaluation of Claude Sonnet 4.6&apos;s ability to predict whether an
          aging gene promotes or opposes longevity, given only the gene&apos;s molecular
          function. The model reaches 45% accuracy on a 3-class task — but the more revealing
          finding is a directional bias: it identifies pro-longevity genes 73% of the time and
          anti-longevity genes only 30% of the time, often inverting the label even when its
          own reasoning arrives at the correct mechanism. Each per-entry page shows the prompt,
          the model&apos;s reasoning, the GenAge ground truth, and an LLM-graded judgment.
        </p>
      </section>

      {/* Hero */}
      <section className="mb-6">
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-primary-tint)' }}>
          <div
            className="font-semibold leading-none mb-1"
            style={{ fontSize: 48, color: 'var(--color-primary-dark)' }}
          >
            {formatPercentInt(agg.main_accuracy)}
          </div>
          <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Main split accuracy
          </p>
          <p className="text-[15px]" style={{ color: 'var(--color-text)' }}>
            3-class longevity influence prediction across {agg.total_entries.toLocaleString()} aging genes.
            Cohen&apos;s κ = {agg.advisor_kappa_vs_expert != null
              ? agg.advisor_kappa_vs_expert.toFixed(2)
              : '—'} vs. expert hand-grading.
          </p>
        </div>
      </section>

      {/* Metric cards */}
      <section className="mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Counterfactual accuracy"
            value={formatPercentInt(agg.counterfactual_accuracy)}
            footnote="Gene symbol blinded"
          />
          <MetricCard
            label="Contamination gap"
            value={`−${agg.contamination_gap_pp} pp`}
            footnote="See methodology →"
            footnoteHref="/methodology#blinding"
          />
          <MetricCard
            label="Mechanism accuracy"
            value={formatPercentInt(agg.mechanism_accuracy_main)}
            footnote="Main split, hallmark prediction"
          />
          <MetricCard
            label="Advisor κ vs. expert"
            value={agg.advisor_kappa_vs_expert != null
              ? agg.advisor_kappa_vs_expert.toFixed(2)
              : '—'}
            footnote="Cohen's kappa, hand-graded sample"
          />
        </div>
      </section>

      {/* Caveat note */}
      <p className="mb-8 text-[13px] italic" style={{ color: 'var(--color-text-tertiary)' }}>
        Counterfactual split blinds the gene symbol but not the protein name.{' '}
        <Link
          href="/methodology#blinding"
          className="underline hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          See methodology →
        </Link>
      </p>

      {/* Failure mode breakdown */}
      <section className="mb-8">
        <h2 className="text-[20px] font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Failure mode breakdown
        </h2>
        <div
          className="rounded-lg px-4 py-2"
          style={{ border: '0.5px solid var(--color-border)' }}
        >
          {failureModes.map(([mode, count]) => (
            <FailureModeBar key={mode} mode={mode} count={count} total={failureModeTotal} />
          ))}
        </div>
      </section>

      {/* Per-class recall strip */}
      <section className="mb-8">
        <h2 className="text-[20px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Accuracy by class
        </h2>
        <div className="flex flex-wrap gap-3">
          {classOrder.map(cls => {
            const row = classBreakdown.find(r => r.ground_truth === cls);
            if (!row) return null;
            const colors = longevityInfluenceColor(cls);
            return (
              <div
                key={cls}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px]"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <span className="font-medium">{displayLongevity(cls)}</span>
                <span>{row.pct}% ({Number(row.n).toLocaleString()})</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Notable entries */}
      <section>
        <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Notable entries
        </h2>
        <p className="text-[14px] leading-[1.6] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Seven entries spanning GenAge&apos;s four model organisms, mixing textbook correct
          cases on canonical aging genes (<em>daf-2</em>, <em>age-1</em>, <em>foxo</em>,{' '}
          <em>TOR1</em>) with examples of failure modes the eval surfaces — label inversions
          (<em>chico</em>, <em>Ghrhr</em>) and a confident commitment against a
          curator-assigned unclear ground truth (<em>SIR2</em>).
        </p>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '0.5px solid var(--color-border)' }}
        >
          {notableEntries.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/entry/${entry.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--color-bg-subtle)]"
              style={{
                borderTop: i > 0 ? '0.5px solid var(--color-border)' : undefined,
              }}
            >
              <em
                className="font-mono text-[15px] font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                {formatGeneSymbol(entry.symbol, entry.organism)}
              </em>
              <em className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {displayOrganism(entry.organism)}
              </em>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[13px]">
          <Link
            href="/entry"
            className="underline hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Browse all {agg.total_entries.toLocaleString()} entries →
          </Link>
        </p>
      </section>

    </main>
  );
}
