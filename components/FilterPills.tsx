'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { HALLMARKS, type HallmarkKey } from '@/lib/hallmarks';
import type { FailureMode } from '@/lib/types';
import { displayFailureMode } from '@/lib/format-display';

const FAILURE_MODES: FailureMode[] = [
  'correct',
  'right_answer_wrong_reasoning',
  'confident_wrong',
  'appropriately_uncertain',
  'hallucinated_specifics',
  'overhedged',
  'other_wrong',
];

const MECHANISM_KEYS = Object.keys(HALLMARKS) as HallmarkKey[];

interface PillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Pill({ label, active, onClick }: PillProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[13px] transition-colors border"
      style={{
        backgroundColor: active ? 'var(--color-primary)' : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-text)',
        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
      }}
    >
      {label}
    </button>
  );
}

export function MechanismFilterPills() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('mechanism');

  function toggle(key: HallmarkKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('mechanism') === key) {
      params.delete('mechanism');
    } else {
      params.set('mechanism', key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MECHANISM_KEYS.map(key => (
        <Pill
          key={key}
          label={HALLMARKS[key].displayName}
          active={current === key}
          onClick={() => toggle(key)}
        />
      ))}
    </div>
  );
}

export function FailureModeFilterPills() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('failure_mode');

  function toggle(mode: FailureMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('failure_mode') === mode) {
      params.delete('failure_mode');
    } else {
      params.set('failure_mode', mode);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FAILURE_MODES.map(mode => (
        <Pill
          key={mode}
          label={displayFailureMode(mode)}
          active={current === mode}
          onClick={() => toggle(mode)}
        />
      ))}
    </div>
  );
}

export function ClearFiltersLink() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFilters =
    searchParams.has('mechanism') || searchParams.has('failure_mode');

  if (!hasFilters) return null;

  return (
    <button
      onClick={() => router.push(pathname)}
      className="text-[13px] underline"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      Clear filters
    </button>
  );
}
