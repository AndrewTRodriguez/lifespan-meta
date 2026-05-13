export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-3.5 rounded overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-muted)' }}
      >
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }}
        />
      </div>
      <span
        className="text-[13px] w-9 text-right shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {pct}%
      </span>
    </div>
  );
}
