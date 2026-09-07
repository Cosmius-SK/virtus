'use client';

import { useEffect, useState } from 'react';

/**
 * What the twenty seconds look like.
 *
 * A spinner says "something is happening"; it does not say the machine has not
 * hung, and after fifteen seconds in a silent room it starts to look like it
 * has. So this shows the elapsed time and what is being done, and says the
 * quiet part out loud once it goes long — which turns a worrying pause into an
 * expected one.
 */
const STAGES = [
  { at: 0, text: 'Reading your input' },
  { at: 4, text: 'Extracting the detail' },
  { at: 9, text: 'Populating the template' },
  { at: 16, text: 'Still working — longer inputs take longer' },
  { at: 30, text: 'Almost there. Nothing is lost if this fails' },
];

export function Working({ what }: { what: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 200);
    return () => window.clearInterval(timer);
  }, []);

  const stage = [...STAGES].reverse().find((s) => seconds >= s.at) ?? STAGES[0];

  return (
    <div className="rounded-lg border border-line bg-paper px-5 py-4 shadow-card" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <p className="flex-1 text-[13px] text-ink">
          {stage.text} — <span className="text-ink40">{what}</span>
        </p>
        <span className="text-[12px] tabular-nums text-ink40">{seconds.toFixed(1)}s</span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/60">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
          // Approaches full without reaching it: an honest progress bar for
          // something whose duration is not known in advance.
          style={{ width: `${Math.min(96, 8 + (1 - Math.exp(-seconds / 9)) * 88)}%` }}
        />
      </div>
    </div>
  );
}
