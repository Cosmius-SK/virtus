'use client';

import { useMemo, useState } from 'react';
import { TemplatePreview } from './TemplatePreview';
import { CATEGORIES, type Category, type FormatDef } from '@/lib/formats/types';

/**
 * The template store.
 *
 * Every template shows what it produces before it is chosen. Choosing a
 * document format from a list of names is guesswork, and guesswork at this step
 * costs a full generation to correct.
 */
const ORDER: readonly Category[] = CATEGORIES;

const OUTPUT_LABEL: Record<string, string> = {
  pptx: 'Slides',
  docx: 'Word',
  pdf: 'PDF',
};

export function TemplateStore({
  formats,
  onSelect,
  disabled,
  busyId,
}: {
  /** Everything available on this device: what ships, plus what was built here. */
  formats: FormatDef[];
  onSelect: (format: FormatDef) => void;
  disabled: boolean;
  busyId: string | null;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return formats.filter(
      (f) =>
        (category === 'All' || f.category === category) &&
        (!q || `${f.name} ${f.description} ${f.audience}`.toLowerCase().includes(q)),
    );
  }, [formats, query, category]);

  const grouped = ORDER.map((c) => [c, shown.filter((f) => f.category === c)] as const).filter(
    ([, list]) => list.length > 0,
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(['All', ...ORDER] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded border px-3 py-1.5 text-[13px] transition ${
                category === c
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-paper text-ink60 hover:border-ink40 hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates"
          className="ml-auto w-52 rounded border border-line bg-paper px-3 py-1.5 text-[13px] text-ink outline-none transition placeholder:text-ink40 focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </div>

      {grouped.map(([group, list]) => (
        <section key={group} className="mb-8">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink40">
            {group}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((format) => (
              <button
                key={format.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(format)}
                className="group flex flex-col overflow-hidden rounded-lg border border-line bg-paper text-left shadow-card transition hover:-translate-y-px hover:border-accent hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <div className="border-b border-line bg-canvas p-2.5">
                  <div className="aspect-[16/9] overflow-hidden rounded border border-line bg-white">
                    <TemplatePreview format={format} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <span className="text-[14px] font-medium text-ink group-hover:text-accent">
                    {busyId === format.id ? 'Reading your input…' : format.name}
                  </span>
                  <span className="mt-1 flex-1 text-[12px] leading-snug text-ink60">
                    {format.description}
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-1">
                    {format.layout === 'pack' && (
                      <span className="rounded border border-accent/30 bg-accentTint px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accentDark">
                        Multi-slide
                      </span>
                    )}
                    {format.outputs.map((o) => (
                      <span
                        key={o}
                        className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink40"
                      >
                        {OUTPUT_LABEL[o]}
                      </span>
                    ))}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-line bg-paper px-4 py-10 text-center text-[13px] text-ink40">
          No template matches “{query}”. Try Free-form instead — it will pick the closest one and
          tell you where it does not fit.
        </p>
      )}
    </div>
  );
}
