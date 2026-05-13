'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/entry', label: 'Browse entries' },
  { href: '/methodology', label: 'Methodology' },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="sticky top-0 z-10 border-b px-6 md:px-12"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-6 h-12">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-[14px] transition-opacity hover:opacity-70"
            style={{
              color: isActive(href) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: isActive(href) ? 600 : 400,
              textDecoration: isActive(href) ? 'underline' : 'none',
              textUnderlineOffset: '3px',
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
