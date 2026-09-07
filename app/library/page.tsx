'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Artefact } from '@/lib/db';
import { useSettings } from '@/lib/admin/use';
import { findFormat, useFormats } from '@/lib/formats/all';
import { forget, recent, when } from '@/lib/library';

/**
 * Everything made on this device.
 *
 * Re-downloading rather than re-generating: the fields were approved once and
 * the model does not need asking twice. That is the cheap half of "choosing
 * terminates" (§8.2) — a decision already made should not be paid for again.
 */
export default function Library() {
  const { custom } = useFormats();
  const { settings } = useSettings();
  const [items, setItems] = useState<Artefact[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    void recent().then(setItems);
  }, []);
  useEffect(load, [load]);

  async function download(item: Artefact, as: 'pptx' | 'docx' | 'pdf') {
    setBusy(item.id);
    try {
      const url =
        item.kind === 'deck'
          ? '/api/deck'
          : as === 'docx'
            ? `/api/doc/format/${item.formatId}`
            : as === 'pdf'
              ? `/api/pdf/format/${item.formatId}`
              : `/api/deck/format/${item.formatId}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          item.kind === 'deck'
            ? { outline: item.outline, house: settings?.house }
            : {
                doc: item.doc,
                format: custom.find((f) => f.id === item.formatId),
                house: settings?.house,
              },
        ),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? `virtus.${as}`;
      a.click();
      URL.revokeObjectURL(href);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-9">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Documents</h1>
      <p className="mt-1.5 text-[14px] text-ink60">
        Everything produced on this device. Re-issue in any format without generating again.
      </p>

      {items === null && <p className="mt-8 text-sm text-ink40">Looking…</p>}

      {items?.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink40">
          No documents yet. Anything you produce will be listed here.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {items?.map((item) => {
          const format = item.formatId ? findFormat(item.formatId, custom) : undefined;
          const outputs = format?.outputs ?? ['pptx'];
          return (
            <li key={item.id} className="rounded-lg border border-line bg-paper px-4 py-3 shadow-card">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink40">
                    {format?.name ?? 'Deck'} · {when(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {outputs.map((out) => (
                    <button
                      key={out}
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => download(item, out)}
                      className="rounded border border-line px-2.5 py-1 text-[12px] text-ink60 transition hover:border-accent hover:text-accent disabled:opacity-40"
                    >
                      {out === 'pptx' ? 'Slide' : out === 'docx' ? 'Word' : 'PDF'}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={async () => {
                      await forget(item.id);
                      load();
                    }}
                    className="px-1 text-ink40 transition hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
