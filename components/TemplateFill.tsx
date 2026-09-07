'use client';

import { useMemo, useState } from 'react';
import { TemplatePreview } from './TemplatePreview';
import type { FormatDef, Section } from '@/lib/formats/types';

/**
 * The template, opened as boxes.
 *
 * An empty page asking for "what happened" is the hardest question in the
 * product: people know what happened and do not know how much of it to say. The
 * template already knows — it has a section for each thing it needs and a hint
 * saying what belongs there — so it is laid out as it will be produced and each
 * part is asked for where it will appear.
 *
 * The boxes are for rough notes, not finished prose. Whatever is typed here is
 * still read by the structure pass, so half sentences are fine and blanks are
 * fine. A blank stays blank: nothing here fills a section in from the others.
 *
 * The layout follows the definition — a `beside` pair sits side by side, a
 * `fields` row across the top — so the shape someone chose in the store is the
 * shape they are typing into.
 */
export interface Filled {
  /** Per section id. Rough notes, in the person's own words. */
  parts: Record<string, string>;
  /** Anything that did not fit a box. Context, not a section. */
  extra: string;
}

/** Group the sections the way the renderers do, so the form matches the output. */
function rows(sections: Section[]): Section[][] {
  const out: Section[][] = [];
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].beside && sections[i + 1]) out.push([sections[i], sections[i++ + 1]]);
    else out.push([sections[i]]);
  }
  return out;
}

/** How much was said, so the button can say whether it is worth pressing. */
function said(filled: Filled): number {
  return (
    Object.values(filled.parts).reduce((n, v) => n + v.trim().length, 0) + filled.extra.trim().length
  );
}

/**
 * The boxes, stitched into one note under the section headings.
 *
 * Assembled here rather than on the server because the server takes a note and
 * must keep taking a note: the endpoint is the thing an MCP plugin will call
 * without any of this screen (§7), and a caller that has one note should not
 * have to pretend it filled in a form.
 */
export function noteFrom(format: FormatDef, filled: Filled): string {
  const blocks = format.sections
    .filter((section) => filled.parts[section.id]?.trim())
    .map((section) => `## ${section.label}\n${filled.parts[section.id].trim()}`);
  if (filled.extra.trim()) blocks.push(`## Other background\n${filled.extra.trim()}`);
  return blocks.join('\n\n');
}

export function TemplateFill({
  format,
  filled,
  onChange,
  onGenerate,
  onBack,
  busy,
}: {
  format: FormatDef;
  filled: Filled;
  onChange: (next: Filled) => void;
  onGenerate: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const [showHints, setShowHints] = useState(true);
  const laid = useMemo(() => rows(format.sections), [format.sections]);
  const enough = said(filled) >= 20;

  const setPart = (id: string, text: string) =>
    onChange({ ...filled, parts: { ...filled.parts, [id]: text } });

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-9">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 text-[12px] text-ink40 transition hover:text-accent"
      >
        ← All templates
      </button>

      <div className="flex flex-wrap items-start gap-5">
        <div className="h-[90px] w-40 shrink-0 overflow-hidden rounded border border-line bg-white shadow-card">
          <TemplatePreview format={format} />
        </div>
        <div className="min-w-[260px] flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentDark">
            {format.category}
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-ink">{format.name}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink60">
            {format.description} Read by {format.audience}.
          </p>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between border-b border-line pb-2.5">
        <p className="text-[13px] text-ink60">
          Put what you know into the section it belongs to. Rough notes are expected — leave
          anything you do not have.
        </p>
        <button
          type="button"
          onClick={() => setShowHints((v) => !v)}
          className="shrink-0 text-[12px] text-ink40 transition hover:text-accent"
        >
          {showHints ? 'Hide guidance' : 'Show guidance'}
        </button>
      </div>

      {laid.map((row, i) => (
        <div key={i} className={row.length === 2 ? 'mt-5 grid gap-4 sm:grid-cols-2' : 'mt-5'}>
          {row.map((section) => (
            <Box
              key={section.id}
              section={section}
              value={filled.parts[section.id] ?? ''}
              onChange={(text) => setPart(section.id, text)}
              showHint={showHints}
              narrow={row.length === 2}
              disabled={busy}
            />
          ))}
        </div>
      ))}

      <div className="mt-5 pb-2">
        <label className="block">
          <span className="block text-[12px] font-semibold text-ink80">Anything else</span>
          {showHints && (
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink40">
              Context that does not belong to one section. It informs the writing; it does not
              become a section of its own.
            </span>
          )}
          <textarea
            value={filled.extra}
            disabled={busy}
            onChange={(e) => onChange({ ...filled, extra: e.target.value })}
            rows={2}
            className="mt-1.5 w-full resize-y rounded border border-line bg-white px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink40 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
          />
        </label>
      </div>

      <div className="sticky bottom-0 mt-7 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line bg-canvas py-4">
        <p className="mr-auto text-[12px] text-ink40">
          {enough
            ? 'Virtus will read this and lay it out. You review before anything is produced.'
            : 'Fill in at least one section to continue.'}
        </p>
        <button
          type="button"
          disabled={busy || !enough}
          onClick={onGenerate}
          className="w-full shrink-0 rounded bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {busy ? 'Writing…' : 'Write the content'}
        </button>
      </div>
    </section>
  );
}

function Box({
  section,
  value,
  onChange,
  showHint,
  narrow,
  disabled,
}: {
  section: Section;
  value: string;
  onChange: (text: string) => void;
  showHint: boolean;
  narrow: boolean;
  disabled: boolean;
}) {
  // A section that gets more room in the document gets more room here, so the
  // box itself says roughly how much is expected of it.
  const rows = narrow ? 3 : Math.min(7, Math.max(2, Math.round(section.height * 2.2)));
  const parts =
    section.kind === 'table'
      ? (section.columns ?? []).map((c) => c.label)
      : section.kind === 'fields'
        ? (section.fields ?? []).map((f) => f.label)
        : [];

  return (
    <label className="block">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="text-[12px] font-semibold text-ink80">{section.label}</span>
        {parts.length > 0 && (
          <span className="text-[11px] text-ink40">{parts.join(' · ')}</span>
        )}
      </span>
      {showHint && (
        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink40">{section.hint}</span>
      )}
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 w-full resize-y rounded border border-line bg-white px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink40 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
      />
    </label>
  );
}
