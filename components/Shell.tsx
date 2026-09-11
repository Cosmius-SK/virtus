'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mark } from './Logo';
import { BroadcastStrip } from './BroadcastStrip';
import { broadcastsOf, live } from '@/lib/admin/broadcast';
import { useSettings } from '@/lib/admin/use';

/**
 * The application frame.
 *
 * A fixed dark header with the mark and the five places there are to go. It is
 * the same on every screen, which is most of what makes software feel like an
 * application rather than a page — you always know where you are and what else
 * exists.
 *
 * On a narrow screen the five do not fit, and the failure was not a squeeze: a
 * row wider than the phone made the whole document wider than the phone, so
 * every page scrolled sideways and every breakpoint below was measured against
 * the wrong width. So below `sm` the row collapses to a button and the same
 * five become a panel. Not a different navigation — the same one, laid out for
 * the space there is.
 */
const NAV = [
  { href: '/', label: 'Compose' },
  { href: '/library', label: 'Documents' },
  { href: '/organisation', label: 'Organisation' },
  { href: '/case', label: 'Usage' },
  { href: '/admin', label: 'Admin' },
];

/**
 * Two strips, and they are not the same thing.
 *
 * The classification line is a control. It says what may be typed into this
 * deployment, it is set by whoever deployed it, and it is not editable from
 * inside the application — a control the people bound by it can switch off is
 * not a control.
 *
 * The broadcast is operational and temporary: a trial, an outage, a freeze. It
 * is set in the admin space and it is meant to change. Keeping them apart is
 * the whole point; merging them would make the governance line something an
 * admin can quietly rewrite.
 */

export function Shell({
  children,
  classification,
}: {
  children: React.ReactNode;
  classification?: string;
}) {
  const path = usePathname();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const showing = live(broadcastsOf(settings));

  // Following a link inside the panel must close it. Keyed on the path rather
  // than the click, so the browser's own back button closes it too.
  useEffect(() => setOpen(false), [path]);

  if (path === '/unlock') return <>{children}</>;

  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-night">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Virtus home">
            <Mark className="h-6 w-6 text-accent [--mark-vent:#1B2430]" />
            <span className="text-[13px] font-semibold tracking-[0.16em] text-white">VIRTUS</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 text-[13px] transition ${
                  isActive(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {classification && (
            <span className="ml-auto hidden min-w-0 items-center gap-2 rounded border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200/90 lg:flex">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span className="truncate">{classification}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="main-nav"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
          >
            <span className="sr-only">{open ? 'Close the menu' : 'Open the menu'}</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <nav id="main-nav" className="border-t border-white/10 px-4 pb-3 pt-1 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2.5 text-[14px] transition ${
                  isActive(item.href) ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* The classification has no room in a phone's header bar, and dropping it
          on small screens would mean the one line that governs what may be
          typed is missing from the device most likely to be used casually. */}
      {classification && (
        <div className="border-b border-amber-300/60 bg-amber-50 lg:hidden">
          <p className="mx-auto flex w-full max-w-6xl items-start gap-2 px-4 py-1.5 text-[11.5px] leading-relaxed text-amber-900 sm:px-6">
            <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            {classification}
          </p>
        </div>
      )}

      {showing.length > 0 && <BroadcastStrip items={showing} />}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4 text-[11px] text-ink40 sm:px-6">
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
