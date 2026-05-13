import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-24 text-center">
      <p
        className="text-[12px] font-medium uppercase tracking-widest mb-4"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        404
      </p>
      <h1
        className="text-[28px] font-semibold mb-3"
        style={{ color: 'var(--color-text)' }}
      >
        Page not found
      </h1>
      <p
        className="text-[15px] mb-8 max-w-md mx-auto"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        That URL doesn&apos;t exist. If you followed a link to a gene entry, it may
        not be in the eligible eval dataset.
      </p>
      <Link
        href="/"
        className="text-[15px] underline hover:opacity-70"
        style={{ color: 'var(--color-primary)' }}
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}
