interface MetricCardProps {
  label: string;
  value: string;
  footnote?: string;
}

export function MetricCard({ label, value, footnote }: MetricCardProps) {
  return (
    <div
      className="bg-white rounded-lg p-4"
      style={{ border: '0.5px solid var(--color-border)' }}
    >
      <div className="text-[13px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      <div className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
        {value}
      </div>
      {footnote && (
        <div className="text-[12px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {footnote}
        </div>
      )}
    </div>
  );
}
