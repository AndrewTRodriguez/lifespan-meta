import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import type { LongevityInfluence, FailureMode } from '@/lib/types';
import { HALLMARKS, type HallmarkKey } from '@/lib/hallmarks';
import { LongevityBadge, FailureModeBadge } from '@/components/Badge';
import {
  MechanismFilterPills,
  FailureModeFilterPills,
  ClearFiltersLink,
} from '@/components/FilterPills';
import { displayFailureMode, displayOrganism } from '@/lib/format-display';

export const metadata: Metadata = {
  title: 'Browse entries',
  description: 'Browse and filter all 1,385 gene entries evaluated in the aging biology eval. Filter by hallmark of aging or failure mode.',
};

const PAGE_SIZE = 50;

interface EntryListRow {
  id: number;
  symbol: string;
  organism: string;
  longevity_influence: LongevityInfluence;
  predicted_longevity_influence: LongevityInfluence | null;
  failure_mode: FailureMode | null;
}

async function queryEntries(
  mechanism: string | null,
  failureMode: string | null,
  page: number,
): Promise<{ entries: EntryListRow[]; total: number }> {
  const offset = (page - 1) * PAGE_SIZE;
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        e.id,
        e.symbol,
        e.organism,
        e.longevity_influence,
        r.solver->>'longevity_influence'  AS predicted_longevity_influence,
        r.advisor->>'failure_mode'        AS failure_mode
      FROM entries e
      LEFT JOIN results r
        ON r.entry_id = e.id
       AND r.run_id = (SELECT id FROM runs WHERE is_primary = TRUE LIMIT 1)
       AND r.split = 'main'
      WHERE e.longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
        AND e.symbol IS NOT NULL AND e.symbol != ''
        AND (${mechanism}::text IS NULL OR r.solver->>'mechanism_class' = ${mechanism})
        AND (${failureMode}::text IS NULL OR r.advisor->>'failure_mode' = ${failureMode})
      ORDER BY e.symbol ASC, e.id ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM entries e
      LEFT JOIN results r
        ON r.entry_id = e.id
       AND r.run_id = (SELECT id FROM runs WHERE is_primary = TRUE LIMIT 1)
       AND r.split = 'main'
      WHERE e.longevity_influence IN ('pro_longevity', 'anti_longevity', 'unclear')
        AND e.symbol IS NOT NULL AND e.symbol != ''
        AND (${mechanism}::text IS NULL OR r.solver->>'mechanism_class' = ${mechanism})
        AND (${failureMode}::text IS NULL OR r.advisor->>'failure_mode' = ${failureMode})
    `,
  ]);
  return {
    entries: rows as unknown as EntryListRow[],
    total: Number((countRows as unknown as { count: string }[])[0].count),
  };
}

function filterSummary(
  mechanism: string | null,
  failureMode: string | null,
  total: number,
): string {
  const parts: string[] = [];
  if (mechanism) {
    const name = HALLMARKS[mechanism as HallmarkKey]?.displayName ?? mechanism;
    parts.push(`mechanism: ${name}`);
  }
  if (failureMode) {
    parts.push(`failure mode: ${displayFailureMode(failureMode as FailureMode)}`);
  }
  const count = `${total.toLocaleString()} ${total === 1 ? 'entry' : 'entries'}`;
  return `Showing ${count} with ${parts.join(' and ')}`;
}

function entryUrl(
  id: number,
  mechanism: string | null,
  failureMode: string | null,
): string {
  const params = new URLSearchParams();
  if (mechanism) params.set('mechanism', mechanism);
  if (failureMode) params.set('failure_mode', failureMode);
  const qs = params.toString();
  return `/entry/${id}${qs ? '?' + qs : ''}`;
}

function PaginationLink({
  label,
  page,
  mechanism,
  failureMode,
}: {
  label: string;
  page: number;
  mechanism: string | null;
  failureMode: string | null;
}) {
  const params = new URLSearchParams();
  if (mechanism) params.set('mechanism', mechanism);
  if (failureMode) params.set('failure_mode', failureMode);
  if (page > 1) params.set('page', String(page));
  return (
    <Link
      href={`/entry?${params.toString()}`}
      className="px-3 py-1.5 rounded text-[13px] border transition-colors hover:bg-[var(--color-bg-subtle)]"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    >
      {label}
    </Link>
  );
}

export default async function EntryListPage({
  searchParams,
}: {
  searchParams: Promise<{ mechanism?: string; failure_mode?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const mechanism = sp.mechanism ?? null;
  const failureMode = sp.failure_mode ?? null;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const { entries, total } = await queryEntries(mechanism, failureMode, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(mechanism || failureMode);

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-12 py-12">

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-[13px] hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Browse entries
        </h1>
        {hasFilters && (
          <p className="mt-1 text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            {filterSummary(mechanism, failureMode, total)}
          </p>
        )}
      </div>

      {/* Filter bar */}
      <section className="mb-6 space-y-4">
        <div>
          <p
            className="text-[12px] font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Mechanism
          </p>
          <Suspense>
            <MechanismFilterPills />
          </Suspense>
        </div>
        <div>
          <p
            className="text-[12px] font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Failure mode
          </p>
          <Suspense>
            <FailureModeFilterPills />
          </Suspense>
        </div>
        <Suspense>
          <ClearFiltersLink />
        </Suspense>
      </section>

      {/* Results */}
      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            No entries match these filters.
          </p>
          <Link
            href="/entry"
            className="text-[13px] underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '0.5px solid var(--color-border)' }}
          >
            {entries.map((entry, i) => (
              <Link
                key={entry.id}
                href={entryUrl(entry.id, mechanism, failureMode)}
                className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-[var(--color-bg-subtle)]"
                style={{ borderTop: i > 0 ? '0.5px solid var(--color-border)' : undefined }}
              >
                <span
                  className="font-mono text-[14px] font-medium shrink-0"
                  style={{ color: 'var(--color-primary)', minWidth: 'max-content' }}
                >
                  {entry.symbol}
                </span>
                <span className="text-[13px] shrink-0 select-none" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                <em
                  className="text-[13px] shrink-0"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {displayOrganism(entry.organism)}
                </em>
                <span className="flex-1" />
                <div className="flex items-center gap-1.5 shrink-0">
                  {entry.predicted_longevity_influence && (
                    <>
                      <LongevityBadge value={entry.predicted_longevity_influence} />
                      <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        →
                      </span>
                    </>
                  )}
                  <LongevityBadge value={entry.longevity_influence} />
                  {entry.failure_mode && (
                    <>
                      <span className="text-[12px] px-0.5 select-none" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                      <FailureModeBadge value={entry.failure_mode} />
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              {total.toLocaleString()} entries · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <PaginationLink
                  label="← Previous"
                  page={page - 1}
                  mechanism={mechanism}
                  failureMode={failureMode}
                />
              )}
              {page < totalPages && (
                <PaginationLink
                  label="Next →"
                  page={page + 1}
                  mechanism={mechanism}
                  failureMode={failureMode}
                />
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
