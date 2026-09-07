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
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4" role="alert">
      <p className="text-sm text-red-900">{problem.message}</p>
      <p className="mt-1 text-xs text-red-800/60">Your note is still in the box — nothing was lost.</p>
      {problem.retry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 transition hover:border-red-400"
        >
          Try again
        </button>
      )}
    </div>
  );
}
