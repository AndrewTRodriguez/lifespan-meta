'use client';

import { useState } from 'react';

interface CollapsibleProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ trigger, children, defaultOpen = true }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[13px] transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <svg
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {trigger}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
