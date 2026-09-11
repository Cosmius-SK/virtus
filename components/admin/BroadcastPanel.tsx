'use client';

import { useEffect, useState } from 'react';
import { BroadcastStrip } from '@/components/BroadcastStrip';
import { setSettings } from '@/lib/admin/store';
import { useSettings } from '@/lib/admin/use';
import {
  ARCHIVE,
  LIMIT,
  MAX_TEXT,
  TONES,
  archived,
  active,
  blank,
  broadcastsOf,
  canAdd,
  live,
  phaseOf,
  problemWith,
  savedMessage,
  today,
  trim,
  type Broadcast,
  type Phase,
} from '@/lib/admin/broadcast';

/**
 * The broadcast panel.
 *
 * The stored list is the only truth on this screen. Each row holds its own
 * draft and writes the whole list on save, so an unsaved edit in one row can
 * never ride along with a save in another — the version of that bug where
 * somebody publishes a half-written notice they were still thinking about is
 * not one you find out about from a test.
 *
 * Adding writes an empty row straight away rather than opening a modal. An
 * empty message is never shown by `phaseOf`, so the row is inert until it says
 * something, and the person is editing the real thing from the first keystroke.
 */

const PHASE: Record<Phase, { label: string; className: string }> = {
  showing: { label: 'Showing now', className: 'border-green-300 bg-green-50 text-green-800' },
  scheduled: { label: 'Scheduled', className: 'border-sky-300 bg-sky-50 text-sky-800' },
  ended: { label: 'Ended', className: 'border-line bg-lineSoft text-ink40' },
  off: { label: 'Not showing', className: 'border-line bg-paper text-ink60' },
};

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40';
const FIELD =
  'w-full rounded border border-line px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15';

function Pill({ phase }: { phase: Phase }) {
  const { label, className } = PHASE[phase];
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] ${className}`}>{label}</span>
  );
}

function Row({
  item,
  index,
  all,
  onWrite,
  onRemove,
}: {
  item: Broadcast;
  index: number;
  all: Broadcast[];
  onWrite: (next: Broadcast) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Broadcast>(item);
  const [said, setSaid] = useState<string | null>(null);
  const t = today();

  // The stored row is the truth. If it changes underneath — another tab, a
  // removal — the draft follows rather than quietly reviving an old copy.
  useEffect(() => setDraft(item), [item]);

  const edit = (part: Partial<Broadcast>) => {
    setDraft((d) => ({ ...d, ...part }));
    setSaid(null);
  };

  async function commit(on: boolean) {
    const next = { ...draft, on };
    setDraft(next);
    await onWrite(next);
    setSaid(savedMessage(next, [...all.filter((b) => b.id !== next.id), next], t));
  }

  const stored = phaseOf(item, t);
  const wrong = problemWith(draft);
  const empty = !draft.text.trim();
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);

  return (
    <li className="rounded border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-ink40">{index + 1}</span>
        <Pill phase={stored} />
        {stored === 'showing' && (
          <span className="text-[11px] text-ink40">Read in this order</span>
        )}
        <button
          type="button"
          onClick={() => void onRemove()}
          className="ml-auto text-[12px] text-ink40 transition hover:text-red-700"
        >
          Remove
        </button>
      </div>

      <label className="mt-3 block">
        <span className={LABEL}>Message</span>
        <textarea
          value={draft.text}
          rows={2}
          onChange={(e) => edit({ text: e.target.value })}
          placeholder="Trial run — do not enter confidential data."
          className={`mt-1.5 resize-y ${FIELD}`}
        />
        <span className="mt-1 block text-[11px] text-ink40">
          {draft.text.trim().length}/{MAX_TEXT}
        </span>
      </label>

      <div className="mt-2">
        <span className={LABEL}>How it should read</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => edit({ tone: tone.id })}
              className={`rounded border px-2.5 py-1 text-xs transition ${
                draft.tone === tone.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-ink60 hover:border-accent'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>First day</span>
          <input
            type="date"
            value={draft.from ?? ''}
            onChange={(e) => edit({ from: e.target.value || undefined })}
            className={`mt-1.5 ${FIELD}`}
          />
          <span className="mt-1 block text-[11px] text-ink40">Blank means from the moment you show it.</span>
        </label>
        <label className="block">
          <span className={LABEL}>Last day</span>
          <input
            type="date"
            value={draft.until ?? ''}
            onChange={(e) => edit({ until: e.target.value || undefined })}
            className={`mt-1.5 ${FIELD}`}
          />
          <span className="mt-1 block text-[11px] text-ink40">
            Blank means it runs until somebody stops it.
          </span>
        </label>
      </div>

      <label className="mt-3 block">
        <span className={LABEL}>Internal note</span>
        <input
          value={draft.note ?? ''}
          onChange={(e) => edit({ note: e.target.value || undefined })}
          placeholder="Who asked for it, and what ends it."
          className={`mt-1.5 ${FIELD}`}
        />
        <span className="mt-1 block text-[11px] text-ink40">
          For this screen only. It is never part of the message.
        </span>
      </label>

      {/* The real strip, not something like it — shown while there is an edit
          that nobody has seen the effect of yet. */}
      {dirty && !empty && (
        <div className="mt-3">
          <span className={LABEL}>This message</span>
          <div className="mt-1.5">
            <BroadcastStrip items={[draft]} inset />
          </div>
        </div>
      )}

      {wrong && <p className="mt-3 text-[12px] text-red-700">{wrong}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {stored === 'showing' ? (
          <>
            <button
              type="button"
              disabled={empty || !!wrong}
              onClick={() => void commit(true)}
              className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => void commit(false)}
              className="text-[13px] text-ink60 transition hover:text-red-700"
            >
              Stop showing it
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={empty || !!wrong}
              onClick={() => void commit(true)}
              className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Show this message
            </button>
            <button
              type="button"
              disabled={empty || !!wrong}
              onClick={() => void commit(false)}
              className="text-[13px] text-ink60 transition hover:text-ink disabled:opacity-40"
            >
              Save without showing
            </button>
          </>
        )}
      </div>

      {said && <p className="mt-3 text-[12px] text-ink60">{said}</p>}
    </li>
  );
}

function Archived({
  items,
  onRestore,
  onRemove,
}: {
  items: Broadcast[];
  onRestore: (b: Broadcast) => Promise<void>;
  onRemove: (b: Broadcast) => Promise<void>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-8">
      <span className={LABEL}>Archived</span>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink60">
        Their last day has passed, so they came down on their own. The last {ARCHIVE} are kept —
        mostly for the note, which is the only record of why something was up.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded border border-line bg-lineSoft px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-relaxed text-ink60">{b.text}</p>
              <p className="mt-0.5 text-[11px] text-ink40">
                Ended {b.until}
                {b.note ? ` · ${b.note}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRestore(b)}
              className="text-[12px] text-ink60 transition hover:text-ink"
            >
              Put it back
            </button>
            <button
              type="button"
              onClick={() => void onRemove(b)}
              className="text-[12px] text-ink40 transition hover:text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BroadcastPanel() {
  const { settings, reload } = useSettings();
  const t = today();
  const list = broadcastsOf(settings);
  const showing = live(list, t);
  const open = active(list, t);
  const done = archived(list, t);

  async function write(next: Broadcast[]) {
    await setSettings({ broadcasts: trim(next, t) });
    reload();
  }

  const replace = (b: Broadcast) => write(list.map((x) => (x.id === b.id ? b : x)));
  const drop = (id: string) => write(list.filter((x) => x.id !== id));

  return (
    <div className="max-w-2xl">
      <p className="text-[13px] leading-relaxed text-ink60">
        A strip across the top of every screen. Up to {LIMIT} messages, which scroll past in the
        order they were added. For things that are true right now and will not be true forever — a
        trial, an outage, a change freeze.
      </p>
      <p className="mt-2 rounded border border-line bg-lineSoft px-3 py-2 text-[12px] leading-relaxed text-ink60">
        This is not the classification line. That one says what may be entered into this deployment,
        it is set by whoever deployed it, and it deliberately cannot be edited here — a control the
        people bound by it can switch off is not a control.
      </p>

      <div className="mt-5">
        <span className={LABEL}>What people see now</span>
        <div className="mt-1.5">
          {showing.length > 0 ? (
            <BroadcastStrip items={showing} inset />
          ) : (
            <p className="rounded border border-dashed border-line px-3 py-2.5 text-[12.5px] text-ink40">
              Nothing is showing. The strip is not there at all.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {open.map((b, i) => (
          <Row
            key={b.id}
            item={b}
            index={i}
            all={list}
            onWrite={replace}
            onRemove={() => drop(b.id)}
          />
        ))}
      </ul>

      <div className="mt-4">
        <button
          type="button"
          disabled={!canAdd(list, t)}
          onClick={() => void write([...list, blank()])}
          className="rounded border border-line px-3 py-2 text-[13px] text-ink60 transition hover:border-accent hover:text-ink disabled:opacity-40"
        >
          + Add a message
        </button>
        {!canAdd(list, t) && (
          <p className="mt-2 text-[12px] text-ink60">
            {LIMIT} is the limit. A strip with more than that stops being read, which costs more
            than the message you wanted to add — end one, or remove one, to make room.
          </p>
        )}
      </div>

      <Archived
        items={done}
        onRestore={(b) => replace({ ...b, until: undefined, on: false })}
        onRemove={(b) => drop(b.id)}
      />
    </div>
  );
}
