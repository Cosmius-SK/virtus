'use client';

import type { Friendly } from '@/lib/friendly';

/**
 * A failure, said in a sentence, with the way out next to it.
 *
 * Never the word "error", never a status code, never a stack. The note is
 * always still in the box behind this — saying so is most of the reassurance.
 */
export function Problem({ problem, onRetry }: { problem: Friendly; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 shadow-card" role="alert">
      <p className="text-[13px] text-red-900">{problem.message}</p>
      <p className="mt-1 text-[12px] text-red-800/70">Your input has been kept. Nothing was lost.</p>
      {problem.retry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-red-300 bg-white px-3 py-1.5 text-[12px] font-medium text-red-900 transition hover:border-red-400"
        >
          Try again
        </button>
      )}
    </div>
  );
}
