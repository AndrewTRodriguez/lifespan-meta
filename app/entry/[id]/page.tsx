import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import type { LongevityInfluence, SolverOutput, AdvisorOutput, Split } from '@/lib/types';
import { LongevityBadge, FailureModeBadge } from '@/components/Badge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { ReasoningDots } from '@/components/ReasoningDots';
import { Collapsible } from '@/components/Collapsible';
import { SplitTabs } from '@/components/SplitTabs';
import { displayMechanism, displayLongevity, displayOrganism, formatGeneSymbol } from '@/lib/format-display';

export const revalidate = 3600;
export const dynamicParams = false;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntryRow {
  id: number;
  symbol: string;
  organism: string;
  full_name: string | null;
  longevity_influence: LongevityInfluence;
  functional_description_raw: string;
  lifespan_effect: string;
}

interface ResultRow {
  split: Split;
  prompt_sent: string;
  solver: SolverOutput;
  advisor: AdvisorOutput;
}

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const rows = (await sql`
    SELECT id FROM entries
    WHERE longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
  `) as unknown as { id: number }[];
  return rows.map(r => ({ id: String(r.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rows = (await sql`
    SELECT symbol, organism FROM entries WHERE id = ${parseInt(id, 10)} LIMIT 1
  `) as unknown as { symbol: string; organism: string }[];
  if (!rows[0]) return { title: 'Entry not found' };
  const { symbol, organism } = rows[0];
  return {
    title: symbol ? `${symbol} · ${organism}` : `Entry ${id}`,
    description: `Eval results for ${symbol || 'this gene'} (${organism}). Longevity influence prediction, mechanism class, and advisor judgment.`,
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getEntry(id: number): Promise<EntryRow | undefined> {
  const rows = (await sql`
    SELECT id, symbol, organism, full_name, longevity_influence,
           functional_description_raw, lifespan_effect
    FROM entries
    WHERE id = ${id}
      AND longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
    LIMIT 1
  `) as unknown as EntryRow[];
  return rows[0];
}

async function getResults(entryId: number): Promise<ResultRow[]> {
  return (await sql`
    SELECT r.split, r.prompt_sent, r.solver, r.advisor
    FROM results r
    WHERE r.run_id = (SELECT id FROM runs WHERE is_primary = TRUE LIMIT 1)
      AND r.entry_id = ${entryId}
  `) as unknown as ResultRow[];
}

async function getPrevNext(
  entryId: number,
  mechanism: string | null,
  failureMode: string | null,
): Promise<{ prevId: number | null; nextId: number | null }> {
  const ids = (await sql`
    SELECT e.id
    FROM entries e
    LEFT JOIN results r
      ON r.entry_id = e.id
     AND r.run_id = (SELECT id FROM runs WHERE is_primary = TRUE LIMIT 1)
     AND r.split = 'main'
    WHERE e.longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
      AND (${mechanism}::text IS NULL OR r.solver->>'mechanism_class' = ${mechanism})
      AND (${failureMode}::text IS NULL OR r.advisor->>'failure_mode' = ${failureMode})
    ORDER BY e.symbol ASC, e.id ASC
  `) as unknown as { id: number }[];

  const idx = ids.findIndex(r => r.id === entryId);
  return {
    prevId: idx > 0 ? ids[idx - 1].id : null,
    nextId: idx < ids.length - 1 ? ids[idx + 1].id : null,
  };
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}
    >
      {title && (
        <h3
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span
        className="text-[13px] w-36 shrink-0 pt-0.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[12px]"
      style={{
        backgroundColor: 'var(--color-bg-muted)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {children}
    </span>
  );
}

function CheckMark({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[14px]">
      <span
        className="font-medium"
        style={{ color: ok ? 'var(--color-success)' : 'var(--color-error)' }}
      >
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ color: 'var(--color-text)' }}>{label}</span>
    </span>
  );
}

function navUrl(
  targetId: number,
  mechanism: string | null,
  failureMode: string | null,
): string {
  const params = new URLSearchParams();
  if (mechanism) params.set('mechanism', mechanism);
  if (failureMode) params.set('failure_mode', failureMode);
  const qs = params.toString();
  return `/entry/${targetId}${qs ? '?' + qs : ''}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    split?: string;
    mechanism?: string;
    failure_mode?: string;
    reveal?: string;
  }>;
}) {
  const { id: idStr } = await params;
  const sp = await searchParams;

  const entryId = parseInt(idStr, 10);
  if (isNaN(entryId)) notFound();

  const activeSplit: Split =
    sp.split === 'counterfactual' ? 'counterfactual' : 'main';
  const mechanism = sp.mechanism ?? null;
  const failureMode = sp.failure_mode ?? null;
  const defaultReveal = sp.reveal !== 'closed';

  const [entry, results, { prevId, nextId }] = await Promise.all([
    getEntry(entryId),
    getResults(entryId),
    getPrevNext(entryId, mechanism, failureMode),
  ]);

  if (!entry) notFound();

  const mainResult = results.find(r => r.split === 'main') ?? null;
  const counterfactualResult = results.find(r => r.split === 'counterfactual') ?? null;
  const activeResult = activeSplit === 'main' ? mainResult : counterfactualResult;

  const backParams = new URLSearchParams();
  if (mechanism) backParams.set('mechanism', mechanism);
  if (failureMode) backParams.set('failure_mode', failureMode);
  const backHref = `/entry${backParams.toString() ? '?' + backParams.toString() : ''}`;

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-12 py-12">

      {/* Breadcrumb + nav */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backHref}
          className="text-[13px] hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          ← Browse entries
        </Link>
        <div className="flex items-center gap-4">
          {prevId && (
            <Link
              href={navUrl(prevId, mechanism, failureMode)}
              className="text-[13px] hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              ← Prev
            </Link>
          )}
          {nextId && (
            <Link
              href={navUrl(nextId, mechanism, failureMode)}
              className="text-[13px] hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              Next →
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <section className="mb-6">
        <h1
          className="font-mono text-[28px] font-semibold leading-tight"
          style={{ color: 'var(--color-text)' }}
        >
          {entry.symbol
            ? <em>{formatGeneSymbol(entry.symbol, entry.organism)}</em>
            : <span style={{ color: 'var(--color-text-tertiary)' }}>(unnamed)</span>
          }
        </h1>
        <p className="mt-1 text-[20px]" style={{ color: 'var(--color-text-secondary)' }}>
          <em>{displayOrganism(entry.organism)}</em>
        </p>
        {entry.full_name && (
          <p className="mt-0.5 text-[15px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {entry.full_name}
          </p>
        )}
      </section>

      {/* Split tabs */}
      <div className="mb-6">
        <Suspense>
          <SplitTabs activeSplit={activeSplit} />
        </Suspense>
      </div>

      {/* Split content */}
      {!activeResult ? (
        <p className="text-[15px] py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          No result for this split yet.
        </p>
      ) : (
        <div className="space-y-4">

          {/* What the model saw */}
          <Card title="What the model saw">
            <pre
              className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap rounded p-3 overflow-x-auto"
              style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text)' }}
            >
              {activeResult.prompt_sent}
            </pre>
            <details className="mt-3">
              <summary
                className="text-[13px] cursor-pointer select-none hover:opacity-70"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                View unredacted entry
              </summary>
              <pre
                className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap rounded p-3 mt-2 overflow-x-auto"
                style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text)' }}
              >
                {entry.functional_description_raw}
              </pre>
            </details>
          </Card>

          {/* Solver output */}
          <Card title="Solver output">
            <div className="space-y-3">
              <Row label="Predicted influence">
                <LongevityBadge value={activeResult.solver.longevity_influence} />
              </Row>
              <Row label="Confidence">
                <ConfidenceBar value={activeResult.solver.confidence} />
              </Row>
              <Row label="Mechanism">
                <Tag>{displayMechanism(activeResult.solver.mechanism_class)}</Tag>
              </Row>
              <Row label="Reasoning">
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {activeResult.solver.reasoning}
                </p>
              </Row>
              {activeResult.solver.key_pathways.length > 0 && (
                <Row label="Key pathways">
                  <div className="flex flex-wrap gap-1.5">
                    {activeResult.solver.key_pathways.map(p => (
                      <Tag key={p}>{p}</Tag>
                    ))}
                  </div>
                </Row>
              )}
            </div>
          </Card>

          {/* Ground truth (collapsible) */}
          <div
            className="rounded-lg p-4"
            style={{ border: '0.5px solid var(--color-border)' }}
          >
            <Collapsible
              trigger={
                <span className="text-[16px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  Ground truth (GenAge)
                </span>
              }
              defaultOpen={defaultReveal}
            >
              <div className="space-y-3">
                <Row label="Longevity influence">
                  <LongevityBadge value={entry.longevity_influence} />
                </Row>
                {entry.lifespan_effect && (
                  <Row label="Lifespan effect">
                    <Tag>{entry.lifespan_effect}</Tag>
                  </Row>
                )}
                <Row label="">
                  <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                    GenAge curators classify each gene&apos;s normal function as promoting
                    (Pro-Longevity) or opposing (Anti-Longevity) longevity, based on synthesis
                    across studies. Loss-of-function effects can vary from this depending on the
                    manipulation.
                  </p>
                </Row>
              </div>
            </Collapsible>
          </div>

          {/* Advisor judgment */}
          <Card title="Advisor judgment">
            {activeResult.advisor.ground_truth_questionable && (
              <div
                className="rounded p-3 mb-4 text-[13px]"
                style={{
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                }}
              >
                The advisor flagged this ground-truth label as potentially questionable.
              </div>
            )}
            <div className="space-y-3">
              <Row label="Answer">
                <CheckMark
                  ok={activeResult.advisor.answer_correct}
                  label={activeResult.advisor.answer_correct ? 'Correct' : 'Incorrect'}
                />
              </Row>
              <Row label="Mechanism">
                <CheckMark
                  ok={activeResult.advisor.mechanism_correct}
                  label={activeResult.advisor.mechanism_correct ? 'Correct' : 'Incorrect'}
                />
              </Row>
              <Row label="Reasoning quality">
                <div className="flex items-center gap-2">
                  <ReasoningDots quality={activeResult.advisor.reasoning_quality} />
                  <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {activeResult.advisor.reasoning_quality}/5
                  </span>
                </div>
              </Row>
              <Row label="Failure mode">
                <FailureModeBadge value={activeResult.advisor.failure_mode} />
              </Row>
              {activeResult.advisor.notes && (
                <Row label="Notes">
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text)' }}>
                    {activeResult.advisor.notes}
                  </p>
                </Row>
              )}
            </div>
          </Card>

          {/* Raw API trace */}
          <details>
            <summary
              className="text-[13px] cursor-pointer select-none hover:opacity-70 py-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Raw API responses
            </summary>
            <div
              className="mt-2 rounded p-3 overflow-x-auto"
              style={{ backgroundColor: 'var(--color-bg-muted)' }}
            >
              <p className="font-mono text-[12px] mb-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                solver
              </p>
              <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                {JSON.stringify(activeResult.solver, null, 2)}
              </pre>
              <p className="font-mono text-[12px] mt-4 mb-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                advisor
              </p>
              <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                {JSON.stringify(activeResult.advisor, null, 2)}
              </pre>
            </div>
          </details>

        </div>
      )}

    </main>
  );
}
