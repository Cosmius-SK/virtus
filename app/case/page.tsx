'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { summary, type Summary } from '@/lib/meter';
import { money } from '@/lib/pricing';

/**
 * What this costs, and what it might save.
 *
 * The first question a leader asks is not "is it clever", it is "what does it
 * cost and what do we get". Both halves of that are on this page, and the halves
 * are kept visibly apart: what Virtus measured, and what follows from
 * assumptions you can change. Presenting an assumption as a measurement is the
 * fastest way to lose a room that does this for a living.
 */
const MINUTES_BY_HAND = 45;

export default function CasePage() {
  const [data, setData] = useState<Summary | null>(null);
  const [people, setPeople] = useState(20);
  const [perWeek, setPerWeek] = useState(1);
  const [minutes, setMinutes] = useState(MINUTES_BY_HAND);

  useEffect(() => {
    void summary().then(setData);
  }, []);

  const perDocMinutesSaved = Math.max(0, minutes - 3);
  const hoursPerWeek = (people * perWeek * perDocMinutesSaved) / 60;
  const hoursPerYear = hoursPerWeek * 46;
  const docsPerYear = people * perWeek * 46;
  const costPerYear = (data?.medianCost ?? 0) * docsPerYear;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-xs text-ink/45 underline-offset-2 hover:text-accent hover:underline">
        ← back
      </Link>
      <h1 className="mt-4 text-2xl font-light tracking-tight text-ink">What it costs</h1>
      <p className="mt-1 text-sm text-ink/55">
        Measured on this device, from real runs. Nothing here is estimated.
      </p>

      {data && data.runs > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Documents made" value={String(data.runs)} />
            <Stat label="Typical time" value={`${data.medianSeconds.toFixed(1)}s`} />
            <Stat label="Typical cost" value={money(data.medianCost)} />
          </div>
          <p className="mt-2 text-xs text-ink/40">
            Time is from pressing the button to having something to edit. Cost is the model&rsquo;s
            own token count at published rates — {money(data.totalCost)} spent here in total.
          </p>

          {data.byFormat.length > 1 && (
            <div className="mt-5 rounded-lg border border-rule bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-ink/40">What was made</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-ink/80">
                {data.byFormat.map((f) => (
                  <li key={f.formatId}>
                    {f.formatName} — {f.runs}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-rule px-4 py-8 text-center text-sm text-ink/45">
          Nothing measured yet. Make a document and the real numbers appear here.
        </p>
      )}

      <h2 className="mt-10 text-lg font-light tracking-tight text-ink">And what it might save</h2>
      <p className="mt-1 text-sm text-ink/55">
        This half is arithmetic on assumptions, not measurement. Change them and see.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Dial label="People" value={people} onChange={setPeople} min={1} max={500} />
        <Dial label="Reports each, per week" value={perWeek} onChange={setPerWeek} min={1} max={10} />
        <Dial label="Minutes by hand" value={minutes} onChange={setMinutes} min={5} max={180} />
      </div>

      <div className="mt-5 rounded-lg border border-rule bg-white px-5 py-4">
        <p className="text-sm leading-relaxed text-ink">
          {people} people writing {perWeek} report{perWeek === 1 ? '' : 's'} a week, at {minutes}{' '}
          minutes each by hand and about three minutes here, is{' '}
          <strong className="font-medium">{hoursPerWeek.toFixed(0)} hours a week</strong> — roughly{' '}
          <strong className="font-medium">{hoursPerYear.toFixed(0)} hours a year</strong> across the
          group.
        </p>
        {data?.medianCost ? (
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            Those {docsPerYear.toLocaleString()} documents would cost about{' '}
            <strong className="font-medium text-ink">{money(costPerYear)}</strong> a year to run, or{' '}
            {money(costPerYear / people / 12)} per person per month.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink/50">
            Make one document and the running cost appears here too.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
        <p className="text-[11px] uppercase tracking-wide text-amber-800/70">What this does not claim</p>
        <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
          <li>The three minutes includes reading and correcting the fields. It is not zero.</li>
          <li>
            It saves the writing, not the knowing. Someone still has to have been in the meetings.
          </li>
          <li>A thin note still makes a thin document. This does not manufacture substance.</li>
          <li>The minutes-by-hand figure is yours to set. Virtus has not measured it.</li>
        </ul>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-rule bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className="mt-0.5 text-xl font-light tabular-nums text-ink">{value}</p>
    </div>
  );
}

function Dial({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink/40">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="w-full rounded border border-rule px-2 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-accent/60"
      />
    </label>
  );
}
