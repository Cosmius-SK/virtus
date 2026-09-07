'use client';

import { useState } from 'react';
import { SHAPES, type Outline, type OutlineSlide, type Shape } from '@/lib/types';

/**
 * Show them the outline and let them edit it (§6.2).
 *
 * This is the step that makes the product trustworthy, and the reason it works
 * is biblio's hardest-won principle: choosing terminates, correcting does not
 * (§8.2). Reorder, cut, retitle, merge — all of it is choosing from structure.
 * Editing fourteen rendered slides is correcting, and it never ends.
 *
 * Which is also why there is no "regenerate the deck" button anywhere on this
 * screen. A second attempt at a whole artefact loses the parts that were right
 * along with the part that was wrong.
 */
export function OutlineEditor({
  outline,
  onChange,
  onRender,
  busy,
  onBack,
}: {
  outline: Outline;
  onChange: (next: Outline) => void;
  onRender: () => void;
  busy: boolean;
  onBack: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);

  function slides(next: OutlineSlide[]) {
    onChange({ ...outline, slides: next });
  }
  function patch(i: number, part: Partial<OutlineSlide>) {
    slides(outline.slides.map((s, at) => (at === i ? { ...s, ...part } : s)));
  }
  function move(i: number, by: number) {
    const to = i + by;
    if (to < 0 || to >= outline.slides.length) return;
    const next = [...outline.slides];
    [next[i], next[to]] = [next[to], next[i]];
    slides(next);
    setOpen(to);
  }
  function cut(i: number) {
    slides(outline.slides.filter((_, at) => at !== i));
    setOpen(null);
  }
  /** Merge into the slide above: its claim wins, the support joins. */
  function mergeUp(i: number) {
    if (i === 0) return;
    const next = [...outline.slides];
    next[i - 1] = {
      ...next[i - 1],
      support: [...next[i - 1].support, ...next[i].support],
    };
    next.splice(i, 1);
    slides(next);
    setOpen(i - 1);
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-9">
      <header className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-[12px] text-ink40 transition hover:text-accent"
        >
          ← Back
        </button>
        <input
          value={outline.title}
          onChange={(e) => onChange({ ...outline, title: e.target.value })}
          className="w-full bg-transparent text-[24px] font-semibold tracking-tight text-ink outline-none"
        />
        <input
          value={outline.subtitle}
          onChange={(e) => onChange({ ...outline, subtitle: e.target.value })}
          placeholder="Subtitle"
          className="mt-1 w-full bg-transparent text-[13px] text-ink60 outline-none"
        />
        <p className="mt-3 text-[13px] leading-relaxed text-ink60">
          Review the argument before any slide exists. Reorder, cut, merge or retitle — the deck is
          drawn from what you approve here.
        </p>
      </header>

      <ol className="space-y-2">
        {outline.slides.map((slide, i) => (
          <li key={i} className="rounded-lg border border-line bg-paper shadow-card">
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1 w-5 shrink-0 text-right text-xs tabular-nums text-ink40">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[14px] font-medium text-ink">{slide.claim}</span>
                <span className="mt-0.5 block text-[12px] text-ink40">
                  {slide.shape} · {slide.support.length} point
                  {slide.support.length === 1 ? '' : 's'}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1 text-ink40">
                <Icon label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </Icon>
                <Icon
                  label="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === outline.slides.length - 1}
                >
                  ↓
                </Icon>
                <Icon label="Merge into the slide above" onClick={() => mergeUp(i)} disabled={i === 0}>
                  ⌃
                </Icon>
                <Icon label="Cut this slide" onClick={() => cut(i)}>
                  ×
                </Icon>
              </div>
            </div>

            {open === i && (
              <div className="space-y-3 border-t border-line px-4 py-4">
                <Field label="Claim — the single point this slide makes">
                  <textarea
                    value={slide.claim}
                    onChange={(e) => patch(i, { claim: e.target.value })}
                    rows={2}
                    className="w-full resize-none rounded border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </Field>
                <Field label={supportHint(slide.shape)}>
                  <textarea
                    value={slide.support.join('\n')}
                    onChange={(e) =>
                      patch(i, { support: e.target.value.split('\n').filter((l) => l.trim()) })
                    }
                    rows={Math.max(3, slide.support.length + 1)}
                    className="w-full resize-none rounded border border-line px-3 py-2 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </Field>
                <Field label="Shape">
                  <div className="flex flex-wrap gap-1.5">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => patch(i, { shape })}
                        className={`rounded border px-2.5 py-1 text-xs transition ${
                          slide.shape === shape
                            ? 'border-accent bg-accent text-white'
                            : 'border-line bg-paper text-ink60 hover:border-accent hover:text-accent'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-[12px] text-ink40">
          {outline.slides.length} slide{outline.slides.length === 1 ? '' : 's'}. The test worth
          applying: open it and present without editing a single one.
        </p>
        <button
          type="button"
          disabled={busy || outline.slides.length === 0}
          onClick={onRender}
          className="shrink-0 rounded bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Producing…' : 'Download slides'}
        </button>
      </div>
    </section>
  );
}

/** The conventions are stated where they are typed, not hidden in a prompt. */
function supportHint(shape: Shape): string {
  switch (shape) {
    case 'two-column':
      return 'Support — one pair per line, written "left || right"';
    case 'chart':
      return 'Support — one per line, written "Label: 42"';
    case 'next-steps':
      return 'Support — one action per line, "Owner — action — when"';
    default:
      return 'Support — one point per line';
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">{label}</span>
      {children}
    </label>
  );
}

function Icon({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-6 w-6 rounded text-sm leading-none transition hover:bg-line/50 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
