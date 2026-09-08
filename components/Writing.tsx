'use client';

import { useEffect, useState } from 'react';
import { Mark } from './Logo';

/**
 * What the twenty seconds look like.
 *
 * A spinner says "something is happening"; it does not say the machine has not
 * hung, and after fifteen seconds in a silent room it starts to look like it
 * has. So this says what is being done, shows the elapsed time, and says the
 * quiet part out loud once it goes long — which turns a worrying pause into an
 * expected one.
 *
 * It is a quill writing because that is what the product is doing and what its
 * mark already is. The rhythm is the part worth caring about: the keyframes in
 * globals.css move in bursts with a beat at the end of each word and a longer
 * one at the end of a line, because a steady sweep reads as a progress bar
 * wearing a costume. The nib rides the same path the ink is laid on, so it is
 * always at the wet end of the stroke.
 *
 * It covers the screen. There is nothing else to do while a document is being
 * written, and a modal that says so is more honest than a page that looks
 * available and is not.
 */
const STAGES = [
  { at: 0, text: 'Reading what you wrote' },
  { at: 4, text: 'Working out what belongs where' },
  { at: 9, text: 'Writing the content' },
  { at: 16, text: 'Still writing — longer inputs take longer' },
  { at: 30, text: 'Almost there. Nothing is lost if this fails' },
];

/** Three lines of handwriting. The third is short, the way a last line is. */
const LINES = [
  'M10 20 C 26 8, 38 30, 54 18 S 84 4, 100 18 S 130 30, 146 16 S 178 6, 194 20 S 216 26, 230 16',
  'M10 44 C 28 34, 40 56, 58 44 S 88 30, 104 44 S 134 56, 150 42 S 182 32, 198 46 S 214 50, 224 42',
  'M10 66 C 26 58, 38 76, 56 64 S 86 52, 102 66 S 126 74, 140 64',
];

/** One cycle for the whole page. Each line has its slice of it. */
const DURATION = 4.4;

export function Writing({ what }: { what: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 200);
    return () => window.clearInterval(timer);
  }, []);

  // The page it is written on must not scroll away underneath the overlay.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const stage = [...STAGES].reverse().find((s) => seconds >= s.at) ?? STAGES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-paper px-6 py-7 shadow-lift">
        <div className="flex items-center gap-2.5">
          <Mark className="h-5 w-5 text-accent" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink40">
            {what}
          </p>
        </div>

        <svg
          viewBox="0 0 240 84"
          className="virtus-writing mt-4 w-full"
          role="img"
          aria-label="Writing"
        >
          {/* The ruled page. Faint, because it is the paper and not the point. */}
          {[20, 44, 66].map((y) => (
            <line
              key={y}
              x1="10"
              x2="230"
              y1={y + 7}
              y2={y + 7}
              className="stroke-lineSoft"
              strokeWidth="1"
            />
          ))}

          {LINES.map((d, i) => (
            <path
              key={`ink-${i}`}
              d={d}
              fill="none"
              className="stroke-ink80"
              strokeWidth="2.2"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{ animation: `virtus-ink-${i + 1} ${DURATION}s linear infinite` }}
            />
          ))}

          {/* One nib per line, each visible only while its line is being laid.
              Following the path itself rather than sliding across the box is
              what produces the small rise and fall a hand actually makes. */}
          {LINES.map((d, i) => (
            <g
              key={`nib-${i}`}
              data-nib=""
              style={{
                offsetPath: `path('${d}')`,
                offsetRotate: '0deg',
                animation: `virtus-nib-${i + 1} ${DURATION}s linear infinite`,
                opacity: 0,
              }}
            >
              <g transform="translate(-1 -13) scale(0.34)">
                <path
                  d="M56 6 L44 21 L52 22 L38 35 L46 36 L31 48 L40 49 L23 58 L6 60 L13 43 L28 29 L42 16 Z"
                  className="fill-accent"
                />
              </g>
            </g>
          ))}
        </svg>

        <p className="mt-4 text-[13.5px] text-ink">{stage.text}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              // Approaches full without reaching it: an honest progress bar for
              // something whose duration is not known in advance.
              style={{ width: `${Math.min(96, 8 + (1 - Math.exp(-seconds / 9)) * 88)}%` }}
            />
          </div>
          <span className="shrink-0 text-[12px] tabular-nums text-ink40">{seconds.toFixed(1)}s</span>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink40">
          Nothing is produced yet. The next screen is where you review it and have any section
          written again.
        </p>
      </div>
    </div>
  );
}
