'use client';

import { useState, type CSSProperties } from 'react';
import { mostSevere, type Broadcast, type Tone } from '@/lib/admin/broadcast';

/**
 * The broadcast strip itself.
 *
 * One component, used by the application frame and by the preview in the admin
 * panel, for the same reason a template preview is drawn from the template's own
 * definition: a preview that is a second implementation is a preview that can
 * be wrong. Somebody about to put a notice in front of the whole firm should be
 * looking at the notice, not at something like it.
 *
 * Three things about the marquee are deliberate, and each is the failure it
 * prevents:
 *
 * - **Nothing is ever off the end.** The track is `overflow-hidden` and the
 *   messages run through it, so a strip can hold six without pushing the page
 *   wider than the phone. One row wider than the viewport is not a small bug
 *   here: the layout viewport stretches, every `sm:` breakpoint below is then
 *   measured against the wrong number, and the whole mobile layout stops firing.
 * - **It can be stopped.** Moving text somebody cannot pause is a barrier, not a
 *   flourish — and the one message a person most needs to re-read is the one
 *   that just went past. It pauses on hover, on keyboard focus, and on a button.
 * - **Reduced motion gets the messages, not a stump.** The animation is turned
 *   off in CSS and the same list wraps in place, so every message is still
 *   there. Switching off the movement must never be the thing that hides item
 *   six.
 *
 * The internal note is not passed to this component and has no prop. That is
 * the point of it: "Ops asked for this, ends when the migration does" is for
 * the admin, and a strip that could render it would eventually render it.
 */

const STRIP: Record<Tone, string> = {
  info: 'border-line bg-lineSoft text-ink80',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  alert: 'border-red-300 bg-red-50 text-red-900',
};

const ICON: Record<Tone, string> = {
  info: 'text-ink60',
  warn: 'text-amber-600',
  alert: 'text-red-600',
};

function Icon({ tone }: { tone: Tone }) {
  const common = { width: 13, height: 13, viewBox: '0 0 16 16', 'aria-hidden': true } as const;
  if (tone === 'warn') {
    return (
      <svg {...common} fill="currentColor" className={`shrink-0 ${ICON.warn}`}>
        <path d="M8 1.5 15 14H1L8 1.5Zm0 4a.8.8 0 0 0-.8.85l.25 3.4a.55.55 0 0 0 1.1 0l.25-3.4A.8.8 0 0 0 8 5.5Zm0 5.3a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Z" />
      </svg>
    );
  }
  if (tone === 'alert') {
    return (
      <svg {...common} fill="currentColor" className={`shrink-0 ${ICON.alert}`}>
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 3.4a.9.9 0 0 0-.9.96l.28 3.9a.62.62 0 0 0 1.24 0l.28-3.9A.9.9 0 0 0 8 3.4Zm0 7.3a.95.95 0 1 0 0 1.9.95.95 0 0 0 0-1.9Z" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="currentColor" className={`shrink-0 ${ICON.info}`}>
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 2.7a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM6.9 6.2h1.9c.3 0 .5.25.46.55l-.6 4.3h.74a.5.5 0 0 1 0 1H7.2a.47.47 0 0 1-.46-.55l.6-4.3h-.44a.5.5 0 0 1 0-1Z" />
    </svg>
  );
}

/**
 * How long one lap takes. Derived from the text, not fixed: a fixed duration
 * makes one long message crawl and six short ones blur. Roughly 58px a second,
 * which is a comfortable read, and never under twelve seconds so a single short
 * notice does not flick past.
 */
function lapSeconds(items: Broadcast[]): number {
  const chars = items.reduce((n, b) => n + b.text.trim().length, 0);
  return Math.max(12, Math.round((chars * 6.4 + items.length * 72) / 58));
}

function Run({ items, hidden }: { items: Broadcast[]; hidden?: boolean }) {
  return (
    <ul
      className="vm-run flex min-w-full shrink-0 list-none items-center gap-x-8 gap-y-1"
      aria-hidden={hidden || undefined}
    >
      {items.map((b) => (
        <li key={b.id} className="flex items-center gap-2 whitespace-nowrap">
          <Icon tone={b.tone} />
          <span>{b.text.trim()}</span>
        </li>
      ))}
    </ul>
  );
}

export function BroadcastStrip({ items, inset = false }: { items: Broadcast[]; inset?: boolean }) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  const tone = mostSevere(items);

  return (
    <div
      className={`border-b ${STRIP[tone]} ${inset ? 'rounded border' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-3 ${
          inset ? 'px-3 py-2' : 'mx-auto w-full max-w-6xl px-4 py-2 sm:px-6'
        }`}
      >
        <div className="vm-window min-w-0 flex-1 overflow-hidden text-[12.5px] leading-relaxed">
          <div
            className="vm-track flex w-max items-center gap-x-8"
            style={
              {
                '--vm-lap': `${lapSeconds(items)}s`,
                animationPlayState: paused ? 'paused' : undefined,
              } as CSSProperties
            }
          >
            <Run items={items} />
            {/* The second copy is what makes the loop seamless. It is announced
                to nobody: a screen reader reading every notice twice is worse
                than no marquee at all. */}
            <Run items={items} hidden />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="vm-hold shrink-0 rounded px-1.5 py-0.5 text-[11px] opacity-60 transition hover:opacity-100 focus:opacity-100"
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>
    </div>
  );
}
