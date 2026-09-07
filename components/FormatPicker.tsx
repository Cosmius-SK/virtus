'use client';

import { useMemo, useState } from 'react';

export interface FormatSummary {
  id: string;
  name: string;
  description: string;
}

/**
 * What to make.
 *
 * A searchable list rather than a dropdown, because by the twentieth format a
 * dropdown is a scroll and a guess. Typing "incident" should find the
 * postmortem whether or not that is the word this person calls it.
 */
export function FormatPicker({
  formats,
  onPick,
  disabled,
  busyId,
}: {
  formats: FormatSummary[];
  onPick: (id: string) => void;
  disabled: boolean;
  busyId: string | null;
}) {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return formats;
    return formats.filter((f) => `${f.name} ${f.description}`.toLowerCase().includes(q));
  }, [formats, query]);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="text-[11px] uppercase tracking-wide text-ink/40">
          What should it become?
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-40 rounded border border-rule bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((format) => (
          <button
            key={format.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(format.id)}
            className="group rounded-lg border border-rule bg-white px-3.5 py-3 text-left transition hover:border-accent hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="block text-sm font-medium text-ink group-hover:text-accent">
              {busyId === format.id ? 'Reading your note…' : format.name}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-ink/50">
              {format.description}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-sm text-ink/45">
          Nothing matches “{query}”. Virtus makes {formats.length} kinds of document so far.
        </p>
      )}
    </div>
  );
}
