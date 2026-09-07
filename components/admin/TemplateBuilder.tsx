'use client';

import { useState } from 'react';
import { TemplatePreview } from '../TemplatePreview';
import { FormatDefSchema } from '@/lib/formats/def-schema';
import {
  CATEGORIES,
  type Category,
  type Column,
  type FormatDef,
  type Layout,
  type Output,
  type Section,
  type SectionKind,
} from '@/lib/formats/types';

/**
 * Building a template, which is the same job as adding one to the registry —
 * only done by someone who cannot open the registry.
 *
 * The thing that makes this a small screen rather than a large one is that a
 * format was already data (§5). There is no renderer to write, no prompt to
 * write and no schema to write: a section list is all of those, so this screen
 * edits a section list and everything else follows. That decision was made on
 * day two for a different reason and this is what it bought.
 *
 * Ids are never shown. They matter to the engine and to nobody using it, so
 * they are derived from the label once, when a section is made, and then left
 * alone — renaming a section afterwards must not silently orphan the content
 * already written against it.
 *
 * The preview is the same component the store uses, drawn from the definition
 * being edited. Somebody building a template sees exactly what somebody
 * choosing it will see, as they type.
 */
const KINDS: { id: SectionKind; label: string; hint: string }[] = [
  { id: 'paragraph', label: 'Paragraph', hint: 'One block of prose. A summary, a decision.' },
  { id: 'list', label: 'List', hint: 'Bullets. The workhorse.' },
  { id: 'table', label: 'Table', hint: 'Rows and columns. Risks with owners, actions with dates.' },
  { id: 'fields', label: 'Fields', hint: 'A row of labelled values across the top.' },
];

const OUTPUTS: { id: Output; label: string }[] = [
  { id: 'pptx', label: 'Slides' },
  { id: 'docx', label: 'Word' },
  { id: 'pdf', label: 'PDF' },
];

function slug(text: string, taken: string[] = []): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'section';
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) if (!taken.includes(`${base}-${n}`)) return `${base}-${n}`;
}

export function blankTemplate(): FormatDef {
  return {
    id: '',
    name: '',
    description: '',
    audience: '',
    category: 'Project & delivery',
    status: false,
    outputs: ['pptx', 'docx', 'pdf'],
    layout: 'one-pager',
    sections: [
      {
        id: 'summary',
        label: 'Summary',
        kind: 'paragraph',
        hint: 'Two or three sentences. The position, not the activity.',
        height: 0.8,
      },
    ],
  };
}

export function TemplateBuilder({
  def,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  def: FormatDef;
  onChange: (next: FormatDef) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [openSection, setOpenSection] = useState<string | null>(def.sections[0]?.id ?? null);

  // Validated as it is typed rather than on save, so the reason a template
  // cannot be saved is visible next to the thing that is wrong.
  const check = FormatDefSchema.safeParse({ ...def, id: def.id || slug(def.name || 'x') });
  const problem = check.success ? null : check.error.issues[0];

  const set = (part: Partial<FormatDef>) => onChange({ ...def, ...part });

  const setSection = (id: string, part: Partial<Section>) =>
    set({ sections: def.sections.map((s) => (s.id === id ? { ...s, ...part } : s)) });

  function addSection() {
    const id = slug('section', def.sections.map((s) => s.id));
    set({
      sections: [
        ...def.sections,
        { id, label: 'New section', kind: 'list', hint: '', height: 0.9 },
      ],
    });
    setOpenSection(id);
  }

  function move(id: string, by: number) {
    const at = def.sections.findIndex((s) => s.id === id);
    const to = at + by;
    if (at < 0 || to < 0 || to >= def.sections.length) return;
    const next = [...def.sections];
    [next[at], next[to]] = [next[to], next[at]];
    set({ sections: next });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="rounded-lg border border-line bg-paper p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              label="Name"
              hint="What people will look for in the store."
              value={def.name}
              onChange={(name) =>
                set({ name, id: def.id || slug(name) })
              }
            />
            <Select
              label="Category"
              hint="Which shelf it sits on."
              value={def.category}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(category) => set({ category: category as Category })}
            />
          </div>
          <Text
            label="Description"
            hint="One line, in the words somebody would search for."
            value={def.description}
            onChange={(description) => set({ description })}
          />
          <Text
            label="Who reads it"
            hint="Steers how blunt the writing is. 'A director who reads nothing else about this project all week' does more work than 'stakeholders'."
            value={def.audience}
            onChange={(audience) => set({ audience })}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                Produces
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {OUTPUTS.map((out) => {
                  const on = def.outputs.includes(out.id);
                  return (
                    <button
                      key={out.id}
                      type="button"
                      onClick={() =>
                        set({
                          outputs: on
                            ? (def.outputs.filter((o) => o !== out.id) as Output[])
                            : ([...def.outputs, out.id] as Output[]),
                        })
                      }
                      className={`rounded border px-2.5 py-1 text-xs transition ${
                        on
                          ? 'border-accent bg-accent text-white'
                          : 'border-line text-ink60 hover:border-accent'
                      }`}
                    >
                      {out.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                Shape
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(
                  [
                    ['one-pager', 'One page'],
                    ['pack', 'A slide per section'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set({ layout: id as Layout })}
                    className={`rounded border px-2.5 py-1 text-xs transition ${
                      (def.layout ?? 'one-pager') === id
                        ? 'border-accent bg-accent text-white'
                        : 'border-line text-ink60 hover:border-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
              Banner row
            </p>
            <button
              type="button"
              onClick={() => set({ status: !def.status })}
              className={`mt-1.5 rounded border px-2.5 py-1 text-xs transition ${
                def.status
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-ink60 hover:border-accent'
              }`}
            >
              {def.status ? 'Carries a status chip' : 'No status chip'}
            </button>
            <p className="mt-1 text-[12px] leading-relaxed text-ink40">
              On Track, At Risk, Delayed and the rest, chosen by the author before the document is
              produced. Right for anything reported on a cycle; wrong for anything that is a record
              of one event.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">Sections</p>
          <button
            type="button"
            onClick={addSection}
            className="text-[12px] text-ink60 transition hover:text-accent"
          >
            + Add a section
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {def.sections.map((section, i) => (
            <div key={section.id} className="rounded-lg border border-line bg-paper shadow-card">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {section.label || 'Untitled'}
                  </span>
                  <span className="block truncate text-[11px] text-ink40">
                    {KINDS.find((k) => k.id === section.kind)?.label}
                    {section.beside ? ' · beside the next one' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(section.id, -1)}
                  className="px-1 text-ink40 transition hover:text-accent disabled:opacity-20"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === def.sections.length - 1}
                  onClick={() => move(section.id, 1)}
                  className="px-1 text-ink40 transition hover:text-accent disabled:opacity-20"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove this section"
                  disabled={def.sections.length === 1}
                  onClick={() => set({ sections: def.sections.filter((s) => s.id !== section.id) })}
                  className="px-1 text-ink40 transition hover:text-ink disabled:opacity-20"
                >
                  ×
                </button>
              </div>

              {openSection === section.id && (
                <div className="border-t border-lineSoft px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Text
                      label="Heading"
                      value={section.label}
                      onChange={(label) => setSection(section.id, { label })}
                    />
                    <Select
                      label="Holds"
                      value={section.kind}
                      options={KINDS.map((k) => ({ value: k.id, label: k.label }))}
                      onChange={(kind) =>
                        setSection(section.id, {
                          kind: kind as SectionKind,
                          columns:
                            kind === 'table'
                              ? (section.columns ?? [blankColumn('Item'), blankColumn('Owner')])
                              : undefined,
                          fields:
                            kind === 'fields'
                              ? (section.fields ?? [blankColumn('Project'), blankColumn('Period')])
                              : undefined,
                        })
                      }
                    />
                  </div>
                  <Text
                    label="Guidance"
                    hint="Told to the model. This is where the care goes — say what belongs here and what does not. 'A criterion nobody could fail is not a criterion' does more than any amount of prompt engineering elsewhere."
                    value={section.hint}
                    onChange={(hint) => setSection(section.id, { hint })}
                    rows={2}
                  />

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                        Room
                      </span>
                      <input
                        type="range"
                        min={0.4}
                        max={2.4}
                        step={0.1}
                        value={section.height}
                        onChange={(e) =>
                          setSection(section.id, { height: Number(e.target.value) })
                        }
                        className="w-40 accent-accent"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setSection(section.id, { beside: !section.beside })}
                      className={`rounded border px-2.5 py-1 text-xs transition ${
                        section.beside
                          ? 'border-accent bg-accent text-white'
                          : 'border-line text-ink60 hover:border-accent'
                      }`}
                    >
                      Beside the next section
                    </button>
                    {(section.kind === 'list' || section.kind === 'table') && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                          Show at most
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={section.max ?? ''}
                          placeholder="all"
                          onChange={(e) =>
                            setSection(section.id, {
                              max: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-20 rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                        />
                      </label>
                    )}
                  </div>

                  {(section.kind === 'table' || section.kind === 'fields') && (
                    <Parts
                      what={section.kind === 'table' ? 'Columns' : 'Fields'}
                      parts={(section.kind === 'table' ? section.columns : section.fields) ?? []}
                      onChange={(parts) =>
                        setSection(
                          section.id,
                          section.kind === 'table' ? { columns: parts } : { fields: parts },
                        )
                      }
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={!!problem || saving}
            onClick={onSave}
            className="rounded bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save template'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] text-ink60 transition hover:text-ink"
          >
            Cancel
          </button>
          {problem && (
            <p className="text-[12px] text-red-700">
              {problem.path.length ? `${problem.path.join(' → ')}: ` : ''}
              {problem.message}
            </p>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          As it will appear
        </p>
        <div className="mt-2 h-[146px] overflow-hidden rounded border border-line bg-white shadow-card">
          <TemplatePreview format={def} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink40">
          The same preview the store shows, drawn from what you are editing. It is the shape, not
          the content — the content will be the reader&rsquo;s own.
        </p>
      </aside>
    </div>
  );
}

function blankColumn(label: string): Column {
  return { id: slug(label), label, hint: '', width: 1 };
}

function Parts({
  what,
  parts,
  onChange,
}: {
  what: string;
  parts: Column[];
  onChange: (parts: Column[]) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          {what}
        </span>
        <button
          type="button"
          disabled={parts.length >= 8}
          onClick={() =>
            onChange([...parts, { ...blankColumn(`Column ${parts.length + 1}`), id: slug(`col-${parts.length + 1}`, parts.map((p) => p.id)) }])
          }
          className="text-[12px] text-ink60 transition hover:text-accent disabled:opacity-30"
        >
          + Add
        </button>
      </div>
      <div className="mt-1.5 space-y-1.5">
        {parts.map((part, i) => (
          <div key={part.id} className="flex items-center gap-2">
            <input
              value={part.label}
              onChange={(e) =>
                onChange(parts.map((p, at) => (at === i ? { ...p, label: e.target.value } : p)))
              }
              placeholder="Heading"
              className="w-32 shrink-0 rounded border border-line px-2 py-1 text-xs text-ink outline-none focus:border-accent"
            />
            <input
              value={part.hint}
              onChange={(e) =>
                onChange(parts.map((p, at) => (at === i ? { ...p, hint: e.target.value } : p)))
              }
              placeholder="What belongs here"
              className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-xs text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              aria-label="Remove"
              disabled={parts.length === 1}
              onClick={() => onChange(parts.filter((_, at) => at !== i))}
              className="text-ink40 transition hover:text-ink disabled:opacity-20"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Text({
  label,
  hint,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink40">{hint}</span>}
      {rows ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full resize-y rounded border border-line px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      )}
    </label>
  );
}

function Select({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink40">{hint}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
