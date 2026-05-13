import Link from 'next/link';
import type { FailureMode } from '@/lib/types';
import { displayFailureMode, failureModeBarColor } from '@/lib/format-display';

interface FailureModeBarProps {
  mode: FailureMode;
  count: number;
  total: number;
}

export function FailureModeBar({ mode, count, total }: FailureModeBarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color = failureModeBarColor(mode);

  return (
    <Link
      href={`/entry?failure_mode=${mode}`}
      className="grid items-center gap-3 py-2 hover:opacity-80 transition-opacity"
      style={{ gridTemplateColumns: '180px 1fr 80px' }}
    >
      <span
        className="text-[13px] truncate"
        style={{ color: 'var(--color-text)' }}
      >
        {displayFailureMode(mode)}
      </span>
      <div
        className="h-3.5 rounded overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-muted)' }}
      >
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-[13px] text-right"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {count} ({Math.round(pct)}%)
      </span>
    </Link>
  );
}
