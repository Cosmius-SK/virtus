'use client';

import { STATUS_NAMES } from '@/lib/deck/master';
import type { FormatDef, FormatDoc } from '@/lib/formats/types';

/**
 * One editing screen for every format, driven by the format's own definition.
 *
 * Same principle as the outline editor (§6, §8.2): the person fixes fields, not
 * a rendered slide. Correcting a laid-out table means fighting the table.
 *
 * Nothing here helps an empty field along. A blank box is information.
 */
export function DocEditor({
  format,
  doc,
  onChange,
  onRender,
  busy,
  onBack,
}: {
  format: FormatDef;
  doc: FormatDoc;
  onChange: (next: FormatDoc) => void;
  onRender: () => void;
  busy: boolean;
  onBack: () => void;
}) {
  const setSection = (id: string, value: FormatDoc['sections'][string]) =>
    onChange({ ...doc, sections: { ...doc.sections, [id]: value } });

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs text-ink/45 underline-offset-2 hover:text-accent hover:underline"
      >
        ← back to the note
      </button>

      <p className="text-[11px] uppercase tracking-wide text-ink/40">{format.name}</p>
      <input
        value={doc.title}
        onChange={(e) => onChange({ ...doc, title: e.target.value })}
        className="mt-1 w-full bg-transparent text-2xl font-light tracking-tight text-ink outline-none"
      />
      <p className="mt-2 text-sm text-ink/60">
        Fix the facts here. Nothing is rendered until you say so — and an empty box stays empty.
      </p>

      {doc.reconcile.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-amber-800/70">
            Worth a look before you send this
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
            {doc.reconcile.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800/60">Only you see this. None of it goes on the slide.</p>
        </div>
      )}

      {format.status && (
        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ ...doc, status: name })}
                className={`rounded border px-2.5 py-1 text-xs transition ${
                  doc.status === name
                    ? 'border-accent bg-accent text-white'
                    : 'border-rule text-ink/60 hover:border-accent/50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </Field>
      )}

      {format.sections.map((section) => {
        const value = doc.sections[section.id];

        if (section.kind === 'fields') {
          const values = (value ?? {}) as Record<string, string>;
          return (
            <div key={section.id} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(section.fields ?? []).map((field) => (
                <label key={field.id} className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink/40">
                    {field.label}
                  </span>
                  <input
                    value={values[field.id] ?? ''}
                    onChange={(e) =>
                      setSection(section.id, { ...values, [field.id]: e.target.value })
                    }
                    className="w-full rounded border border-rule px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
                  />
                </label>
              ))}
            </div>
          );
        }

        if (section.kind === 'paragraph') {
          return (
            <Field key={section.id} label={section.label}>
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => setSection(section.id, e.target.value)}
                rows={3}
                className="w-full resize-none rounded border border-rule px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              />
            </Field>
          );
        }

        if (section.kind === 'list') {
          const items = Array.isArray(value) ? (value as string[]) : [];
          return (
            <Field key={section.id} label={`${section.label} — one per line`}>
              <textarea
                value={items.join('\n')}
                onChange={(e) =>
                  setSection(section.id, e.target.value.split('\n').filter((l) => l.trim()))
                }
                rows={Math.max(3, items.length + 1)}
                className="w-full resize-none rounded border border-rule px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent/60"
              />
              {section.max && items.length > section.max && (
                <span className="mt-1 block text-xs text-ink/40">
                  The slide shows the first {section.max}.
                </span>
              )}
            </Field>
          );
        }

        const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
        const columns = section.columns ?? [];
        return (
          <Field key={section.id} label={section.label}>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="rounded border border-rule bg-white p-3">
                  <div className="flex items-start gap-2">
                    <input
                      value={row[columns[0].id] ?? ''}
                      onChange={(e) =>
                        setSection(
                          section.id,
                          rows.map((r, at) =>
                            at === i ? { ...r, [columns[0].id]: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder={columns[0].label}
                      className="flex-1 bg-transparent text-sm text-ink outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Remove this row"
                      onClick={() => setSection(section.id, rows.filter((_, at) => at !== i))}
                      className="text-ink/30 transition hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {columns.slice(1).map((column) => (
                      <input
                        key={column.id}
                        value={row[column.id] ?? ''}
                        onChange={(e) =>
                          setSection(
                            section.id,
                            rows.map((r, at) => (at === i ? { ...r, [column.id]: e.target.value } : r)),
                          )
                        }
                        placeholder={column.label}
                        className="rounded border border-rule px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSection(section.id, [
                    ...rows,
                    Object.fromEntries(columns.map((c) => [c.id, ''])),
                  ])
                }
                className="text-xs text-ink/45 hover:text-accent"
              >
                + add a row
              </button>
              {section.max && rows.length > section.max && (
                <p className="text-xs text-ink/40">The slide shows the first {section.max}.</p>
              )}
            </div>
          </Field>
        );
      })}

      <div className="mt-8 flex items-center justify-end gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={onRender}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {busy ? 'Rendering…' : `Download the ${format.name.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink/40">{label}</span>
      {children}
    </label>
  );
}
