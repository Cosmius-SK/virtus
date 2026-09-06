'use client';

import { STATUS_NAMES, type StatusName } from '@/lib/deck/master';
import type { Wsr, WsrRisk } from '@/lib/types';

/**
 * The status one-pager, before it becomes a slide.
 *
 * Same principle as the outline editor (§6, §8.2): the person fixes the fields,
 * not the rendered slide. Correcting a laid-out one-pager means fighting a
 * table; correcting a list takes a minute.
 *
 * Empty fields are left empty and deliberately not helped along. A status
 * report is read by people who decide things on it, and a plausible invented
 * owner or date is worse than a blank box.
 */
export function WsrEditor({
  wsr,
  onChange,
  onRender,
  busy,
  onBack,
}: {
  wsr: Wsr;
  onChange: (next: Wsr) => void;
  onRender: () => void;
  busy: boolean;
  onBack: () => void;
}) {
  const set = <K extends keyof Wsr>(key: K, value: Wsr[K]) => onChange({ ...wsr, [key]: value });
  const setRisk = (i: number, part: Partial<WsrRisk>) =>
    set('risks', wsr.risks.map((r, at) => (at === i ? { ...r, ...part } : r)));

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs text-ink/45 underline-offset-2 hover:text-accent hover:underline"
      >
        ← back to the note
      </button>

      <input
        value={wsr.title}
        onChange={(e) => set('title', e.target.value)}
        className="w-full bg-transparent text-2xl font-light tracking-tight text-ink outline-none"
      />
      <p className="mt-2 text-sm text-ink/60">
        Fix the facts here. Nothing is rendered until you say so — and an empty box stays empty.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Text label="Project ID" value={wsr.projectId} onChange={(v) => set('projectId', v)} />
        <Text label="Project name" value={wsr.projectName} onChange={(v) => set('projectName', v)} />
        <Text label="Start" value={wsr.startDate} onChange={(v) => set('startDate', v)} />
        <Text label="End" value={wsr.endDate} onChange={(v) => set('endDate', v)} />
      </div>

      <Field label="Status">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => set('status', name as StatusName as Wsr['status'])}
              className={`rounded border px-2.5 py-1 text-xs transition ${
                wsr.status === name
                  ? 'border-accent bg-accent text-white'
                  : 'border-rule text-ink/60 hover:border-accent/50'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Executive summary — what a director who reads nothing else must know">
        <textarea
          value={wsr.executiveSummary}
          onChange={(e) => set('executiveSummary', e.target.value)}
          rows={3}
          className="w-full resize-none rounded border border-rule px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
      </Field>

      <List label="Key decisions" items={wsr.keyDecisions} onChange={(v) => set('keyDecisions', v)} />
      <List label="Key accomplishments" items={wsr.accomplishments} onChange={(v) => set('accomplishments', v)} />
      <List label="Upcoming activities" items={wsr.upcoming} onChange={(v) => set('upcoming', v)} />

      <Field label="Key risks and challenges">
        <div className="space-y-2">
          {wsr.risks.map((risk, i) => (
            <div key={i} className="rounded border border-rule bg-white p-3">
              <div className="flex items-start gap-2">
                <input
                  value={risk.risk}
                  onChange={(e) => setRisk(i, { risk: e.target.value })}
                  placeholder="The risk"
                  className="flex-1 bg-transparent text-sm text-ink outline-none"
                />
                <button
                  type="button"
                  aria-label="Remove this risk"
                  onClick={() => set('risks', wsr.risks.filter((_, at) => at !== i))}
                  className="text-ink/30 transition hover:text-ink"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['impact', 'Impact'],
                    ['raised', 'Raised'],
                    ['owner', 'Owner'],
                    ['mitigation', 'Mitigation'],
                    ['closure', 'Expected closure'],
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    value={risk[key]}
                    onChange={(e) => setRisk(i, { [key]: e.target.value })}
                    placeholder={label}
                    className="rounded border border-rule px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set('risks', [
                ...wsr.risks,
                { risk: '', impact: '', raised: '', owner: '', mitigation: '', closure: '' },
              ])
            }
            className="text-xs text-ink/45 hover:text-accent"
          >
            + add a risk
          </button>
        </div>
      </Field>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-ink/45">
          The slide shows the first five of each list and the first three risks.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onRender}
          className="shrink-0 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {busy ? 'Rendering…' : 'Download the one-pager'}
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

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink/40">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-rule px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
      />
    </label>
  );
}

/** One per line, because a list is faster to fix as text than as widgets. */
function List({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Field label={`${label} — one per line`}>
      <textarea
        value={items.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').filter((l) => l.trim()))}
        rows={Math.max(3, items.length + 1)}
        className="w-full resize-none rounded border border-rule px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent/60"
      />
    </Field>
  );
}
