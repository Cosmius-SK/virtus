'use client';

import { useState } from 'react';
import type { Notice } from '@/lib/org/notice';
import { KINDS, type EntryKind } from '@/lib/org/types';

/**
 * The offer, made at the moment it explains itself (§3).
 *
 * Never a setup wizard, never a page nobody visits. It appears under a finished
 * document, naming things the person just wrote about that Virtus does not
 * know, so the reason to bother is the document they are looking at.
 */
export function TeachIt({
  notices,
  onTeach,
  onDismiss,
}: {
  notices: Notice[];
  onTeach: (name: string, kind: EntryKind) => Promise<void>;
  onDismiss: (name: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!notices.length) return null;

  return (
    <div className="mt-6 rounded-lg border border-rule bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink/40">
        You mentioned these and Virtus does not know them
      </p>
      <p className="mt-1 text-xs text-ink/50">
        Tell it once and it will spell them right, and know who they are, in everything after this.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {notices.map((notice) => (
          <div key={notice.name} className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === notice.name ? null : notice.name)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                open === notice.name
                  ? 'border-accent bg-accent text-white'
                  : 'border-rule text-ink/70 hover:border-accent hover:text-accent'
              }`}
            >
              {notice.name}
              {notice.times > 1 && <span className="ml-1 opacity-50">×{notice.times}</span>}
            </button>

            {open === notice.name && (
              <div className="absolute left-0 top-full z-10 mt-1.5 w-48 rounded-lg border border-rule bg-white p-2 shadow-lg">
                <p className="px-1 pb-1 text-[10px] uppercase tracking-wide text-ink/40">
                  What is it?
                </p>
                {KINDS.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={async () => {
                      await onTeach(notice.name, kind.id);
                      setOpen(null);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-ink/80 transition hover:bg-accentSoft hover:text-accent"
                  >
                    {kind.label.replace(/s$/, '')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onDismiss(notice.name);
                    setOpen(null);
                  }}
                  className="mt-1 block w-full rounded px-2 py-1 text-left text-xs text-ink/40 transition hover:bg-rule/40"
                >
                  Not a name
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
