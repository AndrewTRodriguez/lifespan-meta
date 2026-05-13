'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Split } from '@/lib/types';

const SPLITS: Split[] = ['main', 'counterfactual'];

export function SplitTabs({ activeSplit }: { activeSplit: Split }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(split: Split) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('split', split);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="flex gap-1 p-1 rounded-lg inline-flex"
      style={{ backgroundColor: 'var(--color-bg-muted)' }}
    >
      {SPLITS.map(split => {
        const active = activeSplit === split;
        return (
          <button
            key={split}
            onClick={() => select(split)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: active ? 'var(--color-bg)' : 'transparent',
              color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {split}
          </button>
        );
      })}
    </div>
  );
}
