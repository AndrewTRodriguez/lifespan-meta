export function ReasoningDots({ quality }: { quality: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-1.5">
      {([1, 2, 3, 4, 5] as const).map(i => (
        <div
          key={i}
          className="w-3 h-3 rounded-full border"
          style={{
            backgroundColor: i <= quality ? 'var(--color-primary)' : 'transparent',
            borderColor: i <= quality ? 'var(--color-primary)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}
