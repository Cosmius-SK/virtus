'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mark } from './Logo';

/**
 * The application frame.
 *
 * A fixed dark header with the mark and the four places there are to go. It is
 * the same on every screen, which is most of what makes software feel like an
 * application rather than a page — you always know where you are and what else
 * exists.
 */
const NAV = [
  { href: '/', label: 'Compose' },
  { href: '/library', label: 'Documents' },
  { href: '/organisation', label: 'Organisation' },
  { href: '/case', label: 'Usage' },
];

export function Shell({
  children,
  classification,
}: {
  children: React.ReactNode;
  classification?: string;
}) {
  const path = usePathname();
  if (path === '/unlock') return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-night">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-8 px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Virtus home">
            <Mark className="h-6 w-6 text-accent [--mark-vent:#1B2430]" />
            <span className="text-[13px] font-semibold tracking-[0.16em] text-white">VIRTUS</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-1.5 text-[13px] transition ${
                    active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {classification && (
            <span className="ml-auto hidden items-center gap-2 rounded border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200/90 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {classification}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-6 py-4 text-[11px] text-ink40">
          <span>Virtus {process.env.NEXT_PUBLIC_VIRTUS_VERSION}</span>
          <span>Documents are held on this device and are not shared.</span>
          <Link href="/case" className="ml-auto hover:text-accent">
            Usage and cost
          </Link>
        </div>
      </footer>
    </div>
  );
}
