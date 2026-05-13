import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import type { RunRow, FailureMode, LongevityInfluence } from '@/lib/types';
import { MetricCard } from '@/components/MetricCard';
import { FailureModeBar } from '@/components/FailureModeBar';
import { NOTABLE_ENTRY_IDS } from '@/lib/notable';
import { formatPercentInt, displayLongevity, longevityInfluenceColor } from '@/lib/format-display';

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

async function getPrimaryRun(): Promise<RunRow | undefined> {
  const rows = (await sql`
    SELECT id, model, completed_at, is_primary, aggregates
    FROM runs
    WHERE is_primary = TRUE
    LIMIT 1
  `) as unknown as RunRow[];
  return rows[0];
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
  const [run, notableEntries] = await Promise.all([
    getPrimaryRun(),
    getNotableEntries(),
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
          by Andrew T. Rodriguez, Ph.D.
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {run.model} · {agg.total_entries.toLocaleString()} entries · run {completedDate}
        </p>
      </section>

      {/* Contamination gap callout */}
      <section className="mb-8">
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-primary-tint)' }}>
          <div
            className="font-semibold leading-none mb-2"
            style={{ fontSize: 48, color: 'var(--color-primary-dark)' }}
          >
            −{agg.contamination_gap_pp} pp
          </div>
          <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Accuracy drop when the gene symbol is blinded
          </p>
          <p className="text-[15px] max-w-2xl" style={{ color: 'var(--color-text)' }}>
            The difference between accuracy on the main split — where the model sees the real
            gene symbol — and the counterfactual split — where the symbol is replaced with{' '}
            <code className="font-mono text-[13px]">GENE-X</code> — measures how much of the
            model&apos;s apparent capability comes from recognizing names vs. reasoning about
            biology.
          </p>
        </div>
      </section>

      {/* Metric cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Main split accuracy"
            value={formatPercentInt(agg.main_accuracy)}
            footnote="Gene symbol visible"
          />
          <MetricCard
            label="Counterfactual accuracy"
            value={formatPercentInt(agg.counterfactual_accuracy)}
            footnote="Gene symbol blinded"
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

      {/* Per-class accuracy strip */}
      <section className="mb-8">
        <h2 className="text-[20px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Accuracy by class
        </h2>
        <div className="flex flex-wrap gap-3">
          {classOrder.map(cls => {
            const data = agg.class_breakdown_main[cls];
            if (!data) return null;
            const colors = longevityInfluenceColor(cls);
            return (
              <div
                key={cls}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px]"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <span className="font-medium">{displayLongevity(cls)}</span>
                <span>{formatPercentInt(data.accuracy)} ({data.n.toLocaleString()})</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Notable entries */}
      <section>
        <h2 className="text-[20px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Notable entries
        </h2>
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
              <span
                className="font-mono text-[15px] font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                {entry.symbol}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {entry.organism}
              </span>
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
