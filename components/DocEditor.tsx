'use client';

import { useState } from 'react';
import { STATUS_NAMES } from '@/lib/deck/status';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';

/**
 * One editing screen for every format, driven by the format's own definition.
 *
 * Same principle as the outline editor (§6, §8.2): the person fixes fields, not
 * a rendered slide. Correcting a laid-out table means fighting the table.
 *
 * Nothing here helps an empty field along. A blank box is information.
 *
 * Each section carries its own rewrite, and the document carries one for all of
 * it. The section one is the one to reach for: rule 2 says never regenerate a
 * whole artefact to fix one part of it, and a whole-document rewrite throws
 * away every correction already made in order to sharpen one paragraph. Both
 * rewrite from the original input, so pressing either repeatedly gets different
 * sentences and never new facts.
 */
export function DocEditor({
  format,
  doc,
  onChange,
  onRender,
  onRewriteSection,
  onRewriteAll,
  rewriting,
  busy,
  onBack,
}: {
  format: FormatDef;
  doc: FormatDoc;
  onChange: (next: FormatDoc) => void;
  onRender: (as: 'pptx' | 'docx' | 'pdf') => void;
  onRewriteSection: (sectionId: string, instruction: string) => void;
  onRewriteAll: (instruction: string) => void;
  /** Section id being rewritten, 'all' for the document, or null. */
  rewriting: string | null;
  busy: boolean;
  onBack: () => void;
}) {
  const setSection = (id: string, value: FormatDoc['sections'][string]) =>
    onChange({ ...doc, sections: { ...doc.sections, [id]: value } });

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-9">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 text-[12px] text-ink40 transition hover:text-accent"
      >
        ← Back
      </button>

      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentDark">{format.name}</p>
      <input
        value={doc.title}
        aria-label="Title"
        onChange={(e) => onChange({ ...doc, title: e.target.value })}
        className="mt-1 w-full bg-transparent text-[24px] font-semibold tracking-tight text-ink outline-none"
      />
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink60">
        Review and correct the content. Edit anything directly, or use{' '}
        <Star className="mx-0.5 inline h-3 w-3 -translate-y-px text-accent" /> to have a section
        rewritten. Nothing is produced until you choose an output, and a field left blank stays
        blank.
      </p>

      {doc.reconcile.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-amber-800/70">
            Review before issuing
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
            {doc.reconcile.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800/60">Visible to you only. None of this appears in the document.</p>
        </div>
      )}

      {format.status && (
        <Block label="Status">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ ...doc, status: name })}
                className={`rounded border px-2.5 py-1 text-xs transition ${
                  doc.status === name
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-paper text-ink60 hover:border-accent hover:text-accent'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </Block>
      )}

      {format.sections.map((section) => (
        <Block
          key={section.id}
          label={labelFor(section)}
          section={section}
          busy={busy}
          rewriting={rewriting === section.id}
          onRewrite={(instruction) => onRewriteSection(section.id, instruction)}
        >
          <Control section={section} value={doc.sections[section.id]} onChange={setSection} />
        </Block>
      ))}

      <RewriteAll busy={busy} rewriting={rewriting === 'all'} onRewrite={onRewriteAll} />

      <div className="mt-6 flex items-center justify-end gap-2">
        {format.outputs.map((out, i) => (
          <button
            key={out}
            type="button"
            disabled={busy}
            onClick={() => onRender(out)}
            className={
              i === 0
                ? 'rounded bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40'
                : 'rounded border border-line bg-paper px-4 py-2.5 text-[13px] font-medium text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40'
            }
          >
            {out === 'pptx' ? 'Download slides' : out === 'docx' ? 'Download Word' : 'Download PDF'}
          </button>
        ))}
      </div>
    </section>
  );
}

function labelFor(section: Section): string {
  return section.kind === 'list' ? `${section.label} — one per line` : section.label;
}

/** The controls, unchanged by the rewrite work: the person still edits fields. */
function Control({
  section,
  value,
  onChange,
}: {
  section: Section;
  value: FormatDoc['sections'][string];
  onChange: (id: string, value: FormatDoc['sections'][string]) => void;
}) {
  if (section.kind === 'fields') {
    const values = (value ?? {}) as Record<string, string>;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(section.fields ?? []).map((field) => (
          <label key={field.id} className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
              {field.label}
            </span>
            <input
              value={values[field.id] ?? ''}
              onChange={(e) => onChange(section.id, { ...values, [field.id]: e.target.value })}
              className="w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
        ))}
      </div>
    );
  }

  if (section.kind === 'paragraph') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        aria-label={section.label}
        onChange={(e) => onChange(section.id, e.target.value)}
        rows={3}
        className="w-full resize-none rounded border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    );
  }

  if (section.kind === 'list') {
    const items = Array.isArray(value) ? (value as string[]) : [];
    return (
      <>
        <textarea
          value={items.join('\n')}
          aria-label={section.label}
          onChange={(e) =>
            onChange(section.id, e.target.value.split('\n').filter((l) => l.trim()))
          }
          rows={Math.max(3, items.length + 1)}
          className="w-full resize-none rounded border border-line px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        {section.max && items.length > section.max && (
          <span className="mt-1 block text-xs text-ink40">
            The document shows the first {section.max}.
          </span>
        )}
      </>
    );
  }

  const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
  const columns = section.columns ?? [];
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="rounded border border-line bg-white p-3">
          <div className="flex items-start gap-2">
            <input
              value={row[columns[0].id] ?? ''}
              onChange={(e) =>
                onChange(
                  section.id,
                  rows.map((r, at) => (at === i ? { ...r, [columns[0].id]: e.target.value } : r)),
                )
              }
              placeholder={columns[0].label}
              className="flex-1 bg-transparent text-sm text-ink outline-none"
            />
            <button
              type="button"
              aria-label="Remove this row"
              onClick={() => onChange(section.id, rows.filter((_, at) => at !== i))}
              className="text-ink40 transition hover:text-ink"
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
                  onChange(
                    section.id,
                    rows.map((r, at) => (at === i ? { ...r, [column.id]: e.target.value } : r)),
                  )
                }
                placeholder={column.label}
                className="rounded border border-line px-2 py-1 text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange(section.id, [...rows, Object.fromEntries(columns.map((c) => [c.id, '']))])
        }
        className="text-xs text-ink40 hover:text-accent"
      >
        + Add a row
      </button>
      {section.max && rows.length > section.max && (
        <p className="text-xs text-ink40">The document shows the first {section.max}.</p>
      )}
    </div>
  );
}

/**
 * A labelled block, with the rewrite control where the label is.
 *
 * A div rather than a label element: a button inside a label steals its own
 * click to focus the field beside it.
 */
function Block({
  label,
  children,
  section,
  busy,
  rewriting,
  onRewrite,
}: {
  label: string;
  children: React.ReactNode;
  section?: Section;
  busy?: boolean;
  rewriting?: boolean;
  onRewrite?: (instruction: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [instruction, setInstruction] = useState('');

  function go() {
    onRewrite?.(instruction);
    setInstruction('');
    setAsking(false);
  }

  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          {label}
        </span>
        {section && onRewrite && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsking((v) => !v)}
            title={`Rewrite ${section.label}`}
            aria-label={`Rewrite ${section.label}`}
            className="shrink-0 rounded p-1 text-ink40 transition hover:bg-accentTint hover:text-accent disabled:opacity-30"
          >
            <Star className={`h-3.5 w-3.5 ${rewriting ? 'animate-pulse text-accent' : ''}`} />
          </button>
        )}
      </div>

      {asking && (
        <div className="mb-2 rounded border border-accent/30 bg-accentTint px-3 py-2.5">
          <input
            value={instruction}
            autoFocus
            disabled={busy}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') go();
              if (e.key === 'Escape') setAsking(false);
            }}
            placeholder="What should change? Leave blank for another attempt."
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink40"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={go}
              className="rounded bg-accent px-3 py-1 text-[12px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Rewrite
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="text-[12px] text-ink60 transition hover:text-ink"
            >
              Cancel
            </button>
            <span className="text-[11px] text-ink40">
              Only this section changes. It cannot add anything your input did not say.
            </span>
          </div>
        </div>
      )}

      <div className={rewriting ? 'pointer-events-none opacity-40' : undefined}>{children}</div>
    </div>
  );
}

/** The whole document, when the first pass missed the point rather than a word. */
function RewriteAll({
  busy,
  rewriting,
  onRewrite,
}: {
  busy: boolean;
  rewriting: boolean;
  onRewrite: (instruction: string) => void;
}) {
  const [instruction, setInstruction] = useState('');
  return (
    <div className="mt-8 rounded-lg border border-line bg-paper px-4 py-3.5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Star className="h-4 w-4 shrink-0 text-accent" />
        <input
          value={instruction}
          disabled={busy}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRewrite(instruction);
              setInstruction('');
            }
          }}
          placeholder="Rewrite the whole document — say what to change, or leave blank"
          className="min-w-[220px] flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink40"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onRewrite(instruction);
            setInstruction('');
          }}
          className="shrink-0 rounded border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {rewriting ? 'Rewriting…' : 'Rewrite all'}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink40">
        This replaces every section, including any you have corrected. To change one part, use the
        star beside it.
      </p>
    </div>
  );
}

/** The four-point mark for anything the model does. One shape, used everywhere. */
export function Star({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 1.5c.7 4.6 2.2 7.4 4.4 8.8 1.2.8 3.1 1.3 5.6 1.7-2.5.4-4.4.9-5.6 1.7-2.2 1.4-3.7 4.2-4.4 8.8-.7-4.6-2.2-7.4-4.4-8.8-1.2-.8-3.1-1.3-5.6-1.7 2.5-.4 4.4-.9 5.6-1.7C9.8 8.9 11.3 6.1 12 1.5Z" />
    </svg>
  );
}
